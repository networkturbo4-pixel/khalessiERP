<?php
/**
 * Configuración de Base de Datos para Producción - Khalessi ERP
 * 
 * Instrucciones:
 * 1. Copia este archivo y renómbralo a: config.prod.php
 * 2. Completa los datos con las credenciales de tu base de datos en cPanel, VPS o Hosting.
 * 3. Guarda el archivo en este mismo directorio (api/config.prod.php).
 */

return [
    // Servidor de base de datos (generalmente 'localhost' en cPanel o la IP privada en VPS)
    'DB_HOST' => 'localhost',

    // Nombre de la base de datos creada en producción (ej. 'u123456789_khalessierp')
    'DB_NAME' => 'khalessi_erp',

    // Usuario de MySQL con permisos completos sobre la BD
    'DB_USER' => 'root',

    // Contraseña del usuario MySQL
    'DB_PASS' => '',

    // Puerto de MySQL (por defecto 3306)
    'DB_PORT' => '3306'
];
