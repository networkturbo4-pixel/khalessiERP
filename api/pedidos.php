<?php
// api/pedidos.php - Gestión de Pedidos y Ventas vinculados a Tienda Roma / Catálogo Web

function getAuthApiKey($input = []) {
    $apiKey = '';
    // 1. Chequear Headers HTTP
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    foreach ($headers as $k => $v) {
        if (strcasecmp($k, 'X-API-KEY') === 0) {
            $apiKey = trim($v);
            break;
        }
        if (strcasecmp($k, 'Authorization') === 0 && stripos($v, 'Bearer ') === 0) {
            $apiKey = trim(substr($v, 7));
            break;
        }
    }
    // 2. Fallback de headers en $_SERVER
    if (empty($apiKey)) {
        if (!empty($_SERVER['HTTP_X_API_KEY'])) {
            $apiKey = trim($_SERVER['HTTP_X_API_KEY']);
        } else if (!empty($_SERVER['HTTP_AUTHORIZATION']) && stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') === 0) {
            $apiKey = trim(substr($_SERVER['HTTP_AUTHORIZATION'], 7));
        }
    }
    // 3. Fallback en GET o body JSON
    if (empty($apiKey)) {
        if (!empty($_GET['api_key'])) {
            $apiKey = trim($_GET['api_key']);
        } else if (!empty($input['api_key'])) {
            $apiKey = trim($input['api_key']);
        }
    }
    return $apiKey;
}

function validarApiKeyPedidos($db, $input = []) {
    $claveConfigurada = 'kh_sec_roma_2026_pizzakhalessi';
    try {
        $stmt = $db->query("SELECT valor FROM configuracion WHERE clave = 'api_key_pedidos' LIMIT 1");
        $val = $stmt->fetchColumn();
        if (!empty($val)) $claveConfigurada = trim($val);
    } catch (Exception $e) {}

    $claveRecibida = getAuthApiKey($input);
    if (empty($claveRecibida) || $claveRecibida !== $claveConfigurada) {
        respondError("Acceso no autorizado: Clave API inválida o ausente", 401);
    }
}

