-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "codigo" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "programaId" INTEGER,
    "semestre" TEXT,
    "avatar" TEXT,
    "avatarClass" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalidades" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icon" TEXT,
    "bgClass" TEXT,

    CONSTRAINT "modalidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programas" (
    "id" SERIAL NOT NULL,
    "modalidadId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "facultad" TEXT NOT NULL,
    "semestres" INTEGER NOT NULL,
    "creditos" INTEGER NOT NULL,
    "cupo" INTEGER NOT NULL,
    "matriculados" INTEGER NOT NULL,
    "snies" TEXT,
    "jornada" TEXT,
    "icon" TEXT,
    "bgClass" TEXT,
    "fuente" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "programas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" SERIAL NOT NULL,
    "programaId" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "area" TEXT,
    "creditos" INTEGER NOT NULL,
    "profesor" TEXT,
    "horas" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "prerrequisitoId" INTEGER,

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios" (
    "id" SERIAL NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "dia" TEXT NOT NULL,
    "bloque" TEXT NOT NULL,

    CONSTRAINT "horarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procesos_admision" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaApertura" TIMESTAMP(3),
    "fechaCierre" TIMESTAMP(3),
    "fechaResultados" TIMESTAMP(3),
    "fechaInscripcion" TIMESTAMP(3),
    "cuposTotales" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "procesoAbierto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "procesos_admision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aspirantes" (
    "id" SERIAL NOT NULL,
    "procesoId" INTEGER NOT NULL,
    "programaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "puntajeIcfes" INTEGER NOT NULL,
    "examen" INTEGER NOT NULL,
    "promedio" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "documentos" TEXT NOT NULL,

    CONSTRAINT "aspirantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudiantes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "correo" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "programaId" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "jornada" TEXT,
    "promedio" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL,
    "documentos" TEXT NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "aspiranteId" INTEGER,
    "usuarioId" INTEGER,

    CONSTRAINT "estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "fechaLimite" TIMESTAMP(3),
    "fechaPago" TIMESTAMP(3),
    "estado" TEXT NOT NULL,
    "referencia" TEXT,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" SERIAL NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "programaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creditos" INTEGER NOT NULL,
    "profesor" TEXT,
    "nota1" DOUBLE PRECISION,
    "nota2" DOUBLE PRECISION,
    "nota3" DOUBLE PRECISION,
    "definitiva" DOUBLE PRECISION,
    "estado" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "cortesManuales" TEXT,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "profesor" TEXT NOT NULL,
    "docenteId" TEXT,
    "grupo" TEXT NOT NULL,
    "estudiantes" INTEGER NOT NULL DEFAULT 0,
    "icono" TEXT,
    "color" TEXT,
    "progreso" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" SERIAL NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL DEFAULT '2026-1',
    "estado" TEXT NOT NULL DEFAULT 'matriculado',
    "inscritoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "corte" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaEntrega" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaCierre" TIMESTAMP(3),
    "descripcion" TEXT,
    "puntos" INTEGER NOT NULL,
    "estadoEst" TEXT NOT NULL,
    "nota" DOUBLE PRECISION,
    "archivo" TEXT,
    "archivoB64" TEXT,
    "archivoMime" TEXT,
    "archivoTamano" INTEGER,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preguntas" (
    "id" SERIAL NOT NULL,
    "actividadId" INTEGER NOT NULL,
    "enunciado" TEXT NOT NULL,
    "opciones" JSONB NOT NULL,
    "correcta" INTEGER NOT NULL DEFAULT 0,
    "puntos" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "preguntas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" SERIAL NOT NULL,
    "actividadId" INTEGER NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "archivo" TEXT,
    "archivoB64" TEXT,
    "archivoMime" TEXT,
    "archivoTamano" INTEGER,
    "contenido" TEXT,
    "respuestas" JSONB,
    "nota" DOUBLE PRECISION,
    "comentario" TEXT,
    "entregadoEn" TIMESTAMP(3),
    "calificacionEn" TIMESTAMP(3),

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias_sesion" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tema" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',

    CONSTRAINT "asistencias_sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias_registro" (
    "id" SERIAL NOT NULL,
    "sesionId" INTEGER NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'presente',
    "justificacion" TEXT,

    CONSTRAINT "asistencias_registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foro_mensajes" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "tema" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foro_mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anuncios" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "autor" TEXT NOT NULL,

    CONSTRAINT "anuncios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados_emitidos" (
    "id" SERIAL NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3),
    "solicitado" TIMESTAMP(3),
    "estado" TEXT NOT NULL,

    CONSTRAINT "certificados_emitidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "area" TEXT,
    "titulo" TEXT,
    "email" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "categoria" TEXT,
    "usuarioId" INTEGER,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "salario" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL,
    "ingreso" TIMESTAMP(3),
    "documento" TEXT NOT NULL,
    "baseSalarial" DOUBLE PRECISION,
    "usuarioId" INTEGER,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominas" (
    "id" SERIAL NOT NULL,
    "periodo" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pagada',
    "uvt" DOUBLE PRECISION NOT NULL DEFAULT 42950,
    "smlmv" DOUBLE PRECISION NOT NULL DEFAULT 1300000,
    "totalDevengado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeducciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNeto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cerradoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones" (
    "id" SERIAL NOT NULL,
    "nominaId" INTEGER NOT NULL,
    "empleadoId" INTEGER,
    "docenteId" TEXT,
    "nombre" TEXT NOT NULL DEFAULT '',
    "cargo" TEXT,
    "dependencia" TEXT,
    "tipoPersona" TEXT NOT NULL DEFAULT 'empleado',
    "salarioBase" DOUBLE PRECISION NOT NULL,
    "devengado" DOUBLE PRECISION NOT NULL,
    "deducciones" DOUBLE PRECISION NOT NULL,
    "neto" DOUBLE PRECISION NOT NULL,
    "baseRetencion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentaExenta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseGravable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retencion" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptos" (
    "id" SERIAL NOT NULL,
    "liquidacionId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "base" DOUBLE PRECISION,
    "porcentaje" DOUBLE PRECISION,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conceptos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novedades" (
    "id" SERIAL NOT NULL,
    "empleadoId" INTEGER,
    "docenteId" TEXT,
    "nombre" TEXT NOT NULL DEFAULT '',
    "tipoPersona" TEXT NOT NULL DEFAULT 'empleado',
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "modalidad" TEXT,
    "periodo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "dias" INTEGER,
    "horas" DOUBLE PRECISION,
    "valorSugerido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipoAjuste" TEXT NOT NULL DEFAULT 'descuento',
    "estado" TEXT NOT NULL DEFAULT 'reportada',
    "nominaId" INTEGER,
    "reportadoPor" INTEGER,
    "ajustadoPor" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados_empleado" (
    "id" SERIAL NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "nominaId" INTEGER,
    "liquidacionId" INTEGER,
    "tipo" TEXT NOT NULL,
    "periodo" TEXT,
    "fecha" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'entregado',
    "emitidoPor" INTEGER,
    "solicitado" TIMESTAMP(3),

    CONSTRAINT "certificados_empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" SERIAL NOT NULL,
    "concepto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cuenta" TEXT NOT NULL,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyectos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "presupuesto" DOUBLE PRECISION NOT NULL,
    "ejecutado" DOUBLE PRECISION NOT NULL,
    "avance" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "inicio" TIMESTAMP(3),
    "fin" TIMESTAMP(3),

    CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "msg" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tiempo" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "destino" JSONB,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_ponderacion" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    "obligatorio" BOOLEAN NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "config_ponderacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitos_documento" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL,
    "vigente" BOOLEAN NOT NULL,

    CONSTRAINT "requisitos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "fecha" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convocatorias" (
    "id" SERIAL NOT NULL,
    "cargo" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "dependencia" TEXT,
    "vinculo" TEXT NOT NULL DEFAULT 'catedra',
    "cupos" INTEGER NOT NULL DEFAULT 1,
    "apertura" TIMESTAMP(3) NOT NULL,
    "cierre" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "requisitos" TEXT,

    CONSTRAINT "convocatorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convocatorias_postulados" (
    "id" SERIAL NOT NULL,
    "convocatoriaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "titulo" TEXT,
    "experiencia" INTEGER NOT NULL DEFAULT 0,
    "puntaje" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'recibida',

    CONSTRAINT "convocatorias_postulados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacitaciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horas" INTEGER NOT NULL DEFAULT 4,
    "docente" TEXT,
    "cupos" INTEGER NOT NULL DEFAULT 20,
    "inscritos" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'programada',

    CONSTRAINT "capacitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" SERIAL NOT NULL,
    "concepto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "dependencia" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'registrado',
    "comprobante" TEXT,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE INDEX "usuarios_role_idx" ON "usuarios"("role");

-- CreateIndex
CREATE UNIQUE INDEX "modalidades_nombre_key" ON "modalidades"("nombre");

-- CreateIndex
CREATE INDEX "programas_modalidadId_idx" ON "programas"("modalidadId");

-- CreateIndex
CREATE UNIQUE INDEX "programas_modalidadId_nombre_key" ON "programas"("modalidadId", "nombre");

-- CreateIndex
CREATE INDEX "materias_programaId_semestre_idx" ON "materias"("programaId", "semestre");

-- CreateIndex
CREATE UNIQUE INDEX "materias_programaId_codigo_key" ON "materias"("programaId", "codigo");

-- CreateIndex
CREATE INDEX "horarios_materiaId_idx" ON "horarios"("materiaId");

-- CreateIndex
CREATE UNIQUE INDEX "procesos_admision_nombre_key" ON "procesos_admision"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "aspirantes_documento_key" ON "aspirantes"("documento");

-- CreateIndex
CREATE INDEX "aspirantes_procesoId_idx" ON "aspirantes"("procesoId");

-- CreateIndex
CREATE INDEX "aspirantes_programaId_idx" ON "aspirantes"("programaId");

-- CreateIndex
CREATE INDEX "aspirantes_estado_idx" ON "aspirantes"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_documento_key" ON "estudiantes"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_aspiranteId_key" ON "estudiantes"("aspiranteId");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_usuarioId_key" ON "estudiantes"("usuarioId");

-- CreateIndex
CREATE INDEX "estudiantes_programaId_idx" ON "estudiantes"("programaId");

-- CreateIndex
CREATE INDEX "estudiantes_estado_idx" ON "estudiantes"("estado");

-- CreateIndex
CREATE INDEX "pagos_estudianteId_idx" ON "pagos"("estudianteId");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- CreateIndex
CREATE INDEX "notas_estudianteId_idx" ON "notas"("estudianteId");

-- CreateIndex
CREATE INDEX "notas_profesor_idx" ON "notas"("profesor");

-- CreateIndex
CREATE UNIQUE INDEX "notas_estudianteId_periodo_codigo_key" ON "notas"("estudianteId", "periodo", "codigo");

-- CreateIndex
CREATE INDEX "cursos_codigo_idx" ON "cursos"("codigo");

-- CreateIndex
CREATE INDEX "cursos_docenteId_idx" ON "cursos"("docenteId");

-- CreateIndex
CREATE INDEX "inscripciones_cursoId_idx" ON "inscripciones"("cursoId");

-- CreateIndex
CREATE INDEX "inscripciones_estudianteId_idx" ON "inscripciones"("estudianteId");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_estudianteId_cursoId_key" ON "inscripciones"("estudianteId", "cursoId");

-- CreateIndex
CREATE INDEX "actividades_cursoId_idx" ON "actividades"("cursoId");

-- CreateIndex
CREATE INDEX "preguntas_actividadId_idx" ON "preguntas"("actividadId");

-- CreateIndex
CREATE INDEX "entregas_actividadId_idx" ON "entregas"("actividadId");

-- CreateIndex
CREATE INDEX "entregas_estudianteId_idx" ON "entregas"("estudianteId");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_actividadId_estudianteId_key" ON "entregas"("actividadId", "estudianteId");

-- CreateIndex
CREATE INDEX "asistencias_sesion_cursoId_idx" ON "asistencias_sesion"("cursoId");

-- CreateIndex
CREATE INDEX "asistencias_registro_estudianteId_idx" ON "asistencias_registro"("estudianteId");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_registro_sesionId_estudianteId_key" ON "asistencias_registro"("sesionId", "estudianteId");

-- CreateIndex
CREATE INDEX "foro_mensajes_cursoId_idx" ON "foro_mensajes"("cursoId");

-- CreateIndex
CREATE INDEX "anuncios_cursoId_idx" ON "anuncios"("cursoId");

-- CreateIndex
CREATE INDEX "certificados_emitidos_estudianteId_idx" ON "certificados_emitidos"("estudianteId");

-- CreateIndex
CREATE INDEX "certificados_emitidos_estado_idx" ON "certificados_emitidos"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_usuarioId_key" ON "docentes"("usuarioId");

-- CreateIndex
CREATE INDEX "docentes_estado_idx" ON "docentes"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_usuarioId_key" ON "empleados"("usuarioId");

-- CreateIndex
CREATE INDEX "empleados_dependencia_idx" ON "empleados"("dependencia");

-- CreateIndex
CREATE INDEX "empleados_estado_idx" ON "empleados"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "nominas_periodo_key" ON "nominas"("periodo");

-- CreateIndex
CREATE INDEX "liquidaciones_empleadoId_idx" ON "liquidaciones"("empleadoId");

-- CreateIndex
CREATE INDEX "liquidaciones_docenteId_idx" ON "liquidaciones"("docenteId");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_nominaId_empleadoId_key" ON "liquidaciones"("nominaId", "empleadoId");

-- CreateIndex
CREATE INDEX "conceptos_liquidacionId_idx" ON "conceptos"("liquidacionId");

-- CreateIndex
CREATE INDEX "novedades_periodo_idx" ON "novedades"("periodo");

-- CreateIndex
CREATE INDEX "novedades_estado_idx" ON "novedades"("estado");

-- CreateIndex
CREATE INDEX "novedades_empleadoId_idx" ON "novedades"("empleadoId");

-- CreateIndex
CREATE INDEX "novedades_docenteId_idx" ON "novedades"("docenteId");

-- CreateIndex
CREATE INDEX "certificados_empleado_empleadoId_idx" ON "certificados_empleado"("empleadoId");

-- CreateIndex
CREATE INDEX "certificados_empleado_tipo_idx" ON "certificados_empleado"("tipo");

-- CreateIndex
CREATE INDEX "movimientos_fecha_idx" ON "movimientos"("fecha");

-- CreateIndex
CREATE INDEX "movimientos_tipo_idx" ON "movimientos"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "config_ponderacion_clave_key" ON "config_ponderacion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "requisitos_documento_clave_key" ON "requisitos_documento"("clave");

-- CreateIndex
CREATE INDEX "convocatorias_estado_idx" ON "convocatorias"("estado");

-- CreateIndex
CREATE INDEX "convocatorias_postulados_convocatoriaId_idx" ON "convocatorias_postulados"("convocatoriaId");

-- CreateIndex
CREATE INDEX "capacitaciones_estado_idx" ON "capacitaciones"("estado");

-- CreateIndex
CREATE INDEX "gastos_categoria_idx" ON "gastos"("categoria");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programas" ADD CONSTRAINT "programas_modalidadId_fkey" FOREIGN KEY ("modalidadId") REFERENCES "modalidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materias" ADD CONSTRAINT "materias_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materias" ADD CONSTRAINT "materias_prerrequisitoId_fkey" FOREIGN KEY ("prerrequisitoId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aspirantes" ADD CONSTRAINT "aspirantes_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "procesos_admision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aspirantes" ADD CONSTRAINT "aspirantes_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_aspiranteId_fkey" FOREIGN KEY ("aspiranteId") REFERENCES "aspirantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas" ADD CONSTRAINT "preguntas_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_sesion" ADD CONSTRAINT "asistencias_sesion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_registro" ADD CONSTRAINT "asistencias_registro_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "asistencias_sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_registro" ADD CONSTRAINT "asistencias_registro_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foro_mensajes" ADD CONSTRAINT "foro_mensajes_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_emitidos" ADD CONSTRAINT "certificados_emitidos_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docentes" ADD CONSTRAINT "docentes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos" ADD CONSTRAINT "conceptos_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "liquidaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "nominas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_empleado" ADD CONSTRAINT "certificados_empleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_empleado" ADD CONSTRAINT "certificados_empleado_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "nominas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_empleado" ADD CONSTRAINT "certificados_empleado_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "liquidaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_empleado" ADD CONSTRAINT "certificados_empleado_emitidoPor_fkey" FOREIGN KEY ("emitidoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatorias_postulados" ADD CONSTRAINT "convocatorias_postulados_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "convocatorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

