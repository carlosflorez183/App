-- Superadmin: control total y protegido frente a otros administradores.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "esSuperadmin" BOOLEAN NOT NULL DEFAULT FALSE;

-- El administrador actual pasa a ser el superadmin del sistema.
UPDATE "usuarios" SET "esSuperadmin" = TRUE WHERE "role" = 'admin' AND "usuario" = 'ADMIN';
