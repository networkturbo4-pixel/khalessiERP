ALTER TABLE recetas ADD COLUMN rendimiento_esperado VARCHAR(100) NULL;
ALTER TABLE recetas ADD COLUMN horas_fermentacion_base DECIMAL(5,2) NULL;
ALTER TABLE recetas ADD COLUMN temp_agua_c_base DECIMAL(5,2) NULL;

CREATE TABLE IF NOT EXISTS inventario_local (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_local INT NOT NULL,
    id_ingrediente INT NULL,
    id_producto INT NULL,
    stock_actual DECIMAL(10,4) DEFAULT 0,
    stock_minimo DECIMAL(10,4) DEFAULT 0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_local) REFERENCES locales(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_local_ingrediente (id_local, id_ingrediente),
    UNIQUE KEY unique_local_producto (id_local, id_producto)
);