function verificarTablasPedidos($db) {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $db->query("SELECT 1 FROM pedidos LIMIT 1");
    } catch (Exception $e) {
        // Si no existen las tablas, crearlas automáticamente
        $sql = "
        CREATE TABLE IF NOT EXISTS pedidos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            codigo_pedido VARCHAR(30) NOT NULL UNIQUE,
            id_local INT NULL,
            id_cliente INT NULL,
            origen VARCHAR(50) DEFAULT 'tienda_roma',
            id_pedido_externo VARCHAR(50) NULL,
            cliente_nombre VARCHAR(100) NOT NULL,
            cliente_telefono VARCHAR(30) NULL,
            cliente_direccion TEXT NULL,
            tipo_entrega ENUM('pickup', 'delivery', 'mesa') DEFAULT 'pickup',
            metodo_pago VARCHAR(50) NULL,
            subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            estado ENUM('pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado') DEFAULT 'pendiente',
            notas TEXT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_estado (estado),
            INDEX idx_fecha (fecha_creacion),
            INDEX idx_codigo (codigo_pedido)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS pedidos_detalle (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_pedido INT NOT NULL,
            id_producto INT NULL,
            producto_nombre VARCHAR(150) NOT NULL,
            cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
            precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            notas TEXT NULL,
            FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE,
            INDEX idx_pedido (id_pedido)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        INSERT IGNORE INTO permisos_roles (id_rol, modulo, puede_ver, puede_editar, puede_eliminar)
        VALUES (1, 'pedidos', 1, 1, 1);

        INSERT IGNORE INTO configuracion (clave, valor) 
        VALUES ('api_key_pedidos', 'kh_sec_roma_2026_pizzakhalessi');
        ";
        try {
            $db->exec($sql);
        } catch (Exception $ex) {}
    }

    // Auto-migración: Normalizar métodos de pago numéricos si existen
    try {
        $db->exec("
            UPDATE pedidos SET metodo_pago = 'Yape' WHERE metodo_pago = '1';
            UPDATE pedidos SET metodo_pago = 'Plin' WHERE metodo_pago = '2';
            UPDATE pedidos SET metodo_pago = 'Efectivo' WHERE metodo_pago = '3';
            UPDATE pedidos SET metodo_pago = 'Tarjeta' WHERE metodo_pago = '4';
            UPDATE pedidos SET metodo_pago = 'Transferencia' WHERE metodo_pago = '5';
        ");
    } catch (Exception $ex) {}
}

verificarTablasPedidos($db);

if ($method === 'GET' && ($accion === 'list' || $accion === '')) {
    $estado = isset($_GET['estado']) ? trim($_GET['estado']) : '';
    $id_local = !empty($_GET['id_local']) ? (int)$_GET['id_local'] : null;
    $fecha = isset($_GET['fecha']) ? trim($_GET['fecha']) : '';
    $buscar = isset($_GET['q']) ? trim($_GET['q']) : '';
    $limit = !empty($_GET['limit']) ? (int)$_GET['limit'] : 100;

    $query = "SELECT p.*, l.nombre as local_nombre 
              FROM pedidos p 
              LEFT JOIN locales l ON p.id_local = l.id 
              WHERE 1=1";
    $params = [];

    if ($estado !== '') {
        if ($estado === 'activos') {
            $query .= " AND p.estado NOT IN ('entregado', 'cancelado')";
        } else {
            $query .= " AND p.estado = :est";
            $params[':est'] = $estado;
        }
    }

    if ($id_local) {
        $query .= " AND p.id_local = :loc";
        $params[':loc'] = $id_local;
    }

    if ($fecha !== '') {
        $query .= " AND DATE(p.fecha_creacion) = :fec";
        $params[':fec'] = $fecha;
    }

    if ($buscar !== '') {
        $query .= " AND (p.codigo_pedido LIKE :q OR p.cliente_nombre LIKE :q OR p.cliente_telefono LIKE :q OR p.id_pedido_externo LIKE :q)";
        $params[':q'] = "%$buscar%";
    }

    $query .= " ORDER BY p.id DESC LIMIT " . $limit;
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cargar detalles de cada pedido
    if (!empty($pedidos)) {
        $ids = array_column($pedidos, 'id');
        $inQuery = implode(',', array_fill(0, count($ids), '?'));
        
        $qDet = "SELECT pd.*, pr.codigo_sku, pr.imagen_url 
                 FROM pedidos_detalle pd 
                 LEFT JOIN productos pr ON pd.id_producto = pr.id 
                 WHERE pd.id_pedido IN ($inQuery) 
                 ORDER BY pd.id ASC";
        $sDet = $db->prepare($qDet);
        $sDet->execute($ids);
        $detalles = $sDet->fetchAll(PDO::FETCH_ASSOC);

        $detallesPorPedido = [];
        foreach ($detalles as $det) {
            $detallesPorPedido[$det['id_pedido']][] = $det;
        }

        foreach ($pedidos as &$p) {
            $p['items'] = isset($detallesPorPedido[$p['id']]) ? $detallesPorPedido[$p['id']] : [];
            $p['total_items'] = count($p['items']);
        }
    }

    respondSuccess($pedidos);
}

// Detalle individual de un pedido
else if ($method === 'GET' && $accion === 'detail') {
    $id = !empty($_GET['id']) ? (int)$_GET['id'] : null;
    $codigo = isset($_GET['codigo']) ? trim($_GET['codigo']) : '';

    if (!$id && !$codigo) {
        respondError("ID o código de pedido requerido");
    }

    $query = "SELECT p.*, l.nombre as local_nombre, c.email as cliente_email 
              FROM pedidos p 
              LEFT JOIN locales l ON p.id_local = l.id 
              LEFT JOIN clientes c ON p.id_cliente = c.id 
              WHERE " . ($id ? "p.id = :id" : "p.codigo_pedido = :cod") . " LIMIT 1";
    $stmt = $db->prepare($query);
    if ($id) {
        $stmt->execute([':id' => $id]);
    } else {
        $stmt->execute([':cod' => $codigo]);
    }

    $pedido = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$pedido) {
        respondError("Pedido no encontrado", 404);
    }

    // Items
    $qDet = "SELECT pd.*, pr.codigo_sku, pr.imagen_url 
             FROM pedidos_detalle pd 
             LEFT JOIN productos pr ON pd.id_producto = pr.id 
             WHERE pd.id_pedido = :id";
    $sDet = $db->prepare($qDet);
    $sDet->execute([':id' => $pedido['id']]);
    $pedido['items'] = $sDet->fetchAll(PDO::FETCH_ASSOC);

    respondSuccess($pedido);
}

