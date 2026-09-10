<?php
// api/inventario.php

if ($method === 'GET' && $accion === 'list_stock') {
    $id_local = isset($_GET['id_local']) ? $_GET['id_local'] : null;
    $query = "SELECT sl.*, i.nombre as ingrediente_nombre, i.unidad_medida, p.nombre as producto_nombre
              FROM stock_local sl
              LEFT JOIN ingredientes i ON sl.id_ingrediente = i.id
              LEFT JOIN productos p ON sl.id_producto = p.id";
    $params = [];
    if ($id_local) {
        $query .= " WHERE sl.id_local = :id_local";
        $params[':id_local'] = $id_local;
    }
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $inventario = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($inventario);
}
else if ($method === 'POST' && $accion === 'movimiento') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_local = isset($input['id_local']) ? $input['id_local'] : null;
    $id_ingrediente = isset($input['id_ingrediente']) ? $input['id_ingrediente'] : null;
    $id_producto = isset($input['id_producto']) ? $input['id_producto'] : null;
    $tipo_movimiento = isset($input['tipo_movimiento']) ? $input['tipo_movimiento'] : 'ajuste';
    $cantidad = isset($input['cantidad']) ? (float)$input['cantidad'] : 0;
    $costo_unitario = isset($input['costo_unitario']) ? (float)$input['costo_unitario'] : null;
    $observaciones = isset($input['observaciones']) ? $input['observaciones'] : null;
    
    if (!$id_local || (!$id_ingrediente && !$id_producto) || $cantidad == 0) {
        respondError("Datos incompletos para movimiento");
    }

    $db->beginTransaction();
    try {
        // 1. Registrar movimiento
        $qMov = "INSERT INTO movimientos_inventario (id_local, id_ingrediente, id_producto, tipo_movimiento, cantidad, costo_unitario, observaciones)
                 VALUES (:l, :i, :p, :tipo, :cant, :costo, :obs)";
        $sMov = $db->prepare($qMov);
        $sMov->execute([
            ':l' => $id_local, ':i' => $id_ingrediente, ':p' => $id_producto,
            ':tipo' => $tipo_movimiento, ':cant' => $cantidad,
            ':costo' => $costo_unitario, ':obs' => $observaciones
        ]);
        
        // 2. Actualizar stock_local
        $col = $id_ingrediente ? 'id_ingrediente' : 'id_producto';
        $val = $id_ingrediente ? $id_ingrediente : $id_producto;
        
        $qCheck = "SELECT id, cantidad_disponible FROM stock_local WHERE id_local = :l AND $col = :v";
        $sCheck = $db->prepare($qCheck);
        $sCheck->execute([':l' => $id_local, ':v' => $val]);
        $stock = $sCheck->fetch(PDO::FETCH_ASSOC);
        
        if ($stock) {
            $nuevo = $stock['cantidad_disponible'] + $cantidad;
            $qUpd = "UPDATE stock_local SET cantidad_disponible = :n WHERE id = :id";
            $sUpd = $db->prepare($qUpd);
            $sUpd->execute([':n' => $nuevo, ':id' => $stock['id']]);
        } else {
            $qIns = "INSERT INTO stock_local (id_local, $col, cantidad_disponible) VALUES (:l, :v, :cant)";
            $sIns = $db->prepare($qIns);
            $sIns->execute([':l' => $id_local, ':v' => $val, ':cant' => $cantidad]);
        }
        
        // 3. FIFO Lotes (solo si es salida y es ingrediente)
        if ($cantidad < 0 && $id_ingrediente) {
            $cant_a_descontar = abs($cantidad);
            $qLotes = "SELECT id, cantidad_restante FROM lotes_ingredientes 
                       WHERE id_ingrediente = :i AND id_local = :l AND cantidad_restante > 0 
                       ORDER BY fecha_caducidad ASC";
            $sLotes = $db->prepare($qLotes);
            $sLotes->execute([':i' => $id_ingrediente, ':l' => $id_local]);
            $lotes = $sLotes->fetchAll(PDO::FETCH_ASSOC);
            
            foreach($lotes as $lote) {
                if ($cant_a_descontar <= 0) break;
                
                $descuento = min($lote['cantidad_restante'], $cant_a_descontar);
                $qUpdL = "UPDATE lotes_ingredientes SET cantidad_restante = cantidad_restante - :d WHERE id = :id";
                $sUpdL = $db->prepare($qUpdL);
                $sUpdL->execute([':d' => $descuento, ':id' => $lote['id']]);
                
                $cant_a_descontar -= $descuento;
            }
        }
        
        // 4. Si es entrada por 'compra' y tiene lote, crearlo
        if ($tipo_movimiento === 'compra' && $id_ingrediente && isset($input['fecha_caducidad'])) {
            $lote_nombre = isset($input['lote']) ? $input['lote'] : 'LOTE-'.date('YmdHis');
            $qInsL = "INSERT INTO lotes_ingredientes (id_ingrediente, id_local, lote, cantidad_inicial, cantidad_restante, fecha_caducidad)
                      VALUES (:i, :l, :lote, :cant, :cant, :cad)";
            $sInsL = $db->prepare($qInsL);
            $sInsL->execute([
                ':i' => $id_ingrediente, ':l' => $id_local, ':lote' => $lote_nombre,
                ':cant' => $cantidad, ':cad' => $input['fecha_caducidad']
            ]);
        }
        
        $db->commit();
        respondSuccess(null, "Movimiento registrado correctamente");
    } catch(Exception $e) {
        $db->rollBack();
        respondError("Error en movimiento: ".$e->getMessage());
    }
}
// Listar Productos con Categoría
else if ($method === 'GET' && ($accion === 'list_productos' || $accion === 'productos')) {
    $categoria = isset($_GET['id_categoria']) && $_GET['id_categoria'] !== '' ? (int)$_GET['id_categoria'] : null;
    $estado = isset($_GET['estado']) && $_GET['estado'] !== '' ? $_GET['estado'] : null;
    $buscar = isset($_GET['q']) ? trim($_GET['q']) : '';

    $query = "SELECT p.*, c.nombre as categoria_nombre, r.nombre as receta_nombre 
              FROM productos p 
              LEFT JOIN categorias c ON p.id_categoria = c.id 
              LEFT JOIN recetas r ON p.id_receta = r.id 
              WHERE 1=1";
    $params = [];

    if ($categoria) {
        $query .= " AND p.id_categoria = :cat";
        $params[':cat'] = $categoria;
    }
    if ($estado) {
        $query .= " AND p.estado = :est";
        $params[':est'] = $estado;
    }
    if ($buscar !== '') {
        $query .= " AND (p.nombre LIKE :q OR p.codigo_sku LIKE :q OR p.descripcion LIKE :q)";
        $params[':q'] = "%$buscar%";
    }

    $query .= " ORDER BY p.nombre ASC";
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($productos);
}
// Listar Categorías
else if ($method === 'GET' && ($accion === 'list_categorias' || $accion === 'categorias')) {
    $query = "SELECT * FROM categorias ORDER BY nombre ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($categorias);
}
// Guardar / Actualizar Producto
else if ($method === 'POST' && ($accion === 'save_producto' || $accion === 'guardar_producto')) {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = !empty($input['id']) ? (int)$input['id'] : null;
    $nombre = trim($input['nombre'] ?? '');
    $id_categoria = !empty($input['id_categoria']) ? (int)$input['id_categoria'] : null;
    $codigo_sku = trim($input['codigo_sku'] ?? '');
    $descripcion = trim($input['descripcion'] ?? '');
    $precio_venta = isset($input['precio_venta']) ? (float)$input['precio_venta'] : 0.00;
    $stock_actual = isset($input['stock_actual']) ? (float)$input['stock_actual'] : 0.00;
    $stock_minimo = isset($input['stock_minimo']) ? (float)$input['stock_minimo'] : 0.00;
    $imagen_url = trim($input['imagen_url'] ?? '');
    $estado = in_array($input['estado'] ?? '', ['disponible', 'agotado', 'inactivo']) ? $input['estado'] : 'disponible';
    $id_receta = !empty($input['id_receta']) ? (int)$input['id_receta'] : null;

    if (empty($nombre)) {
        respondError("El nombre del producto es obligatorio");
    }
    if (empty($codigo_sku)) {
        $codigo_sku = 'PROD-' . strtoupper(substr(uniqid(), -6));
    }

    // Auto-ajustar estado si el stock es cero y no se marcó inactivo
    if ($stock_actual <= 0 && $estado === 'disponible') {
        $estado = 'agotado';
    } else if ($stock_actual > 0 && $estado === 'agotado') {
        $estado = 'disponible';
    }

    if ($id) {
        $query = "UPDATE productos SET 
                  nombre = :nombre,
                  id_categoria = :id_categoria,
                  codigo_sku = :codigo_sku,
                  descripcion = :descripcion,
                  precio_venta = :precio_venta,
                  stock_actual = :stock_actual,
                  stock_minimo = :stock_minimo,
                  imagen_url = :imagen_url,
                  estado = :estado,
                  id_receta = :id_receta
                  WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':nombre' => $nombre,
            ':id_categoria' => $id_categoria,
            ':codigo_sku' => $codigo_sku,
            ':descripcion' => $descripcion,
            ':precio_venta' => $precio_venta,
            ':stock_actual' => $stock_actual,
            ':stock_minimo' => $stock_minimo,
            ':imagen_url' => $imagen_url,
            ':estado' => $estado,
            ':id_receta' => $id_receta,
            ':id' => $id
        ]);
        respondSuccess(["id" => $id], "Producto actualizado exitosamente");
    } else {
        $query = "INSERT INTO productos (nombre, id_categoria, codigo_sku, descripcion, precio_venta, stock_actual, stock_minimo, imagen_url, estado, id_receta)
                  VALUES (:nombre, :id_categoria, :codigo_sku, :descripcion, :precio_venta, :stock_actual, :stock_minimo, :imagen_url, :estado, :id_receta)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':nombre' => $nombre,
            ':id_categoria' => $id_categoria,
            ':codigo_sku' => $codigo_sku,
            ':descripcion' => $descripcion,
            ':precio_venta' => $precio_venta,
            ':stock_actual' => $stock_actual,
            ':stock_minimo' => $stock_minimo,
            ':imagen_url' => $imagen_url,
            ':estado' => $estado,
            ':id_receta' => $id_receta
        ]);
        $newId = (int)$db->lastInsertId();
        respondSuccess(["id" => $newId], "Producto creado exitosamente");
    }
}
// Eliminar Producto
else if ($method === 'POST' && ($accion === 'delete_producto' || $accion === 'eliminar_producto')) {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = !empty($input['id']) ? (int)$input['id'] : null;
    if (!$id) respondError("ID de producto requerido");
    
    $stmt = $db->prepare("DELETE FROM productos WHERE id = :id");
    $stmt->execute([':id' => $id]);
    respondSuccess(null, "Producto eliminado correctamente");
}
// Ajustar Stock Rápido (Entrada, Salida, Ajuste Directo)
else if ($method === 'POST' && ($accion === 'ajustar_stock' || $accion === 'ajustar_stock_producto')) {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = !empty($input['id_producto']) ? (int)$input['id_producto'] : null;
    $tipo = $input['tipo'] ?? 'ajuste'; // 'entrada', 'salida', 'ajuste'
    $cantidad = (float)($input['cantidad'] ?? 0);
    $motivo = trim($input['motivo'] ?? 'Ajuste manual');
    
    if (!$id || $cantidad < 0) respondError("Datos de ajuste inválidos");
    
    $db->beginTransaction();
    try {
        $pStmt = $db->prepare("SELECT stock_actual, precio_venta FROM productos WHERE id = :id FOR UPDATE");
        $pStmt->execute([':id' => $id]);
        $prod = $pStmt->fetch(PDO::FETCH_ASSOC);
        if (!$prod) throw new Exception("Producto no encontrado");
        
        $stockActual = (float)$prod['stock_actual'];
        $nuevoStock = $stockActual;
        $cantMov = $cantidad;
        
        if ($tipo === 'entrada') {
            $nuevoStock = $stockActual + $cantidad;
            $cantMov = $cantidad;
        } else if ($tipo === 'salida') {
            $nuevoStock = max(0, $stockActual - $cantidad);
            $cantMov = -$cantidad;
        } else { // ajuste directo
            $nuevoStock = $cantidad;
            $cantMov = $cantidad - $stockActual;
        }
        
        $uStmt = $db->prepare("UPDATE productos SET stock_actual = :s, estado = IF(:s <= 0, 'agotado', 'disponible') WHERE id = :id");
        $uStmt->execute([':s' => $nuevoStock, ':id' => $id]);
        
        // Registrar en movimientos de inventario si existe tabla
        $mStmt = $db->prepare("INSERT INTO movimientos_inventario (id_local, id_producto, tipo_movimiento, cantidad, observaciones) 
                               VALUES (1, :id, :tipo, :cant, :obs)");
        $mStmt->execute([
            ':id' => $id,
            ':tipo' => ($tipo === 'entrada' ? 'compra' : ($tipo === 'salida' ? 'merma' : 'ajuste')),
            ':cant' => $cantMov,
            ':obs' => $motivo
        ]);
        
        $db->commit();
        respondSuccess(["nuevo_stock" => $nuevoStock], "Stock actualizado exitosamente a " . $nuevoStock);
    } catch (Exception $e) {
        $db->rollBack();
        respondError($e->getMessage());
    }
}
else {
    respondError("Acción de inventario no válida", 404);
}
?>
