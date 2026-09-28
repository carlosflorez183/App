/* =============================================
   Módulo de Administración.
   Solo lectura sobre los datos del demo: consulta
   indicadores, programas, docentes y matrícula.
   ============================================= */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout';
import { formatCurrency } from '../data/mockData';

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: '📊' },
  { key: 'programas', label: 'Programas', icon: '🎓' },
  { key: 'pensum', label: 'Pensum', icon: '📖' },
  { key: 'docentes', label: 'Docentes', icon: '👨‍🏫' },
  { key: 'matricula', label: 'Matrícula', icon: '📝' },
  { key: 'finanzas', label: 'Finanzas', icon: '💰' },
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
  return (
    <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
};

const Kpi = ({ label, value, sub, icon }) => (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#0f172a' }}>{value}</div>
        {sub ? <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div> : null}
      </div>
      <div style={{ fontSize: 24 }}>{icon}</div>
    </div>
  </div>
);

export default function Admin() {
  const navigate = useNavigate();
  const [progSel, setProgSel] = useState(1);

  return (
    <ModuleLayout
      title="Panel de Administración"
      subtitle="Indicadores institucionales, planta docente y matrícula"
      tabs={TABS}
    >
      {({ tab, data }) => {
        const programas = data.matricula.programas;
        const materias = data.matricula.materias;
        const totalMatriculados = programas.reduce((a, p) => a + p.matriculados, 0);
        const totalCupo = programas.reduce((a, p) => a + p.cupo, 0);
        const ocupacion = Math.round((totalMatriculados / totalCupo) * 100);
        const pagos = data.pagos || [];
        const pagosPend = pagos.filter((p) => p.estado !== 'pagado');
        const ingresos = pagos.reduce((a, p) => a + (p.valor || 0), 0);
        const cartera = pagosPend.reduce((a, p) => a + (p.valor || 0), 0);
        const maxMat = Math.max(...programas.map((p) => p.matriculados));

        if (tab === 'resumen') {
          return (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 }}>
                <Kpi label="Estudiantes matriculados" value={totalMatriculados.toLocaleString('es-CO')} sub={`${ocupacion}% de la capacidad`} icon="👥" />
                <Kpi label="Programas activos" value={programas.length} sub="3 modalidades" icon="🎓" />
                <Kpi label="Planta docente" value={data.docentes.length} sub={`${data.docentes.filter((d) => d.estado === 'activo').length} en servicio`} icon="👨‍🏫" />
                <Kpi label="Asignaturas en pensum" value={materias.length} sub="10 planes de estudio" icon="📚" />
                <Kpi label="Ingresos registrados" value={formatCurrency(ingresos)} sub={`${pagosPend.length} pagos pendientes`} icon="💰" />
                <Kpi label="Cartera por cobrar" value={formatCurrency(cartera)} sub="Recaudo del semestre" icon="⚠️" />
              </div>

              <div style={{ ...card, marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Matriculados por programa</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Comparativo frente a la capacidad máxima de cada programa</div>
                {programas.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 210, fontSize: 12, color: '#334155', fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ flex: 1, height: 20, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${(p.matriculados / maxMat) * 100}%`, height: '100%', background: p.cupo > 0 && p.matriculados / p.cupo > 0.95 ? '#ef4444' : 'linear-gradient(90deg,#1e3a8a,#3b82f6)' }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (p.matriculados / p.cupo) * 100)}%`, width: 2, background: '#0f172a' }} />
                    </div>
                    <div style={{ width: 108, fontSize: 12, textAlign: 'right', color: '#334155', fontWeight: 700 }}>
                      {p.matriculados} / {p.cupo}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  La línea vertical marca el límite de capacidad. En rojo, programas por encima del 95% de ocupación.
                </div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Accesos directos</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => navigate('/admisiones')}>🎓 Gestionar Admisiones</button>
                  <button className="btn" onClick={() => navigate('/pensum')}>📖 Consultar Pensum</button>
                  <button className="btn" onClick={() => navigate('/dashboard?view=home')}>🏠 Ir al Inicio</button>
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'programas') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Programas ofrecidos</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Programa</th>
                      <th style={th}>Modalidad</th>
                      <th style={th}>Facultad</th>
                      <th style={th}>Sem.</th>
                      <th style={th}>Créditos</th>
                      <th style={th}>Matriculados</th>
                      <th style={th}>Cupo</th>
                      <th style={th}>Ocupación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programas.map((p) => {
                      const mod = data.matricula.modalidades.find((m) => m.id === p.modalidadId);
                      const oc = Math.round((p.matriculados / p.cupo) * 100);
                      return (
                        <tr key={p.id}>
                          <td style={td}><strong>{p.icon} {p.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>SNIES {p.snies}</span></td>
                          <td style={td}><Badge tone="blue">{mod?.nombre}</Badge></td>
                          <td style={td}>{p.facultad}</td>
                          <td style={td}>{p.semestres}</td>
                          <td style={td}>{p.creditos}</td>
                          <td style={td}>{p.matriculados.toLocaleString('es-CO')}</td>
                          <td style={td}>{p.cupo.toLocaleString('es-CO')}</td>
                          <td style={td}>
                            <Badge tone={oc > 95 ? 'red' : oc > 85 ? 'amber' : 'green'}>{oc}%</Badge>
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

        if (tab === 'pensum') {
          const prog = programas.find((p) => p.id === progSel) || programas[0];
          const mias = materias.filter((m) => m.programaId === prog.id);
          const porSem = Array.from({ length: prog.semestres }, (_, i) =>
            mias.filter((m) => m.semestre === i + 1)
          );
          return (
            <div>
              <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Programa:</span>
                <select value={progSel} onChange={(e) => setProgSel(Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  {programas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <Badge tone="purple">{mias.length} asignaturas</Badge>
                <Badge tone="blue">{mias.reduce((a, m) => a + m.creditos, 0)} créditos</Badge>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Modo consulta: la matrícula la realiza el estudiante en /matricula</span>
              </div>

              {porSem.map((ms, i) => (
                <div key={i} style={{ ...card, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>Semestre {i + 1}</span>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                      {ms.length} materias · {ms.reduce((a, m) => a + m.creditos, 0)} cr
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 8 }}>
                    {ms.map((m) => (
                      <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{m.codigo}</div>
                        <div style={{ fontSize: 12, color: '#334155' }}>{m.nombre}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{m.creditos} cr · {m.area}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (tab === 'docentes') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Planta docente</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                Carga académica estimada según las asignaturas del pensum que tienen asignadas.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Docente</th>
                      <th style={th}>Área</th>
                      <th style={th}>Categoría</th>
                      <th style={th}>Asignaturas</th>
                      <th style={th}>Créditos</th>
                      <th style={th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.docentes.map((d) => {
                      const asignadas = materias.filter((m) => m.profesor === d.nombre);
                      return (
                        <tr key={d.id}>
                          <td style={td}><strong>{d.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{d.titulo}</span></td>
                          <td style={td}>{d.area}</td>
                          <td style={td}><Badge>{d.categoria}</Badge></td>
                          <td style={td}>{asignadas.length}</td>
                          <td style={td}>{asignadas.reduce((a, m) => a + m.creditos, 0)}</td>
                          <td style={td}>
                            <Badge tone={d.estado === 'activo' ? 'green' : 'amber'}>
                              {d.estado === 'activo' ? 'En servicio' : 'Permanencia'}
                            </Badge>
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

        if (tab === 'matricula') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Estructura de la matrícula</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                Distribución de asignaturas y créditos por programa. Para matricular hay que usar el flujo del estudiante.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Programa</th>
                      <th style={th}>Asignaturas</th>
                      <th style={th}>Créditos totales</th>
                      <th style={th}>Promedio por semestre</th>
                      <th style={th}>Semestre más denso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programas.map((p) => {
                      const ms = materias.filter((m) => m.programaId === p.id);
                      const densos = Array.from({ length: p.semestres }, (_, i) =>
                        ms.filter((m) => m.semestre === i + 1).reduce((a, m) => a + m.creditos, 0)
                      );
                      const max = Math.max(...densos);
                      return (
                        <tr key={p.id}>
                          <td style={td}><strong>{p.nombre}</strong></td>
                          <td style={td}>{ms.length}</td>
                          <td style={td}>{ms.reduce((a, m) => a + m.creditos, 0)}</td>
                          <td style={td}>{(ms.reduce((a, m) => a + m.creditos, 0) / p.semestres).toFixed(1)} cr</td>
                          <td style={td}>{max} cr</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'finanzas') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Estado de pagos</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
                <Kpi label="Total facturado" value={formatCurrency(ingresos)} icon="🧾" />
                <Kpi label="Cartera pendiente" value={formatCurrency(cartera)} sub={`${pagosPend.length} transacciones`} icon="⚠️" />
                <Kpi label="Recaudado" value={formatCurrency(ingresos - cartera)} icon="✅" />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Concepto</th>
                      <th style={th}>Límite</th>
                      <th style={th}>Valor</th>
                      <th style={th}>Referencia</th>
                      <th style={th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p) => (
                      <tr key={p.id}>
                        <td style={td}>{p.concepto}</td>
                        <td style={td}>{p.fecha_limite}</td>
                        <td style={td}>{formatCurrency(p.valor)}</td>
                        <td style={td}>{p.referencia || '—'}</td>
                        <td style={td}>
                          <Badge tone={p.estado === 'pagado' ? 'green' : 'amber'}>
                            {p.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
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

        return null;
      }}
    </ModuleLayout>
  );
}
