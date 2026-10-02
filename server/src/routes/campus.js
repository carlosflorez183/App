/* =============================================
   Rutas del Campus Virtual: cursos, actividades
   y anuncios.
   ============================================= */
import { prisma } from '../config.js';
import { corteDesdeEntregas, cortesDe, definitivaDe, estadoDe, listaCortes, resumenCorte } from '../calificaciones.js';

export default async function rutasCampus(app) {
  const guard = { preHandler: [app.autenticar, app.requiereRoles('estudiante', 'profesor', 'admin')] };

  app.get('/cursos', guard, async (req) => {
    const where = {};
    if (req.usuario.role === 'profesor' && req.usuario.id) {
      const docente = await prisma.docente.findFirst({ where: { usuarioId: req.usuario.id } });
      if (docente) where.docenteId = docente.id;
    }
    const cursos = await prisma.curso.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { actividades: true, anuncios: true } },
      },
    });
    return cursos;
  });

  /* El detalle de curso también se blinda: si es profesor, debe ser su curso. */
  app.get('/cursos/:id', guard, async (req, reply) => {
    const id = Number(req.params.id);
    const curso = await prisma.curso.findUnique({
      where: { id },
      include: {
        actividades: {
          orderBy: [{ corte: 'asc' }, { fechaEntrega: 'asc' }],
          include: { preguntas: { orderBy: { id: 'asc' } } },
        },
        anuncios: { orderBy: { fecha: 'desc' } },
      },
    });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });
    if (req.usuario.role === 'profesor' && req.usuario.id) {
      const docente = await prisma.docente.findFirst({ where: { usuarioId: req.usuario.id } });
      if (docente && curso.docenteId && curso.docenteId !== docente.id) {
        return reply.code(403).send({ error: 'Este curso no le fue asignado' });
      }
    }
    /* El base64 del material de apoyo pesa y la interfaz no lo necesita: el
       nombre y el tamano bastan para mostrarlo, y el contenido se pide aparte
       a /actividades/:id/archivo. Sin esto, cinco actividades con adjuntos
       multiplicarian el tamano de la respuesta del curso. */
    return {
      ...curso,
      actividades: (curso.actividades || []).map((a) => {
        const copia = { ...a };
        delete copia.archivoB64;
        return copia;
      }),
    };
  });

  /* Descarga el material de apoyo que el docente adjunto a la actividad. */
  app.get('/cursos/:cursoId/actividades/:id/archivo', guard, async (req, reply) => {
    const actividad = await prisma.actividad.findFirst({
      where: { id: Number(req.params.id), cursoId: Number(req.params.cursoId) },
      select: { archivo: true, archivoB64: true, archivoMime: true },
    });
    if (!actividad || !actividad.archivoB64) {
      return reply.code(404).send({ error: 'Esta actividad no tiene archivo adjunto' });
    }
    return reply
      .header('content-type', actividad.archivoMime || 'application/octet-stream')
      .header('content-disposition', `attachment; filename="${encodeURIComponent(actividad.archivo || 'material')}"`)
      .send(Buffer.from(actividad.archivoB64, 'base64'));
  });

  /* ── Docencia: todo lo que crea o edita el docente ───────────────────── */
  /* Los estudiantes consultan; solo profesor y admin escriben. Un profesor
     solo puede escribir en SUS cursos, no en los de otro docente. */
  async function esTitular(req, cursoId) {
    if (req.usuario.role === 'admin') return true;
    if (req.usuario.role !== 'profesor') return false;
    const docente = await prisma.docente.findFirst({ where: { usuarioId: req.usuario.id } });
    if (!docente) return false;
    const curso = await prisma.curso.findUnique({ where: { id: Number(cursoId) }, select: { docenteId: true } });
    return !!curso && curso.docenteId === docente.id;
  }

  /* Se usa como preHandler: exige rol de escritura Y ser el docente titular. */
  async function soloSuCurso(req, reply) {
    if (!(await esTitular(req, req.params.cursoId))) {
      return reply.code(403).send({ error: 'Solo el docente titular de este curso puede modificarlo' });
    }
  }

  const docente = {
    preHandler: [app.autenticar, app.requiereRoles('profesor', 'admin'), soloSuCurso],
  };

  const TIPOS = ['actividad', 'tarea', 'taller', 'proyecto', 'informe', 'parcial', 'foro', 'quiz'];

  /* ── Quién es el docente de cada curso ─────────────────────────────────
     Durante mucho tiempo esta asignación solo la hacía el seed, así que un
     profesor nuevo no tenía ningún curso y la aplicación no tenía forma de
     decírselo a nadie. Ahora la asignan el administrador y la dirección
     (rectoría), que es quien reparte la carga académica. */
  const puedeAsignarDocente = {
    preHandler: [app.autenticar, app.requiereRoles('admin', 'rectoria')],
  };

  /* Todos los cursos con su docente, para la pantalla de reparto. La lista no
     se filtra por titular: aquí se ven justamente los que están sin dueño. */
  app.get('/cursos/docentes/asignacion', puedeAsignarDocente, async () => {
    const [cursos, docentes] = await Promise.all([
      prisma.curso.findMany({
        orderBy: { id: 'asc' },
        include: { _count: { select: { inscripciones: true, actividades: true } } },
      }),
      prisma.docente.findMany({ orderBy: { nombre: 'asc' } }),
    ]);
    return {
      cursos: cursos.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        codigo: c.codigo,
        grupo: c.grupo,
        icono: c.icono,
        profesor: c.profesor,
        docenteId: c.docenteId,
        estudiantes: c._count.inscripciones,
        actividades: c._count.actividades,
      })),
      docentes: docentes.map((d) => ({
        id: d.id, nombre: d.nombre, area: d.area, titulo: d.titulo, estado: d.estado,
        cursos: cursos.filter((c) => c.docenteId === d.id).length,
      })),
    };
  });

  app.patch('/cursos/:id/docente', puedeAsignarDocente, async (req, reply) => {
    const cursoId = Number(req.params.id);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const { docenteId } = req.body || {};
    /* Cadena vacia = dejar el curso sin docente, que es una decisión válida
       ("este curso todavía no tiene profesor"), no un error. */
    if (docenteId === '' || docenteId === null) {
      return prisma.curso.update({ where: { id: cursoId }, data: { docenteId: null } });
    }
    const docente = await prisma.docente.findUnique({ where: { id: String(docenteId) } });
    if (!docente) return reply.code(400).send({ error: 'Ese docente no existe' });

    /* Al asignar se actualiza también el nombre desnormalizado: otras partes
       del sistema lo comparan por texto y si se queda viejo aparecen reportes
       que dicen que el curso es de otro profesor. */
    return prisma.curso.update({
      where: { id: cursoId },
      data: { docenteId: docente.id, profesor: docente.nombre },
    });
  });

  /* Crea una actividad, un parcial (con preguntas) o un foro. */
  app.post('/cursos/:cursoId/actividades', docente, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const { titulo, tipo, corte, fechaEntrega, fechaInicio, fechaCierre, descripcion, puntos, preguntas } = req.body || {};
    if (!titulo || !String(titulo).trim()) {
      return reply.code(400).send({ error: 'El título es obligatorio' });
    }
    if (!tipo || !TIPOS.includes(tipo)) {
      return reply.code(400).send({ error: `Tipo no válido. Use uno de: ${TIPOS.join(', ')}` });
    }
    const puntaje = Number(puntos);
    if (!Number.isFinite(puntaje) || puntaje < 0) {
      return reply.code(400).send({ error: 'Los puntos deben ser un número igual o mayor que cero' });
    }

    const listaPreguntas = Array.isArray(preguntas) ? preguntas : [];
    if (tipo === 'parcial' && listaPreguntas.length === 0) {
      return reply.code(400).send({ error: 'Un parcial debe tener al menos una pregunta' });
    }
    for (const [i, p] of listaPreguntas.entries()) {
      if (!p?.enunciado || !String(p.enunciado).trim()) {
        return reply.code(400).send({ error: `La pregunta ${i + 1} no tiene enunciado` });
      }
      if (!Array.isArray(p.opciones) || p.opciones.length < 2) {
        return reply.code(400).send({ error: `La pregunta ${i + 1} necesita al menos 2 opciones` });
      }
      const correcta = Number(p.correcta);
      if (!Number.isInteger(correcta) || correcta < 0 || correcta >= p.opciones.length) {
        return reply.code(400).send({ error: `La respuesta correcta de la pregunta ${i + 1} no es válida` });
      }
    }

    /* Las tres fechas de la actividad. La entrega es la que ve el estudiante y
       por eso tambien se valida: un `new Date('basura')` terminaria guardado como
       una fecha invalida y se veria como "Invalid Date" en su pantalla. */
    const entrega = fechaEntrega ? new Date(fechaEntrega) : null;
    const apertura = fechaInicio ? new Date(fechaInicio) : null;
    const cierre = fechaCierre ? new Date(fechaCierre) : null;
    for (const [nombre, valor] of [
      ['fecha de entrega', entrega],
      ['fecha de habilitación', apertura],
      ['fecha de cierre', cierre],
    ]) {
      if (valor && Number.isNaN(valor.getTime())) {
        return reply.code(400).send({ error: `La ${nombre} no es una fecha válida` });
      }
    }
    if (apertura && cierre && cierre < apertura) {
      return reply.code(400).send({ error: 'La fecha de cierre no puede ser anterior a la de habilitación' });
    }

    /* Material de apoyo que el docente adjunta al crear la actividad. Llega
       en base64 como el archivo del estudiante; 4 MB es el mismo techo. */
    const archivoB64 = typeof req.body?.archivoB64 === 'string' ? req.body.archivoB64.trim() : '';
    const nombreArchivo = req.body?.archivo ? String(req.body.archivo).trim() : '';
    if (archivoB64.length > 5_600_000) {
      return reply.code(413).send({ error: 'El archivo de apoyo supera el máximo de 4 MB' });
    }

    const actividad = await prisma.actividad.create({
      data: {
        cursoId,
        titulo: String(titulo).trim(),
        tipo,
        corte: Number(corte) || 1,
        descripcion: descripcion ? String(descripcion).trim() : null,
        puntos: puntaje,
        fechaEntrega: entrega,
        fechaInicio: apertura,
        fechaCierre: cierre,
        estadoEst: 'pendiente',
        archivo: archivoB64 ? (nombreArchivo || 'material-de-apoyo') : null,
        archivoB64: archivoB64 || null,
        archivoMime: archivoB64 ? (req.body?.archivoMime ? String(req.body.archivoMime) : 'application/octet-stream') : null,
        archivoTamano: archivoB64 ? Math.floor((archivoB64.length * 3) / 4) : null,
        ...(listaPreguntas.length
          ? {
            preguntas: {
              create: listaPreguntas.map((p) => ({
                enunciado: String(p.enunciado).trim(),
                opciones: p.opciones.map(String),
                correcta: Number(p.correcta),
                puntos: Number(p.puntos) || 1,
              })),
            },
          }
          : {}),
      },
      include: { preguntas: true },
    });
    return reply.code(201).send(actividad);
  });

  app.delete('/cursos/:cursoId/actividades/:id', docente, async (req, reply) => {
    const actividad = await prisma.actividad.findFirst({
      where: { id: Number(req.params.id), cursoId: Number(req.params.cursoId) },
    });
    if (!actividad) return reply.code(404).send({ error: 'Actividad no encontrada' });
    await prisma.actividad.delete({ where: { id: actividad.id } });
    return { ok: true };
  });

  /* ── Asistencia ─────────────────────────────────────────────────────── */
  /* El docente titular ve la hoja completa de cada sesión. El estudiante
     matriculado también entra, pero solo ve SU registro: antes la ruta era
     exclusiva del docente, así que en la pestaña Asistencia del curso el
     alumno se encontraba con la lista vacía y sin ninguna fecha, sin
     explicación de por qué. */
  const lecturaAsistencia = {
    preHandler: [app.autenticar, app.requiereRoles('estudiante', 'profesor', 'admin'), puedeVerRoster],
  };

  app.get('/cursos/:cursoId/asistencias', lecturaAsistencia, async (req, reply) => {
    const sesiones = await prisma.asistenciaSesion.findMany({
      where: { cursoId: Number(req.params.cursoId) },
      orderBy: { fecha: 'desc' },
      include: { registros: { include: { estudiante: { select: { nombre: true, documento: true } } } } },
    });
    if (!sesiones.length) {
      // Se responde 200 con lista vacía: el curso puede existir sin sesiones.
      return reply.code(200).send([]);
    }
    if (req.usuario.role !== 'estudiante') return sesiones;
    /* Al estudiante se le recortan las filas de sus compañeros. */
    const estudiante = await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id } });
    if (!estudiante) return sesiones.map((s) => ({ ...s, registros: [] }));
    return sesiones.map((s) => ({
      ...s,
      registros: s.registros.filter((r) => r.estudianteId === estudiante.id),
    }));
  });

  /* Abre una sesión y precrea un registro por estudiante del programa. */
  app.post('/cursos/:cursoId/asistencias', docente, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const { fecha, tema } = req.body || {};
    if (!fecha) return reply.code(400).send({ error: 'La fecha es obligatoria' });

    /* Los asistentes son los estudiantes MATRICULADOS del curso: se abre la
       sesión con todos en "presente" y el docente marca la ausencia o la
       tardanza. Antes se tomaba cualquier estudiante de la institución y la
       hoja mostraba a gente que nunca estuvo en esa materia. */
    const inscritos = await prisma.inscripcion.findMany({
      where: { cursoId, periodo: '2026-1' },
      select: { estudianteId: true },
    });
    let asistentes = inscritos.map((i) => ({ id: i.estudianteId }));
    if (!asistentes.length) {
      /* Curso sin matrícula todavía: se cae a la lista general para no dejar
         una sesión que no se pueda diligenciar. */
      asistentes = await prisma.estudiante.findMany({
        where: { estado: { not: 'bloqueado' } },
        orderBy: { nombre: 'asc' },
        select: { id: true },
        take: 40,
      });
    }

    const sesion = await prisma.asistenciaSesion.create({
      data: {
        cursoId,
        fecha: new Date(fecha),
        tema: tema ? String(tema).trim() : null,
        registros: {
          create: asistentes.map((e) => ({ estudianteId: e.id, estado: 'presente' })),
        },
      },
      include: { registros: { include: { estudiante: { select: { nombre: true, documento: true } } } } },
    });
    return reply.code(201).send(sesion);
  });

  app.patch('/cursos/:cursoId/asistencias/:sesionId', docente, async (req, reply) => {
    const { fecha, tema, estado } = req.body || {};
    const data = {};
    if (fecha !== undefined) data.fecha = new Date(fecha);
    if (tema !== undefined) data.tema = tema ? String(tema).trim() : null;
    if (estado !== undefined) data.estado = estado;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    const sesion = await prisma.asistenciaSesion.update({
      where: { id: Number(req.params.sesionId) },
      data,
    });
    return sesion;
  });

  app.delete('/cursos/:cursoId/asistencias/:sesionId', docente, async (req) => {
    await prisma.asistenciaSesion.delete({ where: { id: Number(req.params.sesionId) } });
    return { ok: true };
  });

  /* Guarda la asistencia de toda la sesión de una sola vez. */
  app.put('/cursos/:cursoId/asistencias/:sesionId/registros', docente, async (req, reply) => {
    const sesion = await prisma.asistenciaSesion.findFirst({
      where: { id: Number(req.params.sesionId), cursoId: Number(req.params.cursoId) },
    });
    if (!sesion) return reply.code(404).send({ error: 'Sesión no encontrada' });

    const { registros } = req.body || {};
    if (!Array.isArray(registros) || !registros.length) {
      return reply.code(400).send({ error: 'Envie la lista de estudiantes con su estado' });
    }
    const ESTADOS = ['presente', 'tardanza', 'ausente'];
    for (const r of registros) {
      if (!ESTADOS.includes(r.estado)) {
        return reply.code(400).send({ error: `Estado no válido: ${r.estado}. Use ${ESTADOS.join(', ')}` });
      }
    }
    await prisma.$transaction(
      registros.map((r) =>
        prisma.asistenciaRegistro.update({
          where: { sesionId_estudianteId: { sesionId: sesion.id, estudianteId: r.estudianteId } },
          data: {
            estado: r.estado,
            justificacion: r.justificacion ? String(r.justificacion).trim() : null,
          },
        })
      )
    );
    const actualizada = await prisma.asistenciaSesion.findUnique({
      where: { id: sesion.id },
      include: { registros: { include: { estudiante: { select: { nombre: true, documento: true } } } } },
    });
    return actualizada;
  });

  /* ── Foro ────────────────────────────────────────────────────────────── */
  app.get('/cursos/:cursoId/foro', guard, async (req) =>
    prisma.foroMensaje.findMany({
      where: { cursoId: Number(req.params.cursoId) },
      orderBy: { fecha: 'asc' },
    })
  );

  app.post('/cursos/:cursoId/foro', guard, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });
    const { tema, mensaje } = req.body || {};
    if (!mensaje || !String(mensaje).trim()) {
      return reply.code(400).send({ error: 'El mensaje no puede estar vacío' });
    }
    return reply.code(201).send(
      await prisma.foroMensaje.create({
        data: {
          cursoId,
          tema: tema ? String(tema).trim() : 'Sin asunto',
          autor: req.usuario.nombre,
          mensaje: String(mensaje).trim(),
        },
      })
    );
  });

  /* ── Entregas ───────────────────────────────────────────────────────── */
  /* El docente consulta; el estudiante entrega en SU actividad; el docente
     titular califica. Cada ruta repite el filtro de titular cuando hace
     falta, porque no todas pasan por el preHandler `docente`. */
  const lectura = { preHandler: [app.autenticar, app.requiereRoles('estudiante', 'profesor', 'admin')] };

  /* El base64 del archivo pesa y la interfaz nunca lo necesita: la UI pide el
     contenido por separado a .../entregas/:estudianteId/archivo. */
  const sinArchivo = (entrega) => {
    const copia = { ...entrega };
    delete copia.archivoB64;
    return copia;
  };

  /* Para un parcial, convierte { "12": 1 } en una lista ordenada por el orden
     de las preguntas, para que la interfaz no adivine los indices. */
  const leerRespuestas = (actividad, entregas) =>
    entregas.map((e) => {
      let mapa = {};
      if (e.respuestas && typeof e.respuestas === 'object') {
        for (const [preguntaId, elegida] of Object.entries(e.respuestas)) {
          mapa[preguntaId] = Array.isArray(elegida) ? elegida : [elegida];
        }
      }
      return {
        ...e,
        respuestas: mapa,
        aciertos: (actividad.preguntas || []).reduce(
          (n, p) => n + (((mapa[p.id] || []).map(Number).includes(p.correcta)) ? 1 : 0),
          0
        ),
        total: (actividad.preguntas || []).length,
      };
    });

  /* Entregas de una actividad, con el estudiante que las hizo. */
  app.get('/cursos/:cursoId/actividades/:id/entregas', lectura, async (req, reply) => {
    const actividad = await prisma.actividad.findFirst({
      where: { id: Number(req.params.id), cursoId: Number(req.params.cursoId) },
      include: { preguntas: { orderBy: { id: 'asc' } } },
    });
    if (!actividad) return reply.code(404).send({ error: 'Actividad no encontrada' });

    /* El estudiante solo ve la suya. */
    if (req.usuario.role === 'estudiante') {
      const est = await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id } });
      const propia = await prisma.entrega.findUnique({
        where: { actividadId_estudianteId: { actividadId: actividad.id, estudianteId: est?.id || '' } },
        include: { estudiante: { select: { nombre: true, documento: true } } },
      });
      return propia ? [sinArchivo(leerRespuestas(actividad, [propia])[0])] : [];
    }

    const entregas = await prisma.entrega.findMany({
      where: { actividadId: actividad.id },
      orderBy: { entregadoEn: 'desc' },
      include: { estudiante: { select: { nombre: true, documento: true } } },
    });
    return leerRespuestas(actividad, entregas).map(sinArchivo);
  });

  /* Resumen de todas las entregas del curso, agrupado por actividad. Sirve
     para la pestaña Entregas sin pedir una llamada por cada actividad. */
  app.get('/cursos/:cursoId/entregas', lectura, async (req) => {
    const actividades = await prisma.actividad.findMany({
      where: { cursoId: Number(req.params.cursoId) },
      orderBy: [{ corte: 'asc' }, { fechaEntrega: 'asc' }],
      include: {
        preguntas: { orderBy: { id: 'asc' } },
        entregas: {
          orderBy: { entregadoEn: 'desc' },
          include: { estudiante: { select: { nombre: true, documento: true } } },
        },
      },
    });
    return actividades.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      tipo: a.tipo,
      corte: a.corte,
      puntos: a.puntos,
      fechaEntrega: a.fechaEntrega,
      preguntas: a.preguntas.length,
      total: a.entregas.length,
      entregadas: a.entregas.filter((e) => e.estado !== 'pendiente').length,
      calificadas: a.entregas.filter((e) => typeof e.nota === 'number').length,
    }));
  });

  /* El estudiante entrega (o reenvía) su trabajo. El archivo viaja como base64
     dentro del JSON (`archivoB64`), porque así no hace falta una dependencia de
     multipart y el contenido queda guardado junto a la entrega. */
  app.post('/cursos/:cursoId/actividades/:id/entregas', lectura, async (req, reply) => {
    if (req.usuario.role !== 'estudiante') {
      return reply.code(403).send({ error: 'Solo el estudiante entrega' });
    }
    const actividad = await prisma.actividad.findFirst({
      where: { id: Number(req.params.id), cursoId: Number(req.params.cursoId) },
      include: { preguntas: { orderBy: { id: 'asc' } } },
    });
    if (!actividad) return reply.code(404).send({ error: 'Actividad no encontrada' });

    const est = await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id } });
    if (!est) return reply.code(404).send({ error: 'El usuario no es un estudiante' });

    /* La actividad se habilita y se cierra en las fechas que puso el docente:
       antes de habilitar o despues de cerrar no se acepta la entrega. El aviso
       lleva fecha y hora, porque el motivo del rechazo suele ser un minuto. */
    const ahora = new Date();
    const sello = (d) =>
      `${d.toISOString().slice(0, 10)} a las ${d.toISOString().slice(11, 16)}`;
    if (actividad.fechaInicio && ahora < actividad.fechaInicio) {
      return reply.code(409).send({
        error: `Esta actividad se habilita el ${sello(actividad.fechaInicio)}`,
      });
    }
    if (actividad.fechaCierre && ahora > actividad.fechaCierre) {
      return reply.code(409).send({
        error: `Esta actividad se cerró el ${sello(actividad.fechaCierre)}`,
      });
    }

    const { archivo, archivoB64, archivoMime, contenido, respuestas } = req.body || {};
    const hayTexto = contenido && String(contenido).trim();
    const hayB64 = typeof archivoB64 === 'string' && archivoB64.trim();
    const hayArchivo = (hayB64 || (archivo && String(archivo).trim()));
    const esParcial = actividad.tipo === 'parcial';

    /* 4 MB en base64 es ~5.6 MB de JSON: es el techo para no tragar memoria. */
    if (hayB64 && archivoB64.length > 5_600_000) {
      return reply.code(413).send({ error: 'El archivo supera el máximo de 4 MB' });
    }

    /* Un parcial se contesta con las preguntas; el resto con texto o archivo. */
    if (esParcial) {
      if (!respuestas || typeof respuestas !== 'object') {
        return reply.code(400).send({ error: 'Un parcial se entrega contestando las preguntas' });
      }
      const contestadas = actividad.preguntas.filter((p) => {
        const r = respuestas[p.id] ?? respuestas[String(p.id)];
        return r !== undefined && r !== null && r !== '';
      });
      if (!contestadas.length) {
        return reply.code(400).send({ error: 'Responda al menos una pregunta' });
      }
    } else if (!hayTexto && !hayArchivo) {
      return reply.code(400).send({ error: 'Escriba su respuesta o adjunte un archivo' });
    }

    const datos = {
      estado: 'entregado',
      /* Al reenviar sin archivo se borra el anterior: si no, quedaría el
         nombre del archivo viejo junto al contenido nuevo. */
      archivo: hayArchivo ? String(archivo || 'archivo').trim() : null,
      archivoB64: hayB64 ? archivoB64.trim() : null,
      archivoMime: hayB64 ? (archivoMime ? String(archivoMime) : 'application/octet-stream') : null,
      archivoTamano: hayB64 ? Math.floor((archivoB64.trim().length * 3) / 4) : null,
      contenido: hayTexto ? String(hayTexto).trim() : null,
      respuestas: esParcial ? respuestas : null,
      entregadoEn: new Date(),
    };

    const entrega = await prisma.entrega.upsert({
      where: { actividadId_estudianteId: { actividadId: actividad.id, estudianteId: est.id } },
      create: { actividadId: actividad.id, estudianteId: est.id, ...datos },
      update: datos,
      include: { estudiante: { select: { nombre: true, documento: true } } },
    });
    /* Nunca se devuelve el base64 en el listado: pesa y no lo necesita la UI. */
    return reply.code(201).send(sinArchivo(leerRespuestas(actividad, [entrega])[0]));
  });

  /* Descarga el archivo de una entrega. El docente titular lo baja para
     revisar el trabajo; el estudiante descarga el suyo. */
  app.get('/cursos/:cursoId/actividades/:id/entregas/:estudianteId/archivo', lectura, async (req, reply) => {
    const entrega = await prisma.entrega.findFirst({
      where: {
        actividadId: Number(req.params.id),
        estudianteId: String(req.params.estudianteId),
        actividad: { cursoId: Number(req.params.cursoId) },
      },
    });
    if (!entrega) return reply.code(404).send({ error: 'Entrega no encontrada' });
    if (!entrega.archivoB64) return reply.code(404).send({ error: 'Esta entrega no tiene archivo' });

    /* El estudiante solo puede bajar el suyo. */
    if (req.usuario.role === 'estudiante') {
      const est = await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id } });
      if (!est || est.id !== entrega.estudianteId) {
        return reply.code(403).send({ error: 'No puede descargar la entrega de otro estudiante' });
      }
    }

    const nombre = (entrega.archivo || 'archivo').replace(/["\\\r\n]/g, '');
    return reply
      .header('Content-Type', entrega.archivoMime || 'application/octet-stream')
      .header('Content-Length', String(entrega.archivoTamano || 0))
      .header('Content-Disposition', `attachment; filename="${nombre}"`)
      .send(Buffer.from(entrega.archivoB64, 'base64'));
  });

  /* ── Del trabajo al corte ──────────────────────────────────────────────
     Calificar una entrega y el registro de notas eran dos cosas sin
     relación: la nota de un trabajo no llegaba al corte del alumno. Ahora el
     corte es el promedio de TODAS las actividades de ese corte, llevadas a la
     escala de 0 a 5, y lo que el alumno no entregó cuenta cero: por eso
     entregar una sola de tres actividades no puede dar un 5. Si el docente
     escribió ese corte a mano en el registro, su valor manda y no se pisa. */

  /* Los cortes que el docente escribió a mano, en la forma "1,3", y el cálculo
     del corte salen de `calificaciones.js`: el ejemplo de la base y la pantalla
     tienen que contar la misma historia. */

  /* `Actividad.preguntas` vive como texto JSON, pero según de dónde venga el
     curso llega ya como arreglo: `JSON.parse` de un objeto es un error 500. */
  const cuentaPreguntas = (preguntas) => {
    if (!preguntas) return 0;
    if (Array.isArray(preguntas)) return preguntas.length;
    try {
      const lista = JSON.parse(preguntas);
      return Array.isArray(lista) ? lista.length : 0;
    } catch {
      return 0;
    }
  };

  /* Recalcula la definitiva con el peso de cada corte (30%, 30%, 40%). Se usa en
     las dos rutas que escriben notas para que no se comporten distinto. */
  async function recalcularDefinitiva(nota) {
    const definitiva = definitivaDe(nota.nota1, nota.nota2, nota.nota3);
    return prisma.nota.update({
      where: { id: nota.id },
      data: { definitiva, estado: estadoDe(definitiva) },
    });
  }

  /* Escribe el corte calculado desde las entregas, salvo que ese corte esté
     marcado como escrito a mano. Devuelve qué pasó para poder contárselo a la
     persona que califica. */
  async function aplicarCorteDesdeEntregas(estudianteId, curso, corte) {
    const calculo = await corteDesdeEntregas(prisma, estudianteId, curso.id, corte);
    const nota = await prisma.nota.findFirst({
      where: { estudianteId, codigo: curso.codigo, periodo: PERIODO },
    });
    if (!nota || !calculo || !calculo.total || calculo.valor === null) return null;
    if (cortesDe(nota).includes(corte)) {
      return { corte, ...calculo, aplicado: false, motivo: 'manual' };
    }
    const conCorte = await prisma.nota.update({
      where: { id: nota.id },
      data: { [`nota${corte}`]: calculo.valor },
    });
    const actualizada = await recalcularDefinitiva(conCorte);
    return { corte, ...calculo, aplicado: true, nota: actualizada };
  }

  /* El docente califica una entrega concreta. */
  app.patch('/cursos/:cursoId/actividades/:id/entregas/:estudianteId', docente, async (req, reply) => {
    const { nota, comentario } = req.body || {};
    const entrega = await prisma.entrega.findFirst({
      where: {
        actividadId: Number(req.params.id),
        estudianteId: String(req.params.estudianteId),
        actividad: { cursoId: Number(req.params.cursoId) },
      },
      include: { actividad: true },
    });
    if (!entrega) return reply.code(404).send({ error: 'Entrega no encontrada' });

    if (nota !== undefined && nota !== null && (nota < 0 || nota > entrega.actividad.puntos)) {
      return reply.code(400).send({ error: `La nota debe estar entre 0 y ${entrega.actividad.puntos}` });
    }
    const actualizada = await prisma.entrega.update({
      where: { id: entrega.id },
      data: {
        ...(nota !== undefined ? { nota: nota === null ? null : Number(nota) } : {}),
        ...(comentario !== undefined ? { comentario: comentario ? String(comentario).trim() : null } : {}),
        ...(nota !== undefined ? { estado: nota === null ? 'entregado' : 'calificado', calificacionEn: new Date() } : {}),
      },
      include: { estudiante: { select: { nombre: true, documento: true } } },
    });
    /* La nota del trabajo se refleja en el corte del alumno. Se devuelve cómo
       quedó para que la pantalla lo diga, en vez de que el docente wonder por
       qué el registro no se movió. */
    const curso = await prisma.curso.findUnique({ where: { id: Number(req.params.cursoId) }, select: { id: true, codigo: true } });
    const corte = nota === undefined
      ? null
      : await aplicarCorteDesdeEntregas(String(req.params.estudianteId), curso, entrega.actividad.corte);
    return { ...actualizada, corte };
  });

  /* Bandeja de revision del docente: todo lo que sus estudiantes entregaron y
     todavia no tiene nota, de todos sus cursos y en una sola lista. Es lo que
     alimenta la pestaña "Por Calificar" de la barra lateral, que antes
     reutilizaba por error la lista de tareas del estudiante. */
  app.get('/cursos/por-calificar', guard, async (req, reply) => {
    if (!['profesor', 'admin'].includes(req.usuario.role)) {
      return reply.code(403).send({ error: 'Solo el docente revisa entregas' });
    }
    const docente = await prisma.docente.findFirst({ where: { usuarioId: req.usuario.id } });
    if (!docente) return [];

    const entregas = await prisma.entrega.findMany({
      where: {
        /* Solo las de sus cursos, y solo lo entregado: una fila vacia no se
           califica. El nombre del archivo viaja para que la bandeja diga que
           documento es sin abrir el curso. */
        actividad: { curso: { docenteId: docente.id } },
        estado: { not: 'pendiente' },
      },
      orderBy: { entregadoEn: 'desc' },
      include: {
        estudiante: { select: { nombre: true, documento: true } },
        actividad: { select: { id: true, cursoId: true, titulo: true, tipo: true, corte: true, puntos: true } },
      },
    });

    return entregas.map((e) => ({
      entregaId: `${e.actividadId}-${e.estudianteId}`,
      /* El curso viaja en la fila para que la bandeja pueda abrir la hoja del
         estudiante en el curso correcto sin una consulta extra. */
      cursoId: e.actividad.cursoId,
      actividadId: e.actividadId,
      estudianteId: e.estudianteId,
      estudiante: e.estudiante?.nombre || '',
      documento: e.estudiante?.documento || '',
      titulo: e.actividad.titulo,
      tipo: e.actividad.tipo,
      corte: e.actividad.corte,
      puntos: e.actividad.puntos,
      archivo: e.archivo,
      tieneRespuestas: !!(e.respuestas && Object.keys(e.respuestas).length),
      entregadoEn: e.entregadoEn,
      nota: e.nota,
      calificada: typeof e.nota === 'number',
    }));
  });

  /* Califica una entrega. Solo el docente titular o un administrador.
     Este mismo PATCH deja cambiar el material de apoyo de una actividad ya
     creada, para no obligar al docente a borrar y volver a crear la actividad
     cada vez que corrige el enunciado o sube la version nueva del taller. */
  app.patch('/cursos/:cursoId/actividades/:id', docente, async (req, reply) => {
    const { nota, estadoEst, archivo, archivoB64, archivoMime, quitarArchivo } = req.body || {};
    const actividad = await prisma.actividad.findFirst({
      where: { id: Number(req.params.id), cursoId: Number(req.params.cursoId) },
    });
    if (!actividad) return reply.code(404).send({ error: 'Actividad no encontrada' });

    if (nota !== undefined && nota !== null && (nota < 0 || nota > actividad.puntos)) {
      return reply.code(400).send({ error: `La nota debe estar entre 0 y ${actividad.puntos}` });
    }

    const nuevoB64 = typeof archivoB64 === 'string' ? archivoB64.trim() : '';
    if (nuevoB64.length > 5_600_000) {
      return reply.code(413).send({ error: 'El archivo de apoyo supera el máximo de 4 MB' });
    }
    /* `quitarArchivo` es explicito: si el docente no manda contenido nuevo se
       conserva el material que ya estaba, porque este PATCH no debe borrar el
       adjunto por omision. */
    const cambiaMaterial = quitarArchivo === true || nuevoB64.length > 0;

    return prisma.actividad.update({
      where: { id: actividad.id },
      data: {
        ...(nota !== undefined ? { nota: nota === null ? null : Number(nota) } : {}),
        ...(estadoEst ? { estadoEst } : {}),
        ...(cambiaMaterial
          ? nuevoB64
            ? {
              archivo: String(archivo || '').trim() || 'material-de-apoyo',
              archivoB64: nuevoB64,
              archivoMime: archivoMime ? String(archivoMime) : 'application/octet-stream',
              archivoTamano: Math.floor((nuevoB64.length * 3) / 4),
            }
            : { archivo: null, archivoB64: null, archivoMime: null, archivoTamano: null }
          : {}),
      },
    });
  });

  /* ── Los alumnos de un curso y sus notas por corte ─────────────────────
     Estas rutas son las que hacen posible el registro de notas del docente:
     una fila por ESTUDIANTE con sus tres notas de corte. Antes esa pantalla
     no podia existir porque no habia una lista de quien estaba matriculado en
     cada curso: `Curso.estudiantes` era un numero, no un roster. */

  const PERIODO = '2026-1';

  /* Leer la lista de alumnos es distinto de modificarla: el docente titular y
     el administrador la usan para calificar, y el estudiante la ve como
     compañero de clase, pero solo en un curso en el que esté matriculado. */
  async function puedeVerRoster(req, reply) {
    const cursoId = Number(req.params.cursoId);
    if (await esTitular(req, cursoId)) return;
    const estudiante = await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id } });
    const inscrita = estudiante
      ? await prisma.inscripcion.findFirst({ where: { estudianteId: estudiante.id, cursoId, periodo: PERIODO } })
      : null;
    if (!inscrita) {
      return reply.code(403).send({ error: 'Solo los alumnos matriculados pueden ver esta lista' });
    }
  }

  const lecturaRoster = {
    preHandler: [app.autenticar, app.requiereRoles('estudiante', 'profesor', 'admin'), puedeVerRoster],
  };

  /* La lista de alumnos del curso con sus notas. Solo el docente titular: el
     estudiante no necesita ver las notas de sus compañeros. */
  app.get('/cursos/:cursoId/estudiantes', lecturaRoster, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const inscripciones = await prisma.inscripcion.findMany({
      where: { cursoId, periodo: PERIODO, estado: { not: 'retirado' } },
      orderBy: { inscritoEn: 'asc' },
      include: { estudiante: { include: { programa: true } } },
    });

    /* Una sola consulta para todas las notas de corte del curso: preguntar por
       cada alumno por separado son 30 viajes de ida y vuelta por pantalla. */
    const notas = await prisma.nota.findMany({
      where: {
        codigo: curso.codigo,
        periodo: PERIODO,
        estudianteId: { in: inscripciones.map((i) => i.estudianteId) },
      },
    });
    const notaDe = new Map(notas.map((n) => [n.estudianteId, n]));
    const puedeVerNotas = ['profesor', 'admin'].includes(req.usuario.role)
      && (await esTitular(req, cursoId));

    /* De dónde sale cada corte: el promedio de todas las actividades del corte,
       donde lo que el alumno no entregó cuenta cero. La pantalla lo muestra
       para que se entienda por qué un corte se movió al calificar un trabajo y
       para poder devolverlo a "lo que escribí a mano". Dos consultas para todo
       el curso, no una por alumno. */
    const [actividades, entregas] = await Promise.all([
      prisma.actividad.findMany({
        where: { cursoId },
        select: { id: true, corte: true, puntos: true, fechaEntrega: true },
      }),
      prisma.entrega.findMany({
        where: { actividad: { cursoId } },
        select: { estudianteId: true, actividadId: true, nota: true },
      }),
    ]);
    const resumenEntregas = {};
    for (const i of inscripciones) {
      resumenEntregas[i.estudianteId] = Object.fromEntries(
        [1, 2, 3].map((c) => [c, resumenCorte(c, actividades, entregas.filter((e) => e.estudianteId === i.estudianteId))])
      );
    }

    /* El estudiante que pregunta recibe su propia fila de notas: es suyo, no
       de sus compañeros, y el curso lo necesita para mostrarle el corte. */
    const estudianteQuePregunta = req.usuario.role === 'estudiante'
      ? await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id }, select: { id: true } })
      : null;
    const miNota = estudianteQuePregunta ? notaDe.get(estudianteQuePregunta.id) : null;

    return {
      cursoId,
      periodo: PERIODO,
      total: inscripciones.length,
      /* El contador de la cabecera se recalcula desde la lista real: si el
         número del mock y la lista no coinciden, la cabecera miente. */
      contadorCurso: await prisma.inscripcion.count({ where: { cursoId, periodo: PERIODO } }),
      ...(miNota
        ? {
          miNota: {
            estudianteId: miNota.estudianteId,
            nota1: miNota.nota1 ?? null,
            nota2: miNota.nota2 ?? null,
            nota3: miNota.nota3 ?? null,
            definitiva: miNota.definitiva ?? null,
            estado: miNota.estado,
          },
          /* Como se armo cada uno de sus cortes. El alumno necesita esto para
             entender que un 1,7 no es una nota mal puesta sino el promedio de
             tres actividades de las que entrego una. */
          miCorte: resumenEntregas[miNota.estudianteId] || {},
        }
        : {}),
      estudiantes: inscripciones.map((i) => {
        const n = notaDe.get(i.estudianteId);
        return {
          estudianteId: i.estudianteId,
          nombre: i.estudiante.nombre,
          documento: i.estudiante.documento,
          programa: i.estudiante.programa?.nombre || null,
          semestre: i.estudiante.semestre,
          estado: i.estado,
          /* Las notas solo le interesa al docente que califica: el estudiante
             ve la lista de la clase, no el acumulado de sus compañeros. */
          ...(puedeVerNotas
            ? {
              nota1: n?.nota1 ?? null,
              nota2: n?.nota2 ?? null,
              nota3: n?.nota3 ?? null,
              definitiva: n?.definitiva ?? null,
              /* Los cortes escritos a mano y de qué media salen los demás. */
              cortesManuales: n?.cortesManuales || '',
              desdeEntregas: resumenEntregas[i.estudianteId] || {},
            }
            : {}),
        };
      }),
    };
  });

  /* Las notas del propio estudiante en cada actividad del curso. El corte del
     encabezado sale del roster; esto responde "¿qué nota llevo en ESTA
     actividad?", que antes se contestaba con la nota única del curso y salía
     la misma para todos los alumnos. */
  app.get('/cursos/:cursoId/mis-notas', lecturaRoster, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });
    const estudiante = await prisma.estudiante.findFirst({
      where: { usuarioId: req.usuario.id },
      select: { id: true },
    });
    if (!estudiante) return reply.code(404).send({ error: 'El usuario no es un estudiante' });

    const [entregas, actividades] = await Promise.all([
      prisma.entrega.findMany({
        where: { estudianteId: estudiante.id, actividad: { cursoId } },
        orderBy: { actividad: { corte: 'asc' } },
        select: {
          estado: true,
          nota: true,
          entregadoEn: true,
          actividad: { select: { id: true, titulo: true, tipo: true, corte: true, puntos: true, preguntas: true } },
        },
      }),
      /* Las actividades del curso, incluidas las que el alumno no entregó:
         son las que arman el promedio del corte. */
      prisma.actividad.findMany({
        where: { cursoId },
        select: { id: true, corte: true, puntos: true, fechaEntrega: true },
      }),
    ]);
    const nota = await prisma.nota.findUnique({
      where: { estudianteId_periodo_codigo: { estudianteId: estudiante.id, periodo: PERIODO, codigo: curso.codigo } },
    });
    return {
      cursoId,
      entregas: entregas.map((e) => ({
        actividadId: e.actividad.id,
        titulo: e.actividad.titulo,
        tipo: e.actividad.tipo,
        corte: e.actividad.corte,
        puntos: e.actividad.puntos,
        preguntas: cuentaPreguntas(e.actividad.preguntas),
        estado: e.estado,
        nota: e.nota ?? null,
        entregado: Boolean(e.entregadoEn),
      })),
      miNota: nota
        ? {
          nota1: nota.nota1 ?? null,
          nota2: nota.nota2 ?? null,
          nota3: nota.nota3 ?? null,
          definitiva: nota.definitiva ?? null,
          cortesManuales: nota.cortesManuales || '',
        }
        : null,
      /* Como se armó cada corte, con las reglas del servidor. El alumno lo
         necesita para entender su nota ("de 3 actividades solo entregué una")
         y así no tiene que mirar la lista de la clase ni ver notas ajenas. */
      miCorte: Object.fromEntries(
        [1, 2, 3].map((c) => [
          c,
          resumenCorte(
            c,
            actividades,
            entregas.map((e) => ({ estudianteId: estudiante.id, actividadId: e.actividad.id, nota: e.nota })),
          ),
        ])
      ),
    };
  });

  /* Estudiantes que todavia NO estan en el curso, para el selector de
     inscripción. Sin este listado el docente tendria que escribir el código a
     mano y podria inscribed dos veces al mismo alumno. */
  app.get('/cursos/:cursoId/candidatos', docente, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const yaEsta = await prisma.inscripcion.findMany({
      where: { cursoId, periodo: PERIODO },
      select: { estudianteId: true },
    });
    const candidatos = await prisma.estudiante.findMany({
      where: {
        estado: { notIn: ['retirado', 'graduado'] },
        id: { notIn: yaEsta.map((i) => i.estudianteId) },
      },
      orderBy: { nombre: 'asc' },
      include: { programa: true },
    });
    return candidatos.map((e) => ({
      estudianteId: e.id,
      nombre: e.nombre,
      documento: e.documento,
      programa: e.programa?.nombre || null,
      semestre: e.semestre,
    }));
  });

  /* Inscribe a un estudiante. Se le crea su fila de notas del curso para que
     aparezca en el registro aunque todavia no tenga ninguna nota puesta. */
  app.post('/cursos/:cursoId/estudiantes', docente, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const estudianteId = String(req.body?.estudianteId || '').trim();
    if (!estudianteId) return reply.code(400).send({ error: 'Falta el estudiante a inscribir' });

    const est = await prisma.estudiante.findUnique({ where: { id: estudianteId } });
    if (!est) return reply.code(404).send({ error: 'Ese estudiante no existe' });

    const repetida = await prisma.inscripcion.findUnique({
      where: { estudianteId_cursoId: { estudianteId, cursoId } },
    });
    if (repetida) {
      return reply.code(409).send({ error: `${est.nombre} ya está en este curso` });
    }

    await prisma.inscripcion.create({
      data: { estudianteId, cursoId, periodo: PERIODO, estado: 'matriculado' },
    });

    /* Fila de notas del periodo: sin ella el alumno inscrito aparecia en la
       lista pero sin columnas donde escribir. */
    const nota = await prisma.nota.findUnique({
      where: { estudianteId_periodo_codigo: { estudianteId, periodo: PERIODO, codigo: curso.codigo } },
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
          periodo: PERIODO,
        },
      });
    }

    const total = await prisma.inscripcion.count({ where: { cursoId, periodo: PERIODO } });
    await prisma.curso.update({ where: { id: cursoId }, data: { estudiantes: total } });
    return { ok: true, estudianteId, nombre: est.nombre, total };
  });

  /* Retira a un estudiante del curso. Las notas no se borran: si vuelve a
    (matricularse mas adelante el docente tiene que ver lo que ya puso. */
  app.delete('/cursos/:cursoId/estudiantes/:estudianteId', docente, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const estudianteId = String(req.params.estudianteId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const inscripcion = await prisma.inscripcion.findUnique({
      where: { estudianteId_cursoId: { estudianteId, cursoId } },
    });
    if (!inscripcion) return reply.code(404).send({ error: 'Ese estudiante no está en el curso' });

    await prisma.inscripcion.delete({ where: { id: inscripcion.id } });
    const total = await prisma.inscripcion.count({ where: { cursoId, periodo: PERIODO } });
    await prisma.curso.update({ where: { id: cursoId }, data: { estudiantes: total } });
    return { ok: true, total };
  });

  /* Guarda la nota de un corte de un alumno. Valida tres cosas que el navegador
     no puede: que el docente sea del curso (viene en el preHandler), que el
     alumno esté matriculado, y que la nota quepa en la escala de 0 a 5. */
  app.patch('/cursos/:cursoId/notas/:estudianteId', docente, async (req, reply) => {
    const cursoId = Number(req.params.cursoId);
    const estudianteId = String(req.params.estudianteId);
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) return reply.code(404).send({ error: 'Curso no encontrado' });

    const inscrito = await prisma.inscripcion.findUnique({
      where: { estudianteId_cursoId: { estudianteId, cursoId } },
    });
    if (!inscrito) {
      return reply.code(400).send({ error: 'El estudiante no está matriculado en este curso' });
    }

    const cuerpo = req.body || {};

    /* "Volver a calcular": el docente suelta la nota que había escrito a mano y
       el corte vuelve a salirse de las entregas ya calificadas. No lleva notas
       de corte en el cuerpo, así que se atiende antes de validarlas. */
    if (cuerpo.recalcular !== undefined) {
      const corte = Number(cuerpo.recalcular);
      if (![1, 2, 3].includes(corte)) {
        return reply.code(400).send({ error: 'Corte inválido' });
      }
      const clave = { estudianteId_periodo_codigo: { estudianteId, periodo: PERIODO, codigo: curso.codigo } };
      const previaRec = await prisma.nota.findUnique({ where: clave });
      const restantes = cortesDe(previaRec || {}).filter((c) => c !== corte);
      if (previaRec) {
        await prisma.nota.update({
          where: clave,
          data: { cortesManuales: restantes.length ? restantes.join(',') : null },
        });
      }
      const aplicado = await aplicarCorteDesdeEntregas(estudianteId, curso, corte);
      const fresco = await prisma.nota.findUnique({ where: clave });
      return {
        estudianteId,
        nota1: fresco?.nota1 ?? null,
        nota2: fresco?.nota2 ?? null,
        nota3: fresco?.nota3 ?? null,
        definitiva: fresco?.definitiva ?? null,
        estado: fresco?.estado ?? 'en_curso',
        cortesManuales: fresco?.cortesManuales || '',
        recalculado: aplicado ? aplicado.valor : null,
      };
    }

    const cortes = {};
    const ETIQUETA = { nota1: 'nota del corte 1', nota2: 'nota del corte 2', nota3: 'nota del corte 3' };
    for (const campo of ['nota1', 'nota2', 'nota3']) {
      if (cuerpo[campo] === undefined) continue;
      const bruto = cuerpo[campo];
      /* Un campo en blanco es "todavia no hay nota", no un cero. Ojo con
         `Number('')`: da 0 y un espacio suelto tambien, asi que sin esta
         comprobacion un docente que aprieta la barra espaciadora le PONIA un
         cero al alumno. */
      if (bruto === null || bruto === undefined || String(bruto).trim() === '') {
        cortes[campo] = null;
        continue;
      }
      /* En Colombia la nota se escribe con coma decimal (4,5). Rechazarla
         obligaba a pelear contra el teclado del docente y ninguna nota se
         guardaba. */
      const valor = Number(String(bruto).trim().replace(',', '.'));
      if (Number.isNaN(valor)) {
        return reply.code(400).send({ error: `La ${ETIQUETA[campo]} no es un número` });
      }
      if (valor < 0 || valor > 5) {
        return reply.code(400).send({ error: `La nota debe estar entre 0 y 5 (llegó ${valor})` });
      }
      cortes[campo] = Math.round(valor * 100) / 100;
    }
    if (Object.keys(cortes).length === 0) {
      return reply.code(400).send({ error: 'No se envió ninguna nota' });
    }

    const previa = await prisma.nota.findUnique({
      where: { estudianteId_periodo_codigo: { estudianteId, periodo: PERIODO, codigo: curso.codigo } },
    });

    const datos = { ...cortes };
    /* La definitiva NO es el promedio plano de los tres cortes: pesa 30%, 30%
       y 40%, como lo pesa la universidad. Con dos de tres cortes no hay nota
       final, y se deja en blanco antes que dejar un numero viejo que ya no
       sale de los cortes que hay. */
    const n1 = cortes.nota1 !== undefined ? cortes.nota1 : previa?.nota1 ?? null;
    const n2 = cortes.nota2 !== undefined ? cortes.nota2 : previa?.nota2 ?? null;
    const n3 = cortes.nota3 !== undefined ? cortes.nota3 : previa?.nota3 ?? null;
    datos.definitiva = definitivaDe(n1, n2, n3);
    datos.estado = estadoDe(datos.definitiva);
    /* Lo que escribe el docente a mano es suyo: queda marcado para que la nota
       de una entrega no lo pise por detrás. */
    const manuales = cortesDe(previa || {});
    const tocados = Object.keys(cortes)
      .map((c) => Number(c.slice(4)))
      .filter((c) => [1, 2, 3].includes(c) && !manuales.includes(c));
    datos.cortesManuales = [...new Set([...manuales, ...tocados])].sort().join(',') || null;

    const nota = previa
      ? await prisma.nota.update({ where: { id: previa.id }, data: datos })
      : await prisma.nota.create({
        data: {
          estudianteId,
          programaId: (await prisma.estudiante.findUnique({ where: { id: estudianteId } }))?.programaId || 1,
          codigo: curso.codigo,
          nombre: curso.nombre,
          creditos: 4,
          profesor: curso.profesor,
          periodo: PERIODO,
          ...datos,
        },
      });

    return {
      estudianteId,
      nota1: nota.nota1 ?? null,
      nota2: nota.nota2 ?? null,
      nota3: nota.nota3 ?? null,
      definitiva: nota.definitiva ?? null,
      estado: nota.estado,
      cortesManuales: nota.cortesManuales || '',
    };
  });
}
