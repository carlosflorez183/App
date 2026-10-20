/* =============================================
   Documentos del expediente de ingreso.

   El estudiante sube los requisitos exigidos (archivo en base64, mismo
   patrón y tope de 4 MB que el material del campus) y Admisiones los
   revisa desde su pestaña de Documentos. Mientras el expediente no esté
   validado (`estudiante.documentos !== 'completo'`) el alumno no ve
   cursos ni puede matricular.
   ============================================= */
import { prisma } from '../config.js';

/* Tope de un archivo subido: ~4 MB. Es el mismo criterio que usa el campus
   para el material de las actividades. */
const MAX_B64 = 5_600_000;

/* Ficha del estudiante dueño de la sesión. */
async function estudianteDe(req, reply) {
  const estudiante = await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id } });
  if (!estudiante) {
    reply.code(403).send({ error: 'Solo un estudiante puede gestionar documentos de ingreso' });
    return null;
  }
  return estudiante;
}

/* Lo que se devuelve de un archivo: nunca el contenido base64, solo los
   metadatos; el contenido se pide aparte al endpoint de descarga. */
const resumen = (d) => ({
  requisitoId: d.requisitoId,
  nombre: d.nombre,
  mime: d.mime,
  tamano: d.tamano,
  estado: d.estado,
  observacion: d.observacion,
  subidoEn: d.subidoEn,
  revisadoEn: d.revisadoEn,
});

export default async function rutasDocumentosIngreso(app) {
  const soloEstudiante = { preHandler: [app.autenticar, app.requiereRoles('estudiante')] };

  /* El expediente completo: requisitos vigentes, lo que ya subió el alumno y
     si su matrícula está habilitada. */
  app.get('/mis-documentos', soloEstudiante, async (req, reply) => {
    const estudiante = await estudianteDe(req, reply);
    if (!estudiante) return;

    const [requisitos, archivos] = await Promise.all([
      prisma.requisitoDocumento.findMany({ where: { vigente: true }, orderBy: { id: 'asc' } }),
      prisma.documentoIngreso.findMany({ where: { estudianteId: estudiante.id } }),
    ]);
    const porRequisito = new Map(archivos.map((a) => [a.requisitoId, a]));

    return {
      estudiante: {
        id: estudiante.id,
        nombre: estudiante.nombre,
        estado: estudiante.estado,
        documentos: estudiante.documentos,
      },
      /* La matrícula se habilita cuando Admisiones marca el expediente completo. */
      puedeMatricular: estudiante.documentos === 'completo',
      requisitos: requisitos.map((r) => ({
        id: r.id,
        clave: r.clave,
        nombre: r.nombre,
        obligatorio: r.obligatorio,
        archivo: porRequisito.has(r.id) ? resumen(porRequisito.get(r.id)) : null,
      })),
    };
  });

  /* Sube (o reemplaza) el archivo de un requisito. Un solo archivo por
     requisito: la clave única (estudiante, requisito) lo garantiza.
     `bodyLimit` amplía el límite de Fastify (1 MB) para que el tope real sea
     el de 4 MB que valida el handler. */
  app.post('/mis-documentos/:requisitoId', {
    ...soloEstudiante,
    bodyLimit: 8_000_000,
  }, async (req, reply) => {
    const estudiante = await estudianteDe(req, reply);
    if (!estudiante) return;

    const requisitoId = Number(req.params.requisitoId);
    const requisito = await prisma.requisitoDocumento.findUnique({ where: { id: requisitoId } });
    if (!requisito || !requisito.vigente) {
      return reply.code(404).send({ error: 'Requisito no encontrado o no vigente' });
    }

    const { archivoB64, archivo, archivoMime } = req.body || {};
    if (!archivoB64 || typeof archivoB64 !== 'string') {
      return reply.code(400).send({ error: 'Falta el archivo (archivoB64)' });
    }
    if (archivoB64.length > MAX_B64) {
      return reply.code(413).send({ error: 'El archivo supera el máximo de 4 MB' });
    }

    /* Al volver a subir se limpia la observación y el veredicto anterior:
       es un expediente nuevo que Admisiones debe revisar de nuevo. */
    const guardado = await prisma.documentoIngreso.upsert({
      where: {
        estudianteId_requisitoId: { estudianteId: estudiante.id, requisitoId },
      },
      create: {
        estudianteId: estudiante.id,
        requisitoId,
        nombre: archivo || `${requisito.clave}.pdf`,
        mime: archivoMime || 'application/pdf',
        tamano: archivoB64.length,
        contenidoB64: archivoB64,
        estado: 'pendiente',
        observacion: null,
        revisadoEn: null,
        revisadoPor: null,
      },
      update: {
        nombre: archivo || `${requisito.clave}.pdf`,
        mime: archivoMime || 'application/pdf',
        tamano: archivoB64.length,
        contenidoB64: archivoB64,
        estado: 'pendiente',
        observacion: null,
        revisadoEn: null,
        revisadoPor: null,
        subidoEn: new Date(),
      },
    });

    return { ok: true, archivo: resumen(guardado) };
  });

  /* Descarga el archivo que el estudiante subió (el mismo o Admisiones). */
  app.get('/mis-documentos/:requisitoId/archivo', soloEstudiante, async (req, reply) => {
    const estudiante = await estudianteDe(req, reply);
    if (!estudiante) return;

    const documento = await prisma.documentoIngreso.findUnique({
      where: {
        estudianteId_requisitoId: {
          estudianteId: estudiante.id,
          requisitoId: Number(req.params.requisitoId),
        },
      },
    });
    if (!documento) {
      return reply.code(404).send({ error: 'Este requisito no tiene archivo' });
    }
    return reply
      .header('content-type', documento.mime || 'application/octet-stream')
      .header(
        'content-disposition',
        `attachment; filename="${encodeURIComponent(documento.nombre || 'documento')}"`
      )
      .send(Buffer.from(documento.contenidoB64, 'base64'));
  });

  /* El estudiante retira un archivo mientras Admisiones no lo ha aprobado. */
  app.delete('/mis-documentos/:requisitoId', soloEstudiante, async (req, reply) => {
    const estudiante = await estudianteDe(req, reply);
    if (!estudiante) return;

    const documento = await prisma.documentoIngreso.findUnique({
      where: {
        estudianteId_requisitoId: {
          estudianteId: estudiante.id,
          requisitoId: Number(req.params.requisitoId),
        },
      },
    });
    if (!documento) {
      return reply.code(404).send({ error: 'Este requisito no tiene archivo' });
    }
    if (documento.estado === 'aprobado') {
      return reply.code(409).send({ error: 'Un documento aprobado por Admisiones no se puede borrar' });
    }
    await prisma.documentoIngreso.delete({ where: { id: documento.id } });
    return { ok: true };
  });
}
