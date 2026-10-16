/* =============================================


   Módulo de Contabilidad.


   Recaudo y cartera de toda la institución,


   egresos con su aprobación y conciliación


   bancaria de cada cobro.


   ============================================= */


import React, { useCallback, useEffect, useMemo, useState } from 'react';


import ModuleLayout from '../components/ModuleLayout';


import {


  actualizarGasto,


  conciliarCobro,


  crearGasto,


  listarCobros,
  obtenerConciliacion,


  listarGastos,
  listarNominas,
  crearNomina,
  obtenerNomina,
  listarNovedadesContabilidad,
  ajustarNovedad,
} from '../api/client';


import { formatCurrency, formatDate } from '../data/mockData';
import { descargarExcel } from '../utils/excel';
import { EstadoVacio } from '../components/Estado';











const TABS = [
  { key: 'recaudo', label: 'Recaudo', icon: 'billete' },
  { key: 'cartera', label: 'Cartera', icon: 'tarjeta-credito' },
  { key: 'conciliacion', label: 'Conciliación', icon: 'banco' },
  { key: 'egresos', label: 'Egresos', icon: 'tendencia-abajo' },
  { key: 'nomina', label: 'Nómina', icon: 'billete' },
  { key: 'novedades', label: 'Novedades', icon: 'cuaderno' },
];

/* Novedades de nómina: Talento Humano las reporta y Contabilidad las revisa y,
   si hace falta, corrige el valor antes de generar la corrida del periodo. La
   corrida toma las novedades "reportadas" de su mes y las deja "aplicadas". */
const ETIQUETA_NOVEDAD = {
  incapacidad: 'Incapacidad',
  licencia: 'Licencia o permiso',
  vacaciones: 'Vacaciones',
  retiro: 'Retiro o renuncia',
  bonificacion: 'Bonificación',
  horas_extra: 'Horas extra',
  descuento: 'Descuento (préstamo, libranza)',
};
const ETIQUETA_AJUSTE = { ingreso: 'Suma al neto', descuento: 'Resta del neto', ninguno: 'No mueve el neto' };
const TONO_ESTADO_NOVEDAD = { reportada: '#99610e', aplicada: '#0a6e4b', anulada: '#6f6b62' };

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da' };


const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9' };


const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };


const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cdc9bf', fontSize: 13, background: '#fff' };


const label = { fontSize: 11, fontWeight: 700, color: '#6f6b62', display: 'block', marginBottom: 4 };





const CATEGORIAS = ['Docencia', 'Administración', 'Infraestructura', 'Investigación', 'Bienestar', 'Vinculación'];


const ESTADOS_GASTO = ['registrado', 'aprobado', 'pagado', 'anulado'];





const COLOR_ESTADO = { pagado: '#0a6e4b', vencido: '#c1122c', pendiente: '#99610e' };


const COLOR_GASTO = { pagado: '#0a6e4b', aprobado: '#06468c', registrado: '#99610e', anulado: '#6f6b62' };





