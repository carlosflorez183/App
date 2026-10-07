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


  listarGastos,
  listarNominas,


} from '../api/client';


import { formatCurrency, formatDate } from '../data/mockData';











const TABS = [
  { key: 'recaudo', label: 'Recaudo', icon: '📥' },
  { key: 'cobros', label: 'Cobros', icon: '💰' },
  { key: 'conciliacion', label: 'Conciliación', icon: '🔗' },
  { key: 'egresos', label: 'Egresos', icon: '🧾' },
  { key: 'nomina', label: 'Nómina', icon: '💳' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };


const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };


const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };


const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' };


const label = { fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 };





const CATEGORIAS = ['Docencia', 'Administración', 'Infraestructura', 'Investigación', 'Bienestar', 'Vinculación'];


const ESTADOS_GASTO = ['registrado', 'aprobado', 'pagado', 'anulado'];





const COLOR_ESTADO = { pagado: '#15803d', vencido: '#b91c1c', pendiente: '#b45309' };


const COLOR_GASTO = { pagado: '#15803d', aprobado: '#1d4ed8', registrado: '#b45309', anulado: '#64748b' };





const Badge = ({ children, color }) => (


  <span style={{ background: `${color}1a`, color, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>


    {children}


  </span>


);





const Aviso = ({ children, tone = 'red' }) => {


  if (!children) return null;


  const estilo = tone === 'red'


    ? { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }


    : { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' };


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


  const [egresos, setEgresos] = useState({ gastos: [], porCategoria: [], total: 0 });


  const [cargando, setCargando] = useState(true);

  const [nominas, setNominas] = useState([]);


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
      setNominas(await listarNominas());
    } catch {
      setNominas([]);
    }
  }, []);





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





  /* ── Conciliación ──────────────────────────────────────────────────── */





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





  /* ── Egresos ───────────────────────────────────────────────────────── */





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


    <ModuleLayout title="Contabilidad" subtitle="Recaudo, cartera, egresos y conciliación bancaria" tabs={TABS}>


      {({ tab }) => {


        if (cargando) return <div data-cargando="1" style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>Cargando información financiera…</div>;





        if (tab === 'recaudo') {


          return (


            <div>


              <Aviso>{error}</Aviso>


              <Aviso tone="ok">{exito}</Aviso>





              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Recaudado</div><div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{formatCurrency(recaudado)}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{pagados.length} cobros</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Por cobrar</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>{formatCurrency(cartera)}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{pendientes.length} cobros</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Tasa de recaudo</div><div style={{ fontSize: 24, fontWeight: 800 }}>{recaudado + cartera ? Math.round((recaudado / (recaudado + cartera)) * 100) : 0}%</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Facturado por estudiante</div><div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(Math.round((recaudado + cartera) / Math.max(1, cobros.length)))}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{cobros.length} registros</div></div>


              </div>





              <div style={{ ...card, overflowX: 'auto' }}>


                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Cobros del semestre</div>


                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>


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


                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>


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


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Cartera total</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>{formatCurrency(cartera)}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Pendientes</div><div style={{ fontSize: 24, fontWeight: 800 }}>{pendientes.filter((p) => p.estado === 'pendiente').length}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Vencidos</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b91c1c' }}>{vencidos.length}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Programas con cartera</div><div style={{ fontSize: 24, fontWeight: 800 }}>{new Set(pendientes.map((p) => p.programa)).size}</div></div>


              </div>





              <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>


                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Estado:</span>


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


                <span style={{ fontSize: 11, color: '#94a3b8' }}>{visibles.length} de {cobros.length}</span>


              </div>





              <div style={{ ...card, overflowX: 'auto' }}>


                <table style={{ width: '100%', borderCollapse: 'collapse' }}>


                  <thead>


                    <tr><th style={th}>Estudiante</th><th style={th}>Programa</th><th style={th}>Concepto</th><th style={th}>Límite</th><th style={th}>Valor</th><th style={th}>Estado</th><th style={th}>Acción</th></tr>


                  </thead>


                  <tbody>


                    {visibles.slice(0, 60).map((p) => (


                      <tr key={p.id}>


                        <td style={td}><strong>{p.estudiante}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{p.documento}</span></td>


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


                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Ningún cobro coincide con el filtro.</div>


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





              <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 360px)', gap: 14, alignItems: 'start' }}>


                <div style={card}>


                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Cola de conciliación</div>


                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>


                    Cobros sin confirmar contra el banco. Al conciliar se registra la referencia de la transacción.


                  </div>


                  {pendientes.length === 0 && (


                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No hay cobros pendientes de conciliar.</div>


                  )}


                  {pendientes.slice(0, 20).map((p) => (


                    <div


                      key={p.id}


                      onClick={() => abrirConciliacion(p)}


                      style={{


                        display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap',


                        padding: 11, borderRadius: 10, marginBottom: 8, cursor: 'pointer',


                        border: `1px solid ${conciliando?.id === p.id ? '#1d4ed8' : '#e2e8f0'}`,


                        background: conciliando?.id === p.id ? '#eff6ff' : '#fff',


                      }}


                    >


                      <div>


                        <div style={{ fontSize: 13, fontWeight: 700 }}>{p.estudiante}</div>


                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.concepto} · vence {formatDate(p.fechaLimite)}</div>


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


                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>Seleccione un cobro de la cola.</div>


                  ) : (


                    <>


                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Confirmar pago</div>


                      <div style={{ fontSize: 12, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 12 }}>


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


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Egresos registrados</div><div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(egresos.total)}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Pagados</div><div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{formatCurrency(egresos.gastos.filter((g) => g.estado === 'pagado').reduce((a, g) => a + g.valor, 0))}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Por aprobar</div><div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>{egresos.gastos.filter((g) => g.estado === 'registrado' || g.estado === 'aprobado').length}</div></div>


                <div style={card}><div style={{ fontSize: 12, color: '#64748b' }}>Categorías</div><div style={{ fontSize: 24, fontWeight: 800 }}>{egresos.porCategoria.length}</div></div>


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


                      <div style={{ fontSize: 12, color: '#94a3b8' }}>Todavía no hay egresos.</div>


                    )}


                    {egresos.porCategoria.map((c) => (


                      <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>


                        <div style={{ width: 130, fontSize: 12, fontWeight: 600 }}>{c.categoria}</div>


                        <div style={{ flex: 1, height: 16, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>


                          <div style={{ width: `${egresos.total ? (c.total / egresos.total) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#b45309,#f59e0b)' }} />


                        </div>


                        <div style={{ width: 118, fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(c.total)}</div>


                        <div style={{ width: 52, fontSize: 11, textAlign: 'right', color: '#64748b' }}>{c.n}</div>


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
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Nómina (solo lectura)</div>
                {!ultima ? (
                  <div style={{ fontSize: 12, color: '#64748b' }}>Aún no hay corridas de nómina.</div>
                ) : (
                  <div style={{ fontSize: 13 }}>
                    <div><strong>Periodo:</strong> {ultima.periodo}</div>
                    <div><strong>Estado:</strong> {ultima.estado}</div>
                    <div><strong>Total devengado:</strong> ${Number(ultima.totalDevengado || 0).toLocaleString('es-CO')}</div>
                    <div><strong>Total deducciones:</strong> ${Number(ultima.totalDeducciones || 0).toLocaleString('es-CO')}</div>
                    <div><strong>Total neto:</strong> ${Number(ultima.totalNeto || 0).toLocaleString('es-CO')}</div>
                  </div>
                )}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b' }}>Sin datos.</div>
                )}
              </div>
            </div>
          );
        }

        return null;


      }}


    </ModuleLayout>


  );


}


