/* =============================================
   Autenticación: hash de contraseñas, emisión de
   token y guardas de rol para las rutas.
   ============================================= */
import bcrypt from 'bcryptjs';
import { prisma } from './config.js';
import { ACCESO_POR_ROL } from './demoUsuarios.js';

export const hash = (plano) => bcrypt.hashSync(plano, 10);
export const verificar = (plano, hashGuardado) => bcrypt.compareSync(plano, hashGuardado);

export const publico = (u) => ({
  usuario: u.usuario,
  nombre: u.nombre,
  role: u.role,
  codigo: u.codigo,
  email: u.email,
  telefono: u.telefono,
  direccion: u.direccion,
  programaId: u.programaId,
  programa: u.programa?.nombre || null,
  semestre: u.semestre,
  avatar: u.avatar,
  avatarClass: u.avatarClass,
  activo: u.activo,
});

/* Verifica el Bearer token y adjunta `req.usuario`. */
export async function autenticar(req) {
  try {
    const payload = await req.jwtVerify();
    const u = await prisma.usuario.findUnique({
      where: { usuario: payload.sub },
      include: { programa: true },
    });
    if (!u || !u.activo) throw new Error('Usuario inactivo');
    req.usuario = u;
  } catch {
    throw Object.assign(new Error('Token inválido o vencido'), { statusCode: 401 });
  }
}

/* Deja pasar solo a los roles indicados. Sin argumentos = cualquier autenticado. */
export function requiereRoles(...roles) {
  return async (req) => {
    if (roles.length && !roles.includes(req.usuario.role)) {
      throw Object.assign(new Error('No tiene permisos para este recurso'), { statusCode: 403 });
    }
  };
}

export const puedeVerModulo = (role, modulo) => {
  const lista = ACCESO_POR_ROL[role];
  if (!lista) return false;
  return lista.includes('*') || lista.includes(modulo);
};

/* Guardia única que valida el rol (si se indican) y el acceso al módulo.
   Debe devolver UNA sola función: Fastify no acepta arrays anidados dentro
   de preHandler. */
export function requiereModulo(modulo, ...roles) {
  return async (req) => {
    if (roles.length && !roles.includes(req.usuario.role)) {
      throw Object.assign(new Error('No tiene permisos para este recurso'), { statusCode: 403 });
    }
    if (!puedeVerModulo(req.usuario.role, modulo)) {
      throw Object.assign(
        new Error(`El rol ${req.usuario.role} no puede ver ${modulo}`),
        { statusCode: 403 }
      );
    }
  };
}
