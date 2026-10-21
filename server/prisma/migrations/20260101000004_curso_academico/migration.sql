-- Ubica el curso del campus en la jerarquía académica (programa/semestre),
-- lo liga con su asignatura del pensum y define el modo de acceso.
ALTER TABLE "cursos" ADD COLUMN "programaId" INTEGER;
ALTER TABLE "cursos" ADD COLUMN "semestre" INTEGER;
ALTER TABLE "cursos" ADD COLUMN "materiaId" INTEGER;
ALTER TABLE "cursos" ADD COLUMN "modoAcceso" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "cursos" ADD COLUMN "cupo" INTEGER;

CREATE INDEX "cursos_programaId_semestre_idx" ON "cursos"("programaId", "semestre");
CREATE INDEX "cursos_materiaId_idx" ON "cursos"("materiaId");

ALTER TABLE "cursos" ADD CONSTRAINT "cursos_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
