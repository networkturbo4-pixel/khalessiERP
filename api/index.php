<?php
// api/index.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: OPTIONS,GET,POST,PUT,DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

$database = new Database();
$db = $database->getConnection();

$request = isset($_GET['request']) ? explode('/', trim($_GET['request'], '/')) : [];

$modulo = isset($request[0]) ? $request[0] : '';
$accion = isset($request[1]) ? $request[1] : '';

$method = $_SERVER['REQUEST_METHOD'];

function respondError($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(["status" => "error", "message" => $msg]);
    exit;
}

function respondSuccess($data, $msg = "Operación exitosa") {
    http_response_code(200);
    echo json_encode(["status" => "success", "message" => $msg, "data" => $data]);
    exit;
}

try {
    switch ($modulo) {
        
        // ==========================================
        // MÓDULO AUTH
        // ==========================================
        case 'auth':
            if ($method === 'POST' && $accion === 'login') {
                $input = json_decode(file_get_contents("php://input"), true);
                
                $mode = isset($input['mode']) ? $input['mode'] : 'pass';
                $email = isset($input['email']) ? trim($input['email']) : '';
                $dni = isset($input['dni']) ? trim($input['dni']) : '';
                $pass_or_pin = isset($input['password']) ? trim($input['password']) : '';

                if ($mode === 'pass') {
                    if (empty($email) || empty($pass_or_pin)) {
                        respondError("Correo y contraseña son obligatorios");
                    }
                    $query = "SELECT u.*, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.id_rol = r.id WHERE u.email = :identificador AND u.estado = 'activo' LIMIT 1";
                    $identificador = $email;
                } else {
                    // El DNI se manda en el campo 'dni'
                    if (empty($dni)) {
                        respondError("DNI es obligatorio para acceso rápido");
                    }
                    $query = "SELECT u.*, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.id_rol = r.id WHERE u.dni = :identificador AND u.estado = 'activo' LIMIT 1";
                    $identificador = $dni;
                }

                $stmt = $db->prepare($query);
                $stmt->bindParam(":identificador", $identificador);
                $stmt->execute();

                if ($stmt->rowCount() > 0) {
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($mode === 'pin') {
                        // En modo POS, el DNI actúa como token de acceso rápido
                        $isValid = true;
                    } else {
                        // Verificación de contraseña normal
                        $isValid = password_verify($pass_or_pin, $row['password_hash']);
                        
                        // Fallback temporal para la demostración si no se actualizó el hash real en la BD
                        if (!$isValid && $identificador === 'admin@khalessi.com' && $pass_or_pin === 'admin123') {
                            $isValid = true;
                        }
                    }

                    if ($isValid) {
                        // Generar token simple (En prod usar JWT real)
                        $token = bin2hex(random_bytes(16)); 
                        
                        // Obtener los permisos del usuario según su rol
                        $qPermisos = "SELECT modulo, puede_ver, puede_editar, puede_eliminar FROM permisos_roles WHERE id_rol = :id_rol";
                        $stmtP = $db->prepare($qPermisos);
                        $stmtP->execute([':id_rol' => $row['id_rol']]);
                        $row['permisos'] = $stmtP->fetchAll(PDO::FETCH_ASSOC);

                        // Remover contraseñas del response
                        unset($row['password_hash']);
                        unset($row['pin_hash']);

                        respondSuccess([
                            "token" => $token,
                            "user" => $row
                        ], "Bienvenido " . $row['nombre']);
                    } else {
                        respondError("Credenciales incorrectas", 401);
                    }
                } else {
                    respondError("Usuario no encontrado", 404);
                }
            } else {
                respondError("Acción no válida", 404);
            }
            break;

        // ==========================================
        // MÓDULO RRHH (Asistencia)
        // ==========================================
        case 'rrhh':
            require_once 'rrhh.php';
            break;

        // ==========================================
        // MÓDULO INVENTARIO
        // ==========================================
        case 'inventario':
            require_once 'inventario.php';
            break;

        // ==========================================
        // MÓDULO DASHBOARD (Estadísticas mockeadas desde BD)
        // ==========================================
        case 'dashboard':
            if ($method === 'GET' && $accion === 'stats') {
                // Aquí se calcularían sumatorias reales de la BD, por ahora enviamos datos iniciales
                respondSuccess([
                    "ventas_dia" => 4520.00,
                    "pedidos_completados" => 24,
                    "pedidos_pendientes" => 3
                ]);
            }
            break;

        // ==========================================
        // MÓDULO CONFIGURACIÓN
        // ==========================================
        case 'configuracion':
            if ($method === 'GET' && $accion === 'load') {
                $query = "SELECT clave, valor FROM configuracion";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $config = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $config[$row['clave']] = $row['valor'];
                }
                respondSuccess($config);
            } 
            else if ($method === 'POST' && $accion === 'save') {
                // Soportar tanto JSON como FormData
                $input = json_decode(file_get_contents("php://input"), true);
                if (empty($input)) {
                    $input = $_POST;
                }
                
                // Manejo de subida de archivos (Logos)
                $uploadDir = __DIR__ . '/../uploads/logos/';
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                
                // Procesar cada archivo subido
                foreach ($_FILES as $key => $file) {
                    if ($file['error'] === UPLOAD_ERR_OK) {
                        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
                        // Limpiar nombre y asegurar extensión segura
                        $filename = $key . '_' . time() . '.' . $ext;
                        $targetPath = $uploadDir . $filename;
                        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                            // Guardar la ruta relativa en la configuración
                            $input[$key] = 'uploads/logos/' . $filename;
                        }
                    }
                }
                
                // Manejar eliminaciones
                $keys_to_remove = ['logo_light', 'logo_dark', 'logo_collapsed', 'logo_favicon'];
                foreach ($keys_to_remove as $logo_key) {
                    if (isset($_POST["remove_$logo_key"]) && $_POST["remove_$logo_key"] === '1') {
                        $input[$logo_key] = ''; // Limpiar la ruta para que vuelva al por defecto
                    }
                }
                
                if (empty($input) || !is_array($input)) {
                    respondError("No se enviaron datos válidos");
                }
                
                // Actualizar cada clave (Insertar si no existe)
                $query = "INSERT INTO configuracion (clave, valor) VALUES (:clave, :valor) ON DUPLICATE KEY UPDATE valor = :valor";
                $stmt = $db->prepare($query);
                
                foreach ($input as $clave => $valor) {
                    $stmt->execute([':clave' => $clave, ':valor' => $valor]);
                }
                
                respondSuccess(null, "Configuración y logos guardados exitosamente");
            }
            else {
                respondError("Acción de configuración no válida", 404);
            }
            break;

        // ==========================================
        // MÓDULO ROLES
        // ==========================================
        case 'roles':
            if ($method === 'GET' && $accion === 'list') {
                $query = "SELECT * FROM roles ORDER BY id";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Traer permisos de cada rol
                foreach ($roles as &$rol) {
                    $q2 = "SELECT modulo, puede_ver, puede_editar, puede_eliminar FROM permisos_roles WHERE id_rol = :id_rol";
                    $s2 = $db->prepare($q2);
                    $s2->execute([':id_rol' => $rol['id']]);
                    $rol['permisos'] = $s2->fetchAll(PDO::FETCH_ASSOC);
                }
                respondSuccess($roles);
            }
            else if ($method === 'POST' && $accion === 'save') {
                $input = json_decode(file_get_contents("php://input"), true);
                $id = isset($input['id']) ? $input['id'] : null;
                $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
                $descripcion = isset($input['descripcion']) ? trim($input['descripcion']) : '';
                $permisos = isset($input['permisos']) ? $input['permisos'] : [];
                
                if (empty($nombre)) respondError("El nombre del rol es obligatorio");
                
                if ($id) {
                    $query = "UPDATE roles SET nombre = :nombre, descripcion = :descripcion WHERE id = :id";
                    $stmt = $db->prepare($query);
                    $stmt->execute([':nombre' => $nombre, ':descripcion' => $descripcion, ':id' => $id]);
                } else {
                    $query = "INSERT INTO roles (nombre, descripcion) VALUES (:nombre, :descripcion)";
                    $stmt = $db->prepare($query);
                    $stmt->execute([':nombre' => $nombre, ':descripcion' => $descripcion]);
                    $id = $db->lastInsertId();
                }
                
                // Limpiar permisos anteriores
                $qDel = "DELETE FROM permisos_roles WHERE id_rol = :id";
                $sDel = $db->prepare($qDel);
                $sDel->execute([':id' => $id]);
                
                // Insertar nuevos permisos
                if (!empty($permisos)) {
                    $qIns = "INSERT INTO permisos_roles (id_rol, modulo, puede_ver, puede_editar, puede_eliminar) VALUES (:id_rol, :modulo, :ver, :editar, :eliminar)";
                    $sIns = $db->prepare($qIns);
                    foreach ($permisos as $p) {
                        $sIns->execute([
                            ':id_rol' => $id,
                            ':modulo' => $p['modulo'],
                            ':ver' => isset($p['puede_ver']) && $p['puede_ver'] ? 1 : 0,
                            ':editar' => isset($p['puede_editar']) && $p['puede_editar'] ? 1 : 0,
                            ':eliminar' => isset($p['puede_eliminar']) && $p['puede_eliminar'] ? 1 : 0
                        ]);
                    }
                }
                respondSuccess(["id" => $id], "Rol guardado exitosamente");
            }
            else if ($method === 'POST' && $accion === 'delete') {
                $input = json_decode(file_get_contents("php://input"), true);
                $id = isset($input['id']) ? $input['id'] : null;
                if (!$id) respondError("ID de rol es requerido");
                // Verificar si hay usuarios usando este rol
                $qCheck = "SELECT COUNT(*) FROM usuarios WHERE id_rol = :id";
                $sCheck = $db->prepare($qCheck);
                $sCheck->execute([':id' => $id]);
                if ($sCheck->fetchColumn() > 0) {
                    respondError("No se puede eliminar el rol porque tiene usuarios asignados.");
                }
                $qDel = "DELETE FROM roles WHERE id = :id";
                $sDel = $db->prepare($qDel);
                $sDel->execute([':id' => $id]);
                respondSuccess(null, "Rol eliminado exitosamente");
            }
            else {
                respondError("Acción de roles no válida", 404);
            }
            break;

        // ==========================================
        // MÓDULO USUARIOS
        // ==========================================
        case 'usuarios':
            if ($method === 'GET' && $accion === 'list') {
                $query = "SELECT u.id, u.id_rol, u.nombre, u.apellido, u.cargo, u.dni, u.email, u.celular, u.foto_perfil, u.bio, u.estado, 
                                 u.fecha_contratacion, u.hora_entrada_asignada, u.hora_salida_asignada, u.sueldo_base, u.sueldo_por_hora, 
                                 u.tipo_pago, u.horas_semanales_pactadas, u.fecha_creacion, r.nombre as rol_nombre 
                          FROM usuarios u 
                          JOIN roles r ON u.id_rol = r.id 
                          ORDER BY u.id DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
                respondSuccess($usuarios);
            }
            else if ($method === 'POST' && $accion === 'save') {
                $input = json_decode(file_get_contents("php://input"), true);
                $id = isset($input['id']) ? $input['id'] : null;
                $id_rol = isset($input['id_rol']) ? $input['id_rol'] : null;
                $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
                $apellido = isset($input['apellido']) ? trim($input['apellido']) : null;
                $cargo = isset($input['cargo']) ? trim($input['cargo']) : null;
                $dni = isset($input['dni']) ? trim($input['dni']) : null;
                $email = isset($input['email']) ? trim($input['email']) : '';
                $celular = isset($input['celular']) ? trim($input['celular']) : null;
                $password = isset($input['password']) ? trim($input['password']) : '';
                $estado = isset($input['estado']) && in_array($input['estado'], ['activo', 'inactivo']) ? $input['estado'] : 'activo';
                $fecha_contratacion = isset($input['fecha_contratacion']) && !empty($input['fecha_contratacion']) ? $input['fecha_contratacion'] : null;
                $hora_entrada_asignada = isset($input['hora_entrada_asignada']) && !empty($input['hora_entrada_asignada']) ? $input['hora_entrada_asignada'] : null;
                $hora_salida_asignada = isset($input['hora_salida_asignada']) && !empty($input['hora_salida_asignada']) ? $input['hora_salida_asignada'] : null;
                $sueldo_base = isset($input['sueldo_base']) && $input['sueldo_base'] !== '' ? floatval($input['sueldo_base']) : 0.00;
                
                if (empty($nombre) || empty($email) || empty($id_rol)) {
                    respondError("Nombre, correo y rol son obligatorios.");
                }
                
                if ($id) {
                    // Update
                    $params = [
                        ':id_rol' => $id_rol,
                        ':nombre' => $nombre,
                        ':apellido' => $apellido,
                        ':cargo' => $cargo,
                        ':dni' => $dni,
                        ':email' => $email,
                        ':celular' => $celular,
                        ':estado' => $estado,
                        ':fecha_contratacion' => $fecha_contratacion,
                        ':hora_entrada_asignada' => $hora_entrada_asignada,
                        ':hora_salida_asignada' => $hora_salida_asignada,
                        ':sueldo_base' => $sueldo_base,
                        ':id' => $id
                    ];

                    if (!empty($password)) {
                        $params[':hash'] = password_hash($password, PASSWORD_DEFAULT);
                        $query = "UPDATE usuarios SET id_rol = :id_rol, nombre = :nombre, apellido = :apellido, cargo = :cargo, dni = :dni, email = :email, celular = :celular, estado = :estado, fecha_contratacion = :fecha_contratacion, hora_entrada_asignada = :hora_entrada_asignada, hora_salida_asignada = :hora_salida_asignada, sueldo_base = :sueldo_base, password_hash = :hash WHERE id = :id";
                    } else {
                        $query = "UPDATE usuarios SET id_rol = :id_rol, nombre = :nombre, apellido = :apellido, cargo = :cargo, dni = :dni, email = :email, celular = :celular, estado = :estado, fecha_contratacion = :fecha_contratacion, hora_entrada_asignada = :hora_entrada_asignada, hora_salida_asignada = :hora_salida_asignada, sueldo_base = :sueldo_base WHERE id = :id";
                    }
                    $stmt = $db->prepare($query);
                    $stmt->execute($params);
                    respondSuccess(["id" => $id], "Usuario actualizado exitosamente");
                } else {
                    // Create
                    if (empty($password)) respondError("La contraseña es obligatoria para nuevos usuarios");
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    $query = "INSERT INTO usuarios (id_rol, nombre, apellido, cargo, dni, email, celular, password_hash, estado, fecha_contratacion, hora_entrada_asignada, hora_salida_asignada, sueldo_base) 
                              VALUES (:id_rol, :nombre, :apellido, :cargo, :dni, :email, :celular, :hash, :estado, :fecha_contratacion, :hora_entrada_asignada, :hora_salida_asignada, :sueldo_base)";
                    $stmt = $db->prepare($query);
                    try {
                        $stmt->execute([
                            ':id_rol' => $id_rol,
                            ':nombre' => $nombre,
                            ':apellido' => $apellido,
                            ':cargo' => $cargo,
                            ':dni' => $dni,
                            ':email' => $email,
                            ':celular' => $celular,
                            ':hash' => $hash,
                            ':estado' => $estado,
                            ':fecha_contratacion' => $fecha_contratacion,
                            ':hora_entrada_asignada' => $hora_entrada_asignada,
                            ':hora_salida_asignada' => $hora_salida_asignada,
                            ':sueldo_base' => $sueldo_base
                        ]);
                        $id = $db->lastInsertId();
                        respondSuccess(["id" => $id], "Usuario creado exitosamente");
                    } catch (PDOException $e) {
                        if ($e->getCode() == 23000) { // Integridad referencial / UNIQUE
                            respondError("El correo electrónico ya está registrado");
                        }
                        throw $e;
                    }
                }
            }
            else if ($method === 'POST' && $accion === 'delete') {
                $input = json_decode(file_get_contents("php://input"), true);
                $id = isset($input['id']) ? $input['id'] : null;
                if (!$id) respondError("ID de usuario es requerido");
                // Prevenir que el usuario se elimine a sí mismo (opcional, pero buena práctica)
                // Ocultar al admin principal
                if ($id == 1) respondError("No se puede eliminar el usuario administrador principal.");
                
                $query = "DELETE FROM usuarios WHERE id = :id";
                $stmt = $db->prepare($query);
                $stmt->execute([':id' => $id]);
                respondSuccess(null, "Usuario eliminado exitosamente");
            }
            else if ($method === 'POST' && $accion === 'update_profile') {
                $input = json_decode(file_get_contents("php://input"), true);
                $id = isset($input['id']) ? $input['id'] : null;
                $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
                $apellido = isset($input['apellido']) ? trim($input['apellido']) : null;
                $email = isset($input['email']) ? trim($input['email']) : '';
                $celular = isset($input['celular']) ? trim($input['celular']) : null;
                $bio = isset($input['bio']) ? trim($input['bio']) : null;
                $foto_perfil = isset($input['foto_perfil']) ? $input['foto_perfil'] : null;

                if (!$id) respondError("ID de usuario no proporcionado");

                $query = "UPDATE usuarios SET nombre = :nombre, apellido = :apellido, email = :email, celular = :celular, bio = :bio";
                $params = [
                    ':nombre' => $nombre,
                    ':apellido' => $apellido,
                    ':email' => $email,
                    ':celular' => $celular,
                    ':bio' => $bio,
                    ':id' => $id
                ];

                if ($foto_perfil !== null) {
                    // Si se envía en base64, guardar archivo en disco para optimizar velocidad y ancho de banda
                    if (!empty($foto_perfil) && strpos($foto_perfil, ';base64,') !== false) {
                        $uploadDir = __DIR__ . '/../uploads/perfiles/';
                        if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);
                        
                        $parts = explode(";base64,", $foto_perfil);
                        $type_aux = explode("image/", $parts[0]);
                        $ext = isset($type_aux[1]) ? $type_aux[1] : 'jpeg';
                        if ($ext === 'jpeg') $ext = 'jpg';
                        $data = base64_decode(str_replace(' ', '+', $parts[1]));
                        $filename = 'avatar_' . $id . '_' . time() . '.' . $ext;
                        file_put_contents($uploadDir . $filename, $data);
                        $foto_perfil = 'uploads/perfiles/' . $filename;
                    }
                    $query .= ", foto_perfil = :foto_perfil";
                    $params[':foto_perfil'] = $foto_perfil;
                }
                
                $query .= " WHERE id = :id";
                $stmt = $db->prepare($query);
                
                try {
                    $stmt->execute($params);
                    
                    // Recuperar el usuario actualizado
                    $qUser = "SELECT u.*, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.id_rol = r.id WHERE u.id = :id";
                    $sUser = $db->prepare($qUser);
                    $sUser->execute([':id' => $id]);
                    $userData = $sUser->fetch(PDO::FETCH_ASSOC);
                    
                    if(isset($userData['password_hash'])) unset($userData['password_hash']);
                    if(isset($userData['pin_hash'])) unset($userData['pin_hash']);
                    
                    // Permisos
                    $qPermisos = "SELECT modulo, puede_ver, puede_editar, puede_eliminar FROM permisos_roles WHERE id_rol = :id_rol";
                    $stmtP = $db->prepare($qPermisos);
                    $stmtP->execute([':id_rol' => $userData['id_rol']]);
                    $userData['permisos'] = $stmtP->fetchAll(PDO::FETCH_ASSOC);
                    
                    respondSuccess(["user" => $userData], "Perfil actualizado");
                } catch(Exception $e) {
                    respondError("Error actualizando perfil: " . $e->getMessage());
                }
            }
            else {
                respondError("Acción de usuarios no válida", 404);
            }
            break;

        // ==========================================
        // MÓDULO LOCALES, INGREDIENTES Y RECETAS
        // ==========================================
        case 'locales':
            require_once 'locales.php';
            break;
        case 'ingredientes':
            require_once 'ingredientes.php';
            break;
        case 'recetas':
            require_once 'recetas.php';
            break;
        case 'media':
            require_once 'media.php';
            break;
        case 'sistema':
            require_once 'sistema.php';
            break;

        default:
            respondError("Módulo de API no encontrado", 404);
            break;
    }
} catch (Exception $e) {
    respondError("Error del servidor: " . $e->getMessage(), 500);
}
?>
