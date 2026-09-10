<?php
// api/migrador.php - Motor de migraciones seguras e incrementales para Khalessi ERP

class Migrador {
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->inicializarTablaMigraciones();
    }

    /**
     * Asegura la creación de la tabla de control de migraciones
     */
    private function inicializarTablaMigraciones() {
        $sql = "CREATE TABLE IF NOT EXISTS sistema_migraciones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(100) NOT NULL UNIQUE,
            nombre VARCHAR(255) NOT NULL,
            descripcion VARCHAR(255) NULL,
            ejecutado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->db->exec($sql);
    }

    /**
     * Obtiene el listado de versiones de migraciones ya ejecutadas
     */
    public function getMigracionesEjecutadas() {
        $stmt = $this->db->query("SELECT version, nombre, descripcion, ejecutado_en FROM sistema_migraciones ORDER BY id ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Verifica si una tabla existe en la base de datos actual
     */
    public function tablaExiste($tabla) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :tabla");
        $stmt->execute([':tabla' => $tabla]);
        return (int)$stmt->fetchColumn() > 0;
    }

    /**
     * Verifica si una columna existe en una tabla específica
     */
    public function columnaExiste($tabla, $columna) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :tabla AND column_name = :columna");
        $stmt->execute([':tabla' => $tabla, ':columna' => $columna]);
        return (int)$stmt->fetchColumn() > 0;
    }

    /**
     * Ejecuta todas las migraciones pendientes en orden alfabético/numérico
     */
    public function ejecutarPendientes() {
        $dir = __DIR__ . '/migrations';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $ejecutadasRaw = $this->db->query("SELECT version FROM sistema_migraciones")->fetchAll(PDO::FETCH_COLUMN);
        $ejecutadas = array_flip($ejecutadasRaw);

        $archivos = glob($dir . '/*.php');
        sort($archivos);

        $resultados = [
            'total_existentes' => count($archivos),
            'ya_aplicadas' => count($ejecutadasRaw),
            'aplicadas_ahora' => [],
            'errores' => []
        ];

        foreach ($archivos as $archivo) {
            $version = basename($archivo, '.php');
            if (isset($ejecutadas[$version])) {
                continue; // Ya fue ejecutada previamente, no tocar
            }

            try {
                // Cada archivo de migración retorna un array estructurado o una función ejecutable
                $migracion = require $archivo;
                
                $nombre = isset($migracion['nombre']) ? $migracion['nombre'] : $version;
                $descripcion = isset($migracion['descripcion']) ? $migracion['descripcion'] : '';

                if (isset($migracion['up']) && is_callable($migracion['up'])) {
                    // Pasar la instancia de Migrador y PDO para comprobaciones seguras
                    $migracion['up']($this->db, $this);
                }

                // Registrar en la tabla de control
                $stmt = $this->db->prepare("INSERT INTO sistema_migraciones (version, nombre, descripcion) VALUES (:ver, :nom, :desc)");
                $stmt->execute([
                    ':ver' => $version,
                    ':nom' => $nombre,
                    ':desc' => $descripcion
                ]);

                $resultados['aplicadas_ahora'][] = [
                    'version' => $version,
                    'nombre' => $nombre,
                    'descripcion' => $descripcion
                ];
            } catch (Exception $e) {
                $resultados['errores'][] = [
                    'version' => $version,
                    'error' => $e->getMessage()
                ];
                // Detener para no generar inconsistencias
                break;
            }
        }

        return $resultados;
    }
}
