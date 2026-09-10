<?php
require_once 'db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Add columns to rrhh_asistencias
    $queries = [
        "ALTER TABLE rrhh_asistencias ADD COLUMN condicion VARCHAR(50) DEFAULT 'puntual' AFTER estado",
        "ALTER TABLE rrhh_asistencias ADD COLUMN latitud VARCHAR(50) NULL AFTER condicion",
        "ALTER TABLE rrhh_asistencias ADD COLUMN longitud VARCHAR(50) NULL AFTER latitud",
        "ALTER TABLE rrhh_asistencias ADD COLUMN observaciones TEXT NULL AFTER longitud"
    ];
    
    foreach ($queries as $q) {
        try {
            $db->exec($q);
            echo "Executed: $q\n";
        } catch (Exception $e) {
            echo "Error or already exists: " . $e->getMessage() . "\n";
        }
    }
    
    echo "Database updated successfully.\n";
} catch (Exception $e) {
    echo "Connection error: " . $e->getMessage();
}
?>
