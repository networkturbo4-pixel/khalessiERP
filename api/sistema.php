<?php
// api/sistema.php - Actualizador 1-Click desde GitHub y Migrador de Base de Datos

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/migrador.php';

$repoUrl = "https://github.com/networkturbo4-pixel/khalessiERP.git";
$repoOwner = "networkturbo4-pixel";
$repoName = "khalessiERP";
$baseDir = realpath(__DIR__ . '/..');

/**
 * Comprueba si shell_exec está disponible y permitido
 */
function isShellExecAvailable() {
    if (!function_exists('shell_exec')) return false;
    $disabled = explode(',', ini_get('disable_functions'));
    $disabled = array_map('trim', $disabled);
    return !in_array('shell_exec', $disabled);
}

/**
 * Ejecuta comandos Git de forma compatible con Windows y Linux
 */
function runGitCmd($baseDir, $gitCmd) {
    if (!isShellExecAvailable()) {
        return null;
    }
    $isWin = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    $prefix = $isWin ? "cd /d \"$baseDir\" && " : "cd \"$baseDir\" && ";
    return @shell_exec($prefix . $gitCmd . " 2>&1");
}

/**
 * Limpia y valida la salida de comandos Git.
 * Si contiene errores fatales o advertencias críticas, retorna null.
 */
function cleanGitOutput($str) {
    if ($str === null) return null;
    $str = trim($str);
    if ($str === '') return null;
    if (stripos($str, 'fatal:') !== false || stripos($str, 'error:') !== false) {
        return null;
    }
    return $str;
}

/**
 * Analiza el estado del entorno Git en el servidor
 */
function getGitEnvironment($baseDir) {
    $hasShell = isShellExecAvailable();
    if (!$hasShell) {
        return [
            'has_shell_exec' => false,
            'git_installed' => false,
            'is_git_repo' => false,
            'git_version' => null
        ];
    }

    $gitVerOutput = runGitCmd($baseDir, "git --version");
    $cleanVer = cleanGitOutput($gitVerOutput);
    $gitInstalled = !empty($cleanVer) && stripos($cleanVer, 'git version') !== false;

    if (!$gitInstalled) {
        return [
            'has_shell_exec' => true,
            'git_installed' => false,
            'is_git_repo' => false,
            'git_version' => null
        ];
    }

    // Configurar safe.directory preventivamente en servidores Linux/cPanel
    runGitCmd($baseDir, "git config --global --add safe.directory \"$baseDir\"");

    // Verificar si es un repositorio Git válido
    $isWorkTree = cleanGitOutput(runGitCmd($baseDir, "git rev-parse --is-inside-work-tree"));
    $hasGitDir = is_dir($baseDir . '/.git') || file_exists($baseDir . '/.git');
    $isRepo = ($isWorkTree === 'true') && $hasGitDir;

    return [
        'has_shell_exec' => true,
        'git_installed' => true,
        'is_git_repo' => $isRepo,
        'git_version' => $cleanVer
    ];
}

/**
 * Obtiene el último commit oficial de GitHub usando la API pública
 */
function getRemoteLatestCommit($repoOwner = 'networkturbo4-pixel', $repoName = 'khalessiERP') {
    $url = "https://api.github.com/repos/{$repoOwner}/{$repoName}/commits/main";
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: KhalessiERP-System-Updater\r\nAccept: application/vnd.github.v3+json\r\n",
            'timeout' => 8
        ]
    ];
    $context = stream_context_create($opts);
    $res = @file_get_contents($url, false, $context);
    
    if (!$res && function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'KhalessiERP-System-Updater');
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
    }

    if ($res) {
        $json = json_decode($res, true);
        if (isset($json['sha'])) {
            return [
                'sha' => $json['sha'],
                'short_sha' => substr($json['sha'], 0, 7),
                'message' => $json['commit']['message'] ?? '',
                'date' => $json['commit']['committer']['date'] ?? ''
            ];
        }
    }

    return null;
}

