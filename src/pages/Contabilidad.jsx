/* =============================================
   Módulo de Contabilidad.
   Recaudo, cartera y conciliaciones.
   ============================================= */
import React from 'react';
import ModuleLayout from '../components/ModuleLayout';
import { formatCurrency, formatDate } from '../data/mockData';

const TABS = [
  { key: 'recaudo', label: 'Recaudo', icon: '💰' },
  { key: 'cartera', label: 'Cartera', icon: '📉' },
  { key: 'conciliacion', label: 'Conciliación', icon: '🔍' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };

export default function Contabilidad() {
  return (
    <ModuleLayout title="Contabilidad" subtitle="Recaudo, cartera por cobrar y conciliación bancaria" tabs={TABS}>
      {({ tab, data }) => {
        const pagos = data.pagos || [];
        const pagados = pagos.filter((p) => p.estado === 'pagado');
        const pendientes = pagos.filter((p) => p.estado !== 'pagado');
        const recaudado = pagados.reduce((a, p) => a + p.valor, 0);
        const cartera = pendientes.reduce((a, p) => a + p.valor, 0);
        const programas = data.matricula.programas;
        const totalMat = programas.reduce((a, p) => a + p.matriculados, 0);

        if (tab === 'recaudo') {
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Recaudado</div><div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{formatCurrency(recaudado)}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{pagados.length} transacciones</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Por cobrar</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>{formatCurrency(cartera)}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{pendientes.length} transacciones</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Tasa de recaudo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{recaudado + cartera ? Math.round((recaudado / (recaudado + cartera)) * 100) : 0}%</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Ingreso medio por estudiante</div><div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(Math.round(recaudado / Math.max(1, totalMat)))}</div></div>
              </div>
              <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Concepto</th><th style={th}>Valor</th><th style={th}>Fecha pago</th><th style={th}>Referencia</th></tr></thead>
                  <tbody>
                    {pagados.map((p) => (
                      <tr key={p.id}>
                        <td style={td}><strong>{p.concepto}</strong></td>
                        <td style={td}>{formatCurrency(p.valor)}</td>
                        <td style={td}>{formatDate(p.fecha_pago)}</td>
                        <td style={td}>{p.referencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'cartera') {
          return (
            <div style={{ ...card, overflowX: 'auto' }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Cartera pendiente</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Concepto</th><th style={th}>Valor</th><th style={th}>Fecha límite</th><th style={th}>Días vencidos</th><th style={th}>Prioridad</th></tr></thead>
                <tbody>
                  {pendientes.map((p) => {
                    const dias = Math.max(0, Math.round((new Date('2026-09-28') - new Date(p.fecha_limite)) / 86400000));
                    return (
                      <tr key={p.id}>
                        <td style={td}><strong>{p.concepto}</strong></td>
                        <td style={td}>{formatCurrency(p.valor)}</td>
                        <td style={td}>{formatDate(p.fecha_limite)}</td>
                        <td style={td}>{dias} días</td>
                        <td style={td}>
                          <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: dias > 60 ? '#fee2e2' : '#fef3c7', color: dias > 60 ? '#b91c1c' : '#b45309' }}>
                            {dias > 60 ? 'Alta' : 'Media'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pendientes.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No hay cartera pendiente.</div>}
            </div>
          );
        }

        if (tab === 'conciliacion') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Conciliación bancaria</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                Movimientos con referencia bancaria registrada frente a los pagos del sistema.
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Referencia</th><th style={th}>Concepto</th><th style={th}>Valor</th><th style={th}>Estado</th></tr></thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id}>
                      <td style={td}>{p.referencia || '—'}</td>
                      <td style={td}>{p.concepto}</td>
                      <td style={td}>{formatCurrency(p.valor)}</td>
                      <td style={td}>
                        <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: p.referencia ? '#dcfce7' : '#fef3c7', color: p.referencia ? '#15803d' : '#b45309' }}>
                          {p.referencia ? 'Conciliado' : 'Sin conciliar'}
                        </span>
                      </td>
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
