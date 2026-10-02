/* =============================================
   API UniPlataforma
   ============================================= */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';

import { prisma, PUERTO, ORIGENES } from './config.js';
import { autenticar, requiereRoles, requiereModulo } from './auth.js';

import rutasAuth from './routes/auth.js';
import rutasBootstrap from './routes/bootstrap.js';
import rutasMatricula from './routes/matricula.js';
import rutasAdmisiones from './routes/admisiones.js';
import rutasCampus from './routes/campus.js';
import rutasAcademico from './routes/academico.js';
import rutasAdmin from './routes/admin.js';

const app = Fastify({
  logger: process.env.LOG_LEVEL
    ? { level: process.env.LOG_LEVEL }
    : false,
});

/* La clave del JWT se lee del entorno. En producción tiene que ser fija y
   distinta de la de desarrollo. */
const SECRETO = process.env.JWT_SECRET || 'uni-plataforma-dev-secret-cambiar-en-produccion';
if (!process.env.JWT_SECRET) {
  console.warn('⚠  JWT_SECRET no definido: usando el secreto de desarrollo.');
}

await app.register(cors, { origin: ORIGENES, credentials: true });
await app.register(jwt, { secret: SECRETO });

/* Decora la instancia para que las rutas usen app.autenticar / app.requiereRoles. */
app.decorate('autenticar', autenticar);
app.decorate('requiereRoles', requiereRoles);
app.decorate('requiereModulo', requiereModulo);

/* ── Salud y diagnóstico ──────────────────────────────────────────────── */
app.get('/api/salud', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, servicio: 'uni-plataforma-api', hora: new Date().toISOString() };
});

/* Todas las rutas cuelgan de /api. */
await app.register(
  async (scope) => {
    await rutasAuth(scope);
    await rutasBootstrap(scope);
    await rutasMatricula(scope);
    await rutasAdmisiones(scope);
    await rutasCampus(scope);
    await rutasAcademico(scope);
    await rutasAdmin(scope);
  },
  { prefix: '/api' }
);

app.setErrorHandler((err, req, reply) => {
  const status = err.statusCode || 500;
  if (status >= 500) console.error('Error en', req.method, req.url, err);
  reply.code(status).send({
    error: err.message || 'Error interno del servidor',
  });
});

app.setNotFoundHandler((req, reply) => {
  reply.code(404).send({ error: `No existe ${req.method} ${req.url}` });
});

/* Espera a que la base responda antes de aceptar tráfico: evita que el
   contenedor quede "healthy" con la API caído tras un reinicio de Postgres. */
async function esperarBase(intentos = 30) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✔ Base de datos lista (intento ${i})`);
      return;
    } catch (e) {
      if (i === intentos) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

await esperarBase();

try {
  await app.listen({ port: PUERTO, host: '0.0.0.0' });
  console.log(`→ API escuchando en http://0.0.0.0:${PUERTO}`);
} catch (e) {
  console.error('✖ No se pudo arrancar la API:', e);
  process.exit(1);
}

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}
