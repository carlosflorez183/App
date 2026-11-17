/* =============================================
   Módulo de Talento Humano.
   Planta docente editable, carga académica,
   convocatorias con sus postulados y el plan
   de capacitaciones.
   ============================================= */
import React, { useCallback, useEffect, useState } from 'react';
import Select from '../components/Select';
import Avatar from '../components/Avatar';
import ModuleLayout from '../components/ModuleLayout';
import '../assets/css/registros.css';
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
  listarCertificadosLaborales,
  crearCertificadoLaboral,
  descargarCertificadoLaboral,
  obtenerNomina,
  actualizarPuntaje,
  crearNovedad,
  listarNovedadesTH,
  actualizarNovedadTH,
} from '../api/client';
import { formatDate } from '../data/mockData';
import { EstadoVacio } from '../components/Estado';

const TABS = [
  { key: 'planta', label: 'Planta docente', icon: 'users' },
  { key: 'convocatorias', label: 'Convocatorias', icon: 'megafono' },
  { key: 'capacitaciones', label: 'Capacitaciones', icon: 'graduacion' },
  { key: 'carga', label: 'Carga académica', icon: 'libro' },
  { key: 'areas', label: 'Áreas', icon: 'carpeta-arbol' },
  { key: 'nomina', label: 'Nómina', icon: 'billete' },
  { key: 'novedades', label: 'Novedades', icon: 'cuaderno' },
  { key: 'certificados', label: 'Certificados', icon: 'certificado' },
];

/* Novedades que Talento Humano reporta a Contabilidad. `campos` decide qué
   pide el formulario para calcular el valor sugerido. */
const TIPOS_NOVEDAD = [
  { value: 'incapacidad', label: 'Incapacidad', campos: ['dias'] },
  { value: 'licencia', label: 'Licencia o permiso', campos: ['dias', 'modalidad'] },
  { value: 'vacaciones', label: 'Vacaciones', campos: ['dias'] },
  { value: 'retiro', label: 'Retiro o renuncia', campos: ['fechas'] },
  { value: 'bonificacion', label: 'Bonificación', campos: ['valor'] },
  { value: 'horas_extra', label: 'Horas extra', campos: ['horas'] },
  { value: 'descuento', label: 'Descuento (préstamo, libranza)', campos: ['valor'] },
];

const ETIQUETA_NOVEDAD = Object.fromEntries(TIPOS_NOVEDAD.map((t) => [t.value, t.label]));

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9' };
const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cdc9bf', fontSize: 13, background: '#fff' };
const label = { fontSize: 11, fontWeight: 700, color: '#6f6b62', display: 'block', marginBottom: 4 };

const CATEGORIAS = ['Docente titular', 'Catedrático', 'Adjunto', 'Asistente', 'Contratado'];
const ESTADOS_CONV = ['abierta', 'en_proceso', 'cerrada'];
const ESTADOS_POSTULADO = ['postulado', 'en_estudio', 'admitido', 'descartado'];
const ESTADOS_CAPACITACION = ['programada', 'en_curso', 'finalizada'];

const tonoEstado = (e) =>
  ({ abierta: '#0a6e4b', en_proceso: '#99610e', cerrada: '#6f6b62', admitido: '#0a6e4b', descartado: '#c1122c', en_estudio: '#06468c', postulado: '#6f6b62', programada: '#06468c', en_curso: '#99610e', finalizada: '#0a6e4b' }[e] || '#6f6b62');