// Crear Pedido (Receptor del Catálogo / Tienda Roma / Checkout)
else if ($method === 'POST' && ($accion === 'crear' || $accion === 'save' || $accion === '')) {
    $input = json_decode(file_get_contents("php://input"), true);
    if (empty($input)) {
        $input = $_POST;
    }

    if (empty($input)) {
        respondError("No se recibieron datos del pedido");
    }

    // Validar autorización mediante API Key
    validarApiKeyPedidos($db, $input);

    $cliente_nombre = trim($input['cliente_nombre'] ?? $input['customer_name'] ?? '');
    $cliente_telefono = trim($input['cliente_telefono'] ?? $input['customer_phone'] ?? '');
    $cliente_direccion = trim($input['cliente_direccion'] ?? $input['delivery_address'] ?? '');
    $tipo_entrega = trim($input['tipo_entrega'] ?? $input['delivery_method'] ?? 'pickup');
    $metodo_pago = trim($input['metodo_pago_nombre'] ?? $input['payment_method_nombre'] ?? $input['metodo_pago'] ?? $input['payment_method'] ?? 'Efectivo');
    if (is_numeric($metodo_pago)) {
        $mapMetodos = [
            '1' => 'Yape',
            '2' => 'Plin',
            '3' => 'Efectivo',
            '4' => 'Tarjeta',
            '5' => 'Transferencia'
        ];
        $metodo_pago = $mapMetodos[$metodo_pago] ?? ('Método #' . $metodo_pago);
    }
    $subtotal = floatval($input['subtotal'] ?? 0);
    $descuento = floatval($input['descuento'] ?? $input['discount'] ?? 0);
    $costo_envio = floatval($input['costo_envio'] ?? $input['delivery_fee'] ?? 0);
    $total = floatval($input['total'] ?? 0);
    $notas = trim($input['notas'] ?? $input['customer_notes'] ?? '');
    $id_local = !empty($input['id_local']) ? (int)$input['id_local'] : (!empty($input['store_id']) ? (int)$input['store_id'] : 1);
    $origen = trim($input['origen'] ?? 'tienda_roma');
    $id_pedido_externo = trim($input['id_pedido_externo'] ?? $input['order_id'] ?? '');

    $items = $input['items'] ?? [];

    if (empty($cliente_nombre)) {
        respondError("El nombre del cliente es obligatorio");
    }
    if (empty($items) || !is_array($items)) {
        respondError("El pedido debe contener al menos un producto");
    }

    // Si el total no viene calculado, calcular en base a items
    if ($total <= 0) {
        $calcSub = 0;
        foreach ($items as $it) {
            $cant = floatval($it['cantidad'] ?? $it['qty'] ?? 1);
            $prec = floatval($it['precio'] ?? $it['price'] ?? 0);
            $calcSub += ($cant * $prec);
        }
        $subtotal = $subtotal > 0 ? $subtotal : $calcSub;
        $total = ($subtotal - $descuento) + $costo_envio;
    }

    $db->beginTransaction();

    try {
        // 1. Cliente: buscar existente por teléfono o crear uno nuevo
        $id_cliente = null;
        if (!empty($cliente_telefono)) {
            $stmtC = $db->prepare("SELECT id FROM clientes WHERE telefono = :tel LIMIT 1");
            $stmtC->execute([':tel' => $cliente_telefono]);
            $idClienteExist = $stmtC->fetchColumn();
            if ($idClienteExist) {
                $id_cliente = $idClienteExist;
                // Actualizar dirección si viene especificada
                if (!empty($cliente_direccion)) {
                    $uStmt = $db->prepare("UPDATE clientes SET direccion = :dir WHERE id = :id AND (direccion IS NULL OR direccion = '')");
                    $uStmt->execute([':dir' => $cliente_direccion, ':id' => $id_cliente]);
                }
            }
        }

        if (!$id_cliente) {
            $insC = $db->prepare("INSERT INTO clientes (nombre, telefono, direccion) VALUES (:nom, :tel, :dir)");
            $insC->execute([
                ':nom' => $cliente_nombre,
                ':tel' => $cliente_telefono ?: null,
                ':dir' => $cliente_direccion ?: null
            ]);
            $id_cliente = $db->lastInsertId();
        }

        // 2. Generar Correlativo de Pedido Único
        $prefijoFecha = date('Ymd');
        $stmtSeq = $db->prepare("SELECT COUNT(*) FROM pedidos WHERE codigo_pedido LIKE :pat");
        $stmtSeq->execute([':pat' => "PED-{$prefijoFecha}-%"]);
        $seqCount = (int)$stmtSeq->fetchColumn() + 1;
        $codigo_pedido = sprintf("PED-%s-%04d", $prefijoFecha, $seqCount);

        // 3. Insertar Cabecera de Pedido
        $qPed = "INSERT INTO pedidos (codigo_pedido, id_local, id_cliente, origen, id_pedido_externo, 
                                     cliente_nombre, cliente_telefono, cliente_direccion, tipo_entrega, 
                                     metodo_pago, subtotal, descuento, costo_envio, total, estado, notas) 
                 VALUES (:codigo, :loc, :cli, :orig, :ext, :cnom, :ctel, :cdir, :tentrega, :mpago, 
                         :sub, :desc, :envio, :tot, 'pendiente', :notas)";
        
        $sPed = $db->prepare($qPed);
        $sPed->execute([
            ':codigo' => $codigo_pedido,
            ':loc' => $id_local,
            ':cli' => $id_cliente,
            ':orig' => $origen,
            ':ext' => $id_pedido_externo ?: null,
            ':cnom' => $cliente_nombre,
            ':ctel' => $cliente_telefono ?: null,
            ':cdir' => $cliente_direccion ?: null,
            ':tentrega' => in_array($tipo_entrega, ['pickup', 'delivery', 'mesa']) ? $tipo_entrega : 'pickup',
            ':mpago' => $metodo_pago,
            ':sub' => $subtotal,
            ':desc' => $descuento,
            ':envio' => $costo_envio,
            ':tot' => $total,
            ':notas' => $notas ?: null
        ]);

        $id_pedido = $db->lastInsertId();

        // 4. Insertar Detalle y Descontar Stock
        $qDetIns = "INSERT INTO pedidos_detalle (id_pedido, id_producto, producto_nombre, cantidad, precio_unitario, subtotal, notas) 
                    VALUES (:id_ped, :id_prod, :nombre, :cant, :precio, :sub, :notas)";
        $sDetIns = $db->prepare($qDetIns);

        foreach ($items as $it) {
            $item_id_producto = !empty($it['id_producto']) ? (int)$it['id_producto'] : (!empty($it['id']) ? (int)$it['id'] : null);
            $item_nombre = trim($it['producto_nombre'] ?? $it['nombre'] ?? $it['name'] ?? 'Producto');
            $item_cant = floatval($it['cantidad'] ?? $it['qty'] ?? 1);
            $item_precio = floatval($it['precio_unitario'] ?? $it['precio'] ?? $it['price'] ?? 0);
            $item_subtotal = floatval($it['subtotal'] ?? ($item_cant * $item_precio));
            
            // Notas o extras
            $item_notas = null;
            if (!empty($it['notas'])) {
                $item_notas = is_array($it['notas']) ? json_encode($it['notas'], JSON_UNESCAPED_UNICODE) : $it['notas'];
            } else if (!empty($it['extras'])) {
                $item_notas = is_array($it['extras']) ? json_encode($it['extras'], JSON_UNESCAPED_UNICODE) : $it['extras'];
            }

            // Validar si el id_producto existe realmente en el catálogo del ERP
            if ($item_id_producto) {
                $sCheckP = $db->prepare("SELECT id FROM productos WHERE id = :id LIMIT 1");
                $sCheckP->execute([':id' => $item_id_producto]);
                if (!$sCheckP->fetchColumn()) {
                    $item_id_producto = null;
                }
            }

            // Si no tenemos id_producto válido, intentar buscar por nombre o SKU
            if (!$item_id_producto) {
                $sFindProd = $db->prepare("SELECT id FROM productos WHERE nombre = :nom OR codigo_sku = :sku LIMIT 1");
                $sFindProd->execute([':nom' => $item_nombre, ':sku' => $item_nombre]);
                $foundId = $sFindProd->fetchColumn();
                if ($foundId) {
                    $item_id_producto = (int)$foundId;
                }
            }

            // Guardar detalle
            $sDetIns->execute([
                ':id_ped' => $id_pedido,
                ':id_prod' => $item_id_producto,
                ':nombre' => $item_nombre,
                ':cant' => $item_cant,
                ':precio' => $item_precio,
                ':sub' => $item_subtotal,
                ':notas' => $item_notas
            ]);

            // Descuento automático de stock si el producto está en el inventario del ERP
            if ($item_id_producto) {
                // Actualizar stock_local
                $qStock = "SELECT id, cantidad_disponible FROM stock_local WHERE id_local = :loc AND id_producto = :prod FOR UPDATE";
                $sStock = $db->prepare($qStock);
                $sStock->execute([':loc' => $id_local, ':prod' => $item_id_producto]);
                $stockRow = $sStock->fetch(PDO::FETCH_ASSOC);

                if ($stockRow) {
                    $nuevaCant = $stockRow['cantidad_disponible'] - $item_cant;
                    $uStock = $db->prepare("UPDATE stock_local SET cantidad_disponible = :nc WHERE id = :id");
                    $uStock->execute([':nc' => $nuevaCant, ':id' => $stockRow['id']]);
                } else {
                    // Si no había registro previo en stock_local, crearlo en negativo o registrar
                    $iStock = $db->prepare("INSERT INTO stock_local (id_local, id_producto, cantidad_disponible) VALUES (:loc, :prod, :nc)");
                    $iStock->execute([':loc' => $id_local, ':prod' => $item_id_producto, ':nc' => -$item_cant]);
                }

                // Registrar en movimientos_inventario
                $qMov = "INSERT INTO movimientos_inventario (id_local, id_producto, tipo_movimiento, cantidad, costo_unitario, documento_referencia, observaciones) 
                         VALUES (:loc, :prod, 'venta', :cant, :costo, :doc, :obs)";
                $sMov = $db->prepare($qMov);
                $sMov->execute([
                    ':loc' => $id_local,
                    ':prod' => $item_id_producto,
                    ':cant' => -$item_cant,
                    ':costo' => $item_precio,
                    ':doc' => $codigo_pedido,
                    ':obs' => "Venta online desde {$origen}"
                ]);

                // Actualizar stock_actual global en tabla productos si existe
                $uProd = $db->prepare("UPDATE productos SET stock_actual = stock_actual - :cant WHERE id = :id");
                $uProd->execute([':cant' => $item_cant, ':id' => $item_id_producto]);
            }
        }

        $db->commit();

        respondSuccess([
            'id_pedido' => $id_pedido,
            'codigo_pedido' => $codigo_pedido,
            'total' => $total,
            'estado' => 'pendiente',
            'cliente' => $cliente_nombre
        ], "Pedido registrado exitosamente en el ERP");

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        respondError("Error al registrar pedido: " . $e->getMessage(), 500);
    }
}

