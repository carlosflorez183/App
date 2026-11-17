import React, { useState } from 'react';
import Icon, { Ico } from '../components/Icon';
import ModuleLayout from '../components/ModuleLayout';
import { EstadoVacio } from '../components/Estado';
import Select from '../components/Select';
import Avatar from '../components/Avatar';
import TarjetasRegistro from '../components/TarjetasRegistro';
import {
  actualizarAspirante,
  actualizarEstudiante,
  alternarRequisito,
  crearCuentaEstudianteAdmisiones,
  descargarCertificado,
  descargarDocumentoIngresoAdmisiones,
  documentosEstudianteAdmisiones,
  emitirCertificado as emitirCertificadoApi,
  matricularAspirante as matricularAspiranteApi,
  registrarPago as registrarPagoApi,
  revisarDocumentoIngreso,
  validarDocumentosEstudiante,
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
  { key: 'estudiantes', label: 'Estudiantes', icon: 'graduacion' },
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

/* Helper: iniciales de un nombre para avatar chips */
const initials = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* Helper: color del avatar según hash simple del nombre */
const avColors = ['av-blue','av-green','av-purple','av-red','av-amber','av-teal','av-indigo','av-orange'];
const avColor = (str) => avColors[(str || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % avColors.length];

/* FinBadge — badge moderno de financiación */
const FinBadge = ({ financiacion, cupoBrilla, tieneCajaCompensacion, observacion }) => {
  const esBrilla  = cupoBrilla || /brilla/i.test(financiacion || '');
  const esIcetex  = /icetex/i.test(financiacion || '');
  const esCaja    = tieneCajaCompensacion || /caja/i.test(financiacion || '');
  const esBeca    = /beca|convenio/i.test(financiacion || '');
  const esPropio  = !esBrilla && !esIcetex && !esCaja && !esBeca && financiacion && !/sin|no/i.test(financiacion);
  const sinDef    = !esBrilla && !esIcetex && !esCaja && !esBeca && !esPropio;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      {esBrilla  && <span className="fin-badge fin-brilla">🔥 Brilla</span>}
      {esIcetex  && <span className="fin-badge fin-icetex">🎓 ICETEX</span>}
      {esCaja    && <span className="fin-badge fin-caja">🏢 Caja Comp.</span>}
      {esBeca    && <span className="fin-badge fin-beca">🏅 Beca/Convenio</span>}
      {esPropio  && <span className="fin-badge fin-propio">💵 {financiacion}</span>}
      {sinDef    && <span className="fin-badge fin-empty">⚠️ Sin definir</span>}
      {observacion && (
        <span style={{ fontSize: 10, color: '#6f6b62', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={observacion}>
          💬 {observacion}
        </span>
      )}
    </div>
  );
};

const TONES = {
  slate: ['#f0eee9', '#4e4a43'],
  green: ['#d8f0e5', '#0a6e4b'],
  amber: ['#fbefd6', '#99610e'],
  red: ['#ffe0e5', '#c1122c'],
  blue: ['#e3f1ff', '#06468c'],
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

const situacionMatricula = (e) => {
  if (e.estado === 'en_inscripcion' && e.documentos !== 'completo') {
    return { key: 'bloqueado', label: 'Bloqueado por documentos', tone: 'red', motivo: 'Falta validar el expediente de ingreso.' };
  }
  if (e.estado === 'retirado') return { key: 'retirado', label: 'Retirado', tone: 'slate', motivo: 'El estudiante se retiró.' };
  if (e.estado === 'graduado') return { key: 'graduado', label: 'Graduado', tone: 'purple', motivo: 'El estudiante ya egresó.' };
  if (!e.usuario) return { key: 'sin_cuenta', label: 'Sin cuenta de campus', tone: 'amber', motivo: 'No tiene credenciales de acceso.' };
  if (e.usuarioActivo === false) return { key: 'inactivo', label: 'Cuenta inactiva', tone: 'red', motivo: 'La cuenta está deshabilitada.' };
  if ((e.pagos || []).some((p) => p.estado === 'vencido')) return { key: 'mora', label: 'En mora', tone: 'amber', motivo: 'Tiene pagos vencidos.' };
  return { key: 'habilitado', label: 'Habilitado', tone: 'green', motivo: 'Sin bloqueos para matricular.' };
};

const SITUACION_TONE = { bloqueado: 'red', sin_cuenta: 'amber', inactivo: 'red', mora: 'amber', habilitado: 'green', retirado: 'slate', graduado: 'purple' };

export default function Admisiones() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [prog, setProg] = useState('todos');
  const [filtroCuenta, setFiltroCuenta] = useState('todos');
  const [selEstudiante, setSelEstudiante] = useState('');
  const [selTipo, setSelTipo] = useState('estudios');
  const [filtroRegistro, setFiltroRegistro] = useState('inscritos');
  const [aviso, setAviso] = useState(null);
  /* Vista jerárquica de estudiantes: facultad → programa → semestre. */
  const [estFacultad, setEstFacultad] = useState('todas');
  const [estPrograma, setEstPrograma] = useState('todos');
  const [estSemestre, setEstSemestre] = useState('todos');
  const [estSituacion, setEstSituacion] = useState('todas');
  const [estFinanciacion, setEstFinanciacion] = useState('todas');
  const [modalFinanciero, setModalFinanciero] = useState(null); // { id, nombre, financiacion, cupoBrilla, tieneCajaCompensacion, observacionFinanciera }
  const [guardandoFinanciero, setGuardandoFinanciero] = useState(false);

  const [expediente, setExpediente] = useState(null);   // { estudiante, archivos }
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const [obsDraft, setObsDraft] = useState({});         // archivoId -> texto

  return (
    <ModuleLayout
      title="Admisiones y Registro"
      subtitle="Admisión, inscripción, expedientes, cartera y certificaciones"
      tabs={TABS}
      titleFromTab
      colapsarSidebar
      rutaModulo="/admisiones"
    >
      {({ tab, setTab, data, setData, recargar }) => {
        const adm = data.admisiones;
        const estudiantes = data.estudiantes;
        const programas = data.matricula.programas;
        const nombreProg = (id) => programas.find((p) => p.id === id)?.nombre || '—';
        const estudiantePorId = (id) => estudiantes.find((e) => e.id === id);
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
        const setAspirante = (id, cambios) => {
          setData((d) => ({
            ...d,
            admisiones: {
              ...d.admisiones,
              aspirantes: d.admisiones.aspirantes.map((a) => (a.id === id ? { ...a, ...cambios } : a)),
            },
          }));
          actualizarAspirante(id, cambios).catch(() => { }).finally(recargar);
        };

        /* ---------- revisión de documentos subidos por los inscritos ---------- */
        const abrirExpediente = async (est) => {
          setCargandoExpediente(true);
          setObsDraft({});
          try {
            setExpediente(await documentosEstudianteAdmisiones(est.id));
          } catch (err) {
            setAviso({ ok: false, text: `No se pudo abrir el expediente: ${err.message}` });
          } finally {
            setCargandoExpediente(false);
          }
        };

        const refrescarExpediente = async (id) => {
          try {
            setExpediente(await documentosEstudianteAdmisiones(id));
          } catch { /* la lista anterior sigue siendo útil */ }
        };

        const revisarArchivo = async (archivo, estado) => {
          const observacion = obsDraft[archivo.id] ?? archivo.observacion;
          try {
            await revisarDocumentoIngreso(archivo.id, { estado, observacion });
            await refrescarExpediente(expediente.estudiante.id);
            setAviso({
              ok: true,
              text: estado === 'aprobado'
                ? `${archivo.nombre} aprobado. El estudiante lo verá en su portal.`
                : `${archivo.nombre} rechazado: el estudiante verá tu observación y podrá subirlo de nuevo.`,
            });
          } catch (err) {
            setAviso({ ok: false, text: err.message });
          }
        };

        const validarExpediente = async (completo) => {
          try {
            const res = await validarDocumentosEstudiante(expediente.estudiante.id, completo);
            await refrescarExpediente(expediente.estudiante.id);
            recargar();
            setAviso({ ok: true, text: res.mensaje });
          } catch (err) {
            setAviso({ ok: false, text: err.message });
          }
        };

        const matricular = async (a) => {
          try {
            const res = await matricularAspiranteApi(a.id);
            const c = res?.credenciales;
            alert(
              `${res?.mensaje || 'Aspirante matriculado'}.\n\n` +
              (c ? `Usuario: ${c.usuario}\nContraseña temporal: ${c.password}\n\nDeberá cambiarla al primer ingreso.` : '')
            );
          } catch (err) {
            alert(`No se pudo matricular: ${err.message}`);
          } finally {
            recargar();
          }
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
          alternarRequisito(doc.id, vigente).catch(() => { }).finally(recargar);
        };

        const completarInscripcion = async (est) => {
          try {
            const res = await actualizarEstudiante(est.id, { estado: 'activo' });
            const c = res?.credenciales;
            setAviso({
              ok: true,
              text: c
                ? `Inscripción completada para ${est.nombre} (${est.id}). Cuenta creada — usuario: ${c.usuario} · contraseña temporal: ${c.password} (debe cambiarla al primer ingreso).`
                : `Inscripción completada para ${est.nombre} (${est.id}). Ya aparece como activo.`,
            });
          } catch (err) {
            setAviso({ ok: false, text: `No se pudo completar la inscripción: ${err.message}` });
          } finally {
            recargar();
          }
        };

        const crearCuentaDeEstudiante = async (est) => {
          try {
            const res = await crearCuentaEstudianteAdmisiones(est.id);
            const c = res?.credenciales;
            setAviso({
              ok: true,
              text: c
                ? `Cuenta creada para ${est.nombre} (${est.id}). Usuario: ${c.usuario} · Contraseña temporal: ${c.password} (debe cambiarla al primer ingreso).`
                : `Cuenta creada para ${est.nombre} (${est.id}).`,
            });
            alert(
              `${res?.mensaje || `Cuenta creada para ${est.nombre}`}.\n\n` +
              (c ? `Usuario: ${c.usuario}\nContraseña temporal: ${c.password}\n\nDeberá cambiarla al primer ingreso.` : '')
            );
          } catch (err) {
            setAviso({ ok: false, text: `No se pudo crear la cuenta: ${err.message}` });
          } finally {
            recargar();
          }
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
            .catch(() => { })
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

          emitirCertificadoApi(est.id, tipo.nombre)
            .then(() => recargar())
            .catch((err) =>
              setAviso({ ok: false, text: `No se pudo emitir: ${err.message}` }),
            );
          setAviso({ ok: true, text: `${tipo.nombre} emitido a ${est.nombre} (${est.id}).` });
        };

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
                <Select
                  label="Programa"
                  value={prog}
                  onChange={setProg}
                  groups={[{ options: [
                    { value: 'todos', label: 'Todos los programas' },
                    ...programas.map((p) => ({ value: String(p.id), label: p.nombre })),
                  ] }]}
                />
                <Select
                  label="Estado"
                  value={filtroEstado}
                  onChange={setFiltroEstado}
                  groups={[{ options: [
                    { value: 'todos', label: 'Todos los estados' },
                    { value: 'admitido', label: 'Admitidos' },
                    { value: 'en_proceso', label: 'En proceso' },
                    { value: 'rechazado', label: 'Rechazados' },
                  ] }]}
                />
                <span style={{ fontSize: 12, color: '#9c988e' }}>{filtrados.length} resultados</span>
              </div>

              <div className="reg-lista" style={{ marginTop: 10 }}>
                {filtrados.map((a) => {
                  const est = estudiantes.find((e) => e.admisioId === a.id);
                  return (
                    <div key={a.id} className="reg-card">
                      <Avatar nombre={a.nombre} clase={avColor(a.nombre)} tamano={44} radio={22} />
                      <div className="reg-id">
                        <div className="reg-nombre">
                          {a.nombre}
                          {a.esMenorDeEdad && <Badge tone="purple" style={{ marginLeft: 6 }}>Menor de edad</Badge>}
                        </div>
                        <div className="reg-sub">{a.documento} · {a.id}</div>
                        {a.esMenorDeEdad && a.responsableNombre && (
                          <div style={{ fontSize: 11, color: '#556a8a', marginTop: 2 }}>
                            {a.responsableParentesco || 'Acudiente'}: {a.responsableNombre} ({a.responsableTelefono})
                          </div>
                        )}
                      </div>
                      <div className="reg-datos">
                        <div className="reg-dato">
                          <span className="reg-etq">Programa</span>
                          <span>{nombreProg(a.programaId)}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">ICFES</span>
                          <span style={{ fontWeight: 700 }}>{a.puntajeIcfes}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Puntaje</span>
                          <span style={{ fontWeight: 900, color: puntajeFinal(a) >= 70 ? '#0a6e4b' : puntajeFinal(a) >= 50 ? '#99610e' : '#c1122c' }}>
                            {puntajeFinal(a)}
                          </span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Documentos</span>
                          <Badge tone={DOC_TONE[a.documentos]}>{a.documentos}</Badge>
                        </div>
                      </div>
                      <div className="reg-estado">
                        <Badge tone={ESTADO_ASP[a.estado].tone}>{ESTADO_ASP[a.estado].label}</Badge>
                        {est && <div style={{ fontSize: 11, color: '#0a6e4b', marginTop: 4 }}>✓ Matriculado {est.id}</div>}
                      </div>
                      <div className="reg-acciones">
                        {a.estado === 'admitido' && !est && (
                          <button className="btn b-success b-sm" onClick={() => matricular(a)}>
                            <Icon name="graduacion" size={13} /> Matricular
                          </button>
                        )}
                        <button className="btn b-secondary b-sm" onClick={() => setAspirante(a.id, { estado: 'admitido' })}>Admitir</button>
                        <button className="btn b-secondary b-sm" onClick={() => setAspirante(a.id, { estado: 'en_proceso' })}>Proceso</button>
                        <button className="btn b-secondary b-sm" onClick={() => setAspirante(a.id, { estado: 'rechazado' })}>Rechazar</button>
                        <button className="btn b-secondary b-sm" onClick={() => setAspirante(a.id, { documentos: a.documentos === 'completo' ? 'pendiente' : 'completo' })}>
                          {a.documentos === 'completo' ? <>Docs ✗</> : <>Docs ✓</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filtrados.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state__icon">🔍</div>
                  <div className="empty-state__title">Sin resultados</div>
                  <div className="empty-state__sub">No hay aspirantes que coincidan con los filtros aplicados.</div>
                </div>
              )}
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

              <div style={{ marginTop: 16 }}>
                <Encabezado titulo="Convocatorias" sub="Calendario de los procesos de admisión" />
                <div className="reg-lista">
                  {adm.periodos.map((p) => (
                    <div key={p.id} className="reg-card">
                      <div className="reg-id">
                        <div className="reg-nombre">{p.nombre}</div>
                      </div>
                      <div className="reg-datos">
                        <div className="reg-dato">
                          <span className="reg-etq">Apertura</span>
                          <span>{formatDate(p.fechaApertura)}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Cierre</span>
                          <span>{formatDate(p.fechaCierre)}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Resultados</span>
                          <span>{formatDate(p.fechaResultados)}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Inscripción</span>
                          <span>{formatDate(p.fechaInscripcion)}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Cupos</span>
                          <span>{p.cuposTotales.toLocaleString('es-CO')}</span>
                        </div>
                      </div>
                      <div className="reg-estado">
                        <Badge tone={p.estado === 'inscripciones' ? 'green' : p.estado === 'convocatoria' ? 'amber' : 'slate'}>
                          {p.estado === 'inscripciones' ? 'Inscripciones' : p.estado === 'convocatoria' ? 'Convocatoria' : 'Planificado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: DOCUMENTOS
           ========================================================= */
        if (tab === 'documentos') {
          const incompletos = adm.aspirantes.filter((a) => a.documentos !== 'completo');
          /* Los inscritos son los que ya tienen ficha de estudiante en
             'en_inscripcion': ellos suben los archivos y aquí se revisan. */
          const inscritos = estudiantes.filter((e) => e.estado === 'en_inscripcion');
          return (
            <div>
              {aviso && (
                <div style={{ ...card, marginBottom: 14, background: aviso.ok ? '#e9f7f1' : '#fff1f3', borderColor: aviso.ok ? '#b6e3cf' : '#f4c2ca', padding: 12 }}>
                  <span style={{ fontSize: 13, color: aviso.ok ? '#0a6e4b' : '#c1122c' }}>{aviso.text}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Kpi icon="archivo" bg="#e3f1ff" value={adm.documentos.length} label="Documentos exigidos" />
                <Kpi icon={<Icon name="check" size={16} />} bg="#d8f0e5" value={adm.documentos.filter((d) => d.vigente).length} label="Vigentes" color="#0a6e4b" />
                <Kpi icon={<Icon name="alerta" size={14} />} bg="#fbefd6" value={adm.documentos.filter((d) => !d.vigente).length} label="Por actualizar" color="#99610e" />
                <Kpi icon={<Icon name="archivo" size={16} />} bg="#ffe0e5" value={inscritos.length} label="Inscritos por revisar" color="#c1122c" />
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

              {/* ── Lo que subieron los inscritos: revisión y validación ── */}
              <div style={{ ...card, marginTop: 16 }}>
                <Encabezado
                  titulo="Documentos subidos por los inscritos"
                  sub="Aprueba o rechaza cada archivo con una observación: el estudiante la ve en su portal. Cuando todo esté aprobado, valida el expediente para habilitarle la matrícula."
                />

                {cargandoExpediente && <Vacio>Cargando expediente…</Vacio>}

                {!cargandoExpediente && !expediente && (
                  inscritos.length === 0
                    ? <Vacio>No hay inscritos esperando documentación.</Vacio>
                    : (
                      <div className="reg-lista">
                        {inscritos.map((e) => (
                          <div key={e.id} className="reg-card">
                            <Avatar nombre={e.nombre} clase={avColor(e.nombre)} tamano={40} radio={20} />
                            <div className="reg-id">
                              <div className="reg-nombre">{e.nombre}</div>
                              <div className="reg-sub">{e.id} · {e.documento}</div>
                            </div>
                            <div className="reg-datos" />
                            <div className="reg-estado">
                              <Badge tone={DOC_TONE[e.documentos]}>{e.documentos}</Badge>
                            </div>
                            <div className="reg-acciones">
                              <button
                                className="btn"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                data-testid={`revisar-docs-${e.id}`}
                                onClick={() => abrirExpediente(e)}
                              >
                                <Icon name="ojo" size={14} /> Revisar documentos
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                )}

                {!cargandoExpediente && expediente && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{expediente.estudiante.nombre}</strong>
                        <span style={{ fontSize: 12, color: '#9c988e', marginLeft: 8 }}>
                          {expediente.estudiante.id} · expediente {expediente.estudiante.documentos}
                        </span>
                      </div>
                      <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: 11, background: '#0a6e4b', color: '#fff' }}
                          data-testid="validar-expediente"
                          onClick={() => validarExpediente(true)}
                        >
                          <Icon name="check" size={14} /> Expediente completo
                        </button>
                        {expediente.estudiante.documentos === 'completo' && (
                          <button
                            className="btn"
                            style={{ padding: '5px 10px', fontSize: 11 }}
                            onClick={() => validarExpediente(false)}
                          >
                            Marcar pendiente
                          </button>
                        )}
                        <button className="btn" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => setExpediente(null)}>
                          Volver
                        </button>
                      </span>
                    </div>

                    {expediente.archivos.length === 0 && (
                      <Vacio>Este estudiante aún no ha subido ningún documento.</Vacio>
                    )}

                    {expediente.archivos.map((a) => (
                      <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0eee9' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ flex: '1 1 220px', fontSize: 13, minWidth: 0 }}>
                            <strong>{a.requisito?.nombre || `Requisito ${a.requisitoId}`}</strong>
                            <span style={{ display: 'block', fontSize: 11, color: '#9c988e' }}>
                              {a.nombre} · {Math.max(1, Math.round(a.tamano / 1024))} KB ·
                              subido {a.subidoEn ? new Date(a.subidoEn).toLocaleDateString('es-CO') : ''}
                            </span>
                          </span>
                          <Badge tone={a.estado === 'aprobado' ? 'green' : a.estado === 'rechazado' ? 'red' : 'amber'}>{a.estado}</Badge>
                          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              className="btn"
                              style={{ padding: '4px 9px', fontSize: 11 }}
                              onClick={() => descargarDocumentoIngresoAdmisiones(a.id).catch((err) => setAviso({ ok: false, text: err.message }))}
                            >
                              <Icon name="descargar" size={14} /> Ver archivo
                            </button>
                            <button
                              className="btn"
                              style={{ padding: '4px 9px', fontSize: 11, background: '#0a6e4b', color: '#fff' }}
                              disabled={a.estado === 'aprobado'}
                              onClick={() => revisarArchivo(a, 'aprobado')}
                            >
                              <Icon name="check" size={14} /> Aprobar
                            </button>
                            <button
                              className="btn"
                              style={{ padding: '4px 9px', fontSize: 11, background: '#c1122c', color: '#fff' }}
                              disabled={a.estado === 'rechazado'}
                              onClick={() => revisarArchivo(a, 'rechazado')}
                            >
                              <Icon name="alerta" size={14} /> Rechazar
                            </button>
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <input
                            style={{ ...input, flex: '1 1 260px' }}
                            placeholder="Observación para el estudiante (ej. 'Falta la firma del responsable' o 'El documento está ilegible')"
                            value={obsDraft[a.id] ?? a.observacion ?? ''}
                            onChange={(ev) => setObsDraft({ ...obsDraft, [a.id]: ev.target.value })}
                          />
                          <button
                            className="btn"
                            style={{ padding: '5px 10px', fontSize: 11 }}
                            onClick={() => revisarArchivo(a, a.estado === 'rechazado' ? 'rechazado' : a.estado)}
                          >
                            Guardar observación
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>


            </div>
          );
        }

        /* =========================================================
           PESTAÑA: ESTUDIANTES (VISTA JERÁRQUICA + SITUACIÓN)
           ========================================================= */
        if (tab === 'estudiantes') {
          /* Navegación tipo Moodle: facultad → programa → semestre. Desde aquí
             Admisiones ve TODOS los estudiantes (activos, en inscripción,
             retirados, graduados) y su situación de matrícula, para resolver
             los casos en que un bloqueo impide matricular. */
          const facultades = [...new Set(programas.map((p) => p.facultad))].filter(Boolean).sort();
          const programasDeFacultad = programas.filter((p) => estFacultad === 'todas' || p.facultad === estFacultad);
          const semestresProg = estPrograma === 'todos'
            ? []
            : Array.from(
              { length: programas.find((p) => p.id === Number(estPrograma))?.semestres || 0 },
              (_, i) => i + 1,
            );

          const enJerarquia = estudiantes.filter((e) => {
            const prog = programas.find((p) => p.id === e.programaId);
            if (estFacultad !== 'todas' && prog?.facultad !== estFacultad) return false;
            if (estPrograma !== 'todos' && e.programaId !== Number(estPrograma)) return false;
            if (estSemestre !== 'todos' && e.semestre !== Number(estSemestre)) return false;
            if (estSituacion !== 'todas' && situacionMatricula(e).key !== estSituacion) return false;
            if (estFinanciacion !== 'todas') {
              if (estFinanciacion === 'brilla' && !e.cupoBrilla && e.financiacion?.toLowerCase() !== 'brilla') return false;
              if (estFinanciacion === 'caja' && !e.tieneCajaCompensacion && !/caja/i.test(e.financiacion || '')) return false;
              if (estFinanciacion === 'icetex' && !/icetex/i.test(e.financiacion || '')) return false;
              if (estFinanciacion === 'propio' && e.financiacion && !/propio|ninguna|contado/i.test(e.financiacion)) return false;
              if (estFinanciacion === 'sin_definir' && (e.financiacion || e.cupoBrilla || e.tieneCajaCompensacion)) return false;
            }
            return true;
          });
          const visibles = enJerarquia.filter(enFiltro);
          const conteo = (key) => estudiantes.filter((e) => situacionMatricula(e).key === key).length;
          const conteoBrilla = estudiantes.filter((e) => e.cupoBrilla || e.financiacion?.toLowerCase() === 'brilla').length;
          const conteoIcetex = estudiantes.filter((e) => /icetex/i.test(e.financiacion || '')).length;

          const guardarFinanciero = async () => {
            if (!modalFinanciero) return;
            setGuardandoFinanciero(true);
            try {
              await actualizarEstudiante(modalFinanciero.id, {
                financiacion: modalFinanciero.financiacion || null,
                cupoBrilla: !!modalFinanciero.cupoBrilla,
                tieneCajaCompensacion: !!modalFinanciero.tieneCajaCompensacion,
                observacionFinanciera: modalFinanciero.observacionFinanciera || null,
              });
              setData((prev) => ({
                ...prev,
                estudiantes: prev.estudiantes.map((est) =>
                  est.id === modalFinanciero.id
                    ? {
                        ...est,
                        financiacion: modalFinanciero.financiacion || null,
                        cupoBrilla: !!modalFinanciero.cupoBrilla,
                        tieneCajaCompensacion: !!modalFinanciero.tieneCajaCompensacion,
                        observacionFinanciera: modalFinanciero.observacionFinanciera || null,
                      }
                    : est
                ),
              }));
              setAviso({ ok: true, text: `Financiación actualizada para ${modalFinanciero.nombre}` });
              setModalFinanciero(null);
            } catch (err) {
              setAviso({ ok: false, text: `Error al guardar financiación: ${err.message}` });
            } finally {
              setGuardandoFinanciero(false);
              recargar();
            }
          };

          return (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Kpi icon={<Icon name="check" size={16} />} bg="#d8f0e5" value={conteo('habilitado')} label="Habilitados" color="#0a6e4b" onClick={() => setEstSituacion('habilitado')} />
                <Kpi icon={<Icon name="tarjeta-credito" size={16} />} bg="#e3f1ff" value={conteoBrilla} label="Cupo Brilla" color="#00116f" hint="Financiación gases del Caribe" onClick={() => { setEstFinanciacion('brilla'); setEstSituacion('todas'); }} />
                <Kpi icon={<Icon name="certificado" size={16} />} bg="#efe9fb" value={conteoIcetex} label="Crédito ICETEX" color="#5a37ad" hint="Crédito educativo activo" onClick={() => { setEstFinanciacion('icetex'); setEstSituacion('todas'); }} />
                <Kpi icon={<Icon name="alerta" size={16} />} bg="#ffe0e5" value={conteo('bloqueado')} label="Bloqueados docs" color="#c1122c" onClick={() => setEstSituacion('bloqueado')} />
                <Kpi icon={<Icon name="reloj" size={16} />} bg="#fbefd6" value={conteo('mora')} label="En mora" color="#99610e" onClick={() => setEstSituacion('mora')} />
                <Kpi icon={<Icon name="graduacion" size={16} />} bg="#f0eee9" value={estudiantes.length} label="Total alumnos" onClick={() => { setEstSituacion('todas'); setEstFinanciacion('todas'); }} />
              </div>

              <div className="admin-filter-bar">
                <Select label="Facultad" value={estFacultad} onChange={(v) => { setEstFacultad(v); setEstPrograma('todos'); setEstSemestre('todos'); }} groups={[{ options: [
                  { value: 'todas', label: 'Todas las facultades' },
                  ...facultades.map((f) => ({ value: f, label: f })),
                ] }]} />
                <Select label="Programa" value={estPrograma} onChange={(v) => { setEstPrograma(v); setEstSemestre('todos'); }} groups={[{ options: [
                  { value: 'todos', label: 'Todos los programas' },
                  ...programasDeFacultad.map((p) => ({ value: p.id, label: p.nombre })),
                ] }]} />
                <Select label="Semestre" value={estSemestre} onChange={setEstSemestre} groups={[{ options: [
                  { value: 'todos', label: estPrograma === 'todos' ? 'Todos' : 'Todos' },
                  ...semestresProg.map((s) => ({ value: String(s), label: `Semestre ${s}` })),
                ] }]} />
                <Select label="Financiación / Cupo" value={estFinanciacion} onChange={setEstFinanciacion} groups={[{ options: [
                  { value: 'todas', label: 'Todas las modalidades' },
                  { value: 'brilla', label: 'Cupo Brilla' },
                  { value: 'icetex', label: 'ICETEX' },
                  { value: 'caja', label: 'Caja Compensación' },
                  { value: 'propio', label: 'Recursos Propios' },
                  { value: 'sin_definir', label: 'Sin definir' },
                ] }]} />
                <Select label="Situación" value={estSituacion} onChange={setEstSituacion} groups={[{ options: [
                  { value: 'todas', label: 'Todas' },
                  { value: 'habilitado', label: 'Habilitados' },
                  { value: 'bloqueado', label: 'Bloqueados por documentos' },
                  { value: 'sin_cuenta', label: 'Sin cuenta' },
                  { value: 'inactivo', label: 'Cuenta inactiva' },
                  { value: 'mora', label: 'En mora' },
                  { value: 'retirado', label: 'Retirados' },
                  { value: 'graduado', label: 'Graduados' },
                ] }]} />
                <div style={{ flex: 2, padding: '10px 16px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--cul-muted, #5b6b86)', marginBottom: 2 }}>Buscar</span>
                  <input placeholder="Buscar por nombre, documento o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ border: 0, background: 'transparent', font: 'inherit', fontWeight: 600, padding: 0, outline: 'none' }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9c988e', marginTop: 8 }}>{visibles.length} de {enJerarquia.length}</div>

              {/* Modal de edición de Financiación */}
              {modalFinanciero && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,17,111,0.45)', backdropFilter: 'blur(3px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999, padding: 16
                }}>
                  <div style={{
                    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460,
                    boxShadow: '0 24px 60px rgba(0,17,111,0.25)', overflow: 'hidden', border: '1px solid #e3f1ff'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #00116f 0%, #06468c 100%)',
                      padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>Gestión de Financiación y Cupos</div>
                        <div style={{ fontSize: 11.5, opacity: 0.85 }}>{modalFinanciero.nombre} ({modalFinanciero.id})</div>
                      </div>
                      <button
                        onClick={() => setModalFinanciero(null)}
                        style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ padding: '20px' }}>
                      <div style={{ marginBottom: 14 }}>
                        <Select
                          label="Modalidad principal de financiación"
                          value={modalFinanciero.financiacion || ''}
                          onChange={(v) => setModalFinanciero({ ...modalFinanciero, financiacion: v })}
                          placeholder="Selecciona modalidad…"
                          groups={[{ options: [
                            { value: '', label: 'Selecciona modalidad…' },
                            { value: 'Recursos Propios', label: 'Recursos Propios (Directo / Contado)' },
                            { value: 'BRILLA', label: 'BRILLA (Gases del Caribe)' },
                            { value: 'ICETEX', label: 'ICETEX (Crédito Educativo)' },
                            { value: 'Caja de Compensación', label: 'Caja de Compensación (Combarranquilla, etc.)' },
                            { value: 'Beca / Convenio', label: 'Beca institucional o Convenio' },
                            { value: 'Crédito Bancario', label: 'Crédito Entidad Bancaria' },
                          ] }]}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafd', padding: 12, borderRadius: 10, border: '1px solid #dce8f8', marginBottom: 14 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#06468c' }}>
                          <input
                            type="checkbox"
                            checked={!!modalFinanciero.cupoBrilla}
                            onChange={(e) => setModalFinanciero({ ...modalFinanciero, cupoBrilla: e.target.checked })}
                            style={{ width: 18, height: 18, accentColor: '#00116f' }}
                          />
                          <span>Aplica Cupo BRILLA (Gases del Caribe)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#06468c' }}>
                          <input
                            type="checkbox"
                            checked={!!modalFinanciero.tieneCajaCompensacion}
                            onChange={(e) => setModalFinanciero({ ...modalFinanciero, tieneCajaCompensacion: e.target.checked })}
                            style={{ width: 18, height: 18, accentColor: '#00116f' }}
                          />
                          <span>Tiene beneficio de Caja de Compensación</span>
                        </label>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4e4a43', marginBottom: 6 }}>
                          Observación Financiera
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ej. Cupo Brilla preaprobado por $2.500.000 con recibo de gas..."
                          value={modalFinanciero.observacionFinanciera || ''}
                          onChange={(e) => setModalFinanciero({ ...modalFinanciero, observacionFinanciera: e.target.value })}
                          style={{ ...input, width: '100%', resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ background: '#f0eee9', color: '#4e4a43' }}
                          onClick={() => setModalFinanciero(null)}
                          disabled={guardandoFinanciero}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ background: '#00116f', color: '#fff' }}
                          onClick={guardarFinanciero}
                          disabled={guardandoFinanciero}
                        >
                          {guardandoFinanciero ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="modern-table-wrap">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,17,111,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#fff' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1b1a17' }}>Estudiantes por programa y financiación</div>
                    <div style={{ fontSize: 12, color: '#6e6a61', marginTop: 2 }}>Identifica la modalidad de pago (BRILLA, ICETEX, Caja o Propio) y el estado de la matrícula.</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#9c988e', fontWeight: 600 }}>{visibles.length} de {enJerarquia.length} estudiantes</span>
                </div>
                <div style={{ padding: '0 4px 4px' }}>
                  <div className="reg-lista" style={{ marginTop: 10 }}>
                    {visibles.map((e) => {
                      const sit = situacionMatricula(e);
                      const prog = programas.find((p) => p.id === e.programaId);
                      return (
                        <div key={e.id} className="reg-card">
                          <Avatar nombre={e.nombre} clase={avColor(e.nombre)} tamano={44} radio={22} />
                          <div className="reg-id">
                            <div className="reg-nombre">{e.nombre}</div>
                            <div className="reg-sub">{e.documento} · <code style={{ fontSize: 11 }}>{e.id}</code></div>
                          </div>
                          <div className="reg-datos">
                            <div className="reg-dato">
                              <span className="reg-etq">Facultad / Programa</span>
                              <span>{prog?.facultad || '—'}<br /><span style={{ fontSize: 11, color: '#9c988e' }}>{prog?.nombre || '—'}</span></span>
                            </div>
                            <div className="reg-dato">
                              <span className="reg-etq">Sem.</span>
                              <span>{e.semestre}</span>
                            </div>
                            <div className="reg-dato">
                              <span className="reg-etq">Financiación</span>
                              <FinBadge financiacion={e.financiacion} cupoBrilla={e.cupoBrilla} tieneCajaCompensacion={e.tieneCajaCompensacion} observacion={e.observacionFinanciera} />
                            </div>
                            <div className="reg-dato">
                              <span className="reg-etq">Documentos</span>
                              <Badge tone={DOC_TONE[e.documentos] || 'slate'}>{e.documentos}</Badge>
                            </div>
                            <div className="reg-dato">
                              <span className="reg-etq">Cuenta</span>
                              {e.usuario ? <Badge tone={e.usuarioActivo ? 'blue' : 'red'}>{e.usuario}</Badge> : <span style={{ fontSize: 11, color: '#9c988e' }}>sin cuenta</span>}
                            </div>
                          </div>
                          <div className="reg-estado">
                            <Badge tone={ESTADO_ESTUDIANTE[e.estado]?.tone || 'slate'}>{ESTADO_ESTUDIANTE[e.estado]?.label || e.estado}</Badge>
                            <div style={{ marginTop: 4 }}>
                              <Badge tone={SITUACION_TONE[sit.key] || 'slate'}>{sit.label}</Badge>
                            </div>
                          </div>
                          <div className="reg-acciones">
                            <button
                              className="btn"
                              style={{ padding: '6px 9px', fontSize: 11, background: '#e3f1ff', color: '#00116f', border: '1px solid #b8daff' }}
                              onClick={() => setModalFinanciero({ id: e.id, nombre: e.nombre, financiacion: e.financiacion || '', cupoBrilla: !!e.cupoBrilla, tieneCajaCompensacion: !!e.tieneCajaCompensacion, observacionFinanciera: e.observacionFinanciera || '' })}
                            >
                              💳 Cupo
                            </button>
                            <button className="btn" style={{ padding: '6px 9px', fontSize: 11 }} onClick={() => { setSelEstudiante(e.id); setTab('expedientes'); }}>
                              Ficha
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {visibles.length === 0 && <Vacio>No hay estudiantes que coincidan con los filtros seleccionados.</Vacio>}
                </div>
              </div>
            </div>
          );
        }

        /* =========================================================
           PESTAÑA: REGISTRO (INSCRIPCIÓN DE ADMITIDOS)
           ========================================================= */
        if (tab === 'registro') {
          const lista = estudiantes.filter((e) => {
            if (filtroRegistro === 'sin_cuenta') return !e.usuario;
            if (filtroRegistro === 'todos') return true;
            return e.estado === 'en_inscripcion';
          });
          const totalSinCuenta = estudiantes.filter((e) => !e.usuario).length;
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Kpi icon={<Icon name="cuaderno" size={16} />} bg="#fbefd6" value={inscritos.length} label="Por matricular" color="#99610e" />
                <Kpi icon={<Icon name="candado" size={16} />} bg="#ffe0e5" value={totalSinCuenta} label="Sin cuenta de acceso" color="#c1122c" onClick={() => setFiltroRegistro('sin_cuenta')} />
                <Kpi icon={<Icon name="check" size={16} />} bg="#d8f0e5" value={estudiantes.filter((e) => e.estado === 'activo').length} label="Con matrícula activa" color="#0a6e4b" />
                <Kpi icon={<Icon name="libro" size={16} />} bg="#e3f1ff" value={estudiantes.length} label="Total en el registro" onClick={() => setFiltroRegistro('todos')} />
              </div>

              <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <input placeholder="Buscar por nombre, documento o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...input, minWidth: 260 }} />
                <Select
                  label="Filtro de registro"
                  value={filtroRegistro}
                  onChange={setFiltroRegistro}
                  groups={[{ options: [
                    { value: 'inscritos', label: 'Por matricular (en inscripción)' },
                    { value: 'sin_cuenta', label: 'Estudiantes sin cuenta de acceso' },
                    { value: 'todos', label: 'Todos los estudiantes' },
                  ] }]}
                />
                <span style={{ fontSize: 12, color: '#9c988e' }}>{lista.filter(enFiltro).length} de {lista.length} estudiantes</span>
              </div>

              {aviso && (
                <div style={{ ...card, marginBottom: 14, background: aviso.ok ? '#e9f7f1' : '#fff1f3', borderColor: aviso.ok ? '#b6e3cf' : '#f4c2ca', padding: 12 }}>
                  <span style={{ fontSize: 13, color: aviso.ok ? '#0a6e4b' : '#c1122c' }}>{aviso.text}</span>
                </div>
              )}

              <div style={card}>
                <Encabezado
                  titulo={filtroRegistro === 'sin_cuenta' ? 'Estudiantes sin cuenta de acceso al campus' : filtroRegistro === 'todos' ? 'Todos los estudiantes en registro' : 'Admitidos pendientes de inscripción'}
                  sub={filtroRegistro === 'sin_cuenta' ? 'Estudiantes registrados que todavía no tienen credenciales de acceso activas.' : filtroRegistro === 'todos' ? 'Listado general de estudiantes en el sistema.' : 'La inscripción se cierra cuando el estudiante queda activo y con la matrícula registrada.'}
                />
                <TarjetasRegistro
                  items={lista.filter(enFiltro)}
                  getKey={(e) => e.id}
                  avatar={(e) => ({ nombre: e.nombre, foto: e.avatar, clase: e.avatarClass })}
                  titulo={(e) => e.nombre}
                  subtitulo={(e) => e.id}
                  datos={[
                    { etiqueta: 'Programa', render: (e) => nombreProg(e.programaId) },
                    { etiqueta: 'Semestre', render: (e) => e.semestre },
                    { etiqueta: 'Estado', render: (e) => <Badge tone={ESTADO_ESTUDIANTE[e.estado]?.tone || 'slate'}>{ESTADO_ESTUDIANTE[e.estado]?.label || e.estado}</Badge> },
                    { etiqueta: 'Financiero', render: (e) => <Badge tone={estadoCuenta(e).tone}>{estadoCuenta(e).label}</Badge> },
                    { etiqueta: 'Cuenta', render: (e) => e.usuario ? <Badge tone={e.usuarioActivo ? 'blue' : 'red'}>{e.usuario}</Badge> : <span style={{ color: '#9c988e' }}>sin cuenta</span> },
                  ]}
                  acciones={(e) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {e.estado === 'en_inscripcion' && (
                        <button className="btn" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => completarInscripcion(e)}>
                          Completar inscripción
                        </button>
                      )}
                      {!e.usuario && (
                        <button
                          className="btn"
                          style={{ padding: '5px 9px', fontSize: 11, background: '#e3f1ff', color: '#06468c', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => crearCuentaDeEstudiante(e)}
                          title="Crear cuenta de acceso para este estudiante"
                        >
                          <Icon name="candado" size={13} /> Crear cuenta
                        </button>
                      )}
                    </div>
                  )}
                  vacio={filtroRegistro === 'sin_cuenta' ? 'No hay estudiantes sin cuenta de acceso.' : 'Sin resultados.'}
                />
                {lista.filter(enFiltro).length === 0 && (
                  <Vacio>
                    {filtroRegistro === 'sin_cuenta'
                      ? 'No hay estudiantes sin cuenta de acceso.'
                      : filtroRegistro === 'todos'
                        ? 'No hay estudiantes que coincidan con la búsqueda.'
                        : 'No hay admitidos pendientes de inscripción con ese criterio.'}
                  </Vacio>
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
                <Select
                  label="Estudiante"
                  value={String(est?.id || '')}
                  onChange={setSelEstudiante}
                  groups={[{ options: estudiantes.filter(enFiltro).map((e) => ({
                    value: String(e.id), label: `${e.id} — ${e.nombre}`,
                  })) }]}
                />
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 0', fontSize: 13 }}>
                      <span style={{ color: '#6f6b62' }}>Cuenta de campus</span>
                      {est.usuario ? (
                        <Badge tone={est.usuarioActivo ? 'blue' : 'red'}>{est.usuario}</Badge>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#9c988e' }}>sin cuenta</span>
                          <button
                            className="btn"
                            style={{ padding: '3px 8px', fontSize: 11, background: '#e3f1ff', color: '#06468c', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => crearCuentaDeEstudiante(est)}
                          >
                            <Icon name="candado" size={13} /> Crear cuenta
                          </button>
                        </span>
                      )}
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
                <Select
                  label="Filtro de cartera"
                  value={filtroCuenta}
                  onChange={setFiltroCuenta}
                  groups={[{ options: [
                    { value: 'todos', label: 'Toda la cartera' },
                    { value: 'mora', label: 'Solo en mora' },
                    { value: 'pendiente', label: 'Con saldo pendiente' },
                    { value: 'al_dia', label: 'Paz y salvo' },
                  ] }]}
                />
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
                <TarjetasRegistro
                  items={porPagar.filter(enFiltro)}
                  getKey={(e) => e.id}
                  avatar={(e) => ({ nombre: e.nombre, foto: e.avatar, clase: e.avatarClass })}
                  titulo={(e) => e.nombre}
                  subtitulo={(e) => e.id}
                  datos={[
                    { etiqueta: 'Programa', render: (e) => nombreProg(e.programaId) },
                    { etiqueta: 'Estado', render: (e) => <Badge tone={ESTADO_ESTUDIANTE[e.estado].tone}>{ESTADO_ESTUDIANTE[e.estado].label}</Badge> },
                    { etiqueta: 'Saldo', render: (e) => <strong style={{ color: saldo(e) > 0 ? '#c1122c' : '#0a6e4b' }}>{formatCurrency(saldo(e))}</strong> },
                    { etiqueta: 'Vencido', render: (e) => formatCurrency(pagosVencidos(e).reduce((a, p) => a + p.valor, 0)) },
                    { etiqueta: 'Situación', render: (e) => <Badge tone={estadoCuenta(e).tone}>{estadoCuenta(e).label}</Badge> },
                    { etiqueta: 'Detalle', render: (e) => {
                        const abiertos = e.pagos.filter((p) => p.estado !== 'pagado');
                        return abiertos.length === 0
                          ? <span style={{ fontSize: 11, color: '#9c988e' }}>Sin saldos abiertos</span>
                          : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {abiertos.map((p) => (
                                <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5, flexWrap: 'wrap' }}>
                                  <span style={{ color: '#4e4a43' }}>{p.concepto}</span>
                                  <span style={{ color: '#9c988e' }}>{formatCurrency(p.valor)}</span>
                                  <button className="btn" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => registrarPago(e.id, p.id)}>
                                    Registrar pago
                                  </button>
                                </div>
                              ))}
                            </div>;
                      } },
                  ]}
                  vacio="No hay estudiantes con ese criterio de cartera."
                />
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

                <Select
                  label="Estudiante"
                  value={selEstudiante}
                  onChange={setSelEstudiante}
                  groups={[{ options: [
                    { value: '', label: 'Selecciona un estudiante…' },
                    ...estudiantes.map((e) => ({ value: String(e.id), label: `${e.id} — ${e.nombre} (${estadoCuenta(e).label})` })),
                  ] }]}
                />

                <Select
                  label="Tipo de certificado"
                  value={selTipo}
                  onChange={setSelTipo}
                  groups={[{ options: TIPOS_CERTIFICADO.map((t) => ({ value: t.id, label: t.nombre })) }]}
                />

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
                  <table className="tabla-datos">
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
