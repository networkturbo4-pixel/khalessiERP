<?php
// api/rrhh.php - Módulo integral de Recursos Humanos, Asistencias, Justificaciones y Sueldos
date_default_timezone_set('America/Lima');

require_once __DIR__ . '/totp.php';

// Auto-checkout: Solo se evalúa en acciones relevantes para evitar bloqueos y lentitud en lecturas
if (in_array($accion, ['estado', 'turnos_activos', 'marcar_entrada', 'marcar_salida', 'historial', 'mi_asistencia_hoy', 'marcar_refrigerio_inicio', 'marcar_refrigerio_fin', 'marcar_ingreso_rapido'])) {
    $hayAbiertos = $db->query("SELECT 1 FROM rrhh_asistencias WHERE estado = 'abierto' LIMIT 1")->fetchColumn();
    if ($hayAbiertos) {
        $qAutoClose = "UPDATE rrhh_asistencias a 
                       JOIN usuarios u ON a.id_usuario = u.id 
                       JOIN roles r ON u.id_rol = r.id
                       SET a.estado = 'cerrado', 
                           a.metodo_salida = 'automatico', 
                           a.fecha_hora_salida = DATE_ADD(DATE(a.fecha_hora_entrada), INTERVAL TIME_TO_SEC(IFNULL(u.hora_salida_asignada, r.hora_salida)) + 1800 SECOND)
                       WHERE a.estado = 'abierto' 
                         AND IFNULL(u.hora_salida_asignada, r.hora_salida) IS NOT NULL 
                         AND NOW() > DATE_ADD(DATE(a.fecha_hora_entrada), INTERVAL TIME_TO_SEC(IFNULL(u.hora_salida_asignada, r.hora_salida)) + 1800 SECOND)";
        $db->exec($qAutoClose);
    }
}

