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
// Listar Productos con Categoría y Compras
else if ($method === 'GET' && ($accion === 'list_productos' || $accion === 'productos')) {
    $categoria = isset($_GET['id_categoria']) && $_GET['id_categoria'] !== '' ? (int)$_GET['id_categoria'] : null;
    $estado = isset($_GET['estado']) && $_GET['estado'] !== '' ? $_GET['estado'] : null;
    $buscar = isset($_GET['q']) ? trim($_GET['q']) : '';

    $query = "SELECT p.*, c.nombre as categoria_nombre, r.nombre as receta_nombre,
              (SELECT COUNT(*) FROM historial_compras_producto hcp WHERE hcp.id_producto = p.id) as total_compras
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
        $query .= " AND (p.nombre LIKE :q OR p.codigo_sku LIKE :q OR p.descripcion LIKE :q OR p.proveedor_habitual LIKE :q OR p.codigo_barras LIKE :q)";
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
// Guardar / Actualizar Producto con Todos los Campos Extendidos
else if ($method === 'POST' && ($accion === 'save_producto' || $accion === 'guardar_producto')) {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = !empty($input['id']) ? (int)$input['id'] : null;
    $nombre = trim($input['nombre'] ?? '');
    $id_categoria = !empty($input['id_categoria']) ? (int)$input['id_categoria'] : null;
    $tipo_articulo = trim($input['tipo_articulo'] ?? 'materia_prima');
    $unidad_medida = trim($input['unidad_medida'] ?? 'unidades');
    $ubicacion_fisica = trim($input['ubicacion_fisica'] ?? '');
    $proveedor_habitual = trim($input['proveedor_habitual'] ?? '');
    $codigo_barras = trim($input['codigo_barras'] ?? '');
    $codigo_sku = trim($input['codigo_sku'] ?? '');
    $descripcion = trim($input['descripcion'] ?? '');
    $precio_venta = isset($input['precio_venta']) ? (float)$input['precio_venta'] : 0.00;
    $costo_unitario = isset($input['costo_unitario']) ? (float)$input['costo_unitario'] : 0.00;
    $stock_actual = isset($input['stock_actual']) ? (float)$input['stock_actual'] : 0.00;
    $stock_minimo = isset($input['stock_minimo']) ? (float)$input['stock_minimo'] : 0.00;
    $imagen_url = trim($input['imagen_url'] ?? '');
    $estado = in_array($input['estado'] ?? '', ['disponible', 'agotado', 'inactivo']) ? $input['estado'] : 'disponible';
    $id_receta = !empty($input['id_receta']) ? (int)$input['id_receta'] : null;

    if (empty($nombre)) {
        respondError("El nombre del producto es obligatorio");
    }
    if (empty($codigo_sku)) {
        $codigo_sku = 'MP-' . strtoupper(substr(uniqid(), -4));
    }
    if (!$id_categoria) {
        $catStmt = $db->query("SELECT id FROM categorias WHERE nombre LIKE '%Insumo%' LIMIT 1");
        $fallbackCat = $catStmt ? $catStmt->fetchColumn() : null;
        if (!$fallbackCat) {
            $fallbackCat = $db->query("SELECT id FROM categorias LIMIT 1")->fetchColumn() ?: 1;
        }
        $id_categoria = (int)$fallbackCat;
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
                  tipo_articulo = :tipo_articulo,
                  unidad_medida = :unidad_medida,
                  ubicacion_fisica = :ubicacion_fisica,
                  proveedor_habitual = :proveedor_habitual,
                  codigo_barras = :codigo_barras,
                  codigo_sku = :codigo_sku,
                  descripcion = :descripcion,
                  precio_venta = :precio_venta,
                  costo_unitario = :costo_unitario,
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
            ':tipo_articulo' => $tipo_articulo,
            ':unidad_medida' => $unidad_medida,
            ':ubicacion_fisica' => $ubicacion_fisica,
            ':proveedor_habitual' => $proveedor_habitual,
            ':codigo_barras' => $codigo_barras,
            ':codigo_sku' => $codigo_sku,
            ':descripcion' => $descripcion,
            ':precio_venta' => $precio_venta,
            ':costo_unitario' => $costo_unitario,
            ':stock_actual' => $stock_actual,
            ':stock_minimo' => $stock_minimo,
            ':imagen_url' => $imagen_url,
            ':estado' => $estado,
            ':id_receta' => $id_receta,
            ':id' => $id
        ]);
        respondSuccess(["id" => $id], "Producto actualizado exitosamente");
    } else {
        $query = "INSERT INTO productos (nombre, id_categoria, tipo_articulo, unidad_medida, ubicacion_fisica, proveedor_habitual, codigo_barras, codigo_sku, descripcion, precio_venta, costo_unitario, stock_actual, stock_minimo, imagen_url, estado, id_receta)
                  VALUES (:nombre, :id_categoria, :tipo_articulo, :unidad_medida, :ubicacion_fisica, :proveedor_habitual, :codigo_barras, :codigo_sku, :descripcion, :precio_venta, :costo_unitario, :stock_actual, :stock_minimo, :imagen_url, :estado, :id_receta)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':nombre' => $nombre,
            ':id_categoria' => $id_categoria,
            ':tipo_articulo' => $tipo_articulo,
            ':unidad_medida' => $unidad_medida,
            ':ubicacion_fisica' => $ubicacion_fisica,
            ':proveedor_habitual' => $proveedor_habitual,
            ':codigo_barras' => $codigo_barras,
            ':codigo_sku' => $codigo_sku,
            ':descripcion' => $descripcion,
            ':precio_venta' => $precio_venta,
            ':costo_unitario' => $costo_unitario,
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
// Listar Historial de Compras de un Producto
else if ($method === 'GET' && ($accion === 'list_compras_producto' || $accion === 'compras_producto')) {
    $id_producto = isset($_GET['id_producto']) ? (int)$_GET['id_producto'] : null;
    if (!$id_producto) {
        respondError("ID de producto requerido");
    }
    $query = "SELECT * FROM historial_compras_producto WHERE id_producto = :id ORDER BY fecha DESC, id DESC";
    $stmt = $db->prepare($query);
    $stmt->execute([':id' => $id_producto]);
    $compras = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($compras);
}
// Registrar Compra / Factura en Historial de Producto
else if ($method === 'POST' && ($accion === 'save_compra_producto' || $accion === 'guardar_compra')) {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_producto = !empty($input['id_producto']) ? (int)$input['id_producto'] : null;
    $numero_comprobante = trim($input['numero_comprobante'] ?? '');
    $proveedor = trim($input['proveedor'] ?? '');
    $cantidad = (float)($input['cantidad'] ?? 0);
    $precio_unitario = (float)($input['precio_unitario'] ?? 0);
    $total = (float)($input['total'] ?? ($cantidad * $precio_unitario));
    $comprobante_url = trim($input['comprobante_url'] ?? '');
    $observaciones = trim($input['observaciones'] ?? '');
    $fecha = !empty($input['fecha']) ? $input['fecha'] : date('Y-m-d H:i:s');
    $actualizar_stock = isset($input['actualizar_stock']) ? (bool)$input['actualizar_stock'] : true;

    if (!$id_producto) respondError("ID de producto requerido");
    if (empty($numero_comprobante)) respondError("El número de comprobante es obligatorio");
    if (empty($proveedor)) respondError("El proveedor es obligatorio");
    if ($cantidad <= 0) respondError("La cantidad comprada debe ser mayor a 0");
    if ($precio_unitario < 0) respondError("El precio unitario no puede ser negativo");

    $db->beginTransaction();
    try {
        // 1. Guardar en historial_compras_producto
        $stmt = $db->prepare("INSERT INTO historial_compras_producto 
            (id_producto, fecha, numero_comprobante, proveedor, cantidad, precio_unitario, total, comprobante_url, observaciones)
            VALUES (:id_producto, :fecha, :numero_comprobante, :proveedor, :cantidad, :precio_unitario, :total, :comprobante_url, :observaciones)");
        $stmt->execute([
            ':id_producto' => $id_producto,
            ':fecha' => $fecha,
            ':numero_comprobante' => $numero_comprobante,
            ':proveedor' => $proveedor,
            ':cantidad' => $cantidad,
            ':precio_unitario' => $precio_unitario,
            ':total' => $total,
            ':comprobante_url' => $comprobante_url,
            ':observaciones' => $observaciones
        ]);
        $newCompraId = (int)$db->lastInsertId();

        // 2. Si actualizar_stock es true, sumar existencias y recalcular Costo Promedio Ponderado (CPP)
        if ($actualizar_stock) {
            $pStmt = $db->prepare("SELECT stock_actual, costo_unitario FROM productos WHERE id = :id FOR UPDATE");
            $pStmt->execute([':id' => $id_producto]);
            $prod = $pStmt->fetch(PDO::FETCH_ASSOC);
            if ($prod) {
                $stockAnterior = (float)$prod['stock_actual'];
                $costoAnterior = (float)$prod['costo_unitario'];
                $nuevoStock = $stockAnterior + $cantidad;

                // Recálculo de Costo Promedio Ponderado (CPP)
                $nuevoCosto = $precio_unitario;
                if ($nuevoStock > 0) {
                    $valorPrevio = max(0, $stockAnterior) * $costoAnterior;
                    $valorEntrada = $cantidad * $precio_unitario;
                    $nuevoCosto = ($valorPrevio + $valorEntrada) / $nuevoStock;
                }

                $updProd = $db->prepare("UPDATE productos SET stock_actual = :s, costo_unitario = :c, estado = 'disponible' WHERE id = :id");
                $updProd->execute([
                    ':s' => $nuevoStock,
                    ':c' => round($nuevoCosto, 2),
                    ':id' => $id_producto
                ]);

                // Registrar en movimientos_inventario
                $mStmt = $db->prepare("INSERT INTO movimientos_inventario (id_local, id_producto, tipo_movimiento, cantidad, costo_unitario, observaciones)
                                       VALUES (1, :id, 'compra', :cant, :costo, :obs)");
                $mStmt->execute([
                    ':id' => $id_producto,
                    ':cant' => $cantidad,
                    ':costo' => $precio_unitario,
                    ':obs' => "Compra según comp. " . $numero_comprobante . " de " . $proveedor
                ]);
            }
        }

        $db->commit();
        respondSuccess([
            "id" => $newCompraId,
            "total" => $total
        ], "Compra registrada exitosamente e inventario actualizado");
    } catch (Exception $e) {
        $db->rollBack();
        respondError("Error al registrar compra: " . $e->getMessage());
    }
}
// Subir Foto de Producto o Comprobante de Compra
else if ($method === 'POST' && ($accion === 'upload_foto_producto' || $accion === 'upload_comprobante' || $accion === 'subir_archivo')) {
    $isComprobante = ($accion === 'upload_comprobante');
    $subDir = $isComprobante ? 'comprobantes' : 'productos';
    $uploadDir = __DIR__ . '/../uploads/' . $subDir . '/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
        $allowed = $isComprobante ? ['pdf', 'jpg', 'jpeg', 'png', 'webp'] : ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($ext, $allowed)) {
            respondError("Formato de archivo no permitido ($ext). Formatos permitidos: " . implode(', ', $allowed));
        }
        $filename = ($isComprobante ? 'comp_' : 'prod_') . uniqid() . '.' . $ext;
        $target = $uploadDir . $filename;
        if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
            respondSuccess(["url" => 'uploads/' . $subDir . '/' . $filename], "Archivo subido exitosamente");
        } else {
            respondError("No se pudo guardar el archivo en el servidor");
        }
    } else {
        $input = json_decode(file_get_contents("php://input"), true);
        if (!empty($input['data'])) {
            $base64Data = $input['data'];
            if (strpos($base64Data, ',') !== false) {
                $base64Data = explode(',', $base64Data)[1];
            }
            $decoded = base64_decode($base64Data);
            if ($decoded !== false) {
                $ext = !empty($input['extension']) ? strtolower($input['extension']) : ($isComprobante ? 'pdf' : 'jpg');
                $filename = ($isComprobante ? 'comp_' : 'prod_') . uniqid() . '.' . $ext;
                file_put_contents($uploadDir . $filename, $decoded);
                respondSuccess(["url" => 'uploads/' . $subDir . '/' . $filename], "Archivo procesado exitosamente");
            } else {
                respondError("Error al procesar archivo en base64");
            }
        } else {
            respondError("No se recibió ningún archivo");
        }
    }
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
// Listar Catálogos Auxiliares (Tipos, Unidades, Ubicaciones, Proveedores, Categorías)
else if ($method === 'GET' && ($accion === 'list_catalogos' || $accion === 'catalogos')) {
    // Asegurar existencia de tabla catalogos_inventario
    $db->exec("CREATE TABLE IF NOT EXISTS catalogos_inventario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        valor VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tipo_valor (tipo, valor)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Verificar si necesita semillas iniciales
    $countStmt = $db->query("SELECT COUNT(*) FROM catalogos_inventario");
    if ($countStmt && (int)$countStmt->fetchColumn() === 0) {
        $seeds = [
            // Tipos de Artículo
            ['tipo' => 'tipo_articulo', 'valor' => 'Materia Prima (Insumo Base)'],
            ['tipo' => 'tipo_articulo', 'valor' => 'Producto Terminado'],
            ['tipo' => 'tipo_articulo', 'valor' => 'Insumo Procesado / Subreceta'],
            ['tipo' => 'tipo_articulo', 'valor' => 'Bebida / Envasado'],
            ['tipo' => 'tipo_articulo', 'valor' => 'Empaque / Descartable'],
            // Unidades de Medida
            ['tipo' => 'unidad_medida', 'valor' => 'Kilogramos (kg)'],
            ['tipo' => 'unidad_medida', 'valor' => 'Litros (L)'],
            ['tipo' => 'unidad_medida', 'valor' => 'Unidades (und)'],
            ['tipo' => 'unidad_medida', 'valor' => 'Gramos (g)'],
            ['tipo' => 'unidad_medida', 'valor' => 'Mililitros (ml)'],
            ['tipo' => 'unidad_medida', 'valor' => 'Porciones'],
            ['tipo' => 'unidad_medida', 'valor' => 'Cajas'],
            ['tipo' => 'unidad_medida', 'valor' => 'Paquetes'],
            // Ubicaciones Físicas
            ['tipo' => 'ubicacion_fisica', 'valor' => 'Cámara Fría'],
            ['tipo' => 'ubicacion_fisica', 'valor' => 'Almacén Seco'],
            ['tipo' => 'ubicacion_fisica', 'valor' => 'Barra / Mostrador'],
            ['tipo' => 'ubicacion_fisica', 'valor' => 'Cocina Caliente'],
            ['tipo' => 'ubicacion_fisica', 'valor' => 'Congelador Principal'],
            ['tipo' => 'ubicacion_fisica', 'valor' => 'Estantería Central'],
            // Proveedores Habituales
            ['tipo' => 'proveedor_habitual', 'valor' => 'Distribuidora Agrícola del Valle'],
            ['tipo' => 'proveedor_habitual', 'valor' => 'Lácteos San Juan S.A.'],
            ['tipo' => 'proveedor_habitual', 'valor' => 'Avícola San Fernando'],
            ['tipo' => 'proveedor_habitual', 'valor' => 'Mercado Central Mayorista']
        ];
        $ins = $db->prepare("INSERT IGNORE INTO catalogos_inventario (tipo, valor) VALUES (:tipo, :valor)");
        foreach ($seeds as $s) {
            $ins->execute([':tipo' => $s['tipo'], ':valor' => $s['valor']]);
        }
    }

    // Consultar elementos de catalogos_inventario
    $cStmt = $db->query("SELECT id, tipo, valor FROM catalogos_inventario ORDER BY valor ASC");
    $rawItems = $cStmt ? $cStmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $catalogos = [
        'tipo_articulo' => [],
        'unidad_medida' => [],
        'ubicacion_fisica' => [],
        'proveedor_habitual' => [],
        'categoria' => []
    ];

    foreach ($rawItems as $item) {
        $t = $item['tipo'];
        if (isset($catalogos[$t])) {
            $catalogos[$t][] = [
                'id' => (int)$item['id'],
                'valor' => $item['valor']
            ];
        }
    }

    // Categorías de catálogo (desde tabla categorias)
    $catStmt = $db->query("SELECT id, nombre as valor FROM categorias ORDER BY nombre ASC");
    if ($catStmt) {
        $catalogos['categoria'] = $catStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    respondSuccess($catalogos);
}
// Guardar / Actualizar Elemento de Catálogo Auxiliar
else if ($method === 'POST' && ($accion === 'save_catalogo_item' || $accion === 'guardar_catalogo_item')) {
    $rawInput = preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents("php://input"));
    $input = json_decode($rawInput, true) ?: [];
    $tipo = trim($input['tipo'] ?? '');
    $id = !empty($input['id']) ? (int)$input['id'] : null;
    $valor = trim($input['valor'] ?? '');

    if (empty($tipo) || empty($valor)) {
        respondError("Tipo y valor son obligatorios");
    }

    if ($tipo === 'categoria') {
        if ($id) {
            $stmt = $db->prepare("UPDATE categorias SET nombre = :v WHERE id = :id");
            $stmt->execute([':v' => $valor, ':id' => $id]);
            respondSuccess(['id' => $id, 'valor' => $valor], "Categoría actualizada correctamente");
        } else {
            $stmt = $db->prepare("INSERT INTO categorias (nombre) VALUES (:v)");
            $stmt->execute([':v' => $valor]);
            $newId = (int)$db->lastInsertId();
            respondSuccess(['id' => $newId, 'valor' => $valor], "Categoría creada correctamente");
        }
    } else {
        $db->exec("CREATE TABLE IF NOT EXISTS catalogos_inventario (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tipo VARCHAR(50) NOT NULL,
            valor VARCHAR(150) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_tipo_valor (tipo, valor)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        if ($id) {
            $stmt = $db->prepare("UPDATE catalogos_inventario SET valor = :v WHERE id = :id");
            $stmt->execute([':v' => $valor, ':id' => $id]);
            respondSuccess(['id' => $id, 'valor' => $valor], "Elemento actualizado correctamente");
        } else {
            $stmt = $db->prepare("INSERT INTO catalogos_inventario (tipo, valor) VALUES (:t, :v) ON DUPLICATE KEY UPDATE valor = :v");
            $stmt->execute([':t' => $tipo, ':v' => $valor]);
            $newId = (int)$db->lastInsertId();
            if (!$newId) {
                $sel = $db->prepare("SELECT id FROM catalogos_inventario WHERE tipo = :t AND valor = :v");
                $sel->execute([':t' => $tipo, ':v' => $valor]);
                $newId = (int)$sel->fetchColumn();
            }
            respondSuccess(['id' => $newId, 'valor' => $valor], "Elemento guardado correctamente");
        }
    }
}
// Eliminar Elemento de Catálogo Auxiliar
else if ($method === 'POST' && ($accion === 'delete_catalogo_item' || $accion === 'eliminar_catalogo_item')) {
    $rawInput = preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents("php://input"));
    $input = json_decode($rawInput, true) ?: [];
    $tipo = trim($input['tipo'] ?? '');
    $id = !empty($input['id']) ? (int)$input['id'] : null;

    if (empty($tipo) || !$id) {
        respondError("Parámetros incompletos para eliminar");
    }

    if ($tipo === 'categoria') {
        // Desvincular productos de esta categoría o verificar uso
        $checkStmt = $db->prepare("SELECT COUNT(*) FROM productos WHERE id_categoria = :id");
        $checkStmt->execute([':id' => $id]);
        $enUso = (int)$checkStmt->fetchColumn();
        if ($enUso > 0) {
            // Reasignar a fallback o desasociar
            $fb = $db->query("SELECT id FROM categorias WHERE id != $id LIMIT 1")->fetchColumn();
            if ($fb) {
                $upd = $db->prepare("UPDATE productos SET id_categoria = :fb WHERE id_categoria = :id");
                $upd->execute([':fb' => $fb, ':id' => $id]);
            }
        }
        $stmt = $db->prepare("DELETE FROM categorias WHERE id = :id");
        $stmt->execute([':id' => $id]);
        respondSuccess(null, "Categoría eliminada exitosamente");
    } else {
        $stmt = $db->prepare("DELETE FROM catalogos_inventario WHERE id = :id AND tipo = :tipo");
        $stmt->execute([':id' => $id, ':tipo' => $tipo]);
        respondSuccess(null, "Elemento eliminado exitosamente");
    }
}
// Carga Masiva de Múltiples Productos
else if ($method === 'POST' && ($accion === 'save_batch_productos' || $accion === 'importar_masivo')) {
    $rawInput = preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents("php://input"));
    $input = json_decode($rawInput, true) ?: [];
    $productos = $input['productos'] ?? [];

    if (!is_array($productos) || empty($productos)) {
        respondError("No se recibieron productos para procesar");
    }

    $db->beginTransaction();
    try {
        $creados = 0;
        $actualizados = 0;
        $errores = [];

        // Categoría por defecto
        $catFallback = $db->query("SELECT id FROM categorias LIMIT 1")->fetchColumn() ?: 1;

        $checkSku = $db->prepare("SELECT id FROM productos WHERE codigo_sku = :sku LIMIT 1");
        
        $updStmt = $db->prepare("UPDATE productos SET 
            nombre = :nombre,
            id_categoria = :id_categoria,
            tipo_articulo = :tipo_articulo,
            unidad_medida = :unidad_medida,
            ubicacion_fisica = :ubicacion_fisica,
            proveedor_habitual = :proveedor_habitual,
            codigo_barras = :codigo_barras,
            descripcion = :descripcion,
            precio_venta = :precio_venta,
            costo_unitario = :costo_unitario,
            stock_actual = :stock_actual,
            stock_minimo = :stock_minimo,
            estado = :estado
            WHERE id = :id");

        $insStmt = $db->prepare("INSERT INTO productos (
            nombre, id_categoria, tipo_articulo, unidad_medida, ubicacion_fisica, 
            proveedor_habitual, codigo_barras, codigo_sku, descripcion, precio_venta, 
            costo_unitario, stock_actual, stock_minimo, estado
        ) VALUES (
            :nombre, :id_categoria, :tipo_articulo, :unidad_medida, :ubicacion_fisica, 
            :proveedor_habitual, :codigo_barras, :codigo_sku, :descripcion, :precio_venta, 
            :costo_unitario, :stock_actual, :stock_minimo, :estado
        )");

        foreach ($productos as $idx => $p) {
            $nombre = trim($p['nombre'] ?? '');
            if (empty($nombre)) {
                $errores[] = "Fila " . ($idx + 1) . ": Nombre de producto vacío";
                continue;
            }

            $sku = trim($p['codigo_sku'] ?? '');
            if (empty($sku)) {
                $sku = 'MP-' . strtoupper(substr(uniqid(), -4)) . rand(10, 99);
            }

            $id_cat = !empty($p['id_categoria']) ? (int)$p['id_categoria'] : (int)$catFallback;
            $tipo = trim($p['tipo_articulo'] ?? 'Materia Prima (Insumo Base)');
            $unidad = trim($p['unidad_medida'] ?? 'Kilogramos (kg)');
            $ubicacion = trim($p['ubicacion_fisica'] ?? 'Almacén Seco');
            $proveedor = trim($p['proveedor_habitual'] ?? '');
            $codigo_barras = trim($p['codigo_barras'] ?? '');
            $descripcion = trim($p['descripcion'] ?? '');
            $stock = (float)($p['stock_actual'] ?? 0);
            $stock_min = (float)($p['stock_minimo'] ?? 5);
            $costo = (float)($p['costo_unitario'] ?? 0);
            $precio = (float)($p['precio_venta'] ?? 0);
            $estado = ($stock > 0) ? 'disponible' : 'agotado';

            // Comprobar si ya existe por SKU
            $checkSku->execute([':sku' => $sku]);
            $existId = $checkSku->fetchColumn();

            if ($existId) {
                $updStmt->execute([
                    ':nombre' => $nombre,
                    ':id_categoria' => $id_cat,
                    ':tipo_articulo' => $tipo,
                    ':unidad_medida' => $unidad,
                    ':ubicacion_fisica' => $ubicacion,
                    ':proveedor_habitual' => $proveedor,
                    ':codigo_barras' => $codigo_barras,
                    ':descripcion' => $descripcion,
                    ':precio_venta' => $precio,
                    ':costo_unitario' => $costo,
                    ':stock_actual' => $stock,
                    ':stock_minimo' => $stock_min,
                    ':estado' => $estado,
                    ':id' => $existId
                ]);
                $actualizados++;
            } else {
                $insStmt->execute([
                    ':nombre' => $nombre,
                    ':id_categoria' => $id_cat,
                    ':tipo_articulo' => $tipo,
                    ':unidad_medida' => $unidad,
                    ':ubicacion_fisica' => $ubicacion,
                    ':proveedor_habitual' => $proveedor,
                    ':codigo_barras' => $codigo_barras,
                    ':codigo_sku' => $sku,
                    ':descripcion' => $descripcion,
                    ':precio_venta' => $precio,
                    ':costo_unitario' => $costo,
                    ':stock_actual' => $stock,
                    ':stock_minimo' => $stock_min,
                    ':estado' => $estado
                ]);
                $creados++;
            }
        }

        $db->commit();
        respondSuccess([
            'total_procesados' => count($productos),
            'creados' => $creados,
            'actualizados' => $actualizados,
            'errores' => $errores
        ], "Carga masiva procesada exitosamente ($creados creados, $actualizados actualizados)");
    } catch (Exception $e) {
        $db->rollBack();
        respondError("Error en carga masiva: " . $e->getMessage());
    }
}
else {
    respondError("Acción de inventario no válida", 404);
}
?>
