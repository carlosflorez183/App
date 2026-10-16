/* =============================================
   Módulo de Admisiones y Registro.
   Cubre el ciclo completo del estudiante: admisión,
   inscripción/matrícula, expediente, estado de
   cuenta y emisión de certificados.
   Los cambios se guardan en el localStorage
   compartido del demo.
   ============================================= */
import React, { useState } from 'react';
import Icon, { Ico } from '../components/Icon';
import ModuleLayout from '../components/ModuleLayout';
import { EstadoVacio } from '../components/Estado';
import {
  actualizarAspirante,
  actualizarEstudiante,
  alternarRequisito,
  descargarCertificado,
  emitirCertificado as emitirCertificadoApi,
  registrarPago as registrarPagoApi,
} from '../api/client';
import { formatCurrency, formatDate } from '../data/mockData';
import {
  ESTADO_ESTUDIANTE,
  TIPOS_CERTIFICADO,
  cartera,
  certificadoDescargable,
  estadoCuenta,
  estadoCertificado,
  pagosVencidos,
  puedeEmitir,
  saldo,
} from '../data/registro';
import { descargarExcel } from '../utils/excel';

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: 'home' },
  { key: 'aspirantes', label: 'Aspirantes', icon: 'users' },
  { key: 'procesos', label: 'Procesos', icon: 'calendario-dias' },
  { key: 'documentos', label: 'Documentos', icon: 'archivo' },
  { key: 'registro', label: 'Registro', icon: 'graduacion' },
  { key: 'expedientes', label: 'Expedientes', icon: 'carpeta' },
  { key: 'cuenta', label: 'Estado de cuenta', icon: 'tarjeta-credito' },
  { key: 'certificados', label: 'Certificados', icon: 'certificado' },
  { key: 'reportes', label: 'Reportes', icon: 'grafica-barras' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9', verticalAlign: 'top' };
const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };
const input = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #cdc9bf',
  fontSize: 13, background: '#fff', color: '#14110c',
};

const TONES = {
  slate:  ['#f0eee9', '#4e4a43'],
  green:  ['#d8f0e5', '#0a6e4b'],
  amber:  ['#fbefd6', '#99610e'],
  red:    ['#ffe0e5', '#c1122c'],
  blue:   ['#e3f1ff', '#06468c'],
  purple: ['#efe9fb', '#5a37ad'],
};

const Badge = ({ children, tone = 'slate' }) => {
  const [bg, fg] = TONES[tone] || TONES.slate;
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>;
};

const Kpi = ({ icon, bg, value, label, hint, onClick, color }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      style={{
        background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 16,
        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
        fontFamily: 'inherit', cursor: onClick ? 'pointer' : 'default', width: '100%',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}><Ico name={icon} size={20} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: color || '#14110c' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6f6b62', fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#9c988e' }}>{hint}</div>}
      </div>
    </Tag>
  );
};

const Vacio = ({ children }) => <EstadoVacio mensaje={children} />;

const Encabezado = ({ titulo, sub, accion }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
    <div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#14110c' }}>{titulo}</div>
      {sub && <div style={{ fontSize: 12, color: '#9c988e', marginTop: 3 }}>{sub}</div>}
    </div>
    {accion}
  </div>
);

const ESTADO_ASP = {
  admitido: { label: 'Admitido', tone: 'green' },
  rechazado: { label: 'Rechazado', tone: 'red' },
  en_proceso: { label: 'En proceso', tone: 'amber' },
};
const DOC_TONE = { completo: 'green', pendiente: 'amber', incompleto: 'red' };
const PAGO_TONE = { pagado: 'green', pendiente: 'amber', vencido: 'red' };
const PAGO_LABEL = { pagado: 'Pagado', pendiente: 'Pendiente', vencido: 'Vencido' };

