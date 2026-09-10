<?php
// api/migrations/005_sistema_sanciones_bloqueo.php

return [
    'nombre' => 'Sistema de Sanciones Disciplinarias con Bloqueo Temporal',
    'descripcion' => 'Añade campos de sanción y fecha de expiración a usuarios y crea la tabla rrhh_sanciones para historial y levantamiento de suspensiones.',
    'up' => function(PDO $db, Migrador $migrador) {
        // 1. Columnas en tabla usuarios
        if (!$migrador->columnaExiste('usuarios', 'sancionado_hasta')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN sancionado_hasta DATETIME NULL DEFAULT NULL AFTER hora_salida_asignada");
        }
        if (!$migrador->columnaExiste('usuarios', 'sancion_motivo')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN sancion_motivo VARCHAR(255) NULL DEFAULT NULL AFTER sancionado_hasta");
        }
        if (!$migrador->columnaExiste('usuarios', 'sancion_detalle')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN sancion_detalle TEXT NULL DEFAULT NULL AFTER sancion_motivo");
        }
        if (!$migrador->columnaExiste('usuarios', 'sancion_fecha')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN sancion_fecha DATETIME NULL DEFAULT NULL AFTER sancion_detalle");
        }
        if (!$migrador->columnaExiste('usuarios', 'sancion_admin_id')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN sancion_admin_id INT NULL DEFAULT NULL AFTER sancion_fecha");
        }

        // 2. Tabla rrhh_sanciones para trazabilidad histórica
        if (!$migrador->tablaExiste('rrhh_sanciones')) {
            $db->exec("CREATE TABLE IF NOT EXISTS rrhh_sanciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                id_asistencia INT NULL,
                id_admin INT NULL,
                motivo VARCHAR(255) NOT NULL,
                detalle TEXT NULL,
                fecha_inicio DATETIME NOT NULL,
                fecha_fin DATETIME NULL,
                dias_sancion INT DEFAULT 0,
                horas_descontadas DECIMAL(5,2) DEFAULT 0.00,
                estado ENUM('activa', 'levantada', 'cumplida') DEFAULT 'activa',
                levantado_por INT NULL,
                fecha_levantamiento DATETIME NULL,
                motivo_levantamiento VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sancion_usuario (id_usuario),
                INDEX idx_sancion_estado (estado),
                INDEX idx_sancion_fechas (fecha_inicio, fecha_fin)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        }
    }
];