// ==========================================
// 1. ESTADO DE ASISTENCIA Y EVALUACIÓN DE TARDANZA
// ==========================================
if ($method === 'GET' && $accion === 'estado') {
    $dni = isset($_GET['dni']) ? trim($_GET['dni']) : '';
    if (empty($dni)) respondError("DNI es requerido");
    
    $stmt = $db->prepare("SELECT u.id, u.nombre, u.apellido, u.dni, u.foto_perfil, u.hora_entrada_asignada, u.hora_salida_asignada, u.totp_secret, u.sancionado_hasta, u.sancion_motivo, u.sancion_detalle, u.sancion_fecha, r.nombre as rol_nombre, r.hora_entrada as rol_hora_entrada, r.hora_salida as rol_hora_salida 
                          FROM usuarios u 
                          JOIN roles r ON u.id_rol = r.id 
                          WHERE u.dni = :dni AND u.estado = 'activo'");
    $stmt->execute([':dni' => $dni]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) respondError("Usuario no encontrado o inactivo", 404);
    
    // Verificar si el usuario se encuentra con sanción disciplinaria activa
    if (!empty($user['sancionado_hasta']) && strtotime($user['sancionado_hasta']) > time()) {
        unset($user['totp_secret']);
        $hastaTs = strtotime($user['sancionado_hasta']);
        $segundosRestantes = max(0, $hastaTs - time());
        $diasRestantes = floor($segundosRestantes / 86400);
        $horasRestantes = floor(($segundosRestantes % 86400) / 3600);
        $minutosRestantes = floor(($segundosRestantes % 3600) / 60);
        
        $tiempoTxt = "";
        if ($diasRestantes > 0) {
            $tiempoTxt = "{$diasRestantes} día" . ($diasRestantes > 1 ? "s" : "") . ($horasRestantes > 0 ? " y {$horasRestantes} h" : "");
        } else if ($horasRestantes > 0) {
            $tiempoTxt = "{$horasRestantes} hora" . ($horasRestantes > 1 ? "s" : "") . ($minutosRestantes > 0 ? " y {$minutosRestantes} min" : "");
        } else {
            $tiempoTxt = "{$minutosRestantes} minuto" . ($minutosRestantes > 1 ? "s" : "");
        }

        $meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $diaNum = date('j', $hastaTs);
        $mesNom = $meses[(int)date('n', $hastaTs)];
        $horaFormateada = date('h:i A', $hastaTs);
        $hastaFmt = "{$diaNum} de {$mesNom}, {$horaFormateada}";

        respondSuccess([
            "user" => $user,
            "estado" => "sancionado",
            "sancion" => [
                "activa" => true,
                "motivo" => $user['sancion_motivo'] ?: 'Sanción disciplinaria administrativa',
                "detalle" => $user['sancion_detalle'] ?: '',
                "hasta" => $user['sancionado_hasta'],
                "hasta_formateada" => $hastaFmt,
                "tiempo_restante" => $tiempoTxt,
                "segundos_restantes" => $segundosRestantes
            ]
        ], "Usuario con sanción disciplinaria activa");
    }
    
    // 1. Verificar si ya tiene un turno abierto actualmente
    $stmt = $db->prepare("SELECT id, fecha_hora_entrada, inicio_refrigerio, fin_refrigerio FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND estado = 'abierto' LIMIT 1");
    $stmt->execute([':id_usuario' => $user['id']]);
    $asistencia = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. Verificar si el usuario ya registró asistencia hoy (abierta o cerrada)
    $stmtHoy = $db->prepare("SELECT id, fecha_hora_entrada, fecha_hora_salida, estado, inicio_refrigerio, fin_refrigerio, condicion, minutos_tardanza 
                            FROM rrhh_asistencias 
                            WHERE id_usuario = :id_usuario AND DATE(fecha_hora_entrada) = CURDATE() 
                            ORDER BY id DESC LIMIT 1");
    $stmtHoy->execute([':id_usuario' => $user['id']]);
    $asistenciaHoy = $stmtHoy->fetch(PDO::FETCH_ASSOC);

    // Auto-sanar horario adelantado si fue registrado con zona horaria incorrecta del servidor
    if ($asistencia && !empty($asistencia['inicio_refrigerio']) && strtotime($asistencia['inicio_refrigerio']) > time()) {
        $db->prepare("UPDATE rrhh_asistencias SET inicio_refrigerio = NOW() WHERE id = :id")->execute([':id' => $asistencia['id']]);
        $asistencia['inicio_refrigerio'] = date('Y-m-d H:i:s');
    }
    
    // Obtener tolerancia y horario de refrigerio configurado
    $stmtCfg = $db->query("SELECT clave, valor FROM configuracion WHERE clave IN ('rrhh_tolerancia_tardanza_minutos', 'rrhh_refrigerio_inicio', 'rrhh_refrigerio_fin', 'rrhh_refrigerio_minutos')");
    $cfgs = $stmtCfg ? $stmtCfg->fetchAll(PDO::FETCH_KEY_PAIR) : [];

    $tolerancia = isset($cfgs['rrhh_tolerancia_tardanza_minutos']) ? (int)$cfgs['rrhh_tolerancia_tardanza_minutos'] : 15;
    $ref_inicio = !empty($cfgs['rrhh_refrigerio_inicio']) ? $cfgs['rrhh_refrigerio_inicio'] : '13:00';
    $ref_fin = !empty($cfgs['rrhh_refrigerio_fin']) ? $cfgs['rrhh_refrigerio_fin'] : '15:00';
    $ref_minutos = !empty($cfgs['rrhh_refrigerio_minutos']) ? (int)$cfgs['rrhh_refrigerio_minutos'] : 60;
    
    // Evaluar horario de entrada ÚNICAMENTE si no ha registrado asistencia hoy
    $hora_evaluar = !empty($user['hora_entrada_asignada']) ? $user['hora_entrada_asignada'] : $user['rol_hora_entrada'];
    $es_tardanza = false;
    $minutos_tardanza = 0;
    $hora_actual = date('H:i');
    
    if (!$asistenciaHoy && !empty($hora_evaluar)) {
        $hora_esperada_ts = strtotime(date('Y-m-d') . ' ' . $hora_evaluar);
        $limite_tolerancia_ts = $hora_esperada_ts + ($tolerancia * 60);
        $ahora_ts = time();
        
        if ($ahora_ts > $limite_tolerancia_ts) {
            $es_tardanza = true;
            $minutos_tardanza = max(1, round(($ahora_ts - $hora_esperada_ts) / 60));
        }
    }

    // Determinar estado de la jornada hoy
    $estado_jornada = 'cerrado';
    if ($asistencia) {
        $estado_jornada = 'abierto';
    } else if ($asistenciaHoy) {
        $estado_jornada = 'turno_cerrado';
    }

    // Evaluar estado del refrigerio
    $en_horario_refrigerio = ($hora_actual >= $ref_inicio && $hora_actual <= $ref_fin);
    $inicio_refrigerio_marcado = !empty($asistencia['inicio_refrigerio']);
    $fin_refrigerio_marcado = !empty($asistencia['fin_refrigerio']);
    $en_refrigerio = ($inicio_refrigerio_marcado && !$fin_refrigerio_marcado);
    $minutos_en_refrigerio = 0;
    if ($en_refrigerio && !empty($asistencia['inicio_refrigerio'])) {
        $minutos_en_refrigerio = max(1, round((time() - strtotime($asistencia['inicio_refrigerio'])) / 60));
    }
    
    // No enviar secreto TOTP al frontend por seguridad
    unset($user['totp_secret']);

    respondSuccess([
        "user" => $user,
        "estado" => $estado_jornada,
        "ya_marco_hoy" => !empty($asistenciaHoy),
        "hora_entrada_hoy" => $asistenciaHoy ? $asistenciaHoy['fecha_hora_entrada'] : null,
        "hora_salida_hoy" => $asistenciaHoy ? $asistenciaHoy['fecha_hora_salida'] : null,
        "asistencia_id" => $asistencia ? $asistencia['id'] : ($asistenciaHoy ? $asistenciaHoy['id'] : null),
        "es_tardanza" => $es_tardanza,
        "minutos_tardanza" => $minutos_tardanza,
        "hora_esperada" => $hora_evaluar ? substr($hora_evaluar, 0, 5) : null,
        "hora_actual" => $hora_actual,
        "tolerancia_minutos" => $tolerancia,
        "requiere_totp" => $es_tardanza,
        "refrigerio" => [
            "horario_activo" => $en_horario_refrigerio,
            "hora_inicio" => $ref_inicio,
            "hora_fin" => $ref_fin,
            "duracion_minutos" => $ref_minutos,
            "inicio_marcado" => $inicio_refrigerio_marcado,
            "fin_marcado" => $fin_refrigerio_marcado,
            "en_curso" => $en_refrigerio,
            "hora_inicio_marcada" => $asistencia ? $asistencia['inicio_refrigerio'] : ($asistenciaHoy ? $asistenciaHoy['inicio_refrigerio'] : null),
            "hora_fin_marcada" => $asistencia ? $asistencia['fin_refrigerio'] : ($asistenciaHoy ? $asistenciaHoy['fin_refrigerio'] : null),
            "minutos_en_refrigerio" => $minutos_en_refrigerio
        ]
    ]);
}

// ==========================================
// 1.1 ASISTENCIA DEL DÍA DEL USUARIO (WIDGET DASHBOARD)
// ==========================================
else if ($method === 'GET' && $accion === 'mi_asistencia_hoy') {
    $id_usuario = isset($_GET['id_usuario']) ? (int)$_GET['id_usuario'] : 0;
    $dni = isset($_GET['dni']) ? trim($_GET['dni']) : '';

    if (empty($id_usuario) && empty($dni)) {
        respondError("ID de usuario o DNI es requerido");
    }

    $qUser = "SELECT u.id, u.nombre, u.apellido, u.dni, u.foto_perfil, u.cargo,
                     r.nombre as rol_nombre,
                     IFNULL(u.hora_entrada_asignada, r.hora_entrada) as hora_entrada_esperada,
                     IFNULL(u.hora_salida_asignada, r.hora_salida) as hora_salida_esperada
              FROM usuarios u
              JOIN roles r ON u.id_rol = r.id
              WHERE " . (!empty($id_usuario) ? "u.id = :id" : "u.dni = :dni") . " AND u.estado = 'activo' LIMIT 1";
    $stmtU = $db->prepare($qUser);
    if (!empty($id_usuario)) $stmtU->execute([':id' => $id_usuario]);
    else $stmtU->execute([':dni' => $dni]);
    $user = $stmtU->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        respondError("Usuario no encontrado o inactivo", 404);
    }

    // Buscar asistencia de hoy o turno abierto
    $stmtA = $db->prepare("SELECT a.id, a.id_usuario, a.fecha_hora_entrada, a.inicio_refrigerio, a.fin_refrigerio,
                                  a.minutos_refrigerio, a.fecha_hora_salida, a.metodo_salida, a.estado,
                                  a.condicion, a.minutos_tardanza, a.horas_extra, a.foto_entrada_url,
                                  TIMESTAMPDIFF(MINUTE, a.inicio_refrigerio, IFNULL(a.fin_refrigerio, NOW())) as minutos_transcurridos_refrigerio,
                                  TIMESTAMPDIFF(MINUTE, a.fecha_hora_entrada, IFNULL(a.fecha_hora_salida, NOW())) as minutos_activos
                           FROM rrhh_asistencias a
                           WHERE a.id_usuario = :id_user
                             AND (DATE(a.fecha_hora_entrada) = CURDATE() OR a.estado = 'abierto')
                           ORDER BY a.id DESC LIMIT 1");
    $stmtA->execute([':id_user' => $user['id']]);
    $asistencia = $stmtA->fetch(PDO::FETCH_ASSOC);

    // Auto-corregir registros con desfase horario previo del servidor
    if ($asistencia && $asistencia['estado'] === 'abierto') {
        $ahoraTs = time();
        if (!empty($asistencia['inicio_refrigerio']) && strtotime($asistencia['inicio_refrigerio']) > $ahoraTs) {
            $db->prepare("UPDATE rrhh_asistencias SET inicio_refrigerio = NOW() WHERE id = :id")->execute([':id' => $asistencia['id']]);
            $asistencia['inicio_refrigerio'] = date('Y-m-d H:i:s');
            $asistencia['minutos_transcurridos_refrigerio'] = 0;
        }
    }

    // Determinar banderas booleanas de marcación
    $marcado_ingreso = !empty($asistencia['fecha_hora_entrada']);
    $marcado_inicio_refrigerio = !empty($asistencia['inicio_refrigerio']);
    $marcado_fin_refrigerio = !empty($asistencia['fin_refrigerio']);
    $marcado_salida = !empty($asistencia['fecha_hora_salida']);
    $en_refrigerio = $marcado_inicio_refrigerio && !$marcado_fin_refrigerio;
    $turno_abierto = $asistencia && $asistencia['estado'] === 'abierto';

    // Determinar siguiente acción sugerida
    $siguiente_accion = 'marcar_ingreso';
    if ($marcado_salida) {
        $siguiente_accion = 'jornada_terminada';
    } else if ($en_refrigerio) {
        $siguiente_accion = 'finalizar_refrigerio';
    } else if ($marcado_fin_refrigerio) {
        $siguiente_accion = 'marcar_salida';
    } else if ($marcado_ingreso) {
        $siguiente_accion = 'iniciar_refrigerio';
    }

    $stmtCfg = $db->query("SELECT clave, valor FROM configuracion WHERE clave IN ('rrhh_refrigerio_inicio', 'rrhh_refrigerio_fin', 'rrhh_refrigerio_minutos')");
    $cfgs = $stmtCfg ? $stmtCfg->fetchAll(PDO::FETCH_KEY_PAIR) : [];
    $ref_inicio = !empty($cfgs['rrhh_refrigerio_inicio']) ? $cfgs['rrhh_refrigerio_inicio'] : '13:00';
    $ref_fin = !empty($cfgs['rrhh_refrigerio_fin']) ? $cfgs['rrhh_refrigerio_fin'] : '15:00';
    $ref_minutos = !empty($cfgs['rrhh_refrigerio_minutos']) ? (int)$cfgs['rrhh_refrigerio_minutos'] : 60;
    $hora_actual = date('H:i');
    $en_horario_refrigerio = ($hora_actual >= $ref_inicio && $hora_actual <= $ref_fin);

    respondSuccess([
        "user" => $user,
        "asistencia" => $asistencia ?: null,
        "refrigerio_config" => [
            "horario_activo" => $en_horario_refrigerio,
            "hora_inicio" => $ref_inicio,
            "hora_fin" => $ref_fin,
            "duracion_minutos" => $ref_minutos
        ],
        "marcas" => [
            "ingreso" => [
                "marcado" => $marcado_ingreso,
                "hora" => $asistencia ? $asistencia['fecha_hora_entrada'] : null,
                "condicion" => $asistencia ? $asistencia['condicion'] : null,
                "tardanza_minutos" => $asistencia ? (int)$asistencia['minutos_tardanza'] : 0
            ],
            "inicio_refrigerio" => [
                "marcado" => $marcado_inicio_refrigerio,
                "hora" => $asistencia ? $asistencia['inicio_refrigerio'] : null
            ],
            "fin_refrigerio" => [
                "marcado" => $marcado_fin_refrigerio,
                "hora" => $asistencia ? $asistencia['fin_refrigerio'] : null,
                "en_curso" => $en_refrigerio,
                "minutos_transcurridos" => $asistencia && $en_refrigerio ? (int)$asistencia['minutos_transcurridos_refrigerio'] : ($asistencia ? (int)$asistencia['minutos_refrigerio'] : 0)
            ],
            "salida" => [
                "marcado" => $marcado_salida,
                "hora" => $asistencia ? $asistencia['fecha_hora_salida'] : null,
                "metodo" => $asistencia ? $asistencia['metodo_salida'] : null
            ]
        ],
        "en_refrigerio" => $en_refrigerio,
        "turno_abierto" => $turno_abierto,
        "siguiente_accion" => $siguiente_accion,
        "servidor_tiempo" => date('Y-m-d H:i:s')
    ]);
}

// ==========================================
// 2. VERIFICACIÓN DE CÓDIGO GOOGLE AUTHENTICATOR (TOTP)
// ==========================================
else if ($method === 'POST' && $accion === 'verificar_totp') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $dni = isset($input['dni']) ? trim($input['dni']) : '';
    $codigo = isset($input['codigo']) ? trim($input['codigo']) : '';
    
    if (empty($codigo)) respondError("El código de Google Authenticator es obligatorio");
    
    // 1. Obtener secreto del supervisor
    $stmtSup = $db->query("SELECT valor FROM configuracion WHERE clave = 'rrhh_totp_supervisor_secret' LIMIT 1");
    $supervisorSecret = $stmtSup ? $stmtSup->fetchColumn() : '';
    
    $valido = false;
    if (!empty($supervisorSecret) && GoogleAuthenticator::verifyCode($supervisorSecret, $codigo)) {
        $valido = true;
    }
    
    // 2. Si no es válido con supervisor, verificar si el usuario tiene secreto personal
    if (!$valido && !empty($dni)) {
        $stmtUser = $db->prepare("SELECT totp_secret FROM usuarios WHERE dni = :dni LIMIT 1");
        $stmtUser->execute([':dni' => $dni]);
        $userSecret = $stmtUser->fetchColumn();
        if (!empty($userSecret) && GoogleAuthenticator::verifyCode($userSecret, $codigo)) {
            $valido = true;
        }
    }
    
    if ($valido) {
        respondSuccess(["valido" => true], "Código de Google Authenticator verificado exitosamente");
    } else {
        respondError("Código de Google Authenticator incorrecto o expirado. Solicita la clave a tu supervisor.", 401);
    }
}

// ==========================================
// 3. MARCAR ENTRADA (CON FOTO, GPS Y VALIDACIÓN TOTP)
// ==========================================
else if ($method === 'POST' && $accion === 'marcar_entrada') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    
    $dni = isset($input['dni']) ? trim($input['dni']) : '';
    $foto_base64 = isset($input['foto']) ? $input['foto'] : '';
    $latitud = isset($input['latitud']) ? trim($input['latitud']) : null;
    $longitud = isset($input['longitud']) ? trim($input['longitud']) : null;
    $totp_code = isset($input['totp_code']) ? trim($input['totp_code']) : '';
    
    if (empty($dni) || empty($foto_base64)) respondError("DNI y Foto son obligatorios");
    
    $stmt = $db->prepare("SELECT u.id, u.totp_secret, u.hora_entrada_asignada, u.sancionado_hasta, u.sancion_motivo, r.hora_entrada as rol_hora_entrada 
                          FROM usuarios u 
                          JOIN roles r ON u.id_rol = r.id 
                          WHERE u.dni = :dni AND u.estado = 'activo'");
    $stmt->execute([':dni' => $dni]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado");

    // Verificar si el usuario se encuentra con sanción disciplinaria activa
    if (!empty($user['sancionado_hasta']) && strtotime($user['sancionado_hasta']) > time()) {
        $hastaFmt = date('d/m/Y h:i A', strtotime($user['sancionado_hasta']));
        $motivo = !empty($user['sancion_motivo']) ? $user['sancion_motivo'] : 'Sanción disciplinaria';
        respondError("Acceso bloqueado: Te encuentras sancionado disciplinariamente hasta el {$hastaFmt}. Motivo: {$motivo}", 403);
    }
    
    // Verificar si ya tiene un turno abierto
    $stmt = $db->prepare("SELECT id FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND estado = 'abierto'");
    $stmt->execute([':id_usuario' => $user['id']]);
    if ($stmt->rowCount() > 0) respondError("El usuario ya tiene un turno abierto");

    // Verificar si ya registró entrada hoy (evitar duplicar asistencia)
    $stmtHoy = $db->prepare("SELECT id, fecha_hora_entrada FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND DATE(fecha_hora_entrada) = CURDATE() LIMIT 1");
    $stmtHoy->execute([':id_usuario' => $user['id']]);
    if ($stmtHoy->rowCount() > 0) {
        $reg = $stmtHoy->fetch(PDO::FETCH_ASSOC);
        $horaFmt = date('h:i A', strtotime($reg['fecha_hora_entrada']));
        respondError("Ya registraste tu hora de entrada el día de hoy a las {$horaFmt}. No es necesario volver a marcar.", 400);
    }
    
    // Evaluar tardanza
    $stmtTol = $db->prepare("SELECT valor FROM configuracion WHERE clave = 'rrhh_tolerancia_tardanza_minutos' LIMIT 1");
    $stmtTol->execute();
    $tolerancia = (int)($stmtTol->fetchColumn() ?: 15);
    
    $hora_evaluar = !empty($user['hora_entrada_asignada']) ? $user['hora_entrada_asignada'] : $user['rol_hora_entrada'];
    $condicion = 'puntual';
    $minutos_tardanza = 0;
    $autorizado_por_totp = 0;
    
    if (!empty($hora_evaluar)) {
        $hora_esperada_ts = strtotime(date('Y-m-d') . ' ' . $hora_evaluar);
        $limite_tolerancia_ts = $hora_esperada_ts + ($tolerancia * 60);
        $ahora_ts = time();
        
        if ($ahora_ts > $limite_tolerancia_ts) {
            $condicion = 'tardanza';
            $minutos_tardanza = max(1, round(($ahora_ts - $hora_esperada_ts) / 60));
            
            // Validar que se haya suministrado código TOTP válido
            if (empty($totp_code)) {
                respondError("Has llegado con tardanza. Es obligatorio ingresar el código de Google Authenticator para continuar.", 403);
            }
            
            // Validar TOTP
            $stmtSup = $db->query("SELECT valor FROM configuracion WHERE clave = 'rrhh_totp_supervisor_secret' LIMIT 1");
            $supSecret = $stmtSup ? $stmtSup->fetchColumn() : '';
            
            $valido = false;
            if (!empty($supSecret) && GoogleAuthenticator::verifyCode($supSecret, $totp_code)) {
                $valido = true;
            }
            if (!$valido && !empty($user['totp_secret']) && GoogleAuthenticator::verifyCode($user['totp_secret'], $totp_code)) {
                $valido = true;
            }
            
            if (!$valido) {
                respondError("Código de Google Authenticator inválido. Ingreso no autorizado.", 401);
            }
            $autorizado_por_totp = 1;
        }
    }
    
    // Guardar foto
    $uploadDir = __DIR__ . '/../uploads/asistencia/';
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);
    
    $foto_parts = explode(";base64,", $foto_base64);
    $foto_type_aux = explode("image/", $foto_parts[0]);
    $image_type = isset($foto_type_aux[1]) ? $foto_type_aux[1] : 'jpeg';
    $image_base64 = base64_decode(str_replace(' ', '+', $foto_parts[1]));
    $filename = 'entrada_' . $user['id'] . '_' . time() . '.' . $image_type;
    $file = $uploadDir . $filename;
    file_put_contents($file, $image_base64);
    
    $foto_url = 'uploads/asistencia/' . $filename;
    
    $stmt = $db->prepare("INSERT INTO rrhh_asistencias (id_usuario, fecha_hora_entrada, foto_entrada_url, estado, condicion, minutos_tardanza, autorizado_por_totp, latitud, longitud) 
                          VALUES (:id_user, NOW(), :foto, 'abierto', :condicion, :tardanza, :totp_auth, :lat, :lng)");
    $stmt->execute([
        ':id_user' => $user['id'],
        ':foto' => $foto_url,
        ':condicion' => $condicion,
        ':tardanza' => $minutos_tardanza,
        ':totp_auth' => $autorizado_por_totp,
        ':lat' => $latitud,
        ':lng' => $longitud
    ]);
    
    respondSuccess([
        "condicion" => $condicion,
        "minutos_tardanza" => $minutos_tardanza,
        "autorizado_por_totp" => $autorizado_por_totp
    ], "Entrada registrada exitosamente" . ($condicion === 'tardanza' ? " con $minutos_tardanza min de tardanza (autorizada por Google Authenticator)" : ""));
}

// ==========================================
// 3.1 MARCAR INICIO DE REFRIGERIO
// ==========================================
else if ($method === 'POST' && $accion === 'marcar_refrigerio_inicio') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_usuario = isset($input['id_usuario']) ? (int)$input['id_usuario'] : 0;
    $dni = isset($input['dni']) ? trim($input['dni']) : '';

    if (empty($id_usuario) && empty($dni)) respondError("ID de usuario o DNI es requerido");

    $userQuery = !empty($id_usuario) ? "SELECT id, nombre FROM usuarios WHERE id = :id AND estado = 'activo'" : "SELECT id, nombre FROM usuarios WHERE dni = :dni AND estado = 'activo'";
    $stmtU = $db->prepare($userQuery);
    if (!empty($id_usuario)) $stmtU->execute([':id' => $id_usuario]);
    else $stmtU->execute([':dni' => $dni]);
    $user = $stmtU->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado o inactivo");

    $stmt = $db->prepare("SELECT id, fecha_hora_entrada, inicio_refrigerio, fin_refrigerio FROM rrhh_asistencias WHERE id_usuario = :id_user AND estado = 'abierto' ORDER BY id DESC LIMIT 1");
    $stmt->execute([':id_user' => $user['id']]);
    $asist = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$asist) {
        respondError("No tienes un turno laboral activo abierto. Primero debes registrar tu ingreso.");
    }
    if (!empty($asist['inicio_refrigerio'])) {
        respondSuccess([
            "inicio_refrigerio" => $asist['inicio_refrigerio'],
            "asistencia_id" => $asist['id'],
            "ya_registrado" => true
        ], "El inicio de tu refrigerio ya fue registrado previamente a las " . date('h:i:s A', strtotime($asist['inicio_refrigerio'])) . ". ¡Buen provecho!");
    }

    $ahora = date('Y-m-d H:i:s');
    $stmtUpd = $db->prepare("UPDATE rrhh_asistencias SET inicio_refrigerio = :ahora WHERE id = :id");
    $stmtUpd->execute([':ahora' => $ahora, ':id' => $asist['id']]);

    respondSuccess([
        "inicio_refrigerio" => $ahora,
        "asistencia_id" => $asist['id']
    ], "Inicio de refrigerio registrado a las " . date('h:i:s A', strtotime($ahora)) . ". ¡Buen provecho!");
}

