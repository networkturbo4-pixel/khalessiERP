<?php
// api/tiendas.php - API REST para el Módulo de Tiendas y Sedes
// Se asume que $db, $method, $accion, respondError, respondSuccess están definidos en api/index.php

if (empty($accion)) {
    $accion = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');
}

// Helper para generar slug URL limpio
function generarSlugUnico($db, $nombre, $idActual = null) {
    $slugBase = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $nombre), '-'));
    if (empty($slugBase)) $slugBase = 'tienda';
    
    $slug = $slugBase;
    $contador = 1;
    
    while (true) {
        $q = "SELECT id FROM locales WHERE slug = :slug";
        if ($idActual) $q .= " AND id != :id";
        $stmt = $db->prepare($q);
        $params = [':slug' => $slug];
        if ($idActual) $params[':id'] = $idActual;
        $stmt->execute($params);
        
        if ($stmt->fetchColumn() === false) {
            break;
        }
        $slug = $slugBase . '-' . (++$contador);
    }
    
    return $slug;
}

// -------------------------------------------------------------
// LISTADO DE TIENDAS / SEDES
// -------------------------------------------------------------
if ($method === 'GET' && ($accion === 'list' || $accion === '')) {
    $q = "SELECT l.*, 
            (SELECT COUNT(*) FROM tienda_metodos_pago WHERE id_tienda = l.id AND estado = 'activo') as total_metodos_activos,
            (SELECT COUNT(*) FROM tienda_metodos_pago WHERE id_tienda = l.id) as total_metodos
          FROM locales l 
          ORDER BY l.id ASC";
    $stmt = $db->prepare($q);
    $stmt->execute();
    $tiendas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($tiendas as &$t) {
        // Deserializar JSONs de tramos y departamentos
        $t['tramos_distancia'] = !empty($t['tramos_distancia']) ? json_decode($t['tramos_distancia'], true) : [];
        $t['departamentos_cobertura'] = !empty($t['departamentos_cobertura']) ? json_decode($t['departamentos_cobertura'], true) : ['Lima', 'Callao'];
        $t['radio_entrega_km'] = (float)$t['radio_entrega_km'];
        $t['envio_gratis_desde'] = (float)$t['envio_gratis_desde'];
        $t['latitud'] = (float)$t['latitud'];
        $t['longitud'] = (float)$t['longitud'];
        $t['tarifas_distancia_activas'] = (int)$t['tarifas_distancia_activas'];
    }

    respondSuccess($tiendas);
}

// -------------------------------------------------------------
// OBTENER DETALLE COMPLETO DE UNA TIENDA (INCLUYE MÉTODOS DE PAGO)
// -------------------------------------------------------------
else if ($method === 'GET' && $accion === 'get') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) respondError("ID de tienda requerido", 400);

    $stmt = $db->prepare("SELECT * FROM locales WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $tienda = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tienda) respondError("Tienda no encontrada", 404);

    $tienda['tramos_distancia'] = !empty($tienda['tramos_distancia']) ? json_decode($tienda['tramos_distancia'], true) : [];
    $tienda['departamentos_cobertura'] = !empty($tienda['departamentos_cobertura']) ? json_decode($tienda['departamentos_cobertura'], true) : ['Lima', 'Callao'];
    $tienda['radio_entrega_km'] = (float)$tienda['radio_entrega_km'];
    $tienda['envio_gratis_desde'] = (float)$tienda['envio_gratis_desde'];
    $tienda['latitud'] = (float)$tienda['latitud'];
    $tienda['longitud'] = (float)$tienda['longitud'];
    $tienda['tarifas_distancia_activas'] = (int)$tienda['tarifas_distancia_activas'];

    // Métodos de pago
    $stmtMet = $db->prepare("SELECT * FROM tienda_metodos_pago WHERE id_tienda = :id ORDER BY orden ASC, id ASC");
    $stmtMet->execute([':id' => $id]);
    $tienda['metodos_pago'] = $stmtMet->fetchAll(PDO::FETCH_ASSOC);

    respondSuccess($tienda);
}