/**
 * Respalda y preserva las credenciales de producción antes de cualquier operación Git o ZIP
 */
function asegurarRespaldoCredencialesBD($baseDir) {
    $configFile = $baseDir . '/api/config.prod.php';
    $backupFile = $baseDir . '/api/config.prod.php.bak';
    $rootBackup = $baseDir . '/config.db.backup.php';

    // 1. Si config.prod.php ya existe, asegurar copias de respaldo redundantes
    if (file_exists($configFile) && filesize($configFile) > 10) {
        @copy($configFile, $backupFile);
        @copy($configFile, $rootBackup);
        return true;
    }

    // 2. Si config.prod.php no existe pero existe el respaldo, restaurarlo
    if (file_exists($backupFile) && filesize($backupFile) > 10) {
        @copy($backupFile, $configFile);
        return true;
    }
    if (file_exists($rootBackup) && filesize($rootBackup) > 10) {
        @copy($rootBackup, $configFile);
        return true;
    }

    // 3. Si no existe config.prod.php, extraer las credenciales actuales directamente de api/db.php
    $dbPhp = $baseDir . '/api/db.php';
    if (file_exists($dbPhp)) {
        $content = file_get_contents($dbPhp);
        $host = 'localhost';
        $dbName = 'khalessi_erp';
        $user = 'root';
        $pass = '';
        $port = '3306';

        if (preg_match('/\$host\s*=\s*["\']([^"\']+)["\']/', $content, $m)) $host = $m[1];
        if (preg_match('/\$db_name\s*=\s*["\']([^"\']+)["\']/', $content, $m)) $dbName = $m[1];
        if (preg_match('/\$username\s*=\s*["\']([^"\']+)["\']/', $content, $m)) $user = $m[1];
        if (preg_match('/\$password\s*=\s*["\']([^"\']*)["\']/', $content, $m)) $pass = $m[1];
        if (preg_match('/\$port\s*=\s*["\']([^"\']+)["\']/', $content, $m)) $port = $m[1];

        Database::guardarArchivoConfig([
            'DB_HOST' => $host,
            'DB_NAME' => $dbName,
            'DB_USER' => $user,
            'DB_PASS' => $pass,
            'DB_PORT' => $port
        ]);
        return true;
    }

    return false;
}

/**
 * Verifica y restaura las credenciales después de una actualización
 */
function asegurarRestauracionCredencialesBD($baseDir) {
    $configFile = $baseDir . '/api/config.prod.php';
    $backupFile = $baseDir . '/api/config.prod.php.bak';
    $rootBackup = $baseDir . '/config.db.backup.php';

    if (!file_exists($configFile) || filesize($configFile) < 10) {
        if (file_exists($backupFile) && filesize($backupFile) > 10) {
            @copy($backupFile, $configFile);
        } else if (file_exists($rootBackup) && filesize($rootBackup) > 10) {
            @copy($rootBackup, $configFile);
        }
    }
}

/**
 * Inicializa y vincula el repositorio oficial de GitHub de manera segura en un directorio existente
 */
