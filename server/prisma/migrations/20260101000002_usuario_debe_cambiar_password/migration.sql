-- Cuentas generadas: contraseña temporal que se debe cambiar al primer ingreso.
ALTER TABLE "usuarios" ADD COLUMN "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false;
