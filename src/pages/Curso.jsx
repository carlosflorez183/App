import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDateTime } from '../data/mockData';
import { usePersistentData } from '../hooks/usePersistentData';
import {
  abrirAsistencia,
  calificarActividad,
  calificarEntrega,
  crearActividad,
  descargarArchivoEntrega,
  descargarMaterialActividad,
  eliminarActividad,
  eliminarAsistencia,
  guardarAsistencias,
  inscribirEstudiante,
  leerForo,
  listarCandidatosCurso,
  listarEntregasActividad,
  listarEntregasCurso,
  listarAsistencias,
  listarMisNotasCurso,
  listarEstudiantesCurso,
  obtenerCurso,
  publicarEnForo,
  retirarEstudiante,
} from '../api/client';

const th = { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const inputCss = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', width: '100%' };
const labelCss = { fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 };

/* Los mismos tres estados del módulo Docente, para que el docente no tenga
   que aprender dos vocabularios distintos. */
const ESTADOS = [
  ['presente', 'Presente', '#15803d', '#dcfce7'],
  ['tardanza', 'Tardanza', '#b45309', '#fef3c7'],
  ['ausente', 'Ausente', '#b91c1c', '#fee2e2'],
];

const Aviso = ({ children, tone = 'red' }) => {
  if (!children) return null;
  const estilo = tone === 'red'
    ? { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }
    : { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' };
  return (
    <div style={{ ...estilo, border: '1px solid', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
      {children}
    </div>
  );
};

export default function Curso() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Curso, actividades y anuncios desde el estado compartido.
  const [data] = usePersistentData();

  const cursoId = parseInt(id, 10) || 1;
  /* La URL puede llevar ?tab=asistencia para llegar directo a una pestaña,
     igual que en el módulo Docente. */
  const [search, setSearch] = useSearchParams();

  /* Solo el docente titular (o un administrador) escribe en el curso. El
     estudiante mira, pero no edita notas ni asistencia. */
  const puedeEditar = user?.role === 'profesor' || user?.role === 'admin';
  /* Los bloques de nota propia (nota del corte, progreso, nota parcial) son
     del alumno: quien califica no se nota a si mismo. */
  const esEstudiante = user?.role === 'estudiante';

  /* Estado real del curso: lo que se edita vive en el servidor, no en el
     mock. El mock se conserva como respaldo si la API no responde. */
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  /* Asistencia */
  const [sesiones, setSesiones] = useState([]);
  const [sesionActiva, setSesionActiva] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [nuevaSesion, setNuevaSesion] = useState({ fecha: '', tema: '' });
  const [mostrarFormSesion, setMostrarFormSesion] = useState(false);

  /* Foro del curso */
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState({ tema: '', mensaje: '' });
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  /* Entregas: no hay una pestana propia. Cada actividad abre su propia pagina
     con las entregas de sus estudiantes. `entregaActiva` es el id de la
     actividad abierta y `detalleEntregas`, quienes entregaron en ella. */
  const [entregaActiva, setEntregaActiva] = useState(null);
  const [detalleEntregas, setDetalleEntregas] = useState([]);
  const [notasEntrega, setNotasEntrega] = useState({});
  const [bajando, setBajando] = useState('');
  const [roster, setRoster] = useState(null);
  /* Una fila por actividad/parcial con sus entregas y cuantas van calificadas:
     es lo que se lista en la pestaña Notas. */
  const [resumenEntregas, setResumenEntregas] = useState([]);
  /* Lo mismo pero visto por el alumno: su nota en cada actividad y su corte. */
  const [misNotas, setMisNotas] = useState(null);
  const [candidatos, setCandidatos] = useState(null);
  const [buscaAlumno, setBuscaAlumno] = useState('');
  const [elegido, setElegido] = useState('');
  /* Id de la actividad cuyo material se esta descargando (0 = ninguna). */
  const [bajandoMaterial, setBajandoMaterial] = useState(0);

  /* Creación de actividades y parciales dentro de ESTE curso */
  /* `fechaInicio` y `fechaCierre` acotan la ventana de entrega: se abre y
     se cierra sola, sin que el docente tenga que publicarla a mano. */
  const FORM_ACTIVIDAD = useMemo(() => ({ titulo: '', tipo: 'tarea', corte: 1, puntos: 10, fechaEntrega: '', fechaInicio: '', fechaCierre: '', descripcion: '', archivo: '', archivoB64: '', archivoMime: '' }), []);
  const [formActividad, setFormActividad] = useState(FORM_ACTIVIDAD);
  const FORM_PARCIAL = useMemo(() => ({ titulo: '', corte: 1, puntos: 10, fechaEntrega: '', fechaInicio: '', fechaCierre: '', preguntas: [{ enunciado: '', opciones: ['', '', ''], correcta: 0, puntos: 5 }] }), []);
  const [formParcial, setFormParcial] = useState(FORM_PARCIAL);
  const [creando, setCreando] = useState(false);

  const avisar = (msg, tono = 'ok') => {
    if (tono === 'error') { setError(msg); setExito(''); } else { setExito(msg); setError(''); }
  };

  const cargarCurso = useCallback(async () => {
    try {
      setDetalle(await obtenerCurso(cursoId));
      setError('');
    } catch (err) {
      setDetalle(null);
      setError(`No se pudo cargar el curso: ${err.message}`);
    }
  }, [cursoId]);

  const cargarAsistencias = useCallback(async () => {
    try {
      setSesiones(await listarAsistencias(cursoId));
    } catch (err) {
      setSesiones([]);
      setError(`No se pudo cargar la asistencia: ${err.message}`);
    }
  }, [cursoId]);

  const cargarForo = useCallback(async () => {
    try {
      setMensajes(await leerForo(cursoId));
    } catch (err) {
      setMensajes([]);
      setError(`No se pudo cargar el foro: ${err.message}`);
    }
  }, [cursoId]);

  /* Quien mira la pestaña Estudiantes puede ser el docente titular (que
     escribe) o el estudiante (que solo mira). La lista se pide al servidor y
     no se arma con la lista global: el nombre del curso debe decir la verdad
     sobre quien esta matriculado en el. */
  const cargarRoster = useCallback(async () => {
    try {
      setRoster(await listarEstudiantesCurso(cursoId));
      setError('');
    } catch (err) {
      setRoster(null);
      if (puedeEditar) setError(`No se pudo cargar la lista de estudiantes: ${err.message}`);
    }
  }, [cursoId, puedeEditar]);

  const cargarCandidatos = useCallback(async () => {
    try {
      setCandidatos(await listarCandidatosCurso(cursoId));
    } catch (err) {
      setCandidatos([]);
      setError(`No se pudieron cargar los candidatos: ${err.message}`);
    }
  }, [cursoId]);

  /* Al abrir un recurso se piden SUS entregas; no todas las del curso. */
  const abrirEntregas = useCallback(async (actividadId) => {    setEntregaActiva(actividadId);
    setDetalleEntregas([]);
    setNotasEntrega({});
    try {
      setDetalleEntregas(await listarEntregasActividad(cursoId, actividadId));
    } catch (err) {
      setError(`No se pudo abrir la entrega: ${err.message}`);
    }
  }, [cursoId]);

  /* Descarga el archivo y lo guarda con el nombre que manda el servidor. Se
     usa un <a> temporal porque los navegadores solo guardan con un click. */
  const bajarArchivo = async (entrega) => {
    setBajando(entrega.estudianteId);
    setError('');
    try {
      const { blob, nombre } = await descargarArchivoEntrega(cursoId, entregaActiva, entrega.estudianteId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBajando('');
    }
  };

  /* Igual que el archivo del estudiante, pero del material de apoyo que el
     docente adjunto a la actividad. */
  const bajarMaterial = async (actividad) => {
    setBajandoMaterial(actividad.id);
    setError('');
    try {
      const { blob, nombre } = await descargarMaterialActividad(cursoId, actividad.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`No se pudo descargar el material: ${err.message}`);
    } finally {
      setBajandoMaterial(0);
    }
  };

  /* Alta y baja de matriculados. La lista se vuelve a pedir al servidor en vez
     de filtrar en local: el contador del curso y el registro de notas del
     docente dependen de la misma tabla, y actualizarlos a mano aqui los
     desincronizaria en cuanto alguien se matricule desde otra pantalla. */
  const textoBusqueda = buscaAlumno.trim().toLowerCase();
  const coincide = (c) => !textoBusqueda
    || c.nombre.toLowerCase().includes(textoBusqueda)
    || String(c.documento || '').includes(textoBusqueda)
    || String(c.programa || '').toLowerCase().includes(textoBusqueda);
  const coincidencias = (candidatos || []).filter(coincide).slice(0, 20);
  const inscribir = async () => {
    if (!elegido) return;
    try {
      const respuesta = await inscribirEstudiante(cursoId, elegido);
      avisar(`${respuesta.nombre} quedó matriculado en el curso.`);
      setBuscaAlumno('');
      setElegido('');
      await cargarRoster();
      await cargarCurso();
    } catch (err) {
      avisar(`No se pudo inscribir: ${err.message}`, 'error');
    }
  };

  const retirar = async (estudianteId, nombre) => {
    if (!window.confirm(`¿Retirar a ${nombre} del curso? Sus notas se conservan.`)) return;
    try {
      await retirarEstudiante(cursoId, estudianteId);
      avisar(`${nombre} fue retirado del curso.`);
      await cargarRoster();
      await cargarCurso();
    } catch (err) {
      avisar(`No se pudo retirar: ${err.message}`, 'error');
    }
  };

  /* Cambia el material de apoyo de una actividad ya creada. Es una vía
     aparte del formulario de creación: el docente sube una versión nueva del
     taller sin borrar la actividad y sin perder las entregas ya hechas. */
  const [subiendoMaterial, setSubiendoMaterial] = useState(false);
  const enviarMaterial = async (actividad, file) => {
    if (!file) return;
    setSubiendoMaterial(true);
    setError('');
    setExito('');
    try {
      const base64 = await new Promise((ok, ko) => {
        const lector = new FileReader();
        lector.onload = () => ok(String(lector.result || '').split(',')[1] || '');
        lector.onerror = () => ko(new Error('No se pudo leer el archivo'));
        lector.readAsDataURL(file);
      });
      await calificarActividad(cursoId, actividad.id, {
        archivo: file.name,
        archivoB64: base64,
        archivoMime: file.type || 'application/octet-stream',
      });
      const actualizado = await obtenerCurso(cursoId);
      setDetalle(actualizado);
      setExito(`Material «${file.name}» actualizado en «${actividad.titulo}».`);
    } catch (err) {
      setError(`No se pudo actualizar el material: ${err.message}`);
    } finally {
      setSubiendoMaterial(false);
    }
  };

  /* Califica una entrega y refresca el detalle para ver la nota ya guardada.
     El servidor devuelve como quedo el corte del alumno: asi se puede avisar
     "el corte 2 del alumno quedo en 4.5" sin tener que abrir el registro. */
  const guardarCalificacion = async (entrega) => {
    const borrador = notasEntrega[entrega.estudianteId] || {};
    try {
      /* Acepta coma o punto: el docente escribe 4,5 todo el dia y `Number`
         de "4,5" es NaN. */
      const bruto = String(borrador.nota ?? '').trim();
      const nota = bruto === '' ? null : Number(bruto.replace(',', '.'));
      const guardada = await calificarEntrega(cursoId, entregaActiva, entrega.estudianteId, {
        nota,
        comentario: borrador.comentario ?? null,
      });
      setDetalleEntregas(await listarEntregasActividad(cursoId, entregaActiva));
      /* El conteo de calificadas de la tabla de arriba ya no sirve. */
      cargarResumenEntregas();
      const corte = guardada?.corte;
      const quien = entrega.estudiante?.nombre?.split(' ')[0] || 'el alumno';
      if (corte && corte.aplicado) {
        /* El corte es el promedio de TODAS las actividades del corte, así que
           decir solo "media de 1" escondía lo importante: que las otras dos no
           le fueron entregadas y valen cero. */
        const partes = [`media de ${corte.calificadas} de ${corte.actividades} actividades`];
        if (corte.sinEntregar) partes.push(`${corte.sinEntregar} sin entregar`);
        if (corte.sinCalificar) partes.push(`${corte.sinCalificar} sin calificar`);
        avisar(`Guardado. El corte ${corte.corte} de ${quien} quedó en ${corte.valor} (${partes.join(', ')}).`);
      } else if (corte && corte.motivo === 'manual') {
        /* Si el docente escribio ese corte a mano, la entrega no lo toca: se
           guarda igual y se le avisa, para que no piense que no funciono. */
        avisar(`Guardado. El corte ${corte.corte} de ${quien} está escrito a mano y quedó en ${corte.valor ?? 'blanco'}: no lo cambia la entrega.`);
      } else {
        avisar('Calificacion guardada');
      }
    } catch (err) {
      setError(`No se pudo calificar: ${err.message}`);
    }
  };

  /* Al cambiar de pestaña se refleja en la URL, para poder compartir el
     enlace y para que la prueba entre directo con ?tab=. */
  const activeTab = search.get('tab') || 'inicio';

  /* Los recursos son paginas propias, como en Moodle: la actividad, el hilo
     del foro y el formulario de creacion se abren en su propia "vista" y se
     vuelven atras. No se guardan en un estado aparte sino en la URL
     (?tab=actividad&id=7 / ?tab=hilo&tema=... / ?tab=crear&...), asi al
     pulsar otra pestana del menu la pantalla abierta se cierra sola. */
  const recursoAbierto =
    activeTab === 'actividad' && search.get('id') ? Number(search.get('id')) : 0;
  const hiloAbierto = activeTab === 'hilo' ? search.get('tema') || '' : '';
  const vistaCrear = activeTab === 'crear';
  /* La hoja de UN estudiante dentro de una actividad: es una pagina propia,
     no una fila desplegada entre las demas entregas. */
  const vistaEntrega = activeTab === 'entrega' && search.get('est');
  /* El estudiante cuya hoja de entrega esta abierta. */
  const entregaEstudiante = search.get('est') || '';

  /* Guardamos la pestana de la que se salio para que "Volver" regrese ahi. */
  const abrirActividad = (a) => {
    /* Se piden de una vez las entregas de esa actividad: la pantalla abierta
       es la que las muestra. */
    abrirEntregas(a.id);
    setSearch({ tab: 'actividad', id: String(a.id), volver: activeTab }, { replace: true });
  };

  const abrirHilo = (tema) => {
    setSearch({ tab: 'hilo', tema, volver: activeTab }, { replace: true });
  };

  /* Abrir el formulario de crear en este corte. El tipo se elige dentro de la
     propia pantalla, asi que el boton del corte no necesita saberlo. */
  const abrirCrear = (corte) => {
    setFormActividad((f) => ({ ...f, corte }));
    setFormParcial((f) => ({ ...f, corte }));
    setSearch({ tab: 'crear', corte: String(corte), volver: activeTab }, { replace: true });
  };

  /* Abrir la hoja de un estudiante: su entrega a pantalla completa. Se
     guardan la actividad y la pestana de origen para poder volver. */
  const abrirEntregaEstudiante = (actividadId, estudianteId) => {
    abrirEntregas(actividadId);
    setSearch({ tab: 'entrega', id: String(actividadId), est: String(estudianteId), volver: activeTab }, { replace: true });
  };

  /* Volver al panel de donde se vino. Si el destino es un recurso (una
     actividad o un hilo) se arrastra su identificador: al cerrar la hoja de
     un estudiante hay que regresar a la MISMA actividad, no al corte. */
  const cerrarVista = () => {
    const destino = search.get('volver') || 'inicio';
    const siguiente = { tab: destino };
    if (destino === 'actividad' && search.get('id')) siguiente.id = search.get('id');
    if (destino === 'hilo' && search.get('tema')) siguiente.tema = search.get('tema');
    setSearch(siguiente, { replace: true });
  };

  const setActiveTab = (t) => setSearch({ tab: t }, { replace: true });

  useEffect(() => { cargarCurso(); }, [cargarCurso]);
  useEffect(() => { cargarAsistencias(); }, [cargarAsistencias]);
  /* La lista de inscritos se pide al abrir la pestaña, no siempre: es la unica
     forma de que el curso deje de mostrar una lista global de estudiantes que
     no son de esta materia. Los candidatos solo se piden si quien mira es el
     docente: el estudiante no tiene nada que inscribir. */
  useEffect(() => {
    if (activeTab !== 'estudiantes') return;
    cargarRoster();
    if (puedeEditar && candidatos === null) cargarCandidatos();
  }, [activeTab, cargarRoster, cargarCandidatos, puedeEditar, candidatos]);
  /* El foro se pide al abrir su pestaña o al entrar directo a un hilo. */
  useEffect(() => {
    if (activeTab === 'foro' || activeTab === 'hilo') cargarForo();
  }, [activeTab, cargarForo]);
  /* Si la URL trae una actividad o la hoja de un estudiante, se piden SUS
     entregas al entrar: asi un enlace compartido entra con los datos. */
  const entregaAbierta = vistaEntrega && search.get('id') ? Number(search.get('id')) : 0;
  useEffect(() => {
    if (recursoAbierto) abrirEntregas(recursoAbierto);
    else if (entregaAbierta) abrirEntregas(entregaAbierta);
  }, [recursoAbierto, entregaAbierta, abrirEntregas]);

  const curso = detalle || data.cursos.find((c) => c.id === cursoId) || data.cursos[0];
  const cursoInfo = data.cursos_info[cursoId] || { programa: 'Ing. de Sistemas', semestre: 6 };

  /* Si la API respondió, mandan sus actividades; si no, las del respaldo. */
  const actividades = detalle?.actividades?.length
    ? detalle.actividades
    : data.actividades.filter((a) => a.cursoId === cursoId);
  const anuncios = detalle?.anuncios?.length
    ? detalle.anuncios
    : data.anuncios.filter((a) => a.cursoId === cursoId);

  /* La API devuelve `estadoEst` y el respaldo del mock usa `estado_est`:
     se leen los dos para que el contador no salga en cero. */
  const pendientesCount = actividades.filter(
    (a) => (a.estadoEst ?? a.estado_est) === 'pendiente'
  ).length;

  /* ═══════ Notas ═══════ */
  /* El resumen por actividad es lo que alimenta la pestaña Notas: cuantas
     entregas hay y cuantas están calificadas. La nota de una actividad NO es un
     número suelto del curso (antes lo era, y era la misma para todos los
     alumnos): ahora vive en cada entrega, y de ahí sale el corte. */
  const cargarResumenEntregas = useCallback(async () => {
    try {
      setResumenEntregas(await listarEntregasCurso(cursoId));
    } catch (err) {
      setResumenEntregas([]);
      setError(`No se pudieron cargar las notas de las actividades: ${err.message}`);
    }
  }, [cursoId]);

  useEffect(() => { cargarResumenEntregas(); }, [cargarResumenEntregas]);

  /* El alumno necesita SU nota por actividad. El docente no: a el lo que le
     interesa es el resumen de cuantas van calificadas. */
  useEffect(() => {
    if (!esEstudiante) { setMisNotas(null); return; }
    let vivo = true;
    listarMisNotasCurso(cursoId)
      .then((d) => { if (vivo) setMisNotas(d); })
      .catch(() => { if (vivo) setMisNotas(null); });
    return () => { vivo = false; };
  }, [cursoId, esEstudiante]);

  /* ═══════ Asistencia ═══════ */
  const abrirSesion = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const s = await abrirAsistencia(cursoId, {
        fecha: nuevaSesion.fecha,
        tema: nuevaSesion.tema.trim() || 'Sesión de clase',
      });
      setSesiones((lista) => [...lista, s].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setNuevaSesion({ fecha: '', tema: '' });
      setMostrarFormSesion(false);
      setSesionActiva(s.id);
      setBorrador({ ...s, registros: s.registros.map((r) => ({ ...r })) });
      avisar('Sesión abierta. Ya puede marcar la asistencia.');
    } catch (err) {
      avisar(`No se abrió la sesión: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const editarSesion = (s) => {
    setSesionActiva(s.id);
    setBorrador({ ...s, registros: s.registros.map((r) => ({ ...r })) });
    setError('');
    setExito('');
  };

  const marcar = (estudianteId, estado) =>
    setBorrador((b) => ({ ...b, registros: b.registros.map((r) => (r.estudianteId === estudianteId ? { ...r, estado } : r)) }));

  const marcarTodos = (estado) =>
    setBorrador((b) => ({ ...b, registros: b.registros.map((r) => ({ ...r, estado })) }));

  const justificar = (estudianteId, texto) =>
    setBorrador((b) => ({ ...b, registros: b.registros.map((r) => (r.estudianteId === estudianteId ? { ...r, justificacion: texto } : r)) }));

  const guardarBorrador = async () => {
    setGuardando(true);
    try {
      const sesion = await guardarAsistencias(
        cursoId,
        borrador.id,
        borrador.registros.map((r) => ({ estudianteId: r.estudianteId, estado: r.estado, justificacion: r.justificacion }))
      );
      setSesiones((lista) => lista.map((s) => (s.id === sesion.id ? sesion : s)));
      setBorrador({ ...sesion, registros: sesion.registros.map((r) => ({ ...r })) });
      avisar('Asistencia guardada.');
    } catch (err) {
      avisar(`No se guardó la asistencia: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const borrarSesion = async (id) => {
    try {
      await eliminarAsistencia(cursoId, id);
      setSesiones((lista) => lista.filter((s) => s.id !== id));
      if (sesionActiva === id) { setSesionActiva(null); setBorrador(null); }
      avisar('Sesión eliminada.');
    } catch (err) {
      avisar(`No se eliminó: ${err.message}`, 'error');
    }
  };

  /* Porcentaje de asistencia de un estudiante en todas las sesiones. */
  const porcentaje = useMemo(() => {
    const mapa = new Map();
    for (const s of sesiones) {
      for (const r of s.registros || []) {
        const previo = mapa.get(r.estudianteId) || { total: 0, asistio: 0 };
        previo.total += 1;
        if (r.estado === 'presente' || r.estado === 'tardanza') previo.asistio += 1;
        mapa.set(r.estudianteId, previo);
      }
    }
    return (estudianteId) => {
      const p = mapa.get(estudianteId);
      if (!p || !p.total) return null;
      return Math.round((p.asistio / p.total) * 100);
    };
  }, [sesiones]);

  /* ═══════ Foro del curso ═══════ */
  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.mensaje.trim()) return;
    setEnviandoMensaje(true);
    try {
      const creado = await publicarEnForo(cursoId, {
        tema: nuevoMensaje.tema.trim(),
        mensaje: nuevoMensaje.mensaje.trim(),
      });
      setMensajes((lista) => [...lista, creado]);
      /* Al responder dentro de un hilo se limpia el texto pero se conserva el
         tema: si no, el siguiente mensaje abriria un tema nuevo. */
      setNuevoMensaje({ tema: nuevoMensaje.tema, mensaje: '' });
      avisar('Mensaje publicado en el foro del curso.');
    } catch (err) {
      avisar(`No se publicó el mensaje: ${err.message}`, 'error');
    } finally {
      setEnviandoMensaje(false);
    }
  };

  /* ═══════ Actividades y parciales de ESTE curso ═══════ */
  /* El archivo de apoyo viaja como base64 en el mismo JSON que la actividad,
     igual que hace la entrega del estudiante: asi no hace falta otra pieza. */
  const leerArchivoActividad = (file) => {
    if (!file) {
      setFormActividad((f) => ({ ...f, archivo: '', archivoB64: '', archivoMime: '' }));
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result || '');
      const b64 = resultado.slice(resultado.indexOf(',') + 1);
      setFormActividad((f) => ({ ...f, archivo: file.name, archivoB64: b64, archivoMime: file.type || 'application/octet-stream' }));
    };
    lector.readAsDataURL(file);
  };

  const enviarActividad = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      /* El corte sale de la URL y no del formulario: asi se crea donde se
         abrio la pantalla, no en el corte que quedara de la anterior. */
      const creada = await crearActividad(cursoId, {
        ...formActividad,
        corte: Number(search.get('corte')) || formActividad.corte || 1,
        titulo: formActividad.titulo.trim(),
        fechaEntrega: formActividad.fechaEntrega || null,
        fechaInicio: formActividad.fechaInicio || null,
        fechaCierre: formActividad.fechaCierre || null,
        archivoB64: formActividad.archivoB64 || null,
      });
      setDetalle((d) => ({ ...d, actividades: [...(d.actividades || []), creada] }));
      setFormActividad(FORM_ACTIVIDAD);
      avisar(`"${creada.titulo}" se creó en ${curso.nombre}.`);
      /* Ya se guardó: se vuelve al corte donde aparece la actividad nueva. */
      if (vistaCrear) cerrarVista();
    } catch (err) {
      avisar(`No se creó la actividad: ${err.message}`, 'error');
    } finally {
      setCreando(false);
    }
  };

  const enviarParcial = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      const creado = await crearActividad(cursoId, {
        titulo: formParcial.titulo.trim(),
        tipo: 'parcial',
        corte: Number(search.get('corte')) || Number(formParcial.corte) || 1,
        puntos: Number(formParcial.puntos),
        fechaEntrega: formParcial.fechaEntrega || null,
        fechaInicio: formParcial.fechaInicio || null,
        fechaCierre: formParcial.fechaCierre || null,
        preguntas: formParcial.preguntas
          .filter((p) => p.enunciado.trim())
          .map((p) => ({
            enunciado: p.enunciado.trim(),
            opciones: p.opciones.map((o) => o.trim()).filter(Boolean),
            correcta: p.correcta,
            puntos: Number(p.puntos),
          })),
      });
      setDetalle((d) => ({ ...d, actividades: [...(d.actividades || []), creado] }));
      setFormParcial(FORM_PARCIAL);
      avisar(`"${creado.titulo}" se creó en ${curso.nombre}.`);
      if (vistaCrear) cerrarVista();
    } catch (err) {
      avisar(`No se creó el parcial: ${err.message}`, 'error');
    } finally {
      setCreando(false);
    }
  };

  const editarPregunta = (i, cambios) =>
    setFormParcial((f) => ({ ...f, preguntas: f.preguntas.map((p, k) => (k === i ? { ...p, ...cambios } : p)) }));

  const borrarActividad = async (a) => {
    try {
      await eliminarActividad(cursoId, a.id);
      setDetalle((d) => ({ ...d, actividades: (d.actividades || []).filter((x) => x.id !== a.id) }));
      avisar(`"${a.titulo}" quedó eliminada.`);
    } catch (err) {
      avisar(`No se eliminó: ${err.message}`, 'error');
    }
  };

  const getTipoIconAndColor = (tipo) => {
    switch (tipo) {
      case 'taller':
        return { ic: '🔧', bg: '#dbeafe' };
      case 'proyecto':
        return { ic: '📋', bg: '#ede9fe' };
      case 'quiz':
        return { ic: '❓', bg: '#fef9c3' };
      case 'informe':
        return { ic: '📝', bg: '#dcfce7' };
      case 'parcial':
        return { ic: '📄', bg: '#ffedd5' };
      default:
        return { ic: '✅', bg: '#f1f5f9' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* ═══════ TOPBAR EXACTO ═══════ */}
      <div className="pg-top">
        <div className="pg-top-inner">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Volver
          </button>
          <div className="sep" />
          <div className="breadcrumb">
            <span
              onClick={() => navigate('/dashboard')}
              style={{ cursor: 'pointer', color: '#64748b' }}
            >
              Inicio
            </span>
            <span>›</span>
            <span
              onClick={() => navigate('/dashboard')}
              style={{ cursor: 'pointer', color: '#64748b' }}
            >
              Campus Virtual
            </span>
            <span>›</span>
            <strong>{curso.nombre}</strong>
          </div>
          <div className="hdr-right">
            <span className="hdr-pill">2026-1</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '5px 12px'
            }}>
              <div className="hdr-av av-blue">
                {user?.avatar || 'CA'}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                {user?.name ? user.name.split(' ')[0] : 'Carlos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ HERO BANNER PURPURA EXACTO ═══════ */}
      <div className="curso-hero" style={{ background: curso.color || 'linear-gradient(135deg,#6d28d9,#8b5cf6)' }}>
        <div className="hero-inner">
          <div className="hero-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* El mock llama a este campo `icon` y la API lo devuelve como
                  `icono`. Sin las dos opciones el ícono desaparece al cargar
                  los datos reales. */}
              <div className="hero-ic-box">
                {curso.icono || curso.icon || '📘'}
              </div>
              <div className="hero-info">
                <div className="hero-tags">
                  <span className="hero-tag">{curso.codigo}</span>
                  <span className="hero-tag">Grupo {curso.grupo}</span>
                  <span className="hero-tag">{cursoInfo.programa}</span>
                  <span className="hero-tag">{cursoInfo.semestre}° Semestre</span>
                  <span className="hero-tag">2026-1</span>
                </div>
                <div className="hero-name">{curso.nombre}</div>
                <div className="hero-meta">
                👤 {curso.profesor} &nbsp;·&nbsp; 👥 {curso.estudiantes} estudiantes
                </div>
              </div>
            </div>
            <div className="hero-btns">
              <button className="hero-btn" onClick={() => setActiveTab('asistencia')}>
                📋 Asistencia
              </button>
              <button className="hero-btn" onClick={() => setActiveTab('estudiantes')}>
                👥 Estudiantes
              </button>
            </div>
          </div>

          {/* 6 Estadísticas métricas idénticas */}
          <div className="hero-stats">
            <div className="hs">
              <div className="hs-v">{curso.progreso}%</div>
              <div className="hs-l">Progreso</div>
            </div>
            <div className="hs">
              <div className="hs-v">{actividades.length}</div>
              <div className="hs-l">Actividades</div>
            </div>
            <div className="hs">
              <div className="hs-v">{pendientesCount}</div>
              <div className="hs-l">Pendientes</div>
            </div>
            <div className="hs">
              <div className="hs-v">{curso.estudiantes}</div>
              <div className="hs-l">Estudiantes</div>
            </div>
            <div className="hs">
              <div className="hs-v">5</div>
              <div className="hs-l">Recursos</div>
            </div>
            <div className="hs">
              <div className="hs-v">16</div>
              <div className="hs-l">Semanas</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ TABS EXACTO ═══════ */}
      <div className="curso-tabs">
        <div className="ct-inner">
          <button
            className={`ct-btn ${activeTab === 'inicio' ? 'active' : ''}`}
            onClick={() => setActiveTab('inicio')}
          >
            🏠 Inicio
          </button>
          <button
            className={`ct-btn ${activeTab === 'corte1' ? 'active' : ''}`}
            onClick={() => setActiveTab('corte1')}
          >
            🟩 Corte 1
          </button>
          <button
            className={`ct-btn ${activeTab === 'corte2' ? 'active' : ''}`}
            onClick={() => setActiveTab('corte2')}
          >
            🟦 Corte 2
          </button>
          <button
            className={`ct-btn ${activeTab === 'corte3' ? 'active' : ''}`}
            onClick={() => setActiveTab('corte3')}
          >
            🟧 Corte 3
          </button>
          <button
            className={`ct-btn ${activeTab === 'notas' ? 'active' : ''}`}
            onClick={() => setActiveTab('notas')}
          >
            ⭐ Notas
          </button>
          <button
            className={`ct-btn ${activeTab === 'asistencia' ? 'active' : ''}`}
            onClick={() => setActiveTab('asistencia')}
          >
            📋 Asistencia
          </button>
          <button
            className={`ct-btn ${activeTab === 'foro' ? 'active' : ''}`}
            onClick={() => setActiveTab('foro')}
          >
            💬 Foro
          </button>
          <button
            className={`ct-btn ${activeTab === 'estudiantes' ? 'active' : ''}`}
            onClick={() => setActiveTab('estudiantes')}
          >
            👥 Estudiantes
          </button>
          <button
            className={`ct-btn ${activeTab === 'recursos' ? 'active' : ''}`}
            onClick={() => setActiveTab('recursos')}
          >
            📁 Recursos
          </button>
        </div>
      </div>

      {/* ═══════ CONTENIDO PRINCIPAL ═══════ */}
      <div className="pg-content">
        {/* Los mensajes de exito y error se muestran en cualquier pestana:
            calificar una nota o guardar la asistencia avisa igual. */}
        <Aviso>{error}</Aviso>
        <Aviso tone="ok">{exito}</Aviso>

        {/* ========================================================= */}
        {/* RECURSO ABIERTO A PANTALLA COMPLETA (estilo Moodle)         */}
        {/* Al pulsar una actividad o un hilo se entra a SU pagina:     */}
        {/* everything del recurso, con su boton para volver.           */}
        {/* ========================================================= */}
        {/* `recursoAbierto` vale 0 cuando no hay ninguna abierta. Con `0 &&`
            React pinta un "0" suelto en la pagina, asi que se compara con
            null para que no aparezca ese cero debajo del menu. */}
        {recursoAbierto !== 0 && (() => {
          const act = actividades.find((a) => a.id === recursoAbierto);
          if (!act) return null;
          const { ic, bg } = getTipoIconAndColor(act.tipo);
          const parcial = act.tipo === 'parcial';
          return (
            <div>
              <button
                type="button"
                onClick={cerrarVista}
                className="btn btn-secondary btn-sm"
                style={{ marginBottom: 14 }}
              >
                ← Volver al curso
              </button>

              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {ic}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>{act.titulo}</h3>
                    <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                      {act.descripcion}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <span className="bs bg-b">Corte {act.corte}</span>
                      <span className="bs bg-b">{act.puntos} pts</span>
                      {act.fechaEntrega && (
                        <span className="bs bg-y">Fecha de entrega: {formatDateTime(act.fechaEntrega)}</span>
                      )}
                      {/* Ventana habilitada: se nombra solo el extremo que el
                          docente escribio, para no anunciar un "-" al otro. */}
                      {act.fechaInicio && (
                        <span className="bs bg-b">Habilitada desde {formatDateTime(act.fechaInicio)}</span>
                      )}
                      {act.fechaCierre && (
                        <span className="bs bg-b">Cierra {formatDateTime(act.fechaCierre)}</span>
                      )}
                      {typeof act.nota === 'number' && (
                        <span className="bs bg-g">Nota {act.nota}/{act.puntos}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Material de apoyo: lo ve el estudiante y el docente puede
                  reemplazarlo sin recrear la actividad. */}
              {(act.archivo || puedeEditar) && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-hd">
                    <span className="card-ttl">📎 Material de apoyo</span>
                  </div>
                  <div className="card-bd" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {act.archivo ? (
                      <>
                        <span style={{ fontSize: 13 }}>{act.archivo}</span>
                        {act.archivoTamano ? (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{Math.round(act.archivoTamano / 1024)} KB</span>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          data-testid="bajar-material"
                          onClick={() => bajarMaterial(act)}
                          disabled={bajandoMaterial === act.id}
                        >
                          {bajandoMaterial === act.id ? 'Descargando...' : 'Descargar material'}
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>Todavía no hay material de apoyo.</span>
                    )}
                    {puedeEditar && (
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', marginLeft: 'auto' }}>
                        {subiendoMaterial ? 'Subiendo...' : act.archivo ? 'Reemplazar material' : 'Adjuntar material'}
                        <input
                          type="file"
                          data-testid="subir-material-actividad"
                          style={{ display: 'none' }}
                          disabled={subiendoMaterial}
                          onChange={(e) => {
                            enviarMaterial(act, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Las preguntas del parcial, tal como las ve el docente. */}
              {parcial && (act.preguntas || []).length > 0 && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-hd">
                    <span className="card-ttl">📝 Preguntas del parcial</span>
                  </div>
                  <div className="card-bd">
                    {act.preguntas.map((p, i) => (
                      <div key={p.id} style={{ padding: '10px 0', borderBottom: i < act.preguntas.length - 1 ? '1px solid #f1f5f9' : 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                          {i + 1}. {p.enunciado}
                        </p>
                        <ol style={{ margin: 0, paddingLeft: 20 }}>
                          {(p.opciones || []).map((o, k) => (
                            <li
                              key={k}
                              style={{
                                fontSize: 12, color: k === p.correcta ? '#15803d' : '#475569',
                                fontWeight: k === p.correcta ? 700 : 400,
                              }}
                            >
                              {o} {k === p.correcta && '✓ correcta'}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Y ahora si: TODAS las entregas de esta actividad. */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl">
                    📬 Entregas de esta actividad ({detalleEntregas.length})
                  </span>
                </div>
                <div className="card-bd">
                  {detalleEntregas.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                      Todavia nadie ha entregado esta actividad.
                    </p>
                  ) : (
                    /* La lista deja ver la nota y calificarla en el sitio: el
                       docente no tiene que entrar a la hoja de cada alumno
                       para calificar, solo cuando quiere leer la respuesta. */
                    detalleEntregas.map((e) => {
                      const borrador = notasEntrega[e.estudianteId] || {};
                      const editable = e.nota == null && borrador.nota == null;
                      return (
                        <div
                          key={e.estudianteId}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                            padding: '10px 2px',
                          }}
                        >
                          <button
                            type="button"
                            data-testid={`abrir-entrega-${e.estudianteId}`}
                            onClick={() => abrirEntregaEstudiante(act.id, e.estudianteId)}
                            style={{
                              flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                              padding: '3px 0', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <strong style={{ fontSize: 14, color: '#0f172a' }}>{e.estudiante?.nombre}</strong>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{e.estudiante?.documento}</span>
                            {parcial && (
                              <span className={`bs ${e.aciertos === e.total ? 'bg-g' : 'bg-y'}`}>
                                {e.aciertos}/{e.total} correctas
                              </span>
                            )}
                            {e.archivo && <span style={{ fontSize: 11, color: '#64748b' }}>📎 {e.archivo}</span>}
                            <span style={{ flex: 1 }} />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              {e.entregadoEn ? formatDate(e.entregadoEn) : 'sin fecha'}
                            </span>
                            <span style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 700 }}>Ver entrega →</span>
                          </button>
                          {puedeEditar && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="text"
                                inputMode="decimal"
                                data-testid={`nota-inline-${e.estudianteId}`}
                                aria-label={`Nota de ${e.estudiante?.nombre}`}
                                placeholder={editable ? '—' : e.nota}
                                defaultValue={borrador.nota ?? (e.nota ?? '')}
                                onChange={(ev) => setNotasEntrega((s) => ({
                                  ...s,
                                  [e.estudianteId]: { ...borrador, nota: ev.target.value },
                                }))}
                                onBlur={() => guardarCalificacion(e)}
                                onKeyDown={(ev) => { if (ev.key === 'Enter') ev.currentTarget.blur(); }}
                                style={{
                                  width: 74, padding: '7px 9px', borderRadius: 8,
                                  border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700,
                                }}
                              />
                              <span style={{ fontSize: 11, color: '#64748b' }}>/ {act.puntos}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HOJA DE UNA ENTREGA: lo que contesto UN estudiante             */}
        {/* Al pulsar el nombre en la lista de entregas se entra aqui, a    */}
        {/* su propia pantalla, sin la lista de los demas al lado.          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {vistaEntrega && (() => {
          const act = actividades.find((a) => a.id === Number(search.get('id')));
          if (!act) return null;
          const e = detalleEntregas.find((x) => String(x.estudianteId) === entregaEstudiante);
          const parcial = act.tipo === 'parcial';
          if (!e) {
            return (
              <div>
                <button type="button" onClick={cerrarVista} className="btn btn-secondary btn-sm" style={{ marginBottom: 14 }}>
                  ← Volver a la actividad
                </button>
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Este estudiante todavia no ha entregado {act.titulo}.
                  </p>
                </div>
              </div>
            );
          }
          const borrador = notasEntrega[e.estudianteId] || {};
          return (
            <div>
              <button type="button" onClick={cerrarVista} className="btn btn-secondary btn-sm" style={{ marginBottom: 14 }}>
                ← Volver a la actividad
              </button>

              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div className="card-hd">
                  <span className="card-ttl">📄 {e.estudiante?.nombre}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {e.estudiante?.documento} · {e.entregadoEn ? formatDate(e.entregadoEn) : 'sin fecha'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                  Entrega de <strong>{act.titulo}</strong> · Corte {act.corte} · {act.puntos} pts
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {parcial && (
                    <span className={`bs ${e.aciertos === e.total ? 'bg-g' : 'bg-y'}`}>
                      {e.aciertos}/{e.total} correctas
                    </span>
                  )}
                  {e.nota != null
                    ? <span className="bs bg-g">Nota {e.nota} / {act.puntos}</span>
                    : <span className="bs bg-b">Sin calificar</span>}
                </div>
              </div>

              {e.archivo && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-hd">
                    <span className="card-ttl">📎 Archivo entregado</span>
                  </div>
                  <div className="card-bd" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13 }}>{e.archivo}</span>
                    {e.archivoTamano ? (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{(e.archivoTamano / 1024).toFixed(0)} KB</span>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => bajarArchivo(e)}
                      disabled={bajando === e.estudianteId}
                    >
                      {bajando === e.estudianteId ? 'Descargando...' : 'Descargar archivo'}
                    </button>
                  </div>
                </div>
              )}

              {e.contenido && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-hd">
                    <span className="card-ttl">✍️ Respuesta escrita</span>
                  </div>
                  <div className="card-bd">
                    <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {e.contenido}
                    </p>
                  </div>
                </div>
              )}

              {/* Examen tipo ICFES: el parcial tal como lo vio el estudiante,
                  con su marca en la opcion que eligio y si era la correcta. */}
              {parcial && (act.preguntas || []).length > 0 && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-hd">
                    <span className="card-ttl">📝 {act.titulo}</span>
                    <span className={`bs ${e.aciertos === e.total ? 'bg-g' : 'bg-y'}`}>
                      {e.aciertos} de {e.total}
                    </span>
                  </div>
                  <div className="card-bd">
                    {act.preguntas.map((p, i) => {
                      const elegidas = (e.respuestas?.[p.id] ?? e.respuestas?.[String(p.id)] ?? []).map(Number);
                      const respondio = elegidas.length > 0;
                      const acertó = elegidas.includes(p.correcta);
                      return (
                        <div
                          key={p.id}
                          style={{
                            padding: '14px 0',
                            borderBottom: i < act.preguntas.length - 1 ? '1px solid #f1f5f9' : 0,
                          }}
                        >
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>
                            {i + 1}. {p.enunciado}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {p.opciones.map((o, k) => {
                              const elegida = elegidas.includes(k);
                              const esLaCorrecta = k === p.correcta;
                              /* Se colorea la que el alumno marco y la
                                 verdadera, para leer el resultado de un
                                 vistazo: verde si acierta, roja si fallo. */
                              const fondo = elegida && esLaCorrecta
                                ? '#f0fdf4'
                                : elegida
                                  ? '#fef2f2'
                                  : esLaCorrecta
                                    ? '#f0fdf4'
                                    : '#fff';
                              const borde = elegida && esLaCorrecta
                                ? '#22c55e'
                                : elegida
                                  ? '#ef4444'
                                  : esLaCorrecta
                                    ? '#86efac'
                                    : '#e2e8f0';
                              return (
                                <div
                                  key={k}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 12px', borderRadius: 8,
                                    border: `1px solid ${borde}`, background: fondo,
                                  }}
                                >
                                  <span style={{
                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 800,
                                    background: elegida ? (esLaCorrecta ? '#16a34a' : '#dc2626') : '#f1f5f9',
                                    color: elegida ? '#fff' : '#64748b',
                                  }}>
                                    {String.fromCharCode(65 + k)}
                                  </span>
                                  <span style={{ flex: 1, fontSize: 13, color: '#334155' }}>{o}</span>
                                  {elegida && (
                                    <span style={{ fontSize: 11, fontWeight: 800, color: esLaCorrecta ? '#15803d' : '#b91c1c' }}>
                                      {esLaCorrecta ? '✓ Correcta' : '✗ Incorrecta'}
                                    </span>
                                  )}
                                  {!elegida && esLaCorrecta && (
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d' }}>
                                      ✓ Era la correcta
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p style={{
                            fontSize: 12, margin: '8px 0 0', fontWeight: 700,
                            color: !respondio ? '#94a3b8' : acertó ? '#15803d' : '#b91c1c',
                          }}>
                            {!respondio
                              ? 'Sin responder'
                              : acertó
                                ? `Respondió ${String.fromCharCode(65 + elegidas[0])} · correcto`
                                : `Respondió ${String.fromCharCode(65 + elegidas[0])} · incorrecto`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {e.comentario && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-hd">
                    <span className="card-ttl">💬 Comentario del docente</span>
                  </div>
                  <div className="card-bd">
                    <p style={{ fontSize: 13, color: '#1e3a8a', margin: 0, fontStyle: 'italic' }}>{e.comentario}</p>
                  </div>
                </div>
              )}

              {/* Calificar desde la misma hoja del estudiante. */}
              {puedeEditar && (
                <div className="card" style={{ padding: 20 }}>
                  <div className="card-hd">
                    <span className="card-ttl">✍️ Calificar esta entrega</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max={act.puntos}
                      step="0.1"
                      data-testid="nota-entrega"
                      placeholder={`Nota (0-${act.puntos})`}
                      value={borrador.nota ?? e.nota ?? ''}
                      onChange={(ev) => setNotasEntrega((s) => ({ ...s, [e.estudianteId]: { ...borrador, nota: ev.target.value } }))}
                      style={{ ...inputCss, width: 130 }}
                    />
                    <input
                      data-testid="comentario-entrega"
                      placeholder="Comentario para el estudiante"
                      value={borrador.comentario ?? e.comentario ?? ''}
                      onChange={(ev) => setNotasEntrega((s) => ({ ...s, [e.estudianteId]: { ...borrador, comentario: ev.target.value } }))}
                      style={{ ...inputCss, flex: 1, minWidth: 200 }}
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => guardarCalificacion(e)}>
                      Calificar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Un hilo del foro abierto: la conversacion completa del tema y el
            formulario para responder, como en el foro de Moodle. */}
        {hiloAbierto && (() => {
          const delTema = mensajes.filter((m) => m.tema === hiloAbierto);
          return (
            <div>
              <button
                type="button"
                onClick={cerrarVista}
                className="btn btn-secondary btn-sm"
                style={{ marginBottom: 14 }}
              >
                ← Volver al foro
              </button>

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-hd">
                  <span className="card-ttl">💬 {hiloAbierto}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {delTema.length} mensaje{delTema.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div>
                  {delTema.length === 0 ? (
                    <p style={{ padding: 18, fontSize: 13, color: '#64748b', margin: 0 }}>
                      Este tema todavia no tiene mensajes.
                    </p>
                  ) : (
                    delTema.map((m) => (
                      <div key={m.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{
                            background: '#eef2ff', color: '#4338ca', width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0,
                          }}>
                            {(m.autor || '?').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                          </span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{m.autor}</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{formatDate(m.fecha)}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: '#475569', margin: '8px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {m.mensaje}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={enviarMensaje} className="card" style={{ padding: 18 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px' }}>Responder en este hilo</h4>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelCss} htmlFor="hilo-mensaje">Respuesta</label>
                  <textarea
                    id="hilo-mensaje"
                    style={{ ...inputCss, minHeight: 90, resize: 'vertical' }}
                    placeholder="Escriba su respuesta..."
                    value={nuevoMensaje.mensaje}
                    onChange={(e) => setNuevoMensaje({ ...nuevoMensaje, tema: hiloAbierto, mensaje: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={enviandoMensaje}>
                  {enviandoMensaje ? 'Enviando...' : 'Responder'}
                </button>
              </form>
            </div>
          );
        })()}

        {/* ═══════ CREAR: pantalla propia, no un panel siempre abierto ═══════ */}
        {vistaCrear && (() => {
          const corteCrear = Number(search.get('corte')) || formActividad.corte || 1;
          const cfg = {
            1: { label: 'Corte 1', border: '#10b981' },
            2: { label: 'Corte 2', border: '#3b82f6' },
            3: { label: 'Corte 3', border: '#8b5cf6' },
          }[corteCrear] || { label: 'Corte 1', border: '#10b981' };
          const esParcial = search.get('tipo') === 'parcial';

          return (
            <div>
              <button
                type="button"
                onClick={cerrarVista}
                className="btn btn-secondary btn-sm"
                style={{ marginBottom: 14 }}
              >
                ← Volver al curso
              </button>

              <div className="card" style={{ padding: 20 }}>
                <div className="card-hd">
                  <span className="card-ttl">
                    Crear en {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{curso.nombre}</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
                  Lo que cree aquí queda guardado en {cfg.label} de este curso, no en los demás.
                </p>

                {/* El tipo se puede cambiar sin salir de la pantalla. */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <button
                    type="button"
                    onClick={() => setSearch({ ...Object.fromEntries(search), tab: 'crear', tipo: 'actividad' }, { replace: true })}
                    data-testid="elegir-actividad"
                    style={{
                      background: esParcial ? '#fff' : cfg.border, color: esParcial ? '#475569' : '#fff',
                      border: `1px solid ${esParcial ? '#cbd5e1' : cfg.border}`, borderRadius: 8,
                      padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Actividad / Taller
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearch({ ...Object.fromEntries(search), tab: 'crear', tipo: 'parcial' }, { replace: true })}
                    data-testid="elegir-parcial"
                    style={{
                      background: esParcial ? '#7c3aed' : '#fff', color: esParcial ? '#fff' : '#7c3aed',
                      border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 16px',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Parcial con preguntas
                  </button>
                </div>

                {!esParcial ? (
                  <form onSubmit={enviarActividad} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelCss} htmlFor="ac-titulo">Título</label>
                      <input
                        id="ac-titulo"
                        style={inputCss}
                        value={formActividad.titulo}
                        onChange={(e) => setFormActividad({ ...formActividad, titulo: e.target.value })}
                        placeholder="Ej. Taller de consultas SQL"
                      />
                    </div>
                    <div>
                      <label style={labelCss} htmlFor="ac-tipo">Tipo</label>
                      <select
                        id="ac-tipo"
                        style={inputCss}
                        value={formActividad.tipo}
                        onChange={(e) => setFormActividad({ ...formActividad, tipo: e.target.value })}
                      >
                        <option value="tarea">Tarea</option>
                        <option value="actividad">Actividad</option>
                        <option value="taller">Taller</option>
                        <option value="proyecto">Proyecto</option>
                        <option value="informe">Informe</option>
                        <option value="quiz">Quiz</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelCss} htmlFor="ac-puntos">Puntos</label>
                      <input
                        id="ac-puntos"
                        type="number"
                        min="1"
                        style={inputCss}
                        value={formActividad.puntos}
                        onChange={(e) => setFormActividad({ ...formActividad, puntos: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / 3' }}>
                      <label style={labelCss} htmlFor="ac-desc">Descripción</label>
                      <input
                        id="ac-desc"
                        style={inputCss}
                        value={formActividad.descripcion}
                        onChange={(e) => setFormActividad({ ...formActividad, descripcion: e.target.value })}
                        placeholder="Qué debe entregar el estudiante"
                      />
                    </div>
                    <div>
                      <label style={labelCss} htmlFor="ac-fecha">Fecha y hora de entrega</label>
                      <input
                        id="ac-fecha"
                        type="datetime-local"
                        data-testid="fecha-entrega-actividad"
                        style={inputCss}
                        value={formActividad.fechaEntrega}
                        onChange={(e) => setFormActividad({ ...formActividad, fechaEntrega: e.target.value })}
                      />
                    </div>
                    {/* Ventana de entrega: con hora, porque una entrega que
                        cierra a las 10:00 no es la misma que una que cierra a
                        las 22:00. */}
                    <div>
                      <label style={labelCss} htmlFor="ac-inicio">Fecha y hora de habilitación</label>
                      <input
                        id="ac-inicio"
                        type="datetime-local"
                        data-testid="fecha-inicio-actividad"
                        style={inputCss}
                        value={formActividad.fechaInicio}
                        onChange={(e) => setFormActividad({ ...formActividad, fechaInicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelCss} htmlFor="ac-cierre">Fecha y hora de cierre</label>
                      <input
                        id="ac-cierre"
                        type="datetime-local"
                        data-testid="fecha-cierre-actividad"
                        style={inputCss}
                        value={formActividad.fechaCierre}
                        onChange={(e) => setFormActividad({ ...formActividad, fechaCierre: e.target.value })}
                        min={formActividad.fechaInicio || undefined}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / 4', marginTop: -4 }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        Fuera de ese intervalo el estudiante no puede entregar. Si las dos quedan vacías, la entrega permanece habilitada durante todo el semestre.
                      </p>
                    </div>
                    {/* Material de apoyo que el docente adjunta al crear. */}
                    <div style={{ gridColumn: '1 / 4' }}>
                      <label style={labelCss} htmlFor="ac-archivo">Archivo de apoyo (opcional)</label>
                      <input
                        id="ac-archivo"
                        type="file"
                        data-testid="archivo-actividad"
                        style={inputCss}
                        onChange={(e) => leerArchivoActividad(e.target.files?.[0])}
                      />
                      {formActividad.archivo && (
                        <p style={{ fontSize: 11, color: '#15803d', margin: '5px 0 0' }}>
                          Se adjuntará: {formActividad.archivo}
                        </p>
                      )}
                    </div>
                    <div style={{ gridColumn: '1 / 4' }}>
                      <button
                        type="submit"
                        data-testid="guardar-actividad"
                        disabled={creando || !formActividad.titulo.trim()}
                        style={{
                          background: formActividad.titulo.trim() ? cfg.border : '#cbd5e1',
                          color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px',
                          fontSize: 13, fontWeight: 700, cursor: formActividad.titulo.trim() ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {creando ? 'Guardando...' : `Crear actividad en ${cfg.label}`}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={enviarParcial} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelCss} htmlFor="pa-titulo">Título del parcial</label>
                      <input
                        id="pa-titulo"
                        style={inputCss}
                        value={formParcial.titulo}
                        onChange={(e) => setFormParcial({ ...formParcial, titulo: e.target.value, corte: corteCrear })}
                        placeholder="Ej. Parcial 1 - corte 1"
                      />
                    </div>
                    <div>
                      <label style={labelCss} htmlFor="pa-puntos">Puntos</label>
                      <input
                        id="pa-puntos"
                        type="number"
                        min="1"
                        style={inputCss}
                        value={formParcial.puntos}
                        onChange={(e) => setFormParcial({ ...formParcial, puntos: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelCss} htmlFor="pa-fecha">Fecha y hora de entrega</label>
                      <input
                        id="pa-fecha"
                        type="datetime-local"
                        data-testid="fecha-entrega-parcial"
                        style={inputCss}
                        value={formParcial.fechaEntrega}
                        onChange={(e) => setFormParcial({ ...formParcial, fechaEntrega: e.target.value })}
                      />
                    </div>
                    {/* Ventana del parcial, con hora de habilitación y cierre. */}
                    <div>
                      <label style={labelCss} htmlFor="pa-inicio">Fecha y hora de habilitación</label>
                      <input
                        id="pa-inicio"
                        type="datetime-local"
                        data-testid="fecha-inicio-parcial"
                        style={inputCss}
                        value={formParcial.fechaInicio}
                        onChange={(e) => setFormParcial({ ...formParcial, fechaInicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelCss} htmlFor="pa-cierre">Fecha y hora de cierre</label>
                      <input
                        id="pa-cierre"
                        type="datetime-local"
                        data-testid="fecha-cierre-parcial"
                        style={inputCss}
                        value={formParcial.fechaCierre}
                        onChange={(e) => setFormParcial({ ...formParcial, fechaCierre: e.target.value })}
                        min={formParcial.fechaInicio || undefined}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / 4', marginTop: -4 }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        Fuera de ese intervalo el parcial no se puede contestar. Si las dos quedan vacías, queda habilitado durante todo el semestre.
                      </p>
                    </div>

                    <div style={{ gridColumn: '1 / 4' }}>
                      {formParcial.preguntas.map((p, i) => (
                        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                          <label style={labelCss}>Pregunta {i + 1}</label>
                          <input
                            style={inputCss}
                            value={p.enunciado}
                            onChange={(e) => editarPregunta(i, { enunciado: e.target.value })}
                            placeholder="Escriba la pregunta"
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                            {p.opciones.map((o, k) => (
                              <div key={k}>
                                <label style={labelCss}>
                                  <input
                                    type="radio"
                                    name={`correcta-${i}`}
                                    checked={p.correcta === k}
                                    onChange={() => editarPregunta(i, { correcta: k })}
                                    style={{ marginRight: 4 }}
                                  />
                                  Opción {k + 1}
                                </label>
                                <input
                                  style={inputCss}
                                  value={o}
                                  onChange={(e) => {
                                    const opciones = [...p.opciones];
                                    opciones[k] = e.target.value;
                                    editarPregunta(i, { opciones });
                                  }}
                                  placeholder={`Respuesta ${k + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => setFormParcial((f) => ({
                            ...f,
                            preguntas: [...f.preguntas, { enunciado: '', opciones: ['', '', ''], correcta: 0, puntos: 5 }],
                          }))}
                          style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Agregar pregunta
                        </button>
                        <button
                          type="submit"
                          data-testid="guardar-parcial"
                          disabled={creando || !formParcial.titulo.trim()}
                          style={{
                            background: formParcial.titulo.trim() ? '#7c3aed' : '#cbd5e1',
                            color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px',
                            fontSize: 13, fontWeight: 700, cursor: formParcial.titulo.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {creando ? 'Guardando...' : 'Crear parcial'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === 'inicio' && (
          /* El progreso por corte y la nota parcial son la vista del alumno.
             El docente que califica no lleva esa nota adelante, asi que su
             columna derecha desaparece y solo queda lo que si usa. */
          <div style={{ display: 'grid', gridTemplateColumns: esEstudiante ? '2fr 1fr' : '1fr', gap: 18 }}>
            {/* Columna Izquierda */}
            <div>
              {/* Bloque Anuncios */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl">📢 Anuncios</span>
                </div>
                <div>
                  {anuncios.map((a) => (
                    <div key={a.id} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        background: '#ffedd5',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0
                      }}>
                        📢
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', margin: '0 0 3px' }}>{a.titulo}</p>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{a.contenido}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '5px 0 0' }}>{formatDate(a.fecha)} · {a.autor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloque Actividades Recientes */}
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-hd">
                  <span className="card-ttl">✅ Actividades recientes</span>
                  <button
                    onClick={() => setActiveTab('corte1')}
                    style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Ver por corte →
                  </button>
                </div>
                <div>
                    {actividades.slice(0, 4).map((a) => {
                      const { ic, bg } = getTipoIconAndColor(a.tipo);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => abrirActividad(a)}
                          data-testid={`abrir-reciente-${a.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 0,
                            borderBottom: '1px solid #f1f5f9',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9,
                            background: bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            flexShrink: 0
                          }}>
                            {ic}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.titulo}
                            </p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                              Corte {a.corte} · {formatDate(a.fechaEntrega)} · {a.puntos} pts
                            </p>
                          </div>
                          {a.estado_est === 'calificado' ? (
                            <span className="bs bg-g">✓ {a.nota}/{a.puntos}</span>
                          ) : a.estado_est === 'entregado' ? (
                            <span className="bs bg-b">Entregado</span>
                          ) : (
                            <span className="bs bg-y">Pendiente</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Columna Derecha (Progreso por Corte). Es la vista del
                alumno: el docente no se nota a si mismo. */}
            {esEstudiante && (
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-hd">
                  <span className="card-ttl">📊 Progreso por corte</span>
                </div>
                <div className="card-bd">
                  {/* Corte 1 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        Corte 1 <span style={{ color: '#94a3b8', fontSize: 11 }}>(30%)</span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#059669' }}>3.8</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: '76%', background: '#22c55e' }} />
                    </div>
                  </div>

                  {/* Corte 2 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        Corte 2 <span style={{ color: '#94a3b8', fontSize: 11 }}>(30%)</span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#059669' }}>4</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: '80%', background: '#3b82f6' }} />
                    </div>
                  </div>

                  {/* Corte 3 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        Corte 3 <span style={{ color: '#94a3b8', fontSize: 11 }}>(40%)</span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#94a3b8' }}>—</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: '0%', background: '#cbd5e1' }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>No iniciado</p>
                  </div>

                  {/* Nota parcial grande */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Nota parcial</span>
                    <span style={{ fontWeight: 900, fontSize: 24, color: '#4338ca' }}>3.9</span>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TABS CORTES 1, 2, 3                                       */}
        {/* ========================================================= */}
        {(activeTab === 'corte1' || activeTab === 'corte2' || activeTab === 'corte3') && (() => {
          const numCorte = activeTab === 'corte1' ? 1 : activeTab === 'corte2' ? 2 : 3;
          const cfg = {
            1: { label: 'Corte 1', peso: '30%', border: '#10b981', bg: '#f0fdf4' },
            2: { label: 'Corte 2', peso: '30%', border: '#3b82f6', bg: '#eff6ff' },
            3: { label: 'Corte 3', peso: '40%', border: '#8b5cf6', bg: '#faf5ff' },
          }[numCorte];

          const actsCorte = actividades.filter((a) => a.corte === numCorte);
          /* El corte del alumno es el que el docente tiene cargado en su registro,
             no un promedio de una nota que era igual para toda la clase. */
          const miCorte = misNotas?.miNota ? misNotas.miNota[`nota${numCorte}`] ?? null : null;
          const miDeEsta = (idAct) => misNotas?.entregas?.find((e) => e.actividadId === idAct) || null;
          const notaCorte = esEstudiante ? miCorte : null;
          /* El detalle de cómo se armó ese corte (cuántas actividades hay y
             cuántas entregó el alumno) viene con sus propias notas: así el
             alumno lo ve sin cargar la lista de la clase. */
          const miResumenCorte = esEstudiante ? misNotas?.miCorte?.[numCorte] || null : null;
          const actSinNota = actsCorte.filter((a) => {
            const e = miDeEsta(a.id);
            return !e || !e.entregado;
          }).length;

          return (
            <div>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                borderLeft: `5px solid ${cfg.border}`,
                padding: '16px 20px',
                marginBottom: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: cfg.bg, color: cfg.border, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Peso: <strong>{cfg.peso}</strong> de la nota final
                    </span>
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    {cfg.label} — {curso.nombre}
                  </h2>
                </div>
                {esEstudiante && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: notaCorte ? '#059669' : '#cbd5e1' }}>
                      {notaCorte ? notaCorte.toFixed(1) : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Nota corte · {cfg.peso.replace('30%', '30 %').replace('40%', '40 %')}
                    </div>
                    {/* Lo que no entregó sale cero en el promedio: decirlo evita
                        que un 1,7 se lea como una nota mal puesta. */}
                    {miResumenCorte && miResumenCorte.sinEntregar > 0 && (
                      <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700 }}>
                        {miResumenCorte.sinEntregar} sin entregar (valen 0)
                      </div>
                    )}
                    {actSinNota > 0 && (
                      <div style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>
                        {actSinNota} actividad(es) sin entregar
                      </div>
                    )}
                  </div>
                )}
              </div>

              {actsCorte.map((a) => {
  const { ic, bg } = getTipoIconAndColor(a.tipo);
                return (
                  <div key={a.id} className="act-item">
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => borrarActividad(a)}
                        title="Eliminar actividad"
                        style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', alignSelf: 'flex-start' }}
                      >
                        ✕
                      </button>
                    )}
                    <div className="act-ic-box" style={{ background: bg }}>
                      {ic}
                    </div>
                    {/* El cuerpo del recurso es el que se abre: la actividad
                        completa con sus entregas, como en Moodle. */}
                    <button
                      type="button"
                      onClick={() => abrirActividad(a)}
                      data-testid={`abrir-actividad-${a.id}`}
                      title="Abrir la actividad y ver las entregas"
                      style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>{a.titulo}</h4>
                          <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{a.descripcion}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a' }}>{a.puntos} pts</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: 11, color: '#ef4444' }}>📅 Entrega: {formatDate(a.fechaEntrega)}</span>
                        {esEstudiante ? (() => {
                          const e = miDeEsta(a.id);
                          if (!e || !e.entregado) return <span className="bs bg-b">Sin entrega</span>;
                          if (e.nota === null) return <span className="bs bg-y">Entregado, sin calificar</span>;
                          return <span className="bs bg-g">✓ {e.nota}/{a.puntos}</span>;
                        })() : (
                          <span className="bs bg-y">
                            {resumenEntregas.find((r) => r.id === a.id)?.calificadas ?? 0} calificada(s)
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}

              {/* Crear es otra vista, no un formulario siempre abierto: aqui
                  solo aparece el boton y al pulsarlo se abre la pantalla de
                  creacion con su boton de volver. */}
              {/* Un solo boton: la pantalla de creacion ofrece actividad o
                  parcial, como se pide antes de empezar. */}
              {puedeEditar && (
                <button
                  type="button"
                  onClick={() => abrirCrear(numCorte)}
                  data-testid="abrir-crear"
                  style={{ marginTop: 14, background: cfg.border, color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  ＋ Crear
                </button>
              )}
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB: NOTAS COMPLETAS                                      */}
        {/* ========================================================= */}
        {activeTab === 'notas' && (
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Notas por actividad</h4>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
              Cada actividad muestra quién la entregó y quién ya está calificada. Al abrirla se ve
              la lista de estudiantes con su nota, y esa nota se guarda en el corte del alumno
              (promedio de las entregas de ese corte, sobre 5).
            </p>
            {resumenEntregas.length === 0 ? (
              <p style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: 16, borderRadius: 10, margin: 0 }}>
                Este curso todavía no tiene actividades ni parciales. Créalos desde la pestaña
                <strong> Crear</strong>.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Actividad</th>
                    <th style={{ padding: '10px 14px' }}>Corte</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Puntaje</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Entregadas</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Calificadas</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Ver estudiantes</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenEntregas.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        <button
                          type="button"
                          data-testid={`notas-abrir-${a.id}`}
                          onClick={() => abrirActividad(a)}
                          style={{ background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 700, color: '#1d4ed8', cursor: 'pointer', textAlign: 'left' }}
                        >
                          {a.titulo}
                        </button>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                          {a.tipo}
                          {a.preguntas ? ` · ${a.preguntas} preguntas` : ''}
                          {a.fechaEntrega ? ` · entrega ${formatDate(a.fechaEntrega)}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>Corte {a.corte}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>{a.puntos}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{a.entregadas}/{a.total}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className={`bs ${a.calificadas === a.entregadas && a.entregadas ? 'bg-g' : a.calificadas ? 'bg-y' : 'bg-b'}`}>
                          {a.calificadas}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          data-testid={`notas-calificar-${a.id}`}
                          onClick={() => abrirActividad(a)}
                          style={{ background: '#1d4ed8', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Calificar →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: ASISTENCIA                                           */}
        {/* ========================================================= */}
        {activeTab === 'asistencia' && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Control de Asistencia a Clases</h4>
              {puedeEditar && (
                <button
                  type="button"
                  data-testid="abrir-sesion"
                  onClick={() => setMostrarFormSesion((v) => !v)}
                  style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {mostrarFormSesion ? 'Cancelar' : '+ Abrir sesión'}
                </button>
              )}
            </div>

            {puedeEditar && mostrarFormSesion && (
              <form onSubmit={abrirSesion} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, alignItems: 'end' }}>
                <div>
                  <label style={labelCss} htmlFor="ses-fecha">Fecha</label>
                  <input
                    id="ses-fecha"
                    type="date"
                    style={inputCss}
                    required
                    value={nuevaSesion.fecha}
                    onChange={(e) => setNuevaSesion({ ...nuevaSesion, fecha: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelCss} htmlFor="ses-tema">Tema de la sesión</label>
                  <input
                    id="ses-tema"
                    style={inputCss}
                    placeholder="Ej. Taller de normalización"
                    value={nuevaSesion.tema}
                    onChange={(e) => setNuevaSesion({ ...nuevaSesion, tema: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  data-testid="guardar-sesion"
                  disabled={guardando}
                  style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'wait' : 'pointer' }}
                >
                  Abrir
                </button>
              </form>
            )}

            {sesiones.length === 0 ? (
              <p style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: 16, borderRadius: 10, margin: 0 }}>
                Todavía no hay sesiones de asistencia en este curso.
                {puedeEditar && ' Use "Abrir sesión" para crear la primera.'}
              </p>
            ) : (
              <>
                {/* Las fechas son botones: cada una abre la asistencia de ese día. */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {sesiones.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      data-testid={`fecha-${s.fecha.slice(0, 10)}`}
                      onClick={() => editarSesion(s)}
                      style={{
                        background: sesionActiva === s.id ? '#1d4ed8' : '#fff',
                        color: sesionActiva === s.id ? '#fff' : '#1e293b',
                        border: `1px solid ${sesionActiva === s.id ? '#1d4ed8' : '#cbd5e1'}`,
                        borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {formatDate(s.fecha)}
                    </button>
                  ))}
                </div>

                {borrador && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <strong style={{ fontSize: 14, color: '#1e293b' }}>{formatDate(borrador.fecha)}</strong>
                        {borrador.tema ? <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{borrador.tema}</span> : null}
                        {!puedeEditar && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                            Tu asistencia a esta sesión. La registra el docente.
                          </div>
                        )}
                      </div>
                      {puedeEditar && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => marcarTodos('presente')}
                            style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Marcar todos P
                          </button>
                          <button
                            type="button"
                            data-testid="guardar-asistencia"
                            onClick={guardarBorrador}
                            disabled={guardando}
                            style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: guardando ? 'wait' : 'pointer' }}
                          >
                            {guardando ? 'Guardando...' : 'Guardar asistencia'}
                          </button>
                          <button
                            type="button"
                            onClick={() => borrarSesion(borrador.id)}
                            style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={th}>Estudiante</th>
                          <th style={{ ...th, textAlign: 'center' }}>Estado</th>
                          <th style={th}>Justificación</th>
                          <th style={{ ...th, textAlign: 'center' }}>% Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {borrador.registros.map((r) => {
                          const pct = porcentaje(r.estudianteId);
                          return (
                            <tr key={r.estudianteId}>
                              <td style={{ ...td, fontWeight: 600 }}>
                                {r.estudiante?.nombre || r.estudianteId}
                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{r.estudiante?.documento}</div>
                              </td>
                              <td style={{ ...td, textAlign: 'center' }}>
                                {puedeEditar ? (
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                    {ESTADOS.map(([valor, texto, color, bg]) => (
                                      <button
                                        key={valor}
                                        type="button"
                                        data-testid={`marcar-${valor}-${r.estudianteId}`}
                                        onClick={() => marcar(r.estudianteId, valor)}
                                        title={texto}
                                        style={{
                                          background: r.estado === valor ? bg : '#fff',
                                          color: r.estado === valor ? color : '#94a3b8',
                                          border: `1px solid ${r.estado === valor ? color : '#e2e8f0'}`,
                                          borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                        }}
                                      >
                                        {texto[0]}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{
                                    background: ESTADOS.find(([v]) => v === r.estado)?.[3] || '#f1f5f9',
                                    color: ESTADOS.find(([v]) => v === r.estado)?.[2] || '#64748b',
                                    padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                  }}>
                                    {ESTADOS.find(([v]) => v === r.estado)?.[1] || r.estado}
                                  </span>
                                )}
                              </td>
                              <td style={td}>
                                {puedeEditar && r.estado !== 'presente' ? (
                                  <input
                                    style={inputCss}
                                    data-testid={`justificar-${r.estudianteId}`}
                                    placeholder="Ej. certificado médico"
                                    value={r.justificacion || ''}
                                    onChange={(e) => justificar(r.estudianteId, e.target.value)}
                                  />
                                ) : (
                                  <span style={{ fontSize: 12, color: r.justificacion ? '#475569' : '#cbd5e1' }}>
                                    {r.justificacion || (r.estado === 'presente' ? '—' : 'Sin justificar')}
                                  </span>
                                )}
                              </td>
                              <td style={{ ...td, textAlign: 'center', fontWeight: 800, color: pct === null ? '#cbd5e1' : pct >= 70 ? '#15803d' : '#b91c1c' }}>
                                {pct === null ? '—' : `${pct}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: ESTUDIANTES                                          */}
        {/* ========================================================= */}
        {/* Esta lista viene del servidor: son los alumnos MATRICULADOS en
           este curso, no la lista global de la institución. El docente
           titular además puede inscribir y retirar. */}
        {activeTab === 'estudiantes' && (
          <div className="card">
            <div className="card-hd">
              <span className="card-ttl">
                👥 Estudiantes inscritos ({roster ? roster.estudiantes.length : '...'})
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Periodo {roster ? roster.periodo : ''}
              </span>
            </div>
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="green">{exito}</Aviso>
              {puedeEditar && (
                <div style={{ marginBottom: 16, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <span style={labelCss}>Inscribir estudiante</span>
                  {/* Búsqueda y no lista desplegable: con veinte o treinta
                      alumnos por Kurs la lista se recorre a ciegas, y el
                      docente casi siempre conoce el nombre o el código. */}
                  <input
                    value={buscaAlumno}
                    onChange={(e) => { setBuscaAlumno(e.target.value); setElegido(''); }}
                    placeholder="Escriba el nombre, el código o el programa del estudiante"
                    aria-label="Buscar estudiante para inscribir"
                    style={{ ...inputCss, maxWidth: 460 }}
                  />
                  {candidatos === null && (
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>Cargando estudiantes disponibles...</p>
                  )}
                  {candidatos && candidatos.length === 0 && (
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>
                      No quedan estudiantes por inscribir: todos los de la institución ya están en este curso.
                    </p>
                  )}
                  {candidatos && candidatos.length > 0 && (
                    <div style={{ marginTop: 10, maxHeight: 210, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
                      {coincidencias.length === 0 && (
                        <p style={{ fontSize: 12, color: '#94a3b8', padding: '10px 12px', margin: 0 }}>
                          Ningún estudiante coincide con «{buscaAlumno.trim()}».
                        </p>
                      )}
                      {coincidencias.map((c) => (
                        <button
                          type="button"
                          key={c.estudianteId}
                          onClick={() => { setElegido(c.estudianteId); setBuscaAlumno(c.nombre); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                            padding: '9px 12px', border: 'none', cursor: 'pointer', fontSize: 13,
                            background: elegido === c.estudianteId ? '#dbeafe' : 'transparent',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <span style={{ flex: 1, fontWeight: 600, color: '#1e293b' }}>{c.nombre}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {c.documento}{c.programa ? ` · ${c.programa}` : ''}
                          </span>
                          {elegido === c.estudianteId && <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>Elegido</span>}
                        </button>
                      ))}
                      {coincidencias.length === 20 && (
                        <p style={{ fontSize: 11, color: '#94a3b8', padding: '8px 12px', margin: 0 }}>
                          Se muestran los primeros 20: escriba parte del nombre o el código para acotar.
                        </p>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={inscribir}
                      disabled={!elegido}
                      style={{
                        padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: elegido ? 'pointer' : 'not-allowed',
                        border: 'none', background: elegido ? '#1e3a8a' : '#cbd5e1', color: '#fff',
                      }}
                    >
                      Inscribir
                    </button>
                    {elegido && (
                      <span style={{ fontSize: 11, color: '#475569' }}>
                        A inscribir: {(candidatos || []).find((c) => c.estudianteId === elegido)?.nombre}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {!roster && <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando lista...</p>}
              {roster && roster.estudiantes.length === 0 && (
                <p style={{ fontSize: 12, color: '#94a3b8' }}>
                  Nadie está matriculado en este curso todavía.
                </p>
              )}
              {(roster ? roster.estudiantes : []).map((e) => {
                const pct = porcentaje(e.estudianteId);
                return (
                  <div key={e.estudianteId} className="est-row">
                    <div className="est-av av-blue">
                      {e.nombre.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{e.nombre}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        Cód: {e.documento}
                        {e.programa ? ` · ${e.programa}` : ''}
                        {pct !== null && ` · Asistencia ${pct}%`}
                      </p>
                    </div>
                    {e.nota1 !== undefined && (
                      <span style={{ fontSize: 11, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                        {e.definitiva ?? 'Cortes: ' + [e.nota1, e.nota2, e.nota3].filter((n) => n !== null && n !== undefined).join(' · ')}
                      </span>
                    )}
                    {puedeEditar ? (
                      <button
                        type="button"
                        onClick={() => retirar(e.estudianteId, e.nombre)}
                        style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          border: '1px solid #fecaca', background: '#fff', color: '#b91c1c',
                        }}
                      >
                        Retirar
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                        Activo
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: FORO DEL CURSO. Los mensajes se agrupan por tema y cada */}
        {/* tema abre su propio hilo, como los foros de Moodle.           */}
        {/* ========================================================= */}
        {activeTab === 'foro' && (() => {
          /* Un tema agrupa todos los mensajes que lo comparten. El orden es
             el de llegada (el backend los devuelve por fecha), asi que la
             conversacion se lee de arriba abajo. */
          const porTema = new Map();
          for (const m of mensajes) {
            const clave = m.tema || 'Sin título';
            if (!porTema.has(clave)) porTema.set(clave, []);
            porTema.get(clave).push(m);
          }
          const temas = [...porTema.entries()];

          return (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, alignItems: 'start' }}>
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl">💬 Foro de {curso.nombre}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {temas.length} tema{temas.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div>
                  {temas.length === 0 ? (
                    <p style={{ padding: 18, fontSize: 13, color: '#64748b', margin: 0 }}>
                      Todavía no hay mensajes en este foro.
                    </p>
                  ) : (
                    temas.map(([tema, delTema]) => (
                      <button
                        key={tema}
                        type="button"
                        onClick={() => abrirHilo(tema)}
                        data-testid={`abrir-hilo-${tema}`.replace(/\s+/g, '-')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                          padding: '14px 16px', background: 'transparent', border: 0,
                          borderBottom: '1px solid #f1f5f9', textAlign: 'left', cursor: 'pointer',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          background: '#eef2ff', color: '#4338ca', width: 32, height: 32, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, flexShrink: 0,
                        }}>
                          {(delTema[0].autor || '?').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>
                            {tema}
                          </span>
                          <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {delTema[0].mensaje}
                          </span>
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                          {delTema.length} respuesta{delTema.length === 1 ? '' : 's'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={enviarMensaje} className="card" style={{ padding: 18 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px' }}>Publicar mensaje</h4>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelCss} htmlFor="foro-tema">Tema</label>
                  <input
                    id="foro-tema"
                    style={inputCss}
                    placeholder="Ej. Duda sobre el taller 2"
                    value={nuevoMensaje.tema}
                    onChange={(e) => setNuevoMensaje({ ...nuevoMensaje, tema: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelCss} htmlFor="foro-mensaje">Mensaje</label>
                  <textarea
                    id="foro-mensaje"
                    rows={5}
                    style={{ ...inputCss, resize: 'vertical' }}
                    placeholder="Escriba su mensaje"
                    value={nuevoMensaje.mensaje}
                    onChange={(e) => setNuevoMensaje({ ...nuevoMensaje, mensaje: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  data-testid="publicar-foro"
                  disabled={!nuevoMensaje.mensaje.trim()}
                  style={{
                    background: nuevoMensaje.mensaje.trim() ? '#4f46e5' : '#cbd5e1',
                    color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px',
                    fontSize: 13, fontWeight: 700, width: '100%',
                    cursor: nuevoMensaje.mensaje.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Publicar
                </button>
              </form>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB: RECURSOS                                             */}
        {/* ========================================================= */}
        {activeTab === 'recursos' && (
          <div className="card">
            <div className="card-hd">
              <span className="card-ttl">📁 Material de Clase y Recursos</span>
            </div>
            <div>
              {[
                { n: 'Guía de Normalización 3FN', t: 'PDF', p: '1.2 MB' },
                { n: 'Diapositivas Unidad 2 — SQL Avanzado', t: 'PPTX', p: '4.8 MB' },
                { n: 'Script Creación Tablas Empresa XYZ', t: 'SQL', p: '45 KB' },
              ].map((r, i) => (
                <div key={i} className="res-row">
                  <div style={{ fontSize: 24 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{r.n}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{r.t} · {r.p}</p>
                  </div>
                  <button
                    onClick={() => alert(`Descargando ${r.n}...`)}
                    className="btn b-secondary b-sm"
                  >
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
