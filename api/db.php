<?php
// api/db.php
class Database {
    private $host = "localhost";
    private $db_name = "khalessi_erp";
    private $username = "root";
    private $password = ""; // Contraseña por defecto en XAMPP suele ser vacía
    private $port = "3306";
    public $conn;

    public function __construct() {
        // 1. Cargar archivo de configuración de producción si existe
        $configFile = __DIR__ . '/config.prod.php';
        if (file_exists($configFile)) {
            $config = include $configFile;
            if (is_array($config)) {
                $this->host = $config['DB_HOST'] ?? $this->host;
                $this->db_name = $config['DB_NAME'] ?? $this->db_name;
                $this->username = $config['DB_USER'] ?? $this->username;
                $this->password = $config['DB_PASS'] ?? $this->password;
                $this->port = $config['DB_PORT'] ?? $this->port;
            }
        } else {
            // 2. Variables de entorno (Docker, VPS, Hosting Cloud)
            if (getenv('DB_HOST')) $this->host = getenv('DB_HOST');
            if (getenv('DB_NAME')) $this->db_name = getenv('DB_NAME');
            if (getenv('DB_USER')) $this->username = getenv('DB_USER');
            if (getenv('DB_PASS')) $this->password = getenv('DB_PASS');
            if (getenv('DB_PORT')) $this->port = getenv('DB_PORT');
        }
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } catch(PDOException $exception) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(["status" => "error", "message" => "Error de conexión: " . $exception->getMessage()]);
            exit;
        }

        return $this->conn;
    }
}
?>
