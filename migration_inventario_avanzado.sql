-- 1. Renombrar inventario_local a stock_local y ajustar columnas
ALTER TABLE inventario_local RENAME TO stock_local;
ALTER TABLE stock_local CHANGE stock_actual cantidad_disponible DECIMAL(10,4) DEFAULT 0;
ALTER TABLE stock_local ADD COLUMN cantidad_reservada DECIMAL(10,4) DEFAULT 0 AFTER cantidad_disponible;

-- 2. Movimientos Inventario
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

-- 3. Transferencias Inventario
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

-- 4. Parámetros Inventario Local
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

-- 5. Lotes Ingredientes
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
