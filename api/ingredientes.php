<?php
// api/ingredientes.php

if ($method === 'GET' && $accion === 'list') {
    $query = "SELECT * FROM ingredientes ORDER BY nombre";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $ingredientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($ingredientes);
}
else if ($method === 'POST' && $accion === 'save') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = isset($input['id']) ? $input['id'] : null;
    $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
    $unidad_medida = isset($input['unidad_medida']) ? trim($input['unidad_medida']) : '';
    $unidad_compra = isset($input['unidad_compra']) ? trim($input['unidad_compra']) : null;
    $equivalencia = isset($input['equivalencia_compra']) ? (float)$input['equivalencia_compra'] : 1;
    $costo_estimado = isset($input['costo_estimado']) ? (float)$input['costo_estimado'] : 0;
    
    // Nuevos campos
    $foto_url = isset($input['foto_url']) ? trim($input['foto_url']) : null;
    $fecha_vencimiento = isset($input['fecha_vencimiento']) && !empty($input['fecha_vencimiento']) ? trim($input['fecha_vencimiento']) : null;
    $fecha_produccion = isset($input['fecha_produccion']) && !empty($input['fecha_produccion']) ? trim($input['fecha_produccion']) : null;
    $codigo_barras = isset($input['codigo_barras']) ? trim($input['codigo_barras']) : null;
    $stock = isset($input['stock']) ? (float)$input['stock'] : 0;
    $stock_critico = isset($input['stock_critico']) ? (float)$input['stock_critico'] : 0;

    if (empty($nombre) || empty($unidad_medida)) respondError("Nombre y unidad de medida son obligatorios");

    if ($id) {
        $query = "UPDATE ingredientes SET nombre = :nombre, unidad_medida = :unidad, unidad_compra = :ucompra, equivalencia_compra = :equiv, costo_estimado = :costo, foto_url = :foto, fecha_vencimiento = :fvenc, fecha_produccion = :fprod, codigo_barras = :codigo, stock = :stock, stock_critico = :stockc WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':nombre' => $nombre, ':unidad' => $unidad_medida, ':ucompra' => $unidad_compra, 
            ':equiv' => $equivalencia, ':costo' => $costo_estimado, ':foto' => $foto_url,
            ':fvenc' => $fecha_vencimiento, ':fprod' => $fecha_produccion, ':codigo' => $codigo_barras,
            ':stock' => $stock, ':stockc' => $stock_critico, ':id' => $id
        ]);
        respondSuccess(["id" => $id], "Ingrediente actualizado exitosamente");
    } else {
        $query = "INSERT INTO ingredientes (nombre, unidad_medida, unidad_compra, equivalencia_compra, costo_estimado, foto_url, fecha_vencimiento, fecha_produccion, codigo_barras, stock, stock_critico) VALUES (:nombre, :unidad, :ucompra, :equiv, :costo, :foto, :fvenc, :fprod, :codigo, :stock, :stockc)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':nombre' => $nombre, ':unidad' => $unidad_medida, ':ucompra' => $unidad_compra, 
            ':equiv' => $equivalencia, ':costo' => $costo_estimado, ':foto' => $foto_url,
            ':fvenc' => $fecha_vencimiento, ':fprod' => $fecha_produccion, ':codigo' => $codigo_barras,
            ':stock' => $stock, ':stockc' => $stock_critico
        ]);
        $id = $db->lastInsertId();
        respondSuccess(["id" => $id], "Ingrediente creado exitosamente");
    }
}
else if ($method === 'GET' && $accion === 'precios_local') {
    $id_local = isset($_GET['id_local']) ? $_GET['id_local'] : null;
    if (!$id_local) respondError("ID de local requerido");

    $query = "SELECT i.*, p.precio_compra, p.fecha_actualizacion, p.id as id_precio
              FROM ingredientes i 
              LEFT JOIN precios_insumos_local p ON i.id = p.id_ingrediente AND p.id_local = :id_local
              ORDER BY i.nombre";
    $stmt = $db->prepare($query);
    $stmt->execute([':id_local' => $id_local]);
    $precios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($precios);
}
else if ($method === 'POST' && $accion === 'save_precio_local') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_local = isset($input['id_local']) ? $input['id_local'] : null;
    $id_ingrediente = isset($input['id_ingrediente']) ? $input['id_ingrediente'] : null;
    $precio_compra = isset($input['precio_compra']) ? (float)$input['precio_compra'] : 0;

    if (!$id_local || !$id_ingrediente) respondError("Local e ingrediente son obligatorios");

    $query = "INSERT INTO precios_insumos_local (id_local, id_ingrediente, precio_compra) 
              VALUES (:id_local, :id_ingrediente, :precio) 
              ON DUPLICATE KEY UPDATE precio_compra = :precio, fecha_actualizacion = CURRENT_TIMESTAMP";
    $stmt = $db->prepare($query);
    $stmt->execute([':id_local' => $id_local, ':id_ingrediente' => $id_ingrediente, ':precio' => $precio_compra]);
    
    respondSuccess(null, "Precio local actualizado");
}
// Sustitutos
else if ($method === 'GET' && $accion === 'sustitutos') {
    $id_ingrediente = isset($_GET['id_ingrediente']) ? $_GET['id_ingrediente'] : null;
    if (!$id_ingrediente) respondError("ID de ingrediente principal requerido");

    $query = "SELECT s.*, i.nombre as nombre_sustituto, i.unidad_medida 
              FROM ingredientes_sustitutos s 
              JOIN ingredientes i ON s.id_ingrediente_sustituto = i.id 
              WHERE s.id_ingrediente_principal = :id";
    $stmt = $db->prepare($query);
    $stmt->execute([':id' => $id_ingrediente]);
    $sustitutos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($sustitutos);
}
else if ($method === 'POST' && $accion === 'save_sustituto') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_principal = isset($input['id_ingrediente_principal']) ? $input['id_ingrediente_principal'] : null;
    $id_sustituto = isset($input['id_ingrediente_sustituto']) ? $input['id_ingrediente_sustituto'] : null;
    $ratio = isset($input['ratio_conversion']) ? (float)$input['ratio_conversion'] : 1;
    $notas = isset($input['notas']) ? $input['notas'] : '';

    if (!$id_principal || !$id_sustituto) respondError("Ingredientes principal y sustituto son obligatorios");

    $query = "INSERT INTO ingredientes_sustitutos (id_ingrediente_principal, id_ingrediente_sustituto, ratio_conversion, notas) 
              VALUES (:id_p, :id_s, :ratio, :notas)";
    $stmt = $db->prepare($query);
    $stmt->execute([':id_p' => $id_principal, ':id_s' => $id_sustituto, ':ratio' => $ratio, ':notas' => $notas]);
    respondSuccess(["id" => $db->lastInsertId()], "Sustituto agregado exitosamente");
}
else {
    respondError("Acción de ingredientes no válida", 404);
}
?>
