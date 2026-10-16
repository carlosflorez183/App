/* =============================================
   Rutas de autenticación.
   ============================================= */
import { prisma } from '../config.js';
import { verificar, publico, hash } from '../auth.js';

/* Intentos de login permitidos por cuenta y por minuto. En producción el valor
   seguro es bajo (5); el stack demo lo sube por las corridas de verificación. */
const LIMITE_LOGIN = Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5) || 5;

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

    const token = app.jwt.sign(
      { sub: u.usuario, role: u.role },
      { expiresIn: '12h' }
    );
    return { token, usuario: publico(u) };
  });

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
