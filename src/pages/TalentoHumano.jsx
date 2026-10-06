/* =============================================
   Módulo de Talento Humano.
   Planta docente editable, carga académica,
   convocatorias con sus postulados y el plan
   de capacitaciones.
   ============================================= */
import React, { useCallback, useEffect, useState } from 'react';
import ModuleLayout from '../components/ModuleLayout';
import {
  actualizarConvocatoria,
  actualizarCapacitacion,
  actualizarDocenteTH,
  crearConvocatoria,
  crearCapacitacion,
  eliminarConvocatoria,
  evaluarPostulado,
  listarCapacitaciones,
  listarConvocatorias,
  listarPostulados,
  postularConvocatoria,
  listarNominas,
  crearNomina,
  obtenerNomina,
  listarCertificadosLaborales,
  crearCertificadoLaboral,
} from '../api/client';
import { formatDate } from '../data/mockData';

const TABS = [
  { key: 'planta', label: 'Planta docente', icon: '👨‍🏫' },
  { key: 'convocatorias', label: 'Convocatorias', icon: '📢' },
  { key: 'capacitaciones', label: 'Capacitaciones', icon: '🎓' },
  { key: 'carga', label: 'Carga académica', icon: '📚' },
  { key: 'areas', label: 'Áreas', icon: '🗂️' },
  { key: 'nomina', label: 'Nómina', icon: '💸' },
  { key: 'certificados', label: 'Certificados', icon: '📜' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' };
const label = { fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 };

const CATEGORIAS = ['Docente titular', 'Catedrático', 'Adjunto', 'Asistente', 'Contratado'];
const ESTADOS_CONV = ['abierta', 'en_proceso', 'cerrada'];
const ESTADOS_POSTULADO = ['postulado', 'en_estudio', 'admitido', 'descartado'];
const ESTADOS_CAPACITACION = ['programada', 'en_curso', 'finalizada'];

const tonoEstado = (e) =>
  ({ abierta: '#15803d', en_proceso: '#b45309', cerrada: '#64748b', admitido: '#15803d', descartado: '#b91c1c', en_estudio: '#1d4ed8', postulado: '#64748b', programada: '#1d4ed8', en_curso: '#b45309', finalizada: '#15803d' }[e] || '#64748b');

const Badge = ({ children, color = '#475569', bg = '#f1f5f9' }) => (
  <span style={{ background: bg, color, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
    {children}
  </span>
);

const EstadoBadge = ({ estado }) => (
  <Badge color={tonoEstado(estado)} bg={`${tonoEstado(estado)}1a`}>
    {String(estado || '').replace(/_/g, ' ')}
  </Badge>
);

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

export default function TalentoHumano() {
  const [convocatorias, setConvocatorias] = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [postulados, setPostulados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [convAbierta, setConvAbierta] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [formConv, setFormConv] = useState({
    cargo: '', area: '', dependencia: '', vinculo: 'catedra', cupos: 1,
    apertura: '', cierre: '', requisitos: '',
  });
  const [formCap, setFormCap] = useState({ nombre: '', fecha: '', horas: 4, cupos: 20 });
  const [formPostulado, setFormPostulado] = useState({ nombre: '', documento: '', correo: '' });
  const [nominas, setNominas] = useState([]);
  const [detalleNomina, setDetalleNomina] = useState(null);
  const [formNomina, setFormNomina] = useState({ periodo: '', fechaPago: '', uvt: '', smlmv: '' });
  const [certificados, setCertificados] = useState([]);
  const [formCert, setFormCert] = useState({ tipo: 'constancia_laboral', empleadoId: '', nominaId: '' });
  const [descargando, setDescargando] = useState(false);

  const avisar = (msg, tono = 'ok') => {
    if (tono === 'error') { setError(msg); setExito(''); } else { setExito(msg); setError(''); }
  };

  /* Al abrir una convocatoria se piden sus postulados: el listado de
     convocatorias solo trae el conteo. */
  const cargarPostulados = useCallback(async (id) => {
    try {
      const lista = await listarPostulados(id);
      setPostulados((p) => ({ ...p, [id]: lista }));
      setError('');
    } catch (err) {
      avisar(`No se pudieron cargar los postulados: ${err.message}`, 'error');
    }
  }, []);

  const cargarConvocatorias = useCallback(async () => {
    try {
      setConvocatorias(await listarConvocatorias());
      setError('');
    } catch (err) {
      setConvocatorias([]);
      setError(`No se pudieron cargar las convocatorias: ${err.message}`);
    }
  }, []);

  const cargarCapacitaciones = useCallback(async () => {
    try {
      setCapacitaciones(await listarCapacitaciones());
    } catch (err) {
      setCapacitaciones([]);
      setError(`No se pudieron cargar las capacitaciones: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarConvocatorias(), cargarCapacitaciones()]).finally(() => setCargando(false));
  }, [cargarConvocatorias, cargarCapacitaciones]);

  const cargarNominas = useCallback(async () => {
    try {
      setNominas(await listarNominas());
    } catch (err) {
      setNominas([]);
      setError(`No se pudieron cargar las nóminas: ${err.message}`);
    }
  }, []);

  const cargarCertificados = useCallback(async () => {
    try {
      setCertificados(await listarCertificadosLaborales());
    } catch (err) {
      setCertificados([]);
      setError(`No se pudieron cargar los certificados: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarConvocatorias(), cargarCapacitaciones(), cargarNominas(), cargarCertificados()]).finally(() => setCargando(false));
  }, [cargarConvocatorias, cargarCapacitaciones, cargarNominas, cargarCertificados]);

  /* ── Planta docente ──────────────────────────────────────────────────── */

  const abrirDocente = (d) => {
    setEditando(d.id);
    setForm({ area: d.area, titulo: d.titulo, categoria: d.categoria, estado: d.estado });
  };

  const cerrarEdicion = () => {
    setEditando(null);
    setForm({});
  };

  const guardarDocente = async (d, recargarDatos) => {
    setGuardando(true);
    try {
      await actualizarDocenteTH(d.id, form);
      recargarDatos((lista) => lista.map((x) => (x.id === d.id ? { ...x, ...form } : x)));
      avisar(`${d.nombre} quedó actualizado.`);
      cerrarEdicion();
    } catch (err) {
      avisar(`No se guardaron los cambios: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  /* ── Convocatorias ───────────────────────────────────────────────────── */

  const crearConv = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const c = await crearConvocatoria({ ...formConv, cupos: Number(formConv.cupos) || 1 });
      setConvocatorias((lista) => [c, ...lista]);
      setFormConv({ cargo: '', area: '', dependencia: '', vinculo: 'catedra', cupos: 1, apertura: '', cierre: '', requisitos: '' });
      avisar('Convocatoria publicada.');
    } catch (err) {
      avisar(`No se publicó la convocatoria: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoConv = async (c, estado) => {
    try {
      const r = await actualizarConvocatoria(c.id, { estado });
      setConvocatorias((lista) => lista.map((x) => (x.id === c.id ? { ...x, ...r } : x)));
      avisar(`"${c.cargo}" quedó ${estado.replace(/_/g, ' ')}.`);
    } catch (err) {
      avisar(`No se cambió el estado: ${err.message}`, 'error');
    }
  };

  const borrarConv = async (c) => {
    try {
      await eliminarConvocatoria(c.id);
      setConvocatorias((lista) => lista.filter((x) => x.id !== c.id));
      if (convAbierta === c.id) setConvAbierta(null);
      avisar(`"${c.cargo}" se eliminó junto con sus postulados.`);
    } catch (err) {
      avisar(`No se eliminó: ${err.message}`, 'error');
    }
  };

  const verPostulados = (c) => {
    if (convAbierta === c.id) { setConvAbierta(null); return; }
    setConvAbierta(c.id);
    cargarPostulados(c.id);
  };

  const agregarPostulado = async (e, id) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const p = await postularConvocatoria(id, formPostulado);
      setPostulados((lista) => ({ ...lista, [id]: [...(lista[id] || []), p] }));
      setFormPostulado({ nombre: '', documento: '', correo: '' });
      avisar('Postulación registrada.');
    } catch (err) {
      avisar(`No se registró la postulación: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const calificarPostulado = async (id, post, estado) => {
    try {
      const r = await evaluarPostulado(id, post.id, { estado });
      setPostulados((lista) => ({ ...lista, [id]: lista[id].map((x) => (x.id === post.id ? { ...x, ...r } : x)) }));
      avisar(`Postulado de ${post.nombre} quedó ${estado.replace(/_/g, ' ')}.`);
    } catch (err) {
      avisar(`No se actualizó: ${err.message}`, 'error');
    }
  };

  /* ── Capacitaciones ───────────────────────────────────────────────────── */

  const crearCap = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const c = await crearCapacitacion({ ...formCap, horas: Number(formCap.horas), cupos: Number(formCap.cupos) });
      setCapacitaciones((lista) => [c, ...lista]);
      setFormCap({ nombre: '', fecha: '', horas: 4, cupos: 20 });
      avisar('Capacitación programada.');
    } catch (err) {
      avisar(`No se creó la capacitación: ${err.message}`, 'error');
    }
  };

  const inscribir = async (c, n) => {
    try {
      const r = await actualizarCapacitacion(c.id, { inscritos: n, estado: n > 0 && c.estado === 'programada' ? 'en_curso' : c.estado });
      setCapacitaciones((lista) => lista.map((x) => (x.id === c.id ? { ...x, ...r } : x)));
    } catch (err) {
      avisar(`No se actualizó la inscripción: ${err.message}`, 'error');
    }
  };

  const avanzarCap = async (c, estado) => {
    try {
      const r = await actualizarCapacitacion(c.id, { estado });
      setCapacitaciones((lista) => lista.map((x) => (x.id === c.id ? { ...x, ...r } : x)));
      avisar(`"${c.nombre}" quedó ${estado.replace(/_/g, ' ')}.`);
    } catch (err) {
      avisar(`No se cambió el estado: ${err.message}`, 'error');
    }
  };

  return (
    <ModuleLayout title="Talento Humano" subtitle="Planta docente, convocatorias, capacitaciones y carga" tabs={TABS}>
      {({ tab, data, setData }) => {
        const docentes = data.docentes;
        const materias = data.matricula.materias;
        const cargaDe = (nombre) => materias.filter((m) => m.profesor === nombre);
        const refrescarDocentes = setData;

        if (tab === 'planta') {
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Docentes</div><div style={{ fontSize: 26, fontWeight: 800 }}>{docentes.length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>En servicio</div><div style={{ fontSize: 26, fontWeight: 800, color: '#15803d' }}>{docentes.filter((d) => d.estado === 'activo').length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Catedráticos</div><div style={{ fontSize: 26, fontWeight: 800 }}>{docentes.filter((d) => d.categoria === 'Docente titular').length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Áreas cubiertas</div><div style={{ fontSize: 26, fontWeight: 800 }}>{new Set(docentes.map((d) => d.area)).size}</div></div>
              </div>

              <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Docente</th><th style={th}>Área</th><th style={th}>Categoría</th>
                      <th style={th}>Asignaturas</th><th style={th}>Correo</th><th style={th}>Estado</th><th style={th}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docentes.map((d) => {
                      const enEdicion = editando === d.id;
                      return (
                        <tr key={d.id}>
                          <td style={td}>
                            <strong>{d.nombre}</strong>
                            <br />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{d.id}</span>
                          </td>
                          {enEdicion ? (
                            <td style={td}>
                              <input style={{ ...input, width: '100%' }} value={form.area || ''} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
                            </td>
                          ) : (
                            <td style={td}>{d.area}</td>
                          )}
                          {enEdicion ? (
                            <td style={td}>
                              <select style={input} value={form.categoria || ''} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                          ) : (
                            <td style={td}>{d.categoria}</td>
                          )}
                          <td style={td}>{cargaDe(d.nombre).length}</td>
                          <td style={td}>{d.email}</td>
                          {enEdicion ? (
                            <td style={td}>
                              <select style={input} value={form.estado || ''} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
                                <option value="activo">Activo</option>
                                <option value="permanencia">Permanencia</option>
                                <option value="cesado">Cesado</option>
                              </select>
                            </td>
                          ) : (
                            <td style={td}>{d.estado === 'activo' ? 'Activo' : 'Permanencia'}</td>
                          )}
                          <td style={td}>
                            {enEdicion ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => guardarDocente(d, refrescarDocentes)} disabled={guardando}>
                                  Guardar
                                </button>
                                <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={cerrarEdicion}>
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => abrirDocente(d)}>
                                Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'convocatorias') {
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 14, alignItems: 'start' }}>
                <form style={card} onSubmit={crearConv}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Publicar convocatoria</div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={label}>Cargo</span>
                    <input required value={formConv.cargo} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, cargo: e.target.value }))} placeholder="Docente de tiempo completo" />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={label}>Área</span>
                    <input required value={formConv.area} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, area: e.target.value }))} placeholder="Ingeniería de Software" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <span style={label}>Dependencia</span>
                      <input value={formConv.dependencia} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, dependencia: e.target.value }))} />
                    </div>
                    <div>
                      <span style={label}>Vínculo</span>
                      <select value={formConv.vinculo} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, vinculo: e.target.value }))}>
                        <option value="catedra">Cátedra</option>
                        <option value="planta">Planta</option>
                        <option value="contrato">Contrato</option>
                        <option value="horas">Por horas</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <span style={label}>Cupos</span>
                      <input type="number" min="1" value={formConv.cupos} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, cupos: e.target.value }))} />
                    </div>
                    <div>
                      <span style={label}>Apertura</span>
                      <input type="date" required value={formConv.apertura} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, apertura: e.target.value }))} />
                    </div>
                    <div>
                      <span style={label}>Cierre</span>
                      <input type="date" required value={formConv.cierre} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, cierre: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={label}>Requisitos</span>
                    <textarea rows={2} value={formConv.requisitos} style={{ ...input, width: '100%' }} onChange={(e) => setFormConv((f) => ({ ...f, requisitos: e.target.value }))} />
                  </div>
                  <button className="btn" type="submit" disabled={guardando}>Publicar</button>
                </form>

                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>
                    <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Convocatorias</div><div style={{ fontSize: 24, fontWeight: 800 }}>{convocatorias.length}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Abiertas</div><div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{convocatorias.filter((c) => c.estado === 'abierta').length}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Cupos abiertos</div><div style={{ fontSize: 24, fontWeight: 800 }}>{convocatorias.filter((c) => c.estado === 'abierta').reduce((a, c) => a + c.cupos, 0)}</div></div>
                  </div>

                  {cargando && <div data-cargando="1" style={card}>Cargando convocatorias…</div>}

                  {!cargando && convocatorias.length === 0 && (
                    <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>No hay convocatorias publicadas.</div>
                  )}

                  {convocatorias.map((c) => {
                    const abierta = convAbierta === c.id;
                    const lista = postulados[c.id];
                    return (
                      <div key={c.id} style={{ ...card, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{c.cargo}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              {c.area} · {c.vinculo} · {c.cupos} cupo{c.cupos === 1 ? '' : 's'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              {formatDate(c.apertura)} → {formatDate(c.cierre)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <EstadoBadge estado={c.estado} />
                            <select
                              style={input}
                              value={c.estado}
                              onChange={(e) => cambiarEstadoConv(c, e.target.value)}
                              title="Cambiar estado"
                            >
                              {ESTADOS_CONV.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                          </div>
                        </div>

                        {c.requisitos && (
                          <div style={{ fontSize: 12, color: '#475569', background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                            {c.requisitos}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => verPostulados(c)}>
                            Postulados ({c._count?.postulados ?? 0})
                          </button>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => borrarConv(c)}>
                            Eliminar
                          </button>
                        </div>

                        {abierta && (
                          <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                            <form onSubmit={(e) => agregarPostulado(e, c.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, marginBottom: 12 }}>
                              <input required placeholder="Nombre" style={input} value={formPostulado.nombre} onChange={(e) => setFormPostulado((f) => ({ ...f, nombre: e.target.value }))} />
                              <input required placeholder="Documento" style={input} value={formPostulado.documento} onChange={(e) => setFormPostulado((f) => ({ ...f, documento: e.target.value }))} />
                              <input placeholder="Correo" style={input} value={formPostulado.correo} onChange={(e) => setFormPostulado((f) => ({ ...f, correo: e.target.value }))} />
                              <button className="btn" type="submit" disabled={guardando}>Postular</button>
                            </form>

                            {!lista && !error && <div data-cargando="1" style={{ fontSize: 12, color: '#94a3b8' }}>Cargando postulados…</div>}
                            {lista && lista.length === 0 && (
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>Todavía nadie se ha postulate para este cargo.</div>
                            )}
                            {lista && lista.length > 0 && (
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr><th style={th}>Nombre</th><th style={th}>Documento</th><th style={th}>Puntaje</th><th style={th}>Estado</th></tr>
                                </thead>
                                <tbody>
                                  {lista.map((p) => (
                                    <tr key={p.id}>
                                      <td style={td}>{p.nombre}</td>
                                      <td style={td}>{p.documento}</td>
                                      <td style={td}>
                                        <input
                                          type="number" min="0" max="100" defaultValue={p.puntaje ?? ''} style={{ ...input, width: 70 }}
                                          onBlur={async (e) => {
                                            const v = e.target.value === '' ? null : Number(e.target.value);
                                            if (v === p.puntaje) return;
                                            try {
                                              const r = await evaluarPostulado(c.id, p.id, { puntaje: v });
                                              setPostulados((m) => ({ ...m, [c.id]: m[c.id].map((x) => (x.id === p.id ? { ...x, ...r } : x)) }));
                                            } catch (err) {
                                              avisar(`No se guardó el puntaje: ${err.message}`, 'error');
                                            }
                                          }}
                                        />
                                      </td>
                                      <td style={td}>
                                        <select style={input} value={p.estado} onChange={(e) => calificarPostulado(c.id, p, e.target.value)}>
                                          {ESTADOS_POSTULADO.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                        </select>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'capacitaciones') {
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 14, alignItems: 'start' }}>
                <form style={card} onSubmit={crearCap}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Programar capacitación</div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={label}>Nombre</span>
                    <input required value={formCap.nombre} style={{ ...input, width: '100%' }} onChange={(e) => setFormCap((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Capacitación docente" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <span style={label}>Fecha</span>
                      <input type="date" required value={formCap.fecha} style={{ ...input, width: '100%' }} onChange={(e) => setFormCap((f) => ({ ...f, fecha: e.target.value }))} />
                    </div>
                    <div>
                      <span style={label}>Horas</span>
                      <input type="number" min="1" value={formCap.horas} style={{ ...input, width: '100%' }} onChange={(e) => setFormCap((f) => ({ ...f, horas: e.target.value }))} />
                    </div>
                    <div>
                      <span style={label}>Cupos</span>
                      <input type="number" min="1" value={formCap.cupos} style={{ ...input, width: '100%' }} onChange={(e) => setFormCap((f) => ({ ...f, cupos: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn" type="submit" disabled={guardando}>Programar</button>
                </form>

                <div>
                  {capacitaciones.length === 0 && (
                    <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>No hay capacitaciones programadas.</div>
                  )}
                  {capacitaciones.map((c) => {
                    const lleno = c.inscritos >= c.cupos;
                    return (
                      <div key={c.id} style={{ ...card, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{c.nombre}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(c.fecha)} · {c.horas} horas</div>
                          </div>
                          <EstadoBadge estado={c.estado} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ flex: 1, height: 16, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (c.inscritos / c.cupos) * 100)}%`, height: '100%', background: lleno ? '#ef4444' : 'linear-gradient(90deg,#1e3a8a,#3b82f6)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 92, textAlign: 'right' }}>
                            {c.inscritos}/{c.cupos}
                          </span>
                          {lleno && <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>Cupo lleno</span>}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => inscribir(c, Math.max(0, c.inscritos - 1))}>− Quitar</button>
                          <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => inscribir(c, c.inscritos + 1)} disabled={lleno}>+ Inscribir</button>
                          <select style={input} value={c.estado} onChange={(e) => avanzarCap(c, e.target.value)}>
                            {ESTADOS_CAPACITACION.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'carga') {
          const conCarga = docentes.map((d) => ({ d, n: cargaDe(d.nombre).length, cr: cargaDe(d.nombre).reduce((a, m) => a + m.creditos, 0) }));
          const maxCr = Math.max(...conCarga.map((x) => x.cr), 1);
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Distribución de carga académica</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                Asignaturas y créditos del pensum asignados a cada docente.
              </div>
              {conCarga.map(({ d, n, cr }) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                  <div style={{ width: 185, fontSize: 12, fontWeight: 600 }}>{d.nombre}</div>
                  <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${(cr / maxCr) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#1e3a8a,#3b82f6)' }} />
                  </div>
                  <div style={{ width: 60, fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{n} asign.</div>
                  <div style={{ width: 48, fontSize: 12, textAlign: 'right', color: '#64748b' }}>{cr} cr</div>
                </div>
              ))}
            </div>
          );
        }

        if (tab === 'areas') {
          const areas = {};
          for (const d of docentes) {
            areas[d.area] = areas[d.area] || { docentes: 0, area: d.area };
            areas[d.area].docentes += 1;
            areas[d.area].cr = (areas[d.area].cr || 0) + cargaDe(d.nombre).reduce((a, m) => a + m.creditos, 0);
          }
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Áreas de conocimiento</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Área</th><th style={th}>Docentes</th><th style={th}>Créditos a su cargo</th></tr></thead>
                <tbody>
                  {Object.values(areas).sort((a, b) => b.docentes - a.docentes).map((a) => (
                    <tr key={a.area}>
                      <td style={td}>{a.area}</td>
                      <td style={td}>{a.docentes}</td>
                      <td style={td}>{a.cr || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return null;
      }}
    </ModuleLayout>
  );
}