export default function Admisiones() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [prog, setProg] = useState('todos');
  const [filtroCuenta, setFiltroCuenta] = useState('todos');
  const [selEstudiante, setSelEstudiante] = useState('');
  const [selTipo, setSelTipo] = useState('estudios');
  const [aviso, setAviso] = useState(null);

  return (
    <ModuleLayout
      title="Admisiones y Registro"
      subtitle="Admisión, inscripción, expedientes, cartera y certificaciones"
      tabs={TABS}
      hideTabs
      titleFromTab
    >
      {({ tab, setTab, data, setData, recargar }) => {
        const adm = data.admisiones;
        const estudiantes = data.estudiantes;
        const programas = data.matricula.programas;
        const nombreProg = (id) => programas.find((p) => p.id === id)?.nombre || '—';
        const estudiantePorId = (id) => estudiantes.find((e) => e.id === id);
        /* Lo que el alumno pidió y todavía no se le entregó. Una solicitud
           entra como "en_proceso" y el seed viejo usaba "solicitado": cuentan
           las dos, si no el contador miente y Registro no ve trabajo pendiente. */
        const pendientesCertificado = data.certificadosEmitidos.filter(
          (c) => c.estado === 'solicitado' || c.estado === 'en_proceso',
        ).length;

        const totales = cartera(estudiantes);
        const inscritos = estudiantes.filter((e) => e.estado === 'en_inscripcion');
        const porMora = estudiantes.filter((e) => estadoCuenta(e).key === 'mora');
        const porPagar = estudiantes.filter((e) => {
          const k = estadoCuenta(e).key;
          if (filtroCuenta === 'mora') return k === 'mora';
          if (filtroCuenta === 'pendiente') return k === 'pendiente';
          if (filtroCuenta === 'al_dia') return k === 'al_dia';
          return true;
        });
        const enFiltro = (e) => {
          const t = busqueda.toLowerCase();
          if (!t) return true;
          return (
            e.nombre.toLowerCase().includes(t) ||
            e.documento.includes(busqueda) ||
            e.id.toLowerCase().includes(t)
          );
        };

        const exportarCartera = () => {
          const filas = porPagar.filter(enFiltro).map((e) => [
            e.id,
            e.documento,
            e.nombre,
            nombreProg(e.programaId),
            ESTADO_ESTUDIANTE[e.estado].label,
            saldo(e),
            pagosVencidos(e).reduce((a, p) => a + p.valor, 0),
            estadoCuenta(e).label,
          ]);
          descargarExcel(`Cartera_Admisiones_${new Date().toISOString().slice(0, 10)}`, {
            nombre: 'Cartera',
            columnas: [
              { titulo: 'Código', ancho: 12 },
              { titulo: 'Documento', ancho: 16 },
              { titulo: 'Estudiante', ancho: 32 },
              { titulo: 'Programa', ancho: 28 },
              { titulo: 'Estado', ancho: 14 },
              { titulo: 'Saldo', ancho: 16, moneda: true },
              { titulo: 'Vencido', ancho: 16, moneda: true },
              { titulo: 'Situación', ancho: 16 },
            ],
            filas,
          });
        };

        /* ---------- mutaciones ---------- */
        const setEstudiante = (id, cambios) => {
          setData((d) => ({
            ...d,
            estudiantes: d.estudiantes.map((e) => (e.id === id ? { ...e, ...cambios } : e)),
          }));
          actualizarEstudiante(id, cambios).catch(() => {}).finally(recargar);
        };

        const setAspirante = (id, cambios) => {
          setData((d) => ({
            ...d,
            admisiones: {
              ...d.admisiones,
              aspirantes: d.admisiones.aspirantes.map((a) => (a.id === id ? { ...a, ...cambios } : a)),
            },
          }));
          actualizarAspirante(id, cambios).catch(() => {}).finally(recargar);
        };

        const toggleDocumento = (doc) => {
          const vigente = !doc.vigente;
          setData((d) => ({
            ...d,
            admisiones: {
              ...d.admisiones,
              documentos: d.admisiones.documentos.map((x) =>
                x.id === doc.id ? { ...x, vigente } : x
              ),
            },
          }));
          alternarRequisito(doc.id, vigente).catch(() => {}).finally(recargar);
        };

        const completarInscripcion = (e) => {
          setEstudiante(e.id, { estado: 'activo' });
          setAviso({ ok: true, text: `Inscripción completada para ${e.nombre} (${e.id}). Ya aparece como activo.` });
        };

        const registrarPago = (estId, pagoId) => {
          const fecha_pago = '2026-09-26';
          const referencia = `PAG-20260926-${estId}`;
          setData((d) => ({
            ...d,
            estudiantes: d.estudiantes.map((e) =>
              e.id === estId
                ? {
                    ...e,
                    pagos: e.pagos.map((p) =>
                      p.id === pagoId ? { ...p, estado: 'pagado', fecha_pago, referencia } : p
                    ),
                  }
                : e
            ),
          }));
          registrarPagoApi(pagoId, { estado: 'pagado', referencia, fechaPago: fecha_pago })
            .catch(() => {})
            .finally(recargar);
        };

        const emitirCertificado = () => {
          const est = estudiantePorId(selEstudiante);
          const tipo = TIPOS_CERTIFICADO.find((t) => t.id === selTipo);
          if (!est || !tipo) {
            setAviso({ ok: false, text: 'Selecciona un estudiante y un tipo de certificado.' });
            return;
          }
          const chequeo = puedeEmitir(est, tipo.id);
          if (!chequeo.ok) {
            setAviso({ ok: false, text: chequeo.motivo });
            return;
          }
          /* La tabla se recarga con lo que devuelve la API en vez de inventar una fila
           aquí: el folio y el id los pone el servidor, y un id inventado haría
           fallar la descarga del PDF (la ruta busca por id). */
          emitirCertificadoApi(est.id, tipo.nombre)
            .then(() => recargar())
            .catch((err) =>
              setAviso({ ok: false, text: `No se pudo emitir: ${err.message}` }),
            );
          setAviso({ ok: true, text: `${tipo.nombre} emitido a ${est.nombre} (${est.id}).` });
        };

        /* Descarga desde el registro de Admisiones. El PDF lo arma el servidor
           con los datos del estudiante, así que lo que se entrega al alumno
           después es exactamente este documento. */
        const descargarDesdeRegistro = async (certificado) => {
          try {
            const nombre = await descargarCertificado(certificado.id);
            setAviso({ ok: true, text: `Se descargó ${nombre}.` });
          } catch (err) {
            setAviso({ ok: false, text: `No se pudo descargar el certificado: ${err.message}` });
          }
        };

        const filtrados = adm.aspirantes.filter((a) => {
          if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false;
          if (prog !== 'todos' && a.programaId !== Number(prog)) return false;
          const t = busqueda.toLowerCase();
          if (t && !a.nombre.toLowerCase().includes(t) && !a.documento.includes(busqueda)) return false;
          return true;
        });

        const puntajeFinal = (a) => {
          const udp = adm.configuracion.find((c) => c.id === 'cfg-udp');
          const total =
            (a.puntajeIcfes / 500) * 45 +
            (a.examen / 100) * 30 +
            (a.promedio / 5) * 15 +
            (udp?.peso ? (a.examen / 100) * udp.peso : 0);
          return Math.round(total);
        };

        /* =========================================================
           PESTAÑA: RESUMEN DE LA OPERACIÓN
           ========================================================= */
        if (tab === 'resumen') {
          const conAspirante = adm.aspirantes.filter((a) => a.estado === 'admitido').length;
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                <Kpi icon={<Icon name="users" size={16} />} bg="#e3f1ff" value={adm.aspirantes.length} label="Aspirantes del proceso" hint={`${adm.aspirantes.filter((a) => a.estado === 'en_proceso').length} en revisión`} onClick={() => setTab('aspirantes')} />
                <Kpi icon={<Icon name="graduacion" size={16} />} bg="#d8f0e5" value={conAspirante} label="Admitidos" color="#0a6e4b" hint={`${adm.periodos[0].cuposTotales} cupos ofertados`} onClick={() => setTab('registro')} />
                <Kpi icon={<Icon name="cuaderno" size={16} />} bg="#fbefd6" value={inscritos.length} label="Pendientes de matrícula" color="#99610e" hint="Proceso de inscripción abierto" onClick={() => setTab('registro')} />
                <Kpi icon={<Icon name="tarjeta-credito" size={16} />} bg="#ffe0e5" value={formatCurrency(totales.pendiente + totales.vencido)} label="Saldo por cobrar" color="#c1122c" hint={`${porMora.length} estudiantes en mora`} onClick={() => setTab('cuenta')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div style={card}>
                  <Encabezado titulo="Cola de trabajo del proceso" sub="Lo que hay que atender hoy" />
                  {[
                    { t: 'Revisar documentación de aspirantes', d: `${adm.aspirantes.filter((a) => a.documentos !== 'completo').length} expedientes incompletos`, icon: <Icon name="archivo" size={16} />, tab: 'documentos' },
                    { t: 'Resolver resultados en proceso', d: `${adm.aspirantes.filter((a) => a.estado === 'en_proceso').length} aspirantes sin decisión`, icon: <Icon name="balanza" size={16} />, tab: 'aspirantes' },
                    { t: 'Completar inscripción de admitidos', d: `${inscritos.length} estudiantes por matricular`, icon: <Icon name="graduacion" size={16} />, tab: 'registro' },
                    { t: 'Cobrar saldos vencidos', d: `${porMora.length} estudiantes en mora`, icon: <Icon name="tarjeta-credito" size={16} />, tab: 'cuenta' },
                    { t: 'Entregar certificados solicitados', d: `${pendientesCertificado} en trámite`, icon: <Icon name="certificado" size={16} />, tab: 'certificados' },
                  ].map((x) => (
                    <button
                      key={x.t}
                      type="button"
                      onClick={() => setTab(x.tab)}
                      style={{
                        display: 'flex', gap: 12, alignItems: 'center', width: '100%',
                        padding: '10px 0', background: 'none', border: 0,
                        borderBottom: '1px solid #f0eee9', cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: 20, flexShrink: 0 }}><Ico name={x.icon} size={20} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#211d17' }}>{x.t}</div>
                        <div style={{ fontSize: 12, color: '#9c988e' }}>{x.d}</div>
                      </div>
                      <span style={{ color: '#9c988e', fontSize: 14, flexShrink: 0 }}>›</span>
                    </button>
                  ))}
                </div>

                <div style={card}>
                  <Encabezado titulo="Próximas fechas del proceso" sub={adm.periodos[0].nombre} />
                  {[
                    ['Cierre de inscripciones', adm.periodos[0].fechaCierre],
                    ['Publicación de resultados', adm.periodos[0].fechaResultados],
                    ['Inscripción de admitidos', adm.periodos[0].fechaInscripcion],
                    ['Apertura del siguiente proceso', adm.periodos[1].fechaApertura],
                  ].map(([t, f]) => (
                    <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f0eee9', fontSize: 13 }}>
                      <span style={{ color: '#4e4a43' }}>{t}</span>
                      <strong>{formatDate(f)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: ASPIRANTES
           ========================================================= */
        if (tab === 'aspirantes') {
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Kpi icon={<Icon name="users" size={16} />} bg="#e3f1ff" value={adm.aspirantes.length} label="Total aspirantes" />
                <Kpi icon={<Icon name="graduacion" size={16} />} bg="#d8f0e5" value={adm.aspirantes.filter((a) => a.estado === 'admitido').length} label="Admitidos" color="#0a6e4b" />
                <Kpi icon={<Icon name="reloj" size={20} />} bg="#fbefd6" value={adm.aspirantes.filter((a) => a.estado === 'en_proceso').length} label="En proceso" color="#99610e" />
                <Kpi icon={<Icon name="archivo" size={16} />} bg="#ffe0e5" value={adm.aspirantes.filter((a) => a.documentos !== 'completo').length} label="Docs. incompletos" color="#c1122c" />
              </div>

              <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <input placeholder="Buscar por nombre o documento…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...input, minWidth: 240 }} />
                <select value={prog} onChange={(e) => setProg(e.target.value)} style={input}>
                  <option value="todos">Todos los programas</option>
                  {programas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={input}>
                  <option value="todos">Todos los estados</option>
                  <option value="admitido">Admitidos</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="rechazado">Rechazados</option>
                </select>
                <span style={{ fontSize: 12, color: '#9c988e' }}>{filtrados.length} resultados</span>
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
                        <th style={th}>Decisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((a) => {
                        const est = estudiantes.find((e) => e.admisioId === a.id);
                        return (
                          <tr key={a.id}>
                            <td style={td}>
                              <strong>{a.nombre}</strong><br />
                              <span style={{ fontSize: 11, color: '#9c988e' }}>{a.documento} · {a.id}</span>
                            </td>
                            <td style={td}>{nombreProg(a.programaId)}</td>
                            <td style={td}>{a.puntajeIcfes}</td>
                            <td style={td}>{a.examen}</td>
                            <td style={td}>{a.promedio.toFixed(2)}</td>
                            <td style={td}><strong>{puntajeFinal(a)}</strong></td>
                            <td style={td}><Badge tone={DOC_TONE[a.documentos]}>{a.documentos}</Badge></td>
                            <td style={td}>
                              <Badge tone={ESTADO_ASP[a.estado].tone}>{ESTADO_ASP[a.estado].label}</Badge>
                              {est && <div style={{ fontSize: 11, color: '#0a6e4b', marginTop: 4 }}>Matriculado {est.id}</div>}
                            </td>
                            <td style={td}>
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setAspirante(a.id, { estado: 'admitido' })}>Admitir</button>
                                <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setAspirante(a.id, { estado: 'en_proceso' })}>Proceso</button>
                                <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setAspirante(a.id, { estado: 'rechazado' })}>Rechazar</button>
                                <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setAspirante(a.id, { documentos: a.documentos === 'completo' ? 'pendiente' : 'completo' })}>
                                  {a.documentos === 'completo' ? <><Icon name="reloj" size={14} /> Docs</> : <>Docs <Icon name="check" size={14} /></>}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filtrados.length === 0 && <Vacio>Sin resultados para el filtro aplicado.</Vacio>}
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: PROCESOS
           ========================================================= */
        if (tab === 'procesos') {
          const activo = adm.periodos.find((p) => p.estado === 'inscripciones');
          const inscritosProceso = inscritos.length;
          const sumaPesos = adm.configuracion.reduce((a, c) => a + c.peso, 0);
          return (
            <div>
              {activo && (
                <div style={{ ...card, marginBottom: 16, background: '#eef7ff', borderColor: '#cfe8ff' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#00116f' }}>Proceso vigente: {activo.nombre}</div>
                  <div style={{ fontSize: 12, color: '#04295f', marginTop: 4 }}>
                    Inscripciones abiertas del {formatDate(activo.fechaApertura)} al {formatDate(activo.fechaCierre)}.
                    Resultados el {formatDate(activo.fechaResultados)} · Inscripción de admitidos desde el {formatDate(activo.fechaInscripcion)}.
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#04295f', marginBottom: 4 }}>
                      <span>Ocupación de cupos del proceso</span>
                      <strong>{inscritosProceso} inscritos</strong>
                    </div>
                    <div style={{ height: 8, background: '#e3f1ff', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (inscritosProceso / activo.cuposTotales) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#00116f,#0a84ff)' }} />
                    </div>
                  </div>
                </div>
              )}

              <div style={card}>
                <Encabezado titulo="Criterios de ponderación" sub={`Suma de pesos: ${sumaPesos}% ${sumaPesos === 100 ? '— correcto' : '— debe ser 100%'}`} />
                {adm.configuracion.map((c) => (
                  <div key={c.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>
                        <strong>{c.nombre}</strong>{' '}
                        <Badge tone={c.obligatorio ? 'blue' : 'slate'}>{c.obligatorio ? 'Obligatorio' : 'Opcional'}</Badge>
                      </span>
                      <span style={{ fontWeight: 700 }}>{c.peso}%</span>
                    </div>
                    <div style={{ height: 8, background: '#f0eee9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${c.peso}%`, height: '100%', background: 'linear-gradient(90deg,#00116f,#0a84ff)' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9c988e', marginTop: 3 }}>{c.descripcion}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, marginTop: 16, overflowX: 'auto' }}>
                <Encabezado titulo="Convocatorias" sub="Calendario de los procesos de admisión" />
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

        /* =========================================================
           PESTAÑA: DOCUMENTOS
           ========================================================= */
        if (tab === 'documentos') {
          const incompletos = adm.aspirantes.filter((a) => a.documentos !== 'completo');
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Kpi icon="archivo" bg="#e3f1ff" value={adm.documentos.length} label="Documentos exigidos" />
                <Kpi icon={<Icon name="check" size={16} />} bg="#d8f0e5" value={adm.documentos.filter((d) => d.vigente).length} label="Vigentes" color="#0a6e4b" />
                <Kpi icon={<Icon name="alerta" size={14} />} bg="#fbefd6" value={adm.documentos.filter((d) => !d.vigente).length} label="Por actualizar" color="#99610e" />
                <Kpi icon={<Icon name="archivo" size={16} />} bg="#ffe0e5" value={incompletos.length} label="Expedientes incompletos" color="#c1122c" />
              </div>

              <div style={card}>
                <Encabezado titulo="Documentación requerida para admitir" sub="Los documentos no vigentes aparecen marcados para actualización." />
                {adm.documentos.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f0eee9' }}>
                    <span style={{ fontSize: 13 }}>
                      {d.nombre} <Badge tone={d.obligatorio ? 'blue' : 'slate'}>{d.obligatorio ? 'Obligatorio' : 'Opcional'}</Badge>
                    </span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <Badge tone={d.vigente ? 'green' : 'red'}>{d.vigente ? 'Vigente' : 'Actualizar'}</Badge>
                      <button
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => toggleDocumento(d)}
                      >
                        {d.vigente ? 'Marcar desactualizado' : 'Activar'}
                      </button>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ ...card, marginTop: 16 }}>
                <Encabezado
                  titulo="Revisión documental por aspirante"
                  sub={`${incompletos.length} de ${adm.aspirantes.length} expedientes con documentos pendientes`}
                />
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
                      {incompletos.map((a) => (
                        <tr key={a.id}>
                          <td style={td}>
                            <strong>{a.nombre}</strong><br />
                            <span style={{ fontSize: 11, color: '#9c988e' }}>{a.documento}</span>
                          </td>
                          <td style={td}>{nombreProg(a.programaId)}</td>
                          <td style={td}><Badge tone={DOC_TONE[a.documentos]}>{a.documentos}</Badge></td>
                          <td style={td}>
                            <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setAspirante(a.id, { documentos: 'completo' })}>
                              Marcar completo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {incompletos.length === 0 && <Vacio>Todos los aspirantes tienen la documentación completa.</Vacio>}
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: REGISTRO (INSCRIPCIÓN DE ADMITIDOS)
           ========================================================= */
        if (tab === 'registro') {
          const lista = inscritos;
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Kpi icon={<Icon name="cuaderno" size={16} />} bg="#fbefd6" value={inscritos.length} label="Por matricular" color="#99610e" />
                <Kpi icon={<Icon name="check" size={16} />} bg="#d8f0e5" value={estudiantes.filter((e) => e.estado === 'activo').length} label="Con matrícula activa" color="#0a6e4b" />
                <Kpi icon={<Icon name="libro" size={16} />} bg="#e3f1ff" value={estudiantes.length} label="Total en el registro" />
                <Kpi icon={<Icon name="graduacion" size={16} />} bg="#efe9fb" value={estudiantes.filter((e) => e.estado === 'graduado').length} label="Graduados" color="#5a37ad" />
              </div>

              <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <input placeholder="Buscar por nombre, documento o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...input, minWidth: 280 }} />
                <span style={{ fontSize: 12, color: '#9c988e' }}>{lista.filter(enFiltro).length} de {lista.length} admitidos por matricular</span>
              </div>

              {aviso && (
                <div style={{ ...card, marginBottom: 14, background: aviso.ok ? '#e9f7f1' : '#fff1f3', borderColor: aviso.ok ? '#b6e3cf' : '#f4c2ca', padding: 12 }}>
                  <span style={{ fontSize: 13, color: aviso.ok ? '#0a6e4b' : '#c1122c' }}>{aviso.text}</span>
                </div>
              )}

              <div style={card}>
                <Encabezado
                  titulo="Admitidos pendientes de inscripción"
                  sub="La inscripción se cierra cuando el estudiante queda activo y con la matrícula registrada."
                />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Código</th>
                        <th style={th}>Estudiante</th>
                        <th style={th}>Programa</th>
                        <th style={th}>Sem.</th>
                        <th style={th}>Jornada</th>
                        <th style={th}>Documentos</th>
                        <th style={th}>Cuenta</th>
                        <th style={th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.filter(enFiltro).map((e) => {
                        const cuenta = estadoCuenta(e);
                        return (
                          <tr key={e.id}>
                            <td style={td}><code style={{ fontSize: 12, color: '#4e4a43' }}>{e.id}</code></td>
                            <td style={td}><strong>{e.nombre}</strong><br /><span style={{ fontSize: 11, color: '#9c988e' }}>{e.documento}</span></td>
                            <td style={td}>{nombreProg(e.programaId)}</td>
                            <td style={td}>{e.semestre}</td>
                            <td style={td}>{e.jornada}</td>
                            <td style={td}><Badge tone={DOC_TONE[e.documentos]}>{e.documentos}</Badge></td>
                            <td style={td}><Badge tone={cuenta.tone}>{cuenta.label}</Badge></td>
                            <td style={td}>
                              <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => completarInscripcion(e)}>
                                Completar inscripción
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {lista.filter(enFiltro).length === 0 && (
                  <Vacio>No hay admitidos pendientes de inscripción con ese criterio.</Vacio>
                )}
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: EXPEDIENTES
           ========================================================= */
        if (tab === 'expedientes') {
          const est = estudiantePorId(selEstudiante) || estudiantes[0];
          const cuenta = est ? estadoCuenta(est) : null;
          const certificadosEst = data.certificadosEmitidos.filter((c) => c.estudianteId === est?.id);
          return (
            <div>
              <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <input placeholder="Buscar estudiante…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...input, minWidth: 240 }} />
                <select value={est?.id || ''} onChange={(e) => setSelEstudiante(e.target.value)} style={{ ...input, minWidth: 300 }}>
                  {estudiantes.filter(enFiltro).map((e) => (
                    <option key={e.id} value={e.id}>{e.id} — {e.nombre}</option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: '#9c988e' }}>{estudiantes.filter(enFiltro).length} expedientes</span>
              </div>

              {!est ? (
                <div style={card}><Vacio>No hay estudiantes que coincidan con la búsqueda.</Vacio></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  <div style={card}>
                    <Encabezado titulo="Datos personales" sub={`Expediente ${est.id}`} />
                    {[
                      ['Nombre completo', est.nombre],
                      ['Documento', est.documento],
                      ['Correo institucional', est.correo],
                      ['Teléfono', est.telefono],
                      ['Dirección', est.direccion],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0eee9', fontSize: 13 }}>
                        <span style={{ color: '#6f6b62' }}>{k}</span>
                        <strong style={{ textAlign: 'right' }}>{v}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={card}>
                    <Encabezado titulo="Situación académica" />
                    {[
                      ['Programa', nombreProg(est.programaId)],
                      ['Semestre', `${est.semestre} de ${programas.find((p) => p.id === est.programaId)?.semestres || '—'}`],
                      ['Jornada', est.jornada],
                      ['Promedio acumulado', est.promedio.toFixed(2)],
                      ['Fecha de ingreso', formatDate(est.fechaIngreso)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0eee9', fontSize: 13 }}>
                        <span style={{ color: '#6f6b62' }}>{k}</span>
                        <strong style={{ textAlign: 'right' }}>{v}</strong>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0', fontSize: 13 }}>
                      <span style={{ color: '#6f6b62' }}>Estado</span>
                      <Badge tone={ESTADO_ESTUDIANTE[est.estado].tone}>{ESTADO_ESTUDIANTE[est.estado].label}</Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 0', fontSize: 13 }}>
                      <span style={{ color: '#6f6b62' }}>Expediente documental</span>
                      <Badge tone={DOC_TONE[est.documentos]}>{est.documentos}</Badge>
                    </div>
                  </div>

                  <div style={card}>
                    <Encabezado titulo="Estado de cuenta" sub={cuenta.label} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div style={{ background: '#f7f6f3', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#6f6b62', fontWeight: 700 }}>SALDO</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: saldo(est) > 0 ? '#c1122c' : '#0a6e4b' }}>{formatCurrency(saldo(est))}</div>
                      </div>
                      <div style={{ background: '#f7f6f3', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#6f6b62', fontWeight: 700 }}>PAGADO</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: '#0a6e4b' }}>
                          {formatCurrency(est.pagos.filter((p) => p.estado === 'pagado').reduce((a, p) => a + p.valor, 0))}
                        </div>
                      </div>
                    </div>
                    {est.pagos.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid #f0eee9', fontSize: 12.5 }}>
                        <span style={{ color: '#4e4a43' }}>{p.concepto}</span>
                        <Badge tone={PAGO_TONE[p.estado]}>{PAGO_LABEL[p.estado]}</Badge>
                      </div>
                    ))}
                  </div>

                  <div style={card}>
                    <Encabezado titulo="Certificados emitidos" sub={`${certificadosEst.length} registros`} />
                    {certificadosEst.length === 0 && <Vacio>Este estudiante no tiene certificados emitidos.</Vacio>}
                    {certificadosEst.map((c) => {
                      const est2 = estadoCertificado(c);
                      return (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid #f0eee9', fontSize: 13 }}>
                          <span style={{ color: '#211d17' }}>{c.tipo}</span>
                          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ color: '#9c988e', fontSize: 11 }}>{formatDate(c.fecha)}</span>
                            <Badge tone={est2.tone}>{est2.label}</Badge>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: ESTADO DE CUENTA
           ========================================================= */
        if (tab === 'cuenta') {
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Kpi icon={<Icon name="check" size={16} />} bg="#d8f0e5" value={formatCurrency(totales.pagado)} label="Recaudado" color="#0a6e4b" />
                <Kpi icon={<Icon name="reloj" size={20} />} bg="#fbefd6" value={formatCurrency(totales.pendiente)} label="Por cobrar" color="#99610e" />
                <Kpi icon={<Icon name="alerta" size={14} />} bg="#ffe0e5" value={formatCurrency(totales.vencido)} label="Cartera en mora" color="#c1122c" hint={`${porMora.length} estudiantes`} />
                <Kpi icon="" bg="#e3f1ff" value={totales.alDia} label="Estudiantes en paz y salvo" />
              </div>

              <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <input placeholder="Buscar por nombre, documento o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...input, minWidth: 260 }} />
                <select value={filtroCuenta} onChange={(e) => setFiltroCuenta(e.target.value)} style={input}>
                  <option value="todos">Toda la cartera</option>
                  <option value="mora">Solo en mora</option>
                  <option value="pendiente">Con saldo pendiente</option>
                  <option value="al_dia">Paz y salvo</option>
                </select>
                <span style={{ fontSize: 12, color: '#9c988e' }}>{porPagar.filter(enFiltro).length} estudiantes</span>
                <button
                  className="btn"
                  style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}
                  onClick={exportarCartera}
                  disabled={porPagar.filter(enFiltro).length === 0}
                >
                  <Ico name="descarga" size={14} /> Exportar a Excel
                </button>
              </div>

              <div style={card}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Código</th>
                        <th style={th}>Estudiante</th>
                        <th style={th}>Programa</th>
                        <th style={th}>Estado</th>
                        <th style={th}>Saldo</th>
                        <th style={th}>Vencido</th>
                        <th style={th}>Situación</th>
                        <th style={th}>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porPagar.filter(enFiltro).map((e) => {
                        const cuenta = estadoCuenta(e);
                        const vencidos = pagosVencidos(e);
                        const abiertos = e.pagos.filter((p) => p.estado !== 'pagado');
                        return (
                          <tr key={e.id}>
                            <td style={td}><code style={{ fontSize: 12, color: '#4e4a43' }}>{e.id}</code></td>
                            <td style={td}><strong>{e.nombre}</strong><br /><span style={{ fontSize: 11, color: '#9c988e' }}>{e.documento}</span></td>
                            <td style={td}>{nombreProg(e.programaId)}</td>
                            <td style={td}><Badge tone={ESTADO_ESTUDIANTE[e.estado].tone}>{ESTADO_ESTUDIANTE[e.estado].label}</Badge></td>
                            <td style={td}><strong style={{ color: saldo(e) > 0 ? '#c1122c' : '#0a6e4b' }}>{formatCurrency(saldo(e))}</strong></td>
                            <td style={td}>{formatCurrency(vencidos.reduce((a, p) => a + p.valor, 0))}</td>
                            <td style={td}><Badge tone={cuenta.tone}>{cuenta.label}</Badge></td>
                            <td style={td}>
                              {abiertos.length === 0 ? (
                                <span style={{ fontSize: 11, color: '#9c988e' }}>Sin saldos abiertos</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {abiertos.map((p) => (
                                    <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
                                      <span style={{ color: '#4e4a43' }}>{p.concepto}</span>
                                      <span style={{ color: '#9c988e' }}>{formatCurrency(p.valor)}</span>
                                      <button
                                        className="btn"
                                        style={{ padding: '2px 6px', fontSize: 10 }}
                                        onClick={() => registrarPago(e.id, p.id)}
                                      >
                                        Registrar pago
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {porPagar.filter(enFiltro).length === 0 && <Vacio>No hay estudiantes con ese criterio de cartera.</Vacio>}
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: CERTIFICADOS
           ========================================================= */
        if (tab === 'certificados') {
          const estSel = estudiantePorId(selEstudiante);
          const chequeo = estSel ? puedeEmitir(estSel, selTipo) : null;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              <div style={card}>
                <Encabezado titulo="Emitir certificado" sub="Los certificados que exigen paz y salvo se bloquean si hay saldo." />

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4e4a43', marginBottom: 5 }}>Estudiante</label>
                <select value={selEstudiante} onChange={(e) => setSelEstudiante(e.target.value)} style={{ ...input, width: '100%', marginBottom: 14 }}>
                  <option value="">Selecciona un estudiante…</option>
                  {estudiantes.map((e) => (
                    <option key={e.id} value={e.id}>{e.id} — {e.nombre} ({estadoCuenta(e).label})</option>
                  ))}
                </select>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4e4a43', marginBottom: 5 }}>Tipo de certificado</label>
                <select value={selTipo} onChange={(e) => setSelTipo(e.target.value)} style={{ ...input, width: '100%', marginBottom: 14 }}>
                  {TIPOS_CERTIFICADO.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>

                {estSel && (
                  <div style={{ background: '#f7f6f3', border: '1px solid #e5e2da', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#211d17' }}>{estSel.nombre}</div>
                    <div style={{ fontSize: 12, color: '#6f6b62', marginBottom: 8 }}>
                      {nombreProg(estSel.programaId)} · Semestre {estSel.semestre} · Promedio {estSel.promedio.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone={ESTADO_ESTUDIANTE[estSel.estado].tone}>{ESTADO_ESTUDIANTE[estSel.estado].label}</Badge>
                      <Badge tone={estadoCuenta(estSel).tone}>{estadoCuenta(estSel).label}</Badge>
                      <Badge tone={DOC_TONE[estSel.documentos]}>Docs {estSel.documentos}</Badge>
                    </div>
                  </div>
                )}

                {chequeo && !chequeo.ok && (
                  <div style={{ background: '#fff1f3', border: '1px solid #f4c2ca', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12.5, color: '#c1122c' }}>
                    <Icon name="bloqueado" size={14} /> {chequeo.motivo}
                  </div>
                )}
                {chequeo && chequeo.ok && (
                  <div style={{ background: '#e9f7f1', border: '1px solid #b6e3cf', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12.5, color: '#0a6e4b' }}>
                    <Icon name="check" size={14} /> Listo para emitir.
                  </div>
                )}

                {aviso && (
                  <div style={{ background: aviso.ok ? '#e9f7f1' : '#fff1f3', border: '1px solid ' + (aviso.ok ? '#b6e3cf' : '#f4c2ca'), borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12.5, color: aviso.ok ? '#0a6e4b' : '#c1122c' }}>
                    {aviso.text}
                  </div>
                )}

                <button className="btn b-primary" onClick={emitirCertificado} disabled={!estSel || (chequeo && !chequeo.ok)} style={{ opacity: !estSel || (chequeo && !chequeo.ok) ? 0.5 : 1 }}>
                  <Icon name="certificado" size={16} /> Emitir certificado
                </button>
              </div>

              <div style={card}>
                <Encabezado titulo="Certificados emitidos" sub={`${data.certificadosEmitidos.length} registros`} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Radicado</th>
                        <th style={th}>Estudiante</th>
                        <th style={th}>Tipo</th>
                        <th style={th}>Emisión</th>
                        <th style={th}>Estado</th>
                        <th style={th}>PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.certificadosEmitidos.map((c) => {
                        const e = estudiantePorId(c.estudianteId);
                        const s = estadoCertificado(c);
                        /* El PDF solo existe si el certificado ya se emitió: un
                           trámite en curso no tiene documento que entregar. */
                        const emitido = certificadoDescargable(c);
                        return (
                          <tr key={c.id}>
                            <td style={td}><code style={{ fontSize: 11.5, color: '#4e4a43' }}>{c.codigo || c.id}</code></td>
                            <td style={td}>
                              <strong>{e?.nombre || c.estudianteId}</strong><br />
                              <span style={{ fontSize: 11, color: '#9c988e' }}>{c.estudianteId}</span>
                            </td>
                            <td style={td}>
                              {c.tipo}
                              {c.solicitado && (
                                <>
                                  <br />
                                  <span style={{ fontSize: 11, color: '#9c988e' }}>
                                    Solicitado el {formatDate(c.solicitado)}
                                  </span>
                                </>
                              )}
                            </td>
                            <td style={td}>{formatDate(c.fecha)}</td>
                            <td style={td}><Badge tone={s.tone}>{s.label}</Badge></td>
                            <td style={td}>
                              {emitido ? (
                                <button
                                  type="button"
                                  className="btn b-secondary b-sm"
                                  data-testid={`descargar-cert-${c.id}`}
                                  onClick={() => descargarDesdeRegistro(c)}
                                >
                                  <Icon name="descargar" size={16} /> Descargar
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: '#9c988e' }}>Sin emitir</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {data.certificadosEmitidos.length === 0 && <Vacio>Aún no se han emitido certificados.</Vacio>}
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: REPORTES
           ========================================================= */
        if (tab === 'reportes') {
          const total = adm.aspirantes.length;
          const porEstado = (e) => adm.aspirantes.filter((a) => a.estado === e).length;
          const admitted = porEstado('admitido');
          const conversion = total ? Math.round((admitted / total) * 100) : 0;
          const porPrograma = programas.map((p) => {
            const asps = adm.aspirantes.filter((a) => a.programaId === p.id);
            return {
              prog: p,
              total: asps.length,
              adm: asps.filter((a) => a.estado === 'admitido').length,
            };
          }).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                <Kpi icon={<Icon name="grafica-barras" size={16} />} bg="#e3f1ff" value={`${conversion}%`} label="Tasa de admisión" />
                <Kpi icon={<Icon name="objetivo" size={16} />} bg="#d8f0e5" value={admitted} label="Admitidos" color="#0a6e4b" />
                <Kpi icon={<Icon name="tendencia-abajo" size={16} />} bg="#ffe0e5" value={porEstado('rechazado')} label="No admitidos" color="#c1122c" />
                <Kpi icon={<Icon name="billete" size={16} />} bg="#fbefd6" value={formatCurrency(totales.pagado + totales.pendiente + totales.vencido)} label="Cartera total" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <div style={card}>
                  <Encabezado titulo="Embudo de admisión" sub={`Proceso ${adm.periodos[0].nombre}`} />
                  {[
                    { l: 'Inscritos', v: total, c: '#0a84ff' },
                    { l: 'Con decisión de admisión', v: admitted + porEstado('rechazado'), c: '#8a5cf0' },
                    { l: 'Admitidos', v: admitted, c: '#17a06d' },
                    { l: 'Con matrícula registrada', v: estudiantes.filter((e) => e.estado === 'activo').length, c: '#0e7c86' },
                  ].map((x) => (
                    <div key={x.l} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: '#4e4a43' }}>{x.l}</span>
                        <strong>{x.v}</strong>
                      </div>
                      <div style={{ height: 8, background: '#f0eee9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${total ? (x.v / total) * 100 : 0}%`, height: '100%', background: x.c }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={card}>
                  <Encabezado titulo="Aspirantes por programa" />
                  {porPrograma.map((x) => (
                    <div key={x.prog.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, gap: 10 }}>
                        <span style={{ color: '#4e4a43' }}>{x.prog.nombre}</span>
                        <strong style={{ whiteSpace: 'nowrap' }}>{x.adm}/{x.total} admitidos</strong>
                      </div>
                      <div style={{ height: 8, background: '#f0eee9', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${(x.adm / x.total) * 100}%`, background: '#17a06d' }} />
                        <div style={{ width: `${((x.total - x.adm) / x.total) * 100}%`, background: '#f4c2ca' }} />
                      </div>
                    </div>
                  ))}
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