function vincularGitRepo($baseDir, $repoUrl, $db) {
    $logs = [];

    // Blindaje previo: asegurar que las credenciales de BD queden protegidas antes de tocar git
    asegurarRespaldoCredencialesBD($baseDir);

    // 1. Configurar safe.directory para evitar problemas de permisos de usuario en Linux / cPanel
    runGitCmd($baseDir, "git config --global --add safe.directory \"$baseDir\"");
    runGitCmd($baseDir, "git config --global --add safe.directory \"*\"");

    // 2. Inicializar repositorio si no existe .git
    if (!is_dir($baseDir . '/.git')) {
        $initOut = runGitCmd($baseDir, "git init");
        $logs[] = "Inicializando Git local:\n" . ($initOut ?: 'git init OK');
    }

    // 3. Configurar remoto origin
    $remotes = runGitCmd($baseDir, "git remote");
    if ($remotes && stripos($remotes, 'origin') !== false) {
        runGitCmd($baseDir, "git remote set-url origin " . escapeshellarg($repoUrl));
        $logs[] = "Actualizado remoto origin -> $repoUrl";
    } else {
        runGitCmd($baseDir, "git remote add origin " . escapeshellarg($repoUrl));
        $logs[] = "Configurado remoto origin -> $repoUrl";
    }

    // 4. Fetch desde origin main
    $fetchOut = runGitCmd($baseDir, "git fetch origin main");
    $logs[] = "Descargando metadata de origin/main:\n" . ($fetchOut ?: 'Fetch OK');

    // 5. Configurar rama principal main
    runGitCmd($baseDir, "git branch -M main");

    // 6. Resetear índice a origin/main (mantiene archivos locales intactos)
    $resetOut = runGitCmd($baseDir, "git reset origin/main");
    $logs[] = "Sincronizando índice a origin/main:\n" . ($resetOut ?: 'Reset OK');

    // 7. Asociar rama local con origin/main
    runGitCmd($baseDir, "git branch --set-upstream-to=origin/main main");

    // 8. Asegurar checkout limpio sin alterar config privada ni uploads
    runGitCmd($baseDir, "git checkout -- .");
    asegurarRestauracionCredencialesBD($baseDir);

    // 9. Ejecutar migraciones de base de datos pendientes
    $migrador = new Migrador($db);
    $resMigraciones = $migrador->ejecutarPendientes();
    $totalNuevas = count($resMigraciones['aplicadas_ahora']);
    $logs[] = "Migraciones BD: Se aplicaron $totalNuevas migraciones seguras.";

    // 10. Limpiar OPcache
    if (function_exists('opcache_reset')) {
        @opcache_reset();
    }

    $commitFinal = cleanGitOutput(runGitCmd($baseDir, "git rev-parse --short HEAD"));

    return [
        'success' => !empty($commitFinal),
        'nuevo_commit' => $commitFinal ?: 'main',
        'logs' => implode("\n\n", $logs),
        'migraciones' => $resMigraciones
    ];
}

/**
 * Fallback: Actualiza el código descargando el ZIP oficial desde GitHub (cuando Git CLI no está disponible)
 */