const Badge = ({ children, color }) => (


  <span style={{ background: `${color}1a`, color, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>


    {children}


  </span>


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





export default function Contabilidad() {


  // El bootstrap solo trae los pagos del estudiante de la demo, así que


  // Contabilidad pide los cobros y los egresos completos a la API.


  const [cobros, setCobros] = useState([]);
  const [conciliacion, setConciliacion] = useState(null);


  const [egresos, setEgresos] = useState({ gastos: [], porCategoria: [], total: 0 });


  const [cargando, setCargando] = useState(true);

  const [nominas, setNóminas] = useState([]);

  const [formNómina, setFormNómina] = useState({ periodo: '', fechaPago: '', uvt: '', smlmv: '' });

  const [detalleNómina, setDetalleNómina] = useState(null);

  const [conceptosNómina, setConceptosNómina] = useState(null);
  const [novedades, setNovedades] = useState([]);
  /* Borrador editable por novedad: { [id]: { valor, tipoAjuste } }. Se llena al
     escribir y se envía al servidor con "Guardar ajuste". */
  const [borradorNovedad, setBorradorNovedad] = useState({});
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);


  const [filtroEstado, setFiltroEstado] = useState('todos');


  const [busqueda, setBusqueda] = useState('');


  const [conciliando, setConciliando] = useState(null);


  const [referencia, setReferencia] = useState('');


  const [formGasto, setFormGasto] = useState({


    concepto: '', categoria: 'Docencia', dependencia: '', valor: '', fecha: '', comprobante: '',


  });


  const [guardando, setGuardando] = useState(false);


  const [error, setError] = useState('');


  const [exito, setExito] = useState('');





  const avisar = (msg, tono = 'ok') => {


    if (tono === 'error') { setError(msg); setExito(''); } else { setExito(msg); setError(''); }


  };





  const cargar = useCallback(async () => {
    try {
      /* Cobros y egresos son los datos financieros propios del módulo: si uno
         falla no hay pantalla. La nómina se pide aparte para que un rechazo
         (rol sin permiso, API reiniciando) no vacíe la cartera. */
      const [c, g] = await Promise.all([listarCobros(), listarGastos()]);
      setCobros(c);
      setEgresos(g);
      setError('');
    } catch (err) {
      setCobros([]);
      setEgresos({ gastos: [], porCategoria: [], total: 0 });
      setError(`No se pudieron cargar los datos financieros: ${err.message}`);
    } finally {
      setCargando(false);
    }
    try {
      setNóminas(await listarNominas());
    } catch {
      setNóminas([]);
    }
    try {
      setNovedades(await listarNovedadesContabilidad());
    } catch {
      setNovedades([]);
    }
    try {
      setConciliacion(await obtenerConciliacion());
    } catch {
      setConciliacion(null);
    }
  }, []);


  const recargarNóminas = useCallback(async () => {
    try {
      setNóminas(await listarNominas());
    } catch {
      setNóminas([]);
    }
  }, []);


  const recargarNovedades = useCallback(async () => {
    try {
      setNovedades(await listarNovedadesContabilidad());
    } catch {
      setNovedades([]);
    }
  }, []);


  const crearCorrida = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const cuerpo = { periodo: formNómina.periodo };
      if (formNómina.fechaPago) cuerpo.fechaPago = formNómina.fechaPago;
      if (formNómina.uvt) cuerpo.uvt = Number(formNómina.uvt);
      if (formNómina.smlmv) cuerpo.smlmv = Number(formNómina.smlmv);
      const creada = await crearNomina(cuerpo);
      avisar(`Corrida ${creada.periodo} generada sobre ${creada.personas ?? 0} personas.`);
      setFormNómina({ periodo: '', fechaPago: '', uvt: '', smlmv: '' });
      await recargarNóminas();
      await recargarNovedades();
      setDetalleNómina(await obtenerNomina(creada.id));
    } catch (err) {
      avisar(`No se pudo generar la corrida: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };


  const verDetalleNómina = async (id) => {
    try {
      setDetalleNómina(await obtenerNomina(id));
      setConceptosNómina(null);
      setError('');
    } catch (err) {
      avisar(`No se pudo cargar la corrida: ${err.message}`, 'error');
    }
  };


  /* Valor y tipo de ajuste que Contabilidad va a mandar: lo que escribió en la
     fila o, si aún no la toca, el valor que sugirió Talento Humano. */
  const borradorDe = (n) => borradorNovedad[n.id] || { valor: n.valor, tipoAjuste: n.tipoAjuste };

  const guardarAjusteNovedad = async (n) => {
    const b = borradorDe(n);
    setGuardandoNovedad(true);
    try {
      await ajustarNovedad(n.id, { valor: Number(b.valor) || 0, tipoAjuste: b.tipoAjuste });
      avisar(`Novedad de ${n.nombre} ajustada a $${Number(b.valor || 0).toLocaleString('es-CO')}.`);
      await recargarNovedades();
    } catch (err) {
      avisar(`No se pudo ajustar la novedad: ${err.message}`, 'error');
    } finally {
      setGuardandoNovedad(false);
    }
  };

  const anularNovedad = async (n) => {
    setGuardandoNovedad(true);
    try {
      await ajustarNovedad(n.id, { estado: 'anulada' });
      avisar(`Novedad de ${n.nombre} anulada: no se aplicará a la corrida.`);
      await recargarNovedades();
    } catch (err) {
      avisar(`No se pudo anular la novedad: ${err.message}`, 'error');
    } finally {
      setGuardandoNovedad(false);
    }
  };





  useEffect(() => {


    cargar();


  }, [cargar]);





  const pagados = useMemo(() => cobros.filter((p) => p.estado === 'pagado'), [cobros]);


  const pendientes = useMemo(() => cobros.filter((p) => p.estado !== 'pagado'), [cobros]);


  const recaudado = useMemo(() => pagados.reduce((a, p) => a + p.valor, 0), [pagados]);


  const cartera = useMemo(() => pendientes.reduce((a, p) => a + p.valor, 0), [pendientes]);


  const vencidos = useMemo(() => cobros.filter((p) => p.estado === 'vencido'), [cobros]);





  const visibles = useMemo(() => {


    const t = busqueda.trim().toLowerCase();


    return cobros.filter((p) => {


      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;


      if (!t) return true;


      return [p.estudiante, p.concepto, p.programa, p.documento].filter(Boolean).some((x) => String(x).toLowerCase().includes(t));


    });


  }, [cobros, filtroEstado, busqueda]);

  const exportarCartera = () => {
    const filas = visibles.map((p) => [
      p.estudiante,
      p.documento,
      p.programa || '—',
      p.concepto,
      formatDate(p.fechaLimite),
      p.valor,
      p.estado,
    ]);
    descargarExcel(`Cartera_Contabilidad_${new Date().toISOString().slice(0, 10)}`, {
      nombre: 'Cartera',
      columnas: [
        { titulo: 'Estudiante', ancho: 32 },
        { titulo: 'Documento', ancho: 16 },
        { titulo: 'Programa', ancho: 28 },
        { titulo: 'Concepto', ancho: 24 },
        { titulo: 'Límite', ancho: 14 },
        { titulo: 'Valor', ancho: 16, moneda: true },
        { titulo: 'Estado', ancho: 14 },
      ],
      filas,
    });
  };





  /* -- Conciliación ---------------------------------------------------- */





  const abrirConciliacion = (p) => {


    setConciliando(p);


    setReferencia(p.referencia || '');


    setError('');


  };





  const confirmarConciliacion = async () => {


    setGuardando(true);


    try {


      const r = await conciliarCobro(conciliando.id, { estado: 'pagado', referencia: referencia.trim() || null });


      setCobros((lista) => lista.map((x) => (x.id === r.id ? { ...x, ...r } : x)));


      setConciliando(null);


      avisar(`Pago de ${conciliando.estudiante} conciliado.`);


    } catch (err) {


      avisar(`No se concilió: ${err.message}`, 'error');


    } finally {


      setGuardando(false);


    }


  };





  const revertir = async (p) => {


    try {


      const r = await conciliarCobro(p.id, { estado: 'pendiente', referencia: null });


      setCobros((lista) => lista.map((x) => (x.id === r.id ? { ...x, ...r } : x)));


      avisar(`Pago de ${p.estudiante} volvió a pendiente.`);


    } catch (err) {


      avisar(`No se revirtió: ${err.message}`, 'error');


    }


  };





  /* -- Egresos --------------------------------------------------------- */





  const registrarGasto = async (e) => {


    e.preventDefault();


    setGuardando(true);


    try {


      const g = await crearGasto({


        ...formGasto,


        valor: Number(formGasto.valor),


        fecha: formGasto.fecha || null,


        dependencia: formGasto.dependencia.trim() || null,


        comprobante: formGasto.comprobante.trim() || null,


      });


      setEgresos((x) => ({


        gastos: [g, ...x.gastos],


        total: x.total + g.valor,


        porCategoria: [...x.porCategoria.filter((c) => c.categoria !== g.categoria), {


          categoria: g.categoria,


          total: (x.porCategoria.find((c) => c.categoria === g.categoria)?.total || 0) + g.valor,


          n: (x.porCategoria.find((c) => c.categoria === g.categoria)?.n || 0) + 1,


        }].sort((a, b) => b.total - a.total),


      }));


      setFormGasto({ concepto: '', categoria: 'Docencia', dependencia: '', valor: '', fecha: '', comprobante: '' });


      avisar('Egreso registrado.');


    } catch (err) {


      avisar(`No se registró el egreso: ${err.message}`, 'error');


    } finally {


      setGuardando(false);


    }


  };





  const cambiarEstadoGasto = async (g, estado) => {


    try {


      const r = await actualizarGasto(g.id, { estado });


      setEgresos((x) => ({ ...x, gastos: x.gastos.map((y) => (y.id === g.id ? { ...y, ...r } : y)) }));


      avisar(`"${g.concepto}" quedó ${estado}.`);


    } catch (err) {


      avisar(`No se cambió el estado: ${err.message}`, 'error');


    }


  };





  return (


    <ModuleLayout title="Contabilidad" subtitle="Recaudo, cartera, egresos, nómina, novedades y conciliación bancaria" tabs={TABS}>


      {({ tab }) => {


        if (cargando) return <div data-cargando="1" style={{ ...card, textAlign: 'center', color: '#9c988e' }}>Cargando información financiera…</div>;





        if (tab === 'recaudo') {


          return (


            <div>


              <Aviso>{error}</Aviso>


              <Aviso tone="ok">{exito}</Aviso>





              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Recaudado</div><div style={{ fontSize: 24, fontWeight: 800, color: '#0a6e4b' }}>{formatCurrency(recaudado)}</div><div style={{ fontSize: 11, color: '#9c988e' }}>{pagados.length} cobros</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Por cobrar</div><div style={{ fontSize: 24, fontWeight: 800, color: '#99610e' }}>{formatCurrency(cartera)}</div><div style={{ fontSize: 11, color: '#9c988e' }}>{pendientes.length} cobros</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Tasa de recaudo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{recaudado + cartera ? Math.round((recaudado / (recaudado + cartera)) * 100) : 0}%</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Facturado por estudiante</div><div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(Math.round((recaudado + cartera) / Math.max(1, cobros.length)))}</div><div style={{ fontSize: 11, color: '#9c988e' }}>{cobros.length} registros</div></div>


              </div>





              <div style={{ ...card, overflowX: 'auto' }}>


                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Cobros del semestre</div>


                <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 14 }}>


                  Todos los estudiantes de la institución, no solo la cuenta de la demo.


                </div>


                <table style={{ width: '100%', borderCollapse: 'collapse' }}>


                  <thead>


                    <tr><th style={th}>Estudiante</th><th style={th}>Programa</th><th style={th}>Concepto</th><th style={th}>Límite</th><th style={th}>Valor</th><th style={th}>Referencia</th><th style={th}>Estado</th></tr>


                  </thead>


                  <tbody>


                    {cobros.slice(0, 40).map((p) => (


                      <tr key={p.id}>


                        <td style={td}>{p.estudiante}</td>


                        <td style={td}>{p.programa || '-'}</td>


                        <td style={td}>{p.concepto}</td>


                        <td style={td}>{formatDate(p.fechaLimite)}</td>


                        <td style={td}>{formatCurrency(p.valor)}</td>


                        <td style={td}>{p.referencia || '-'}</td>


                        <td style={td}><Badge color={COLOR_ESTADO[p.estado]}>{p.estado}</Badge></td>


                      </tr>


                    ))}


                  </tbody>


                </table>


                {cobros.length > 40 && (


                  <div style={{ fontSize: 11, color: '#9c988e', marginTop: 10 }}>


                    Mostrando 40 de {cobros.length} cobros. Use la pestaña Cartera para filtrar y conciliar.


                  </div>


                )}


              </div>


            </div>


          );


        }





        if (tab === 'cartera') {


          return (


            <div>


              <Aviso>{error}</Aviso>


              <Aviso tone="ok">{exito}</Aviso>





              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 16 }}>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Cartera total</div><div style={{ fontSize: 24, fontWeight: 800, color: '#99610e' }}>{formatCurrency(cartera)}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Pendientes</div><div style={{ fontSize: 24, fontWeight: 800 }}>{pendientes.filter((p) => p.estado === 'pendiente').length}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Vencidos</div><div style={{ fontSize: 24, fontWeight: 800, color: '#c1122c' }}>{vencidos.length}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Programas con cartera</div><div style={{ fontSize: 24, fontWeight: 800 }}>{new Set(pendientes.map((p) => p.programa)).size}</div></div>


              </div>





              <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>


                <span style={{ fontSize: 12, fontWeight: 700, color: '#6f6b62' }}>Estado:</span>


                <select value={filtroEstado} style={input} onChange={(e) => setFiltroEstado(e.target.value)}>


                  <option value="todos">Todos</option>


                  <option value="pendiente">Pendiente</option>


                  <option value="vencido">Vencido</option>


                  <option value="pagado">Pagado</option>


                </select>


                <input


                  placeholder="Buscar estudiante, concepto o documento"


                  style={{ ...input, flex: 1, minWidth: 220 }}


                  value={busqueda}


                  onChange={(e) => setBusqueda(e.target.value)}


                />


                <span style={{ fontSize: 11, color: '#9c988e' }}>{visibles.length} de {cobros.length}</span>


                <button

                  className="btn"

                  style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12 }}

                  onClick={exportarCartera}

                  disabled={visibles.length === 0}

                >

                  Exportar a Excel

                </button>


              </div>





              <div style={{ ...card, overflowX: 'auto' }}>


                <table style={{ width: '100%', borderCollapse: 'collapse' }}>


                  <thead>


                    <tr><th style={th}>Estudiante</th><th style={th}>Programa</th><th style={th}>Concepto</th><th style={th}>Límite</th><th style={th}>Valor</th><th style={th}>Estado</th><th style={th}>Acción</th></tr>


                  </thead>


                  <tbody>


                    {visibles.slice(0, 60).map((p) => (


                      <tr key={p.id}>


                        <td style={td}><strong>{p.estudiante}</strong><br /><span style={{ fontSize: 11, color: '#9c988e' }}>{p.documento}</span></td>


                        <td style={td}>{p.programa || '-'}</td>


                        <td style={td}>{p.concepto}</td>


                        <td style={td}>{formatDate(p.fechaLimite)}</td>


                        <td style={td}>{formatCurrency(p.valor)}</td>


                        <td style={td}><Badge color={COLOR_ESTADO[p.estado]}>{p.estado}</Badge></td>


                        <td style={td}>


                          {p.estado === 'pagado' ? (


                            <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => revertir(p)}>Revertir</button>


                          ) : (


                            <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => abrirConciliacion(p)}>Conciliar</button>


                          )}


                        </td>


                      </tr>


                    ))}


                  </tbody>


                </table>


                {visibles.length === 0 && (


                  <div style={{ textAlign: 'center', color: '#9c988e', padding: 20 }}>Ningún cobro coincide con el filtro.</div>


                )}


              </div>


            </div>


          );


        }





        if (tab === 'conciliacion') {


          return (


            <div>


              <Aviso>{error}</Aviso>


              <Aviso tone="ok">{exito}</Aviso>





              {conciliacion && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div style={card}>
                    <div style={{ fontSize: 11, color: '#9c988e', fontWeight: 700 }}>Cobros totales</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{conciliacion.resumen.total}</div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 11, color: '#9c988e', fontWeight: 700 }}>Por conciliar</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#e0a52e' }}>{conciliacion.resumen.porEstado.pendiente}</div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 11, color: '#9c988e', fontWeight: 700 }}>Vencidos</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#c0392b' }}>{conciliacion.resumen.porEstado.vencido}</div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 11, color: '#9c988e', fontWeight: 700 }}>Valor conciliado</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#17a06d' }}>{formatCurrency(conciliacion.resumen.valorPorEstado.pagado)}</div>
                  </div>
                </div>
              )}


              <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 360px)', gap: 14, alignItems: 'start' }}>


                <div style={card}>


                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Cola de conciliación</div>


                  <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 14 }}>


                    Cobros sin confirmar contra el banco. Al conciliar se registra la referencia de la transacción.


                  </div>


                  {pendientes.length === 0 && (


                    <EstadoVacio mensaje="No hay cobros pendientes de conciliar." />


                  )}


                  {pendientes.slice(0, 20).map((p) => (


                    <div


                      key={p.id}


                      onClick={() => abrirConciliacion(p)}


                      style={{


                        display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap',


                        padding: 11, borderRadius: 10, marginBottom: 8, cursor: 'pointer',


                        border: `1px solid ${conciliando?.id === p.id ? '#06468c' : '#e5e2da'}`,


                        background: conciliando?.id === p.id ? '#eef7ff' : '#fff',


                      }}


                    >


                      <div>


                        <div style={{ fontSize: 13, fontWeight: 700 }}>{p.estudiante}</div>


                        <div style={{ fontSize: 11, color: '#9c988e' }}>{p.concepto} · vence {formatDate(p.fechaLimite)}</div>


                      </div>


                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>


                        <span style={{ fontSize: 13, fontWeight: 800 }}>{formatCurrency(p.valor)}</span>


                        <Badge color={COLOR_ESTADO[p.estado]}>{p.estado}</Badge>


                      </div>


                    </div>


                  ))}


                </div>





                <div style={card}>


                  {!conciliando ? (


                    <EstadoVacio mensaje="Seleccione un cobro de la cola." />


                  ) : (


                    <>


                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Confirmar pago</div>


                      <div style={{ fontSize: 12, color: '#4e4a43', background: '#f7f6f3', borderRadius: 8, padding: 10, marginBottom: 12 }}>


                        <div><strong>{conciliando.estudiante}</strong></div>


                        <div>{conciliando.concepto}</div>


                        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 6 }}>{formatCurrency(conciliando.valor)}</div>


                      </div>


                      <div style={{ marginBottom: 12 }}>


                        <span style={label}>Referencia bancaria</span>


                        <input


                          style={{ ...input, width: '100%' }} value={referencia}


                          onChange={(e) => setReferencia(e.target.value)}


                          placeholder="Ej. BANCO-2026-4471"


                        />


                      </div>


                      <div style={{ display: 'flex', gap: 8 }}>


                        <button className="btn" onClick={confirmarConciliacion} disabled={guardando}>Conciliar</button>


                        <button className="btn" onClick={() => setConciliando(null)}>Cancelar</button>


                      </div>


                    </>


                  )}


                </div>


              </div>


            </div>


          );


        }





        if (tab === 'egresos') {


          return (


            <div>


              <Aviso>{error}</Aviso>


              <Aviso tone="ok">{exito}</Aviso>





              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Egresos registrados</div><div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(egresos.total)}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Pagados</div><div style={{ fontSize: 24, fontWeight: 800, color: '#0a6e4b' }}>{formatCurrency(egresos.gastos.filter((g) => g.estado === 'pagado').reduce((a, g) => a + g.valor, 0))}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Por aprobar</div><div style={{ fontSize: 24, fontWeight: 800, color: '#99610e' }}>{egresos.gastos.filter((g) => g.estado === 'registrado' || g.estado === 'aprobado').length}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Categorías</div><div style={{ fontSize: 24, fontWeight: 800 }}>{egresos.porCategoria.length}</div></div>


              </div>





              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 14, alignItems: 'start' }}>


                <form style={card} onSubmit={registrarGasto}>


                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Registrar egreso</div>


                  <div style={{ marginBottom: 10 }}>


                    <span style={label}>Concepto</span>


                    <input required value={formGasto.concepto} style={{ ...input, width: '100%' }} onChange={(e) => setFormGasto((f) => ({ ...f, concepto: e.target.value }))} placeholder="Ej. Compra de equipos" />


                  </div>


                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>


                    <div>


                      <span style={label}>Categoría</span>


                      <select value={formGasto.categoria} style={{ ...input, width: '100%' }} onChange={(e) => setFormGasto((f) => ({ ...f, categoria: e.target.value }))}>


                        {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}


                      </select>


                    </div>


                    <div>


                      <span style={label}>Valor</span>


                      <input required type="number" min="1" value={formGasto.valor} style={{ ...input, width: '100%' }} onChange={(e) => setFormGasto((f) => ({ ...f, valor: e.target.value }))} />


                    </div>


                  </div>


                  <div style={{ marginBottom: 10 }}>


                    <span style={label}>Dependencia</span>


                    <input value={formGasto.dependencia} style={{ ...input, width: '100%' }} onChange={(e) => setFormGasto((f) => ({ ...f, dependencia: e.target.value }))} placeholder="Fac. Ingeniería" />


                  </div>


                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>


                    <div>


                      <span style={label}>Fecha</span>


                      <input type="date" value={formGasto.fecha} style={{ ...input, width: '100%' }} onChange={(e) => setFormGasto((f) => ({ ...f, fecha: e.target.value }))} />


                    </div>


                    <div>


                      <span style={label}>Comprobante</span>


                      <input value={formGasto.comprobante} style={{ ...input, width: '100%' }} onChange={(e) => setFormGasto((f) => ({ ...f, comprobante: e.target.value }))} placeholder="CT-2026-" />


                    </div>


                  </div>


                  <button className="btn" type="submit" disabled={guardando}>Registrar</button>


                </form>





                <div>


                  <div style={{ ...card, marginBottom: 14 }}>


                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Distribución por categoría</div>


                    {egresos.porCategoria.length === 0 && (


                      <div style={{ fontSize: 12, color: '#9c988e' }}>Todavía no hay egresos.</div>


                    )}


                    {egresos.porCategoria.map((c) => (


                      <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>


                        <div style={{ width: 130, fontSize: 12, fontWeight: 600 }}>{c.categoria}</div>


                        <div style={{ flex: 1, height: 16, background: '#f0eee9', borderRadius: 5, overflow: 'hidden' }}>


                          <div style={{ width: `${egresos.total ? (c.total / egresos.total) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#99610e,#e0a52e)' }} />


                        </div>


                        <div style={{ width: 118, fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(c.total)}</div>


                        <div style={{ width: 52, fontSize: 11, textAlign: 'right', color: '#6f6b62' }}>{c.n}</div>


                      </div>


                    ))}


                  </div>





                  <div style={{ ...card, overflowX: 'auto' }}>


                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Egresos</div>


                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>


                      <thead>


                        <tr><th style={th}>Concepto</th><th style={th}>Categoría</th><th style={th}>Fecha</th><th style={th}>Valor</th><th style={th}>Comprobante</th><th style={th}>Estado</th></tr>


                      </thead>


                      <tbody>


                        {egresos.gastos.map((g) => (


                          <tr key={g.id}>


                            <td style={td}>{g.concepto}</td>


                            <td style={td}>{g.categoria}</td>


                            <td style={td}>{formatDate(g.fecha)}</td>


                            <td style={td}>{formatCurrency(g.valor)}</td>


                            <td style={td}>{g.comprobante || '-'}</td>


                            <td style={td}>


                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>


                                <Badge color={COLOR_GASTO[g.estado]}>{g.estado}</Badge>


                                <select style={{ ...input, padding: '3px 6px', fontSize: 11 }} value={g.estado} onChange={(e) => cambiarEstadoGasto(g, e.target.value)}>


                                  {ESTADOS_GASTO.map((s) => <option key={s} value={s}>{s}</option>)}


                                </select>


                              </div>


                            </td>


                          </tr>


                        ))}


                      </tbody>


                    </table>


                  </div>


                </div>


              </div>


            </div>


          );


        }





        if (tab === 'nomina') {
          const ultima = Array.isArray(nominas) && nominas.length ? nominas[0] : null;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 16, alignItems: 'start' }}>
              <form style={card} onSubmit={crearCorrida}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Generar corrida de nómina</div>
                <div style={{ fontSize: 12, color: '#6f6b62', marginBottom: 12 }}>
                  Liquida a todo el personal activo: administrativos y docentes (con salario según su categoría). Si el periodo ya existe se vuelve a liquidar desde cero.
                </div>
                <div style={{ marginBottom: 10 }}>
                  <span style={label}>Periodo (AAAA-MM)</span>
                  <input required pattern="\d{4}-\d{2}" title="Formato AAAA-MM" value={formNómina.periodo} style={{ ...input, width: '100%' }} onChange={(e) => setFormNómina((f) => ({ ...f, periodo: e.target.value }))} placeholder="2026-09" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <span style={label}>Fecha de pago</span>
                  <input type="date" value={formNómina.fechaPago} style={{ ...input, width: '100%' }} onChange={(e) => setFormNómina((f) => ({ ...f, fechaPago: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <span style={label}>UVT</span>
                    <input type="number" min="1" value={formNómina.uvt} style={{ ...input, width: '100%' }} onChange={(e) => setFormNómina((f) => ({ ...f, uvt: e.target.value }))} placeholder="42950" />
                  </div>
                  <div>
                    <span style={label}>SMLMV</span>
                    <input type="number" min="1" value={formNómina.smlmv} style={{ ...input, width: '100%' }} onChange={(e) => setFormNómina((f) => ({ ...f, smlmv: e.target.value }))} placeholder="1300000" />
                  </div>
                </div>
                <button className="btn" type="submit" disabled={guardando}>{guardando ? 'Liquidando…' : 'Generar corrida'}</button>
              </form>

              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Corridas</div><div style={{ fontSize: 24, fontWeight: 800 }}>{nominas.length}</div></div>
                  <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Último periodo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{ultima?.periodo || '—'}</div></div>
                  <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Neto último periodo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{ultima ? `$${Number(ultima.totalNeto || 0).toLocaleString('es-CO')}` : '—'}</div></div>
                </div>

                <div style={card}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Corridas</div>
                  {Array.isArray(nominas) && nominas.length ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={th}>Periodo</th>
                          <th style={th}>Estado</th>
                          <th style={th}>Devengado</th>
                          <th style={th}>Deducciones</th>
                          <th style={th}>Neto</th>
                          <th style={th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {nominas.map((n) => (
                          <tr key={n.id}>
                            <td style={td}>{n.periodo}</td>
                            <td style={td}>{n.estado}</td>
                            <td style={td}>${Number(n.totalDevengado || 0).toLocaleString('es-CO')}</td>
                            <td style={td}>${Number(n.totalDeducciones || 0).toLocaleString('es-CO')}</td>
                            <td style={td}>${Number(n.totalNeto || 0).toLocaleString('es-CO')}</td>
                            <td style={td}>
                              <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => verDetalleNómina(n.id)}>Ver detalle</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ fontSize: 12, color: '#6f6b62' }}>Sin datos.</div>
                  )}
                </div>

                {detalleNómina && (
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>Detalle de {detalleNómina.periodo}</div>
                      <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => setDetalleNómina(null)}>Cerrar</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={th}>Persona</th>
                          <th style={th}>Vínculo</th>
                          <th style={th}>Cargo</th>
                          <th style={th}>Base</th>
                          <th style={th}>Devengado</th>
                          <th style={th}>Deducciones</th>
                          <th style={th}>Neto</th>
                          <th style={th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detalleNómina.liquidaciones || []).map((l) => (
                          <React.Fragment key={l.id}>
                            <tr>
                              <td style={{ ...td, fontWeight: 600 }}>{l.nombre}</td>
                              <td style={td}>{l.tipoPersona === 'docente' ? 'Docente' : 'Empleado'}</td>
                              <td style={td}>{l.cargo}</td>
                              <td style={td}>${Number(l.salarioBase).toLocaleString('es-CO')}</td>
                              <td style={td}>${Number(l.devengado).toLocaleString('es-CO')}</td>
                              <td style={td}>-${Number(l.deducciones).toLocaleString('es-CO')}</td>
                              <td style={{ ...td, fontWeight: 700 }}>${Number(l.neto).toLocaleString('es-CO')}</td>
                              <td style={td}>
                                <button className="btn" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setConceptosNómina(conceptosNómina === l.id ? null : l.id)}>
                                  {conceptosNómina === l.id ? 'Ocultar' : 'Conceptos'}
                                </button>
                              </td>
                            </tr>
                            {conceptosNómina === l.id && (
                              <tr>
                                <td colSpan={8} style={{ ...td, background: '#f7f6f3' }}>
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
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (tab === 'novedades') {
          const pendientes = (novedades || []).filter((n) => n.estado === 'reportada');
          const aplicadas = (novedades || []).filter((n) => n.estado === 'aplicada');
          const anuladas = (novedades || []).filter((n) => n.estado === 'anulada');
          const descuentosPend = pendientes
            .filter((n) => n.tipoAjuste === 'descuento')
            .reduce((a, n) => a + Number(n.valor || 0), 0);
          const ingresosPend = pendientes
            .filter((n) => n.tipoAjuste === 'ingreso')
            .reduce((a, n) => a + Number(n.valor || 0), 0);
          const puedeEditar = (n) => n.estado === 'reportada';
          return (
            <div>
              <Aviso>{error}</Aviso>
              <Aviso tone="ok">{exito}</Aviso>



              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Por revisar</div><div style={{ fontSize: 24, fontWeight: 800, color: '#99610e' }}>{pendientes.length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Descuentos pendientes</div><div style={{ fontSize: 20, fontWeight: 800 }}>-${descuentosPend.toLocaleString('es-CO')}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Ingresos pendientes</div><div style={{ fontSize: 20, fontWeight: 800 }}>${ingresosPend.toLocaleString('es-CO')}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Aplicadas</div><div style={{ fontSize: 24, fontWeight: 800, color: '#0a6e4b' }}>{aplicadas.length}</div></div>
                <div style={card}><div style={{ fontSize: 12, color: '#6f6b62' }}>Anuladas</div><div style={{ fontSize: 24, fontWeight: 800, color: '#6f6b62' }}>{anuladas.length}</div></div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Novedades reportadas</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Periodo</th>
                      <th style={th}>Persona</th>
                      <th style={th}>Tipo</th>
                      <th style={th}>Sugerido</th>
                      <th style={th}>A aplicar</th>
                      <th style={th}>Efecto</th>
                      <th style={th}>Estado</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(novedades || []).map((n) => {
                      const b = borradorDe(n);
                      return (
                        <tr key={n.id}>
                          <td style={td}>{n.periodo}</td>
                          <td style={{ ...td, fontWeight: 600 }}>
                            {n.nombre}
                            <div style={{ fontSize: 11, color: '#9c988e', fontWeight: 400 }}>
                              {n.tipoPersona === 'docente' ? 'Docente' : 'Empleado'}{n.descripcion ? ` · ${n.descripcion}` : ''}
                            </div>
                          </td>
                          <td style={td}>{ETIQUETA_NOVEDAD[n.tipo] || n.tipo}</td>
                          <td style={td}><span style={{ color: '#9c988e' }}>${Number(n.valorSugerido || 0).toLocaleString('es-CO')}</span></td>
                          <td style={td}>
                            {puedeEditar(n) ? (
                              <input type="number" min="0" value={b.valor} style={{ ...input, width: 110, padding: '5px 8px' }} onChange={(e) => setBorradorNovedad((prev) => ({ ...prev, [n.id]: { ...b, valor: e.target.value } }))} />
                            ) : (
                              <b>${Number(n.valor || 0).toLocaleString('es-CO')}</b>
                            )}
                          </td>
                          <td style={td}>
                            {puedeEditar(n) ? (
                              <select value={b.tipoAjuste} style={{ ...input, padding: '5px 8px' }} onChange={(e) => setBorradorNovedad((prev) => ({ ...prev, [n.id]: { ...b, tipoAjuste: e.target.value } }))}>
                                <option value="descuento">Descuento</option>
                                <option value="ingreso">Ingreso</option>
                                <option value="ninguno">No mueve</option>
                              </select>
                            ) : (
                              <span style={{ color: '#6f6b62', fontSize: 12 }}>{ETIQUETA_AJUSTE[n.tipoAjuste] || n.tipoAjuste}</span>
                            )}
                          </td>
                          <td style={td}><Badge color={TONO_ESTADO_NOVEDAD[n.estado] || '#6f6b62'}>{n.estado}</Badge></td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>
                            {puedeEditar(n) && (
                              <>
                                <button className="btn" style={{ padding: '4px 9px', fontSize: 11, marginRight: 6 }} disabled={guardandoNovedad} onClick={() => guardarAjusteNovedad(n)}>Guardar</button>
                                <button className="btn" style={{ padding: '4px 9px', fontSize: 11, background: '#ffe0e5', color: '#8f0d22' }} disabled={guardandoNovedad} onClick={() => anularNovedad(n)}>Anular</button>
                              </>
                            )}
                            {n.estado === 'aplicada' && <span style={{ fontSize: 11, color: '#0a6e4b' }}>En la corrida{n.nominaId ? ` #${n.nominaId}` : ''}</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {(!novedades || novedades.length === 0) && (
                      <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#9c988e' }}>Sin novedades reportadas</td></tr>
                    )}
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


