/* =============================================
   Módulo de Talento Humano.
   Planta docente, categorías y carga académica.
   ============================================= */
import React from 'react';
import ModuleLayout from '../components/ModuleLayout';

const TABS = [
  { key: 'planta', label: 'Planta docente', icon: '👨‍🏫' },
  { key: 'carga', label: 'Carga académica', icon: '📚' },
  { key: 'areas', label: 'Áreas', icon: '🗂️' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };

export default function TalentoHumano() {
  return (
    <ModuleLayout title="Talento Humano" subtitle="Planta docente, carga y áreas de conocimiento" tabs={TABS}>
      {({ tab, data }) => {
        const docentes = data.docentes;
        const materias = data.matricula.materias;
        const cargaDe = (nombre) => materias.filter((m) => m.profesor === nombre);

        if (tab === 'planta') {
          return (
            <div>
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
                      <th style={th}>Asignaturas</th><th style={th}>Créditos</th><th style={th}>Correo</th><th style={th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docentes.map((d) => {
                      const c = cargaDe(d.nombre);
                      return (
                        <tr key={d.id}>
                          <td style={td}><strong>{d.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{d.id}</span></td>
                          <td style={td}>{d.area}</td>
                          <td style={td}>{d.categoria}</td>
                          <td style={td}>{c.length}</td>
                          <td style={td}>{c.reduce((a, m) => a + m.creditos, 0)}</td>
                          <td style={td}>{d.email}</td>
                          <td style={td}>{d.estado === 'activo' ? 'Activo' : 'Permanencia'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
