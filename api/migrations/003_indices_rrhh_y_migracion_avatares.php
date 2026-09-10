<?php
// api/migrations/003_indices_rrhh_y_migracion_avatares.php

return [
    'nombre' => 'Indices de Rendimiento RRHH y Migracion de Avatares a Disco',
    'descripcion' => 'Anade indices B-Tree a rrhh_asistencias para acelerar consultas y migra fotos Base64 de la BD a archivos fisicos.',
    'up' => function(PDO $db, Migrador $migrador) {
        // 1. Crear indices en rrhh_asistencias si no existen
        $indexes = [
            'idx_asist_fecha_hora' => "CREATE INDEX idx_asist_fecha_hora ON rrhh_asistencias (fecha_hora_entrada)",
            'idx_asist_user_fecha' => "CREATE INDEX idx_asist_user_fecha ON rrhh_asistencias (id_usuario, fecha_hora_entrada)",
            'idx_asist_estado'     => "CREATE INDEX idx_asist_estado ON rrhh_asistencias (estado)",
            'idx_asist_condicion'  => "CREATE INDEX idx_asist_condicion ON rrhh_asistencias (condicion)"
        ];

        foreach ($indexes as $name => $sql) {
            try {
                $db->exec($sql);
            } catch (PDOException $e) {
                // Ya existe o no soportado, ignorar de forma segura
            }
        }

        // 2. Migrar fotos base64 de usuarios a archivos fisicos en disco
        $uploadDir = __DIR__ . '/../../uploads/perfiles/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $stmt = $db->query("SELECT id, foto_perfil FROM usuarios WHERE foto_perfil LIKE 'data:image/%'");
        $users = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

        foreach ($users as $u) {
            $id = $u['id'];
            $raw = $u['foto_perfil'];
            $parts = explode(";base64,", $raw);
            if (count($parts) === 2) {
                $type_aux = explode("image/", $parts[0]);
                $ext = isset($type_aux[1]) ? $type_aux[1] : 'jpeg';
                if ($ext === 'jpeg') $ext = 'jpg';
                $data = base64_decode(str_replace(' ', '+', $parts[1]));
                $filename = 'avatar_' . $id . '_' . time() . '.' . $ext;
                file_put_contents($uploadDir . $filename, $data);
                $newUrl = 'uploads/perfiles/' . $filename;
                $upd = $db->prepare("UPDATE usuarios SET foto_perfil = :url WHERE id = :id");
                $upd->execute([':url' => $newUrl, ':id' => $id]);
            }
        }

        // 3. Limpiar OPcache de PHP si esta disponible
        if (function_exists('opcache_reset')) {
            @opcache_reset();
        }
    }
];