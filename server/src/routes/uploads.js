import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export default async function (app, opts) {
  app.register(async function (fastify) {
    fastify.post('/uploads/curso', { preHandler: [fastify.autenticar, fastify.requiereRoles('admin', 'asistente', 'director')] }, async (req, reply) => {
      try {
        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'Archivo requerido' });
        const buffer = await data.toBuffer();
        const ext = path.extname(data.filename || '') || '.jpg';
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        const filePath = path.join(uploadsDir, name);
        fs.writeFileSync(filePath, buffer);
        const baseUrl = `${req.protocol}://${req.hostname}`;
        const url = `/uploads/${name}`;
        return { ok: true, url, filename: name };
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });
  });
}