const Badge = ({ children, color = '#4e4a43', bg = '#f0eee9' }) => (
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
    ? { background: '#ffe0e5', color: '#8f0d22', borderColor: '#f4c2ca' }
    : { background: '#d8f0e5', color: '#0a5c40', borderColor: '#b6e3cf' };
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
  const [conceptosNomina, setConceptosNomina] = useState(null);
  const [formCert, setFormCert] = useState({ tipo: 'constancia_laboral', empleadoId: '', nominaId: '' });
  const [certificados, setCertificados] = useState([]);

  const [descargando, setDescargando] = useState(false);
  const [novedades, setNovedades] = useState([]);
  const [formNovedad, setFormNovedad] = useState({
    persona: '', tipo: 'incapacidad', periodo: '', fechaInicio: '', fechaFin: '',
    dias: '', horas: '', valor: '', modalidad: 'no_remunerada', descripcion: '',
  });

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

  const cargarNominas = useCallback(async () => {
    try {
      const data = await listarNominas(); setNominas(data);
    } catch (err) {
      setNominas([]);
      setError(`Nóminas: ${err.message}`);
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

  const cargarNovedades = useCallback(async () => {
    try {
      setNovedades(await listarNovedadesTH());
    } catch (err) {
      setNovedades([]);
      setError(`No se pudieron cargar las novedades: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      cargarConvocatorias(),
      cargarCapacitaciones(),
      cargarNominas(),
      cargarCertificados(),
      cargarNovedades(),
    ]).finally(() => setCargando(false));
  }, [cargarConvocatorias, cargarCapacitaciones, cargarNominas, cargarCertificados, cargarNovedades]);

  const verDetalle = async (id) => {
    try {
      setDetalleNomina(await obtenerNomina(id));
      setError('');
    } catch (err) {
      avisar(`No se pudo cargar la corrida: ${err.message}`, 'error');
    }
  };

  const emitirCertificado = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const cuerpo = { tipo: formCert.tipo, empleadoId: Number(formCert.empleadoId) };
      if (formCert.tipo === 'ingresos_retenciones') { cuerpo.nominaId = Number(formCert.nominaId); }
      await crearCertificadoLaboral(cuerpo);
      avisar('Certificado emitido. Ya puede descargarse en PDF.');
      setFormCert({ tipo: 'constancia_laboral', empleadoId: '', nominaId: '' });
      await cargarCertificados();
    } catch (err) {
      avisar(`No se pudo emitir el certificado: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const descargarCert = async (id) => {
    setDescargando(true);
    try {
      const nombre = await descargarCertificadoLaboral(id);
      avisar(`PDF descargado: ${nombre}`);
    } catch (err) {
      avisar(`No se pudo descargar el PDF: ${err.message}`, 'error');
    } finally {
      setDescargando(false);
    }
  };

  const necesita = (t) => (TIPOS_NOVEDAD.find((x) => x.value === t) || { campos: [] }).campos;
  const formNovedadCompleto = () => {
    const campos = new Set(necesita(formNovedad.tipo));
    if (!formNovedad.persona) return false;
    if (!formNovedad.periodo || !/^\d{4}-\d{2}$/.test(formNovedad.periodo)) return false;
    if (campos.has('dias') && (!formNovedad.dias || Number(formNovedad.dias) <= 0)) return false;
    if (campos.has('horas') && (!formNovedad.horas || Number(formNovedad.horas) <= 0)) return false;
    if (campos.has('valor') && (!formNovedad.valor || Number(formNovedad.valor) <= 0)) return false;
    if (campos.has('fechas') && !formNovedad.fechaInicio) return false;
    return true;
  };

  const reportarNovedad = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const [v, id] = formNovedad.persona.split(':');
      const cuerpo = {
        tipo: formNovedad.tipo,
        periodo: formNovedad.periodo,
        descripcion: formNovedad.descripcion || '',
        modalidad: formNovedad.modalidad,
        fechaInicio: formNovedad.fechaInicio || undefined,
        fechaFin: formNovedad.fechaFin || undefined,
      };
      if (v === 'e') cuerpo.empleadoId = Number(id);
      if (v === 'd') cuerpo.docenteId = id;
      if (necesita(formNovedad.tipo).includes('dias') && formNovedad.dias) cuerpo.dias = Number(formNovedad.dias);
      if (necesita(formNovedad.tipo).includes('horas') && formNovedad.horas) cuerpo.horas = Number(formNovedad.horas);
      if (necesita(formNovedad.tipo).includes('valor') && formNovedad.valor) cuerpo.valor = Number(formNovedad.valor);
      await crearNovedad(cuerpo);
      avisar('Novedad reportada a Contabilidad para su revisión');
      setFormNovedad({
        persona: '', tipo: 'incapacidad', periodo: '',
        fechaInicio: '', fechaFin: '', dias: '', horas: '', valor: '',
        modalidad: 'no_remunerada', descripcion: '',
      });
      await cargarNovedades();
    } catch (err) {
      avisar(`No se pudo reportar la novedad: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  /* -- Planta docente ---------------------------------------------------- */

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

  /* -- Convocatorias ----------------------------------------------------- */

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

  /* -- Capacitaciones ----------------------------------------------------- */

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
    <ModuleLayout title="Talento Humano" subtitle="Planta docente, convocatorias, capacitaciones y carga" tabs={TABS} colapsarSidebar rutaModulo="/talento-humano">
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
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Docentes</div><div style={{ fontSize: 26, fontWeight: 800 }}>{docentes.length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>En servicio</div><div style={{ fontSize: 26, fontWeight: 800, color: '#0a6e4b' }}>{docentes.filter((d) => d.estado === 'activo').length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Catedráticos</div><div style={{ fontSize: 26, fontWeight: 800 }}>{docentes.filter((d) => d.categoria === 'Docente titular').length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Áreas cubiertas</div><div style={{ fontSize: 26, fontWeight: 800 }}>{new Set(docentes.map((d) => d.area)).size}</div></div>
              </div>

              <div className="reg-lista">
                {docentes.map((d) => {
                  const enEdicion = editando === d.id;
                  return (
                    <div key={d.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="reg-card">
                        <Avatar nombre={d.nombre} clase="av-purple" tamano={44} radio={22} />
                        <div className="reg-id">
                          <div className="reg-nombre">{d.nombre}</div>
                          <div className="reg-sub">{d.id}</div>
                        </div>
                        <div className="reg-datos">
                          <div className="reg-dato">
                            <span className="reg-etq">Área</span>
                            <span>{d.area}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Categoría</span>
                            <span>{d.categoria}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Asignaturas</span>
                            <span>{cargaDe(d.nombre).length}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Correo</span>
                            <span>{d.email}</span>
                          </div>
                        </div>
                        <div className="reg-estado">
                          <EstadoBadge estado={d.estado} />
                        </div>
                        <div className="reg-acciones">
                          <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => abrirDocente(d)}>
                            Editar
                          </button>
                        </div>
                      </div>
                      {enEdicion && (
                        <div style={{ background: '#f7f6f3', border: '1px solid #e5e2da', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>
                            Área
                            <input style={{ ...input, width: '100%', marginTop: 4 }} value={form.area || ''} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
                          </label>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>
                            Categoría
                            <Select label="Categoría" value={form.categoria || ''} onChange={(v) => setForm((f) => ({ ...f, categoria: v }))} groups={[{ options: CATEGORIAS.map((c) => ({ value: c, label: c })) }]} />
                          </label>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>
                            Estado
                            <Select label="Estado" value={form.estado || ''} onChange={(v) => setForm((f) => ({ ...f, estado: v }))} groups={[{ options: [{ value: 'activo', label: 'Activo' }, { value: 'permanencia', label: 'Permanencia' }, { value: 'cesado', label: 'Cesado' }] }]} />
                          </label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => guardarDocente(d, refrescarDocentes)} disabled={guardando}>Guardar</button>
                            <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={cerrarEdicion}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      <Select label="Vínculo" value={formConv.vinculo} onChange={(v) => setFormConv((f) => ({ ...f, vinculo: v }))} groups={[{ options: [
                        { value: 'catedra', label: 'Cátedra' },
                        { value: 'planta', label: 'Planta' },
                        { value: 'contrato', label: 'Contrato' },
                        { value: 'horas', label: 'Por horas' },
                      ] }]} />
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
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Convocatorias</div><div style={{ fontSize: 24, fontWeight: 800 }}>{convocatorias.length}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Abiertas</div><div style={{ fontSize: 24, fontWeight: 800, color: '#0a6e4b' }}>{convocatorias.filter((c) => c.estado === 'abierta').length}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Cupos abiertos</div><div style={{ fontSize: 24, fontWeight: 800 }}>{convocatorias.filter((c) => c.estado === 'abierta').reduce((a, c) => a + c.cupos, 0)}</div></div>
                  </div>

                  {cargando && <div data-cargando="1" style={card}>Cargando convocatorias…</div>}

                  {!cargando && convocatorias.length === 0 && (
                    <EstadoVacio mensaje="No hay convocatorias publicadas." />
                  )}

                  {convocatorias.map((c) => {
                    const abierta = convAbierta === c.id;
                    const lista = postulados[c.id];
                    return (
                      <div key={c.id} style={{ ...card, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{c.cargo}</div>
                            <div style={{ fontSize: 11, color: '#9c988e' }}>
                              {c.area} ? {c.vinculo} ? {c.cupos} cupo{c.cupos === 1 ? '' : 's'}
                            </div>
                            <div style={{ fontSize: 11, color: '#6f6b62', marginTop: 4 }}>
                              {formatDate(c.apertura)} ? {formatDate(c.cierre)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <EstadoBadge estado={c.estado} />
                            <Select label="Estado" value={c.estado} onChange={(v) => cambiarEstadoConv(c, v)} groups={[{ options: ESTADOS_CONV.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })) }]} />
                          </div>
                        </div>

                        {c.requisitos && (
                          <div style={{ fontSize: 12, color: '#4e4a43', background: '#f7f6f3', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                            {c.requisitos}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => verPostulados(c)}>
                            Postulados ({c._count?.postulados || 0})
                          </button>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => borrarConv(c)}>
                            Eliminar
                          </button>
                        </div>

                        {abierta && (
                          <div style={{ marginTop: 12, borderTop: '1px solid #e5e2da', paddingTop: 12 }}>
                            <form onSubmit={(e) => agregarPostulado(e, c.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, marginBottom: 12 }}>
                              <input required placeholder="Nombre" style={input} value={formPostulado.nombre} onChange={(e) => setFormPostulado((f) => ({ ...f, nombre: e.target.value }))} />
                              <input required placeholder="Documento" style={input} value={formPostulado.documento} onChange={(e) => setFormPostulado((f) => ({ ...f, documento: e.target.value }))} />
                              <input placeholder="Correo" style={input} value={formPostulado.correo} onChange={(e) => setFormPostulado((f) => ({ ...f, correo: e.target.value }))} />
                              <button className="btn" type="submit" disabled={guardando}>Postular</button>
                            </form>

                            {!lista && !error && <div data-cargando="1" style={{ fontSize: 12, color: '#9c988e' }}>Cargando postulados…</div>}
                            {lista && lista.length === 0 && (
                              <div style={{ fontSize: 12, color: '#9c988e' }}>Todavía nadie se ha postulado para este cargo.</div>
                            )}
                            {lista && lista.length > 0 && (
                              <div className="reg-lista" style={{ marginTop: 8 }}>
                                {lista.map((p) => (
                                  <div key={p.id} className="reg-card">
                                    <div className="reg-id">
                                      <div className="reg-nombre">{p.nombre}</div>
                                      <div className="reg-sub">{p.documento}</div>
                                    </div>
                                    <div className="reg-datos">
                                      <div className="reg-dato">
                                        <span className="reg-etq">Puntaje</span>
                                        <input
                                          type="number" min="0" max="100" defaultValue={p.puntaje || 0}
                                          style={{ ...input, width: 80, padding: '5px 8px' }}
                                          onBlur={async (e) => {
                                            const v = e.target.value === '' ? null : Number(e.target.value);
                                            if (v === (p.puntaje || 0)) return;
                                            try {
                                              const r = await actualizarPuntaje(p.id, v);
                                              setPostulados((m) => ({ ...m, [c.id]: m[c.id].map((x) => (x.id === p.id ? { ...x, ...r } : x)) }));
                                            } catch (err) { avisar(`No se guardó el puntaje: ${err.message}`, 'error'); }
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="reg-estado" />
                                    <div className="reg-acciones">
                                      <Select label="Estado" value={p.estado} onChange={(v) => calificarPostulado(c.id, p, v)} groups={[{ options: ESTADOS_POSTULADO.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })) }]} />
                                    </div>
                                  </div>
                                ))}
                              </div>
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
                    <EstadoVacio mensaje="No hay capacitaciones programadas." />
                  )}
                  {capacitaciones.map((c) => {
                    const lleno = c.inscritos >= c.cupos;
                    return (
                      <div key={c.id} style={{ ...card, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{c.nombre}</div>
                            <div style={{ fontSize: 11, color: '#9c988e' }}>{formatDate(c.fecha)} ? {c.horas} horas</div>
                          </div>
                          <EstadoBadge estado={c.estado} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ flex: 1, height: 16, background: '#f0eee9', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (c.inscritos / c.cupos) * 100)}%`, height: '100%', background: lleno ? '#ff314d' : 'linear-gradient(90deg,#00116f,#0a84ff)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 92, textAlign: 'right' }}>
                            {c.inscritos}/{c.cupos}
                          </span>
                          {lleno && <span style={{ fontSize: 11, fontWeight: 700, color: '#c1122c' }}>Cupo lleno</span>}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => inscribir(c, Math.max(0, c.inscritos - 1))}>- Quitar</button>
                          <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => inscribir(c, c.inscritos + 1)} disabled={lleno}>+ Inscribir</button>
                          <Select label="Estado" value={c.estado} onChange={(v) => avanzarCap(c, v)} groups={[{ options: ESTADOS_CAPACITACION.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })) }]} />
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
              <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 16 }}>
                Asignaturas y Créditos del pensum asignados a cada docente.
              </div>
              {conCarga.map(({ d, n, cr }) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                  <div style={{ width: 185, fontSize: 12, fontWeight: 600 }}>{d.nombre}</div>
                  <div style={{ flex: 1, height: 18, background: '#f0eee9', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${(cr / maxCr) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#00116f,#0a84ff)' }} />
                  </div>
                  <div style={{ width: 60, fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{n} asign.</div>
                  <div style={{ width: 48, fontSize: 12, textAlign: 'right', color: '#6f6b62' }}>{cr} cr</div>
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
              <div className="reg-lista">
                {Object.values(areas).sort((a, b) => b.docentes - a.docentes).map((a) => (
                  <div key={a.area} className="reg-card">
                    <div className="reg-id">
                      <div className="reg-nombre">{a.area}</div>
                    </div>
                    <div className="reg-datos">
                      <div className="reg-dato">
                        <span className="reg-etq">Docentes</span>
                        <span style={{ fontWeight: 700 }}>{a.docentes}</span>
                      </div>
                      <div className="reg-dato">
                        <span className="reg-etq">Créditos a su cargo</span>
                        <span>{a.cr || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (tab === 'nomina') {
          const nominaSel = nominas[0] || null;
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ display: 'grid', gap: 14 }}>
                <div style={card}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Corridas de Nómina</div>
                  <div style={{ fontSize: 12, color: '#6f6b62', marginTop: 4 }}>
                    La corrida de nómina la genera Contabilidad. Desde Talento Humano se consultan las corridas y sus liquidaciones para poder expedir los certificados.
                  </div>
                </div>

                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Corridas</div><div style={{ fontSize: 24, fontWeight: 800 }}>{nominas.length}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Último periodo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{nominaSel?.periodo || '—'}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Neto último periodo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{nominaSel ? `$${Number(nominaSel.totalNeto).toLocaleString('es-CO')}` : '—'}</div></div>
                  </div>

                  {!cargando && nominas.length === 0 && (
                    <EstadoVacio mensaje="No hay corridas de nómina. Contabilidad las genera." />
                  )}

                  {nominas.length > 0 && (
                    <div style={card}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Corridas generadas</div>
                      <div className="reg-lista">
                        {nominas.map((n) => (
                          <div key={n.id} className="reg-card">
                            <div className="reg-id">
                              <div className="reg-nombre">{n.periodo}</div>
                              <div className="reg-sub">{formatDate(n.fechaPago)}</div>
                            </div>
                            <div className="reg-datos">
                              <div className="reg-dato">
                                <span className="reg-etq">Estado</span>
                                <EstadoBadge estado={n.estado} />
                              </div>
                              <div className="reg-dato">
                                <span className="reg-etq">Devengado</span>
                                <span>${Number(n.totalDevengado).toLocaleString('es-CO')}</span>
                              </div>
                              <div className="reg-dato">
                                <span className="reg-etq">Neto</span>
                                <span style={{ fontWeight: 700 }}>${Number(n.totalNeto).toLocaleString('es-CO')}</span>
                              </div>
                              <div className="reg-dato">
                                <span className="reg-etq">Liquidaciones</span>
                                <span>{n._count?.liquidaciones ?? 0}</span>
                              </div>
                            </div>
                            <div className="reg-estado" />
                            <div className="reg-acciones">
                              <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => verDetalle(n.id)}>Ver detalle</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detalleNomina && (
                    <div style={{ ...card, marginTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>Corrida {detalleNomina.periodo}</div>
                        <button onClick={() => setDetalleNomina(null)}>Cerrar</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
                        <div style={{ background: '#f7f6f3', borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: '#6f6b62' }}>Devengado</div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{Number(detalleNomina.totalDevengado).toLocaleString('es-CO')}</div>
                        </div>
                        <div style={{ background: '#f7f6f3', borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: '#6f6b62' }}>Deducciones</div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{Number(detalleNomina.totalDeducciones).toLocaleString('es-CO')}</div>
                        </div>
                        <div style={{ background: '#f7f6f3', borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: '#6f6b62' }}>Neto a pagar</div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{Number(detalleNomina.totalNeto).toLocaleString('es-CO')}</div>
                        </div>
                        <div style={{ background: '#f7f6f3', borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: '#6f6b62' }}>UVT / SMLMV</div>
                           <div style={{ fontSize: 12 }}>{detalleNomina.smlmv ? `$${Number(detalleNomina.smlmv).toLocaleString('es-CO')}` : '—'} / {detalleNomina.uvt != null ? Number(detalleNomina.uvt).toLocaleString('es-CO') : '—'}</div>
                        </div>
                      </div>
                      <div className="reg-lista">
                        {(detalleNomina.liquidaciones || []).map((l) => (
                          <div key={l.id} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="reg-card">
                              <Avatar nombre={l.nombre} clase="av-teal" tamano={40} radio={20} />
                              <div className="reg-id">
                                <div className="reg-nombre">{l.nombre}</div>
                                <div className="reg-sub">{l.tipoPersona === 'docente' ? 'Docente' : 'Empleado'}{l.cargo ? ` · ${l.cargo}` : ''}</div>
                              </div>
                              <div className="reg-datos">
                                <div className="reg-dato">
                                  <span className="reg-etq">Base</span>
                                  <span>${Number(l.salarioBase).toLocaleString('es-CO')}</span>
                                </div>
                                <div className="reg-dato">
                                  <span className="reg-etq">Devengado</span>
                                  <span style={{ color: '#0a6e4b', fontWeight: 600 }}>${Number(l.devengado).toLocaleString('es-CO')}</span>
                                </div>
                                <div className="reg-dato">
                                  <span className="reg-etq">Deducciones</span>
                                  <span style={{ color: '#c1122c' }}>-${Number(l.deducciones).toLocaleString('es-CO')}</span>
                                </div>
                                <div className="reg-dato">
                                  <span className="reg-etq">Neto</span>
                                  <span style={{ fontWeight: 700 }}>${Number(l.neto).toLocaleString('es-CO')}</span>
                                </div>
                                <div className="reg-dato">
                                  <span className="reg-etq">Retención</span>
                                  <span>${Number(l.retencion).toLocaleString('es-CO')}</span>
                                </div>
                              </div>
                              <div className="reg-estado" />
                              <div className="reg-acciones">
                                <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setConceptosNomina(conceptosNomina === l.id ? null : l.id)}>
                                  {conceptosNomina === l.id ? 'Ocultar' : 'Conceptos'}
                                </button>
                              </div>
                            </div>
                            {conceptosNomina === l.id && (
                              <div style={{ background: '#f7f6f3', border: '1px solid #e5e2da', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '10px 18px 14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                                  {(l.conceptos || []).map((c) => (
                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', border: '1px solid #e5e2da', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                                      <span>{c.nombre}</span>
                                      <span style={{ fontWeight: 700, color: c.tipo === 'deduccion' ? '#c1122c' : '#0a6e4b' }}>
                                        {c.tipo === 'deduccion' ? '-' : ''}${Number(c.valor).toLocaleString('es-CO')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'certificados') {
          const empleadosData = data.empleados || [];
          const pideNomina = formCert.tipo === 'ingresos_retenciones';
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 14, alignItems: 'start' }}>
                <form style={card} onSubmit={emitirCertificado}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Emitir certificado laboral</div>
                  <div style={{ marginBottom: 10 }}>
                    <Select label="Empleado" value={String(formCert.empleadoId || '')} onChange={(v) => setFormCert((f) => ({ ...f, empleadoId: v }))} groups={[{ options: [
                      { value: '', label: 'Seleccione…' },
                      ...empleadosData.map((emp) => ({ value: String(emp.id), label: `${emp.nombre} ? ${emp.cargo}` })),
                    ] }]} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <Select label="Tipo de certificado" value={formCert.tipo} onChange={(v) => setFormCert((f) => ({ ...f, tipo: v }))} groups={[{ options: [
                      { value: 'constancia_laboral', label: 'Constancia laboral' },
                      { value: 'certificado_ingresos', label: 'Certificado de ingresos' },
                      { value: 'ingresos_retenciones', label: 'Ingresos y retenciones' },
                    ] }]} />
                  </div>
                  {pideNomina && (
                    <div style={{ marginBottom: 10 }}>
                      <Select label="Corrida de nómina del periodo" value={String(formCert.nominaId || '')} onChange={(v) => setFormCert((f) => ({ ...f, nominaId: v }))} groups={[{ options: [
                        { value: '', label: 'Seleccione…' },
                        ...nominas.map((n) => ({ value: String(n.id), label: n.periodo })),
                      ] }]} />
                      {nominas.length === 0 && (
                        <div style={{ fontSize: 11, color: '#c1122c', marginTop: 4 }}>No hay corridas: primero liquide el mes en Contabilidad.</div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#6f6b62', marginBottom: 12 }}>
                    Cada certificado se firma en el servidor con folio y código de verificación. No se duplica uno del mismo tipo y periodo.
                  </div>
                  <button className="btn" type="submit" disabled={guardando || !empleadosData.length}>{guardando ? 'Emitiendo…' : 'Emitir'}</button>
                </form>

                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Emitidos</div><div style={{ fontSize: 24, fontWeight: 800 }}>{certificados.length}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Constancias</div><div style={{ fontSize: 24, fontWeight: 800 }}>{certificados.filter((c) => c.tipo === 'constancia_laboral').length}</div></div>
                    <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Ingresos y retenciones</div><div style={{ fontSize: 24, fontWeight: 800 }}>{certificados.filter((c) => c.tipo === 'ingresos_retenciones').length}</div></div>
                  </div>

                  {cargando && <div data-cargando="1" style={card}>Cargando certificados…</div>}

                  {!cargando && certificados.length === 0 && (
                    <EstadoVacio mensaje="Aún no se han emitido certificados laborales." />
                  )}

                  {certificados.length > 0 && (
                    <div style={card}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Certificados emitidos</div>
                      <div className="reg-lista">
                        {certificados.map((c) => (
                          <div key={c.id} className="reg-card">
                            <div className="reg-id">
                              <div className="reg-nombre">{c.empleado?.nombre}</div>
                              <div className="reg-sub">{c.empleado?.cargo}</div>
                            </div>
                            <div className="reg-datos">
                              <div className="reg-dato">
                                <span className="reg-etq">Tipo</span>
                                <EstadoBadge estado={c.tipo} />
                              </div>
                              <div className="reg-dato">
                                <span className="reg-etq">Periodo</span>
                                <span>{c.periodo || '—'}</span>
                              </div>
                              <div className="reg-dato">
                                <span className="reg-etq">Fecha</span>
                                <span>{formatDate(c.fecha)}</span>
                              </div>
                              <div className="reg-dato">
                                <span className="reg-etq">Emitido por</span>
                                <span>{c.emisor?.nombre || '—'}</span>
                              </div>
                            </div>
                            <div className="reg-estado">
                              <span style={{ fontSize: 11, color: '#9c988e' }}>#{c.id}</span>
                            </div>
                            <div className="reg-acciones">
                              <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} disabled={descargando} onClick={() => descargarCert(c.id)}>
                                {descargando ? 'Descargando…' : 'Descargar PDF'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'novedades') {
          const empleadosData = data.empleados || [];
          const docentesData = data.docentes || [];
          const personas = [
            ...empleadosData.map((e) => ({ id: `e:${e.id}`, nombre: `${e.nombre} · Empleado (${e.cargo})` })),
            ...docentesData.map((d) => ({ id: `d:${d.id}`, nombre: `${d.nombre} · Docente (${d.categoria || d.area})` })),
          ];
          const campos = necesita(formNovedad.tipo);
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 14, alignItems: 'start' }}>
                <form style={card} onSubmit={reportarNovedad}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Reportar novedad</div>
                  <div style={{ marginBottom: 10 }}>
                    <Select label="Persona" value={formNovedad.persona} onChange={(v) => setFormNovedad((f) => ({ ...f, persona: v }))} groups={[{ options: [
                      { value: '', label: 'Seleccione…' },
                      ...personas.map((p) => ({ value: p.id, label: p.nombre })),
                    ] }]} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <Select label="Tipo" value={formNovedad.tipo} onChange={(v) => setFormNovedad((f) => ({ ...f, tipo: v }))} groups={[{ options: TIPOS_NOVEDAD.map((t) => ({ value: t.value, label: t.label })) }]} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={label}>Periodo (AAAA-MM)</span>
                    <input required pattern="\d{4}-\d{2}" value={formNovedad.periodo} style={{ ...input, width: '100%' }} onChange={(e) => setFormNovedad((f) => ({ ...f, periodo: e.target.value }))} />
                  </div>
                  {campos.includes('modalidad') && (
                    <div style={{ marginBottom: 10 }}>
                      <Select label="Modalidad" value={formNovedad.modalidad} onChange={(v) => setFormNovedad((f) => ({ ...f, modalidad: v }))} groups={[{ options: [
                        { value: 'no_remunerada', label: 'No remunerada' },
                        { value: 'remunerada', label: 'Remunerada' },
                      ] }]} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <span style={label}>Fecha inicio</span>
                      <input type="date" value={formNovedad.fechaInicio} style={{ ...input, width: '100%' }} onChange={(e) => setFormNovedad((f) => ({ ...f, fechaInicio: e.target.value }))} />
                    </div>
                    <div>
                      <span style={label}>Fecha fin</span>
                      <input type="date" value={formNovedad.fechaFin} style={{ ...input, width: '100%' }} onChange={(e) => setFormNovedad((f) => ({ ...f, fechaFin: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {campos.includes('dias') && (
                      <div>
                        <span style={label}>Días</span>
                        <input type="number" min="1" value={formNovedad.dias} style={{ ...input, width: '100%' }} onChange={(e) => setFormNovedad((f) => ({ ...f, dias: e.target.value }))} />
                      </div>
                    )}
                    {campos.includes('horas') && (
                      <div>
                        <span style={label}>Horas</span>
                        <input type="number" min="1" step="0.5" value={formNovedad.horas} style={{ ...input, width: '100%' }} onChange={(e) => setFormNovedad((f) => ({ ...f, horas: e.target.value }))} />
                      </div>
                    )}
                    {campos.includes('valor') && (
                      <div>
                        <span style={label}>Valor ($)</span>
                        <input type="number" min="0" value={formNovedad.valor} style={{ ...input, width: '100%' }} onChange={(e) => setFormNovedad((f) => ({ ...f, valor: e.target.value }))} />
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={label}>Descripción</span>
                    <input value={formNovedad.descripcion} style={{ ...input, width: '100%' }} onChange={(e) => setFormNovedad((f) => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                  <button className="btn" type="submit" disabled={guardando || !formNovedadCompleto()}>{guardando ? 'Reportando…' : 'Reportar a Contabilidad'}</button>
                </form>
                <div style={card}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Novedades reportadas</div>
                  {(!novedades || novedades.length === 0) && (
                    <EstadoVacio mensaje="Sin novedades reportadas." />
                  )}
                  <div className="reg-lista">
                    {(novedades || []).map((n) => (
                      <div key={n.id} className="reg-card">
                        <Avatar nombre={n.nombre} clase="av-orange" tamano={40} radio={20} />
                        <div className="reg-id">
                          <div className="reg-nombre">{n.nombre}</div>
                          <div className="reg-sub">{n.periodo}</div>
                        </div>
                        <div className="reg-datos">
                          <div className="reg-dato">
                            <span className="reg-etq">Tipo</span>
                            <span>{ETIQUETA_NOVEDAD[n.tipo] || n.tipo}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Valor</span>
                            <span style={{ fontWeight: 700 }}>${Number(n.valor || 0).toLocaleString('es-CO')}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Descripción</span>
                            <span>{n.descripcion || '—'}</span>
                          </div>
                        </div>
                        <div className="reg-estado">
                          <EstadoBadge estado={n.estado} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        }
      }}
    </ModuleLayout>
  );
}
