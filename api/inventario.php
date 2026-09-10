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
else {
    respondError("Acción de inventario no válida", 404);
}
?>
