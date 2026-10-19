/* =============================================
   Rutas de autenticación.
   ============================================= */
import { prisma } from '../config.js';
import { verificar, publico, hash } from '../auth.js';
import { USUARIOS_DEMO } from '../demoUsuarios.js';

/* Intentos de login permitidos por cuenta y por minuto. En producción el valor
   seguro es bajo (5); el stack demo lo sube por las corridas de verificación. */
const LIMITE_LOGIN = Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5) || 5;

/* Acceso rápido de demostración (botones de "entrar como..."). La lista y el
   ingreso salen de la BASE DE DATOS: la contraseña nunca viaja al navegador ni
   vive en el código. Está apagado por defecto y solo se enciende con
   DEMO_QUICK_LOGIN=1 (stack de demostración). */
const DEMO_RAPIDO = ['1', 'true'].includes(
  String(process.env.DEMO_QUICK_LOGIN || '').toLowerCase()
);
const ORDEN_DEMO = USUARIOS_DEMO.map((u) => u.usuario);
const ES_DEMO = new Set(ORDEN_DEMO);

/* Firma el token de sesión para un usuario ya validado. */
const crearSesion = (app, u) => ({
  token: app.jwt.sign({ sub: u.usuario, role: u.role }, { expiresIn: '12h' }),
  usuario: publico(u),
});

export default async function rutasAuth(app) {
  app.post(
    '/auth/login',
    {
      config: {
        /* Freno a la fuerza bruta: pocos intentos por minuto y por cuenta. */
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

    const u = await prisma.usuario.findUnique({ where: { usuario }, include: { programa: true } });
    // Mismo mensaje para usuario inexistente y contraseña incorrecta, para no
    // revelar qué cuentas existen.
    if (!u || !verificar(password, u.password)) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }
    if (!u.activo) {
      return reply.code(403).send({ error: 'El usuario está inactivo' });
    }

    return crearSesion(app, u);
  });

  /* Lista de cuentas para el acceso rápido: solo metadatos (usuario, nombre y
     rol), nunca contraseñas. */
  app.get('/auth/demo', async (req, reply) => {
    if (!DEMO_RAPIDO) return reply.code(404).send({ error: 'No disponible' });
    const usuarios = await prisma.usuario.findMany({
      where: { usuario: { in: ORDEN_DEMO }, activo: true },
      select: { usuario: true, nombre: true, role: true },
    });
    usuarios.sort((a, b) => ORDEN_DEMO.indexOf(a.usuario) - ORDEN_DEMO.indexOf(b.usuario));
    return { usuarios };
  });

  /* Entra como una cuenta de demostración sin pedir contraseña. Solo funciona
     con las cuentas sembradas y con DEMO_QUICK_LOGIN encendido. */
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
      const u = await prisma.usuario.findUnique({ where: { usuario } });
      if (!u || !u.activo) {
        return reply.code(404).send({ error: 'Cuenta de demostración no disponible' });
      }
      return crearSesion(app, u);
    }
  );

  app.get('/auth/yo', { preHandler: [app.autenticar] }, async (req) => publico(req.usuario));

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
      data: { password: hash(nueva) },
    });
    return { ok: true };
  });
}
