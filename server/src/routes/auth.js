/* =============================================
   Rutas de autenticación.
   ============================================= */
import { prisma } from '../config.js';
import { verificar, publico, hash } from '../auth.js';
import { USUARIOS_DEMO } from '../demoUsuarios.js';
import {
  asegurarCuentaEstudiante,
  credencialesDeDocumento,
  documentoLimpio,
  siguienteCodigoEstudiante,
} from '../cuentas.js';
import { notificarInscripcionRecibida } from '../email.js';

const LIMITE_LOGIN = Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5) || 5;

const DEMO_RAPIDO = ['1', 'true'].includes(
  String(process.env.DEMO_QUICK_LOGIN || '').toLowerCase()
);
const ORDEN_DEMO = USUARIOS_DEMO.map((u) => u.usuario);
const ES_DEMO = new Set(ORDEN_DEMO);

const crearSesion = (app, u) => ({
  token: app.jwt.sign({ sub: u.usuario, role: u.role }, { expiresIn: '12h' }),
  usuario: publico(u),
});

export default async function rutasAuth(app) {
  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: { max: LIMITE_LOGIN, timeWindow: '1 minute' },
      },
      schema: {
        body: {
          type: 'object',
          required: ['usuario', 'password'],
          properties: {
            usuario: { type: 'string', minLength: 1, maxLength: 100 },
            password: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      const { usuario, password } = req.body || {};
      if (!usuario || !password) {
        return reply.code(400).send({ error: 'Faltan usuario y contraseña' });
      }

      const u = await prisma.usuario.findUnique({
        where: { usuario },
        include: {
          programa: true,
          estudiante: { select: { id: true, estado: true, documentos: true, financiacion: true, cupoBrilla: true, tieneCajaCompensacion: true } },
        },
      });
      if (!u || !verificar(password, u.password)) {
        return reply.code(401).send({ error: 'Credenciales inválidas' });
      }
      if (!u.activo) {
        return reply.code(403).send({ error: 'El usuario está inactivo' });
      }

      return crearSesion(app, u);
    });

  app.get('/auth/inscripcion', async () => {
    const [programas, proceso, requisitos] = await Promise.all([
      prisma.programa.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, facultad: true },
      }),
      prisma.procesoAdmision.findFirst({
        where: { procesoAbierto: true },
        select: { id: true, nombre: true },
      }),
      prisma.requisitoDocumento.findMany({
        where: { vigente: true },
        orderBy: { id: 'asc' },
        select: { id: true, clave: true, nombre: true, obligatorio: true },
      }),
    ]);
    return { programas, procesoAbierto: !!proceso, proceso: proceso || null, requisitos };
  });

  app.post(
    '/auth/registro',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['nombre', 'documento', 'programaId'],
          properties: {
            nombre: { type: 'string', minLength: 3, maxLength: 120 },
            documento: { type: 'string', minLength: 4, maxLength: 30 },
            programaId: { type: 'integer' },
            email: { type: 'string', maxLength: 120 },
            telefono: { type: 'string', pattern: '^$|^[0-9]{7,15}$', maxLength: 15 },
            direccion: { type: 'string', maxLength: 160 },
            esMenorDeEdad: { type: 'boolean' },
            responsableParentesco: { type: 'string', maxLength: 60 },
            responsableNombre: { type: 'string', maxLength: 120 },
            responsableTipoDoc: { type: 'string', maxLength: 20 },
            responsableDocumento: { type: 'string', maxLength: 30 },
            responsableTelefono: { type: 'string', pattern: '^$|^[0-9]{7,15}$', maxLength: 15 },
            responsableEmail: { type: 'string', maxLength: 120 },
            documentos: {
              type: 'array',
              items: {
                type: 'object',
                required: ['requisitoId', 'archivoB64', 'archivo'],
                properties: {
                  requisitoId: { type: 'integer' },
                  archivoB64: { type: 'string' },
                  archivo: { type: 'string', maxLength: 200 },
                  archivoMime: { type: 'string', maxLength: 100 },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const {
        nombre, documento, programaId, email, telefono, direccion,
        esMenorDeEdad, responsableParentesco, responsableNombre,
        responsableTipoDoc, responsableDocumento, responsableTelefono, responsableEmail,
        documentos,
      } = req.body || {};

      if (esMenorDeEdad && (!responsableNombre || !responsableDocumento || !responsableTelefono)) {
        return reply.code(400).send({
          error: 'Para aspirantes menores de edad, los datos del responsable (nombre, documento y teléfono) son obligatorios',
        });
      }

      if (telefono && !/^\d{7,15}$/.test(String(telefono).trim())) {
        return reply.code(400).send({
          error: 'El teléfono debe contener únicamente números (entre 7 y 15 dígitos)',
        });
      }

      if (esMenorDeEdad && !/^\d{7,15}$/.test(String(responsableTelefono).trim())) {
        return reply.code(400).send({
          error: 'El teléfono del responsable debe contener únicamente números (entre 7 y 15 dígitos)',
        });
      }

      const doc = documentoLimpio(documento);
      if (doc.length < 4 || !/^\d{4,20}$/.test(doc)) {
        return reply.code(400).send({ error: 'El documento de identidad debe contener únicamente números (mínimo 4 dígitos)' });
      }

      const programa = await prisma.programa.findUnique({ where: { id: Number(programaId) } });
      if (!programa || !programa.activo) {
        return reply.code(400).send({ error: 'El programa seleccionado no está disponible' });
      }
      const proceso = await prisma.procesoAdmision.findFirst({ where: { procesoAbierto: true } });
      if (!proceso) {
        return reply.code(400).send({ error: 'No hay un proceso de inscripción abierto en este momento' });
      }
      if (await prisma.aspirante.findUnique({ where: { documento: doc } })) {
        return reply.code(409).send({ error: 'Ya existe una inscripción con ese documento' });
      }
      if (await prisma.estudiante.findUnique({ where: { documento: doc } })) {
        return reply.code(409).send({ error: 'Ese documento ya tiene ficha de estudiante' });
      }
      /* El documento no puede pisar una cuenta que no sea de estudiante: si no,
         un registro con documento "ADMIN" tomaría esa cuenta de administración.
         Se revisa ANTES de crear el aspirante para no dejar registros huérfanos. */
      const { usuario } = credencialesDeDocumento(doc);
      const cuentaExistente = await prisma.usuario.findUnique({ where: { usuario } });
      if (cuentaExistente && cuentaExistente.role !== 'estudiante') {
        return reply.code(409).send({ error: 'Ese documento no se puede usar para la inscripción' });
      }

      const limpio = String(nombre).trim();
      const resultado = await prisma.$transaction(async (tx) => {
        const aspirante = await tx.aspirante.create({
          data: {
            procesoId: proceso.id,
            programaId: programa.id,
            nombre: limpio,
            documento: doc,
            puntajeIcfes: 0,
            examen: 0,
            promedio: 0,
            fecha: new Date(),
            estado: 'en_proceso',
            documentos: 'pendiente',
          },
        });

        const { cuenta } = await asegurarCuentaEstudiante(tx, {
          nombre: limpio,
          documento: doc,
          email,
          telefono,
          direccion,
          programaId: programa.id,
          semestre: 1,
        });

        const codigo = await siguienteCodigoEstudiante(tx);
        const estudiante = await tx.estudiante.create({
          data: {
            id: codigo,
            nombre: limpio,
            documento: doc,
            correo: email || null,
            telefono: telefono || null,
            direccion: direccion || null,
            programaId: programa.id,
            semestre: 1,
            jornada: 'diurna',
            promedio: 0,
            estado: 'en_inscripcion',
            documentos: 'pendiente',
            fechaIngreso: new Date(),
            aspiranteId: aspirante.id,
            usuarioId: cuenta.id,
          },
        });

        if (Array.isArray(documentos) && documentos.length > 0) {
          for (const d of documentos) {
            if (d.requisitoId && d.archivoB64) {
              await tx.documentoIngreso.create({
                data: {
                  estudianteId: codigo,
                  requisitoId: Number(d.requisitoId),
                  nombre: d.archivo || 'documento.pdf',
                  mime: d.archivoMime || 'application/pdf',
                  tamano: d.archivoB64.length,
                  contenidoB64: d.archivoB64,
                  estado: 'pendiente',
                },
              });
            }
          }
        }

        return { aspirante, estudiante, usuario, password: usuario };
      });

      // Notificación automática por correo electrónico institucional
      notificarInscripcionRecibida({
        email: emailLimpio,
        nombre: resultado.aspirante.nombre,
        documento: resultado.aspirante.documento,
        programa: programa?.nombre,
      }).catch((err) => console.error('Error al enviar email de inscripción:', err));

      return {
        ok: true,
        mensaje: `Inscripción registrada para ${resultado.aspirante.nombre}. Ya puede entrar con su documento y la contraseña temporal.`,
        aspirante: {
          id: resultado.aspirante.id,
          nombre: resultado.aspirante.nombre,
          estado: resultado.aspirante.estado,
          esMenorDeEdad: !!esMenorDeEdad,
          responsableNombre: esMenorDeEdad ? responsableNombre : null,
          responsableParentesco: esMenorDeEdad ? responsableParentesco : null,
          responsableTelefono: esMenorDeEdad ? responsableTelefono : null,
        },
        estudiante: { id: resultado.estudiante.id, estado: resultado.estudiante.estado },
        credenciales: { usuario: resultado.usuario, password: resultado.password },
      };
    }
  );

  app.get('/auth/demo', async (req, reply) => {
    if (!DEMO_RAPIDO) return reply.code(404).send({ error: 'No disponible' });
    const usuarios = await prisma.usuario.findMany({
      where: { usuario: { in: ORDEN_DEMO }, activo: true },
      select: { usuario: true, nombre: true, role: true },
    });
    usuarios.sort((a, b) => ORDEN_DEMO.indexOf(a.usuario) - ORDEN_DEMO.indexOf(b.usuario));
    return { usuarios };
  });

  app.post(
    '/auth/demo',
    {
      config: { rateLimit: { max: LIMITE_LOGIN, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['usuario'],
          properties: { usuario: { type: 'string', minLength: 1, maxLength: 100 } },
        },
      },
    },
    async (req, reply) => {
      if (!DEMO_RAPIDO) return reply.code(404).send({ error: 'No disponible' });
      const usuario = String(req.body?.usuario || '').trim().toUpperCase();
      if (!ES_DEMO.has(usuario)) {
        return reply.code(404).send({ error: 'Cuenta de demostración no disponible' });
      }
      const u = await prisma.usuario.findUnique({
        where: { usuario },
        include: {
          programa: true,
          estudiante: { select: { id: true, estado: true, documentos: true, financiacion: true, cupoBrilla: true, tieneCajaCompensacion: true } },
        },
      });
      if (!u || !u.activo) {
        return reply.code(404).send({ error: 'Cuenta de demostración no disponible' });
      }
      return crearSesion(app, u);
    }
  );

  app.get('/auth/yo', { preHandler: [app.autenticar] }, async (req) => publico(req.usuario));

  /* Perfil propio: cada usuario edita sus datos de contacto. No puede cambiar
     su rol ni su usuario de ingreso desde aquí. */
  app.patch('/auth/perfil', { preHandler: [app.autenticar] }, async (req, reply) => {
    const { nombre, email, telefono, direccion } = req.body || {};
    const data = {};
    if (nombre !== undefined) {
      const limpio = String(nombre).trim();
      if (!limpio) return reply.code(400).send({ error: 'El nombre no puede quedar vacío' });
      data.nombre = limpio.slice(0, 120);
    }
    if (email !== undefined) {
      const limpio = String(email).trim();
      if (limpio && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)) {
        return reply.code(400).send({ error: 'El correo electrónico no tiene un formato válido' });
      }
      data.email = limpio || null;
    }
    if (telefono !== undefined) data.telefono = String(telefono).trim().slice(0, 30) || null;
    if (direccion !== undefined) data.direccion = String(direccion).trim().slice(0, 200) || null;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'No hay cambios que aplicar' });

    const actualizado = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data,
      include: { programa: true, estudiante: { select: { id: true, estado: true, documentos: true, financiacion: true, cupoBrilla: true, tieneCajaCompensacion: true } } },
    });
    return publico(actualizado);
  });

  /* Foto de perfil. Llega como imagen en base64 ya redimensionada desde el
     navegador. Se valida aquí el tipo real y el tamaño, sin confiar en el
     cliente. Solo se aceptan JPEG, PNG y WebP. */
  app.put('/auth/avatar', { preHandler: [app.autenticar], bodyLimit: 600_000 }, async (req, reply) => {
    const { imagen } = req.body || {};
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(imagen || ''));
    if (!m) return reply.code(400).send({ error: 'La foto debe ser JPEG, PNG o WebP' });
    const buffer = Buffer.from(m[2], 'base64');
    if (buffer.length > 300_000) return reply.code(400).send({ error: 'La foto supera 300 KB' });
    // Firma del archivo: impide disfrazar otro tipo de contenido como imagen.
    const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const esPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const esWebp = buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
    if (!esJpeg && !esPng && !esWebp) return reply.code(400).send({ error: 'El archivo no es una imagen válida' });

    const actualizado = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { avatar: imagen },
      include: { programa: true, estudiante: { select: { id: true, estado: true, documentos: true, financiacion: true, cupoBrilla: true, tieneCajaCompensacion: true } } },
    });
    return publico(actualizado);
  });

  app.delete('/auth/avatar', { preHandler: [app.autenticar] }, async (req) => {
    const actualizado = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { avatar: null },
      include: { programa: true, estudiante: { select: { id: true, estado: true, documentos: true, financiacion: true, cupoBrilla: true, tieneCajaCompensacion: true } } },
    });
    return publico(actualizado);
  });

  app.post('/auth/password', { preHandler: [app.autenticar] }, async (req, reply) => {
    const { actual, nueva } = req.body || {};
    if (!nueva || nueva.length < 6) {
      return reply.code(400).send({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    if (!verificar(actual || '', req.usuario.password)) {
      return reply.code(401).send({ error: 'La contraseña actual no coincide' });
    }
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { password: hash(nueva), debeCambiarPassword: false },
    });
    return { ok: true };
  });
}