// ==========================================
// 3.2 MARCAR FIN DE REFRIGERIO
// ==========================================
else if ($method === 'POST' && $accion === 'marcar_refrigerio_fin') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_usuario = isset($input['id_usuario']) ? (int)$input['id_usuario'] : 0;
    $dni = isset($input['dni']) ? trim($input['dni']) : '';

    if (empty($id_usuario) && empty($dni)) respondError("ID de usuario o DNI es requerido");

    $userQuery = !empty($id_usuario) ? "SELECT id, nombre FROM usuarios WHERE id = :id AND estado = 'activo'" : "SELECT id, nombre FROM usuarios WHERE dni = :dni AND estado = 'activo'";
    $stmtU = $db->prepare($userQuery);
    if (!empty($id_usuario)) $stmtU->execute([':id' => $id_usuario]);
    else $stmtU->execute([':dni' => $dni]);
    $user = $stmtU->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado o inactivo");

    $stmt = $db->prepare("SELECT id, inicio_refrigerio, fin_refrigerio, minutos_refrigerio FROM rrhh_asistencias WHERE id_usuario = :id_user AND estado = 'abierto' ORDER BY id DESC LIMIT 1");
    $stmt->execute([':id_user' => $user['id']]);
    $asist = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$asist) {
        respondError("No tienes un turno laboral activo abierto.");
    }
    if (empty($asist['inicio_refrigerio'])) {
        respondError("Primero debes registrar el inicio de tu refrigerio.");
    }
    if (!empty($asist['fin_refrigerio'])) {
        respondSuccess([
            "fin_refrigerio" => $asist['fin_refrigerio'],
            "minutos_refrigerio" => isset($asist['minutos_refrigerio']) ? (int)$asist['minutos_refrigerio'] : 0,
            "asistencia_id" => $asist['id'],
            "ya_registrado" => true
        ], "El fin de tu refrigerio ya fue registrado a las " . date('h:i:s A', strtotime($asist['fin_refrigerio'])) . ". ¡A continuar con energía!");
    }

    $ahora = date('Y-m-d H:i:s');
    $minutos = max(1, round((strtotime($ahora) - strtotime($asist['inicio_refrigerio'])) / 60));
    $stmtUpd = $db->prepare("UPDATE rrhh_asistencias SET fin_refrigerio = :ahora, minutos_refrigerio = :min WHERE id = :id");
    $stmtUpd->execute([':ahora' => $ahora, ':min' => $minutos, ':id' => $asist['id']]);

    respondSuccess([
        "fin_refrigerio" => $ahora,
        "minutos_refrigerio" => $minutos,
        "asistencia_id" => $asist['id']
    ], "Fin de refrigerio registrado a las " . date('h:i:s A', strtotime($ahora)) . " ($minutos min de refrigerio). ¡A continuar con energía!");
}