// -------------------------------------------------------------
// CREAR O ACTUALIZAR TIENDA
// -------------------------------------------------------------
else if ($method === 'POST' && $accion === 'save') {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) respondError("Datos JSON inválidos", 400);

    $id = !empty($input['id']) ? (int)$input['id'] : null;
    $nombre = trim($input['nombre'] ?? '');
    if (empty($nombre)) respondError("El nombre de la tienda es obligatorio", 400);

    $slugManual = trim($input['slug'] ?? '');
    if (empty($slugManual)) {
        $slug = generarSlugUnico($db, $nombre, $id);
    } else {
        $slug = generarSlugUnico($db, $slugManual, $id);
    }

    $direccion = trim($input['direccion'] ?? '');
    $ciudad = trim($input['ciudad'] ?? 'Lima');
    $whatsapp = trim($input['whatsapp'] ?? '');
    $descripcion = trim($input['descripcion'] ?? '');
    $imagen_url = trim($input['imagen_url'] ?? '');
    $estado = in_array($input['estado'] ?? '', ['activo', 'inactivo', 'mantenimiento']) ? $input['estado'] : 'activo';

    $radio_entrega_km = isset($input['radio_entrega_km']) ? (float)$input['radio_entrega_km'] : 5.00;
    $tarifas_distancia_activas = !empty($input['tarifas_distancia_activas']) ? 1 : 0;
    $envio_gratis_desde = isset($input['envio_gratis_desde']) ? (float)$input['envio_gratis_desde'] : 0.00;

    $tramos = is_array($input['tramos_distancia'] ?? null) 
        ? json_encode($input['tramos_distancia'], JSON_UNESCAPED_UNICODE) 
        : ($input['tramos_distancia'] ?? '[]');

    $tipo_cobertura_dept = in_array($input['tipo_cobertura_dept'] ?? '', ['todos', 'seleccionados']) 
        ? $input['tipo_cobertura_dept'] 
        : 'seleccionados';

    $deptos = is_array($input['departamentos_cobertura'] ?? null) 
        ? json_encode($input['departamentos_cobertura'], JSON_UNESCAPED_UNICODE) 
        : ($input['departamentos_cobertura'] ?? '["Lima","Callao"]');

    $aviso_recojo = trim($input['aviso_recojo'] ?? '');
    $latitud = isset($input['latitud']) ? (float)$input['latitud'] : -11.94097575;
    $longitud = isset($input['longitud']) ? (float)$input['longitud'] : -77.04908715;

    try {
        if ($id) {
            $sql = "UPDATE locales SET 
                nombre = :nombre,
                slug = :slug,
                direccion = :direccion,
                ciudad = :ciudad,
                whatsapp = :whatsapp,
                descripcion = :descripcion,
                imagen_url = :imagen_url,
                estado = :estado,
                radio_entrega_km = :radio_entrega_km,
                tarifas_distancia_activas = :tarifas_distancia_activas,
                envio_gratis_desde = :envio_gratis_desde,
                tramos_distancia = :tramos_distancia,
                tipo_cobertura_dept = :tipo_cobertura_dept,
                departamentos_cobertura = :departamentos_cobertura,
                aviso_recojo = :aviso_recojo,
                latitud = :latitud,
                longitud = :longitud
                WHERE id = :id";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':nombre' => $nombre,
                ':slug' => $slug,
                ':direccion' => $direccion,
                ':ciudad' => $ciudad,
                ':whatsapp' => $whatsapp,
                ':descripcion' => $descripcion,
                ':imagen_url' => $imagen_url,
                ':estado' => $estado,
                ':radio_entrega_km' => $radio_entrega_km,
                ':tarifas_distancia_activas' => $tarifas_distancia_activas,
                ':envio_gratis_desde' => $envio_gratis_desde,
                ':tramos_distancia' => $tramos,
                ':tipo_cobertura_dept' => $tipo_cobertura_dept,
                ':departamentos_cobertura' => $deptos,
                ':aviso_recojo' => $aviso_recojo,
                ':latitud' => $latitud,
                ':longitud' => $longitud,
                ':id' => $id
            ]);

            respondSuccess(["id" => $id, "slug" => $slug], "Tienda actualizada exitosamente");
        } else {
            $sql = "INSERT INTO locales (
                nombre, slug, direccion, ciudad, whatsapp, descripcion, imagen_url, estado,
                radio_entrega_km, tarifas_distancia_activas, envio_gratis_desde, tramos_distancia,
                tipo_cobertura_dept, departamentos_cobertura, aviso_recojo, latitud, longitud
            ) VALUES (
                :nombre, :slug, :direccion, :ciudad, :whatsapp, :descripcion, :imagen_url, :estado,
                :radio_entrega_km, :tarifas_distancia_activas, :envio_gratis_desde, :tramos_distancia,
                :tipo_cobertura_dept, :departamentos_cobertura, :aviso_recojo, :latitud, :longitud
            )";

            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':nombre' => $nombre,
                ':slug' => $slug,
                ':direccion' => $direccion,
                ':ciudad' => $ciudad,
                ':whatsapp' => $whatsapp,
                ':descripcion' => $descripcion,
                ':imagen_url' => $imagen_url,
                ':estado' => $estado,
                ':radio_entrega_km' => $radio_entrega_km,
                ':tarifas_distancia_activas' => $tarifas_distancia_activas,
                ':envio_gratis_desde' => $envio_gratis_desde,
                ':tramos_distancia' => $tramos,
                ':tipo_cobertura_dept' => $tipo_cobertura_dept,
                ':departamentos_cobertura' => $deptos,
                ':aviso_recojo' => $aviso_recojo,
                ':latitud' => $latitud,
                ':longitud' => $longitud
            ]);

            $id = (int)$db->lastInsertId();

            // Si es nueva tienda, asignarle métodos de pago básicos por defecto (Yape y Transferencia)
            $defaultMetodos = [
                [
                    'nombre' => 'Pago con Yape',
                    'descripcion' => 'Copia el numero o escanea el QR y adjunta tu voucher para que nuestro equipo lo valide.',
                    'tipo' => 'transferencia_qr',
                    'instrucciones' => !empty($whatsapp) ? $whatsapp : '998774145',
                    'orden' => 1
                ],
                [
                    'nombre' => 'Transferencia Bancaria',
                    'descripcion' => 'Copia el numero y adjunta tu voucher para que nuestro equipo lo valide.',
                    'tipo' => 'transferencia_qr',
                    'instrucciones' => 'BCP Soles: 191-00000000-0-00 / CCI: 00219100000000000000',
                    'orden' => 2
                ]
            ];
            $insM = $db->prepare("INSERT INTO tienda_metodos_pago (id_tienda, nombre, descripcion, tipo_integracion, instrucciones_cuentas, orden, estado) VALUES (:id_tienda, :nombre, :descripcion, :tipo, :instrucciones, :orden, 'activo')");
            foreach ($defaultMetodos as $dm) {
                $insM->execute([
                    ':id_tienda' => $id,
                    ':nombre' => $dm['nombre'],
                    ':descripcion' => $dm['descripcion'],
                    ':tipo' => $dm['tipo'],
                    ':instrucciones' => $dm['instrucciones'],
                    ':orden' => $dm['orden']
                ]);
            }

            respondSuccess(["id" => $id, "slug" => $slug], "Tienda registrada exitosamente");
        }
    } catch (Exception $e) {
        respondError("Error guardando la tienda: " . $e->getMessage(), 500);
    }
}

