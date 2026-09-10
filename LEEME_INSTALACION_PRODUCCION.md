# Guía de Despliegue en Producción - Khalessi ERP

Este paquete contiene todos los archivos listos para subir a producción (cPanel, VPS, Servidor Dedicado o Hosting Compartido).

---

## 📋 Requisitos del Servidor

- **Servidor Web:** Apache 2.4+ (con módulo `mod_rewrite` activo) o Nginx.
- **PHP:** Versión 8.0 o superior (recomendado PHP 8.1 o 8.2).
  - Extensiones PHP requeridas: `pdo_mysql`, `mbstring`, `json`, `fileinfo`, `gd` u `openssl`.
- **Base de Datos:** MySQL 5.7+ o MariaDB 10.4+.
- **Certificado SSL:** HTTPS habilitado (obligatorio para la PWA, cámara de asistencia y geolocalización).

---

## 🚀 Pasos de Instalación

### Paso 1: Importar la Base de Datos

El archivo SQL completo y unificado se encuentra en la raíz:
`database_produccion_completa.sql`

#### Opción A: Mediante phpMyAdmin (cPanel / Plesk)
1. En tu panel de hosting, crea una base de datos MySQL (ej. `tuempresa_khalessi`) con cotejamiento `utf8mb4_unicode_ci`.
2. Crea un usuario MySQL con una contraseña segura y asígnalo a la base de datos con **TODOS LOS PRIVILEGIOS**.
3. Abre **phpMyAdmin**, selecciona la base de datos creada y ve a la pestaña **Importar**.
4. Selecciona el archivo `database_produccion_completa.sql` y haz clic en **Importar / Continuar**.

#### Opción B: Mediante Terminal SSH (VPS / Linux)
```bash
mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < database_produccion_completa.sql
```

---

### Paso 2: Subir los Archivos al Servidor

Sube todos los archivos del sistema al directorio raíz de tu dominio (ej. `public_html` o `/var/www/html`) o en el subdirectorio que elijas (ej. `public_html/khalessierp`).

Estructura de directorios principal:
```text
├── api/
│   ├── config.prod.sample.php  <-- Plantilla de credenciales
│   ├── db.php                  <-- Conector a base de datos
│   ├── index.php               <-- Enrutador principal API
│   ├── rrhh.php
│   ├── inventario.php
│   └── ...
├── css/
│   └── index.css
├── js/
│   ├── app.js
│   └── modules/
├── img/
├── uploads/                    <-- Requiere permisos de escritura
│   ├── asistencia/
│   ├── justificaciones/
│   ├── logos/
│   ├── media/
│   └── perfiles/
├── .htaccess                   <-- Reglas Apache ya configuradas
├── index.html                  <-- SPA Principal
├── manifest.json
└── sw.js
```

---

### Paso 3: Configurar Credenciales de Base de Datos

1. Ingresa a la carpeta `api/`.
2. Copia el archivo `config.prod.sample.php` y nómbralo como **`config.prod.php`**:
   ```bash
   cp api/config.prod.sample.php api/config.prod.php
   ```
3. Abre `api/config.prod.php` y edita los valores con las credenciales de tu base de datos:

```php
<?php
return [
    'DB_HOST' => 'localhost',         // Generalmente localhost en cPanel
    'DB_NAME' => 'tu_basededatos',    // Nombre de la base de datos
    'DB_USER' => 'tu_usuario',        // Usuario MySQL
    'DB_PASS' => 'tu_contraseña',     // Contraseña MySQL
    'DB_PORT' => '3306'
];
```

> **Nota de seguridad:** `api/config.prod.php` está protegido y excluido de Git para resguardar tus contraseñas.

---

### Paso 4: Configurar Permisos de Archivos y Carpetas

Asegúrate de que la carpeta `uploads/` y sus subcarpetas tengan permisos de escritura para que los colaboradores puedan registrar fotos de asistencia, justificaciones y logos del sistema:

En Linux / VPS:
```bash
chmod -R 775 uploads/
# Si el servidor web corre bajo www-data o nginx:
chown -R www-data:www-data uploads/
```
En cPanel:
- Asegúrate de que las carpetas dentro de `uploads/` tengan permisos `755` o `775`.

---

### Paso 5: Servidor Web

#### Apache (cPanel / XAMPP / LAMP)
El archivo `.htaccess` ya está incluido y preconfigurado con soporte automático tanto para dominio raíz (`https://tudominio.com/`) como para subcarpetas (`https://tudominio.com/khalessierp/`). No requiere modificaciones.

#### Nginx (en caso de usar Nginx como servidor principal)
Si utilizas Nginx en lugar de Apache, agrega el siguiente bloque a tu archivo de configuración de sitio (`/etc/nginx/sites-available/khalessi`):

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name erp.tudominio.com;
    root /var/www/khalessierp;
    index index.html index.php;

    # Enrutamiento de la API PHP
    location /api/ {
        try_files $uri $uri/ /api/index.php?request=$1&$args;
    }

    # Enrutamiento SPA Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Procesamiento PHP
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock; # Ajustar según versión
    }

    # Protección de archivos de configuración
    location ~ /api/config\.prod\.php {
        deny all;
    }
}
```

---

## 🔑 Credenciales de Acceso por Defecto

Una vez importada la base de datos, puedes iniciar sesión inmediatamente con el usuario Administrador del sistema:

- **Email:** `admin@khalessi.com`
- **Contraseña:** `admin123`
- **DNI:** `12345678`

> ⚠️ **IMPORTANTE:** Una vez ingreses al sistema, dirígete al módulo de **Usuarios** o **Mi Perfil** y cambia la contraseña del administrador por una contraseña robusta y segura.

---

## 📱 Funcionalidades PWA y Móvil en Producción
- **HTTPS:** El acceso mediante `https://` es indispensable para que los navegadores móviles (Chrome, Safari, Edge) permitan activar la cámara web para el marcaje de asistencia facial y solicitar la geolocalización GPS.
- **Instalación como App:** Al entrar desde un celular o tablet mediante Chrome/Safari, aparecerá el aviso o botón de "Instalar aplicación" para usar el sistema a pantalla completa sin barra de navegación.