function actualizarViaZip($baseDir, $db, $repoOwner = 'networkturbo4-pixel', $repoName = 'khalessiERP') {
    $logs = [];
    if (!class_exists('ZipArchive')) {
        throw new Exception("La extensión PHP ZipArchive no está habilitada en este servidor.");
    }

    // Blindaje previo: asegurar respaldo de credenciales antes de descargar/extraer
    asegurarRespaldoCredencialesBD($baseDir);

    $zipUrl = "https://github.com/{$repoOwner}/{$repoName}/archive/refs/heads/main.zip";
    $tempZip = sys_get_temp_dir() . '/khalessi_update_' . time() . '.zip';

    $logs[] = "Descargando paquete ZIP de actualización desde GitHub...";
    
    // Descarga con timeout adecuado
    $fp = fopen($tempZip, 'w+');
    if (!$fp) {
        throw new Exception("No se pudo crear archivo temporal de descarga.");
    }

    $ch = curl_init($zipUrl);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'KhalessiERP-ZIP-Updater');
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);

    if ($httpCode !== 200 || !file_exists($tempZip) || filesize($tempZip) < 1000) {
        @unlink($tempZip);
        throw new Exception("Error al descargar paquete de GitHub (HTTP $httpCode).");
    }

    $logs[] = "Extrayendo archivos y actualizando sistema...";
    $zip = new ZipArchive();
    if ($zip->open($tempZip) !== TRUE) {
        @unlink($tempZip);
        throw new Exception("No se pudo abrir el archivo ZIP descargado.");
    }

    $prefix = "{$repoName}-main/";
    $archivosActualizados = 0;

    // Rutas protegidas que NUNCA deben sobrescribirse
    $rutasProtegidas = [
        'api/config.prod.php',
        '.env',
        'uploads/'
    ];

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);
        if (strpos($filename, $prefix) === 0) {
            $relativePath = substr($filename, strlen($prefix));
            if (empty($relativePath)) continue;

            // Verificar si es una ruta protegida
            $esProtegido = false;
            foreach ($rutasProtegidas as $prot) {
                if ($relativePath === $prot || strpos($relativePath, $prot) === 0) {
                    $esProtegido = true;
                    break;
                }
            }
            if ($esProtegido) continue;

            $targetPath = $baseDir . '/' . $relativePath;
            if (substr($filename, -1) === '/') {
                if (!is_dir($targetPath)) @mkdir($targetPath, 0755, true);
            } else {
                $targetDir = dirname($targetPath);
                if (!is_dir($targetDir)) @mkdir($targetDir, 0755, true);
                
                $content = $zip->getFromIndex($i);
                if ($content !== false) {
                    file_put_contents($targetPath, $content);
                    $archivosActualizados++;
                }
            }
        }
    }
    $zip->close();
    @unlink($tempZip);

    $logs[] = "Archivos actualizados: $archivosActualizados ficheros procesados.";

    // Guardar versión en archivo local
    $remoteInfo = getRemoteLatestCommit($repoOwner, $repoName);
    $versionData = [
        'version' => $remoteInfo ? $remoteInfo['short_sha'] : 'ZIP-' . date('YmdHi'),
        'fecha' => date('Y-m-d H:i:s'),
        'metodo' => 'ZIP Directo'
    ];
    file_put_contents($baseDir . '/version.json', json_encode($versionData, JSON_PRETTY_PRINT));

    // Ejecutar migraciones de base de datos
    $migrador = new Migrador($db);
    $resMigraciones = $migrador->ejecutarPendientes();
    $totalNuevas = count($resMigraciones['aplicadas_ahora']);
    $logs[] = "Migraciones BD: Se ejecutaron $totalNuevas migraciones nuevas de manera segura.";

    if (function_exists('opcache_reset')) {
        @opcache_reset();
    }

    return [
        'nuevo_commit' => $versionData['version'],
        'logs' => implode("\n\n", $logs),
        'migraciones' => $resMigraciones
    ];
}

// ========================================================
// CONTROLADOR DE ACCIONES
// ========================================================

