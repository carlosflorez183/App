/* =============================================
   Rutas de los módulos administrativos:
   administración, rectoría, talento humano,
   contabilidad y notificaciones.
   ============================================= */
import { prisma } from '../config.js';
import { hash, publico } from '../auth.js';
import {
  liquidar,
  totalizar,
  salarioDocentePorCategoria,
  calcularNovedad,
  TIPOS_NOVEDAD,
} from '../nomina.js';

/* Nombres de las novedades tal como salen en los conceptos de la liquidación. */
const ETIQUETA_NOVEDAD = {
  incapacidad: 'Incapacidad',
  licencia: 'Licencia o permiso',
  vacaciones: 'Vacaciones',
  retiro: 'Retiro o renuncia',
  bonificacion: 'Bonificación',
  horas_extra: 'Horas extra',
  descuento: 'Descuento',
};
const TIPOS_NOVEDAD_VALIDOS = Object.values(TIPOS_NOVEDAD);
import {
  pdfDeCertificadoLaboral,
  nombreArchivo as nombreArchivoLaboral,
} from '../certificadosLaborales.js';

export default async function rutasAdmin(app) {
  /* ── Panel de Administración ─────────────────────────────────────────── */
  app.get('/admin/resumen', {
    preHandler: [app.autenticar, app.requiereRoles('admin')],
  }, async () => {
    const [estudiantes, docentes, programas, movimientos] = await Promise.all([
      prisma.estudiante.groupBy({ by: ['estado'], _count: { _all: true } }),
      prisma.docente.groupBy({ by: ['estado'], _count: { _all: true } }),
      prisma.programa.count({ where: { activo: true } }),
      prisma.movimiento.findMany({ orderBy: { fecha: 'desc' }, take: 8 }),
    ]);
    const suma = (rows) => rows.reduce((a, r) => a + r._count._all, 0);
    return {
      estudiantes: { total: suma(estudiantes), porEstado: Object.fromEntries(estudiantes.map((r) => [r.estado, r._count._all])) },
      docentes: { total: suma(docentes), porEstado: Object.fromEntries(docentes.map((r) => [r.estado, r._count._all])) },
      programas,
      movimientos,
    };
  });

  app.get('/admin/programas', {
    preHandler: [app.autenticar, app.requiereRoles('admin')],
  }, async () => {
    const programas = await prisma.programa.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' },
      include: { modalidad: { select: { nombre: true } }, _count: { select: { materias: true, estudiantes: true } } },
    });
    return programas.map((p) => ({
      ...p,
      ocupacion: p.cupo ? Math.round((p.matriculados / p.cupo) * 100) : 0,
    }));
  });

  app.get('/admin/docentes', {
    preHandler: [app.autenticar, app.requiereRoles('admin', 'talento_humano')],
  }, async () => prisma.docente.findMany({ orderBy: { nombre: 'asc' } }));

  /* ── Gestión de usuarios (solo administrador) ────────────────────────── */
  const soloAdmin = { preHandler: [app.autenticar, app.requiereRoles('admin')] };
  const ROLES = ['estudiante', 'profesor', 'admin', 'admisiones', 'rectoria', 'talento_humano', 'contabilidad'];

  app.get('/admin/usuarios', soloAdmin, async () => {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { role: 'asc' },
      include: {
        programa: { select: { nombre: true } },
        estudiante: { select: { id: true, estado: true } },
        docente: { select: { id: true, estado: true } },
      },
    });
    return usuarios.map((u) => ({
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      role: u.role,
      codigo: u.codigo,
      email: u.email,
      telefono: u.telefono,
      direccion: u.direccion,
      programa: u.programa?.nombre || null,
      semestre: u.semestre,
      avatar: u.avatar,
      avatarClass: u.avatarClass,
      activo: u.activo,
      creadoEn: u.creadoEn,
      estudianteId: u.estudiante?.id || null,
      estudianteEstado: u.estudiante?.estado || null,
      docenteId: u.docente?.id || null,
    }));
  });

  app.patch('/admin/usuarios/:id', soloAdmin, async (req, reply) => {
    const id = Number(req.params.id);
    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u) return reply.code(404).send({ error: 'Usuario no encontrado' });

    const { nombre, email, telefono, direccion, role, activo } = req.body || {};
    if (role && !ROLES.includes(role)) {
      return reply.code(400).send({ error: `Rol no válido. Use uno de: ${ROLES.join(', ')}` });
    }
    // Impedimos que el administrador se quede a sí mismo sin acceso al sistema.
    if (u.usuario === req.usuario.usuario && activo === false) {
      return reply.code(400).send({ error: 'No puede desactivar su propia cuenta' });
    }
    const data = {};
    if (nombre !== undefined) data.nombre = String(nombre).trim();
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (telefono !== undefined) data.telefono = telefono ? String(telefono).trim() : null;
    if (direccion !== undefined) data.direccion = direccion ? String(direccion).trim() : null;
    if (role !== undefined) data.role = role;
    if (activo !== undefined) data.activo = Boolean(activo);
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      include: { programa: { select: { nombre: true } } },
    });
    return { ...publico(actualizado), mensaje: u.activo && activo === false ? 'Usuario bloqueado' : 'Usuario actualizado' };
  });

  app.post('/admin/usuarios/:id/password', soloAdmin, async (req, reply) => {
    const id = Number(req.params.id);
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return reply.code(400).send({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u) return reply.code(404).send({ error: 'Usuario no encontrado' });
    await prisma.usuario.update({ where: { id }, data: { password: hash(String(password)) } });
    return { ok: true, mensaje: `Contraseña actualizada para ${u.usuario}` };
  });

  /* ── Estudiantes: bloqueo y edición administrativa ───────────────────── */
  app.get('/admin/estudiantes', soloAdmin, async () => {
    const estudiantes = await prisma.estudiante.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        programa: { select: { nombre: true } },
        usuario: { select: { usuario: true, email: true, activo: true } },
        _count: { select: { pagos: true, notas: true } },
      },
    });
    return estudiantes.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      documento: e.documento,
      correo: e.correo,
      telefono: e.telefono,
      programa: e.programa.nombre,
      programaId: e.programaId,
      semestre: e.semestre,
      jornada: e.jornada,
      promedio: e.promedio,
      estado: e.estado,
      fechaIngreso: e.fechaIngreso,
      usuario: e.usuario?.usuario || null,
      usuarioActivo: e.usuario?.activo ?? null,
      pagos: e._count.pagos,
      notas: e._count.notas,
    }));
  });

  app.patch('/admin/estudiantes/:id', soloAdmin, async (req, reply) => {
    const { estado, programaId, semestre, jornada, telefono, correo } = req.body || {};
    const e = await prisma.estudiante.findUnique({ where: { id: req.params.id } });
    if (!e) return reply.code(404).send({ error: 'Estudiante no encontrado' });

    const ESTADOS = ['matriculado', 'en_inscripcion', 'retirado', 'graduado', 'bloqueado'];
    if (estado && !ESTADOS.includes(estado)) {
      return reply.code(400).send({ error: `Estado no válido. Use uno de: ${ESTADOS.join(', ')}` });
    }
    if (programaId !== undefined) {
      const programa = await prisma.programa.findUnique({ where: { id: Number(programaId) } });
      if (!programa) return reply.code(400).send({ error: 'El programa no existe' });
    }

    const data = {};
    if (estado !== undefined) data.estado = estado;
    if (programaId !== undefined) data.programaId = Number(programaId);
    if (semestre !== undefined) data.semestre = Number(semestre);
    if (jornada !== undefined) data.jornada = jornada || null;
    if (telefono !== undefined) data.telefono = telefono || null;
    if (correo !== undefined) data.correo = correo || null;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });

    // El estado del estudiante y su acceso van de la mano: bloquear lo deja
    // sin poder entrar al campus y desbloquear le devuelve el acceso.
    if (data.estado && e.usuarioId) {
      await prisma.usuario.update({
        where: { id: e.usuarioId },
        data: { activo: data.estado !== 'bloqueado' },
      });
    }

    const actualizado = await prisma.estudiante.update({
      where: { id: e.id },
      data,
      include: { programa: { select: { nombre: true } } },
    });
    return { ...actualizado, programa: actualizado.programa.nombre };
  });

  /* ── Edición de docentes y programas ────────────────────────────────── */
  app.patch('/admin/docentes/:id', soloAdmin, async (req, reply) => {
    const { area, titulo, categoria, estado } = req.body || {};
    const data = {};
    if (area !== undefined) data.area = area || null;
    if (titulo !== undefined) data.titulo = titulo || null;
    if (categoria !== undefined) data.categoria = categoria || null;
    if (estado !== undefined) data.estado = estado;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    const d = await prisma.docente.update({ where: { id: req.params.id }, data });
    return d;
  });

  app.patch('/admin/programas/:id', soloAdmin, async (req, reply) => {
    const { cupo, matriculados, semestres, creditos, jornada, activo } = req.body || {};
    const data = {};
    if (cupo !== undefined) {
      const n = Number(cupo);
      if (!Number.isInteger(n) || n < 0) return reply.code(400).send({ error: 'El cupo debe ser un entero positivo' });
      data.cupo = n;
    }
    if (matriculados !== undefined) data.matriculados = Math.max(0, Number(matriculados) || 0);
    if (semestres !== undefined) data.semestres = Math.max(1, Number(semestres) || 1);
    if (creditos !== undefined) data.creditos = Math.max(0, Number(creditos) || 0);
    if (jornada !== undefined) data.jornada = jornada || null;
    if (activo !== undefined) data.activo = Boolean(activo);
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    const p = await prisma.programa.update({ where: { id: Number(req.params.id) }, data });
    return { ...p, ocupacion: p.cupo ? Math.round((p.matriculados / p.cupo) * 100) : 0 };
  });

  /* NO hay ruta de pagos para Administración. Los cobros son de Contabilidad,
   Rectoria y Planeación; el resto de módulos no los consulta. Antes existía
   /admin/finanzas para la pestaña de finanzas que se quitó del panel. */

  /* ── Talento Humano ─────────────────────────────────────────────────── */
  app.get('/talento-humano/resumen', {
    preHandler: [app.autenticar, app.requiereRoles('talento_humano')],
  }, async () => {
    const [docentes, empleados, porDependencia, masaSalarial] = await Promise.all([
      prisma.docente.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.empleado.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.empleado.groupBy({ by: ['dependencia'], _count: { _all: true }, _sum: { salario: true } }),
      prisma.empleado.aggregate({ _sum: { salario: true }, _count: { _all: true } }),
    ]);
    return {
      docentes,
      empleados,
      porDependencia: porDependencia.map((d) => ({
        dependencia: d.dependencia,
        empleados: d._count._all,
        nomina: d._sum.salario || 0,
      })),
      masaSalarial: masaSalarial._sum.salario || 0,
      totalPersonas: docentes.length + empleados.length,
      /* Lo último que se liquidó, para que el módulo abra mostrando números y
         no un cero: sin esto la pestaña de nómina arrancaría siempre vacía
         aunque ya haya corridas hechas. */
      ultimaNomina: await prisma.nomina.findFirst({
        orderBy: { periodo: 'desc' },
        select: { periodo: true, fechaPago: true, estado: true, totalNeto: true, totalDevengado: true, totalDeducciones: true },
      }),
    };
  });

  /* ── Nómina ─────────────────────────────────────────────────────────── */
  /* Liquidar es calcular deducciones de personas, así que la corre
     Contabilidad, que es quien cierra las cuentas del periodo. Talento Humano
     la consulta (para certificados y consulta interna) pero no la genera ni la
     recalcula. La corrida liquida a TODO el personal activo: administrativos
     (`Empleado`) y docentes (`Docente`, con salario asignado por categoría). */
  const nominaLectura = {
    preHandler: [app.autenticar, app.requiereRoles('talento_humano', 'contabilidad')],
  };
  const nominaGenera = {
    preHandler: [app.autenticar, app.requiereRoles('contabilidad')],
  };

  app.get('/talento-humano/nominas', nominaLectura, async () => {
    const nominas = await prisma.nomina.findMany({
      orderBy: { periodo: 'desc' },
      include: { _count: { select: { liquidaciones: true } } },
    });
    return nominas;
  });

  /* Crea (o rehace) la corrida de un periodo.
     El cálculo no se inventa aquí: se llama a `liquidar` de nomina.js, que es
     el mismo cálculo que usa el seed y las pruebas. Si el periodo ya existía se
     borra y se vuelve a hacer, porque dejar dos corridas del mismo mes haría
     que los totales de nómina dieran el doble. */
  app.post('/contabilidad/nominas', nominaGenera, async (req, reply) => {
    const { periodo, fechaPago, uvt, smlmv, ingresosExtra } = req.body || {};
    if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
      return reply.code(400).send({ error: 'El periodo debe tener el formato AAAA-MM' });
    }
    const mes = Number(periodo.split('-')[1]);
    if (mes < 1 || mes > 12) {
      return reply.code(400).send({ error: 'El mes del periodo no es válido' });
    }

    /* Los parámetros que fija la Dian cambian por año (UVT, salario mínimo).
       Si no los mandan se usan los que ya tenía la corrida más reciente, y si
       no hay ninguna corrida, los del schema. */
    const previa = await prisma.nomina.findFirst({ orderBy: { periodo: 'desc' } });
    const uvtFinal = Number(uvt) || previa?.uvt || 42950;
    const smlmvFinal = Number(smlmv) || previa?.smlmv || 1300000;
    const fecha = fechaPago ? new Date(fechaPago) : new Date(`${periodo}-28T00:00:00Z`);

    /* La corrida liquida a todo el personal: administrativos y docentes. Los
       docentes no traen salario en su tabla, así que se les asigna uno según la
       categoría (escala institucional). */
    const [empleados, docentes] = await Promise.all([
      prisma.empleado.findMany({ where: { estado: { not: 'retirado' } }, orderBy: { nombre: 'asc' } }),
      prisma.docente.findMany({ where: { estado: { not: 'retirado' } }, orderBy: { nombre: 'asc' } }),
    ]);
    if (!empleados.length && !docentes.length) {
      return reply.code(409).send({ error: 'No hay personal activo para liquidar' });
    }

    /* Las novedades reportadas de este periodo entran en la liquidación: las
       incapacidades, licencias y préstamos descuentan; las bonificaciones y
       horas extra suman. Si ya había una corrida de este mes, sus novedades
       aplicadas vuelven a "reportada" para que se apliquen al rehacerla. */
    await prisma.novedad.updateMany({
      where: { periodo, estado: 'aplicada' },
      data: { estado: 'reportada', nominaId: null },
    });
    const novedades = await prisma.novedad.findMany({
      where: { periodo, estado: 'reportada' },
      orderBy: { creadoEn: 'asc' },
    });
    const ajustesDe = (ref) => novedades
      .filter((n) => n.tipoAjuste !== 'ninguno' && Number(n.valor) > 0
        && ((ref.empleadoId && n.empleadoId === ref.empleadoId)
          || (ref.docenteId && n.docenteId === ref.docenteId)))
      .map((n) => ({
        codigo: `NOV_${n.tipo.toUpperCase()}`,
        nombre: `${ETIQUETA_NOVEDAD[n.tipo] || n.tipo}${n.descripcion ? `: ${n.descripcion}` : ''}`,
        tipo: n.tipoAjuste === 'ingreso' ? 'devengado' : 'deduccion',
        valor: Number(n.valor),
      }));
    /* Un retiro saca a la persona de la corrida y la marca retirada. */
    const retirados = new Set();
    for (const n of novedades) {
      if (n.tipo !== TIPOS_NOVEDAD.RETIRO) continue;
      if (n.empleadoId) retirados.add(`e:${n.empleadoId}`);
      if (n.docenteId) retirados.add(`d:${n.docenteId}`);
    }

    const deEmpleados = empleados
      .filter((emp) => !retirados.has(`e:${emp.id}`))
      .map((emp) => {
        const c = liquidar(emp, {
          uvt: uvtFinal,
          smlmv: smlmvFinal,
          fechaPago: fecha,
          ingresosExtra: (ingresosExtra?.[emp.id] || []),
          ajustes: ajustesDe({ empleadoId: emp.id }),
        });
        return {
          empleadoId: emp.id,
          tipoPersona: 'empleado',
          nombre: emp.nombre,
          cargo: emp.cargo,
          dependencia: emp.dependencia,
          salarioBase: c.salarioBase,
          devengado: c.devengado,
          deducciones: c.deducciones,
          neto: c.neto,
          baseRetencion: c.baseRetencion,
          rentaExenta: c.rentaExenta,
          baseGravable: c.baseGravable,
          retencion: c.retencion,
          conceptos: { create: c.conceptos },
        };
      });

    const deDocentes = docentes
      .filter((doc) => !retirados.has(`d:${doc.id}`))
      .map((doc) => {
        const salario = salarioDocentePorCategoria(doc.categoria);
        const c = liquidar({ id: doc.id, baseSalarial: salario }, {
          uvt: uvtFinal,
          smlmv: smlmvFinal,
          fechaPago: fecha,
          ajustes: ajustesDe({ docenteId: doc.id }),
        });
        return {
          docenteId: doc.id,
          tipoPersona: 'docente',
          nombre: doc.nombre,
          cargo: doc.categoria || 'Docente',
          dependencia: doc.area || 'Docencia',
          salarioBase: c.salarioBase,
          devengado: c.devengado,
          deducciones: c.deducciones,
          neto: c.neto,
          baseRetencion: c.baseRetencion,
          rentaExenta: c.rentaExenta,
          baseGravable: c.baseGravable,
          retencion: c.retencion,
          conceptos: { create: c.conceptos },
        };
      });

    const liquidaciones = [...deEmpleados, ...deDocentes];
    if (!liquidaciones.length) {
      return reply.code(409).send({ error: 'Todas las personas del periodo están retiradas' });
    }
    const totales = totalizar(liquidaciones);

    /* Rehacer el periodo: se borra la corrida anterior y sus liquidaciones
       (los conceptos van en cascada), y se vuelve a liquidar. */
    await prisma.nomina.deleteMany({ where: { periodo } });

    const nomina = await prisma.nomina.create({
      data: {
        periodo,
        fechaPago: fecha,
        estado: 'pagada',
        uvt: uvtFinal,
        smlmv: smlmvFinal,
        totalDevengado: totales.devengado,
        totalDeducciones: totales.deducciones,
        totalNeto: totales.neto,
        liquidaciones: { create: liquidaciones },
      },
    });

    /* Las novedades que entraron quedan aplicadas y ligadas a la corrida. */
    await prisma.novedad.updateMany({
      where: { periodo, estado: 'reportada' },
      data: { estado: 'aplicada', nominaId: nomina.id },
    });
    for (const n of novedades) {
      if (n.tipo !== TIPOS_NOVEDAD.RETIRO) continue;
      if (n.empleadoId) await prisma.empleado.update({ where: { id: n.empleadoId }, data: { estado: 'retirado' } });
      if (n.docenteId) await prisma.docente.update({ where: { id: n.docenteId }, data: { estado: 'retirado' } });
    }

    return reply.code(201).send({ ...nomina, personas: liquidaciones.length });
  });

  /* Detalle de una corrida: una liquidación por persona con sus conceptos. */
  app.get('/talento-humano/nominas/:id', nominaLectura, async (req, reply) => {
    const nomina = await prisma.nomina.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        liquidaciones: {
          orderBy: { neto: 'desc' },
          include: {
            empleado: { select: { id: true, nombre: true, cargo: true, dependencia: true, tipo: true, documento: true } },
            docente: { select: { id: true, nombre: true, area: true, categoria: true, email: true } },
            conceptos: { orderBy: { orden: 'asc' } },
          },
        },
        novedades: true,
      },
    });
    if (!nomina) return reply.code(404).send({ error: 'Corrida de nómina no encontrada' });
    return nomina;
  });

  /* ── Novedades de nómina ──────────────────────────────────────────────
     Talento Humano reporta el hecho (incapacidad, licencia, retiro, bono…), el
     sistema calcula un valor sugerido y Contabilidad lo revisa y corrige antes
     de generar la corrida. La novedad se aplica al liquidar ese periodo y queda
     ligada a la corrida para no descontarla dos veces. */
  const novedadTh = {
    preHandler: [app.autenticar, app.requiereRoles('talento_humano')],
  };
  const novedadCta = {
    preHandler: [app.autenticar, app.requiereRoles('contabilidad')],
  };
  const TIPOS_NOVEDAD_VALIDOS = new Set(Object.values(TIPOS_NOVEDAD));

  /* Salario base con el que se valora la novedad, según el vínculo. */
  const salarioDeEmpleado = (emp) => Number(emp.baseSalarial ?? emp.salario ?? 0);
  const salarioDeDocente = (doc) => salarioDocentePorCategoria(doc.categoria);

  /* Resuelve la persona de una novedad a partir del id que llega del cliente. */
  async function buscarPersona({ empleadoId, docenteId }) {
    if (docenteId) {
      const doc = await prisma.docente.findUnique({ where: { id: String(docenteId) } });
      if (doc) {
        return {
          docenteId: doc.id, nombre: doc.nombre, tipoPersona: 'docente',
          salarioBase: salarioDeDocente(doc),
        };
      }
    }
    if (empleadoId) {
      const emp = await prisma.empleado.findUnique({ where: { id: Number(empleadoId) } });
      if (emp) {
        return {
          empleadoId: emp.id, nombre: emp.nombre, tipoPersona: 'empleado',
          salarioBase: salarioDeEmpleado(emp),
        };
      }
    }
    return null;
  }

  /* Salario base de la persona de una novedad ya guardada. */
  async function salarioDePersona(n) {
    if (n.docenteId) {
      const doc = await prisma.docente.findUnique({ where: { id: n.docenteId } });
      return doc ? salarioDeDocente(doc) : 0;
    }
    if (n.empleadoId) {
      const emp = await prisma.empleado.findUnique({ where: { id: n.empleadoId } });
      return emp ? salarioDeEmpleado(emp) : 0;
    }
    return 0;
  }

  app.get('/talento-humano/novedades', novedadTh, async (req) => {
    const { periodo, estado } = req.query || {};
    return prisma.novedad.findMany({
      where: { ...(periodo ? { periodo } : {}), ...(estado ? { estado } : {}) },
      orderBy: [{ periodo: 'desc' }, { creadoEn: 'desc' }],
    });
  });

  app.post('/talento-humano/novedades', novedadTh, async (req, reply) => {
    const {
      empleadoId, docenteId, tipo, periodo, descripcion, modalidad,
      fechaInicio, fechaFin, dias, horas, valor,
    } = req.body || {};
    if (!TIPOS_NOVEDAD_VALIDOS.has(tipo)) {
      return reply.code(400).send({ error: 'Tipo de novedad no reconocido' });
    }
    if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
      return reply.code(400).send({ error: 'El periodo debe tener el formato AAAA-MM' });
    }
    const persona = await buscarPersona({ empleadoId, docenteId });
    if (!persona) return reply.code(404).send({ error: 'No se encontró la persona de la novedad' });

    const calculo = calcularNovedad(
      { tipo, dias, horas, valor, modalidad },
      persona.salarioBase,
    );
    const creada = await prisma.novedad.create({
      data: {
        empleadoId: persona.empleadoId ?? null,
        docenteId: persona.docenteId ?? null,
        nombre: persona.nombre,
        tipoPersona: persona.tipoPersona,
        tipo,
        descripcion: descripcion || null,
        modalidad: modalidad || null,
        periodo,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        dias: dias !== undefined && dias !== null && dias !== '' ? Number(dias) : null,
        horas: horas !== undefined && horas !== null && horas !== '' ? Number(horas) : null,
        valorSugerido: calculo.valor,
        valor: calculo.valor,
        tipoAjuste: calculo.tipoAjuste,
        estado: 'reportada',
        reportadoPor: req.usuario.id,
      },
    });
    return reply.code(201).send(creada);
  });

  /* Talento Humano corrige o anula una novedad mientras siga reportada. Una vez
     aplicada a una corrida ya no se toca desde aquí: habría que rehacer la
     corrida para que el cambio valga. */
  app.patch('/talento-humano/novedades/:id', novedadTh, async (req, reply) => {
    const actual = await prisma.novedad.findUnique({ where: { id: Number(req.params.id) } });
    if (!actual) return reply.code(404).send({ error: 'Novedad no encontrada' });
    if (actual.estado !== 'reportada') {
      return reply.code(409).send({ error: 'La novedad ya no está en estado reportada' });
    }
    const { descripcion, dias, horas, valor, modalidad, estado } = req.body || {};
    const cambios = {};
    if (descripcion !== undefined) cambios.descripcion = descripcion || null;
    if (modalidad !== undefined) cambios.modalidad = modalidad || null;
    if (dias !== undefined) cambios.dias = dias === null || dias === '' ? null : Number(dias);
    if (horas !== undefined) cambios.horas = horas === null || horas === '' ? null : Number(horas);
    if (estado !== undefined) {
      if (!['reportada', 'anulada'].includes(estado)) {
        return reply.code(400).send({ error: 'Estado no válido' });
      }
      cambios.estado = estado;
    }
    /* Si cambió días/horas/modalidad o el valor, se recalcula el sugerido y se
       respeta el valor que haya escrito Talento Humano si vino explícito. */
    const base = { ...actual, ...cambios };
    const recalculo = calcularNovedad(base, await salarioDePersona(actual));
    cambios.valor = valor !== undefined ? Number(valor) || 0 : recalculo.valor;
    cambios.valorSugerido = recalculo.valor;
    cambios.tipoAjuste = recalculo.tipoAjuste;

    const actualizada = await prisma.novedad.update({ where: { id: actual.id }, data: cambios });
    return actualizada;
  });

  app.get('/contabilidad/novedades', novedadCta, async (req) => {
    const { periodo, estado } = req.query || {};
    return prisma.novedad.findMany({
      where: { ...(periodo ? { periodo } : {}), ...(estado ? { estado } : {}) },
      orderBy: [{ periodo: 'desc' }, { creadoEn: 'desc' }],
    });
  });

  /* Contabilidad revisa la novedad y, si hace falta, ajusta el valor antes de
     generar la corrida. Solo aplica mientras siga reportada. */
  app.patch('/contabilidad/novedades/:id', novedadCta, async (req, reply) => {
    const actual = await prisma.novedad.findUnique({ where: { id: Number(req.params.id) } });
    if (!actual) return reply.code(404).send({ error: 'Novedad no encontrada' });
    if (actual.estado === 'aplicada') {
      return reply.code(409).send({ error: 'La novedad ya fue aplicada a una corrida' });
    }
    const { valor, tipoAjuste, estado, descripcion } = req.body || {};
    const cambios = { ajustadoPor: req.usuario.id };
    if (valor !== undefined) cambios.valor = Number(valor) || 0;
    if (tipoAjuste !== undefined) {
      if (!['ingreso', 'descuento', 'ninguno'].includes(tipoAjuste)) {
        return reply.code(400).send({ error: 'Tipo de ajuste no válido' });
      }
      cambios.tipoAjuste = tipoAjuste;
    }
    if (estado !== undefined) {
      if (!['reportada', 'anulada'].includes(estado)) {
        return reply.code(400).send({ error: 'Estado no válido' });
      }
      cambios.estado = estado;
    }
    if (descripcion !== undefined) cambios.descripcion = descripcion || null;
    const actualizada = await prisma.novedad.update({ where: { id: actual.id }, data: cambios });
    return actualizada;
  });

  /* ── Certificados laborales ───────────────────────────────────────────
     Los expide Talento Humano, no Registro: Registro emite documentos
     académicos de estudiantes y estos son otra firma, otra plantilla y otro
     proceso. */
  const thCertificados = {
    preHandler: [app.autenticar, app.requiereRoles('talento_humano')],
  };

  const TIPOS_CERTIFICADO = [
    { tipo: 'constancia_laboral', pideNomina: false },
    { tipo: 'certificado_ingresos', pideNomina: false },
    { tipo: 'ingresos_retenciones', pideNomina: true },
  ];

  app.get('/talento-humano/certificados', thCertificados, async () => {
    const certificados = await prisma.certificadoEmpleado.findMany({
      orderBy: { id: 'desc' },
      include: {
        empleado: { select: { nombre: true, cargo: true, documento: true } },
        emisor: { select: { nombre: true } },
      },
    });
    return certificados;
  });

  app.post('/talento-humano/certificados', thCertificados, async (req, reply) => {
    const { tipo, empleadoId, nominaId } = req.body || {};
    const definicion = TIPOS_CERTIFICADO.find((t) => t.tipo === tipo);
    if (!definicion) {
      return reply.code(400).send({ error: 'Tipo de certificado no válido' });
    }
    const emp = await prisma.empleado.findUnique({ where: { id: Number(empleadoId) } });
    if (!emp) return reply.code(404).send({ error: 'Empleado no encontrado' });

    /* La constancia laboral y el certificado de ingresos se pueden hacer en
       cualquier momento. El de ingresos y retenciones NO: sin una corrida del
       periodo no hay números que certificar, y no se pueden inventar. */
    let nomina = null;
    if (definicion.pideNomina) {
      nomina = await prisma.nomina.findUnique({ where: { id: Number(nominaId) } });
      if (!nomina) {
        return reply.code(409).send({
          error: 'Ese certificado necesita la corrida de nómina del periodo. Primero liquide el mes.',
        });
      }
      const existe = await prisma.certificadoEmpleado.findFirst({
        where: { empleadoId: emp.id, tipo, periodo: nomina.periodo },
      });
      if (existe) {
        return reply.code(409).send({
          error: `Ya existe un certificado de ${tipo.replace(/_/g, ' ')} de ${emp.nombre} para ${nomina.periodo}.`,
        });
      }
    }

    const liquidacion = nomina
      ? await prisma.liquidacion.findUnique({
        where: { nominaId_empleadoId: { nominaId: nomina.id, empleadoId: emp.id } },
      })
      : null;

    const creado = await prisma.certificadoEmpleado.create({
      data: {
        empleadoId: emp.id,
        nominaId: nomina?.id ?? null,
        liquidacionId: liquidacion?.id ?? null,
        tipo,
        periodo: nomina?.periodo ?? null,
        estado: 'disponible',
        fecha: new Date(),
        emitidoPor: req.usuario.id,
      },
    });
    return reply.code(201).send(creado);
  });

  /* El PDF lo arma el servidor con lo guardado, igual que los certificados
     académicos: si se generara en el navegador, cada quien descargaría una
     versión distinta. La liquidación y sus conceptos vienen en la misma
     consulta porque son los renglones que se imprimen. */
  app.get('/talento-humano/certificados/:id/pdf', thCertificados, async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return reply.code(400).send({ error: 'El identificador del certificado no es válido' });
    }
    const certificado = await prisma.certificadoEmpleado.findUnique({
      where: { id },
      include: {
        empleado: true,
        nomina: true,
        liquidacion: { include: { conceptos: { orderBy: { orden: 'asc' } } } },
      },
    });
    if (!certificado) return reply.code(404).send({ error: 'Certificado no encontrado' });
    if (certificado.estado !== 'disponible' && certificado.estado !== 'entregado') {
      return reply.code(409).send({ error: 'El certificado todavía no está disponible para descargar' });
    }

    const doc = await pdfDeCertificadoLaboral(certificado);
    const trozos = [];
    for await (const trozo of doc) trozos.push(trozo);
    const pdf = Buffer.concat(trozos);

    return reply
      .header('content-type', 'application/pdf')
      .header('content-length', String(pdf.length))
      .header('content-disposition', `attachment; filename="${nombreArchivoLaboral(certificado)}"`)
      .header('cache-control', 'private, no-store')
      .send(pdf);
  });

  /* ── Contabilidad ───────────────────────────────────────────────────── */
  /* Lectura de lo que está pagado y lo que falta. La pueden consultar
     Contabilidad, Rectoría y Planeación: los pagos son su información. Lo que
     no se comparte es la escritura: registrar o conciliar un cobro sigue
     siendo solo de Contabilidad (guard `cta`). */
  app.get('/contabilidad/resumen', {
    preHandler: [app.autenticar, app.requiereRoles('contabilidad', 'rectoria', 'planeacion')],
  }, async () => {
    const movimientos = await prisma.movimiento.findMany({ orderBy: { fecha: 'desc' } });
    const ingresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.valor, 0);
    const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + m.valor, 0);

    const pagos = await prisma.pago.groupBy({ by: ['estado'], _sum: { valor: true } });
    const saldos = Object.fromEntries(pagos.map((p) => [p.estado, p._sum.valor || 0]));

    const enMora = await prisma.estudiante.findMany({
      where: { pagos: { some: { estado: 'vencido' } } },
      select: { id: true, nombre: true, documento: true, programa: { select: { nombre: true } } },
    });

    return {
      ingresos,
      egresos,
      utilidad: ingresos - egresos,
      saldos,
      porCobrar: (saldos.pendiente || 0) + (saldos.vencido || 0),
      enMora,
      movimientos: movimientos.slice(0, 20),
    };
  });

  /* ── Rectoría ───────────────────────────────────────────────────────── */
  app.get('/rectoria/resumen', {
    preHandler: [app.autenticar, app.requiereRoles('rectoria')],
  }, async () => {
    const [proyectos, estudiantes, aspirantes, movimientos] = await Promise.all([
      prisma.proyecto.findMany({ orderBy: { avance: 'desc' } }),
      prisma.estudiante.aggregate({ _avg: { promedio: true }, _count: { _all: true } }),
      prisma.aspirante.groupBy({ by: ['estado'], _count: { _all: true } }),
      prisma.movimiento.findMany(),
    ]);
    const ingresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.valor, 0);
    const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + m.valor, 0);

    return {
      proyectos: proyectos.map((p) => ({
        ...p,
        ejecucion: p.presupuesto ? Math.round((p.ejecutado / p.presupuesto) * 100) : 0,
      })),
      estudiantes: {
        total: estudiantes._count._all,
        promedio: estudiantes._avg.promedio ? Number(estudiantes._avg.promedio.toFixed(2)) : null,
      },
      aspirantes: Object.fromEntries(aspirantes.map((r) => [r.estado, r._count._all])),
      finanzas: { ingresos, egresos, ejecucion: ingresos ? Math.round((egresos / ingresos) * 100) : 0 },
    };
  });

  /* ── Talento Humano: planta, convocatorias y capacitación ───────────── */
  const th = { preHandler: [app.autenticar, app.requiereRoles('talento_humano')] };

  /* La planta docente se edita tanto desde Administración como desde aquí. */
  app.patch('/talento-humano/docentes/:id', th, async (req, reply) => {
    const { area, titulo, categoria, estado } = req.body || {};
    const data = {};
    if (area !== undefined) data.area = area || null;
    if (titulo !== undefined) data.titulo = titulo || null;
    if (categoria !== undefined) data.categoria = categoria || null;
    if (estado !== undefined) data.estado = estado;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    return prisma.docente.update({ where: { id: req.params.id }, data });
  });

  app.get('/talento-humano/convocatorias', th, async () =>
    prisma.convocatoria.findMany({
      orderBy: [{ estado: 'asc' }, { cierre: 'desc' }],
      include: { _count: { select: { postulados: true } } },
    })
  );

  app.post('/talento-humano/convocatorias', th, async (req, reply) => {
    const { cargo, area, dependencia, vinculo, cupos, apertura, cierre, requisitos } = req.body || {};
    if (!cargo || !String(cargo).trim()) return reply.code(400).send({ error: 'El cargo es obligatorio' });
    if (!apertura || !cierre) return reply.code(400).send({ error: 'Indique apertura y cierre' });
    if (new Date(cierre) < new Date(apertura)) {
      return reply.code(400).send({ error: 'La fecha de cierre no puede ser anterior a la de apertura' });
    }
    return reply.code(201).send(
      await prisma.convocatoria.create({
        data: {
          cargo: String(cargo).trim(),
          area: area ? String(area).trim() : 'Sin área',
          dependencia: dependencia ? String(dependencia).trim() : null,
          vinculo: vinculo || 'catedra',
          cupos: Math.max(1, Number(cupos) || 1),
          apertura: new Date(apertura),
          cierre: new Date(cierre),
          requisitos: requisitos ? String(requisitos).trim() : null,
        },
      })
    );
  });

  app.patch('/talento-humano/convocatorias/:id', th, async (req, reply) => {
    const { cupos, cierre, estado } = req.body || {};
    const data = {};
    if (cupos !== undefined) data.cupos = Math.max(1, Number(cupos) || 1);
    if (cierre !== undefined) data.cierre = new Date(cierre);
    if (estado !== undefined) data.estado = estado;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    return prisma.convocatoria.update({ where: { id: Number(req.params.id) }, data });
  });

  app.delete('/talento-humano/convocatorias/:id', th, async (req) => {
    await prisma.convocatoria.delete({ where: { id: Number(req.params.id) } });
    return { ok: true };
  });

  app.get('/talento-humano/convocatorias/:id/postulados', th, async (req) =>
    prisma.convocatoriaPostulado.findMany({
      where: { convocatoriaId: Number(req.params.id) },
      orderBy: [{ puntaje: 'desc' }, { id: 'asc' }],
    })
  );

  app.post('/talento-humano/convocatorias/:id/postulados', th, async (req, reply) => {
    const { nombre, documento, titulo, experiencia } = req.body || {};
    if (!nombre || !documento) {
      return reply.code(400).send({ error: 'Nombre y documento son obligatorios' });
    }
    return reply.code(201).send(
      await prisma.convocatoriaPostulado.create({
        data: {
          convocatoriaId: Number(req.params.id),
          nombre: String(nombre).trim(),
          documento: String(documento).trim(),
          titulo: titulo ? String(titulo).trim() : null,
          experiencia: Math.max(0, Number(experiencia) || 0),
        },
      })
    );
  });

  app.patch('/talento-humano/convocatorias/:id/postulados/:postuladoId', th, async (req, reply) => {
    const { estado, puntaje } = req.body || {};
    const data = {};
    if (estado !== undefined) data.estado = estado;
    if (puntaje !== undefined) data.puntaje = Number(puntaje);
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    return prisma.convocatoriaPostulado.update({ where: { id: Number(req.params.postuladoId) }, data });
  });

  app.get('/talento-humano/capacitaciones', th, async () =>
    prisma.capacitacion.findMany({ orderBy: { fecha: 'desc' } })
  );

  app.post('/talento-humano/capacitaciones', th, async (req, reply) => {
    const { nombre, tema, fecha, horas, docente, cupos } = req.body || {};
    if (!nombre || !fecha) return reply.code(400).send({ error: 'Nombre y fecha son obligatorios' });
    return reply.code(201).send(
      await prisma.capacitacion.create({
        data: {
          nombre: String(nombre).trim(),
          tema: tema ? String(tema).trim() : 'General',
          fecha: new Date(fecha),
          horas: Math.max(1, Number(horas) || 4),
          docente: docente ? String(docente).trim() : null,
          cupos: Math.max(1, Number(cupos) || 20),
        },
      })
    );
  });

  app.patch('/talento-humano/capacitaciones/:id', th, async (req, reply) => {
    const { inscritos, estado, cupos } = req.body || {};
    const data = {};
    if (inscritos !== undefined) data.inscritos = Math.max(0, Number(inscritos) || 0);
    if (cupos !== undefined) data.cupos = Math.max(1, Number(cupos) || 1);
    if (estado !== undefined) data.estado = estado;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    return prisma.capacitacion.update({ where: { id: Number(req.params.id) }, data });
  });

  /* ── Contabilidad: egresos y conciliación de pagos ──────────────────── */
  const cta = { preHandler: [app.autenticar, app.requiereRoles('contabilidad')] };

  app.get('/contabilidad/gastos', cta, async () => {
    const gastos = await prisma.gasto.findMany({ orderBy: { fecha: 'desc' } });
    const porCategoria = gastos.reduce((acc, g) => {
      acc[g.categoria] = acc[g.categoria] || { categoria: g.categoria, total: 0, n: 0 };
      acc[g.categoria].total += g.valor;
      acc[g.categoria].n += 1;
      return acc;
    }, {});
    return {
      gastos,
      porCategoria: Object.values(porCategoria).sort((a, b) => b.total - a.total),
      total: gastos.reduce((a, g) => a + g.valor, 0),
    };
  });

  app.post('/contabilidad/gastos', cta, async (req, reply) => {
    const { concepto, categoria, dependencia, valor, fecha, comprobante } = req.body || {};
    if (!concepto || !categoria) {
      return reply.code(400).send({ error: 'Concepto y categoría son obligatorios' });
    }
    const monto = Number(valor);
    if (!Number.isFinite(monto) || monto <= 0) {
      return reply.code(400).send({ error: 'El valor debe ser un número mayor que cero' });
    }
    return reply.code(201).send(
      await prisma.gasto.create({
        data: {
          concepto: String(concepto).trim(),
          categoria: String(categoria).trim(),
          dependencia: dependencia ? String(dependencia).trim() : null,
          valor: monto,
          fecha: fecha ? new Date(fecha) : new Date(),
          comprobante: comprobante ? String(comprobante).trim() : null,
        },
      })
    );
  });

  app.patch('/contabilidad/gastos/:id', cta, async (req, reply) => {
    const { estado, valor, comprobante } = req.body || {};
    const data = {};
    if (estado !== undefined) data.estado = estado;
    if (valor !== undefined) {
      const monto = Number(valor);
      if (!Number.isFinite(monto) || monto <= 0) {
        return reply.code(400).send({ error: 'El valor debe ser un número mayor que cero' });
      }
      data.valor = monto;
    }
    if (comprobante !== undefined) data.comprobante = comprobante || null;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    return prisma.gasto.update({ where: { id: Number(req.params.id) }, data });
  });

  /* Contabilidad necesita ver todos los cobros, no solo los del estudiante
     que hay en sesión: por eso se listan aquí y no desde /bootstrap. Rectoría
     y Planeación también los leen (por eso no usa el guard `cta`), pero solo
     para consultar: el PATCH de conciliación de más abajo sigue siendo
     exclusivo de Contabilidad. */
  app.get('/contabilidad/pagos', {
    preHandler: [app.autenticar, app.requiereRoles('contabilidad', 'rectoria', 'planeacion')],
  }, async () => {
    const pagos = await prisma.pago.findMany({
      orderBy: [{ estado: 'asc' }, { fechaLimite: 'asc' }],
      include: {
        estudiante: {
          select: { id: true, nombre: true, documento: true, programa: { select: { nombre: true } } },
        },
      },
    });
    return pagos.map((p) => ({
      ...p,
      estudiante: p.estudiante?.nombre ?? 'Estudiante eliminado',
      programa: p.estudiante?.programa?.nombre ?? null,
      documento: p.estudiante?.documento ?? null,
    }));
  });

  /* Contabilidad concilia pagos con la referencia bancaria. */
  app.patch('/contabilidad/pagos/:id', cta, async (req, reply) => {
    const { estado, referencia, fechaPago } = req.body || {};
    const ESTADOS = ['pagado', 'pendiente', 'vencido'];
    if (estado && !ESTADOS.includes(estado)) {
      return reply.code(400).send({ error: `Estado no válido. Use uno de: ${ESTADOS.join(', ')}` });
    }
    const data = {};
    if (estado !== undefined) data.estado = estado;
    if (referencia !== undefined) data.referencia = referencia ? String(referencia).trim() : null;
    if (fechaPago !== undefined) data.fechaPago = fechaPago ? new Date(fechaPago) : null;
    if (data.estado === 'pagado' && data.fechaPago === undefined) data.fechaPago = new Date();
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });
    return prisma.pago.update({ where: { id: Number(req.params.id) }, data });
  });

  /* ── Notificaciones del usuario ──────────────────────────────────────── */
  /* Solo devuelve las que corresponden al rol: `roles` vacío = para todos. */
  app.get('/notificaciones', { preHandler: [app.autenticar] }, async (req) => {
    const rol = req.usuario.role;
    const todas = await prisma.notificacion.findMany({
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    });
    return todas.filter((n) => !n.roles || n.roles.length === 0 || n.roles.includes(rol));
  });

  app.patch('/notificaciones/:id/leida', { preHandler: [app.autenticar] }, async (req, reply) => {
    const n = await prisma.notificacion.findUnique({ where: { id: Number(req.params.id) } });
    if (!n) return reply.code(404).send({ error: 'Notificación no encontrada' });
    const rol = req.usuario.role;
    if (n.roles && n.roles.length && !n.roles.includes(rol)) {
      return reply.code(403).send({ error: 'Esa notificación no es de su rol' });
    }
    return prisma.notificacion.update({ where: { id: n.id }, data: { leida: true } });
  });

  app.post('/notificaciones/leidas', { preHandler: [app.autenticar] }, async (req) => {
    const rol = req.usuario.role;
    const propias = await prisma.notificacion.findMany();
    const ids = propias
      .filter((n) => (!n.roles || n.roles.length === 0 || n.roles.includes(rol)) && !n.leida)
      .map((n) => n.id);
    await prisma.notificacion.updateMany({ where: { id: { in: ids } }, data: { leida: true } });
    return { ok: true, marcadas: ids.length };
  });
}
