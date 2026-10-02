/* =============================================
   Rutas del módulo académico del estudiante:
   notas, pagos y certificados propios.
   ============================================= */
import { prisma } from '../config.js';

export default async function rutasAcademico(app) {
  const guard = { preHandler: [app.autenticar, app.requiereRoles('estudiante', 'profesor', 'admin')] };

  /* Devuelve el Estudiante asociado al usuario conectado. */
  async function estudianteDe(req, reply) {
    const rel = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { estudiante: true },
    });
    if (!rel?.estudiante) {
      reply.code(404).send({ error: 'El usuario no tiene ficha de estudiante' });
      return null;
    }
    return rel.estudiante;
  }

  app.get('/notas', guard, async (req, reply) => {
    const e = await estudianteDe(req, reply);
    if (!e) return;
    const notas = await prisma.nota.findMany({
      where: { estudianteId: e.id },
      orderBy: [{ periodo: 'desc' }, { codigo: 'asc' }],
    });
    return {
      estudiante: { id: e.id, nombre: e.nombre, promedio: e.promedio },
      notas,
    };
  });

  /* Pagos y estado de cuenta del estudiante. */
  app.get('/pagos', guard, async (req, reply) => {
    const e = await estudianteDe(req, reply);
    if (!e) return;
    const pagos = await prisma.pago.findMany({
      where: { estudianteId: e.id },
      orderBy: { fechaLimite: 'asc' },
    });
    const saldos = { pagado: 0, pendiente: 0, vencido: 0 };
    for (const p of pagos) saldos[p.estado] = (saldos[p.estado] || 0) + p.valor;
    return {
      pagos,
      saldos,
      debe: saldos.pendiente + saldos.vencido,
    };
  });

  app.get('/certificados', guard, async (req, reply) => {
    const e = await estudianteDe(req, reply);
    if (!e) return;
    return prisma.certificadoEmitido.findMany({
      where: { estudianteId: e.id },
      orderBy: { id: 'desc' },
    });
  });

  /* El alumno pide un certificado. Queda en su bandeja como solicitud
     (`solicitado` con fecha) a la espera de que Registro lo emita. */
  app.post('/certificados', guard, async (req, reply) => {
    const e = await estudianteDe(req, reply);
    if (!e) return;
    const { tipo } = req.body || {};
    if (!tipo) return reply.code(400).send({ error: 'Falta el tipo de certificado' });
    const creado = await prisma.certificadoEmitido.create({
      data: {
        estudianteId: e.id,
        matricula: e.id,
        tipo,
        fecha: null,
        solicitado: new Date(),
        estado: 'en_proceso',
      },
    });
    return reply.code(201).send(creado);
  });

  /* El docente califica una materia. Recalcula la definitiva con los tres
     cortes cuando ya están todos. */
  app.patch('/notas/:id', { preHandler: [app.autenticar, app.requiereRoles('profesor', 'admin')] }, async (req, reply) => {
    const id = Number(req.params.id);
    const existe = await prisma.nota.findUnique({ where: { id } });
    if (!existe) return reply.code(404).send({ error: 'Materia no encontrada' });

    const data = {};
    for (const campo of ['nota1', 'nota2', 'nota3']) {
      if (req.body?.[campo] !== undefined) {
        data[campo] = req.body[campo] === null ? null : Number(req.body[campo]);
      }
    }
    const n1 = data.nota1 ?? existe.nota1;
    const n2 = data.nota2 ?? existe.nota2;
    const n3 = data.nota3 ?? existe.nota3;
    if (n1 !== null && n2 !== null && n3 !== null) {
      data.definitiva = Number(((n1 + n2 + n3) / 3).toFixed(2));
      data.estado = data.definitiva >= 3 ? 'aprobado' : 'reprobado';
    }
    return prisma.nota.update({ where: { id }, data });
  });
}
