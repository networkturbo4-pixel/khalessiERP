<?php
// api/media.php

if ($method === 'POST' && $accion === 'upload') {
    if (!isset($_FILES['file'])) {
        respondError("No se recibió ningún archivo");
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        respondError("Error al subir el archivo. Código: " . $file['error']);
    }

    $uploadDir = __DIR__ . '/../uploads/media/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'media_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
    $targetPath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $url = '/khalessierp/uploads/media/' . $filename;
        respondSuccess(["url" => $url], "Archivo subido exitosamente");
    } else {
        respondError("No se pudo guardar el archivo en el servidor");
    }
}
else if ($method === 'GET' && $accion === 'list') {
    $uploadDir = __DIR__ . '/../uploads/media/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $files = scandir($uploadDir);
    $mediaFiles = [];

    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $path = $uploadDir . $file;
            if (is_file($path)) {
                $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])) {
                    $mediaFiles[] = [
                        "name" => $file,
                        "url" => '/khalessierp/uploads/media/' . $file,
                        "time" => filemtime($path)
                    ];
                }
            }
        }
    }

    // Sort by newest first
    usort($mediaFiles, function($a, $b) {
        return $b['time'] - $a['time'];
    });

    respondSuccess($mediaFiles);
}
else {
    respondError("Acción de media no válida", 404);
}
?>
