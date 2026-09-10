ALTER TABLE ingredientes ADD COLUMN unidad_compra VARCHAR(20) NULL AFTER unidad_medida;
ALTER TABLE ingredientes ADD COLUMN equivalencia_compra DECIMAL(10,4) DEFAULT 1 AFTER unidad_compra;