// Cambiar estado de un pedido
else if ($method === 'POST' && ($accion === 'cambiar_estado' || $accion === 'update_status')) {
    $input = json_decode(file_get_contents("php://input"), true);
    if (empty($input)) $input = $_POST;

    $id = !empty($input['id']) ? (int)$input['id'] : null;
    $nuevo_estado = trim($input['estado'] ?? '');

    $estadosValidos = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'];

    if (!$id || !in_array($nuevo_estado, $estadosValidos)) {
        respondError("ID de pedido o estado no válido");
    }

    $stmt = $db->prepare("UPDATE pedidos SET estado = :est WHERE id = :id");
    $stmt->execute([':est' => $nuevo_estado, ':id' => $id]);

    respondSuccess(['id' => $id, 'nuevo_estado' => $nuevo_estado], "Estado de pedido actualizado");
}

// Estadísticas de Pedidos (Para dashboard o monitor en tiempo real)
else if ($method === 'GET' && $accion === 'stats') {
    $hoy = date('Y-m-d');
    
    // Total pedidos hoy
    $s1 = $db->prepare("SELECT COUNT(*), COALESCE(SUM(total), 0) FROM pedidos WHERE DATE(fecha_creacion) = :hoy AND estado != 'cancelado'");
    $s1->execute([':hoy' => $hoy]);
    [$pedidosHoy, $ventasHoy] = $s1->fetch(PDO::FETCH_NUM);

    // Pedidos pendientes
    $s2 = $db->query("SELECT COUNT(*) FROM pedidos WHERE estado IN ('pendiente', 'confirmado')");
    $pedidosPendientes = (int)$s2->fetchColumn();

    // Pedidos en preparación
    $s3 = $db->query("SELECT COUNT(*) FROM pedidos WHERE estado = 'en_preparacion'");
    $pedidosPreparacion = (int)$s3->fetchColumn();

    // Pedidos completados hoy
    $s4 = $db->prepare("SELECT COUNT(*) FROM pedidos WHERE DATE(fecha_creacion) = :hoy AND estado = 'entregado'");
    $s4->execute([':hoy' => $hoy]);
    $pedidosEntregados = (int)$s4->fetchColumn();

    respondSuccess([
        'ventas_dia' => (float)$ventasHoy,
        'pedidos_hoy' => (int)$pedidosHoy,
        'pedidos_pendientes' => $pedidosPendientes,
        'pedidos_en_preparacion' => $pedidosPreparacion,
        'pedidos_completados' => $pedidosEntregados
    ]);
}

