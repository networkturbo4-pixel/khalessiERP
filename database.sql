-- Script de Creación de Base de Datos para ERP Khalessi

CREATE DATABASE IF NOT EXISTS khalessi_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE khalessi_erp;

-- 1. Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE, -- ej: Administrador, Cajero, Cocinero
    descripcion VARCHAR(255) NULL
);

-- Insertar roles básicos
INSERT IGNORE INTO roles (nombre, descripcion) VALUES 
('Administrador', 'Acceso total al sistema'),
('Cajero', 'Acceso al módulo de Punto de Venta (POS) y Clientes'),
('Cocinero', 'Acceso al monitor de pedidos y órdenes en preparación');

-- 1.5 Tabla de Permisos por Rol
CREATE TABLE IF NOT EXISTS permisos_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    puede_ver TINYINT(1) DEFAULT 0,
    puede_editar TINYINT(1) DEFAULT 0,
    puede_eliminar TINYINT(1) DEFAULT 0,
    UNIQUE KEY unique_rol_modulo (id_rol, modulo),
    FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE
);

-- Insertar permisos totales para Administrador (id_rol = 1)
INSERT IGNORE INTO permisos_roles (id_rol, modulo, puede_ver, puede_editar, puede_eliminar) VALUES 
(1, 'dashboard', 1, 1, 1),
(1, 'inventario', 1, 1, 1),
(1, 'clientes', 1, 1, 1),
(1, 'usuarios', 1, 1, 1),
(1, 'configuracion', 1, 1, 1);


-- 2. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NULL,
    dni VARCHAR(20) NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    celular VARCHAR(20) NULL,
    foto_perfil LONGTEXT NULL,
    bio TEXT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NULL, -- PIN de 4 a 6 dígitos para acceso rápido
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    hora_entrada_asignada TIME NULL,
    hora_salida_asignada TIME NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE RESTRICT
);

-- Usuario administrador por defecto (password: admin123, pin: 1234)
-- En un entorno real esto debe ser encriptado con password_hash(). Aquí ponemos un hash de ejemplo de "admin123" y "1234"
INSERT IGNORE INTO usuarios (id_rol, nombre, apellido, dni, email, password_hash, pin_hash, hora_entrada_asignada, hora_salida_asignada) VALUES
(1, 'Admin', 'Khalessi', '12345678', 'admin@khalessi.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '$2y$10$0z5A5H5F5w5G5w5w5w5w5u5v5w5w5w5w5w5w5w5w5w5w5w5w5w5w5', '09:00:00', '18:00:00');

-- 2.5 Tabla de Asistencias (RRHH)
CREATE TABLE IF NOT EXISTS rrhh_asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_hora_entrada TIMESTAMP NULL,
    foto_entrada_url VARCHAR(255) NULL,
    fecha_hora_salida TIMESTAMP NULL,
    metodo_salida ENUM('manual', 'automatico') NULL,
    estado ENUM('abierto', 'cerrado') DEFAULT 'abierto',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);


-- 3. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NULL,
    direccion VARCHAR(255) NULL,
    email VARCHAR(100) NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Categorías (Inventario)
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE, -- ej: Pizzas, Bebidas, Insumos
    descripcion VARCHAR(255) NULL
);

INSERT IGNORE INTO categorias (nombre) VALUES ('Pizzas'), ('Bebidas'), ('Extras');

-- 5. Tabla de Productos (Inventario)
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT NOT NULL,
    codigo_sku VARCHAR(50) NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    precio_venta DECIMAL(10,2) NOT NULL,
    stock_actual DECIMAL(10,2) DEFAULT 0,
    stock_minimo DECIMAL(10,2) DEFAULT 0,
    imagen_url VARCHAR(255) NULL,
    estado ENUM('disponible', 'agotado', 'inactivo') DEFAULT 'disponible',
    FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE RESTRICT
);

-- 6. Configuración Global del Sistema
CREATE TABLE IF NOT EXISTS configuracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor TEXT NOT NULL
);

INSERT IGNORE INTO configuracion (clave, valor) VALUES 
('nombre_empresa', 'Pizzería Khalessi'),
('moneda', 'MXN'),
('impuesto_iva', '16');

-- 7. Locales
CREATE TABLE IF NOT EXISTS locales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NULL,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo'
);

-- Insertar el local inicial
INSERT IGNORE INTO locales (nombre, ciudad) VALUES ('Local Centro', 'Ciudad Base');

-- 8. Ingredientes
CREATE TABLE IF NOT EXISTS ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL, -- ej: 'gr', 'ml', 'unidad'
    unidad_compra VARCHAR(20) NULL, -- ej: 'Saco 25kg'
    equivalencia_compra DECIMAL(10,4) DEFAULT 1, -- Cuántas unidades base vienen en la de compra (ej: 25000)
    costo_estimado DECIMAL(10,2) DEFAULT 0 -- Costo base general
);

-- 8.1 Ingredientes Sustitutos
CREATE TABLE IF NOT EXISTS ingredientes_sustitutos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_ingrediente_principal INT NOT NULL,
    id_ingrediente_sustituto INT NOT NULL,
    ratio_conversion DECIMAL(10,4) DEFAULT 1.0000, -- ej: 1.2 si necesito 20% más del sustituto
    notas VARCHAR(255) NULL,
    FOREIGN KEY (id_ingrediente_principal) REFERENCES ingredientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente_sustituto) REFERENCES ingredientes(id) ON DELETE CASCADE
);

