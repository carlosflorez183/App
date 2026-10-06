/* =============================================
   Cliente HTTP de la API.

   La base por defecto es relativa ('/api') y funciona en los dos entornos:
   - Docker:     nginx hace de proxy de /api hacia el contenedor `api`.
   - Desarrollo: el proxy de Vite reenvía /api a http://localhost:3000.

   Se puede apuntar a otro backend con VITE_API_URL (p. ej. una API remota).
   ============================================= */

const BASE = import.meta.env?.VITE_API_URL || '/api';
const TOKEN_KEY = 'uni_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible (modo privado): se ignora */
  }
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const parsear = (texto) => {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
};

/* fetch con token, JSON y errores legibles.
   Un fallo de red se propaga como TypeError: quien llama lo usa para
   distinguir "el servidor respondió" de "no hay servidor". */
export async function api(path, { method = 'GET', body, signal } = {}) {
  const init = { method, signal, headers: {} };
  const t = getToken();
  if (t) init.headers.Authorization = `Bearer ${t}`;
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);

  const data = parsear(await res.text());
  if (!res.ok) {
    /* Se lee `message` antes que `error`: cuando una ruta lanza un error,
       Fastify responde {statusCode, error: 'Forbidden', message: 'No tiene
       permisos...'} y el campo `error` gana con la palabra en inglés. Así la
       docente veía "No se guardó la nota: Forbidden" sin saber qué hacer. */
    let mensaje = data?.message || data?.error || `HTTP ${res.status}`;
    if (res.status === 401) mensaje = 'Tu sesión venció. Vuelve a entrar.';
    /* Se avisa para que la app revise si el token cambió de cuenta: el token
       vive en localStorage y otra pestaña puede haber iniciado sesión con otro
       usuario mientras esta seguía abierta como docente. */
    if (res.status === 401 || res.status === 403) {
      try { window.dispatchEvent(new CustomEvent('uni:sesion-rechazada')); } catch { /* sin ventana */ }
    }
    throw new ApiError(mensaje, res.status);
  }
  return data;
}

/* ── Autenticación ─────────────────────────────────────────────────────── */
export const login = (usuario, password) =>
  api('/auth/login', { method: 'POST', body: { usuario, password } });

export const yo = () => api('/auth/yo');

/* ── Datos ─────────────────────────────────────────────────────────────── */
export const bootstrap = () => api('/bootstrap');

/* ── Acciones ──────────────────────────────────────────────────────────── */
export const marcarNotificacionLeida = (id) =>
  api(`/notificaciones/${id}/leida`, { method: 'PATCH' });

export const actualizarAspirante = (id, cambios) =>
  api(`/admisiones/aspirantes/${id}`, { method: 'PATCH', body: cambios });

export const actualizarEstudiante = (id, cambios) =>
  api(`/admisiones/estudiantes/${id}`, { method: 'PATCH', body: cambios });

export const emitirCertificado = (estudianteId, tipo) =>
  api('/admisiones/certificados', { method: 'POST', body: { estudianteId, tipo } });

export const solicitarCertificado = (tipo) =>
  api('/certificados', { method: 'POST', body: { tipo } });

/* ── Descargar el certificado ──
   El PDF lo arma el servidor, no el navegador: se pide el archivo y se entrega
   al navegador como una descarga normal. No se puede usar `api()` porque esa
   espera un JSON y aquí llega un application/pdf.

   El nombre del archivo lo manda el servidor en `content-disposition`, así que
   no hay que inventarlo aquí: si el servidor lo renombra, el archivo baja con
   el nombre correcto sin tocar el portal. */
