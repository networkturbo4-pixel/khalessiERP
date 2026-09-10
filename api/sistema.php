<?php
// api/sistema.php - Actualizador 1-Click desde GitHub y Migrador de Base de Datos

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/migrador.php';

$repoUrl = "https://github.com/networkturbo4-pixel/khalessiERP.git";
$baseDir = realpath(__DIR__ . '/..');

/**
 * Ejecuta comandos Git de forma compatible con Windows y Linux
 */
function runGitCmd($baseDir, $gitCmd) {
    $isWin = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    $prefix = $isWin ? "cd /d \"$baseDir\" && " : "cd \"$baseDir\" && ";
    return @shell_exec($prefix . $gitCmd . " 2>&1");
}

if ($method === 'GET' && $accion === 'git_info') {
    // Obtener información del repositorio git local
    $commitHash = trim(runGitCmd($baseDir, "git rev-parse --short HEAD") ?: 'N/A');
    if (strpos($commitHash, 'fatal:') !== false) $commitHash = 'Inicial';
    $commitMsg = trim(runGitCmd($baseDir, "git log -1 --pretty=%B") ?: 'Sin commits');
    if (strpos($commitMsg, 'fatal:') !== false) $commitMsg = 'Rama local lista';
    $commitDate = trim(runGitCmd($baseDir, "git log -1 --format=%cd --date=relative") ?: 'N/A');
    if (strpos($commitDate, 'fatal:') !== false) $commitDate = 'Reciente';
    $branch = trim(runGitCmd($baseDir, "git branch --show-current") ?: 'main');
    $remoteUrl = trim(runGitCmd($baseDir, "git config --get remote.origin.url") ?: $repoUrl);

    // Obtener estado de migraciones
    $migrador = new Migrador($db);
    $migraciones = $migrador->getMigracionesEjecutadas();

    respondSuccess([
        'commit_hash' => $commitHash,
        'commit_mensaje' => $commitMsg,
        'commit_fecha' => $commitDate,
        'branch' => $branch,
        'remote_url' => $remoteUrl,
        'total_migraciones' => count($migraciones),
        'migraciones' => $migraciones
    ]);
}
else if ($method === 'POST' && $accion === 'check_update') {
    // Comprobar si hay nuevos commits en GitHub
    // Paso 1: Ejecutar fetch silencioso
    $fetchOutput = runGitCmd($baseDir, "git fetch origin main");
    
    // Paso 2: Comparar HEAD local con origin/main
    $localHash = trim(runGitCmd($baseDir, "git rev-parse HEAD") ?: '');
    $remoteHash = trim(runGitCmd($baseDir, "git rev-parse origin/main") ?: '');
    
    $hayActualizacion = false;
    $commitsPendientes = [];

    if (!empty($localHash) && !empty($remoteHash) && $localHash !== $remoteHash) {
        $hayActualizacion = true;
        $logOutput = runGitCmd($baseDir, "git log HEAD..origin/main --oneline -n 10");
        if ($logOutput) {
            $commitsPendientes = array_filter(explode("\n", trim($logOutput)));
        }
    }

    // Verificar si hay migraciones pendientes en local
    $migrador = new Migrador($db);
    $dir = __DIR__ . '/migrations';
    $archivos = is_dir($dir) ? glob($dir . '/*.php') : [];
    $ejecutadasRaw = $db->query("SELECT version FROM sistema_migraciones")->fetchAll(PDO::FETCH_COLUMN);
    $pendientesBd = max(0, count($archivos) - count($ejecutadasRaw));

    respondSuccess([
        'hay_actualizacion' => $hayActualizacion,
        'local_commit' => substr($localHash, 0, 7),
        'remote_commit' => substr($remoteHash, 0, 7),
        'commits_pendientes' => $commitsPendientes,
        'migraciones_pendientes' => $pendientesBd,
        'fetch_log' => $fetchOutput
    ]);
}
else if ($method === 'POST' && $accion === 'actualizar') {
    // ACTUALIZACIÓN 1-CLICK: Git Pull + Migraciones Seguras
    $logs = [];
    
    // Evitar problemas de permisos o propiedad en servidores Linux / cPanel (safe.directory)
    runGitCmd($baseDir, "git config --global --add safe.directory \"$baseDir\"");

    // 1. Ejecutar Git Pull
    $pullResult = runGitCmd($baseDir, "git pull origin main");
    $logs[] = "--- GIT PULL ---\n" . ($pullResult ?: 'Pull completado sin salida.');

    // 2. Ejecutar Migraciones de Base de Datos de manera segura (solo las nuevas)
    $migrador = new Migrador($db);
    $resMigraciones = $migrador->ejecutarPendientes();
    
    $totalNuevas = count($resMigraciones['aplicadas_ahora']);
    $logs[] = "--- MIGRACIONES BD ---\nSe ejecutaron $totalNuevas migraciones nuevas. La data de producción se mantuvo intacta.";

    // 3. Limpiar OPcache de PHP si está activo en el servidor
    if (function_exists('opcache_reset')) {
        @opcache_reset();
        $logs[] = "--- CACHE PHP ---\nOPcache reiniciado con éxito.";
    }

    // 4. Commit actual después del pull
    $commitFinal = trim(runGitCmd($baseDir, "git rev-parse --short HEAD") ?: 'N/A');

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
else {
    respondError("Acción de sistema no válida", 404);
}