if ($method === 'GET' && $accion === 'git_info') {
    $env = getGitEnvironment($baseDir);

    $commitHash = null;
    $commitMsg = null;
    $commitDate = null;
    $branch = null;
    $remoteUrl = $repoUrl;

    if ($env['is_git_repo']) {
        $commitHash = cleanGitOutput(runGitCmd($baseDir, "git rev-parse --short HEAD"));
        $commitMsg = cleanGitOutput(runGitCmd($baseDir, "git log -1 --pretty=%B"));
        $commitDate = cleanGitOutput(runGitCmd($baseDir, "git log -1 --format=%cd --date=relative"));
        $branch = cleanGitOutput(runGitCmd($baseDir, "git branch --show-current")) ?: 'main';
        $rem = cleanGitOutput(runGitCmd($baseDir, "git config --get remote.origin.url"));
        if (!empty($rem)) $remoteUrl = $rem;
    } else {
        // Si hay un archivo version.json previo (actualización ZIP)
        $verFile = $baseDir . '/version.json';
        if (file_exists($verFile)) {
            $verData = json_decode(file_get_contents($verFile), true);
            $commitHash = $verData['version'] ?? null;
            $commitMsg = 'Actualizado vía ' . ($verData['metodo'] ?? 'ZIP');
            $commitDate = $verData['fecha'] ?? null;
        }
    }

    // Obtener estado de migraciones
    $migrador = new Migrador($db);
    $migraciones = $migrador->getMigracionesEjecutadas();

    respondSuccess([
        'is_git_repo' => $env['is_git_repo'],
        'git_installed' => $env['git_installed'],
        'has_shell_exec' => $env['has_shell_exec'],
        'commit_hash' => $commitHash ?: 'Sin vincular',
        'commit_mensaje' => $commitMsg ?: ($env['is_git_repo'] ? 'Sin commits' : 'Carpeta .git no presente en el servidor'),
        'commit_fecha' => $commitDate ?: 'N/A',
        'branch' => $branch ?: ($env['is_git_repo'] ? 'main' : 'No vinculada'),
        'remote_url' => $remoteUrl,
        'total_migraciones' => count($migraciones),
        'migraciones' => $migraciones
    ]);
}
else if ($method === 'POST' && $accion === 'check_update') {
    $env = getGitEnvironment($baseDir);

    // Contar migraciones pendientes
    $migrador = new Migrador($db);
    $dir = __DIR__ . '/migrations';
    $archivos = is_dir($dir) ? glob($dir . '/*.php') : [];
    $ejecutadasRaw = $db->query("SELECT version FROM sistema_migraciones")->fetchAll(PDO::FETCH_COLUMN);
    $pendientesBd = max(0, count($archivos) - count($ejecutadasRaw));

    if (!$env['is_git_repo']) {
        // Consultar el commit remoto vía GitHub API
        $remoteInfo = getRemoteLatestCommit($repoOwner, $repoName);
        $remoteSha = $remoteInfo ? $remoteInfo['short_sha'] : 'main';

        respondSuccess([
            'is_git_repo' => false,
            'git_installed' => $env['git_installed'],
            'hay_actualizacion' => true,
            'requiere_vinculacion' => true,
            'local_commit' => 'Sin vincular',
            'remote_commit' => $remoteSha,
            'commits_pendientes' => [
                'Repositorio Git no inicializado localmente en este servidor.',
                'Haz clic en "Vincular Repositorio Git" o "Actualizar Ahora" para conectar con GitHub.'
            ],
            'migraciones_pendientes' => $pendientesBd,
            'fetch_log' => 'Repositorio pendiente de vincular.'
        ]);
    }

    // Si es un repositorio Git válido
    $fetchOutput = runGitCmd($baseDir, "git fetch origin main");
    $localHash = cleanGitOutput(runGitCmd($baseDir, "git rev-parse HEAD"));
    $remoteHash = cleanGitOutput(runGitCmd($baseDir, "git rev-parse origin/main"));

    $hayActualizacion = false;
    $commitsPendientes = [];

    if (!empty($localHash) && !empty($remoteHash) && $localHash !== $remoteHash) {
        $hayActualizacion = true;
        $logOutput = cleanGitOutput(runGitCmd($baseDir, "git log HEAD..origin/main --oneline -n 10"));
        if ($logOutput) {
            $commitsPendientes = array_filter(explode("\n", trim($logOutput)));
        }
    }

    respondSuccess([
        'is_git_repo' => true,
        'git_installed' => true,
        'hay_actualizacion' => $hayActualizacion,
        'requiere_vinculacion' => false,
        'local_commit' => $localHash ? substr($localHash, 0, 7) : 'al día',
        'remote_commit' => $remoteHash ? substr($remoteHash, 0, 7) : 'al día',
        'commits_pendientes' => $commitsPendientes,
        'migraciones_pendientes' => $pendientesBd,
        'fetch_log' => $fetchOutput
    ]);
}
else if ($method === 'POST' && $accion === 'vincular_git') {
    // Acción dedicada para inicializar y vincular el repositorio oficial
    $env = getGitEnvironment($baseDir);

    if (!$env['has_shell_exec'] || !$env['git_installed']) {
        try {
            $resZip = actualizarViaZip($baseDir, $db, $repoOwner, $repoName);
            respondSuccess([
                'nuevo_commit' => $resZip['nuevo_commit'],
                'migraciones' => $resZip['migraciones'],
                'logs' => $resZip['logs'] . "\n(Sincronizado vía descarga oficial de GitHub porque Git CLI no está activo en este servidor)."
            ], "¡Sistema sincronizado con éxito desde GitHub!");
        } catch (Exception $e) {
            respondError("Error al sincronizar paquete: " . $e->getMessage(), 500);
        }
    }

    try {
        $res = vincularGitRepo($baseDir, $repoUrl, $db);
        if ($res['success']) {
            respondSuccess($res, "¡Repositorio Git vinculado y sincronizado con éxito con GitHub!");
        } else {
            // Intentar fallback ZIP si hubo error de comandos Git
            $resZip = actualizarViaZip($baseDir, $db, $repoOwner, $repoName);
            respondSuccess([
                'nuevo_commit' => $resZip['nuevo_commit'],
                'migraciones' => $resZip['migraciones'],
                'logs' => $res['logs'] . "\n\n[Fallback Activo]: " . $resZip['logs']
            ], "Sincronizado con éxito vía descarga oficial de GitHub");
        }
    } catch (Exception $e) {
        respondError("Error vinculando repositorio: " . $e->getMessage(), 500);
    }
}
else if ($method === 'POST' && $accion === 'actualizar') {
    // ACTUALIZACIÓN 1-CLICK: Git Pull + Migraciones Seguras
    $env = getGitEnvironment($baseDir);

    // Si el repositorio no está vinculado aún
    if (!$env['is_git_repo']) {
        if ($env['git_installed']) {
            $res = vincularGitRepo($baseDir, $repoUrl, $db);
            if ($res['success']) {
                respondSuccess([
                    'nuevo_commit' => $res['nuevo_commit'],
                    'migraciones' => $res['migraciones'],
                    'logs' => $res['logs']
                ], "¡Repositorio vinculado y actualizado con éxito!");
            }
        }
        
        try {
            $resZip = actualizarViaZip($baseDir, $db, $repoOwner, $repoName);
            respondSuccess([
                'nuevo_commit' => $resZip['nuevo_commit'],
                'migraciones' => $resZip['migraciones'],
                'logs' => $resZip['logs']
            ], "¡Sistema actualizado vía descarga directa de GitHub!");
        } catch (Exception $e) {
            respondError("Error en la actualización: " . $e->getMessage(), 500);
        }
    }

    $logs = [];
    
    // Blindaje previo: asegurar respaldo de credenciales antes de git pull o reset
    asegurarRespaldoCredencialesBD($baseDir);

    runGitCmd($baseDir, "git config --global --add safe.directory \"$baseDir\"");

    // 1. Ejecutar Git Fetch
    runGitCmd($baseDir, "git fetch origin main");
    
    // 2. Sincronizar de forma forzada e impecable a origin/main
    $pullResult = runGitCmd($baseDir, "git reset --hard origin/main");
    
    // Si por alguna razón reset falló, intentar pull con force
    if (empty($pullResult) || stripos($pullResult, 'fatal:') !== false || stripos($pullResult, 'error:') !== false) {
        $pullResult = runGitCmd($baseDir, "git pull origin main --force");
    }

    // Blindaje posterior: garantizar que config.prod.php siga presente y activo
    asegurarRestauracionCredencialesBD($baseDir);

    $logs[] = "--- GIT PULL / RESET ---\n" . ($pullResult ?: 'Sincronización completada.');

    // 3. Fallback automático: Si Git CLI no logró alcanzar el commit remoto oficial
    $commitFinal = cleanGitOutput(runGitCmd($baseDir, "git rev-parse --short HEAD")) ?: 'main';
    $remoteInfo = getRemoteLatestCommit($repoOwner, $repoName);
    $remoteSha = $remoteInfo ? $remoteInfo['short_sha'] : null;

    if ($remoteSha && $commitFinal !== $remoteSha) {
        try {
            $resZip = actualizarViaZip($baseDir, $db, $repoOwner, $repoName);
            $logs[] = "--- FALLBACK DE RESCATE (ZIP GITHUB) ---\n" . $resZip['logs'];
            $commitFinal = $resZip['nuevo_commit'];
        } catch (Exception $e) {
            $logs[] = "--- AVISO FALLBACK ---\n" . $e->getMessage();
        }
    }

    // 4. Ejecutar Migraciones de Base de Datos de manera segura (solo las nuevas)
    $migrador = new Migrador($db);
    $resMigraciones = $migrador->ejecutarPendientes();
    
    $totalNuevas = count($resMigraciones['aplicadas_ahora']);
    $logs[] = "--- MIGRACIONES BD ---\nSe ejecutaron $totalNuevas migraciones nuevas. La data de producción se mantuvo intacta.";

    // 5. Limpiar OPcache de PHP si está activo en el servidor
    if (function_exists('opcache_reset')) {
        @opcache_reset();
        $logs[] = "--- CACHE PHP ---\nOPcache reiniciado con éxito.";
    }

    respondSuccess([
        'nuevo_commit' => $commitFinal,
        'pull_output' => $pullResult,
        'migraciones' => $resMigraciones,
        'logs' => implode("\n\n", $logs)
    ], "Actualización 1-Click finalizada con éxito");
}
else if ($method === 'POST' && $accion === 'migrar_bd') {
    // Ejecutar solo migraciones de BD seguras bajo demanda
    $migrador = new Migrador($db);
    $resultado = $migrador->ejecutarPendientes();

    respondSuccess($resultado, "Migraciones de base de datos verificadas y procesadas con éxito");
}
else if ($method === 'GET' && $accion === 'obtener_credenciales_bd') {
    // Retorna las credenciales actuales protegidas de la base de datos
    $databaseObj = new Database();
    respondSuccess($databaseObj->getConfigData(), "Credenciales obtenidas con éxito");
}
else if ($method === 'POST' && $accion === 'guardar_credenciales_bd') {
    // Guarda y blinda las credenciales de la BD en api/config.prod.php
    $input = json_decode(file_get_contents("php://input"), true);
    $host = trim($input['host'] ?? 'localhost');
    $dbName = trim($input['db_name'] ?? 'khalessi_erp');
    $username = trim($input['username'] ?? 'root');
    $password = isset($input['password']) ? (string)$input['password'] : '';
    $port = trim($input['port'] ?? '3306');

    if (empty($host) || empty($dbName) || empty($username)) {
        respondError("El servidor (host), nombre de base de datos y usuario son obligatorios");
    }

    // 1. Probar conexión antes de guardar para evitar que el usuario quede incomunicado
    $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
    try {
        $testConn = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 4
        ]);
    } catch (PDOException $e) {
        respondError("No se pudo conectar a la base de datos con esos datos: " . $e->getMessage());
    }

    // 2. Guardar de forma atómica en api/config.prod.php y respaldos
    $guardado = Database::guardarArchivoConfig([
        'DB_HOST' => $host,
        'DB_NAME' => $dbName,
        'DB_USER' => $username,
        'DB_PASS' => $password,
        'DB_PORT' => $port
    ]);

    if ($guardado) {
        respondSuccess([
            'is_protected' => true,
            'host' => $host,
            'db_name' => $dbName,
            'username' => $username,
            'port' => $port
        ], "¡Credenciales de producción guardadas y blindadas contra actualizaciones con éxito!");
    } else {
        respondError("No se pudo escribir el archivo api/config.prod.php. Verifica permisos de escritura.");
    }
}
else if ($method === 'POST' && $accion === 'probar_credenciales_bd') {
    // Prueba de conexión sin guardar
    $input = json_decode(file_get_contents("php://input"), true);
    $host = trim($input['host'] ?? 'localhost');
    $dbName = trim($input['db_name'] ?? 'khalessi_erp');
    $username = trim($input['username'] ?? 'root');
    $password = isset($input['password']) ? (string)$input['password'] : '';
    $port = trim($input['port'] ?? '3306');

    $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
    try {
        $testConn = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 4
        ]);
        respondSuccess(null, "¡Conexión exitosa a la base de datos MySQL!");
    } catch (PDOException $e) {
        respondError("Fallo de conexión: " . $e->getMessage());
    }
}
else {
    respondError("Acción de sistema no válida", 404);
}
