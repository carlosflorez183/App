/* =============================================
   Módulo del docente.
   Sus cursos, grupos y registro de notas.
   ============================================= */
import React, { useState } from 'react';
import ModuleLayout from '../components/ModuleLayout';
import { formatDate } from '../data/mockData';

const TABS = [
  { key: 'cursos', label: 'Mis cursos', icon: '📚' },
  { key: 'notas', label: 'Registro de notas', icon: '📝' },
  { key: 'actividades', label: 'Actividades', icon: '✅' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' };

export default function Docente() {
  const [sel, setSel] = useState(null);

  return (
    <ModuleLayout title="Mi Cátedra" subtitle="Cursos, grupos y registro de calificaciones" tabs={TABS}>
      {({ tab, data, setData }) => {
        // Los cursos del LMS pertenecen a distintos docentes del periodo. El
        // docente de la demo (Dra. Laura Sánchez) todavía no tiene cursos
        // propios, así que se muestra el periodo completo con una nota visible.
        const misCursos = data.cursos.filter((c) => c.profesor === 'Dra. Laura Sánchez');
        const cursosVisibles = misCursos.length ? misCursos : data.cursos;
        const sinAsignacion = misCursos.length === 0;
        const cursoSel = sel ? data.cursos.find((c) => c.id === sel) : null;

        if (tab === 'cursos') {
          return (
            <div>
              {sinAsignacion && (
                <div style={{ ...card, background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 16, fontSize: 12, color: '#1e40af' }}>
                  Este docente no tiene cursos propios en el periodo 2026-1, por lo que se muestra la totalidad del
                  periodo. Al asignarle cursos, la lista se reduce automáticamente.
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
                      <th style={th}>Estudiantes</th><th style={th}>Progreso</th><th style={th}>Acción</th>
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
                          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setTab('notas')}>
                            Registrar notas
                          </button>
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
          // El filtro empareja el código del curso del LMS con el de la asignatura.
          const notas = cursoSel
            ? data.materias.filter((m) => m.codigo === cursoSel.codigo)
            : data.materias;
          const sinNada = notas.length === 0;
          return (
            <div>
              <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Curso:</span>
                <select value={sel ?? ''} onChange={(e) => setSel(Number(e.target.value))} style={input}>
                  <option value="">Todos</option>
                  {cursosVisibles.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.grupo})</option>)}
                </select>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {notas.length} asignatura{notas.length === 1 ? '' : 's'} en vista. Las notas se guardan en el almacenamiento local del demo.
                </span>
              </div>
              {sinNada && (
                <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                  No hay asignaturas inscritas en {cursoSel?.nombre}.
                </div>
              )}
              <div style={card}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Asignatura</th><th style={th}>Código</th>
                      <th style={th}>Nota 1</th><th style={th}>Nota 2</th><th style={th}>Nota 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notas.map((m) => (
                      <tr key={m.id}>
                        <td style={td}>{m.nombre}</td>
                        <td style={td}>{m.codigo}</td>
                        {['nota1', 'nota2', 'nota3'].map((k) => (
                          <td key={k} style={td}>
                            <input
                              type="number" min="0" max="5" step="0.1" defaultValue={m[k] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? null : Number(e.target.value);
                                setData((d) => ({ ...d, materias: d.materias.map((x) => (x.id === m.id ? { ...x, [k]: v } : x)) }));
                              }}
                              style={{ ...input, width: 72, padding: '4px 6px' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'actividades') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Actividades programadas</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th style={th}>Actividad</th><th style={th}>Curso</th><th style={th}>Tipo</th><th style={th}>Entrega</th><th style={th}>Puntos</th><th style={th}>Estado</th></tr>
                </thead>
                <tbody>
                  {data.actividades.map((a) => {
                    const c = data.cursos.find((x) => x.id === a.cursoId);
                    return (
                      <tr key={a.id}>
                        <td style={td}>{a.titulo}</td>
                        <td style={td}>{c?.nombre}</td>
                        <td style={td}>{a.tipo}</td>
                        <td style={td}>{formatDate(a.fechaEntrega)}</td>
                        <td style={td}>{a.puntos}</td>
                        <td style={td}>{a.estado_est}</td>
                      </tr>
                    );
                  })}
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
