/* =============================================
   Módulo de Rectoría.
   Indicadores institucionales de alto nivel.
   ============================================= */
import React from 'react';
import ModuleLayout from '../components/ModuleLayout';
import AsignacionDocentes from '../components/AsignacionDocentes';
import { formatCurrency } from '../data/mockData';

const TABS = [
  { key: 'indicadores', label: 'Indicadores', icon: '📈' },
  { key: 'programas', label: 'Oferta académica', icon: '🎓' },
  { key: 'docentes', label: 'Asignación docente', icon: '🧑‍🏫' },
  { key: 'admisiones', label: 'Admisiones', icon: '🎯' },
  { key: 'sostenibilidad', label: 'Sostenibilidad', icon: '💰' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f1f5f9', '#475569'], green: ['#dcfce7', '#15803d'], amber: ['#fef3c7', '#b45309'],
    red: ['#fee2e2', '#b91c1c'], blue: ['#dbeafe', '#1d4ed8'], purple: ['#ede9fe', '#6d28d9'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{children}</span>;
};

export default function Rectoria() {
  return (
    <ModuleLayout title="Rectoría" subtitle="Indicadores institucionales y oferta académica" tabs={TABS}>
      {({ tab, data }) => {
        const programas = data.matricula.programas;
        const adm = data.admisiones;
        const totalMat = programas.reduce((a, p) => a + p.matriculados, 0);
        const totalCupo = programas.reduce((a, p) => a + p.cupo, 0);
        const pagos = data.pagos || [];
        const recaudado = pagos.filter((p) => p.estado === 'pagado').reduce((a, p) => a + p.valor, 0);
        const porCobrar = pagos.filter((p) => p.estado !== 'pagado').reduce((a, p) => a + p.valor, 0);
        const posgrado = programas.filter((p) => p.modalidadId === 2).reduce((a, p) => a + p.matriculados, 0);
        const tecnologia = programas.filter((p) => p.modalidadId === 3).reduce((a, p) => a + p.matriculados, 0);
        const pregrado = totalMat - posgrado - tecnologia;
        const totalMatricula = totalMat;

        if (tab === 'indicadores') {
          const filas = [
            ['Matrícula total', totalMat.toLocaleString('es-CO'), 'estudiantes'],
            ['Ocupación de la capacidad', `${Math.round((totalMat / totalCupo) * 100)}%`, `sobre ${totalCupo.toLocaleString('es-CO')} cupos`],
            ['Programas ofrecidos', programas.length, 'en 3 modalidades'],
            ['Planta docente', data.docentes.length, 'docentes'],
            ['Asignaturas en pensum', data.matricula.materias.length, 'en 10 planes'],
            ['Aspirantes en proceso', adm.aspirantes.length, `en ${adm.procesoAbierto ? 'convocatoria abierta' : 'convocatoria cerrada'}`],
          ];
          return (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: 14, marginBottom: 18 }}>
                {filas.map(([l, v, s]) => (
                  <div key={l} style={card}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{v}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Distribución de la matrícula por modalidad</div>
                {[
                  ['Pregrado', pregrado],
                  ['Posgrado', posgrado],
                  ['Tecnología', tecnologia],
                ].map(([label, valor]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 130, fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div style={{ flex: 1, height: 22, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${(valor / totalMatricula) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#1e3a8a,#3b82f6)' }} />
                    </div>
                    <div style={{ width: 96, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
                      {valor.toLocaleString('es-CO')}
                    </div>
                    <div style={{ width: 54, textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                      {Math.round((valor / totalMatricula) * 100)}%
                    </div>
                  </div>
                ))}
              </div>

              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Programas con mayor matrícula</div>
                {[...programas].sort((a, b) => b.matriculados - a.matriculados).slice(0, 5).map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13 }}>{i + 1}. {p.nombre}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{p.matriculados.toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (tab === 'programas') {
          return (
            <div style={{ ...card, overflowX: 'auto' }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Oferta académica</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Programa</th><th style={th}>Modalidad</th><th style={th}>Nivel</th>
                    <th style={th}>Sem.</th><th style={th}>Créditos</th><th style={th}>Matriculados</th><th style={th}>Ocupación</th>
                  </tr>
                </thead>
                <tbody>
                  {programas.map((p) => {
                    const mod = data.matricula.modalidades.find((m) => m.id === p.modalidadId);
                    const oc = Math.round((p.matriculados / p.cupo) * 100);
                    return (
                      <tr key={p.id}>
                        <td style={td}><strong>{p.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{p.facultad}</span></td>
                        <td style={td}><Badge tone="blue">{mod?.nombre}</Badge></td>
                        <td style={td}>{p.modalidadId === 2 ? 'Posgrado' : p.modalidadId === 3 ? 'Tecnológico' : 'Profesional'}</td>
                        <td style={td}>{p.semestres}</td>
                        <td style={td}>{p.creditos}</td>
                        <td style={td}>{p.matriculados.toLocaleString('es-CO')}</td>
                        <td style={td}><Badge tone={oc > 95 ? 'red' : oc > 85 ? 'amber' : 'green'}>{oc}%</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        if (tab === 'docentes') {
          /* La dirección reparte la carga académica. Es la misma tabla que ve
             Administración: el componente vive aparte para que las dos
             pantallas sean la misma información y no dos versiones. */
          return (
            <div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>
                Como dirección de programa puede asignar qué docente dicta cada curso. El cambio queda
                guardado de inmediato y es el docente asignado quien puede abrir el curso, registrar
                notas y calificar entregas.
              </div>
              <AsignacionDocentes />
            </div>
          );
        }

        if (tab === 'admisiones') {
        const listaAspirantes = adm.aspirantes;
        const admitidos = listaAspirantes.filter((a) => a.estado === 'admitido').length;
        const enProceso = listaAspirantes.filter((a) => a.estado === 'en_proceso').length;
        const rechazados = listaAspirantes.filter((a) => a.estado === 'rechazado').length;
          const activo = adm.periodos.find((p) => p.estado === 'inscripciones');
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Aspirantes</div><div style={{ fontSize: 24, fontWeight: 800 }}>{listaAspirantes.length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Admitidos</div><div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{admitidos}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>En proceso</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>{enProceso}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Rechazados</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b91c1c' }}>{rechazados}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Tasa de admisión</div><div style={{ fontSize: 24, fontWeight: 800 }}>{Math.round((admitidos / listaAspirantes.length) * 100)}%</div></div>
              </div>
              {activo && (
                <div style={{ ...card, background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: '#1e3a8a' }}>{activo.nombre}</div>
                  <div style={{ fontSize: 12, color: '#1e40af', marginTop: 4 }}>
                    Cupos del proceso: {activo.cuposTotales.toLocaleString('es-CO')} · Cierre de inscripciones: {activo.fechaCierre}
                  </div>
                </div>
              )}
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Admitidos por programa</div>
                {programas.map((p) => {
                  const n = listaAspirantes.filter((a) => a.programaId === p.id && a.estado === 'admitido').length;
                  const total = listaAspirantes.filter((a) => a.programaId === p.id).length;
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 13 }}>{p.nombre}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{n} de {total} aspirantes</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (tab === 'sostenibilidad') {
          const totalPagos = recaudado + porCobrar;
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Recaudado</div><div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{formatCurrency(recaudado)}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Por cobrar</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>{formatCurrency(porCobrar)}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Tasa de recaudo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{totalPagos ? Math.round((recaudado / totalPagos) * 100) : 0}%</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Ingreso por estudiante</div><div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(Math.round(recaudado / Math.max(1, totalMat)))}</div></div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Ejecución presupuestal de referencia</div>
                {[
                  ['Docencia', 62],
                  ['Administración', 14],
                  ['Infraestructura', 12],
                  ['Bienestar', 7],
                  ['Investigación', 5],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                    <div style={{ width: 150, fontSize: 13, fontWeight: 600 }}>{l}</div>
                    <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${v}%`, height: '100%', background: 'linear-gradient(90deg,#1e3a8a,#3b82f6)' }} />
                    </div>
                    <div style={{ width: 44, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{v}%</div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
                  Valores ilustrativos del demo; no corresponden a una partida presupuestal real.
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
