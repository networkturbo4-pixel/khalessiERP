<?php
// api/locales.php
// Asume que las variables $db, $method, $accion, respondError, respondSuccess están disponibles.

if ($method === 'GET' && $accion === 'list') {
    $query = "SELECT * FROM locales ORDER BY id";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $locales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($locales);
}
else if ($method === 'POST' && $accion === 'save') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = isset($input['id']) ? $input['id'] : null;
    $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
    $ciudad = isset($input['ciudad']) ? trim($input['ciudad']) : null;
    $estado = isset($input['estado']) ? trim($input['estado']) : 'activo';

    if (empty($nombre)) respondError("El nombre del local es obligatorio");

    if ($id) {
        $query = "UPDATE locales SET nombre = :nombre, ciudad = :ciudad, estado = :estado WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->execute([':nombre' => $nombre, ':ciudad' => $ciudad, ':estado' => $estado, ':id' => $id]);
        respondSuccess(["id" => $id], "Local actualizado exitosamente");
    } else {
        $query = "INSERT INTO locales (nombre, ciudad, estado) VALUES (:nombre, :ciudad, :estado)";
        $stmt = $db->prepare($query);
        $stmt->execute([':nombre' => $nombre, ':ciudad' => $ciudad, ':estado' => $estado]);
        $id = $db->lastInsertId();
        respondSuccess(["id" => $id], "Local creado exitosamente");
    }
}
else if ($method === 'POST' && $accion === 'delete') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = isset($input['id']) ? $input['id'] : null;
    if (!$id) respondError("ID de local requerido");
    
    // Verificar si hay recetas vinculadas
    $qCheck = "SELECT COUNT(*) FROM receta_local WHERE id_local = :id";
    $sCheck = $db->prepare($qCheck);
    $sCheck->execute([':id' => $id]);
    if ($sCheck->fetchColumn() > 0) {
        respondError("No se puede eliminar el local porque tiene recetas locales asignadas.");
    }
    
    $query = "DELETE FROM locales WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->execute([':id' => $id]);
    respondSuccess(null, "Local eliminado exitosamente");
}
else {
    respondError("Acción de locales no válida", 404);
}
?>