// -------------------------------------------------------------
// CAMBIO RÁPIDO DE ESTADO (ACTIVA / INACTIVA / MANTENIMIENTO)
// -------------------------------------------------------------
else if ($method === 'POST' && $accion === 'toggle_status') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = !empty($input['id']) ? (int)$input['id'] : null;
    $nuevoEstado = in_array($input['estado'] ?? '', ['activo', 'inactivo', 'mantenimiento']) ? $input['estado'] : null;

    if (!$id) respondError("ID de tienda requerido", 400);

    if (!$nuevoEstado) {
        $stmtCurr = $db->prepare("SELECT estado FROM locales WHERE id = :id");
        $stmtCurr->execute([':id' => $id]);
        $curr = $stmtCurr->fetchColumn();
        $nuevoEstado = ($curr === 'activo') ? 'inactivo' : 'activo';
    }

    $stmt = $db->prepare("UPDATE locales SET estado = :estado WHERE id = :id");
    $stmt->execute([':estado' => $nuevoEstado, ':id' => $id]);

    respondSuccess(["id" => $id, "estado" => $nuevoEstado], "Estado de tienda actualizado a " . $nuevoEstado);
}

// -------------------------------------------------------------
// ELIMINAR TIENDA
// -------------------------------------------------------------
else if ($method === 'POST' && $accion === 'delete') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = !empty($input['id']) ? (int)$input['id'] : null;
    if (!$id) respondError("ID de tienda requerido", 400);

    // Evitar eliminar si es la única tienda del sistema
    $totalTiendas = (int)$db->query("SELECT COUNT(*) FROM locales")->fetchColumn();
    if ($totalTiendas <= 1) {
        respondError("No puedes eliminar la única tienda del sistema. Debe existir al menos una sede registrada.", 400);
    }

    try {
        $stmt = $db->prepare("DELETE FROM locales WHERE id = :id");
        $stmt->execute([':id' => $id]);
        respondSuccess(null, "Tienda eliminada exitosamente");
    } catch (Exception $e) {
        respondError("No se pudo eliminar la tienda: " . $e->getMessage(), 500);
    }
}

