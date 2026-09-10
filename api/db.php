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
        $configFile = __DIR__ . '/config.prod.php';
        $backupFile = __DIR__ . '/config.prod.php.bak';
        $rootBackup = dirname(__DIR__) . '/config.db.backup.php';

        // 1. Cargar archivo de configuración de producción si existe
        if (file_exists($configFile) && filesize($configFile) > 10) {
            $config = include $configFile;
            if (is_array($config)) {
                $this->host = $config['DB_HOST'] ?? $this->host;
                $this->db_name = $config['DB_NAME'] ?? $this->db_name;
                $this->username = $config['DB_USER'] ?? $this->username;
                $this->password = $config['DB_PASS'] ?? $this->password;
                $this->port = $config['DB_PORT'] ?? $this->port;
            }
            // Mantener copias de respaldo de seguridad
            if (!file_exists($backupFile) || filesize($backupFile) < 10) {
                @copy($configFile, $backupFile);
            }
            if (!file_exists($rootBackup) || filesize($rootBackup) < 10) {
                @copy($configFile, $rootBackup);
            }
        } else if (file_exists($backupFile) && filesize($backupFile) > 10) {
            // Auto-recuperación desde respaldo local si Git o un usuario borró el archivo
            @copy($backupFile, $configFile);
            $config = include $configFile;
            if (is_array($config)) {
                $this->host = $config['DB_HOST'] ?? $this->host;
                $this->db_name = $config['DB_NAME'] ?? $this->db_name;
                $this->username = $config['DB_USER'] ?? $this->username;
                $this->password = $config['DB_PASS'] ?? $this->password;
                $this->port = $config['DB_PORT'] ?? $this->port;
            }
        } else if (file_exists($rootBackup) && filesize($rootBackup) > 10) {
            // Auto-recuperación desde respaldo raíz
            @copy($rootBackup, $configFile);
            $config = include $configFile;
            if (is_array($config)) {
                $this->host = $config['DB_HOST'] ?? $this->host;
                $this->db_name = $config['DB_NAME'] ?? $this->db_name;
                $this->username = $config['DB_USER'] ?? $this->username;
                $this->password = $config['DB_PASS'] ?? $this->password;
                $this->port = $config['DB_PORT'] ?? $this->port;
            }
        } else {
            // 2. Si no hay archivo pero la clase tiene credenciales editadas directamente, auto-blindar creando config.prod.php
            if ($this->username !== 'root' || $this->password !== '' || $this->db_name !== 'khalessi_erp') {
                self::guardarArchivoConfig([
                    'DB_HOST' => $this->host,
                    'DB_NAME' => $this->db_name,
                    'DB_USER' => $this->username,
                    'DB_PASS' => $this->password,
                    'DB_PORT' => $this->port
                ]);
            } else {
                // 3. Variables de entorno (Docker, VPS, Hosting Cloud)
                if (getenv('DB_HOST')) $this->host = getenv('DB_HOST');
                if (getenv('DB_NAME')) $this->db_name = getenv('DB_NAME');
                if (getenv('DB_USER')) $this->username = getenv('DB_USER');
                if (getenv('DB_PASS')) $this->password = getenv('DB_PASS');
                if (getenv('DB_PORT')) $this->port = getenv('DB_PORT');
            }
        }
    }

    public function getConfigData() {
        $configFile = __DIR__ . '/config.prod.php';
        return [
            'host' => $this->host,
            'db_name' => $this->db_name,
            'username' => $this->username,
            'has_password' => !empty($this->password),
            'port' => $this->port,
            'is_protected' => file_exists($configFile) && filesize($configFile) > 10
        ];
    }

    public static function guardarArchivoConfig($datos) {
        $configFile = __DIR__ . '/config.prod.php';
        $backupFile = __DIR__ . '/config.prod.php.bak';
        $rootBackup = dirname(__DIR__) . '/config.db.backup.php';

        $host = addcslashes($datos['DB_HOST'] ?? 'localhost', "'\\");
        $dbName = addcslashes($datos['DB_NAME'] ?? 'khalessi_erp', "'\\");
        $user = addcslashes($datos['DB_USER'] ?? 'root', "'\\");
        $pass = addcslashes($datos['DB_PASS'] ?? '', "'\\");
        $port = addcslashes($datos['DB_PORT'] ?? '3306', "'\\");

        $code = "<?php\n" .
            "// api/config.prod.php - Configuración de Base de Datos Blindada\n" .
            "// Este archivo es IGNORADO por Git y NUNCA se sobreescribe ni se borra en las actualizaciones.\n" .
            "return [\n" .
            "    'DB_HOST' => '{$host}',\n" .
            "    'DB_NAME' => '{$dbName}',\n" .
            "    'DB_USER' => '{$user}',\n" .
            "    'DB_PASS' => '{$pass}',\n" .
            "    'DB_PORT' => '{$port}'\n" .
            "];\n";

        $res1 = @file_put_contents($configFile, $code);
        $res2 = @file_put_contents($backupFile, $code);
        $res3 = @file_put_contents($rootBackup, $code);

        return ($res1 !== false);
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            // Sincronizar zona horaria de MySQL con la del negocio (Perú UTC-5)
            try {
                $this->conn->exec("SET time_zone = '-05:00'");
            } catch (Exception $tzEx) {}
        } catch(PDOException $exception) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(["status" => "error", "message" => "Error de conexión: " . $exception->getMessage()]);
            exit;
        }

        return $this->conn;
    }
}
?>
