-- Script de migración: Módulo de Pedidos y Ventas para Khalessi ERP
USE khalessi_erp;

-- 1. Tabla de Pedidos (Cabecera)
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_pedido VARCHAR(30) NOT NULL UNIQUE,
    id_local INT NULL,
    id_cliente INT NULL,
    origen VARCHAR(50) DEFAULT 'tienda_roma',
    id_pedido_externo VARCHAR(50) NULL,
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(30) NULL,
    cliente_direccion TEXT NULL,
    tipo_entrega ENUM('pickup', 'delivery', 'mesa') DEFAULT 'pickup',
    metodo_pago VARCHAR(50) NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado ENUM('pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado') DEFAULT 'pendiente',
    notas TEXT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE SET NULL,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE SET NULL,
    INDEX idx_estado (estado),
    INDEX idx_fecha (fecha_creacion),
    INDEX idx_codigo (codigo_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Detalle de Pedidos
CREATE TABLE IF NOT EXISTS pedidos_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NULL,
    producto_nombre VARCHAR(150) NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notas TEXT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE SET NULL,
    INDEX idx_pedido (id_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Permiso en el rol Administrador si no existe
INSERT IGNORE INTO permisos_roles (id_rol, modulo, puede_ver, puede_editar, puede_eliminar)
VALUES (1, 'pedidos', 1, 1, 1);

-- 4. Clave API de integración para Tienda Roma y Catálogos Web
INSERT IGNORE INTO configuracion (clave, valor) 
VALUES ('api_key_pedidos', 'kh_sec_roma_2026_pizzakhalessi');
