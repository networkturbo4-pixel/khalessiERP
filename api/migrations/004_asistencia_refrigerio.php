<?php
// api/migrations/004_asistencia_refrigerio.php

return [
    'nombre' => 'Control de Refrigerio en Asistencias (Inicio y Fin)',
    'descripcion' => 'Añade inicio_refrigerio, fin_refrigerio y minutos_refrigerio a rrhh_asistencias para trazabilidad completa de pausas de comida del personal.',
    'up' => function(PDO $db, Migrador $migrador) {
        if (!$migrador->columnaExiste('rrhh_asistencias', 'inicio_refrigerio')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN inicio_refrigerio TIMESTAMP NULL DEFAULT NULL AFTER fecha_hora_entrada");
        }
        if (!$migrador->columnaExiste('rrhh_asistencias', 'fin_refrigerio')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN fin_refrigerio TIMESTAMP NULL DEFAULT NULL AFTER inicio_refrigerio");
        }
        if (!$migrador->columnaExiste('rrhh_asistencias', 'minutos_refrigerio')) {
            $db->exec("ALTER TABLE rrhh_asistencias ADD COLUMN minutos_refrigerio INT DEFAULT 0 AFTER fin_refrigerio");
        }
    }
];
