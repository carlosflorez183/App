-- Documentos que el estudiante sube para completar su expediente de ingreso.
CREATE TABLE "documentos_ingreso" (
    "id" SERIAL NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "requisitoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime" TEXT,
    "tamano" INTEGER NOT NULL DEFAULT 0,
    "contenidoB64" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "observacion" TEXT,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadoEn" TIMESTAMP(3),
    "revisadoPor" TEXT,

    CONSTRAINT "documentos_ingreso_pkey" PRIMARY KEY ("id")
);

-- Un solo archivo por requisito: volver a subirlo reemplaza el anterior.
CREATE UNIQUE INDEX "documentos_ingreso_estudianteId_requisitoId_key" ON "documentos_ingreso"("estudianteId", "requisitoId");
CREATE INDEX "documentos_ingreso_estudianteId_idx" ON "documentos_ingreso"("estudianteId");

ALTER TABLE "documentos_ingreso" ADD CONSTRAINT "documentos_ingreso_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos_ingreso" ADD CONSTRAINT "documentos_ingreso_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "requisitos_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