export async function descargarCertificado(id) {
  const init = { headers: {} };
  const t = getToken();
  if (t) init.headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}/certificados/${id}/pdf`, init);
  if (!res.ok) {
    let mensaje = `HTTP ${res.status}`;
    try {
      const cuerpo = await res.json();
      mensaje = cuerpo?.message || cuerpo?.error || mensaje;
    } catch { /* la respuesta no era JSON: se deja el HTTP */ }
    throw new ApiError(mensaje, res.status);
  }
  const tipo = (res.headers.get('content-type') || '').split(';')[0];
  if (tipo !== 'application/pdf') {
    throw new ApiError(`El servidor devolvió ${tipo || 'un tipo raro'} en vez de un PDF`, res.status);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const nombre = /filename="([^"]+)"/.exec(disposition)?.[1] || `certificado-${id}.pdf`;
  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  /* Sin revocar la URL, el archivo se queda en memoria y en descargas
     repetidas acaba dando error en el navegador. */
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return nombre;
}

export const registrarPago = (id, cambios) =>
  api(`/admisiones/pagos/${id}`, { method: 'PATCH', body: cambios });

export const alternarRequisito = (clave, vigente) =>
  api(`/admisiones/requisitos/${encodeURIComponent(clave)}`, {
    method: 'PATCH',
    body: { vigente },
  });

export const actualizarNota = (id, cambios) =>
  api(`/notas/${id}`, { method: 'PATCH', body: cambios });

export const actualizarActividad = (cursoId, id, cambios) =>
  api(`/cursos/${cursoId}/actividades/${id}`, { method: 'PATCH', body: cambios });

/* ── Administración ────────────────────────────────────────────────────── */
export const listarUsuarios = () => api('/admin/usuarios');

export const actualizarUsuario = (id, cambios) =>
  api(`/admin/usuarios/${id}`, { method: 'PATCH', body: cambios });

export const cambiarPassword = (id, password) =>
  api(`/admin/usuarios/${id}/password`, { method: 'POST', body: { password } });

export const listarEstudiantesAdmin = () => api('/admin/estudiantes');

export const actualizarEstudianteAdmin = (id, cambios) =>
  api(`/admin/estudiantes/${encodeURIComponent(id)}`, { method: 'PATCH', body: cambios });

export const actualizarDocente = (id, cambios) =>
  api(`/admin/docentes/${encodeURIComponent(id)}`, { method: 'PATCH', body: cambios });

export const listarNominas = () => api('/talento-humano/nominas');
export const crearNomina = (data) => api('/talento-humano/nominas', { method: 'POST', body: data });
export const obtenerNomina = (id) => api(`/talento-humano/nominas/${id}`);
export const listarCertificadosLaborales = () => api('/talento-humano/certificados');
export const crearCertificadoLaboral = (data) => api('/talento-humano/certificados', { method: 'POST', body: data });
export async function descargarCertificadoLaboral(id) {
  const init = { headers: {} };
  const t = getToken();
  if (t) init.headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}/talento-humano/certificados/${id}/pdf`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const disposition = res.headers.get('content-disposition') || '';
  const nombre = /filename="([^"]+)"/.exec(disposition)?.[1] || `certificado-laboral-${id}.pdf`;
  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return nombre;
}

/* ── Docente: asistencia, actividades y foro ───────────────────────────── */
export const listarAsistencias = (cursoId) => api(`/cursos/${cursoId}/asistencias`);

export const abrirAsistencia = (cursoId, datos) =>
  api(`/cursos/${cursoId}/asistencias`, { method: 'POST', body: datos });

export const actualizarAsistencia = (cursoId, sesionId, datos) =>
  api(`/cursos/${cursoId}/asistencias/${sesionId}`, { method: 'PATCH', body: datos });

export const eliminarAsistencia = (cursoId, sesionId) =>
  api(`/cursos/${cursoId}/asistencias/${sesionId}`, { method: 'DELETE' });

export const guardarAsistencias = (cursoId, sesionId, registros) =>
  api(`/cursos/${cursoId}/asistencias/${sesionId}/registros`, {
    method: 'PUT',
    body: { registros },
  });

export const crearActividad = (cursoId, datos) =>
  api(`/cursos/${cursoId}/actividades`, { method: 'POST', body: datos });

export const eliminarActividad = (cursoId, id) =>
  api(`/cursos/${cursoId}/actividades/${id}`, { method: 'DELETE' });

/* Califica una entrega del curso. El backend expone
   PATCH /cursos/:cursoId/actividades/:id con { nota, estadoEst }. */
export const calificarActividad = (cursoId, id, cambios) =>
  api(`/cursos/${cursoId}/actividades/${id}`, { method: 'PATCH', body: cambios });

/* Detalle de un curso: actividades con sus preguntas, anuncios y docente. */
export const obtenerCurso = (cursoId) => api(`/cursos/${cursoId}`);

export const leerForo = (cursoId) => api(`/cursos/${cursoId}/foro`);

export const publicarEnForo = (cursoId, datos) =>
  api(`/cursos/${cursoId}/foro`, { method: 'POST', body: datos });

/* ── Entregas ───────────────────────────────────────────────────────────── */

/* Resumen por actividad: cuantas entregas hay y cuantas estan calificadas.
   Es lo que lista la pestaña Entregas sin pedir una llamada por cada parcial. */
export const listarEntregasCurso = (cursoId) => api(`/cursos/${cursoId}/entregas`);
export const listarMisNotasCurso = (cursoId) => api(`/cursos/${cursoId}/mis-notas`);

/* Entregas de UNA actividad, con el estudiante, los aciertos del parcial y la
   calificacion. Es la pantalla que se abre al hacer clic en un trabajo. */
export const listarEntregasActividad = (cursoId, actividadId) =>
  api(`/cursos/${cursoId}/actividades/${actividadId}/entregas`);

/* Califica (o comenta) una entrega. El backend cambia el estado a "calificado"
   cuando llega una nota. */
export const calificarEntrega = (cursoId, actividadId, estudianteId, cambios) =>
  api(`/cursos/${cursoId}/actividades/${actividadId}/entregas/${estudianteId}`, {
    method: 'PATCH',
    body: cambios,
  });

/* El archivo se baja con fetch y no con un <a href> porque la ruta exige el
   token de sesion; se devuelve un Blob para que la pagina lo descargue. */
