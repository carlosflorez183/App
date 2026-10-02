/* =============================================
   Rutas de catálogo académico: modalidades,
   programas y planes de estudio (pensum).
   ============================================= */
import { prisma } from '../config.js';

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
}