-- 9. Recetas (Cabecera)
CREATE TABLE IF NOT EXISTS recetas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('base', 'producto_final') NOT NULL, -- 'base' (masa/salsa) o 'producto_final' (Pizza)
    descripcion TEXT NULL,
    rendimiento_esperado VARCHAR(100) NULL,
    horas_fermentacion_base DECIMAL(5,2) NULL,
    temp_agua_c_base DECIMAL(5,2) NULL
);

-- 9.1 Relacionar Productos con Recetas (Agregamos la columna)
ALTER TABLE productos ADD COLUMN id_receta INT NULL;
ALTER TABLE productos ADD FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE SET NULL;

-- 10. Receta Detalle (Global)
CREATE TABLE IF NOT EXISTS receta_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_receta INT NOT NULL,
    id_ingrediente INT NOT NULL,
    cantidad_base DECIMAL(10,4) NOT NULL, -- Cantidad exacta (ej. 500 gr)
    peso_porcion DECIMAL(10,4) NULL, -- Si aplica (ej. 250gr por bollo)
    orden_preparacion INT DEFAULT 1,
    notas TEXT NULL,
    FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE RESTRICT
);

-- 11. Receta por Local (Dinámica)
CREATE TABLE IF NOT EXISTS receta_local (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_receta INT NOT NULL,
    id_local INT NOT NULL,
    factor_ajuste DECIMAL(10,4) DEFAULT 1.0000,
    temp_agua_c DECIMAL(5,2) NULL, -- Parámetro innegociable
    horas_fermentacion DECIMAL(5,2) NULL,
    costo_mano_obra_extra DECIMAL(10,2) DEFAULT 0,
    rendimiento_real DECIMAL(10,4) NULL,
    UNIQUE KEY unique_receta_local (id_receta, id_local),
    FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE CASCADE
);

-- 12. Precios Insumos por Local
CREATE TABLE IF NOT EXISTS precios_insumos_local (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_local INT NOT NULL,
    id_ingrediente INT NOT NULL,
    precio_compra DECIMAL(10,2) NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_local_ingrediente (id_local, id_ingrediente),
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE
);

-- 13. Registro de Mermas Diarias
CREATE TABLE IF NOT EXISTS registro_mermas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_local INT NOT NULL,
    id_receta INT NOT NULL,
    id_usuario INT NOT NULL, -- El panadero que registra
    fecha DATE NOT NULL,
    cantidad_teorica DECIMAL(10,4) NOT NULL,
    cantidad_real DECIMAL(10,4) NOT NULL,
    merma_calculada DECIMAL(10,4) GENERATED ALWAYS AS (cantidad_teorica - cantidad_real) STORED,
    porcentaje_merma DECIMAL(5,2) GENERATED ALWAYS AS ((cantidad_teorica - cantidad_real) / cantidad_teorica * 100) STORED,
    observaciones TEXT NULL,
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- 14. Stock Local (Renombrado de inventario_local)
CREATE TABLE IF NOT EXISTS stock_local (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_local INT NOT NULL,
    id_ingrediente INT NULL,
    id_producto INT NULL,
    cantidad_disponible DECIMAL(10,4) DEFAULT 0,
    cantidad_reservada DECIMAL(10,4) DEFAULT 0,
    stock_minimo DECIMAL(10,4) DEFAULT 0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_local_ingrediente (id_local, id_ingrediente),
    UNIQUE KEY unique_local_producto (id_local, id_producto)
);

-- 15. Movimientos Inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_local INT NOT NULL,
    id_ingrediente INT NULL,
    id_producto INT NULL,
    tipo_movimiento ENUM('compra', 'produccion', 'venta', 'merma', 'transferencia', 'ajuste') NOT NULL,
    cantidad DECIMAL(10,4) NOT NULL,
    costo_unitario DECIMAL(10,2) NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lote VARCHAR(50) NULL,
    fecha_caducidad DATE NULL,
    documento_referencia VARCHAR(50) NULL,
    observaciones TEXT NULL,
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE
);

-- 16. Transferencias Inventario
CREATE TABLE IF NOT EXISTS transferencias_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_local_origen INT NOT NULL,
    id_local_destino INT NOT NULL,
    id_ingrediente INT NULL,
    id_producto INT NULL,
    cantidad DECIMAL(10,4) NOT NULL,
    estado ENUM('solicitado', 'en_transito', 'recibido', 'cancelado') DEFAULT 'solicitado',
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_envio TIMESTAMP NULL,
    fecha_recepcion TIMESTAMP NULL,
    id_usuario_solicita INT NOT NULL,
    id_usuario_recibe INT NULL,
    FOREIGN KEY (id_local_origen) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (id_local_destino) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_solicita) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario_recibe) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 17. Parámetros Inventario Local
CREATE TABLE IF NOT EXISTS parametros_inventario_local (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_local INT NOT NULL,
    id_ingrediente INT NOT NULL,
    stock_minimo DECIMAL(10,4) DEFAULT 0,
    stock_maximo DECIMAL(10,4) DEFAULT 0,
    punto_pedido DECIMAL(10,4) DEFAULT 0,
    dias_cobertura INT DEFAULT 3,
    proveedor_preferido VARCHAR(100) NULL,
    UNIQUE KEY unique_param_local_ing (id_local, id_ingrediente),
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE
);

-- 18. Lotes Ingredientes
CREATE TABLE IF NOT EXISTS lotes_ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_ingrediente INT NOT NULL,
    id_local INT NOT NULL,
    lote VARCHAR(50) NOT NULL,
    cantidad_inicial DECIMAL(10,4) NOT NULL,
    cantidad_restante DECIMAL(10,4) NOT NULL,
    fecha_caducidad DATE NOT NULL,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE CASCADE
);