// -------------------------------------------------------------
// SUBIDA DE ARCHIVOS (IMÁGENES DE TIENDA, ICONOS Y QR)
// -------------------------------------------------------------
else if ($method === 'POST' && $accion === 'upload_foto') {
    $input = json_decode(file_get_contents("php://input"), true);
    $base64 = $input['data'] ?? '';
    $subtipo = $input['subtipo'] ?? 'portadas'; // 'portadas', 'qr', 'iconos'

    if (empty($base64) || !str_contains($base64, 'base64,')) {
        respondError("Datos de imagen en base64 requeridos", 400);
    }

    $uploadDir = __DIR__ . '/../uploads/tiendas/' . $subtipo . '/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $parts = explode(';base64,', $base64);
    $mime = str_replace('data:', '', $parts[0]);
    $ext = 'jpg';
    if ($mime === 'image/png') $ext = 'png';
    else if ($mime === 'image/webp') $ext = 'webp';
    else if ($mime === 'image/svg+xml') $ext = 'svg';

    $data = base64_decode($parts[1]);
    $filename = 'tienda_' . $subtipo . '_' . time() . '_' . rand(100, 999) . '.' . $ext;
    $filePath = $uploadDir . $filename;

    if (file_put_contents($filePath, $data)) {
        $publicUrl = 'uploads/tiendas/' . $subtipo . '/' . $filename;
        respondSuccess(["url" => $publicUrl], "Imagen subida exitosamente");
    } else {
        respondError("No se pudo guardar la imagen en el servidor", 500);
    }
}

