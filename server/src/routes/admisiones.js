/* =============================================
   Rutas de Admisiones y Registro.

   Cubre las nueve secciones del módulo:
   resumen, aspirantes, procesos, documentos,
   registro, expedientes, cuenta, certificados
   y reportes.
   ============================================= */
import { prisma } from '../config.js';
import { asegurarCuentaEstudiante, siguienteCodigoEstudiante } from '../cuentas.js';

/* Suma los contadores de un groupBy de Prisma. */
const sumar = (rows) => rows.reduce((a, r) => a + r._count._all, 0);

/* Suma de saldos por estado, reutilizada por cuenta y por reportes. */
async function saldosPorEstado() {
  const pagos = await prisma.pago.findMany({
    select: { estado: true, valor: true },
  });
  const acc = { pagado: 0, pendiente: 0, vencido: 0 };
  for (const p of pagos) {
    if (acc[p.estado] === undefined) acc[p.estado] = 0;
    acc[p.estado] += p.valor;
  }
  return acc;
}

export default async function rutasAdmisiones(app) {
  const guard = { preHandler: [app.autenticar, app.requiereModulo('admisiones')] };

  /* ── Resumen: los números que pintan la portada del módulo ──────────── */
  app.get('/admisiones/resumen', guard, async () => {
    const [aspirantes, estudiantes, certs, saldos, proceso] = await Promise.all([
      prisma.aspirante.groupBy({ by: ['estado'], _count: { _all: true } }),
      prisma.estudiante.groupBy({ by: ['estado'], _count: { _all: true } }),
      prisma.certificadoEmitido.groupBy({ by: ['estado'], _count: { _all: true } }),
      saldosPorEstado(),
      prisma.procesoAdmision.findMany({ orderBy: { id: 'asc' } }),
    ]);

    const porEstado = (rows) => Object.fromEntries(rows.map((r) => [r.estado, r._count._all]));
    const documentos = await prisma.aspirante.groupBy({ by: ['documentos'], _count: { _all: true } });
    const enMora = await prisma.estudiante.count({
      where: { pagos: { some: { estado: 'vencido' } } },
    });

    return {
      aspirantes: {
        total: sumar(aspirantes),
        porEstado: porEstado(aspirantes),
        documentos: porEstado(documentos),
      },
      estudiantes: { total: sumar(estudiantes), porEstado: porEstado(estudiantes), enMora },
      certificados: { porEstado: porEstado(certs) },
      saldos,
      procesoAbierto: proceso.find((p) => p.procesoAbierto) || null,
      periodos: proceso,
    };
  });

  /* ── Aspirantes ─────────────────────────────────────────────────────── */
  app.get('/admisiones/aspirantes', guard, async (req) => {
    const q = req.query || {};
    return prisma.aspirante.findMany({
      where: {
        ...(q.estado ? { estado: q.estado } : {}),
        ...(q.programaId ? { programaId: Number(q.programaId) } : {}),
        ...(q.buscar
          ? {
              OR: [
                { nombre: { contains: q.buscar, mode: 'insensitive' } },
                { documento: { contains: q.buscar, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { fecha: 'desc' },
      include: {
        programa: { select: { id: true, nombre: true } },
        estudiante: { select: { id: true } },
      },
    });
  });

  app.get('/admisiones/aspirantes/:id', guard, async (req, reply) => {
    const a = await prisma.aspirante.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        programa: true,
        proceso: true,
        estudiante: { include: { pagos: true } },
      },
    });
    return a || reply.code(404).send({ error: 'Aspirante no encontrado' });
  });

  /* Cambia el estado de un aspirante. Es la acción central del proceso. */
  app.patch('/admisiones/aspirantes/:id', guard, async (req, reply) => {
    const { estado, documentos } = req.body || {};
    const ESTADOS = ['preinscrito', 'en_proceso', 'admitido', 'rechazado'];
    if (estado && !ESTADOS.includes(estado)) {
      return reply.code(400).send({ error: `Estado inválido. Use uno de: ${ESTADOS.join(', ')}` });
    }
    /* Cuando el aspirante ya tiene ficha de estudiante (registro público), el
       expediente de documentos se revisa archivo por archivo desde la pestaña
       Documentos. No se permite marcarlo como 'completo' directamente aquí para
       evitar saltarse la validación. */
    const aspirante = await prisma.aspirante.findUnique({
      where: { id: Number(req.params.id) },
      include: { estudiante: true },
    });
    if (documentos === 'completo' && aspirante?.estudiante?.estado === 'en_inscripcion') {
      return reply.code(400).send({
        error: `El expediente de ${aspirante.nombre} ya tiene documentos subidos: revísalos en la pestaña Documentos antes de validarlos.`,
      });
    }
    const a = await prisma.aspirante.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(estado ? { estado } : {}),
        ...(documentos ? { documentos } : {}),
      },
      include: { programa: { select: { id: true, nombre: true } } },
    });
    return a;
  });

  /* Matricula a un aspirante: crea su ficha de estudiante y su cuenta de
     acceso (o reutiliza la ficha/cuenta que ya dejó el registro público),
     y deja el expediente en estado 'matriculado'. Devuelve las credenciales
     una sola vez para que Admisiones las entregue. Exige que el expediente
     de documentos esté validado: sin eso el estudiante no está listo. */
  app.post('/admisiones/aspirantes/:id/matricular', guard, async (req, reply) => {
    const aspirante = await prisma.aspirante.findUnique({
      where: { id: Number(req.params.id) },
      include: { estudiante: true },
    });
    if (!aspirante) return reply.code(404).send({ error: 'Aspirante no encontrado' });

    /* Caso más frecuente: el registro público ya dejó la ficha en
       'en_inscripcion'. Solo se formaliza a 'matriculado'. */
    if (aspirante.estudiante) {
      const ficha = aspirante.estudiante;
      if (ficha.documentos !== 'completo') {
        return reply.code(400).send({
          error: `${ficha.nombre} tiene el expediente de documentos '${ficha.documentos}': validé los documentos antes de matricular`,
        });
      }
      const { cuenta } = await asegurarCuentaEstudiante(prisma, {
        nombre: ficha.nombre,
        documento: ficha.documento,
        programaId: ficha.programaId,
        semestre: ficha.semestre,
      });
      const estudiante = await prisma.estudiante.update({
        where: { id: ficha.id },
        data: { estado: 'matriculado' },
      });
      return {
        ok: true,
        mensaje: `${estudiante.nombre} matriculado con código ${estudiante.id}`,
        estudiante: { id: estudiante.id, nombre: estudiante.nombre, estado: estudiante.estado },
        /* La contraseña no se vuelve a entregar: la tiene el estudiante desde
           su registro. Solo se devuelve el usuario por si hay que reenviarlo. */
        credenciales: { usuario: cuenta.usuario, password: null },
      };
    }

    if (aspirante.documentos !== 'completo') {
      return reply
        .code(400)
        .send({ error: `${aspirante.nombre} tiene los documentos '${aspirante.documentos}': validélos antes de matricular` });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const codigo = await siguienteCodigoEstudiante(tx);
      const { cuenta, usuario, password } = await asegurarCuentaEstudiante(tx, {
        nombre: aspirante.nombre,
        documento: aspirante.documento,
        programaId: aspirante.programaId,
        semestre: 1,
      });
      const estudiante = await tx.estudiante.create({
        data: {
          id: codigo,
          nombre: aspirante.nombre,
          documento: aspirante.documento,
          correo: cuenta.email,
          telefono: cuenta.telefono,
          direccion: cuenta.direccion,
          programaId: aspirante.programaId,
          semestre: 1,
          jornada: 'diurna',
          promedio: 0,
          estado: 'matriculado',
          documentos: aspirante.documentos,
          fechaIngreso: new Date(),
          aspiranteId: aspirante.id,
          usuarioId: cuenta.id,
        },
        include: { programa: { select: { id: true, nombre: true } } },
      });
      return { estudiante, usuario, password };
    });

    return {
      ok: true,
      mensaje: `${aspirante.nombre} matriculado con código ${resultado.estudiante.id}`,
      estudiante: {
        id: resultado.estudiante.id,
        nombre: resultado.estudiante.nombre,
        estado: resultado.estudiante.estado,
      },
      credenciales: { usuario: resultado.usuario, password: resultado.password },
    };
  });

  /* ── Procesos ───────────────────────────────────────────────────────── */
  app.get('/admisiones/procesos', guard, async () => {
    const procesos = await prisma.procesoAdmision.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { aspirantes: true } } },
    });
    const configuracion = await prisma.configPonderacion.findMany({ orderBy: { peso: 'desc' } });
    return { procesos, configuracion, pesoTotal: configuracion.reduce((a, c) => a + c.peso, 0) };
  });

  /* ── Documentos: requisitos y estado de cada expediente ─────────────── */
  app.get('/admisiones/documentos', guard, async () => {
    const [requisitos, porEstado] = await Promise.all([
      prisma.requisitoDocumento.findMany({ orderBy: { id: 'asc' } }),
      prisma.aspirante.groupBy({ by: ['documentos'], _count: { _all: true } }),
    ]);
    return {
      requisitos,
      resumen: Object.fromEntries(porEstado.map((r) => [r.documentos, r._count._all])),
    };
  });

  /* ── Revisión de lo que subieron los estudiantes inscritos ──────────── */
  /* Los archivos que el alumno subió a su expediente, con la observación y
     el veredicto de cada uno. El contenido base64 no viaja aquí: se descarga
     con el endpoint de archivo. */
  app.get('/admisiones/estudiantes/:id/documentos', guard, async (req, reply) => {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id: req.params.id },
      select: { id: true, nombre: true, documento: true, estado: true, documentos: true },
    });
    if (!estudiante) return reply.code(404).send({ error: 'Estudiante no encontrado' });

    const archivos = await prisma.documentoIngreso.findMany({
      where: { estudianteId: estudiante.id },
      orderBy: { requisitoId: 'asc' },
      select: {
        id: true,
        requisitoId: true,
        nombre: true,
        mime: true,
        tamano: true,
        estado: true,
        observacion: true,
        subidoEn: true,
        revisadoEn: true,
        revisadoPor: true,
        requisito: { select: { clave: true, nombre: true, obligatorio: true } },
      },
    });
    return { estudiante, archivos };
  });

  /* Descarga el archivo que el estudiante subió a su expediente, para que
     Admisiones lo revise (mismo patrón que el material del campus). */
  app.get('/admisiones/estudiantes/documentos/:id/archivo', guard, async (req, reply) => {
    const documento = await prisma.documentoIngreso.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!documento) {
      return reply.code(404).send({ error: 'Documento no encontrado' });
    }
    return reply
      .header('content-type', documento.mime || 'application/octet-stream')
      .header(
        'content-disposition',
        `attachment; filename="${encodeURIComponent(documento.nombre || 'documento')}"`
      )
      .send(Buffer.from(documento.contenidoB64, 'base64'));
  });

  /* Veredicto de un archivo: aprobado o rechazado, con la observación que
     verá el estudiante en su portal (esa observación es la forma de
     comunicarle lo que falta o lo que quedó mal). */
  app.patch('/admisiones/estudiantes/documentos/:id', guard, async (req, reply) => {    const { estado, observacion } = req.body || {};
    if (!['aprobado', 'rechazado'].includes(estado)) {
      return reply.code(400).send({ error: "El estado debe ser 'aprobado' o 'rechazado'" });
    }
    const documento = await prisma.documentoIngreso.findUnique({ where: { id: Number(req.params.id) } });
    if (!documento) return reply.code(404).send({ error: 'Documento no encontrado' });

    const actualizado = await prisma.documentoIngreso.update({
      where: { id: documento.id },
      data: {
        estado,
        observacion: observacion ? String(observacion).slice(0, 500) : null,
        revisadoEn: new Date(),
        revisadoPor: req.usuario.usuario,
      },
    });
    return { ok: true, documento: actualizado.estado, observacion: actualizado.observacion };
  });

  /* Marca el expediente del estudiante como completo (o pendiente otra vez):
     es lo que habilita la matrícula del alumno en su portal. Si hay archivos
     rechazados o requisitos obligatorios sin subir, se rechaza. */
  app.post('/admisiones/estudiantes/:id/validar-documentos', guard, async (req, reply) => {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id: req.params.id },
      include: { aspirante: { select: { id: true } } },
    });
    if (!estudiante) return reply.code(404).send({ error: 'Estudiante no encontrado' });

    const completo = req.body?.completo !== false;
    if (completo) {
      const [requisitos, archivos] = await Promise.all([
        prisma.requisitoDocumento.findMany({ where: { vigente: true, obligatorio: true } }),
        prisma.documentoIngreso.findMany({ where: { estudianteId: estudiante.id } }),
      ]);
      const porRequisito = new Map(archivos.map((a) => [a.requisitoId, a]));
      const faltantes = requisitos.filter((r) => {
        const a = porRequisito.get(r.id);
        return !a || a.estado !== 'aprobado';
      });
      if (faltantes.length) {
        return reply.code(400).send({
          error: `No se puede validar: ${faltantes.map((r) => r.nombre).join(', ')} (falta o no está aprobado)`,
        });
      }
    }

    await prisma.$transaction([
      prisma.estudiante.update({ where: { id: estudiante.id }, data: { documentos: completo ? 'completo' : 'pendiente' } }),
      ...(estudiante.aspiranteId
        ? [prisma.aspirante.update({ where: { id: estudiante.aspirante.id }, data: { documentos: completo ? 'completo' : 'pendiente' } })]
        : []),
    ]);

    return {
      ok: true,
      mensaje: completo
        ? `Expediente de ${estudiante.nombre} validado: ya puede matricular`
        : `Expediente de ${estudiante.nombre} marcado como pendiente`,
      documentos: completo ? 'completo' : 'pendiente',
      puedeMatricular: completo,
    };
  });

  /* ── Registro: admisiones lista para matricular ─────────────────────── */
  app.get('/admisiones/registro', guard, async (req) => {
    const q = req.query || {};
    return prisma.estudiante.findMany({
      where: {
        ...(q.estado ? { estado: q.estado } : {}),
        ...(q.programaId ? { programaId: Number(q.programaId) } : {}),
        ...(q.buscar
          ? {
              OR: [
                { nombre: { contains: q.buscar, mode: 'insensitive' } },
                { codigo: { contains: q.buscar, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { id: 'asc' },
      include: {
        programa: { select: { id: true, nombre: true } },
        _count: { select: { pagos: true } },
      },
    });
  });

  /* ── Expedientes: ficha completa del estudiante ─────────────────────── */
  app.get('/admisiones/expedientes/:id', guard, async (req, reply) => {
    const e = await prisma.estudiante.findUnique({
      where: { id: req.params.id },
      include: {
        programa: { include: { modalidad: true } },
        pagos: { orderBy: { fechaLimite: 'asc' } },
        notas: { orderBy: [{ periodo: 'desc' }, { codigo: 'asc' }] },
        certificados: { orderBy: { id: 'desc' } },
        aspirante: true,
      },
    });
    return e || reply.code(404).send({ error: 'Estudiante no encontrado' });
  });

  app.get('/admisiones/expedientes', guard, async (req) => {
    const q = req.query || {};
    return prisma.estudiante.findMany({
      where: q.buscar
        ? {
            OR: [
              { nombre: { contains: q.buscar, mode: 'insensitive' } },
              { documento: { contains: q.buscar, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { id: 'asc' },
      select: { id: true, nombre: true, documento: true, estado: true, promedio: true, programaId: true },
      include: { programa: { select: { nombre: true } } },
    });
  });

  /* ── Estado de cuenta y cartera ─────────────────────────────────────── */
  app.get('/admisiones/cartera', guard, async () => {
    const [estudiantes, saldos] = await Promise.all([
      prisma.estudiante.findMany({
        orderBy: { id: 'asc' },
        include: {
          programa: { select: { id: true, nombre: true } },
          pagos: { orderBy: { fechaLimite: 'asc' } },
        },
      }),
      saldosPorEstado(),
    ]);

    const cartera = estudiantes.map((e) => {
      const porEstado = { pagado: 0, pendiente: 0, vencido: 0 };
      for (const p of e.pagos) porEstado[p.estado] = (porEstado[p.estado] || 0) + p.valor;
      const debe = porEstado.pendiente + porEstado.vencido;
      const cuota = e.pagos.reduce((a, p) => a + p.valor, 0) || 1;
      return {
        estudiante: {
          id: e.id,
          nombre: e.nombre,
          documento: e.documento,
          programa: e.programa.nombre,
          programaId: e.programaId,
          estado: e.estado,
        },
        saldos: porEstado,
        debe,
        mora: porEstado.vencido > 0,
        porcentaje: Math.round((debe / cuota) * 100),
      };
    });

    return {
      cartera,
      totales: saldos,
      porCobrar: saldos.pendiente + saldos.vencido,
      enMora: cartera.filter((c) => c.mora).length,
    };
  });

  /* ── Certificados ───────────────────────────────────────────────────── */
  app.get('/admisiones/certificados', guard, async () => {
    const emitidos = await prisma.certificadoEmitido.findMany({
      orderBy: { id: 'desc' },
      include: { estudiante: { select: { nombre: true, documento: true } } },
    });
    return emitidos;
  });

  /* Validación de negocio: no se emite certificado con saldo vencido. */
  app.post('/admisiones/certificados', guard, async (req, reply) => {
    const { tipo } = req.body || {};
    /* El id del estudiante es un código ("20231001"), pero el formulario puede
       mandarlo como número. Se normaliza aquí: si no, Prisma lanza y el
       estudiante ve un 500 en vez de un mensaje. */
    const estudianteId = req.body?.estudianteId != null ? String(req.body.estudianteId) : '';
    if (!estudianteId || !tipo) {
      return reply.code(400).send({ error: 'Faltan estudianteId y tipo' });
    }
    const e = await prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: { pagos: true },
    });
    if (!e) return reply.code(404).send({ error: 'Estudiante no encontrado' });

    const vencido = e.pagos.filter((p) => p.estado === 'vencido');
    if (vencido.length && !/paz y salvo/i.test(tipo)) {
      return reply.code(409).send({
        error: 'El estudiante tiene saldo vencido. Debe regularizar antes de emitir.',
        detalle: vencido.map((p) => p.concepto),
      });
    }
    if (e.estado === 'retirado' && !/constancia/i.test(tipo)) {
      return reply.code(409).send({ error: 'El estudiante está retirado. Solo admite constancia de retiro.' });
    }

    const creado = await prisma.certificadoEmitido.create({
      data: { estudianteId, matricula: e.id, tipo, estado: 'entregado', fecha: new Date() },
    });
    return reply.code(201).send(creado);
  });

  /* ── Estudiantes: estado, documentos y datos básicos ────────────────── */
  app.patch('/admisiones/estudiantes/:id', guard, async (req, reply) => {
    const { estado, documentos, promedio, semestre } = req.body || {};
    const existe = await prisma.estudiante.findUnique({ where: { id: req.params.id } });
    if (!existe) return reply.code(404).send({ error: 'Estudiante no encontrado' });

    const data = {};
    if (estado !== undefined) data.estado = estado;
    if (documentos !== undefined) data.documentos = documentos;
    if (promedio !== undefined) data.promedio = promedio;
    if (semestre !== undefined) data.semestre = semestre;

    /* Al pasar un estudiante sin cuenta a matriculado/activo se le genera la
       cuenta de acceso y se devuelven las credenciales temporales una vez. */
    const activa = estado === 'matriculado' || estado === 'activo';
    if (activa && !existe.usuarioId) {
      const resultado = await prisma.$transaction(async (tx) => {
        const { cuenta, usuario, password } = await asegurarCuentaEstudiante(tx, {
          nombre: existe.nombre,
          documento: existe.documento,
          email: existe.correo ?? undefined,
          telefono: existe.telefono ?? undefined,
          direccion: existe.direccion ?? undefined,
          programaId: existe.programaId,
          semestre: existe.semestre,
        });
        const actualizado = await tx.estudiante.update({
          where: { id: req.params.id },
          data: { ...data, usuarioId: cuenta.id },
        });
        return { estudiante: actualizado, usuario, password };
      });
      return {
        ...resultado.estudiante,
        credenciales: { usuario: resultado.usuario, password: resultado.password },
      };
    }
    return prisma.estudiante.update({ where: { id: req.params.id }, data });
  });

  /* Crea y enlaza la cuenta de acceso de un estudiante que todavía no tiene
     (p. ej. un estudiante activo previo o que no pasó por registro). */
  app.post('/admisiones/estudiantes/:id/cuenta', guard, async (req, reply) => {
    const e = await prisma.estudiante.findUnique({ where: { id: req.params.id } });
    if (!e) return reply.code(404).send({ error: 'Estudiante no encontrado' });
    if (e.usuarioId) {
      return reply.code(409).send({ error: `${e.nombre} ya tiene una cuenta de acceso` });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const { cuenta, usuario, password } = await asegurarCuentaEstudiante(tx, {
        nombre: e.nombre,
        documento: e.documento,
        email: e.correo ?? undefined,
        telefono: e.telefono ?? undefined,
        direccion: e.direccion ?? undefined,
        programaId: e.programaId,
        semestre: e.semestre,
      });
      await tx.estudiante.update({ where: { id: e.id }, data: { usuarioId: cuenta.id } });
      return { usuario, password };
    });

    return reply.code(201).send({
      ok: true,
      mensaje: `Cuenta creada para ${e.nombre}`,
      credenciales: { usuario: resultado.usuario, password: resultado.password },
    });
  });

  /* ── Pagos: registrar un cobro (queda pagado) ───────────────────────── */
  app.patch('/admisiones/pagos/:id', guard, async (req, reply) => {
    const id = Number(req.params.id);
    const existe = await prisma.pago.findUnique({ where: { id } });
    if (!existe) return reply.code(404).send({ error: 'Pago no encontrado' });

    const { estado, referencia, fechaPago } = req.body || {};
    const data = {};
    if (estado !== undefined) data.estado = estado;
    if (referencia !== undefined) data.referencia = referencia;
    if (fechaPago !== undefined) data.fechaPago = fechaPago ? new Date(fechaPago) : null;
    return prisma.pago.update({ where: { id }, data });
  });

  /* ── Requisitos documentales: alternar vigencia ──────────────────────
     El frontend identifica el documento por su clave ('doc-4'), no por el id. */
  app.patch('/admisiones/requisitos/:clave', guard, async (req, reply) => {
    const { clave } = req.params;
    const numero = Number(clave);
    const existe = await prisma.requisitoDocumento.findFirst({
      where: Number.isNaN(numero) ? { clave } : { OR: [{ clave }, { id: numero }] },
    });
    if (!existe) return reply.code(404).send({ error: 'Requisito no encontrado' });

    const vigente =
      req.body?.vigente !== undefined ? !!req.body.vigente : !existe.vigente;
    return prisma.requisitoDocumento.update({ where: { id: existe.id }, data: { vigente } });
  });

  /* ── Reportes ───────────────────────────────────────────────────────── */
  app.get('/admisiones/reportes', guard, async () => {
    const [porPrograma, porEstado, saldos] = await Promise.all([
      prisma.estudiante.groupBy({
        by: ['programaId'],
        _count: { _all: true },
        _avg: { promedio: true },
      }),
      prisma.aspirante.groupBy({ by: ['estado'], _count: { _all: true } }),
      saldosPorEstado(),
    ]);
    const programas = await prisma.programa.findMany({ select: { id: true, nombre: true, cupo: true } });
    const porProgramaNombre = programas.map((p) => {
      const fila = porPrograma.find((x) => x.programaId === p.id);
      return {
        programa: p.nombre,
        matriculados: fila ? fila._count._all : 0,
        promedio: fila && fila._avg.promedio ? Number(fila._avg.promedio.toFixed(2)) : null,
        ocupacion: fila ? Math.round((fila._count._all / p.cupo) * 100) : 0,
      };
    });
    const promedioGeneral = await prisma.estudiante.aggregate({ _avg: { promedio: true } });

    return {
      aspirantes: Object.fromEntries(porEstado.map((r) => [r.estado, r._count._all])),
      porPrograma: porProgramaNombre,
      saldos,
      promedioGeneral: promedioGeneral._avg.promedio
        ? Number(promedioGeneral._avg.promedio.toFixed(2))
        : null,
    };
  });
}
