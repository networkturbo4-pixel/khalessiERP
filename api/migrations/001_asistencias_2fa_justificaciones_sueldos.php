<?php
// api/migrations/001_asistencias_2fa_justificaciones_sueldos.php

return [
    'nombre' => 'Asistencias 2FA, Justificaciones y Sueldos de Personal',
    'descripcion' => 'Crea tabla de justificaciones, añade soporte Google Authenticator 2FA para tardanzas, campos de remuneración y métricas de nómina.',
    'up' => function(PDO $db, Migrador $migrador) {
        
        // 1. Tabla rrhh_justificaciones
        $db->exec("CREATE TABLE IF NOT EXISTS rrhh_justificaciones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            fecha DATE NOT NULL,
            motivo VARCHAR(100) NOT NULL,
            descripcion TEXT NOT NULL,
            foto_evidencia_url VARCHAR(255) NULL,
            estado ENUM('pendiente', 'aprobado', 'desaprobado') DEFAULT 'pendiente',
            tipo_resolucion ENUM('con_goce', 'sin_goce', 'tiempo_extra', 'tiempo_perdido') DEFAULT 'sin_goce',
            horas_afectadas DECIMAL(5,2) DEFAULT 0.00,
            id_admin_resolucion INT NULL,
            comentarios_resolucion TEXT NULL,
            fecha_resolucion TIMESTAMP NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_just_usuario (id_usuario),
            INDEX idx_just_fecha (fecha),
            INDEX idx_just_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // 2. Columnas en usuarios para sueldos y 2FA
        if (!$migrador->columnaExiste('usuarios', 'sueldo_base')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN sueldo_base DECIMAL(10,2) DEFAULT 0.00 AFTER bio");
        }
        if (!$migrador->columnaExiste('usuarios', 'sueldo_por_hora')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN sueldo_por_hora DECIMAL(10,2) DEFAULT 0.00 AFTER sueldo_base");
        }
        if (!$migrador->columnaExiste('usuarios', 'tipo_pago')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN tipo_pago ENUM('mensual', 'quincenal', 'semanal', 'hora') DEFAULT 'mensual' AFTER sueldo_por_hora");
        }
        if (!$migrador->columnaExiste('usuarios', 'horas_semanales_pactadas')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN horas_semanales_pactadas INT DEFAULT 48 AFTER tipo_pago");
        }
        if (!$migrador->columnaExiste('usuarios', 'totp_secret')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN totp_secret VARCHAR(32) NULL AFTER horas_semanales_pactadas");
        }

        // 3. Columnas en rrhh_asistencias para tardanzas, horas extras y justificaciones
        if (!$migrador->columnaExiste('rrhh_asistencias', 'minutos_tardanza')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN minutos_tardanza INT DEFAULT 0 AFTER condicion");
        }
        if (!$migrador->columnaExiste('rrhh_asistencias', 'autorizado_por_totp')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN autorizado_por_totp TINYINT(1) DEFAULT 0 AFTER minutos_tardanza");
        }
        if (!$migrador->columnaExiste('rrhh_asistencias', 'horas_extra')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN horas_extra DECIMAL(5,2) DEFAULT 0.00 AFTER autorizado_por_totp");
        }
        if (!$migrador->columnaExiste('rrhh_asistencias', 'horas_perdidas')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN horas_perdidas DECIMAL(5,2) DEFAULT 0.00 AFTER horas_extra");
        }
        if (!$migrador->columnaExiste('rrhh_asistencias', 'id_justificacion')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN id_justificacion INT NULL AFTER horas_perdidas");
        }

        // 4. Configuración inicial para tardanza y secreto maestro de supervisor
        require_once __DIR__ . '/../totp.php';
        $secretSupervisor = GoogleAuthenticator::generateSecret(16);

        $configs = [
            ['clave' => 'rrhh_tolerancia_tardanza_minutos', 'valor' => '15'],
            ['clave' => 'rrhh_totp_supervisor_secret', 'valor' => $secretSupervisor]
        ];

        $stmtCfg = $db->prepare("INSERT IGNORE INTO configuracion (clave, valor) VALUES (:clave, :valor)");
        foreach ($configs as $cfg) {
            $stmtCfg->execute($cfg);
        }
    }
];
