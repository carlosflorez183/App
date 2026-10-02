/* =============================================
   Prisma + configuración de entorno.
   ============================================= */
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export const PUERTO = Number(process.env.PORT || 3000);
export const ORIGENES = (process.env.CORS_ORIGIN || 'http://localhost:8080,http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