// Sincronizar pedidos existentes desde Tienda Roma hacia el ERP
else if ($accion === 'sincronizar_tienda' || $accion === 'sync') {
    $apiKey = 'kh_sec_roma_2026_pizzakhalessi';
    
    // 1. Determinar URL de Tienda Roma
    $isLocal = in_array($_SERVER['HTTP_HOST'] ?? 'localhost', ['localhost', '127.0.0.1']);
    $urlSync = $isLocal 
        ? 'http://localhost/TIENDAROMA/api/sync_khalessi.php' 
        : 'https://pizzakhalessi.com/api/sync_khalessi.php';

    $pedidosTienda = [];

    // Intentar vía cURL primero
    $ch = curl_init($urlSync);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-API-KEY: ' . $apiKey]);
    curl_setopt($ch, CURLOPT_TIMEOUT_MS, 4000);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && !empty($raw)) {
        $json = json_decode($raw, true);
        if (!empty($json['orders'])) {
            $pedidosTienda = $json['orders'];
        }
    }

    // Fallback: Si cURL falla y estamos en el mismo servidor MySQL, intentar lectura directa de BD
    if (empty($pedidosTienda)) {
        try {
            // Nombre de la base de datos de Tienda Roma (local o cPanel)
            $dbNameTienda = $isLocal ? 'tiendaroma' : 'pizzjkyq_tiendaroma';
            
            // Usar mismas credenciales que el ERP
            $configFile = __DIR__ . '/config.prod.php';
            $dbHost = 'localhost';
            $dbUser = 'root';
            $dbPass = '';
            if (file_exists($configFile)) {
                $cfg = include $configFile;
                $dbHost = $cfg['DB_HOST'] ?? 'localhost';
                $dbUser = $cfg['DB_USER'] ?? 'root';
                $dbPass = $cfg['DB_PASS'] ?? '';
            }

            $pdoTienda = new PDO("mysql:host={$dbHost};dbname={$dbNameTienda};charset=utf8mb4", $dbUser, $dbPass);
            $stmtT = $pdoTienda->query("
                SELECT o.*, 
                COALESCE(spm.title, o.payment_method) as metodo_pago_nombre,
                COALESCE(s.name, o.store_name) as tienda_nombre 
                FROM orders o 
                LEFT JOIN store_payment_methods spm ON (spm.id = CAST(o.payment_method AS SIGNED) OR o.payment_method = spm.type COLLATE utf8mb4_unicode_ci)
                LEFT JOIN stores s ON o.store_id = s.id 
                ORDER BY o.id DESC LIMIT 60
            ");
            $pedidosTienda = $stmtT->fetchAll(PDO::FETCH_ASSOC);

            foreach ($pedidosTienda as &$pt) {
                $sItems = $pdoTienda->prepare("SELECT * FROM order_items WHERE order_id = ?");
                $sItems->execute([$pt['id']]);
                $pt['items'] = $sItems->fetchAll(PDO::FETCH_ASSOC);
            }
        } catch (Exception $ex) {}
    }

    if (empty($pedidosTienda)) {
        respondSuccess(['importados' => 0, 'actualizados' => 0], "No se encontraron pedidos en Tienda Roma para sincronizar.");
    }

    $mapEstados = [
        'pending' => 'pendiente',
        'confirmed' => 'confirmado',
        'preparing' => 'en_preparacion',
        'ready' => 'listo',
        'shipped' => 'en_camino',
        'on_way' => 'en_camino',
        'delivered' => 'entregado',
        'cancelled' => 'cancelado'
    ];

    $nuevos = 0;
    $actualizados = 0;

    foreach ($pedidosTienda as $pt) {
        $idExterno = (string)$pt['id'];
        $estadoMapeado = $mapEstados[$pt['status']] ?? 'pendiente';
        $total = floatval($pt['total'] ?? 0);
        $subtotal = floatval($pt['subtotal'] ?? $total);
        $descuento = floatval($pt['discount'] ?? 0);
        $envio = floatval($pt['delivery_fee'] ?? 0);
        $clienteNombre = trim($pt['customer_name'] ?? 'Cliente');
        $clienteTel = trim($pt['customer_phone'] ?? '');
        $clienteDir = trim($pt['delivery_address'] ?? '');
        $tipoEntrega = in_array($pt['delivery_method'] ?? '', ['delivery', 'pickup', 'mesa']) ? $pt['delivery_method'] : 'pickup';
        $metodoPago = trim($pt['metodo_pago_nombre'] ?? $pt['payment_method_nombre'] ?? $pt['payment_method'] ?? 'Efectivo');
        if (is_numeric($metodoPago)) {
            $mapMetodos = [
                '1' => 'Yape',
                '2' => 'Plin',
                '3' => 'Efectivo',
                '4' => 'Tarjeta',
                '5' => 'Transferencia'
            ];
            $metodoPago = $mapMetodos[$metodoPago] ?? ('Método #' . $metodoPago);
        }
        $fechaCreacion = !empty($pt['created_at']) ? $pt['created_at'] : date('Y-m-d H:i:s');

        // Chequear si ya existe en pedidos
        $check = $db->prepare("SELECT id, estado FROM pedidos WHERE id_pedido_externo = :ext LIMIT 1");
        $check->execute([':ext' => $idExterno]);
        $existente = $check->fetch(PDO::FETCH_ASSOC);

        if ($existente) {
            // Actualizar estado y método de pago en el ERP
            $u = $db->prepare("UPDATE pedidos SET estado = :est, metodo_pago = :mp, total = :tot, cliente_direccion = COALESCE(NULLIF(:dir, ''), cliente_direccion) WHERE id = :id");
            $u->execute([
                ':est' => $estadoMapeado,
                ':mp' => $metodoPago,
                ':tot' => $total,
                ':dir' => $clienteDir,
                ':id' => $existente['id']
            ]);
            $actualizados++;
        } else {
            // Insertar nuevo pedido importado
            $prefijo = 'PED-ROMA-' . str_pad($idExterno, 4, '0', STR_PAD_LEFT);
            
            // Buscar o crear cliente
            $idCliente = null;
            if (!empty($clienteTel)) {
                $sCli = $db->prepare("SELECT id FROM clientes WHERE telefono = :tel LIMIT 1");
                $sCli->execute([':tel' => $clienteTel]);
                $idCliente = $sCli->fetchColumn() ?: null;
            }
            if (!$idCliente) {
                $iCli = $db->prepare("INSERT INTO clientes (nombre, telefono, direccion) VALUES (:n, :t, :d)");
                $iCli->execute([':n' => $clienteNombre, ':t' => $clienteTel ?: null, ':d' => $clienteDir ?: null]);
                $idCliente = $db->lastInsertId();
            }

            $qIns = "INSERT INTO pedidos (codigo_pedido, id_local, id_cliente, origen, id_pedido_externo, 
                                         cliente_nombre, cliente_telefono, cliente_direccion, tipo_entrega, 
                                         metodo_pago, subtotal, descuento, costo_envio, total, estado, fecha_creacion) 
                     VALUES (:cod, 1, :cli, 'tienda_roma', :ext, :cnom, :ctel, :cdir, :tentrega, :mpago, :sub, :desc, :env, :tot, :est, :fec)";
            $sIns = $db->prepare($qIns);
            $sIns->execute([
                ':cod' => $prefijo,
                ':cli' => $idCliente,
                ':ext' => $idExterno,
                ':cnom' => $clienteNombre,
                ':ctel' => $clienteTel ?: null,
                ':cdir' => $clienteDir ?: null,
                ':tentrega' => $tipoEntrega,
                ':mpago' => $metodoPago,
                ':sub' => $subtotal,
                ':desc' => $descuento,
                ':env' => $envio,
                ':tot' => $total,
                ':est' => $estadoMapeado,
                ':fec' => $fechaCreacion
            ]);

            $idPedidoNuevo = $db->lastInsertId();

            // Insertar items
            if (!empty($pt['items']) && is_array($pt['items'])) {
                $qIt = "INSERT INTO pedidos_detalle (id_pedido, id_producto, producto_nombre, cantidad, precio_unitario, subtotal, notas) 
                        VALUES (:idp, :prod, :nom, :cant, :prec, :sub, :not)";
                $sIt = $db->prepare($qIt);

                foreach ($pt['items'] as $it) {
                    $prodNom = trim($it['product_name'] ?? $it['name'] ?? 'Producto');
                    $cant = floatval($it['quantity'] ?? $it['qty'] ?? 1);
                    $prec = floatval($it['price'] ?? 0);
                    $sub = floatval($it['total'] ?? ($cant * $prec));
                    $extras = !empty($it['extras']) ? (is_array($it['extras']) ? json_encode($it['extras']) : $it['extras']) : null;

                    $prodId = !empty($it['product_id']) ? (int)$it['product_id'] : null;
                    if ($prodId) {
                        $sChkP = $db->prepare("SELECT id FROM productos WHERE id = :id LIMIT 1");
                        $sChkP->execute([':id' => $prodId]);
                        if (!$sChkP->fetchColumn()) {
                            $prodId = null;
                        }
                    }
                    if (!$prodId) {
                        $sChkNom = $db->prepare("SELECT id FROM productos WHERE nombre = :nom LIMIT 1");
                        $sChkNom->execute([':nom' => $prodNom]);
                        $prodId = $sChkNom->fetchColumn() ?: null;
                    }

                    $sIt->execute([
                        ':idp' => $idPedidoNuevo,
                        ':prod' => $prodId,
                        ':nom' => $prodNom,
                        ':cant' => $cant,
                        ':prec' => $prec,
                        ':sub' => $sub,
                        ':not' => $extras
                    ]);
                }
            }

            $nuevos++;
        }
    }

    respondSuccess([
        'importados' => $nuevos,
        'actualizados' => $actualizados,
        'total_procesados' => count($pedidosTienda)
    ], "Sincronización con Tienda Roma exitosa: {$nuevos} nuevos pedidos importados, {$actualizados} actualizados.");
}

else {
    respondError("Acción de pedidos no válida", 404);
}
?>
