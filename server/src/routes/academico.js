/* =============================================
   Rutas del módulo académico del estudiante:
   notas, pagos y certificados propios.
   ============================================= */
import { prisma } from '../config.js';
import { definitivaDe, estadoDe } from '../calificaciones.js';
import { nombreArchivo, pdfDeCertificado } from '../certificados.js';

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

  /* ── Descarga del certificado en PDF ──
     El archivo lo arma el servidor con los datos guardados. El botón del portal
     hace un GET normal a esta ruta y el navegador lo baja como attachment.

     Se arma en el servidor y no en el navegador por una razón: si cada cliente
     se inventara su propio PDF, el certificado que baja el alumno no sería el
     mismo documento que tiene la universidad en el expediente, y no se podría
     auditar. */
  /* Esta ruta NO incluye al profesor: los certificados son del estudiante (la
     tabla solo tiene `estudianteId` y un docente no tiene ficha de estudiante).
     Bajan el alumno el suyo y Registro o la administración cualquiera, porque
     es su trabajo emitirlos y reimprimirlos. */
  app.get(
    '/certificados/:id/pdf',
    { preHandler: [app.autenticar, app.requiereRoles('estudiante', 'admin', 'admisiones')] },
    async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return reply.code(400).send({ error: 'El identificador del certificado no es válido' });
    }
    /* Estudiante y programa en la misma consulta: es lo que va impreso. */
    const certificado = await prisma.certificadoEmitido.findUnique({
      where: { id },
      include: { estudiante: { include: { programa: true } } },
    });
    if (!certificado) return reply.code(404).send({ error: 'Certificado no encontrado' });

    /* Un certificado que todavía no se ha emitido no se descarga: se entrega
       cuando Registro lo emite, no antes. El estado es la misma regla que ve
       el alumno en la lista. */
    if (certificado.estado !== 'disponible' && certificado.estado !== 'entregado') {
      return reply.code(409).send({ error: 'El certificado todavía no está disponible para descargar' });
    }

    /* El estudiante solo baja lo suyo. Registro y administración sí pueden bajar
       cualquiera, porque es su trabajo emitirlos. */
    if (req.usuario.role === 'estudiante') {
      const e = await estudianteDe(req, reply);
      if (!e) return;
      if (certificado.estudianteId !== e.id) {
        return reply.code(403).send({ error: 'Ese certificado no es suyo' });
      }
    }

    const doc = await pdfDeCertificado(certificado);
    const trozos = [];
    for await (const trozo of doc) trozos.push(trozo);
    const pdf = Buffer.concat(trozos);

    reply
      .header('content-type', 'application/pdf')
      .header('content-length', String(pdf.length))
      .header('content-disposition', `attachment; filename="${nombreArchivo(certificado)}"`)
      .header('cache-control', 'private, no-store');
    return reply.send(pdf);
    },
  );

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
    /* La definitiva se pesa 30/30/40, no es el promedio plano. Se usa la misma
       función que el registro de notas del campus: dos reglas distintas para
       la misma cuenta darían dos notas finales distintas. */
    data.definitiva = definitivaDe(n1, n2, n3);
    data.estado = estadoDe(data.definitiva);
    return prisma.nota.update({ where: { id }, data });
  });
}
