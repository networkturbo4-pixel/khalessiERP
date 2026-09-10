USE khalessi_erp;
ALTER TABLE usuarios ADD COLUMN dni VARCHAR(20) NULL AFTER nombre;
ALTER TABLE usuarios ADD COLUMN celular VARCHAR(20) NULL AFTER email;