export async function descargarArchivoEntrega(cursoId, actividadId, estudianteId) {
  const token = getToken();
  const res = await fetch(
    `${BASE}/cursos/${cursoId}/actividades/${actividadId}/entregas/${estudianteId}/archivo`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo descargar el archivo');
  }
  return {
    blob: await res.blob(),
    /* Content-Disposition trae el nombre real; si falta, uno genérico. */
    nombre: /filename="?([^"]+)"?/.exec(res.headers.get('content-disposition') || '')?.[1]
      || 'archivo',
  };
}

/* Bandeja de revision del docente: todo lo entregado y sin nota en sus cursos. */
export const listarPorCalificar = () => api('/cursos/por-calificar');

/* El material de apoyo que el docente adjunto a la actividad se baja con el
   mismo mecanismo que el archivo del estudiante: fetch con el token y Blob. */
export async function descargarMaterialActividad(cursoId, actividadId) {
  const token = getToken();
  const res = await fetch(
    `${BASE}/cursos/${cursoId}/actividades/${actividadId}/archivo`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo descargar el material');
  }
  return {
    blob: await res.blob(),
    nombre: /filename="?([^"]+)"?/.exec(res.headers.get('content-disposition') || '')?.[1]
      || 'material',
  };
}

/* ── Alumnos del curso y notas por corte ───────────────────────────────────
   El registro de notas del docente se arma con esta lista: una fila por
   estudiante MATRICULADO en el curso, con sus tres notas de corte. */
/* Roster del curso con las notas del periodo actual. */
export const listarEstudiantesCurso = (cursoId) => api(`/cursos/${cursoId}/estudiantes`);

/* Estudiantes que todavia no estan en el curso: alimenta el selector de
   inscripcion para que el docente no escriba el codigo a mano. */
export const listarCandidatosCurso = (cursoId) => api(`/cursos/${cursoId}/candidatos`);

export const inscribirEstudiante = (cursoId, estudianteId) =>
  api(`/cursos/${cursoId}/estudiantes`, { method: 'POST', body: { estudianteId } });

/* Retira al alumno del curso. Sus notas se conservan por si vuelve a matricularse. */
export const retirarEstudiante = (cursoId, estudianteId) =>
  api(`/cursos/${cursoId}/estudiantes/${encodeURIComponent(estudianteId)}`, { method: 'DELETE' });

/* Guarda una o varias notas de corte: { nota1 }, { nota2 } o { nota3 }. */
export const guardarNotaCorte = (cursoId, estudianteId, notas) =>
  api(`/cursos/${cursoId}/notas/${encodeURIComponent(estudianteId)}`, {
    method: 'PATCH',
    body: notas,
  });

/* ── Asignacion de docentes a cursos (administracion y rectoria) ────────── */
export const listarAsignacionDocentes = () => api('/cursos/docentes/asignacion');

export const asignarDocenteCurso = (cursoId, docenteId) =>
  api(`/cursos/${cursoId}/docente`, { method: 'PATCH', body: { docenteId } });

/* ── Talento humano ─────────────────────────────────────────────────────── */
export const listarConvocatorias = () => api('/talento-humano/convocatorias');

export const crearConvocatoria = (datos) =>
  api('/talento-humano/convocatorias', { method: 'POST', body: datos });

export const actualizarConvocatoria = (id, cambios) =>
  api(`/talento-humano/convocatorias/${id}`, { method: 'PATCH', body: cambios });

export const eliminarConvocatoria = (id) =>
  api(`/talento-humano/convocatorias/${id}`, { method: 'DELETE' });

export const postularConvocatoria = (id, datos) =>
  api(`/talento-humano/convocatorias/${id}/postulados`, { method: 'POST', body: datos });

export const listarPostulados = (id) => api(`/talento-humano/convocatorias/${id}/postulados`);

export const evaluarPostulado = (convocatoriaId, postuladoId, cambios) =>
  api(`/talento-humano/convocatorias/${convocatoriaId}/postulados/${postuladoId}`, {
    method: 'PATCH',
    body: cambios,
  });

export const listarCapacitaciones = () => api('/talento-humano/capacitaciones');

export const crearCapacitacion = (datos) =>
  api('/talento-humano/capacitaciones', { method: 'POST', body: datos });

export const actualizarCapacitacion = (id, cambios) =>
  api(`/talento-humano/capacitaciones/${id}`, { method: 'PATCH', body: cambios });

export const actualizarDocenteTH = (id, cambios) =>
  api(`/talento-humano/docentes/${encodeURIComponent(id)}`, { method: 'PATCH', body: cambios });

/* ── Contabilidad ───────────────────────────────────────────────────────── */
export const listarGastos = () => api('/contabilidad/gastos');

export const crearGasto = (datos) => api('/contabilidad/gastos', { method: 'POST', body: datos });

export const actualizarGasto = (id, cambios) =>
  api(`/contabilidad/gastos/${id}`, { method: 'PATCH', body: cambios });

export const listarCobros = () => api('/contabilidad/pagos');

export const conciliarCobro = (id, cambios) =>
  api(`/contabilidad/pagos/${id}`, { method: 'PATCH', body: cambios });
