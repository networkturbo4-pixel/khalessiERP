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
    descripcion TEXT NULL
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
