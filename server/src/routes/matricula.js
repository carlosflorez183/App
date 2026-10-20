/* =============================================
   Rutas de catálogo académico: modalidades,
   programas y planes de estudio (pensum).
   ============================================= */
import { prisma } from '../config.js';

/* Periodo que se matricula y tope de créditos por semestre. Es el mismo tope
   que valida el portal (23): la API no debe aceptar lo que la vista rechaza. */
const PERIODO_MATRICULA = '2026-2';
const MAX_CREDITOS = 23;

export default async function rutasMatricula(app) {
  const soloAutenticado = { preHandler: [app.autenticar] };

  app.get('/modalidades', soloAutenticado, async () =>
    prisma.modalidad.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { programas: { where: { activo: true } } } } },
    })
  );

  app.get('/programas', soloAutenticado, async (req) => {
    const q = req.query || {};
    return prisma.programa.findMany({
      where: {
        activo: true,
        ...(q.modalidadId ? { modalidadId: Number(q.modalidadId) } : {}),
        ...(q.buscar ? { nombre: { contains: q.buscar, mode: 'insensitive' } } : {}),
      },
      orderBy: { id: 'asc' },
      include: { modalidad: { select: { id: true, nombre: true } } },
    });
  });

  /* Plan de estudios de un programa: materias agrupadas por semestre. */
  app.get('/programas/:id/materias', soloAutenticado, async (req, reply) => {
    const programaId = Number(req.params.id);
    const programa = await prisma.programa.findUnique({ where: { id: programaId } });
    if (!programa) return reply.code(404).send({ error: 'Programa no encontrado' });

    const materias = await prisma.materia.findMany({
      where: { programaId },
      orderBy: [{ semestre: 'asc' }, { codigo: 'asc' }],
      include: { horarios: { orderBy: { id: 'asc' } } },
    });

    const porSemestre = new Map();
    for (const m of materias) {
      if (!porSemestre.has(m.semestre)) porSemestre.set(m.semestre, []);
      porSemestre.get(m.semestre).push(m);
    }

    return {
      programa,
      totalMaterias: materias.length,
      totalCreditos: materias.reduce((a, m) => a + m.creditos, 0),
      semestres: [...porSemestre.entries()].map(([semestre, lista]) => ({
        semestre,
        creditos: lista.reduce((a, m) => a + m.creditos, 0),
        materias: lista,
      })),
    };
  });

  /* Matricula de verdad: guarda las materias elegidas como filas de notas del
     estudiante en el periodo en curso. Antes la vista solo cambiaba un estado
     local y al recargar la matrícula desaparecía. */
  app.post(
    '/matricula',
    {
      preHandler: [app.autenticar, app.requiereRoles('estudiante')],
      schema: {
        body: {
          type: 'object',
          required: ['materiaIds'],
          additionalProperties: false,
          properties: {
            materiaIds: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              uniqueItems: true,
              items: { type: 'integer', minimum: 1 },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const estudiante = await prisma.estudiante.findFirst({
        where: { usuarioId: req.usuario.id },
      });
      if (!estudiante) {
        return reply.code(403).send({ error: 'Solo un estudiante puede matricular materias' });
      }

      /* La matrícula se habilita cuando Admisiones valida el expediente de
         documentos del estudiante. Hasta entonces el portal no deja matricular
         (ni la vista ni la API). */
      if (estudiante.documentos !== 'completo') {
        return reply.code(403).send({
          error: 'Tu expediente de documentos aún no está validado por Admisiones: allí podrás ver si falta algo.',
        });
      }

      const ids = [...new Set(req.body.materiaIds)];
      const materias = await prisma.materia.findMany({ where: { id: { in: ids } } });
      if (materias.length !== ids.length) {
        return reply.code(400).send({ error: 'Alguna de las materias seleccionadas no existe' });
      }

      const bloqueadas = materias.filter((m) => m.estado === 'bloqueada');
      if (bloqueadas.length) {
        return reply.code(400).send({
          error: `Hay materias bloqueadas: ${bloqueadas.map((m) => m.nombre).join(', ')}`,
        });
      }

      const totalCreditos = materias.reduce((a, m) => a + m.creditos, 0);
      if (totalCreditos > MAX_CREDITOS) {
        return reply.code(400).send({
          error: `No puedes superar ${MAX_CREDITOS} créditos (seleccionaste ${totalCreditos}).`,
        });
      }

      /* Upsert por la clave única (estudiante, periodo, código): repetir la
         matrícula actualiza la materia en vez de duplicarla. */
      await prisma.$transaction(
        materias.map((m) =>
          prisma.nota.upsert({
            where: {
              estudianteId_periodo_codigo: {
                estudianteId: estudiante.id,
                periodo: PERIODO_MATRICULA,
                codigo: m.codigo,
              },
            },
            create: {
              estudianteId: estudiante.id,
              programaId: estudiante.programaId,
              codigo: m.codigo,
              nombre: m.nombre,
              creditos: m.creditos,
              profesor: m.profesor,
              estado: 'en_curso',
              periodo: PERIODO_MATRICULA,
            },
            update: { nombre: m.nombre, creditos: m.creditos, profesor: m.profesor },
          })
        )
      );

      /* Al matricular materias el estudiante deja de estar "en ingreso": con
         eso se le abren los cursos y el resto del portal. */
      if (estudiante.estado === 'en_inscripcion') {
        await prisma.estudiante.update({
          where: { id: estudiante.id },
          data: { estado: 'matriculado' },
        });
      }

      return {
        ok: true,
        periodo: PERIODO_MATRICULA,
        totalCreditos,
        matriculadas: materias.map((m) => ({
          codigo: m.codigo,
          nombre: m.nombre,
          creditos: m.creditos,
        })),
      };
    }
  );
}