// ==========================================
// 3.3 MARCAR INGRESO RÁPIDO DESDE EL WIDGET
// ==========================================
else if ($method === 'POST' && $accion === 'marcar_ingreso_rapido') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_usuario = isset($input['id_usuario']) ? (int)$input['id_usuario'] : 0;
    $dni = isset($input['dni']) ? trim($input['dni']) : '';
    $latitud = isset($input['latitud']) ? trim($input['latitud']) : null;
    $longitud = isset($input['longitud']) ? trim($input['longitud']) : null;

    if (empty($id_usuario) && empty($dni)) respondError("ID de usuario o DNI es requerido");

    $userQuery = !empty($id_usuario) ? "SELECT u.id, u.dni, u.hora_entrada_asignada, u.sancionado_hasta, u.sancion_motivo, r.hora_entrada as rol_hora_entrada FROM usuarios u JOIN roles r ON u.id_rol = r.id WHERE u.id = :id AND u.estado = 'activo'" : "SELECT u.id, u.dni, u.hora_entrada_asignada, u.sancionado_hasta, u.sancion_motivo, r.hora_entrada as rol_hora_entrada FROM usuarios u JOIN roles r ON u.id_rol = r.id WHERE u.dni = :dni AND u.estado = 'activo'";
    $stmtU = $db->prepare($userQuery);
    if (!empty($id_usuario)) $stmtU->execute([':id' => $id_usuario]);
    else $stmtU->execute([':dni' => $dni]);
    $user = $stmtU->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado o inactivo");

    // Verificar si el usuario se encuentra con sanción disciplinaria activa
    if (!empty($user['sancionado_hasta']) && strtotime($user['sancionado_hasta']) > time()) {
        $hastaFmt = date('d/m/Y h:i A', strtotime($user['sancionado_hasta']));
        $motivo = !empty($user['sancion_motivo']) ? $user['sancion_motivo'] : 'Sanción disciplinaria';
        respondError("Acceso bloqueado: Te encuentras sancionado disciplinariamente hasta el {$hastaFmt}. Motivo: {$motivo}", 403);
    }

    // Verificar si ya tiene turno abierto
    $stmt = $db->prepare("SELECT id FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND estado = 'abierto'");
    $stmt->execute([':id_usuario' => $user['id']]);
    if ($stmt->rowCount() > 0) respondError("Ya tienes un turno de trabajo abierto.");

    // Verificar si ya registró entrada hoy
    $stmtHoy = $db->prepare("SELECT id, fecha_hora_entrada FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND DATE(fecha_hora_entrada) = CURDATE() LIMIT 1");
    $stmtHoy->execute([':id_usuario' => $user['id']]);
    if ($stmtHoy->rowCount() > 0) {
        $reg = $stmtHoy->fetch(PDO::FETCH_ASSOC);
        $horaFmt = date('h:i A', strtotime($reg['fecha_hora_entrada']));
        respondError("Ya registraste tu hora de entrada el día de hoy a las {$horaFmt}.", 400);
    }

    // Evaluar tardanza
    $stmtTol = $db->prepare("SELECT valor FROM configuracion WHERE clave = 'rrhh_tolerancia_tardanza_minutos' LIMIT 1");
    $stmtTol->execute();
    $tolerancia = (int)($stmtTol->fetchColumn() ?: 15);
    
    $hora_evaluar = !empty($user['hora_entrada_asignada']) ? $user['hora_entrada_asignada'] : $user['rol_hora_entrada'];
    $condicion = 'puntual';
    $minutos_tardanza = 0;
    
    if (!empty($hora_evaluar)) {
        $hora_esperada_ts = strtotime(date('Y-m-d') . ' ' . $hora_evaluar);
        $limite_tolerancia_ts = $hora_esperada_ts + ($tolerancia * 60);
        $ahora_ts = time();
        if ($ahora_ts > $limite_tolerancia_ts) {
            $condicion = 'tardanza';
            $minutos_tardanza = max(1, round(($ahora_ts - $hora_esperada_ts) / 60));
        }
    }

    $stmtIns = $db->prepare("INSERT INTO rrhh_asistencias (id_usuario, fecha_hora_entrada, estado, condicion, minutos_tardanza, latitud, longitud, metodo_salida) 
                             VALUES (:id_user, NOW(), 'abierto', :condicion, :tardanza, :lat, :lng, NULL)");
    $stmtIns->execute([
        ':id_user' => $user['id'],
        ':condicion' => $condicion,
        ':tardanza' => $minutos_tardanza,
        ':lat' => $latitud,
        ':lng' => $longitud
    ]);

    $ahora = date('Y-m-d H:i:s');
    respondSuccess([
        "fecha_hora_entrada" => $ahora,
        "condicion" => $condicion,
        "minutos_tardanza" => $minutos_tardanza
    ], "Ingreso laboral registrado a las " . date('h:i:s A', strtotime($ahora)) . ($condicion === 'tardanza' ? " ($minutos_tardanza min de tardanza)" : " (Puntual)"));
}

// ==========================================
// 4. MARCAR SALIDA
// ==========================================
else if ($method === 'POST' && $accion === 'marcar_salida') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $dni = isset($input['dni']) ? trim($input['dni']) : '';
    $id_usuario = isset($input['id_usuario']) ? (int)$input['id_usuario'] : 0;
    
    if (empty($dni) && empty($id_usuario)) respondError("DNI o ID de usuario es obligatorio");
    
    if (!empty($id_usuario)) {
        $stmt = $db->prepare("SELECT id FROM usuarios WHERE id = :id AND estado = 'activo'");
        $stmt->execute([':id' => $id_usuario]);
    } else {
        $stmt = $db->prepare("SELECT id FROM usuarios WHERE dni = :dni AND estado = 'activo'");
        $stmt->execute([':dni' => $dni]);
    }
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado");
    
    $stmt = $db->prepare("SELECT id, fecha_hora_entrada, inicio_refrigerio, fin_refrigerio FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND estado = 'abierto' ORDER BY id DESC LIMIT 1");
    $stmt->execute([':id_usuario' => $user['id']]);
    $asistencia = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$asistencia) {
        $stmtCerrado = $db->prepare("SELECT id FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND DATE(fecha_hora_entrada) = CURDATE() AND estado = 'cerrado' ORDER BY id DESC LIMIT 1");
        $stmtCerrado->execute([':id_usuario' => $user['id']]);
        if ($stmtCerrado->fetch()) {
            respondSuccess(["ya_registrado" => true], "Tu salida ya fue registrada previamente.");
        }
        respondError("No hay un turno abierto para este usuario");
    }
    
    $extraRefrig = "";
    if (!empty($asistencia['inicio_refrigerio']) && empty($asistencia['fin_refrigerio'])) {
        $extraRefrig = ", fin_refrigerio = NOW(), minutos_refrigerio = TIMESTAMPDIFF(MINUTE, inicio_refrigerio, NOW())";
    }

    $stmt = $db->prepare("UPDATE rrhh_asistencias SET fecha_hora_salida = NOW(), metodo_salida = 'manual', estado = 'cerrado' $extraRefrig WHERE id = :id");
    $stmt->execute([':id' => $asistencia['id']]);
    
    respondSuccess(null, "Salida registrada exitosamente");
}

// ==========================================
// 4.1 TURNOS ACTIVOS Y RETIRO DISCIPLINARIO
// ==========================================
else if ($method === 'GET' && $accion === 'turnos_activos') {
    $q = "SELECT a.id as id_asistencia, a.id_usuario, a.fecha_hora_entrada, a.inicio_refrigerio, a.fin_refrigerio, a.minutos_refrigerio,
                 a.condicion, a.minutos_tardanza,
                 a.foto_entrada_url, a.foto_entrada_url as foto_entrada, a.latitud, a.longitud,
                 u.nombre, u.apellido, u.dni, u.foto_perfil, u.cargo,
                 r.nombre as rol_nombre,
                 IFNULL(u.hora_salida_asignada, r.hora_salida) as hora_salida_esperada,
                 TIMESTAMPDIFF(MINUTE, a.fecha_hora_entrada, NOW()) as minutos_activos
          FROM rrhh_asistencias a
          JOIN usuarios u ON a.id_usuario = u.id
          JOIN roles r ON u.id_rol = r.id
          WHERE a.estado = 'abierto'
          ORDER BY a.fecha_hora_entrada DESC";
    $stmt = $db->query($q);
    $turnos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($turnos);
}

