/* =============================================
   Módulo de Admisiones.
   Aspirantes, procesos, ponderación y documentos.
   Los cambios de estado y documentación se guardan
   en el localStorage compartido del demo.
   ============================================= */
import React, { useState } from 'react';
import ModuleLayout from '../components/ModuleLayout';
import { formatDate } from '../data/mockData';

const TABS = [
  { key: 'aspirantes', label: 'Aspirantes', icon: '👥' },
  { key: 'procesos', label: 'Procesos', icon: '🗓️' },
  { key: 'ponderacion', label: 'Ponderación', icon: '⚖️' },
  { key: 'documentos', label: 'Documentos', icon: '📎' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f1f5f9', '#475569'],
    green: ['#dcfce7', '#15803d'],
    amber: ['#fef3c7', '#b45309'],
    red: ['#fee2e2', '#b91c1c'],
    blue: ['#dbeafe', '#1d4ed8'],
    purple: ['#ede9fe', '#6d28d9'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{children}</span>;
};

const ESTADO_TONE = { admitido: 'green', rechazado: 'red', en_proceso: 'amber' };
const ESTADO_LABEL = { admitido: 'Admitido', rechazado: 'Rechazado', en_proceso: 'En proceso' };
const DOC_TONE = { completo: 'green', pendiente: 'amber', incompleto: 'red' };

const input = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
  fontSize: 13, background: '#fff', color: '#0f172a',
};

export default function Admisiones() {
  const [filtro, setFiltro] = useState('todos');
  const [prog, setProg] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  return (
    <ModuleLayout
      title="Admisiones"
      subtitle="Proceso de admisión, aspirantes y documentación"
      tabs={TABS}
    >
      {({ tab, data, setData }) => {
        const adm = data.admisiones;
        const programas = data.matricula.programas;
        const nombreProg = (id) => programas.find((p) => p.id === id)?.nombre || '—';

        // Puntaje ponderado según la configuración de admisiones.
        const puntajeFinal = (a) => {
          const udp = adm.configuracion.find((c) => c.id === 'cfg-udp');
          const total =
            (a.puntajeIcfes / 500) * 45 +
            (a.examen / 100) * 30 +
            (a.promedio / 5) * 15 +
            (udp?.peso ? (a.examen / 100) * udp.peso : 0);
          return Math.round(total);
        };

        const filtrados = adm.aspirantes.filter((a) => {
          if (filtro !== 'todos' && a.estado !== filtro) return false;
          if (prog !== 'todos' && a.programaId !== Number(prog)) return false;
          if (busqueda && !a.nombre.toLowerCase().includes(busqueda.toLowerCase()) && !a.documento.includes(busqueda)) return false;
          return true;
        });

        const cambiarEstado = (id, estado) => {
          setData((d) => ({
            ...d,
            admisiones: {
              ...d.admisiones,
              aspirantes: d.admisiones.aspirantes.map((a) => (a.id === id ? { ...a, estado } : a)),
            },
          }));
        };

        const setDoc = (id, documentos) => {
          setData((d) => ({
            ...d,
            admisiones: {
              ...d.admisiones,
              aspirantes: d.admisiones.aspirantes.map((a) => (a.id === id ? { ...a, documentos } : a)),
            },
          }));
        };

        const conteo = adm.aspirantes.reduce((acc, a) => {
          acc[a.estado] = (acc[a.estado] || 0) + 1;
          return acc;
        }, {});

        if (tab === 'aspirantes') {
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total aspirantes</div><div style={{ fontSize: 24, fontWeight: 800 }}>{adm.aspirantes.length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Admitidos</div><div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{conteo.admitido || 0}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>En proceso</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>{conteo.en_proceso || 0}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Rechazados</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b91c1c' }}>{conteo.rechazado || 0}</div></div>
              </div>

              <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <input placeholder="Buscar por nombre o documento…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...input, minWidth: 240 }} />
                <select value={prog} onChange={(e) => setProg(e.target.value)} style={input}>
                  <option value="todos">Todos los programas</option>
                  {programas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={input}>
                  <option value="todos">Todos los estados</option>
                  <option value="admitido">Admitidos</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="rechazado">Rechazados</option>
                </select>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{filtrados.length} resultados</span>
              </div>

              <div style={card}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Aspirante</th>
                        <th style={th}>Programa</th>
                        <th style={th}>ICFES</th>
                        <th style={th}>Examen</th>
                        <th style={th}>Prom.</th>
                        <th style={th}>Puntaje final</th>
                        <th style={th}>Documentos</th>
                        <th style={th}>Estado</th>
                        <th style={th}>Cambiar estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((a) => (
                        <tr key={a.id}>
                          <td style={td}>
                            <strong>{a.nombre}</strong><br />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{a.documento} · {a.id}</span>
                          </td>
                          <td style={td}>{nombreProg(a.programaId)}</td>
                          <td style={td}>{a.puntajeIcfes}</td>
                          <td style={td}>{a.examen}</td>
                          <td style={td}>{a.promedio.toFixed(2)}</td>
                          <td style={td}><strong>{puntajeFinal(a)}</strong></td>
                          <td style={td}>
                            <Badge tone={DOC_TONE[a.documentos]}>{a.documentos}</Badge>
                          </td>
                          <td style={td}><Badge tone={ESTADO_TONE[a.estado]}>{ESTADO_LABEL[a.estado]}</Badge></td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => cambiarEstado(a.id, 'admitido')}>Admitir</button>
                              <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => cambiarEstado(a.id, 'en_proceso')}>Proceso</button>
                              <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => cambiarEstado(a.id, 'rechazado')}>Rechazar</button>
                              <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setDoc(a.id, a.documentos === 'completo' ? 'pendiente' : 'completo')}>
                                {a.documentos === 'completo' ? 'Docs ⏸' : 'Docs ✓'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtrados.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin resultados para el filtro aplicado.</div>}
              </div>
            </div>
          );
        }

        if (tab === 'procesos') {
          const activo = adm.periodos.find((p) => p.estado === 'inscripciones');
          return (
            <div>
              {activo && (
                <div style={{ ...card, marginBottom: 16, background: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a8a' }}>Proceso vigente: {activo.nombre}</div>
                  <div style={{ fontSize: 12, color: '#1e40af', marginTop: 4 }}>
                    Inscripciones abiertas del {formatDate(activo.fechaApertura)} al {formatDate(activo.fechaCierre)}.
                    Resultados el {formatDate(activo.fechaResultados)} · Inscripción de admitidos desde el {formatDate(activo.fechaInscripcion)}.
                  </div>
                </div>
              )}
              <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Proceso</th>
                      <th style={th}>Apertura</th>
                      <th style={th}>Cierre</th>
                      <th style={th}>Resultados</th>
                      <th style={th}>Inscripción</th>
                      <th style={th}>Cupos</th>
                      <th style={th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adm.periodos.map((p) => (
                      <tr key={p.id}>
                        <td style={td}><strong>{p.nombre}</strong></td>
                        <td style={td}>{formatDate(p.fechaApertura)}</td>
                        <td style={td}>{formatDate(p.fechaCierre)}</td>
                        <td style={td}>{formatDate(p.fechaResultados)}</td>
                        <td style={td}>{formatDate(p.fechaInscripcion)}</td>
                        <td style={td}>{p.cuposTotales.toLocaleString('es-CO')}</td>
                        <td style={td}>
                          <Badge tone={p.estado === 'inscripciones' ? 'green' : p.estado === 'convocatoria' ? 'amber' : 'slate'}>
                            {p.estado === 'inscripciones' ? 'Inscripciones' : p.estado === 'convocatoria' ? 'Convocatoria' : 'Planificado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'ponderacion') {
          const suma = adm.configuracion.reduce((a, c) => a + c.peso, 0);
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Criterios de ponderación</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                Suma total de pesos: <strong style={{ color: suma === 100 ? '#15803d' : '#b91c1c' }}>{suma}%</strong>
                {suma !== 100 ? ' — la suma debe ser 100%' : ' — correcto'}
              </div>
              {adm.configuracion.map((c) => (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span><strong>{c.nombre}</strong> <Badge tone={c.obligatorio ? 'blue' : 'slate'}>{c.obligatorio ? 'Obligatorio' : 'Opcional'}</Badge></span>
                    <span style={{ fontWeight: 700 }}>{c.peso}%</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${c.peso}%`, height: '100%', background: 'linear-gradient(90deg,#1e3a8a,#3b82f6)' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{c.descripcion}</div>
                </div>
              ))}
            </div>
          );
        }

        if (tab === 'documentos') {
          return (
            <div>
              <div style={{ ...card, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Documentación requerida</div>
                {adm.documentos.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13 }}>{d.nombre} <Badge tone={d.obligatorio ? 'blue' : 'slate'}>{d.obligatorio ? 'Obligatorio' : 'Opcional'}</Badge></span>
                    <Badge tone={d.vigente ? 'green' : 'red'}>{d.vigente ? 'Vigente' : 'Actualizar'}</Badge>
                  </div>
                ))}
              </div>

              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Revisión documental por aspirante</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                  Aspirantes con documentación pendiente o incompleta.
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Aspirante</th>
                        <th style={th}>Programa</th>
                        <th style={th}>Estado documental</th>
                        <th style={th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adm.aspirantes
                        .filter((a) => a.documentos !== 'completo')
                        .map((a) => (
                          <tr key={a.id}>
                            <td style={td}><strong>{a.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{a.documento}</span></td>
                            <td style={td}>{nombreProg(a.programaId)}</td>
                            <td style={td}><Badge tone={DOC_TONE[a.documentos]}>{a.documentos}</Badge></td>
                            <td style={td}>
                              <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setDoc(a.id, 'completo')}>
                                Marcar completo
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {adm.aspirantes.every((a) => a.documentos === 'completo') && (
                    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                      Todos los aspirantes tienen la documentación completa.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return null;
      }}
    </ModuleLayout>
  );
}
