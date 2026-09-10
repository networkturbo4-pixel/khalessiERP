<?php
// api/migrations/002_usuarios_cargo_contratacion.php

return [
    'nombre' => 'Campos de Cargo, Fecha de Contratación y Horarios en Usuarios',
    'descripcion' => 'Añade cargo y fecha_contratacion a la tabla usuarios para gestión directa de contratos y fichas laborales desde Configuración de Usuarios.',
    'up' => function(PDO $db, Migrador $migrador) {
        if (!$migrador->columnaExiste('usuarios', 'cargo')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN cargo VARCHAR(100) NULL AFTER apellido");
        }
        if (!$migrador->columnaExiste('usuarios', 'fecha_contratacion')) {
            $db->exec("ALTER TABLE usuarios ADD COLUMN fecha_contratacion DATE NULL AFTER estado");
        }
    }
];