else if ($method === 'POST' && $accion === 'retiro_disciplinario') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    
    $id_asistencia = isset($input['id_asistencia']) ? (int)$input['id_asistencia'] : 0;
    $id_usuario = isset($input['id_usuario']) ? (int)$input['id_usuario'] : 0;
    $motivo = isset($input['motivo']) && trim($input['motivo']) !== '' ? trim($input['motivo']) : 'Pérdida de tiempo en horario laboral';
    $detalle = isset($input['detalle']) ? trim($input['detalle']) : '';
    $horas_descontar = isset($input['horas_descontar']) && $input['horas_descontar'] !== '' ? (float)$input['horas_descontar'] : null;
    $id_admin = isset($input['id_admin']) ? (int)$input['id_admin'] : null;
    $duracion = isset($input['duracion']) ? trim($input['duracion']) : '0';
    $fecha_fin_personalizada = isset($input['fecha_fin_personalizada']) ? trim($input['fecha_fin_personalizada']) : null;
    
    if (!$id_asistencia && $id_usuario > 0) {
        $stmtA = $db->prepare("SELECT id FROM rrhh_asistencias WHERE id_usuario = :u AND estado = 'abierto' ORDER BY id DESC LIMIT 1");
        $stmtA->execute([':u' => $id_usuario]);
        $id_asistencia = (int)$stmtA->fetchColumn();
    }
    
    if (!$id_asistencia && !$id_usuario) {
        respondError("Debes seleccionar un colaborador para sancionar");
    }

    $asist = null;
    $horasTrabajadas = 0;
    $horaCorteStr = date('H:i');
    $fechaHoy = date('Y-m-d');
    
    if ($id_asistencia > 0) {
        $stmtData = $db->prepare("SELECT a.id, a.id_usuario, a.fecha_hora_entrada, a.observaciones,
                                         u.nombre, u.apellido, u.dni,
                                         IFNULL(u.hora_salida_asignada, r.hora_salida) as hora_salida_esperada
                                  FROM rrhh_asistencias a
                                  JOIN usuarios u ON a.id_usuario = u.id
                                  JOIN roles r ON u.id_rol = r.id
                                  WHERE a.id = :id");
        $stmtData->execute([':id' => $id_asistencia]);
        $asist = $stmtData->fetch(PDO::FETCH_ASSOC);
        if (!$asist) respondError("Registro de asistencia no encontrado");
        $id_usuario = (int)$asist['id_usuario'];

        $entradaTs = strtotime($asist['fecha_hora_entrada']);
        $ahoraTs = time();
        $minutosTrabajados = max(1, round(($ahoraTs - $entradaTs) / 60));
        $horasTrabajadas = round($minutosTrabajados / 60, 2);
        
        if ($horas_descontar === null || $horas_descontar < 0) {
            $horas_descontar = max(0.5, round(8.0 - $horasTrabajadas, 2));
        }
    } else {
        $stmtU = $db->prepare("SELECT id, nombre, apellido, dni FROM usuarios WHERE id = :u AND estado = 'activo'");
        $stmtU->execute([':u' => $id_usuario]);
        $asist = $stmtU->fetch(PDO::FETCH_ASSOC);
        if (!$asist) respondError("Colaborador no encontrado");
        if ($horas_descontar === null) $horas_descontar = 0.00;
    }
    
    // Calcular fecha y hora límite de la sanción (bloqueo)
    $diasSancion = 0;
    if ($duracion === 'custom' && !empty($fecha_fin_personalizada)) {
        $sancionadoHasta = date('Y-m-d H:i:s', strtotime($fecha_fin_personalizada));
    } else if ($duracion === '0') {
        // Bloqueado hasta las 23:59:59 de hoy
        $sancionadoHasta = date('Y-m-d 23:59:59');
        $diasSancion = 0;
    } else if (is_numeric($duracion) && (int)$duracion > 0) {
        $diasSancion = (int)$duracion;
        $sancionadoHasta = date('Y-m-d 23:59:59', strtotime("+{$diasSancion} days"));
    } else {
        $sancionadoHasta = date('Y-m-d 23:59:59');
    }

    $meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    $hastaTs = strtotime($sancionadoHasta);
    $diaNum = date('j', $hastaTs);
    $mesNom = $meses[(int)date('n', $hastaTs)];
    $horaFormateada = date('h:i A', $hastaTs);
    $hastaFmt = "{$diaNum} de {$mesNom}, {$horaFormateada}";
    
    $obsSancion = "[RETIRO DISCIPLINARIO {$fechaHoy} {$horaCorteStr}] Motivo: {$motivo}. ";
    if (!empty($detalle)) $obsSancion .= "Detalle: {$detalle}. ";
    if ($id_asistencia > 0) {
        $obsSancion .= "Laboró: {$horasTrabajadas}h. Descuento aplicado: {$horas_descontar}h perdidas. ";
    }
    $obsSancion .= "Bloqueo de acceso hasta: {$hastaFmt}.";
    
    if ($id_admin) {
        $stmtAdm = $db->prepare("SELECT nombre, apellido FROM usuarios WHERE id = :id");
        $stmtAdm->execute([':id' => $id_admin]);
        $adm = $stmtAdm->fetch(PDO::FETCH_ASSOC);
        if ($adm) $obsSancion .= " Aplicado por: " . $adm['nombre'] . " " . ($adm['apellido'] ?: '') . ".";
    }
    
    // Si tenía turno abierto, cerrarlo con sanción
    if ($id_asistencia > 0) {
        $obsFinal = trim(($asist['observaciones'] ? $asist['observaciones'] . " | " : "") . $obsSancion);
        $stmtUpd = $db->prepare("UPDATE rrhh_asistencias 
                                 SET fecha_hora_salida = NOW(),
                                     estado = 'cerrado',
                                     metodo_salida = 'sancion_disciplinaria',
                                     condicion = 'sancion_disciplinaria',
                                     horas_perdidas = :hp,
                                     observaciones = :obs
                                 WHERE id = :id");
        $stmtUpd->execute([
            ':hp' => $horas_descontar,
            ':obs' => $obsFinal,
            ':id' => $id_asistencia
        ]);
    }

    // Actualizar datos de sanción activa en el usuario
    $stmtUpdUser = $db->prepare("UPDATE usuarios 
                                 SET sancionado_hasta = :hasta,
                                     sancion_motivo = :motivo,
                                     sancion_detalle = :detalle,
                                     sancion_fecha = NOW(),
                                     sancion_admin_id = :id_admin
                                 WHERE id = :id_usuario");
    $stmtUpdUser->execute([
        ':hasta' => $sancionadoHasta,
        ':motivo' => $motivo,
        ':detalle' => $detalle,
        ':id_admin' => $id_admin,
        ':id_usuario' => $id_usuario
    ]);

    // Finalizar sanciones previas que estuviesen activas
    $db->prepare("UPDATE rrhh_sanciones SET estado = 'cumplida' WHERE id_usuario = :u AND estado = 'activa'")->execute([':u' => $id_usuario]);

    // Registrar en tabla histórica de sanciones
    $stmtInsSanc = $db->prepare("INSERT INTO rrhh_sanciones 
        (id_usuario, id_asistencia, id_admin, motivo, detalle, fecha_inicio, fecha_fin, dias_sancion, horas_descontadas, estado)
        VALUES
        (:u, :a, :adm, :mot, :det, NOW(), :fin, :dias, :hp, 'activa')");
    $stmtInsSanc->execute([
        ':u' => $id_usuario,
        ':a' => $id_asistencia ?: null,
        ':adm' => $id_admin ?: null,
        ':mot' => $motivo,
        ':det' => $detalle,
        ':fin' => $sancionadoHasta,
        ':dias' => $diasSancion,
        ':hp' => $horas_descontar ?: 0.00
    ]);
    
    respondSuccess([
        'id_asistencia' => $id_asistencia,
        'id_usuario' => $id_usuario,
        'empleado' => $asist['nombre'] . ' ' . ($asist['apellido'] ?: ''),
        'horas_trabajadas' => $horasTrabajadas,
        'horas_descontadas' => $horas_descontar,
        'sancionado_hasta' => $sancionadoHasta,
        'sancionado_hasta_formateada' => $hastaFmt,
        'motivo' => $motivo
    ], "Sanción aplicada exitosamente a {$asist['nombre']}. Acceso bloqueado hasta el {$hastaFmt}" . ($id_asistencia ? " y turno cerrado." : "."));
}

// ==========================================
// 4.2 LEVANTAR / QUITAR SANCIÓN DISCIPLINARIA
// ==========================================
else if ($method === 'POST' && $accion === 'levantar_sancion') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_usuario = isset($input['id_usuario']) ? (int)$input['id_usuario'] : 0;
    $motivo = isset($input['motivo']) && trim($input['motivo']) !== '' ? trim($input['motivo']) : 'Acuerdo de rehabilitación / Levantamiento administrativo';
    $id_admin = isset($input['id_admin']) ? (int)$input['id_admin'] : null;

    if (!$id_usuario) respondError("ID de colaborador es requerido");

    $stmtU = $db->prepare("SELECT id, nombre, apellido, dni, sancionado_hasta FROM usuarios WHERE id = :id");
    $stmtU->execute([':id' => $id_usuario]);
    $user = $stmtU->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado", 404);

    // Limpiar sanción activa en el registro del usuario
    $stmtUpd = $db->prepare("UPDATE usuarios 
                             SET sancionado_hasta = NULL,
                                 sancion_motivo = NULL,
                                 sancion_detalle = NULL,
                                 sancion_fecha = NULL,
                                 sancion_admin_id = NULL
                             WHERE id = :id");
    $stmtUpd->execute([':id' => $id_usuario]);

    // Marcar como levantada en el historial
    $stmtSanc = $db->prepare("UPDATE rrhh_sanciones 
                              SET estado = 'levantada',
                                  levantado_por = :admin,
                                  fecha_levantamiento = NOW(),
                                  motivo_levantamiento = :motivo
                              WHERE id_usuario = :id AND estado = 'activa'");
    $stmtSanc->execute([
        ':admin' => $id_admin,
        ':motivo' => $motivo,
        ':id' => $id_usuario
    ]);

    respondSuccess([
        "id_usuario" => $id_usuario,
        "nombre" => $user['nombre'] . ' ' . ($user['apellido'] ?: '')
    ], "Sanción levantada con éxito para {$user['nombre']}. Su acceso al sistema y registro de turnos ha sido restablecido.");
}

// ==========================================
// 5. JUSTIFICACIONES DE INASISTENCIA / PERMISOS
// ==========================================
else if ($method === 'POST' && $accion === 'enviar_justificacion') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    
    $dni = isset($input['dni']) ? trim($input['dni']) : '';
    $fecha = isset($input['fecha']) ? trim($input['fecha']) : date('Y-m-d');
    $motivo = isset($input['motivo']) ? trim($input['motivo']) : '';
    $descripcion = isset($input['descripcion']) ? trim($input['descripcion']) : '';
    $foto_data = isset($input['foto']) ? $input['foto'] : (isset($_FILES['foto']) ? $_FILES['foto'] : null);
    
    if (empty($dni)) respondError("DNI es obligatorio");
    if (empty($motivo)) respondError("Debes seleccionar el motivo de la falta o permiso");
    if (empty($descripcion)) respondError("Debes ingresar una descripción detallada");
    
    $stmt = $db->prepare("SELECT id, nombre, apellido FROM usuarios WHERE dni = :dni AND estado = 'activo' LIMIT 1");
    $stmt->execute([':dni' => $dni]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("No se encontró ningún trabajador activo con el DNI proporcionado");
    
    $foto_url = null;
    $uploadDir = __DIR__ . '/../uploads/justificaciones/';
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);
    
    // Manejo de foto base64 o $_FILES
    if (!empty($foto_data)) {
        if (is_string($foto_data) && strpos($foto_data, ';base64,') !== false) {
            $parts = explode(";base64,", $foto_data);
            $type_aux = explode("image/", $parts[0]);
            $ext = isset($type_aux[1]) ? $type_aux[1] : 'jpeg';
            $data = base64_decode(str_replace(' ', '+', $parts[1]));
            $filename = 'just_' . $user['id'] . '_' . time() . '.' . $ext;
            file_put_contents($uploadDir . $filename, $data);
            $foto_url = 'uploads/justificaciones/' . $filename;
        } else if (is_array($foto_data) && isset($foto_data['tmp_name']) && is_uploaded_file($foto_data['tmp_name'])) {
            $ext = pathinfo($foto_data['name'], PATHINFO_EXTENSION);
            $filename = 'just_' . $user['id'] . '_' . time() . '.' . $ext;
            if (move_uploaded_file($foto_data['tmp_name'], $uploadDir . $filename)) {
                $foto_url = 'uploads/justificaciones/' . $filename;
            }
        }
    }
    
    $stmt = $db->prepare("INSERT INTO rrhh_justificaciones (id_usuario, fecha, motivo, descripcion, foto_evidencia_url, estado) 
                          VALUES (:id_user, :fecha, :motivo, :desc, :foto, 'pendiente')");
    $stmt->execute([
        ':id_user' => $user['id'],
        ':fecha' => $fecha,
        ':motivo' => $motivo,
        ':desc' => $descripcion,
        ':foto' => $foto_url
    ]);
    
    respondSuccess([
        "id" => $db->lastInsertId(),
        "usuario" => $user['nombre'] . ' ' . $user['apellido']
    ], "Justificación enviada correctamente. Recursos Humanos revisará tu solicitud.");
}

else if ($method === 'GET' && $accion === 'justificaciones') {
    $estado = isset($_GET['estado']) ? trim($_GET['estado']) : '';
    
    $query = "SELECT j.*, 
                     u.nombre, u.apellido, u.dni, u.foto_perfil,
                     r.nombre as rol_nombre,
                     adm.nombre as admin_nombre, adm.apellido as admin_apellido
              FROM rrhh_justificaciones j
              JOIN usuarios u ON j.id_usuario = u.id
              JOIN roles r ON u.id_rol = r.id
              LEFT JOIN usuarios adm ON j.id_admin_resolucion = adm.id
              WHERE 1=1";
              
    $params = [];
    if (!empty($estado) && $estado !== 'todas') {
        $query .= " AND j.estado = :estado";
        $params[':estado'] = $estado;
    }
    
    $query .= " ORDER BY j.id DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $justificaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    respondSuccess($justificaciones);
}

else if ($method === 'POST' && $accion === 'resolver_justificacion') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $nuevo_estado = isset($input['estado']) ? trim($input['estado']) : ''; // 'aprobado' o 'desaprobado'
    $tipo_resolucion = isset($input['tipo_resolucion']) ? trim($input['tipo_resolucion']) : 'sin_goce';
    $horas_afectadas = isset($input['horas_afectadas']) ? (float)$input['horas_afectadas'] : 0.00;
    $comentarios = isset($input['comentarios_resolucion']) ? trim($input['comentarios_resolucion']) : '';
    $id_admin = isset($input['id_admin']) ? (int)$input['id_admin'] : null;
    
    if (!$id) respondError("ID de justificación requerido");
    if (!in_array($nuevo_estado, ['aprobado', 'desaprobado'])) {
        respondError("Estado inválido. Debe ser 'aprobado' o 'desaprobado'");
    }
    
    // Obtener justificación
    $stmtJ = $db->prepare("SELECT * FROM rrhh_justificaciones WHERE id = :id");
    $stmtJ->execute([':id' => $id]);
    $just = $stmtJ->fetch(PDO::FETCH_ASSOC);
    if (!$just) respondError("Justificación no encontrada");
    
    // Actualizar registro en rrhh_justificaciones
    $stmtUpd = $db->prepare("UPDATE rrhh_justificaciones 
                             SET estado = :estado, 
                                 tipo_resolucion = :tipo_res, 
                                 horas_afectadas = :horas, 
                                 id_admin_resolucion = :admin, 
                                 comentarios_resolucion = :comentarios, 
                                 fecha_resolucion = NOW() 
                             WHERE id = :id");
    $stmtUpd->execute([
        ':estado' => $nuevo_estado,
        ':tipo_res' => $tipo_resolucion,
        ':horas' => $horas_afectadas,
        ':admin' => $id_admin,
        ':comentarios' => $comentarios,
        ':id' => $id
    ]);
    
    // Reflejar en rrhh_asistencias para cómputo de horas
    $fecha = $just['fecha'];
    $id_user = $just['id_usuario'];
    
    $horas_extra = 0.00;
    $horas_perdidas = 0.00;
    $condicion = 'falta_justificada';
    
    if ($nuevo_estado === 'aprobado') {
        if ($tipo_resolucion === 'tiempo_extra') {
            $horas_extra = $horas_afectadas;
            $condicion = 'permiso';
        } else if ($tipo_resolucion === 'tiempo_perdido' || $tipo_resolucion === 'sin_goce') {
            $horas_perdidas = $horas_afectadas;
            $condicion = 'falta_justificada';
        } else if ($tipo_resolucion === 'con_goce') {
            $horas_perdidas = 0.00;
            $condicion = 'falta_justificada';
        }
    } else {
        $condicion = 'falta_injustificada';
        $horas_perdidas = $horas_afectadas > 0 ? $horas_afectadas : 8.00; // Si fue desaprobada, se descuentan las horas
    }
    
    // Verificar si ya existe registro en rrhh_asistencias para esa fecha
    $stmtCheck = $db->prepare("SELECT id FROM rrhh_asistencias WHERE id_usuario = :user AND DATE(fecha_hora_entrada) = :fecha LIMIT 1");
    $stmtCheck->execute([':user' => $id_user, ':fecha' => $fecha]);
    $asistId = $stmtCheck->fetchColumn();
    
    if ($asistId) {
        $stmtUpdAsist = $db->prepare("UPDATE rrhh_asistencias 
                                      SET condicion = :cond, 
                                          horas_extra = :he, 
                                          horas_perdidas = :hp, 
                                          id_justificacion = :jid,
                                          observaciones = CONCAT(IFNULL(observaciones,''), ' | Justificación: ', :obs)
                                      WHERE id = :id");
        $stmtUpdAsist->execute([
            ':cond' => $condicion,
            ':he' => $horas_extra,
            ':hp' => $horas_perdidas,
            ':jid' => $id,
            ':obs' => $comentarios ?: $nuevo_estado,
            ':id' => $asistId
        ]);
    } else {
        $stmtInsAsist = $db->prepare("INSERT INTO rrhh_asistencias 
                                      (id_usuario, fecha_hora_entrada, fecha_hora_salida, estado, condicion, horas_extra, horas_perdidas, id_justificacion, observaciones, metodo_salida) 
                                      VALUES (:user, :fin, :fout, 'cerrado', :cond, :he, :hp, :jid, :obs, 'manual')");
        $stmtInsAsist->execute([
            ':user' => $id_user,
            ':fin' => $fecha . ' 09:00:00',
            ':fout' => $fecha . ' 18:00:00',
            ':cond' => $condicion,
            ':he' => $horas_extra,
            ':hp' => $horas_perdidas,
            ':jid' => $id,
            ':obs' => 'Justificación resuelta: ' . ($comentarios ?: $nuevo_estado)
        ]);
    }
    
    respondSuccess(null, "Justificación " . ($nuevo_estado === 'aprobado' ? "Aprobada" : "Desaprobada") . " exitosamente.");
}

// ==========================================
// 6. FICHA DE PERSONAL Y CÁLCULO DE REMUNERACIÓN
// ==========================================
else if ($method === 'GET' && $accion === 'fichas_personal') {
    $mes = isset($_GET['mes']) ? trim($_GET['mes']) : date('Y-m'); // Formato: YYYY-MM
    $id_usuario = isset($_GET['id_usuario']) ? (int)$_GET['id_usuario'] : 0;
    
    // Primer y último día del mes
    $inicioMes = $mes . '-01';
    $finMes = date("Y-m-t", strtotime($inicioMes));
    
    // Rango de la semana actual (Lunes a Domingo)
    $lunesEstaSemana = date('Y-m-d', strtotime('monday this week'));
    $domingoEstaSemana = date('Y-m-d', strtotime('sunday this week'));
    
    // Obtener usuarios activos
    $qUsers = "SELECT u.id, u.nombre, u.apellido, u.dni, u.email, u.celular, u.foto_perfil, 
                      u.cargo, u.fecha_contratacion, u.estado,
                      u.sueldo_base, u.sueldo_por_hora, u.tipo_pago, u.horas_semanales_pactadas,
                      u.hora_entrada_asignada, u.hora_salida_asignada,
                      u.sancionado_hasta, u.sancion_motivo, u.sancion_detalle, u.sancion_fecha,
                      r.nombre as rol_nombre, r.hora_entrada as rol_hora_entrada, r.hora_salida as rol_hora_salida
               FROM usuarios u 
               JOIN roles r ON u.id_rol = r.id 
               WHERE u.estado = 'activo'";
               
    if ($id_usuario > 0) {
        $qUsers .= " AND u.id = " . $id_usuario;
    }
    
    $qUsers .= " ORDER BY u.nombre ASC";
    $stmtUsers = $db->query($qUsers);
    $empleados = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
    
    $resultado = [];
    
    // Optimización de Alto Rendimiento: 1 sola consulta agrupada para métricas mensuales de todos los empleados
    $stmtHorasMes = $db->prepare("SELECT id_usuario,
                                         IFNULL(SUM(TIMESTAMPDIFF(MINUTE, fecha_hora_entrada, fecha_hora_salida)), 0) as minutos_mes,
                                         IFNULL(SUM(horas_extra), 0) as total_horas_extra,
                                         IFNULL(SUM(horas_perdidas), 0) as total_horas_perdidas,
                                         SUM(CASE WHEN condicion = 'tardanza' THEN 1 ELSE 0 END) as cant_tardanzas,
                                         SUM(CASE WHEN condicion = 'tardanza' THEN IFNULL(minutos_tardanza, 0) ELSE 0 END) as sum_minutos_tardanza,
                                         SUM(CASE WHEN condicion = 'falta_injustificada' THEN 1 ELSE 0 END) as faltas_injustificadas,
                                         SUM(CASE WHEN condicion = 'falta_justificada' THEN 1 ELSE 0 END) as faltas_justificadas,
                                         SUM(CASE WHEN condicion = 'permiso' THEN 1 ELSE 0 END) as permisos,
                                         SUM(CASE WHEN condicion = 'sancion_disciplinaria' THEN 1 ELSE 0 END) as sanciones
                                  FROM rrhh_asistencias 
                                  WHERE fecha_hora_entrada >= :inicio AND fecha_hora_entrada <= :fin
                                  GROUP BY id_usuario");
    $stmtHorasMes->execute([':inicio' => $inicioMes . ' 00:00:00', ':fin' => $finMes . ' 23:59:59']);
    $mesDataGrouped = [];
    while ($row = $stmtHorasMes->fetch(PDO::FETCH_ASSOC)) {
        $mesDataGrouped[$row['id_usuario']] = $row;
    }

    // 1 sola consulta agrupada para horas semanales
    $stmtHorasSemana = $db->prepare("SELECT id_usuario,
                                            IFNULL(SUM(TIMESTAMPDIFF(MINUTE, fecha_hora_entrada, fecha_hora_salida)), 0) as minutos_semana
                                     FROM rrhh_asistencias 
                                     WHERE fecha_hora_entrada >= :lunes AND fecha_hora_entrada <= :domingo 
                                       AND fecha_hora_salida IS NOT NULL
                                     GROUP BY id_usuario");
    $stmtHorasSemana->execute([':lunes' => $lunesEstaSemana . ' 00:00:00', ':domingo' => $domingoEstaSemana . ' 23:59:59']);
    $semanaDataGrouped = [];
    while ($row = $stmtHorasSemana->fetch(PDO::FETCH_ASSOC)) {
        $semanaDataGrouped[$row['id_usuario']] = (int)$row['minutos_semana'];
    }

    foreach ($empleados as $emp) {
        $empId = $emp['id'];
        $dataHoras = $mesDataGrouped[$empId] ?? null;
        
        $minutosMes = $dataHoras ? (int)$dataHoras['minutos_mes'] : 0;
        $horasMes = round($minutosMes / 60, 2);
        $totalHorasExtra = $dataHoras ? (float)$dataHoras['total_horas_extra'] : 0.00;
        $totalHorasPerdidas = $dataHoras ? (float)$dataHoras['total_horas_perdidas'] : 0.00;
        
        $minutosSemana = $semanaDataGrouped[$empId] ?? 0;
        $horasSemana = round($minutosSemana / 60, 2);
        
        $cantTardanzas = $dataHoras ? (int)$dataHoras['cant_tardanzas'] : 0;
        $minutosTardanzas = $dataHoras ? (int)$dataHoras['sum_minutos_tardanza'] : 0;
        
        $faltasInjustificadas = $dataHoras ? (int)$dataHoras['faltas_injustificadas'] : 0;
        $faltasJustificadas = $dataHoras ? (int)$dataHoras['faltas_justificadas'] : 0;
        $permisos = $dataHoras ? (int)$dataHoras['permisos'] : 0;
        $sanciones = $dataHoras ? (int)$dataHoras['sanciones'] : 0;
        
        // 5. CÁLCULO DE REMUNERACIÓN
        $sueldoBase = (float)$emp['sueldo_base'];
        $sueldoHora = (float)$emp['sueldo_por_hora'];
        $tipoPago = $emp['tipo_pago'] ?: 'mensual';
        
        // Tarifa por hora de referencia
        $tarifaHoraEfectiva = $sueldoHora > 0 ? $sueldoHora : ($sueldoBase > 0 ? round($sueldoBase / 240, 2) : 0);
        
        $descuentoTardanzas = round(($minutosTardanzas / 60) * $tarifaHoraEfectiva, 2);
        $descuentoHorasPerdidas = round($totalHorasPerdidas * $tarifaHoraEfectiva, 2);
        $bonificacionHorasExtra = round($totalHorasExtra * ($tarifaHoraEfectiva * 1.25), 2);
        
        $montoCobrar = 0.00;
        
        if ($tipoPago === 'hora') {
            $montoCobrar = max(0, round(($horasMes * $tarifaHoraEfectiva) + $bonificacionHorasExtra - $descuentoHorasPerdidas, 2));
        } else {
            // Sueldo fijo mensual con descuentos y extras
            $montoCobrar = max(0, round($sueldoBase - $descuentoTardanzas - $descuentoHorasPerdidas + $bonificacionHorasExtra, 2));
        }
        
        $resultado[] = [
            'usuario' => [
                'id' => $emp['id'],
                'nombre' => $emp['nombre'],
                'apellido' => $emp['apellido'],
                'dni' => $emp['dni'],
                'email' => $emp['email'],
                'celular' => $emp['celular'],
                'foto_perfil' => $emp['foto_perfil'],
                'cargo' => $emp['cargo'] ?? null,
                'fecha_contratacion' => $emp['fecha_contratacion'] ?? null,
                'estado' => $emp['estado'] ?? 'activo',
                'rol' => $emp['rol_nombre'],
                'sancionado_hasta' => $emp['sancionado_hasta'] ?? null,
                'sancion_motivo' => $emp['sancion_motivo'] ?? null,
                'sancion_detalle' => $emp['sancion_detalle'] ?? null,
                'es_sancionado' => (!empty($emp['sancionado_hasta']) && strtotime($emp['sancionado_hasta']) > time())
            ],
            'contrato' => [
                'sueldo_base' => $sueldoBase,
                'sueldo_por_hora' => $sueldoHora,
                'tarifa_hora_efectiva' => $tarifaHoraEfectiva,
                'tipo_pago' => $tipoPago,
                'horas_pactadas_semana' => (int)$emp['horas_semanales_pactadas']
            ],
            'metricas' => [
                'mes' => $mes,
                'horas_mes' => $horasMes,
                'horas_semana' => $horasSemana,
                'tardanzas_conteo' => $cantTardanzas,
                'tardanzas_minutos' => $minutosTardanzas,
                'faltas_injustificadas' => $faltasInjustificadas,
                'faltas_justificadas' => $faltasJustificadas,
                'permisos' => $permisos,
                'sanciones' => $sanciones,
                'horas_extra' => $totalHorasExtra,
                'horas_perdidas' => $totalHorasPerdidas
            ],
            'liquidacion' => [
                'descuento_tardanzas' => $descuentoTardanzas,
                'descuento_horas_perdidas' => $descuentoHorasPerdidas,
                'bonificacion_horas_extra' => $bonificacionHorasExtra,
                'monto_total_cobrar' => $montoCobrar
            ]
        ];
    }
    
    respondSuccess($resultado);
}

// ==========================================
// 7. GUARDAR SUELDO Y PARÁMETROS DE PERSONAL
// ==========================================
else if ($method === 'POST' && $accion === 'guardar_sueldo') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    
    $id_user = isset($input['id_usuario']) ? (int)$input['id_usuario'] : (isset($input['id']) ? (int)$input['id'] : 0);
    $sueldo_base = isset($input['sueldo_base']) ? (float)$input['sueldo_base'] : 0.00;
    $sueldo_hora = isset($input['sueldo_por_hora']) ? (float)$input['sueldo_por_hora'] : 0.00;
    $tipo_pago = isset($input['tipo_pago']) ? trim($input['tipo_pago']) : 'mensual';
    $horas_pactadas = isset($input['horas_semanales_pactadas']) ? (int)$input['horas_semanales_pactadas'] : (isset($input['horas_pactadas']) ? (int)$input['horas_pactadas'] : 48);
    
    if (!$id_user) respondError("ID de usuario requerido");
    
    $stmt = $db->prepare("UPDATE usuarios 
                          SET sueldo_base = :base, 
                              sueldo_por_hora = :hora, 
                              tipo_pago = :tipo, 
                              horas_semanales_pactadas = :pactadas 
                          WHERE id = :id");
    $stmt->execute([
        ':base' => $sueldo_base,
        ':hora' => $sueldo_hora,
        ':tipo' => $tipo_pago,
        ':pactadas' => $horas_pactadas,
        ':id' => $id_user
    ]);
    
    respondSuccess(null, "Datos salariales actualizados exitosamente");
}

// ==========================================
// 8. CONFIGURACIÓN Y QR DE GOOGLE AUTHENTICATOR SUPERVISOR
// ==========================================
else if ($method === 'GET' && $accion === 'totp_supervisor') {
    $stmt = $db->query("SELECT valor FROM configuracion WHERE clave = 'rrhh_totp_supervisor_secret' LIMIT 1");
    $secret = $stmt ? $stmt->fetchColumn() : '';
    
    if (empty($secret)) {
        $secret = GoogleAuthenticator::generateSecret(16);
        $stmtIns = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('rrhh_totp_supervisor_secret', :val) ON DUPLICATE KEY UPDATE valor = :val");
        $stmtIns->execute([':val' => $secret]);
    }
    
    $stmtEmp = $db->query("SELECT valor FROM configuracion WHERE clave = 'nombre_empresa' LIMIT 1");
    $empresa = $stmtEmp ? ($stmtEmp->fetchColumn() ?: 'Khalessi ERP') : 'Khalessi ERP';
    
    $qrUrl = GoogleAuthenticator::getQrCodeUrl($empresa, 'Supervisor RRHH', $secret);
    
    // Obtener tolerancia y horario de refrigerio configurado
    $stmtCfg = $db->query("SELECT clave, valor FROM configuracion WHERE clave IN ('rrhh_tolerancia_tardanza_minutos', 'rrhh_refrigerio_inicio', 'rrhh_refrigerio_fin', 'rrhh_refrigerio_minutos')");
    $cfgs = $stmtCfg ? $stmtCfg->fetchAll(PDO::FETCH_KEY_PAIR) : [];

    respondSuccess([
        'secret' => $secret,
        'empresa' => $empresa,
        'qr_url' => $qrUrl,
        'tolerancia_minutos' => isset($cfgs['rrhh_tolerancia_tardanza_minutos']) ? $cfgs['rrhh_tolerancia_tardanza_minutos'] : '15',
        'refrigerio_inicio' => isset($cfgs['rrhh_refrigerio_inicio']) ? $cfgs['rrhh_refrigerio_inicio'] : '13:00',
        'refrigerio_fin' => isset($cfgs['rrhh_refrigerio_fin']) ? $cfgs['rrhh_refrigerio_fin'] : '15:00',
        'refrigerio_minutos' => isset($cfgs['rrhh_refrigerio_minutos']) ? $cfgs['rrhh_refrigerio_minutos'] : '60'
    ]);
}

else if ($method === 'POST' && $accion === 'regenerar_totp_supervisor') {
    $newSecret = GoogleAuthenticator::generateSecret(16);
    $stmt = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('rrhh_totp_supervisor_secret', :val) ON DUPLICATE KEY UPDATE valor = :val");
    $stmt->execute([':val' => $newSecret]);
    
    $stmtEmp = $db->query("SELECT valor FROM configuracion WHERE clave = 'nombre_empresa' LIMIT 1");
    $empresa = $stmtEmp ? ($stmtEmp->fetchColumn() ?: 'Khalessi ERP') : 'Khalessi ERP';
    
    $qrUrl = GoogleAuthenticator::getQrCodeUrl($empresa, 'Supervisor RRHH', $newSecret);
    
    respondSuccess([
        'secret' => $newSecret,
        'qr_url' => $qrUrl
    ], "Nueva clave secreta de Google Authenticator generada con éxito");
}

else if ($method === 'POST' && $accion === 'guardar_ajustes_rrhh') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    
    if (isset($input['tolerancia_minutos'])) {
        $val = (string)(int)$input['tolerancia_minutos'];
        $stmt = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('rrhh_tolerancia_tardanza_minutos', :val) ON DUPLICATE KEY UPDATE valor = :val");
        $stmt->execute([':val' => $val]);
    }
    if (isset($input['refrigerio_inicio'])) {
        $val = trim($input['refrigerio_inicio']);
        $stmt = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('rrhh_refrigerio_inicio', :val) ON DUPLICATE KEY UPDATE valor = :val");
        $stmt->execute([':val' => $val]);
    }
    if (isset($input['refrigerio_fin'])) {
        $val = trim($input['refrigerio_fin']);
        $stmt = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('rrhh_refrigerio_fin', :val) ON DUPLICATE KEY UPDATE valor = :val");
        $stmt->execute([':val' => $val]);
    }
    if (isset($input['refrigerio_minutos'])) {
        $val = (string)(int)$input['refrigerio_minutos'];
        $stmt = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('rrhh_refrigerio_minutos', :val) ON DUPLICATE KEY UPDATE valor = :val");
        $stmt->execute([':val' => $val]);
    }
    
    respondSuccess(null, "Ajustes de RRHH y horario de refrigerio guardados exitosamente");
}

// ==========================================
// 9. HISTORIAL CON DETALLES DE TARDANZAS Y HORAS
// ==========================================
else if ($method === 'GET' && $accion === 'historial') {
    $inicio = isset($_GET['fecha_inicio']) ? $_GET['fecha_inicio'] : null;
    $fin = isset($_GET['fecha_fin']) ? $_GET['fecha_fin'] : null;

    $query = "SELECT a.*, a.foto_entrada_url as foto_entrada, u.nombre, u.apellido, u.dni, u.foto_perfil,
              IFNULL(u.hora_entrada_asignada, r.hora_entrada) as hora_entrada_asignada, 
              IFNULL(u.hora_salida_asignada, r.hora_salida) as hora_salida_asignada,
              TIMESTAMPDIFF(MINUTE, a.fecha_hora_entrada, a.fecha_hora_salida) as minutos_trabajados,
              j.motivo as justificacion_motivo, j.estado as justificacion_estado, j.foto_evidencia_url as justificacion_foto_evidencia
              FROM rrhh_asistencias a
              JOIN usuarios u ON a.id_usuario = u.id
              JOIN roles r ON u.id_rol = r.id
              LEFT JOIN rrhh_justificaciones j ON a.id_justificacion = j.id
              WHERE 1=1";
    
    $params = [];
    if ($inicio && $fin) {
        $query .= " AND a.fecha_hora_entrada >= :inicio AND a.fecha_hora_entrada <= :fin";
        $params[':inicio'] = $inicio . ' 00:00:00';
        $params[':fin'] = $fin . ' 23:59:59';
    }
    
    $query .= " ORDER BY a.fecha_hora_entrada DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $historial = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($historial);
}

else if ($accion === 'roles_horarios' || ($method === 'POST' && $accion === 'save_horario_rol')) {
    if ($method === 'GET') {
        $stmt = $db->query("SELECT id, nombre, descripcion, hora_entrada, hora_salida FROM roles ORDER BY id");
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respondSuccess($roles);
    } else {
        $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $id_rol = isset($input['id_rol']) ? $input['id_rol'] : (isset($input['id']) ? $input['id'] : null);
        $hora_entrada = isset($input['hora_entrada']) && $input['hora_entrada'] !== '' ? $input['hora_entrada'] : null;
        $hora_salida = isset($input['hora_salida']) && $input['hora_salida'] !== '' ? $input['hora_salida'] : null;
        
        if (!$id_rol) respondError("ID de rol requerido");
        
        $stmt = $db->prepare("UPDATE roles SET hora_entrada = :entrada, hora_salida = :salida WHERE id = :id");
        $stmt->execute([':entrada' => $hora_entrada, ':salida' => $hora_salida, ':id' => $id_rol]);
        
        respondSuccess(null, "Horario del rol actualizado exitosamente");
    }
}

else if ($method === 'POST' && $accion === 'registrar_ausencia') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;

    $id_usuario = isset($input['id_usuario']) ? $input['id_usuario'] : '';
    $fecha = isset($input['fecha']) ? $input['fecha'] : '';
    $tipo = isset($input['tipo']) ? $input['tipo'] : '';
    $observaciones = isset($input['observaciones']) ? $input['observaciones'] : '';

    if (empty($id_usuario) || empty($fecha) || empty($tipo)) {
        respondError("Faltan datos obligatorios");
    }

    $stmt = $db->prepare("INSERT INTO rrhh_asistencias (id_usuario, fecha_hora_entrada, fecha_hora_salida, estado, condicion, observaciones, metodo_salida) 
                          VALUES (:id_user, :fecha_in, :fecha_out, 'cerrado', :condicion, :obs, 'manual')");
    
    $fecha_in = $fecha . " 00:00:00";
    $fecha_out = $fecha . " 23:59:59";
    
    $stmt->execute([
        ':id_user' => $id_usuario,
        ':fecha_in' => $fecha_in,
        ':fecha_out' => $fecha_out,
        ':condicion' => $tipo,
        ':obs' => $observaciones
    ]);

    respondSuccess(null, "Ausencia registrada exitosamente");
}
else {
    respondError("Acción de rrhh no válida", 404);
}
