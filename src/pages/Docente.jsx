/* =============================================
   Módulo del docente.
   Cursos, registro de notas y, sobre todo, las
   tres acciones que el docente ejecuta todos los
   días: abrir y editar asistencia, crear
   actividades o parciales, y moderar el foro.
   ============================================= */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout';
import RegistroNotas from '../components/RegistroNotas';
import {
  abrirAsistencia,
  crearActividad,
  eliminarActividad,
  eliminarAsistencia,
  guardarAsistencias,
  leerForo,
  listarAsistencias,
  publicarEnForo,
} from '../api/client';
import { formatDate } from '../data/mockData';

const TABS = [
  { key: 'cursos', label: 'Mis cursos', icon: '📚' },
  { key: 'notas', label: 'Registro de notas', icon: '📝' },
  { key: 'actividades', label: 'Actividades', icon: '✅' },
  { key: 'asistencia', label: 'Asistencia', icon: '🗓️' },
  { key: 'foro', label: 'Foro', icon: '💬' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' };
const label = { fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 };

const ESTADOS = [
  ['presente', 'Presente', '#15803d', '#dcfce7'],
  ['tardanza', 'Tardanza', '#b45309', '#fef3c7'],
  ['ausente', 'Ausente', '#b91c1c', '#fee2e2'],
];

/* Aviso único para errores de validación y de conexión: el docente siempre
   ve por qué no se guardó algo. */
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

const SelectorCurso = ({ cursos, sel, onChange, permitirTodos = true }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Curso:</span>
    <select value={sel ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} style={input}>
      {permitirTodos && <option value="">Todos</option>}
      {cursos.map((c) => (
        <option key={c.id} value={c.id}>{c.nombre} ({c.grupo})</option>
      ))}
    </select>
  </div>
);

export default function Docente() {
  // El curso llega por ?curso= para que una asistencia o un foro se puedan
  // abrir con enlace directo desde una notificación.
  const [params, setParams] = useSearchParams();
  const sel = params.has('curso') ? Number(params.get('curso')) : null;
  /* Solo se cambia la clave del curso: el resto de la query (la pestaña
     activa, por ejemplo) debe sobrevivir, o al abrir una asistencia desde
     "Mis cursos" se volvería a la primera pestaña sin acciones visibles. */
  const setSel = (id) => {
    const siguiente = new URLSearchParams(params);
    if (id === null) siguiente.delete('curso');
    else siguiente.set('curso', String(id));
    setParams(siguiente, { replace: true });
  };
  /* Elegir curso y cambiar de pestaña a la vez exige UN solo viaje. Con dos
     navegaciones seguidas, la segunda se construye sobre la query del render
     anterior y termina borrando el curso recién elegido: el docente llegaba
     a la pestaña de asistencia sin curso, sin filas y sin ningún botón.
     Este helper fija ambas claves de una sola vez. */
  const irA = (cursoId, tab) => {
    const siguiente = new URLSearchParams(params);
    siguiente.set('tab', tab);
    if (cursoId === null || cursoId === undefined) siguiente.delete('curso');
    else siguiente.set('curso', String(cursoId));
    setParams(siguiente, { replace: true });
  };
  // Estado propio de las pestañas que hablan con la API.
  const [sesiones, setSesiones] = useState([]);
  const [sesionActiva, setSesionActiva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [temaMensaje, setTemaMensaje] = useState('');
  const [nuevaSesion, setNuevaSesion] = useState({ fecha: '', tema: '' });
  const [borrador, setBorrador] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  /* Un parcial con preguntas se edita en un formulario aparte; el resto de
     actividades se crean con la barra simple. */
  const FORM_ACTIVIDAD = useMemo(
    () => ({ titulo: '', tipo: 'tarea', corte: 1, puntos: 10, fechaEntrega: '', descripcion: '' }),
    []
  );
  const [formActividad, setFormActividad] = useState(FORM_ACTIVIDAD);
  const [formParcial, setFormParcial] = useState({
    titulo: '', corte: 1, puntos: 10, fechaEntrega: '',
    preguntas: [{ enunciado: '', opciones: ['', '', ''], correcta: 0, puntos: 5 }],
  });

  const avisar = (msg, tono = 'ok') => {
    if (tono === 'error') { setError(msg); setExito(''); } else { setExito(msg); setError(''); }
  };

  const cargarAsistencia = useCallback(async (cursoId) => {
    if (!cursoId) { setSesiones([]); return; }
    try {
      setSesiones(await listarAsistencias(cursoId));
      setError('');
    } catch (err) {
      setSesiones([]);
      setError(`No se pudo cargar la asistencia: ${err.message}`);
    }
  }, []);

  const cargarForo = useCallback(async (cursoId) => {
    if (!cursoId) { setMensajes([]); return; }
    try {
      setMensajes(await leerForo(cursoId));
      setError('');
    } catch (err) {
      setMensajes([]);
      setError(`No se pudo cargar el foro: ${err.message}`);
    }
  }, []);

  /* La asistencia se pide al cambiar de curso y se descarta la sesión que
     estuviera abierta: sus registros son de OTRO curso y marcarlos sobre la
     lista nueva guardaría asistencia del día equivocado. */
  useEffect(() => {
    cargarAsistencia(sel);
    setSesionActiva(null);
  }, [sel, cargarAsistencia]);

  useEffect(() => {
    cargarForo(sel);
  }, [sel, cargarForo]);

  /* Al elegir una sesión se copian sus registros para poder editarlos sin
     perder los cambios si el guardado falla. */
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

  const conteo = (b) => b.registros.reduce((a, r) => ({ ...a, [r.estado]: (a[r.estado] || 0) + 1 }), {});

  const guardarBorrador = async () => {
    setGuardando(true);
    try {
      const sesion = await guardarAsistencias(
        sel,
        borrador.id,
        borrador.registros.map((r) => ({ estudianteId: r.estudianteId, estado: r.estado }))
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

  const abrirSesion = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const s = await abrirAsistencia(sel, {
        fecha: nuevaSesion.fecha,
        tema: nuevaSesion.tema.trim() || 'Sesión de clase',
      });
      setSesiones((lista) => [...lista, s].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setNuevaSesion({ fecha: '', tema: '' });
      setBorrador({ ...s, registros: s.registros.map((r) => ({ ...r })) });
      setSesionActiva(s.id);
      avisar('Sesión abierta. Ya puede marcar la asistencia.');
    } catch (err) {
      avisar(`No se abrió la sesión: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const borrarSesion = async (id) => {
    try {
      await eliminarAsistencia(sel, id);
      setSesiones((lista) => lista.filter((s) => s.id !== id));
      if (sesionActiva === id) { setSesionActiva(null); setBorrador(null); }
      avisar('Sesión eliminada.');
    } catch (err) {
      avisar(`No se eliminó: ${err.message}`, 'error');
    }
  };

  const enviarActividad = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await crearActividad(sel, {
        ...formActividad,
        titulo: formActividad.titulo.trim(),
        fechaEntrega: formActividad.fechaEntrega || null,
      });
      setFormActividad(FORM_ACTIVIDAD);
      avisar('Actividad creada.');
    } catch (err) {
      avisar(`No se creó la actividad: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const enviarParcial = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await crearActividad(sel, {
        titulo: formParcial.titulo.trim(),
        tipo: 'parcial',
        corte: Number(formParcial.corte),
        puntos: Number(formParcial.puntos),
        fechaEntrega: formParcial.fechaEntrega || null,
        preguntas: formParcial.preguntas
          .filter((p) => p.enunciado.trim())
          .map((p) => ({
            enunciado: p.enunciado.trim(),
            opciones: p.opciones.map((o) => o.trim()).filter(Boolean),
            correcta: p.correcta,
            puntos: Number(p.puntos),
          })),
      });
      setFormParcial({
        titulo: '', corte: 1, puntos: 10, fechaEntrega: '',
        preguntas: [{ enunciado: '', opciones: ['', '', ''], correcta: 0, puntos: 5 }],
      });
      avisar('Parcial creado con sus preguntas.');
    } catch (err) {
      avisar(`No se creó el parcial: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const quitarPregunta = (i) =>
    setFormParcial((f) => ({ ...f, preguntas: f.preguntas.filter((_, k) => k !== i) }));

  const editarPregunta = (i, cambios) =>
    setFormParcial((f) => ({
      ...f,
      preguntas: f.preguntas.map((p, k) => (k === i ? { ...p, ...cambios } : p)),
    }));

  const borrarActividad = async (a) => {
    try {
      await eliminarActividad(sel, a.id);
      avisar(`"${a.titulo}" quedó eliminada.`);
    } catch (err) {
      avisar(`No se eliminó: ${err.message}`, 'error');
    }
  };

  const publicar = async (e) => {
    e.preventDefault();
    try {
      const m = await publicarEnForo(sel, {
        tema: temaMensaje.trim() || 'Consulta general',
        mensaje: nuevoMensaje.trim(),
      });
      setMensajes((lista) => [...lista, m]);
      setNuevoMensaje('');
      avisar('Mensaje publicado.');
    } catch (err) {
      avisar(`No se publicó: ${err.message}`, 'error');
    }
  };

  return (
    <ModuleLayout title="Mi Cátedra" subtitle="Cursos, calificaciones, asistencia y foros" tabs={TABS}>
      {({ tab, data }) => {
        /* El servidor ya devuelve solo los cursos del docente (ver
           bootstrap.js: para el profesor filtra por docenteId). Antes esta
           lista comparaba contra un nombre fijo y, cuando no coincidia,
           caia en mostrar TODO el periodo: de ahi que aparecieran
           asignaturas de otros docentes. */
        const cursosVisibles = data.cursos;
        const sinAsignacion = cursosVisibles.length === 0;
        const cursoSel = sel ? data.cursos.find((c) => c.id === sel) : null;

        if (tab === 'cursos') {
          return (
            <div>
              {sinAsignacion && (
                <div style={{ ...card, background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 16, fontSize: 12, color: '#1e40af' }}>
                  Este docente no tiene cursos asignados en el periodo 2026-1. Apenas se le asigne uno, la lista se
                  completa automaticamente.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Cursos asignados</div><div style={{ fontSize: 26, fontWeight: 800 }}>{cursosVisibles.length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Estudiantes</div><div style={{ fontSize: 26, fontWeight: 800 }}>{cursosVisibles.reduce((a, c) => a + c.estudiantes, 0)}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Actividades pendientes</div><div style={{ fontSize: 26, fontWeight: 800 }}>{data.actividades.filter((a) => a.estado_est === 'pendiente').length}</div></div>
              </div>
              <div style={card}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Curso</th><th style={th}>Código</th><th style={th}>Grupo</th>
                      <th style={th}>Estudiantes</th><th style={th}>Progreso</th><th style={th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursosVisibles.map((c) => (
                      <tr key={c.id}>
                        <td style={td}><strong>{c.icon} {c.nombre}</strong></td>
                        <td style={td}>{c.codigo}</td>
                        <td style={td}>{c.grupo}</td>
                        <td style={td}>{c.estudiantes}</td>
                        <td style={td}>{c.progreso}%</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => irA(c.id, 'asistencia')}>
                              🗓️ Asistencia
                            </button>
                            <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => irA(c.id, 'actividades')}>
                              ✅ Actividades
                            </button>
                            <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => irA(c.id, 'foro')}>
                              💬 Foro
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'notas') {
          /* El registro es POR CURSO. Si el docente entra a la pestana sin
             haber elegido uno (por ejemplo, desde el menu, que no trae
             ?curso=), se le toma el primero de los suyos: asi siempre hay
             alumnos en pantalla, en lugar de un aviso de "nadie matriculado"
             que en realidad significa "no se ha cargado nada". */
          const cursoNotas = sel ?? cursosVisibles[0]?.id ?? null;
          return (
            <RegistroNotas
              cursos={cursosVisibles}
              cursoId={cursoNotas}
              onCambiarCurso={(id) => irA(id, 'notas')}
            />
          );
        }
        if (tab === 'actividades') {
          const lista = cursoSel
            ? data.actividades.filter((a) => a.cursoId === sel)
            : data.actividades;
          const preguntas = (a) => (a.preguntas || []).length;
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ ...card, marginBottom: 14 }}>
                <SelectorCurso cursos={cursosVisibles} sel={sel} onChange={setSel} />
              </div>

              {!sel && (
                <div style={{ ...card, marginBottom: 14, background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
                  Elija un curso para crear o eliminar actividades.
                </div>
              )}

              {sel && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 18 }}>
                  <form style={card} onSubmit={enviarActividad}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Nueva actividad</div>
                    <div style={{ marginBottom: 10 }}>
                      <span style={label}>Título</span>
                      <input
                        required value={formActividad.titulo} style={{ ...input, width: '100%' }}
                        onChange={(e) => setFormActividad((f) => ({ ...f, titulo: e.target.value }))}
                        placeholder="Ej. Taller de SQL"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <span style={label}>Tipo</span>
                        <select value={formActividad.tipo} style={{ ...input, width: '100%' }} onChange={(e) => setFormActividad((f) => ({ ...f, tipo: e.target.value }))}>
                          <option value="tarea">Tarea</option>
                          <option value="taller">Taller</option>
                          <option value="proyecto">Proyecto</option>
                          <option value="exposicion">Exposición</option>
                          <option value="foro">Foro</option>
                        </select>
                      </div>
                      <div>
                        <span style={label}>Corte</span>
                        <select value={formActividad.corte} style={{ ...input, width: '100%' }} onChange={(e) => setFormActividad((f) => ({ ...f, corte: Number(e.target.value) }))}>
                          {[1, 2, 3].map((c) => <option key={c} value={c}>Corte {c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <span style={label}>Puntos</span>
                        <input type="number" min="1" value={formActividad.puntos} style={{ ...input, width: '100%' }} onChange={(e) => setFormActividad((f) => ({ ...f, puntos: e.target.value }))} />
                      </div>
                      <div>
                        <span style={label}>Entrega</span>
                        <input type="date" value={formActividad.fechaEntrega} style={{ ...input, width: '100%' }} onChange={(e) => setFormActividad((f) => ({ ...f, fechaEntrega: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={label}>Descripción</span>
                      <textarea rows={2} value={formActividad.descripcion} style={{ ...input, width: '100%' }} onChange={(e) => setFormActividad((f) => ({ ...f, descripcion: e.target.value }))} />
                    </div>
                    <button className="btn" type="submit" disabled={guardando}>Crear actividad</button>
                  </form>

                  <form style={card} onSubmit={enviarParcial}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Nuevo parcial</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                      Un parcial exige al menos una pregunta; cada una lleva sus opciones y la respuesta correcta.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <span style={label}>Título</span>
                        <input required value={formParcial.titulo} style={{ ...input, width: '100%' }} onChange={(e) => setFormParcial((f) => ({ ...f, titulo: e.target.value }))} placeholder="Parcial 1" />
                      </div>
                      <div>
                        <span style={label}>Corte</span>
                        <select value={formParcial.corte} style={{ ...input, width: '100%' }} onChange={(e) => setFormParcial((f) => ({ ...f, corte: Number(e.target.value) }))}>
                          {[1, 2, 3].map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <span style={label}>Puntos</span>
                        <input type="number" min="1" value={formParcial.puntos} style={{ ...input, width: '100%' }} onChange={(e) => setFormParcial((f) => ({ ...f, puntos: e.target.value }))} />
                      </div>
                    </div>

                    {formParcial.preguntas.map((p, i) => (
                      <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10, background: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#1e3a8a' }}>Pregunta {i + 1}</span>
                          {formParcial.preguntas.length > 1 && (
                            <button type="button" className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => quitarPregunta(i)}>
                              Quitar
                            </button>
                          )}
                        </div>
                        <input
                          required value={p.enunciado} style={{ ...input, width: '100%', marginBottom: 8 }}
                          onChange={(e) => editarPregunta(i, { enunciado: e.target.value })}
                          placeholder="Enunciado"
                        />
                        {p.opciones.map((o, k) => (
                          <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <input
                              type="radio" checked={p.correcta === k} title="Marcar como respuesta correcta"
                              onChange={() => editarPregunta(i, { correcta: k })}
                            />
                            <input
                              required value={o} style={{ ...input, flex: 1 }}
                              onChange={(e) => editarPregunta(i, { opciones: p.opciones.map((x, j) => (j === k ? e.target.value : x)) })}
                              placeholder={`Opción ${k + 1}`}
                            />
                          </div>
                        ))}
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          La opción marcada con el círculo es la correcta. Puntos:{' '}
                          <input
                            type="number" min="1" value={p.puntos} style={{ ...input, width: 60, padding: '2px 6px' }}
                            onChange={(e) => editarPregunta(i, { puntos: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button" className="btn" style={{ marginBottom: 10 }}
                      onClick={() => setFormParcial((f) => ({ ...f, preguntas: [...f.preguntas, { enunciado: '', opciones: ['', '', ''], correcta: 0, puntos: 5 }] }))}
                    >
                      + Agregar pregunta
                    </button>
                    <button className="btn" type="submit" disabled={guardando}>Crear parcial</button>
                  </form>
                </div>
              )}

              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>
                  Actividades programadas {cursoSel ? `en ${cursoSel.nombre}` : ''}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Actividad</th><th style={th}>Curso</th><th style={th}>Tipo</th>
                      <th style={th}>Entrega</th><th style={th}>Puntos</th><th style={th}>Estado</th>
                      {sel ? <th style={th}>Acción</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((a) => (
                      <tr key={a.id}>
                        <td style={td}>
                          {a.titulo}
                          {preguntas(a) > 0 && (
                            <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 700 }}> · {preguntas(a)} preguntas</span>
                          )}
                        </td>
                        <td style={td}>{data.cursos.find((x) => x.id === a.cursoId)?.nombre}</td>
                        <td style={td}>{a.tipo}</td>
                        <td style={td}>{formatDate(a.fechaEntrega)}</td>
                        <td style={td}>{a.puntos}</td>
                        <td style={td}>{a.estado_est}</td>
                        {sel ? (
                          <td style={td}>
                            <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => borrarActividad(a)}>
                              Eliminar
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'asistencia') {
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ ...card, marginBottom: 14 }}>
                <SelectorCurso cursos={cursosVisibles} sel={sel} onChange={setSel} />
              </div>

              {!sel ? (
                <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: 28 }}>
                  Elija un curso para abrir y editar la asistencia.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 14, alignItems: 'start' }}>
                  <div>
                    <form style={{ ...card, marginBottom: 14 }} onSubmit={abrirSesion}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Abrir sesión</div>
                      <div style={{ marginBottom: 10 }}>
                        <span style={label}>Fecha</span>
                        <input
                          type="date" required value={nuevaSesion.fecha} style={{ ...input, width: '100%' }}
                          onChange={(e) => setNuevaSesion((s) => ({ ...s, fecha: e.target.value }))}
                        />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <span style={label}>Tema</span>
                        <input
                          value={nuevaSesion.tema} style={{ ...input, width: '100%' }}
                          onChange={(e) => setNuevaSesion((s) => ({ ...s, tema: e.target.value }))}
                          placeholder="Ej. Modelado de datos"
                        />
                      </div>
                      <button className="btn" type="submit" disabled={guardando}>Abrir y marcar</button>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                        La sesión nace con todos los estudiantes en estado Presente.
                      </div>
                    </form>

                    <div style={card}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Sesiones de clase</div>
                      {sesiones.length === 0 && (
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Todavía no hay sesiones registradas.</div>
                      )}
                      {sesiones.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: 10, borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                            border: `1px solid ${sesionActiva === s.id ? '#1d4ed8' : '#e2e8f0'}`,
                            background: sesionActiva === s.id ? '#eff6ff' : '#fff',
                          }}
                          onClick={() => editarSesion(s)}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{s.tema}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{formatDate(s.fecha)}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                            {s.registros.length} estudiantes
                            {sesionActiva !== s.id && (
                              <button
                                className="btn" style={{ padding: '2px 7px', fontSize: 10, marginLeft: 8 }}
                                onClick={(e) => { e.stopPropagation(); borrarSesion(s.id); }}
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={card}>
                    {!borrador ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: 28 }}>
                        Seleccione una sesión para marcar la asistencia, o abra una nueva.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{borrador.tema}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(borrador.fecha)}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {ESTADOS.map(([valor, texto]) => (
                              <button key={valor} className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => marcarTodos(valor)}>
                                Todos {texto.toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                          {ESTADOS.map(([valor, texto, fg, bg]) => {
                            const n = conteo(borrador)[valor] || 0;
                            return (
                              <span key={valor} style={{ background: bg, color: fg, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                                {texto}: {n}
                              </span>
                            );
                          })}
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr><th style={th}>Estudiante</th><th style={th}>Estado</th></tr>
                          </thead>
                          <tbody>
                            {borrador.registros.map((r) => (
                              <tr key={r.estudianteId}>
                                <td style={td}>
                                  <strong>{r.estudiante?.nombre}</strong>
                                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{r.estudiante?.documento}</span>
                                </td>
                                <td style={td}>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {ESTADOS.map(([valor, texto, fg, bg]) => (
                                      <button
                                        key={valor}
                                        onClick={() => marcar(r.estudianteId, valor)}
                                        style={{
                                          padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                          border: `1px solid ${r.estado === valor ? fg : '#cbd5e1'}`,
                                          background: r.estado === valor ? bg : '#fff',
                                          color: r.estado === valor ? fg : '#64748b',
                                        }}
                                      >
                                        {texto}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                          <button className="btn" onClick={guardarBorrador} disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Guardar asistencia'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (tab === 'foro') {
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ ...card, marginBottom: 14 }}>
                <SelectorCurso cursos={cursosVisibles} sel={sel} onChange={setSel} />
              </div>

              {!sel ? (
                <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: 28 }}>
                  Elija un curso para ver su foro.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 360px)', gap: 14, alignItems: 'start' }}>
                  <div style={card}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Mensajes del foro</div>
                    {mensajes.length === 0 && (
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>Todavía no hay mensajes. Sea el primero.</div>
                    )}
                    {mensajes.map((m) => (
                      <div key={m.id} style={{ borderLeft: '3px solid #dbeafe', paddingLeft: 12, marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.autor}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {m.tema} · {formatDate(m.fecha)}
                        </div>
                        <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>{m.mensaje}</div>
                      </div>
                    ))}
                  </div>

                  <form style={card} onSubmit={publicar}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Publicar mensaje</div>
                    <div style={{ marginBottom: 10 }}>
                      <span style={label}>Tema</span>
                      <input
                        value={temaMensaje} style={{ ...input, width: '100%' }}
                        onChange={(e) => setTemaMensaje(e.target.value)}
                        placeholder="Ej. Dudas sobre el parcial"
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={label}>Mensaje</span>
                      <textarea
                        required rows={5} value={nuevoMensaje} style={{ ...input, width: '100%' }}
                        onChange={(e) => setNuevoMensaje(e.target.value)}
                        placeholder="Escriba su consulta o respuesta…"
                      />
                    </div>
                    <button className="btn" type="submit" disabled={!nuevoMensaje.trim()}>Publicar</button>
                  </form>
                </div>
              )}
            </div>
          );
        }

        return null;
      }}
    </ModuleLayout>
  );
}
