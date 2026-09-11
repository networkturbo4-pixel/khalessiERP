<?php
// api/migrations/007_modulo_tiendas_y_metodos_pago.php

return [
    'nombre' => 'Módulo Tiendas y Métodos de Pago',
    'descripcion' => 'Extiende la tabla locales con datos de delivery, tramos, coordenadas GPS, avisos takeaway y crea la tabla tienda_metodos_pago.',
    'up' => function(PDO $db, Migrador $migrador) {
        // 1. Columnas extendidas en la tabla locales (tiendas)
        if (!$migrador->columnaExiste('locales', 'slug')) {
            $db->exec("ALTER TABLE locales ADD COLUMN slug VARCHAR(150) NULL AFTER nombre");
        }
        if (!$migrador->columnaExiste('locales', 'direccion')) {
            $db->exec("ALTER TABLE locales ADD COLUMN direccion VARCHAR(255) NULL DEFAULT '' AFTER ciudad");
        }
        if (!$migrador->columnaExiste('locales', 'whatsapp')) {
            $db->exec("ALTER TABLE locales ADD COLUMN whatsapp VARCHAR(50) NULL DEFAULT '' AFTER direccion");
        }
        if (!$migrador->columnaExiste('locales', 'descripcion')) {
            $db->exec("ALTER TABLE locales ADD COLUMN descripcion TEXT NULL AFTER whatsapp");
        }
        if (!$migrador->columnaExiste('locales', 'imagen_url')) {
            $db->exec("ALTER TABLE locales ADD COLUMN imagen_url VARCHAR(255) NULL DEFAULT '' AFTER descripcion");
        }
        if (!$migrador->columnaExiste('locales', 'radio_entrega_km')) {
            $db->exec("ALTER TABLE locales ADD COLUMN radio_entrega_km DECIMAL(8,2) NOT NULL DEFAULT 5.00 AFTER imagen_url");
        }
        if (!$migrador->columnaExiste('locales', 'tarifas_distancia_activas')) {
            $db->exec("ALTER TABLE locales ADD COLUMN tarifas_distancia_activas TINYINT(1) NOT NULL DEFAULT 1 AFTER radio_entrega_km");
        }
        if (!$migrador->columnaExiste('locales', 'envio_gratis_desde')) {
            $db->exec("ALTER TABLE locales ADD COLUMN envio_gratis_desde DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER tarifas_distancia_activas");
        }
        if (!$migrador->columnaExiste('locales', 'tramos_distancia')) {
            $db->exec("ALTER TABLE locales ADD COLUMN tramos_distancia LONGTEXT NULL AFTER envio_gratis_desde");
        }
        if (!$migrador->columnaExiste('locales', 'tipo_cobertura_dept')) {
            $db->exec("ALTER TABLE locales ADD COLUMN tipo_cobertura_dept ENUM('todos', 'seleccionados') NOT NULL DEFAULT 'seleccionados' AFTER tramos_distancia");
        }
        if (!$migrador->columnaExiste('locales', 'departamentos_cobertura')) {
            $db->exec("ALTER TABLE locales ADD COLUMN departamentos_cobertura LONGTEXT NULL AFTER tipo_cobertura_dept");
        }
        if (!$migrador->columnaExiste('locales', 'aviso_recojo')) {
            $db->exec("ALTER TABLE locales ADD COLUMN aviso_recojo TEXT NULL AFTER departamentos_cobertura");
        }
        if (!$migrador->columnaExiste('locales', 'latitud')) {
            $db->exec("ALTER TABLE locales ADD COLUMN latitud DECIMAL(11,8) NOT NULL DEFAULT -11.94097575 AFTER aviso_recojo");
        }
        if (!$migrador->columnaExiste('locales', 'longitud')) {
            $db->exec("ALTER TABLE locales ADD COLUMN longitud DECIMAL(11,8) NOT NULL DEFAULT -77.04908715 AFTER latitud");
        }
        if (!$migrador->columnaExiste('locales', 'created_at')) {
            $db->exec("ALTER TABLE locales ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER longitud");
        }
        if (!$migrador->columnaExiste('locales', 'updated_at')) {
            $db->exec("ALTER TABLE locales ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
        }

        // Modificar columna estado en locales si es enum limitado a activo/inactivo para soportar 'mantenimiento'
        try {
            $db->exec("ALTER TABLE locales MODIFY COLUMN estado ENUM('activo', 'inactivo', 'mantenimiento') NOT NULL DEFAULT 'activo'");
        } catch(Exception $e) {}

        // Índice para slug
        try {
            $db->exec("ALTER TABLE locales ADD UNIQUE INDEX idx_locales_slug (slug)");
        } catch(Exception $e) {}

        // 2. Poblar datos por defecto en las sedes existentes si no tienen slug
        $stmtLocales = $db->query("SELECT id, nombre, slug FROM locales");
        $localesExistentes = $stmtLocales->fetchAll(PDO::FETCH_ASSOC);

        $defaultTramos = json_encode([
            ['hasta_km' => 0.3, 'costo_envio' => 2.00, 'min_compra' => 20.00],
            ['hasta_km' => 1.5, 'costo_envio' => 4.00, 'min_compra' => 25.00],
            ['hasta_km' => 3.0, 'costo_envio' => 6.00, 'min_compra' => 30.00],
            ['hasta_km' => 5.0, 'costo_envio' => 8.00, 'min_compra' => 35.00]
        ], JSON_UNESCAPED_UNICODE);

        $defaultDepts = json_encode(['Lima', 'Callao'], JSON_UNESCAPED_UNICODE);
        $defaultAvisoRecojo = 'una vez confirmado el pago tu pedido estara disponible en 15 minutos';

        foreach ($localesExistentes as $loc) {
            if (empty($loc['slug'])) {
                // Generar slug
                $slugBase = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $loc['nombre']), '-'));
                if (empty($slugBase)) $slugBase = 'local-' . $loc['id'];
                
                $upStmt = $db->prepare("UPDATE locales SET 
                    slug = :slug,
                    direccion = IF(direccion IS NULL OR direccion = '', 'Av. Belaunde Este 126A, Comas 15301', direccion),
                    whatsapp = IF(whatsapp IS NULL OR whatsapp = '', '51999888777', whatsapp),
                    descripcion = IF(descripcion IS NULL OR descripcion = '', 'Especialistas en pizzas y comida artesanal, atendiendo a todo Lima Norte...', descripcion),
                    radio_entrega_km = IF(radio_entrega_km IS NULL OR radio_entrega_km = 0, 5.00, radio_entrega_km),
                    tarifas_distancia_activas = 1,
                    envio_gratis_desde = 0.00,
                    tramos_distancia = IF(tramos_distancia IS NULL OR tramos_distancia = '', :tramos, tramos_distancia),
                    tipo_cobertura_dept = 'seleccionados',
                    departamentos_cobertura = IF(departamentos_cobertura IS NULL OR departamentos_cobertura = '', :depts, departamentos_cobertura),
                    aviso_recojo = IF(aviso_recojo IS NULL OR aviso_recojo = '', :aviso, aviso_recojo),
                    latitud = IF(latitud IS NULL OR latitud = 0, -11.94097575, latitud),
                    longitud = IF(longitud IS NULL OR longitud = 0, -77.04908715, longitud)
                    WHERE id = :id");

                $upStmt->execute([
                    ':slug' => $slugBase,
                    ':tramos' => $defaultTramos,
                    ':depts' => $defaultDepts,
                    ':aviso' => $defaultAvisoRecojo,
                    ':id' => $loc['id']
                ]);
            }
        }

        // 3. Tabla tienda_metodos_pago
        if (!$migrador->tablaExiste('tienda_metodos_pago')) {
            $db->exec("CREATE TABLE IF NOT EXISTS tienda_metodos_pago (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_tienda INT NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT NULL,
                icono_url VARCHAR(255) NULL DEFAULT '',
                tipo_integracion VARCHAR(50) NOT NULL DEFAULT 'transferencia_qr',
                qr_imagen_url VARCHAR(255) NULL DEFAULT '',
                instrucciones_cuentas TEXT NULL,
                orden INT NOT NULL DEFAULT 0,
                estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_metodo_tienda (id_tienda),
                CONSTRAINT fk_metodo_tienda FOREIGN KEY (id_tienda) REFERENCES locales(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Sembrar métodos de pago de ejemplo para las tiendas existentes si la tabla está vacía
            $chkCount = (int)$db->query("SELECT COUNT(*) FROM tienda_metodos_pago")->fetchColumn();
            if ($chkCount === 0) {
                $stmtLocs = $db->query("SELECT id FROM locales");
                while ($lId = $stmtLocs->fetchColumn()) {
                    $insMetodo = $db->prepare("INSERT INTO tienda_metodos_pago 
                        (id_tienda, nombre, descripcion, icono_url, tipo_integracion, qr_imagen_url, instrucciones_cuentas, orden, estado) 
                        VALUES (:id_tienda, :nombre, :descripcion, :icono_url, :tipo_integracion, :qr_imagen_url, :instrucciones, :orden, :estado)");

                    $insMetodo->execute([
                        ':id_tienda' => $lId,
                        ':nombre' => 'Pago con Yape',
                        ':descripcion' => 'Copia el numero o escanea el QR y adjunta tu voucher para que nuestro equipo lo valide.',
                        ':icono_url' => '',
                        ':tipo_integracion' => 'transferencia_qr',
                        ':qr_imagen_url' => '',
                        ':instrucciones' => '998774145',
                        ':orden' => 1,
                        ':estado' => 'activo'
                    ]);

                    $insMetodo->execute([
                        ':id_tienda' => $lId,
                        ':nombre' => 'Transferencia Bancaria',
                        ':descripcion' => 'Copia el numero y adjunta tu voucher para que nuestro equipo lo valide.',
                        ':icono_url' => '',
                        ':tipo_integracion' => 'transferencia_qr',
                        ':qr_imagen_url' => '',
                        ':instrucciones' => 'BCP Soles: 191-00000000-0-00 / CCI: 00219100000000000000',
                        ':orden' => 2,
                        ':estado' => 'activo'
                    ]);
                }
            }
        }
    }
];
