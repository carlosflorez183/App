/* =============================================
   Generación de cuentas de acceso.
   Una sola regla en todo el sistema: el usuario de
   ingreso es el número de documento (sin puntos ni
   espacios) y la contraseña temporal también, con
   cambio obligatorio al primer ingreso (ver
   `debeCambiarPassword` en el modelo Usuario).
   ============================================= */
import { hash } from './auth.js';

/* Deja solo letras y dígitos en mayúscula: "1.023.445.671" -> "1023445671". */
export const documentoLimpio = (documento) =>
  String(documento || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();

/* Credenciales que se entregan una sola vez al generar la cuenta. */
export function credencialesDeDocumento(documento) {
  const usuario = documentoLimpio(documento);
  return { usuario, password: usuario };
}

/* Crea una cuenta activa ligada a un estudiante. `cliente` puede ser el prisma
   global o el de una transacción. */
export async function crearCuentaEstudiante(cliente, {
  nombre, documento, email, telefono, direccion, programaId, semestre,
}) {
  const { usuario, password } = credencialesDeDocumento(documento);
  const cuenta = await cliente.usuario.create({
    data: {
      usuario,
      password: hash(password),
      nombre,
      role: 'estudiante',
      email: email || null,
      telefono: telefono || null,
      direccion: direccion || null,
      programaId: programaId || null,
      semestre: semestre ? String(semestre) : null,
      activo: true,
      debeCambiarPassword: true,
    },
  });
  return { cuenta, usuario, password };
}

/* Devuelve la cuenta del estudiante: reutiliza la cuenta pendiente que dejó el
   registro público (se busca por documento) y la activa; si no existe, la crea. */
export async function asegurarCuentaEstudiante(cliente, datos) {
  const { usuario } = credencialesDeDocumento(datos.documento);
  const existente = await cliente.usuario.findUnique({ where: { usuario } });
  if (existente) {
    /* El documento no puede pisar una cuenta que no sea de estudiante: si no,
       un registro con documento "ADMIN" tomaría esa cuenta de administración. */
    if (existente.role !== 'estudiante') {
      const err = new Error(`El documento ${usuario} ya está en uso por otra cuenta`);
      err.statusCode = 409;
      throw err;
    }
    /* Solo se pisan los campos que llegan: al reutilizar una cuenta pendiente
       se conservan el correo, el teléfono y la dirección del registro. */
    const data = { nombre: datos.nombre, role: 'estudiante', activo: true, debeCambiarPassword: true };
    if (datos.email !== undefined) data.email = datos.email || null;
    if (datos.telefono !== undefined) data.telefono = datos.telefono || null;
    if (datos.direccion !== undefined) data.direccion = datos.direccion || null;
    if (datos.programaId !== undefined) data.programaId = datos.programaId || null;
    if (datos.semestre !== undefined) data.semestre = datos.semestre ? String(datos.semestre) : null;
    const cuenta = await cliente.usuario.update({ where: { id: existente.id }, data });
    return { cuenta, usuario, password: usuario, reutilizada: true };
  }
  const { cuenta, password } = await crearCuentaEstudiante(cliente, datos);
  return { cuenta, usuario, password, reutilizada: false };
}

/* Código de estudiante: año en curso + consecutivo de 4 dígitos (20260001). */
export async function siguienteCodigoEstudiante(cliente) {
  const prefijo = String(new Date().getFullYear());
  const previos = await cliente.estudiante.findMany({
    where: { id: { startsWith: prefijo } },
    select: { id: true },
  });
  let max = 0;
  for (const e of previos) {
    const n = Number(e.id.slice(prefijo.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefijo}${String(max + 1).padStart(4, '0')}`;
}