// -------------------------------------------------------------
// MÉTODOS DE PAGO: LISTAR
// -------------------------------------------------------------
else if ($method === 'GET' && $accion === 'list_metodos') {
    $idTienda = isset($_GET['id_tienda']) ? (int)$_GET['id_tienda'] : null;
    if (!$idTienda) respondError("ID de tienda requerido", 400);

    $stmt = $db->prepare("SELECT * FROM tienda_metodos_pago WHERE id_tienda = :id ORDER BY orden ASC, id ASC");
    $stmt->execute([':id' => $idTienda]);
    respondSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// -------------------------------------------------------------
// MÉTODOS DE PAGO: GUARDAR (CREAR / EDITAR)
// -------------------------------------------------------------
else if ($method === 'POST' && $accion === 'save_metodo') {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) respondError("Datos JSON requeridos", 400);

    $id = !empty($input['id']) ? (int)$input['id'] : null;
    $idTienda = !empty($input['id_tienda']) ? (int)$input['id_tienda'] : null;
    $nombre = trim($input['nombre'] ?? '');
    if (!$idTienda) respondError("ID de tienda requerido", 400);
    if (empty($nombre)) respondError("El nombre del método de pago es obligatorio", 400);

    $descripcion = trim($input['descripcion'] ?? '');
    $icono_url = trim($input['icono_url'] ?? '');
    $tipo_integracion = trim($input['tipo_integracion'] ?? 'transferencia_qr');
    $qr_imagen_url = trim($input['qr_imagen_url'] ?? '');
    $instrucciones_cuentas = trim($input['instrucciones_cuentas'] ?? '');
    $estado = in_array($input['estado'] ?? '', ['activo', 'inactivo']) ? $input['estado'] : 'activo';

    try {
        if ($id) {
            $stmt = $db->prepare("UPDATE tienda_metodos_pago SET 
                nombre = :nombre,
                descripcion = :descripcion,
                icono_url = :icono_url,
                tipo_integracion = :tipo_integracion,
                qr_imagen_url = :qr_imagen_url,
                instrucciones_cuentas = :instrucciones,
                estado = :estado
                WHERE id = :id AND id_tienda = :id_tienda");
            
            $stmt->execute([
                ':nombre' => $nombre,
                ':descripcion' => $descripcion,
                ':icono_url' => $icono_url,
                ':tipo_integracion' => $tipo_integracion,
                ':qr_imagen_url' => $qr_imagen_url,
                ':instrucciones' => $instrucciones_cuentas,
                ':estado' => $estado,
                ':id' => $id,
                ':id_tienda' => $idTienda
            ]);

            respondSuccess(["id" => $id], "Método de pago actualizado");
        } else {
            // Calcular siguiente orden
            $stmtOrd = $db->prepare("SELECT COALESCE(MAX(orden), 0) + 1 FROM tienda_metodos_pago WHERE id_tienda = :id_tienda");
            $stmtOrd->execute([':id_tienda' => $idTienda]);
            $orden = (int)$stmtOrd->fetchColumn();

            $stmt = $db->prepare("INSERT INTO tienda_metodos_pago (
                id_tienda, nombre, descripcion, icono_url, tipo_integracion, qr_imagen_url, instrucciones_cuentas, orden, estado
            ) VALUES (
                :id_tienda, :nombre, :descripcion, :icono_url, :tipo_integracion, :qr_imagen_url, :instrucciones, :orden, :estado
            )");

            $stmt->execute([
                ':id_tienda' => $idTienda,
                ':nombre' => $nombre,
                ':descripcion' => $descripcion,
                ':icono_url' => $icono_url,
                ':tipo_integracion' => $tipo_integracion,
                ':qr_imagen_url' => $qr_imagen_url,
                ':instrucciones' => $instrucciones_cuentas,
                ':orden' => $orden,
                ':estado' => $estado
            ]);

            $id = (int)$db->lastInsertId();
            respondSuccess(["id" => $id], "Método de pago agregado exitosamente");
        }
    } catch (Exception $e) {
        respondError("Error al guardar método de pago: " . $e->getMessage(), 500);
    }
}

// -------------------------------------------------------------
// MÉTODOS DE PAGO: ELIMINAR
// -------------------------------------------------------------
else if ($method === 'POST' && $accion === 'delete_metodo') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = !empty($input['id']) ? (int)$input['id'] : null;
    if (!$id) respondError("ID de método requerido", 400);

    $stmt = $db->prepare("DELETE FROM tienda_metodos_pago WHERE id = :id");
    $stmt->execute([':id' => $id]);
    respondSuccess(null, "Método de pago eliminado exitosamente");
}

// -------------------------------------------------------------
// MÉTODOS DE PAGO: REORDENAR
// -------------------------------------------------------------
else if ($method === 'POST' && $accion === 'reorder_metodos') {
    $input = json_decode(file_get_contents("php://input"), true);
    $ids = $input['ids'] ?? [];

    if (is_array($ids)) {
        $stmt = $db->prepare("UPDATE tienda_metodos_pago SET orden = :orden WHERE id = :id");
        foreach ($ids as $orden => $mId) {
            $stmt->execute([':orden' => $orden + 1, ':id' => (int)$mId]);
        }
    }
    respondSuccess(null, "Orden actualizado");
}

else {
    respondError("Acción de tiendas no válida", 404);
}
?>
