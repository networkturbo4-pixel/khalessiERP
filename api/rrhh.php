<?php
// api/rrhh.php - Módulo integral de Recursos Humanos, Asistencias, Justificaciones y Sueldos

require_once __DIR__ . '/totp.php';

// Auto-checkout: Cierra asistencias abiertas donde la hora de salida + 30 min ya pasó
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

// ==========================================
// 1. ESTADO DE ASISTENCIA Y EVALUACIÓN DE TARDANZA
// ==========================================
if ($method === 'GET' && $accion === 'estado') {
    $dni = isset($_GET['dni']) ? trim($_GET['dni']) : '';
    if (empty($dni)) respondError("DNI es requerido");
    
    $stmt = $db->prepare("SELECT u.id, u.nombre, u.apellido, u.dni, u.foto_perfil, u.hora_entrada_asignada, u.hora_salida_asignada, u.totp_secret, r.nombre as rol_nombre, r.hora_entrada as rol_hora_entrada, r.hora_salida as rol_hora_salida 
                          FROM usuarios u 
                          JOIN roles r ON u.id_rol = r.id 
                          WHERE u.dni = :dni AND u.estado = 'activo'");
    $stmt->execute([':dni' => $dni]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) respondError("Usuario no encontrado o inactivo", 404);
    
    // Verificar si ya tiene un turno abierto hoy
    $stmt = $db->prepare("SELECT id, fecha_hora_entrada FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND estado = 'abierto' LIMIT 1");
    $stmt->execute([':id_usuario' => $user['id']]);
    $asistencia = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Obtener tolerancia configurada (en minutos)
    $stmtTol = $db->prepare("SELECT valor FROM configuracion WHERE clave = 'rrhh_tolerancia_tardanza_minutos' LIMIT 1");
    $stmtTol->execute();
    $tolerancia = (int)($stmtTol->fetchColumn() ?: 15);
    
    // Evaluar horario de entrada
    $hora_evaluar = !empty($user['hora_entrada_asignada']) ? $user['hora_entrada_asignada'] : $user['rol_hora_entrada'];
    $es_tardanza = false;
    $minutos_tardanza = 0;
    $hora_actual = date('H:i');
    
    if (!$asistencia && !empty($hora_evaluar)) {
        $hora_esperada_ts = strtotime(date('Y-m-d') . ' ' . $hora_evaluar);
        $limite_tolerancia_ts = $hora_esperada_ts + ($tolerancia * 60);
        $ahora_ts = time();
        
        if ($ahora_ts > $limite_tolerancia_ts) {
            $es_tardanza = true;
            $minutos_tardanza = max(1, round(($ahora_ts - $hora_esperada_ts) / 60));
        }
    }
    
    // No enviar secreto TOTP al frontend por seguridad
    unset($user['totp_secret']);

    respondSuccess([
        "user" => $user,
        "estado" => $asistencia ? 'abierto' : 'cerrado',
        "asistencia_id" => $asistencia ? $asistencia['id'] : null,
        "es_tardanza" => $es_tardanza,
        "minutos_tardanza" => $minutos_tardanza,
        "hora_esperada" => $hora_evaluar ? substr($hora_evaluar, 0, 5) : null,
        "hora_actual" => $hora_actual,
        "tolerancia_minutos" => $tolerancia,
        "requiere_totp" => $es_tardanza
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
    
    $stmt = $db->prepare("SELECT u.id, u.totp_secret, u.hora_entrada_asignada, r.hora_entrada as rol_hora_entrada 
                          FROM usuarios u 
                          JOIN roles r ON u.id_rol = r.id 
                          WHERE u.dni = :dni AND u.estado = 'activo'");
    $stmt->execute([':dni' => $dni]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado");
    
    // Verificar si ya tiene un turno abierto
    $stmt = $db->prepare("SELECT id FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND estado = 'abierto'");
    $stmt->execute([':id_usuario' => $user['id']]);
    if ($stmt->rowCount() > 0) respondError("El usuario ya tiene un turno abierto");
    
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
// 4. MARCAR SALIDA
// ==========================================
else if ($method === 'POST' && $accion === 'marcar_salida') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $dni = isset($input['dni']) ? trim($input['dni']) : '';
    
    if (empty($dni)) respondError("DNI es obligatorio");
    
    $stmt = $db->prepare("SELECT id FROM usuarios WHERE dni = :dni AND estado = 'activo'");
    $stmt->execute([':dni' => $dni]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) respondError("Usuario no encontrado");
    
    $stmt = $db->prepare("SELECT id, fecha_hora_entrada FROM rrhh_asistencias WHERE id_usuario = :id_usuario AND estado = 'abierto' LIMIT 1");
    $stmt->execute([':id_usuario' => $user['id']]);
    $asistencia = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$asistencia) respondError("No hay un turno abierto para este usuario");
    
    $stmt = $db->prepare("UPDATE rrhh_asistencias SET fecha_hora_salida = NOW(), metodo_salida = 'manual', estado = 'cerrado' WHERE id = :id");
    $stmt->execute([':id' => $asistencia['id']]);
    
    respondSuccess(null, "Salida registrada exitosamente");
}

// ==========================================
// 4.1 TURNOS ACTIVOS Y RETIRO DISCIPLINARIO
// ==========================================
else if ($method === 'GET' && $accion === 'turnos_activos') {
    $q = "SELECT a.id as id_asistencia, a.id_usuario, a.fecha_hora_entrada, a.condicion, a.minutos_tardanza,
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
    
    if (!$id_asistencia && $id_usuario > 0) {
        $stmtA = $db->prepare("SELECT id FROM rrhh_asistencias WHERE id_usuario = :u AND estado = 'abierto' ORDER BY id DESC LIMIT 1");
        $stmtA->execute([':u' => $id_usuario]);
        $id_asistencia = (int)$stmtA->fetchColumn();
    }
    
    if (!$id_asistencia) {
        respondError("No se encontró un turno abierto para este colaborador");
    }
    
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
    
    $entradaTs = strtotime($asist['fecha_hora_entrada']);
    $ahoraTs = time();
    $minutosTrabajados = max(1, round(($ahoraTs - $entradaTs) / 60));
    $horasTrabajadas = round($minutosTrabajados / 60, 2);
    
    if ($horas_descontar === null || $horas_descontar < 0) {
        $horas_descontar = max(0.5, round(8.0 - $horasTrabajadas, 2));
    }
    
    $horaCorteStr = date('H:i');
    $fechaHoy = date('Y-m-d');
    $obsSancion = "[RETIRO DISCIPLINARIO {$fechaHoy} {$horaCorteStr}] Motivo: {$motivo}. ";
    if (!empty($detalle)) $obsSancion .= "Detalle: {$detalle}. ";
    $obsSancion .= "Laboró: {$horasTrabajadas}h. Descuento aplicado: {$horas_descontar}h perdidas.";
    
    if ($id_admin) {
        $stmtAdm = $db->prepare("SELECT nombre, apellido FROM usuarios WHERE id = :id");
        $stmtAdm->execute([':id' => $id_admin]);
        $adm = $stmtAdm->fetch(PDO::FETCH_ASSOC);
        if ($adm) $obsSancion .= " Aplicado por: " . $adm['nombre'] . " " . ($adm['apellido'] ?: '') . ".";
    }
    
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
    
    respondSuccess([
        'id_asistencia' => $id_asistencia,
        'empleado' => $asist['nombre'] . ' ' . ($asist['apellido'] ?: ''),
        'horas_trabajadas' => $horasTrabajadas,
        'horas_descontadas' => $horas_descontar,
        'hora_salida' => $horaCorteStr,
        'motivo' => $motivo
    ], "Se aplicó el retiro disciplinario a {$asist['nombre']}. Turno cerrado a las {$horaCorteStr} y {$horas_descontar} hrs descontadas.");
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
    
    foreach ($empleados as $emp) {
        $empId = $emp['id'];
        
        // 1. Minutos y horas trabajadas en el mes
        $stmtHorasMes = $db->prepare("SELECT IFNULL(SUM(TIMESTAMPDIFF(MINUTE, fecha_hora_entrada, fecha_hora_salida)), 0) as minutos_mes,
                                             IFNULL(SUM(horas_extra), 0) as total_horas_extra,
                                             IFNULL(SUM(horas_perdidas), 0) as total_horas_perdidas
                                      FROM rrhh_asistencias 
                                      WHERE id_usuario = :id 
                                        AND DATE(fecha_hora_entrada) BETWEEN :inicio AND :fin 
                                        AND fecha_hora_salida IS NOT NULL");
        $stmtHorasMes->execute([':id' => $empId, ':inicio' => $inicioMes, ':fin' => $finMes]);
        $dataHoras = $stmtHorasMes->fetch(PDO::FETCH_ASSOC);
        
        $minutosMes = (int)$dataHoras['minutos_mes'];
        $horasMes = round($minutosMes / 60, 2);
        $totalHorasExtra = (float)$dataHoras['total_horas_extra'];
        $totalHorasPerdidas = (float)$dataHoras['total_horas_perdidas'];
        
        // 2. Horas trabajadas en la semana actual
        $stmtHorasSemana = $db->prepare("SELECT IFNULL(SUM(TIMESTAMPDIFF(MINUTE, fecha_hora_entrada, fecha_hora_salida)), 0) as minutos_semana
                                         FROM rrhh_asistencias 
                                         WHERE id_usuario = :id 
                                           AND DATE(fecha_hora_entrada) BETWEEN :lunes AND :domingo 
                                           AND fecha_hora_salida IS NOT NULL");
        $stmtHorasSemana->execute([':id' => $empId, ':lunes' => $lunesEstaSemana, ':domingo' => $domingoEstaSemana]);
        $minutosSemana = (int)$stmtHorasSemana->fetchColumn();
        $horasSemana = round($minutosSemana / 60, 2);
        
        // 3. Conteo de tardanzas y minutos acumulados en el mes
        $stmtTardanzas = $db->prepare("SELECT COUNT(*) as cant_tardanzas, IFNULL(SUM(minutos_tardanza), 0) as sum_minutos
                                       FROM rrhh_asistencias 
                                       WHERE id_usuario = :id 
                                         AND DATE(fecha_hora_entrada) BETWEEN :inicio AND :fin 
                                         AND condicion = 'tardanza'");
        $stmtTardanzas->execute([':id' => $empId, ':inicio' => $inicioMes, ':fin' => $finMes]);
        $dataTardanzas = $stmtTardanzas->fetch(PDO::FETCH_ASSOC);
        $cantTardanzas = (int)$dataTardanzas['cant_tardanzas'];
        $minutosTardanzas = (int)$dataTardanzas['sum_minutos'];
        
        // 4. Conteo de faltas (justificadas e injustificadas) y sanciones
        $stmtFaltas = $db->prepare("SELECT 
                                      SUM(CASE WHEN condicion = 'falta_injustificada' THEN 1 ELSE 0 END) as faltas_injustificadas,
                                      SUM(CASE WHEN condicion = 'falta_justificada' THEN 1 ELSE 0 END) as faltas_justificadas,
                                      SUM(CASE WHEN condicion = 'permiso' THEN 1 ELSE 0 END) as permisos,
                                      SUM(CASE WHEN condicion = 'sancion_disciplinaria' THEN 1 ELSE 0 END) as sanciones
                                    FROM rrhh_asistencias 
                                    WHERE id_usuario = :id 
                                      AND DATE(fecha_hora_entrada) BETWEEN :inicio AND :fin");
        $stmtFaltas->execute([':id' => $empId, ':inicio' => $inicioMes, ':fin' => $finMes]);
        $dataFaltas = $stmtFaltas->fetch(PDO::FETCH_ASSOC);
        $faltasInjustificadas = (int)$dataFaltas['faltas_injustificadas'];
        $faltasJustificadas = (int)$dataFaltas['faltas_justificadas'];
        $permisos = (int)$dataFaltas['permisos'];
        $sanciones = (int)$dataFaltas['sanciones'];
        
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
                'rol' => $emp['rol_nombre']
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
    
    // Obtener también la tolerancia configurada
    $stmtTol = $db->query("SELECT valor FROM configuracion WHERE clave = 'rrhh_tolerancia_tardanza_minutos' LIMIT 1");
    $tolerancia = $stmtTol ? ($stmtTol->fetchColumn() ?: '15') : '15';
    
    respondSuccess([
        'secret' => $secret,
        'empresa' => $empresa,
        'qr_url' => $qrUrl,
        'tolerancia_minutos' => $tolerancia
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
    $tolerancia = isset($input['tolerancia_minutos']) ? (int)$input['tolerancia_minutos'] : 15;
    
    $stmt = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('rrhh_tolerancia_tardanza_minutos', :val) ON DUPLICATE KEY UPDATE valor = :val");
    $stmt->execute([':val' => (string)$tolerancia]);
    
    respondSuccess(null, "Ajustes de RRHH guardados exitosamente");
}

// ==========================================
// 9. HISTORIAL CON DETALLES DE TARDANZAS Y HORAS
// ==========================================
else if ($method === 'GET' && $accion === 'historial') {
    $inicio = isset($_GET['fecha_inicio']) ? $_GET['fecha_inicio'] : null;
    $fin = isset($_GET['fecha_fin']) ? $_GET['fecha_fin'] : null;

    $query = "SELECT a.*, u.nombre, u.apellido, u.dni, u.foto_perfil,
              IFNULL(u.hora_entrada_asignada, r.hora_entrada) as hora_entrada_asignada, 
              IFNULL(u.hora_salida_asignada, r.hora_salida) as hora_salida_asignada,
              TIMESTAMPDIFF(MINUTE, a.fecha_hora_entrada, a.fecha_hora_salida) as minutos_trabajados,
              j.motivo as justificacion_motivo, j.estado as justificacion_estado
              FROM rrhh_asistencias a
              JOIN usuarios u ON a.id_usuario = u.id
              JOIN roles r ON u.id_rol = r.id
              LEFT JOIN rrhh_justificaciones j ON a.id_justificacion = j.id
              WHERE 1=1";
    
    $params = [];
    if ($inicio && $fin) {
        $query .= " AND DATE(a.fecha_hora_entrada) BETWEEN :inicio AND :fin";
        $params[':inicio'] = $inicio;
        $params[':fin'] = $fin;
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
