<?php
// api/migrations/006_inventario_productos_extendido_y_compras.php

return [
    'nombre' => 'Extensión de Productos e Historial de Compras con Comprobantes',
    'descripcion' => 'Añade campos de categorización física y costeo a productos (tipo, unidad, ubicación, proveedor, código barras, costo unitario) y crea la tabla historial_compras_producto.',
    'up' => function(PDO $db, Migrador $migrador) {
        // 1. Columnas en tabla productos
        if (!$migrador->columnaExiste('productos', 'tipo_articulo')) {
            $db->exec("ALTER TABLE productos ADD COLUMN tipo_articulo VARCHAR(50) NOT NULL DEFAULT 'materia_prima' AFTER id_categoria");
        }
        if (!$migrador->columnaExiste('productos', 'unidad_medida')) {
            $db->exec("ALTER TABLE productos ADD COLUMN unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidades' AFTER tipo_articulo");
        }
        if (!$migrador->columnaExiste('productos', 'ubicacion_fisica')) {
            $db->exec("ALTER TABLE productos ADD COLUMN ubicacion_fisica VARCHAR(100) NULL DEFAULT '' AFTER unidad_medida");
        }
        if (!$migrador->columnaExiste('productos', 'proveedor_habitual')) {
            $db->exec("ALTER TABLE productos ADD COLUMN proveedor_habitual VARCHAR(150) NULL DEFAULT '' AFTER ubicacion_fisica");
        }
        if (!$migrador->columnaExiste('productos', 'codigo_barras')) {
            $db->exec("ALTER TABLE productos ADD COLUMN codigo_barras VARCHAR(50) NULL DEFAULT '' AFTER proveedor_habitual");
        }
        if (!$migrador->columnaExiste('productos', 'costo_unitario')) {
            $db->exec("ALTER TABLE productos ADD COLUMN costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER precio_venta");
        }

        // 2. Tabla historial_compras_producto para registro y auditoría de facturas/comprobantes
        if (!$migrador->tablaExiste('historial_compras_producto')) {
            $db->exec("CREATE TABLE IF NOT EXISTS historial_compras_producto (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_producto INT NOT NULL,
                fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                numero_comprobante VARCHAR(100) NOT NULL,
                proveedor VARCHAR(150) NOT NULL,
                cantidad DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                comprobante_url VARCHAR(255) NULL,
                observaciones TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_compra_prod (id_producto),
                INDEX idx_compra_fecha (fecha),
                CONSTRAINT fk_compra_producto FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        }
    }
];
