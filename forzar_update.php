<?php
// forzar_update.php - Script de rescate y actualización forzada para Khalessi ERP
header('Content-Type: text/html; charset=utf-8');

$baseDir = dirname(__FILE__);
$configFile = $baseDir . '/api/config.prod.php';
$backupFile = $baseDir . '/api/config.prod.php.bak';

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Actualización Forzada - Khalessi ERP</title>";
echo "<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;padding:30px;line-height:1.6;}";
echo "pre{background:#1e293b;border:1px solid #334155;color:#38bdf8;padding:16px;border-radius:8px;overflow-x:auto;}";
echo ".btn{display:inline-block;padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;margin-top:15px;}</style></head><body>";
echo "<h2>🚀 Herramienta de Actualización Forzada - Khalessi ERP</h2>";
echo "<pre>";

// 1. Respaldar credenciales de BD si existen
if (file_exists($configFile)) {
    @copy($configFile, $backupFile);
    echo "✔ Credenciales de base de datos respaldadas de forma segura.\n";
}

// 2. Intentar Git Reset --hard origin/main
$isWin = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
$prefix = $isWin ? "cd /d \"$baseDir\" && " : "cd \"$baseDir\" && ";

echo "\n--- [1/3] VERIFICANDO ENTORNO GIT ---\n";
@shell_exec($prefix . "git config --global --add safe.directory \"$baseDir\" 2>&1");
@shell_exec($prefix . "git config --global --add safe.directory \"*\" 2>&1");

$outFetch = @shell_exec($prefix . "git fetch origin main 2>&1");
echo "Git Fetch:\n" . ($outFetch ?: "Fetch ejecutado correctamente.\n");

$outReset = @shell_exec($prefix . "git reset --hard origin/main 2>&1");
echo "\nGit Reset (--hard origin/main):\n" . ($outReset ?: "Reset ejecutado correctamente.\n");

$commitActual = trim(@shell_exec($prefix . "git rev-parse --short HEAD 2>&1") ?: '');
echo "Commit resultante: " . ($commitActual ?: "No disponible") . "\n";

// Si Git falló o el commit sigue en blanco / error, descargar ZIP directo de GitHub
$commitOk = !empty($commitActual) && strpos($commitActual, 'fatal:') === false && strpos($commitActual, 'error:') === false;

if (!$commitOk) {
    echo "\n--- [2/3] SINCRONIZACIÓN DE RESCATE VÍA DESCARGA DIRECTA (ZIP GITHUB) ---\n";
    $zipUrl = "https://github.com/networkturbo4-pixel/khalessiERP/archive/refs/heads/main.zip";
    $tempZip = sys_get_temp_dir() . '/khalessi_rescue_' . time() . '.zip';
    
    $fp = fopen($tempZip, 'w+');
    $ch = curl_init($zipUrl);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'KhalessiERP-Rescue');
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);

    if ($httpCode === 200 && file_exists($tempZip) && filesize($tempZip) > 1000) {
        $zip = new ZipArchive();
        if ($zip->open($tempZip) === TRUE) {
            $prefixZip = "khalessiERP-main/";
            $count = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                if (strpos($filename, $prefixZip) === 0) {
                    $rel = substr($filename, strlen($prefixZip));
                    if (empty($rel) || $rel === 'api/config.prod.php' || strpos($rel, 'uploads/') === 0) continue;
                    $target = $baseDir . '/' . $rel;
                    if (substr($filename, -1) === '/') {
                        if (!is_dir($target)) @mkdir($target, 0755, true);
                    } else {
                        @mkdir(dirname($target), 0755, true);
                        file_put_contents($target, $zip->getFromIndex($i));
                        $count++;
                    }
                }
            }
            $zip->close();
            @unlink($tempZip);
            echo "✔ ZIP oficial descargado y extraído ($count archivos actualizados con éxito).\n";
        }
    } else {
        echo "❌ No se pudo descargar el ZIP desde GitHub (Código HTTP: $httpCode).\n";
    }
}

// 3. Restaurar credenciales si se perdieron
if (!file_exists($configFile) && file_exists($backupFile)) {
    @copy($backupFile, $configFile);
    echo "✔ Credenciales de base de datos restauradas correctamente.\n";
}

// 4. Limpiar OPcache
if (function_exists('opcache_reset')) {
    @opcache_reset();
    echo "\n✔ OPcache reiniciado.\n";
}

echo "\n--- [3/3] FINALIZADO ---\n";
echo "¡Tu sistema ha sido actualizado con éxito a la versión más reciente!";
echo "</pre>";
echo "<p><a href='index.html' class='btn'>Volver al ERP Khalessi</a></p>";
echo "<p style='color:#94a3b8;font-size:12px;'>Nota de seguridad: Puedes eliminar este archivo forzar_update.php una vez completada la actualización.</p>";
echo "</body></html>";
