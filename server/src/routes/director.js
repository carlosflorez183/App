/* =============================================
   Módulo del Director de programa.
   El director (rol 'director') gestiona SOLO el
   programa que tiene asignado (usuario.programaId):
   configura los cursos (cupo, modo de acceso y
   docente), consulta estudiantes y docentes y puede
   matricular estudiantes manualmente.
   ============================================= */
import { prisma } from '../config.js';
import { PERIODO_CAMPUS } from '../periodos.js';

/* Situación de matrícula del estudiante, igual que la ve Admisiones. Prioriza
   los bloqueos duros (documentos, cuenta) sobre el financiero. */
function situacion(e) {
  if (e.estado === 'en_inscripcion' && e.documentos !== 'completo') return 'bloqueado';
  if (e.estado === 'retirado') return 'retirado';
  if (e.estado === 'graduado') return 'graduado';
  if (!e.usuarioId) return 'sin_cuenta';
  if (e.usuario && e.usuario.activo === false) return 'inactivo';
  if (e.pagos.some((p) => p.estado === 'vencido')) return 'mora';
  return 'habilitado';
}

export default async function rutasDirector(app) {
  const guard = {
    preHandler: [app.autenticar, app.requiereRoles('director')],
  };

  /* El programa del director viene de su cuenta. Sin programa no puede operar:
     403 en vez de mostrarle datos de toda la institución. */
  async function programaDelDirector(req, reply) {
    const programaId = req.usuario.programaId;
    if (!programaId) {
      reply.code(403).send({ error: 'Su cuenta de director no tiene un programa asignado' });
      return null;
    }
    const programa = await prisma.programa.findUnique({
      where: { id: programaId },
      include: { modalidad: true },
    });
    if (!programa) {
      reply.code(404).send({ error: 'El programa asignado no existe' });
      return null;
    }
    return programa;
  }

  /* ── Resumen del programa ─────────────────────────────────────────────── */
  app.get('/director/resumen', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const [estudiantes, cursos, docentes] = await Promise.all([
      prisma.estudiante.groupBy({
        by: ['estado'],
        where: { programaId: programa.id },
        _count: { _all: true },
      }),
      prisma.curso.findMany({
        where: { programaId: programa.id },
        include: { _count: { select: { inscripciones: true } } },
      }),
      prisma.curso.findMany({
        where: { programaId: programa.id, docenteId: { not: null } },
        select: { docenteId: true },
        distinct: ['docenteId'],
      }),
    ]);

    return {
      programa: {
        id: programa.id,
        nombre: programa.nombre,
        facultad: programa.facultad,
        modalidad: programa.modalidad?.nombre || null,
        semestres: programa.semestres,
        creditos: programa.creditos,
        cupo: programa.cupo,
        matriculados: programa.matriculados,
      },
      estudiantes: {
        total: estudiantes.reduce((a, e) => a + e._count._all, 0),
        porEstado: Object.fromEntries(estudiantes.map((e) => [e.estado, e._count._all])),
      },
      cursos: {
        total: cursos.length,
        inscritos: cursos.reduce((a, c) => a + c._count.inscripciones, 0),
        auto: cursos.filter((c) => c.modoAcceso === 'auto').length,
        manual: cursos.filter((c) => c.modoAcceso === 'manual').length,
      },
      docentes: docentes.length,
    };
  });

  /* ── Cursos del programa (para configurar) ────────────────────────────── */
  app.get('/director/cursos', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const cursos = await prisma.curso.findMany({
      where: { programaId: programa.id },
      orderBy: [{ semestre: 'asc' }, { codigo: 'asc' }],
      include: { _count: { select: { inscripciones: true } } },
    });
    const docentes = await prisma.docente.findMany({ orderBy: { nombre: 'asc' } });

    return {
      cursos: cursos.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        codigo: c.codigo,
        grupo: c.grupo,
        semestre: c.semestre,
        profesor: c.profesor,
        docenteId: c.docenteId,
        modoAcceso: c.modoAcceso,
        cupo: c.cupo,
        inscritos: c._count.inscripciones,
      })),
      docentes: docentes.map((d) => ({ id: d.id, nombre: d.nombre, area: d.area })),
    };
  });

  /* El director solo cambia cupo, modo de acceso y docente: nombre, grupo y
     semestre son del plan de estudios y no de su incumbencia. */
  app.patch('/director/cursos/:id', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const cursoId = Number(req.params.id);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso || curso.programaId !== programa.id) {
      return reply.code(404).send({ error: 'Ese curso no pertenece a su programa' });
    }

    const { cupo, modoAcceso, docenteId } = req.body || {};
    const data = {};
    if (cupo !== undefined) {
      if (cupo === '' || cupo === null) {
        data.cupo = null;
      } else {
        const n = Number(cupo);
        if (!Number.isInteger(n) || n < 0) {
          return reply.code(400).send({ error: 'El cupo debe ser un entero no negativo' });
        }
        data.cupo = n;
      }
    }
    if (modoAcceso !== undefined) {
      if (!['auto', 'manual'].includes(modoAcceso)) {
        return reply.code(400).send({ error: "El modo de acceso debe ser 'auto' o 'manual'" });
      }
      data.modoAcceso = modoAcceso;
    }
    if (docenteId !== undefined) {
      if (docenteId === '' || docenteId === null) {
        data.docenteId = null;
      } else {
        const docente = await prisma.docente.findUnique({ where: { id: String(docenteId) } });
        if (!docente) return reply.code(400).send({ error: 'Ese docente no existe' });
        data.docenteId = docente.id;
        data.profesor = docente.nombre;
      }
    }
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });

    const actualizado = await prisma.curso.update({ where: { id: cursoId }, data });
    return {
      id: actualizado.id,
      nombre: actualizado.nombre,
      modoAcceso: actualizado.modoAcceso,
      cupo: actualizado.cupo,
      docenteId: actualizado.docenteId,
      profesor: actualizado.profesor,
    };
  });

  /* ── Estudiantes del programa (con situación de matrícula) ────────────── */
  app.get('/director/estudiantes', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const q = req.query || {};
    const estudiantes = await prisma.estudiante.findMany({
      where: {
        programaId: programa.id,
        ...(q.estado ? { estado: q.estado } : {}),
        ...(q.semestre ? { semestre: Number(q.semestre) } : {}),
      },
      orderBy: [{ semestre: 'asc' }, { nombre: 'asc' }],
      include: {
        usuario: { select: { usuario: true, activo: true } },
        pagos: { select: { estado: true } },
      },
    });
    return estudiantes.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      documento: e.documento,
      correo: e.correo,
      semestre: e.semestre,
      estado: e.estado,
      documentos: e.documentos,
      usuario: e.usuario?.usuario || null,
      usuarioActivo: e.usuario?.activo ?? null,
      situacion: situacion(e),
    }));
  });

  /* ── Docentes con carga en el programa ────────────────────────────────── */
  app.get('/director/docentes', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const cursos = await prisma.curso.findMany({
      where: { programaId: programa.id, docenteId: { not: null } },
      select: { docenteId: true, id: true, nombre: true, codigo: true, grupo: true },
    });
    const ids = [...new Set(cursos.map((c) => c.docenteId))];
    const docentes = ids.length
      ? await prisma.docente.findMany({ where: { id: { in: ids } }, orderBy: { nombre: 'asc' } })
      : [];
    return docentes.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      area: d.area,
      titulo: d.titulo,
      email: d.email,
      estado: d.estado,
      cursos: cursos
        .filter((c) => c.docenteId === d.id)
        .map((c) => ({ id: c.id, nombre: c.nombre, codigo: c.codigo, grupo: c.grupo })),
    }));
  });

  /* ── Matrícula manual: candidatos e inscripción ───────────────────────── */
  app.get('/director/cursos/:cursoId/estudiantes', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso || curso.programaId !== programa.id) {
      return reply.code(404).send({ error: 'Ese curso no pertenece a su programa' });
    }

    const inscripciones = await prisma.inscripcion.findMany({
      where: { cursoId, periodo: PERIODO_CAMPUS, estado: { not: 'retirado' } },
      orderBy: { inscritoEn: 'asc' },
      include: { estudiante: { include: { programa: true } } },
    });

    return {
      cursoId,
      periodo: PERIODO_CAMPUS,
      total: inscripciones.length,
      contadorCurso: await prisma.inscripcion.count({ where: { cursoId, periodo: PERIODO_CAMPUS } }),
      estudiantes: inscripciones.map((i) => ({
        estudianteId: i.estudianteId,
        id: i.estudianteId,
        nombre: i.estudiante.nombre,
        codigo: i.estudiante.documento,
        documento: i.estudiante.documento,
        programa: i.estudiante.programa?.nombre || null,
        semestre: i.estudiante.semestre,
        estado: i.estado,
      })),
    };
  });

  app.get('/director/cursos/:cursoId/candidatos', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso || curso.programaId !== programa.id) {
      return reply.code(404).send({ error: 'Ese curso no pertenece a su programa' });
    }

    const yaEsta = await prisma.inscripcion.findMany({
      where: { cursoId, periodo: PERIODO_CAMPUS },
      select: { estudianteId: true },
    });
    const candidatos = await prisma.estudiante.findMany({
      where: {
        estado: { notIn: ['retirado', 'graduado'] },
        id: { notIn: yaEsta.map((i) => i.estudianteId) },
      },
      orderBy: { nombre: 'asc' },
      include: { programa: { select: { nombre: true } } },
    });
    /* Los estudiantes del propio programa salen primero: son los que el
       director matricula normalmente. Los de otros programas quedan
       marcados por si el curso es transversal. */
    return candidatos
      .map((e) => ({
        estudianteId: e.id,
        nombre: e.nombre,
        documento: e.documento,
        programa: e.programa?.nombre || null,
        esPropio: e.programaId === programa.id,
        semestre: e.semestre,
      }))
      .sort((a, b) => Number(b.esPropio) - Number(a.esPropio) || a.nombre.localeCompare(b.nombre));
  });

  app.post('/director/cursos/:cursoId/estudiantes', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso || curso.programaId !== programa.id) {
      return reply.code(404).send({ error: 'Ese curso no pertenece a su programa' });
    }

    const estudianteId = String(req.body?.estudianteId || '').trim();
    if (!estudianteId) return reply.code(400).send({ error: 'Falta el estudiante a inscribir' });
    const est = await prisma.estudiante.findUnique({ where: { id: estudianteId } });
    if (!est) return reply.code(404).send({ error: 'Ese estudiante no existe' });

    const repetida = await prisma.inscripcion.findUnique({
      where: { estudianteId_cursoId: { estudianteId, cursoId } },
    });
    if (repetida) return reply.code(409).send({ error: `${est.nombre} ya está en este curso` });

    if (curso.cupo != null) {
      const inscritos = await prisma.inscripcion.count({
        where: { cursoId, periodo: PERIODO_CAMPUS },
      });
      if (inscritos >= curso.cupo) {
        return reply.code(409).send({ error: `El curso alcanzó su cupo (${curso.cupo})` });
      }
    }

    await prisma.inscripcion.create({
      data: { estudianteId, cursoId, periodo: PERIODO_CAMPUS, estado: 'matriculado' },
    });

    const nota = await prisma.nota.findUnique({
      where: { estudianteId_periodo_codigo: { estudianteId, periodo: PERIODO_CAMPUS, codigo: curso.codigo } },
    });
    if (!nota) {
      await prisma.nota.create({
        data: {
          estudianteId,
          programaId: est.programaId,
          codigo: curso.codigo,
          nombre: curso.nombre,
          creditos: 4,
          profesor: curso.profesor,
          estado: 'en_curso',
          periodo: PERIODO_CAMPUS,
        },
      });
    }

    const total = await prisma.inscripcion.count({ where: { cursoId, periodo: PERIODO_CAMPUS } });
    await prisma.curso.update({ where: { id: cursoId }, data: { estudiantes: total } });
    return { ok: true, estudianteId, nombre: est.nombre, total };
  });

  app.delete('/director/cursos/:cursoId/estudiantes/:estudianteId', guard, async (req, reply) => {
    const programa = await programaDelDirector(req, reply);
    if (!programa) return;

    const cursoId = Number(req.params.cursoId);
    const estudianteId = String(req.params.estudianteId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso || curso.programaId !== programa.id) {
      return reply.code(404).send({ error: 'Ese curso no pertenece a su programa' });
    }

    const inscripcion = await prisma.inscripcion.findUnique({
      where: { estudianteId_cursoId: { estudianteId, cursoId } },
    });
    if (!inscripcion) return reply.code(404).send({ error: 'Ese estudiante no está en el curso' });

    await prisma.inscripcion.delete({ where: { id: inscripcion.id } });
    const total = await prisma.inscripcion.count({ where: { cursoId, periodo: PERIODO_CAMPUS } });
    await prisma.curso.update({ where: { id: cursoId }, data: { estudiantes: total } });
    return { ok: true, total };
  });
}
