import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../data/mockData';
import { usePersistentData } from '../hooks/usePersistentData';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { menuForRole } from '../config/navMenu';

export default function Dashboard() {
  const { user, roleLabels, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();

  // Las pestañas disponibles salen del menú por rol, para que el Dashboard no
  // ofrezca vistas que el usuario no tiene (p. ej. Pagos a un docente).
  const tabsDe = (vista) =>
    menuForRole(user.role)
      .flatMap((s) => s.items)
      .filter((i) => i.kind === 'view' && i.view === vista);

  const tabsAcademico = tabsDe('academico');
  const tabsLms = tabsDe('lms');
  const vistaPorDefecto = tabsAcademico.length ? 'academico' : 'home';

  // Otros módulos (/admin, /admisiones) saltan a una vista concreta pasando
  // ?view= y ?tab=. Se toma en el arranque porque la vista vive en el estado.
  const [currentView, setCurrentView] = useState(
    () => urlParams.get('view') || vistaPorDefecto
  );
  const [currentTab, setCurrentTab] = useState(() => urlParams.get('tab') || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = usePersistentData();

  // Si la URL pide una pestaña que este rol no tiene, se usa la primera suya.
  const tabDe = (lista, porDefecto) =>
    lista.some((i) => i.tab === currentTab) ? currentTab : lista[0]?.tab || porDefecto;
  const tabAcademico = tabDe(tabsAcademico, 'certificados');
  const tabLms = tabDe(tabsLms, 'cursos');

  // Modales
  const [modalCert, setModalCert] = useState(null);
  const [modalVolante, setModalVolante] = useState(null);
  const [modalEntrega, setModalEntrega] = useState(null);

  // Filtros de las tarjetas KPI ('todos' = sin filtro)
  const [tareasFiltro, setTareasFiltro] = useState('todas');
  const [pagosFiltro, setPagosFiltro] = useState('todos');

  // Perfil (solo lectura + modo edición)
  const toDraft = (u) => ({
    name: u?.name || '',
    email: u?.email || '',
    phone: u?.phone || '',
    address: u?.address || '',
  });
  const [editando, setEditando] = useState(false);
  const [perfilDraft, setPerfilDraft] = useState(() => toDraft(user));
  const [perfilMsg, setPerfilMsg] = useState(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const perfilDirty =
    perfilDraft.name !== (user.name || '') ||
    perfilDraft.email !== (user.email || '') ||
    perfilDraft.phone !== (user.phone || '') ||
    perfilDraft.address !== (user.address || '');

  const handleEditProfile = () => {
    setPerfilDraft(toDraft(user));
    setPerfilMsg(null);
    setEditando(true);
  };

  const handleSaveProfile = () => {
    const name = perfilDraft.name.trim();
    const email = perfilDraft.email.trim();
    const phone = perfilDraft.phone.trim();
    const address = perfilDraft.address.trim();

    if (!name) {
      setPerfilMsg({ ok: false, text: 'El nombre no puede quedar vacío.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setPerfilMsg({ ok: false, text: 'El correo electrónico no tiene un formato válido.' });
      return;
    }
    if (!perfilDirty) {
      setPerfilMsg({ ok: false, text: 'No hay cambios pendientes por guardar.' });
      return;
    }
    updateProfile({ name, email, phone, address });
    setPerfilDraft({ name, email, phone, address });
    setPerfilMsg({ ok: true, text: 'Perfil actualizado correctamente.' });
    setEditando(false);
  };

  const handleResetProfile = () => {
    setPerfilDraft(toDraft(user));
    setPerfilMsg(null);
    setEditando(false);
  };

  const handleNavigate = (view, tab = null) => {
    setCurrentView(view);
    if (view === 'perfil') {
      setEditando(false);
      setPerfilMsg(null);
    }
    if (tab) {
      setCurrentTab(tab);
    } else if (view === 'academico') {
      setCurrentTab(tabsAcademico[0]?.tab || 'certificados');
    } else if (view === 'lms') {
      setCurrentTab(tabsLms[0]?.tab || 'cursos');
    }
  };

  const handleMarkNotifRead = (id) => {
    setData((prev) => ({
      ...prev,
      notificaciones: prev.notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    }));
  };

  const handleOpenNotif = (n) => {
    const d = n.destino;
    if (!d) return;
    if (d.filtroTareas) setTareasFiltro(d.filtroTareas);
    if (d.filtroPagos) setPagosFiltro(d.filtroPagos);
    if (d.cursoId) {
      navigate(`/curso/${d.cursoId}`);
      return;
    }
    if (d.vista) handleNavigate(d.vista, d.tab || null);
  };

  const toggleFiltro = (actual, nuevo, setter) => setter(actual === nuevo ? 'todas' : nuevo);

  const handleEntregarTarea = (actId) => {
    setData((prev) => ({
      ...prev,
      actividades: prev.actividades.map((a) =>
        a.id === actId ? { ...a, estado_est: 'entregado' } : a
      ),
    }));
    setModalEntrega(null);
    alert('¡Tarea entregada exitosamente! 🎉');
  };

  const handleSolicitarCertificado = (tipo) => {
    const nuevo = {
      id: Date.now(),
      tipo,
      fecha: null,
      estado: 'en_proceso',
      solicitado: new Date().toISOString().split('T')[0],
    };
    setData((prev) => ({
      ...prev,
      certificados: [nuevo, ...prev.certificados],
    }));
    setModalCert(null);
    alert(`Solicitud de ${tipo} enviada correctamente. Disponible en 2 a 5 días hábiles.`);
  };

  // Cálculos de Tareas
  const tareasPendientes = data.actividades.filter((a) => a.estado_est === 'pendiente');
  const tareasEntregadas = data.actividades.filter((a) => a.estado_est !== 'pendiente');
  const tareasVisibles =
    tareasFiltro === 'todas'
      ? data.actividades
      : data.actividades.filter((a) =>
          tareasFiltro === 'pendientes' ? a.estado_est === 'pendiente' : a.estado_est !== 'pendiente'
        );
  const tasaEntrega = data.actividades.length
    ? Math.round((tareasEntregadas.length / data.actividades.length) * 100)
    : 0;

  // Cálculos de Pagos
  const totalPagado = data.pagos
    .filter((p) => p.estado === 'pagado')
    .reduce((acc, p) => acc + p.valor, 0);
  const totalPendiente = data.pagos
    .filter((p) => p.estado === 'pendiente')
    .reduce((acc, p) => acc + p.valor, 0);
  const pagosVisibles =
    pagosFiltro === 'todos'
      ? data.pagos
      : data.pagos.filter((p) => (pagosFiltro === 'pagados' ? p.estado === 'pagado' : p.estado === 'pendiente'));

  // Resumen para el panel principal
  const materiasPeriodo = data.materias.filter((m) => m.periodo === '2026-1');
  const notasCerradas = materiasPeriodo.filter((m) => m.definitiva != null);
  const promedioActual = notasCerradas.length
    ? (notasCerradas.reduce((acc, m) => acc + m.definitiva, 0) / notasCerradas.length).toFixed(1)
    : '—';
  const pagosPendientes = data.pagos.filter((p) => p.estado === 'pendiente').length;

  // Título dinámico del Topbar
  let topbarTitle = 'Panel Principal';
  let topbarSub = 'Bienvenido al sistema institucional';
  if (currentView === 'academico') {
    topbarTitle = 'Gestión Académica';
    topbarSub = 'Notas, certificados y pagos';
  } else if (currentView === 'lms') {
    topbarTitle = 'Campus Virtual';
    topbarSub = 'Cursos, tareas y recursos';
  } else if (currentView === 'perfil') {
    topbarTitle = 'Mi Perfil';
    topbarSub = 'Información y credenciales';
  }

  return (
    <div className="app-wrap">
      {/* ── BARRA LATERAL ── */}
      <Sidebar
        currentView={currentView}
        currentTab={currentTab}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="content-area">
        <Topbar
          title={topbarTitle}
          subtitle={topbarSub}
          onNavigate={handleNavigate}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          notifications={data.notificaciones}
          onMarkNotifRead={handleMarkNotifRead}
          onOpenNotif={handleOpenNotif}
        />

        <div className="main-content">
          {/* ========================================================= */}
          {/* VISTA 1: HOME (PANEL PRINCIPAL)                           */}
          {/* ========================================================= */}
          {currentView === 'home' && (
            <div className="fade-in">
              <div className="hero">
                <div>
                  <div className="hero-period">📅 Viernes, 26 de Septiembre de 2026</div>
                  <div className="hero-title">Hola, {user.name.split(' ')[0]} 👋</div>
                  <div className="hero-sub">{roleLabels[user.role] || user.role} · {user.code || ''}</div>
                </div>
                <div className="hero-badge">
                  <div className="hero-badge-v">2026-1</div>
                  <div className="hero-badge-l">Período académico</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                <button
                  type="button"
                  className="stat-card stat-card-btn"
                  onClick={() => handleNavigate('academico', 'notas')}
                  title="Ver mis notas"
                >
                  <div className="stat-ic" style={{ background: '#dbeafe' }}>⭐</div>
                  <div>
                    <div className="stat-v">{promedioActual}</div>
                    <div className="stat-l">Promedio actual</div>
                    <div className="stat-go">Ver notas →</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-btn"
                  onClick={() => handleNavigate('academico', 'notas')}
                  title="Ver materias matriculadas"
                >
                  <div className="stat-ic" style={{ background: '#dcfce7' }}>📚</div>
                  <div>
                    <div className="stat-v">{materiasPeriodo.length}</div>
                    <div className="stat-l">Materias activas</div>
                    <div className="stat-go">Ver materias →</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-btn"
                  onClick={() => { setTareasFiltro('pendientes'); handleNavigate('lms', 'tareas'); }}
                  title="Ver tareas pendientes"
                >
                  <div className="stat-ic" style={{ background: '#ede9fe' }}>✅</div>
                  <div>
                    <div className="stat-v">{tareasPendientes.length}</div>
                    <div className="stat-l">Tareas pendientes</div>
                    <div className="stat-go">Ver tareas →</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-btn"
                  onClick={() => { setPagosFiltro('pendientes'); handleNavigate('academico', 'pagos'); }}
                  title="Ver pagos pendientes"
                >
                  <div className="stat-ic" style={{ background: '#fef9c3' }}>💳</div>
                  <div>
                    <div className="stat-v">{pagosPendientes}</div>
                    <div className="stat-l">Pagos pendientes</div>
                    <div className="stat-go">Ver pagos →</div>
                  </div>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div className="card">
                  <div className="card-hd"><span className="card-ttl">⚡ Accesos Rápidos</span></div>
                  <div className="card-bd">
                    <div className="qa-grid">
                      <button onClick={() => handleNavigate('academico', 'notas')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#3b82f6' }}>⭐</div>
                        <span className="qa-lbl">Mis Notas</span>
                      </button>
                      <button onClick={() => handleNavigate('academico', 'pagos')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#059669' }}>💳</div>
                        <span className="qa-lbl">Pagos</span>
                      </button>
                      <button onClick={() => handleNavigate('academico', 'certificados')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#d97706' }}>📜</div>
                        <span className="qa-lbl">Certificados</span>
                      </button>
                      <button onClick={() => handleNavigate('lms', 'cursos')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#7c3aed' }}>📚</div>
                        <span className="qa-lbl">Mis Cursos</span>
                      </button>
                      <button onClick={() => handleNavigate('lms', 'tareas')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#ea580c' }}>✅</div>
                        <span className="qa-lbl">Tareas</span>
                      </button>
                      <button onClick={() => navigate('/matricula')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#4338ca' }}>📝</div>
                        <span className="qa-lbl">Matrícula</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-hd"><span className="card-ttl">📅 Próximos eventos</span></div>
                  <div>
                    {data.eventos.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          background: ev.tipo === 'tarea' ? '#ffedd5' : '#dbeafe',
                          color: ev.tipo === 'tarea' ? '#c2410c' : '#1d4ed8'
                        }}>
                          <span style={{ fontSize: 17, lineHeight: 1 }}>{ev.fecha}</span>
                          <span>ago</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.titulo}
                          </p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                            {ev.tipo === 'tarea' ? 'Entrega' : 'Clase'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA 2: GESTIÓN ACADÉMICA                                */}
          {/* ========================================================= */}
          {currentView === 'academico' && tabsAcademico.length > 0 && (
            <div className="fade-in">
              {/* Las pestañas se dibujan desde el menú del rol, no fijas. */}
              <div className="tabs-bar">
                {tabsAcademico.map((t) => (
                  <button
                    key={t.key}
                    className={`t-btn ${tabAcademico === t.tab ? 'active' : ''}`}
                    onClick={() => setCurrentTab(t.tab)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* ── SUBPESTAÑA: CERTIFICADOS (EXACTO A IMAGEN 1) ── */}
              {tabAcademico === 'certificados' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>

                    {[
                      { ic: '📄', t: 'Certificado de Estudios', bg: '#dbeafe' },
                      { ic: '⭐', t: 'Constancia de Notas', bg: '#dcfce7' },
                      { ic: '✅', t: 'Paz y Salvo Financiero', bg: '#fef9c3' },
                      { ic: '🪪', t: 'Certificado de Matrícula', bg: '#ede9fe' },
                      { ic: '🎓', t: 'Constancia de Egresado', bg: '#e0e7ff' },
                      { ic: '✉️', t: 'Carta de Presentación', bg: '#fce7f3' },
                    ].map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setModalCert(c.t)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '16px',
                          background: '#fff',
                          borderRadius: 12,
                          border: '2px solid #e2e8f0',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                          transition: 'all .18s',
                          fontFamily: 'inherit'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#93c5fd';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)';
                        }}
                      >
                        <div style={{
                          width: 46,
                          height: 46,
                          background: c.bg,
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0
                        }}>
                          {c.ic}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', margin: 0 }}>{c.t}</p>
                          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Click para solicitar</p>
                        </div>
                        <span style={{ color: '#cbd5e1', fontSize: 14 }}>›</span>
                      </button>
                    ))}
                  </div>

                  {/* Tabla Mis Solicitudes */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl">🕐 Mis Solicitudes</span>
                    </div>
                    <div className="overflow-x">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>TIPO</th>
                            <th>SOLICITADO</th>
                            <th>FECHA EMISIÓN</th>
                            <th>ESTADO</th>
                            <th>ACCIÓN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.certificados.map((c) => (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 600 }}>{c.tipo}</td>
                              <td>{formatDate(c.solicitado)}</td>
                              <td>{formatDate(c.fecha)}</td>
                              <td>
                                <span className={`bs ${c.estado === 'disponible' ? 'bg-g' : 'bg-y'}`}>
                                  {c.estado === 'disponible' ? '✅ Disponible' : '⏳ En proceso'}
                                </span>
                              </td>
                              <td>
                                {c.estado === 'disponible' ? (
                                  <button
                                    onClick={() => alert(`Descargando ${c.tipo} en PDF...`)}
                                    className="btn b-primary b-sm"
                                  >
                                    ⬇️ Descargar
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>En proceso...</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: PAGOS (EXACTO A IMAGEN 2) ── */}
              {tabAcademico === 'pagos' && (
                <div>
                  {/* 3 Tarjetas KPI — clicables = filtro */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${pagosFiltro === 'pagados' ? 'is-active' : ''}`}
                      onClick={() => toggleFiltro(pagosFiltro, 'pagados', setPagosFiltro)}
                      aria-pressed={pagosFiltro === 'pagados'}
                    >
                      <div className="stat-ic" style={{ background: '#dcfce7' }}>✅</div>
                      <div>
                        <div className="stat-v" style={{ fontSize: 20, color: '#059669' }}>{formatCurrency(totalPagado)}</div>
                        <div className="stat-l">Total pagado 2026</div>
                        <div className="stat-go">{pagosFiltro === 'pagados' ? '✓ Filtrando' : 'Ver solo pagados →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${pagosFiltro === 'pendientes' ? 'is-active' : ''}`}
                      onClick={() => toggleFiltro(pagosFiltro, 'pendientes', setPagosFiltro)}
                      aria-pressed={pagosFiltro === 'pendientes'}
                    >
                      <div className="stat-ic" style={{ background: '#fee2e2' }}>🕐</div>
                      <div>
                        <div className="stat-v" style={{ fontSize: 20, color: '#dc2626' }}>{formatCurrency(totalPendiente)}</div>
                        <div className="stat-l">Pendiente</div>
                        <div className="stat-go">{pagosFiltro === 'pendientes' ? '✓ Filtrando' : 'Ver solo pendientes →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${pagosFiltro === 'todos' ? 'is-active' : ''}`}
                      onClick={() => setPagosFiltro('todos')}
                      aria-pressed={pagosFiltro === 'todos'}
                    >
                      <div className="stat-ic" style={{ background: '#dbeafe' }}>🧾</div>
                      <div>
                        <div className="stat-v">{data.pagos.length}</div>
                        <div className="stat-l">Total recibos</div>
                        <div className="stat-go">{pagosFiltro === 'todos' ? '✓ Mostrando todo' : 'Ver todos →'}</div>
                      </div>
                    </button>
                  </div>

                  {/* Estado de Cuenta */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl">💳 Estado de Cuenta</span>
                      <span className="bs bg-s">
                        {pagosVisibles.length} de {data.pagos.length} recibos
                        {pagosFiltro !== 'todos' && ' · filtrado'}
                      </span>
                    </div>
                    <div className="overflow-x">
                      {pagosVisibles.length === 0 ? (
                        <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                          No hay recibos que coincidan con este filtro.
                        </div>
                      ) : (
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>CONCEPTO</th>
                            <th>VALOR</th>
                            <th>FECHA LÍMITE</th>
                            <th>FECHA PAGO</th>
                            <th>ESTADO</th>
                            <th>ACCIÓN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagosVisibles.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{p.concepto}</td>
                              <td style={{ fontWeight: 700 }}>{formatCurrency(p.valor)}</td>
                              <td>{formatDate(p.fecha_limite)}</td>
                              <td>{formatDate(p.fecha_pago)}</td>
                              <td>
                                <span className={`bs ${p.estado === 'pagado' ? 'bg-g' : 'bg-r'}`}>
                                  {p.estado === 'pagado' ? '✅ Pagado' : '❌ Pendiente'}
                                </span>
                              </td>
                              <td>
                                {p.estado === 'pagado' ? (
                                  <button
                                    onClick={() => alert(`Imprimiendo comprobante de ${p.concepto}...`)}
                                    className="btn b-secondary b-sm"
                                  >
                                    🧾 Comprobante
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setModalVolante(p)}
                                    className="btn b-primary b-sm"
                                  >
                                    📄 Volante
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: HORARIO (CONSERVADO DE LA MIGRACIÓN) ── */}
              {tabAcademico === 'horario' && (
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>
                    Horario Semanal — Periodo 2026-1
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((dia) => (
                      <div key={dia} style={{ background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0', minHeight: 220 }}>
                        <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: 13, marginBottom: 10, borderBottom: '1px solid #cbd5e1', paddingBottom: 6 }}>
                          {dia}
                        </div>
                        <div style={{ background: '#eff6ff', borderLeft: '3px solid #2563eb', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af' }}>7:00am - 9:00am</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Bases de Datos II</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>Lab B-205</div>
                        </div>
                        <div style={{ background: '#f5f3ff', borderLeft: '3px solid #8b5cf6', padding: '8px 10px', borderRadius: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8' }}>9:00am - 11:00am</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Ingeniería de Software</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>Aula 304</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: NOTAS ── */}
              {tabAcademico === 'notas' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#dbeafe' }}>⭐</div>
                      <div>
                        <div className="stat-v">4.2</div>
                        <div className="stat-l">Promedio 2026-1</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#dcfce7' }}>📚</div>
                      <div>
                        <div className="stat-v">{data.materias.filter(m => m.periodo === '2026-1').length}</div>
                        <div className="stat-l">Materias activas</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#ede9fe' }}>🎓</div>
                      <div>
                        <div className="stat-v">82</div>
                        <div className="stat-l">Créditos acumulados</div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl">⭐ Materias — Semestre 2026-1</span>
                    </div>
                    <div className="overflow-x">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Materia</th>
                            <th style={{ textAlign: 'center' }}>Cred.</th>
                            <th style={{ textAlign: 'center' }}>Nota 1</th>
                            <th style={{ textAlign: 'center' }}>Nota 2</th>
                            <th style={{ textAlign: 'center' }}>Nota 3</th>
                            <th style={{ textAlign: 'center' }}>Definitiva</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.materias.filter(m => m.periodo === '2026-1').map((m) => (
                            <tr key={m.id}>
                              <td><code style={{ fontSize: 11, color: '#64748b' }}>{m.codigo}</code></td>
                              <td><strong>{m.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{m.profesor}</span></td>
                              <td style={{ textAlign: 'center' }}>{m.creditos}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: m.nota1 >= 3 ? '#059669' : '#dc2626' }}>{m.nota1 ?? '—'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: m.nota2 >= 3 ? '#059669' : '#dc2626' }}>{m.nota2 ?? '—'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.nota3 ?? '—'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div className={`nc ${m.definitiva ? (m.definitiva >= 3 ? 'nc-ok' : 'nc-fail') : 'nc-pend'}`} style={{ margin: 'auto' }}>
                                  {m.definitiva ?? '—'}
                                </div>
                              </td>
                              <td>
                                <span className={`bs ${m.estado === 'aprobado' ? 'bg-g' : (m.estado === 'reprobado' ? 'bg-r' : 'bg-b')}`}>
                                  {m.estado === 'en_curso' ? 'En Curso' : (m.estado === 'aprobado' ? 'Aprobado' : 'Reprobado')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA 3: CAMPUS VIRTUAL (LMS)                             */}
          {/* ========================================================= */}
          {currentView === 'lms' && tabsLms.length > 0 && (
            <div className="fade-in">
              <div className="tabs-bar">
                {tabsLms.map((t) => (
                  <button
                    key={t.key}
                    className={`t-btn ${tabLms === t.tab ? 'active' : ''}`}
                    onClick={() => setCurrentTab(t.tab)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* ── SUBPESTAÑA: TAREAS (EXACTO A IMAGEN 3) ── */}
              {tabLms === 'tareas' && (
                <div>
                  {/* 3 Tarjetas KPI — clicables = filtro */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${tareasFiltro === 'pendientes' ? 'is-active' : ''}`}
                      onClick={() => toggleFiltro(tareasFiltro, 'pendientes', setTareasFiltro)}
                      aria-pressed={tareasFiltro === 'pendientes'}
                    >
                      <div className="stat-ic" style={{ background: '#ffedd5' }}>⏰</div>
                      <div>
                        <div className="stat-v" style={{ color: '#ea580c' }}>{tareasPendientes.length}</div>
                        <div className="stat-l">Pendientes</div>
                        <div className="stat-go">{tareasFiltro === 'pendientes' ? '✓ Filtrando' : 'Ver solo pendientes →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${tareasFiltro === 'entregadas' ? 'is-active' : ''}`}
                      onClick={() => toggleFiltro(tareasFiltro, 'entregadas', setTareasFiltro)}
                      aria-pressed={tareasFiltro === 'entregadas'}
                    >
                      <div className="stat-ic" style={{ background: '#dcfce7' }}>✅</div>
                      <div>
                        <div className="stat-v" style={{ color: '#059669' }}>{tareasEntregadas.length}</div>
                        <div className="stat-l">Realizadas</div>
                        <div className="stat-go">{tareasFiltro === 'entregadas' ? '✓ Filtrando' : 'Ver solo realizadas →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${tareasFiltro === 'todas' ? 'is-active' : ''}`}
                      onClick={() => setTareasFiltro('todas')}
                      aria-pressed={tareasFiltro === 'todas'}
                    >
                      <div className="stat-ic" style={{ background: '#dbeafe' }}>📊</div>
                      <div>
                        <div className="stat-v" style={{ color: '#2563eb' }}>{tasaEntrega}%</div>
                        <div className="stat-l">Tasa de entrega</div>
                        <div className="stat-go">{tareasFiltro === 'todas' ? '✓ Mostrando todo' : 'Ver todas →'}</div>
                      </div>
                    </button>
                  </div>

                  {/* Actividades filtradas */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl">✅ Actividades</span>
                      <span className="bs bg-s">
                        {tareasVisibles.length} de {data.actividades.length}
                        {tareasFiltro !== 'todas' && ' · filtrado'}
                      </span>
                    </div>
                    <div>
                      {tareasVisibles.length === 0 ? (
                        <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                          No hay actividades que coincidan con este filtro.
                        </div>
                      ) : (
                      tareasVisibles.map((a) => {
                        const cursoObj = data.cursos.find((c) => c.id === a.cursoId);
                        const tcol = {
                          taller: { bg: '#dbeafe', color: '#1d4ed8' },
                          quiz: { bg: '#fef9c3', color: '#854d0e' },
                          proyecto: { bg: '#ede9fe', color: '#6d28d9' },
                          informe: { bg: '#dcfce7', color: '#15803d' },
                        }[a.tipo] || { bg: '#f1f5f9', color: '#475569' };

                        return (
                          <div key={a.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <span style={{
                                    background: tcol.bg,
                                    color: tcol.color,
                                    padding: '2px 10px',
                                    borderRadius: 20,
                                    fontSize: 11,
                                    fontWeight: 600
                                  }}>
                                    {a.tipo}
                                  </span>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{cursoObj?.nombre || ''}</span>
                                </div>
                                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, margin: '0 0 2px' }}>{a.titulo}</p>
                                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 6px' }}>{a.descripcion}</p>
                                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                                  📅 {formatDate(a.fechaEntrega)} · ⭐ {a.puntos} pts · Corte {a.corte || '?'}
                                </p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                <span className={`bs ${a.estado_est === 'calificado' ? 'bg-g' : (a.estado_est === 'entregado' ? 'bg-b' : 'bg-r')}`}>
                                  {a.estado_est === 'calificado' ? `✓ ${a.nota}/${a.puntos}` : (a.estado_est === 'entregado' ? 'Entregado' : 'Pendiente')}
                                </span>
                                {a.estado_est === 'pendiente' && (
                                  <button
                                    onClick={() => setModalEntrega(a)}
                                    className="btn b-primary b-sm"
                                  >
                                    ⬆️ Entregar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: CURSOS ── */}
              {tabLms === 'cursos' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <strong style={{ color: '#334155' }}>{data.cursos.length} cursos activos — 2026-1</strong>
                    <button onClick={() => navigate('/matricula')} className="btn b-outline b-sm">
                      📝 Ir a Matrícula
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {data.cursos.map((c) => (
                      <div
                        key={c.id}
                        className="course-card"
                        onClick={() => navigate(`/curso/${c.id}`)}
                      >
                        <div className="course-img" style={{ background: c.color }}>{c.icon}</div>
                        <div className="course-info">
                          <div className="course-title">{c.nombre}</div>
                          <div className="course-meta">📌 {c.codigo} · Grupo {c.grupo}</div>
                          <div className="course-meta">👤 {c.profesor}</div>
                          <div className="course-meta" style={{ marginBottom: 10 }}>👥 {c.estudiantes} estudiantes</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: '#64748b' }}>Progreso</span>
                            <span style={{ fontWeight: 700 }}>{c.progreso}%</span>
                          </div>
                          <div className="prog-bar">
                            <div
                              className="prog-fill"
                              style={{
                                width: `${c.progreso}%`,
                                background: c.progreso === 100 ? '#22c55e' : (c.progreso > 60 ? '#3b82f6' : '#eab308')
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: RECURSOS ── */}
              {tabLms === 'recursos' && (
                <div className="card">
                  <div className="card-hd"><span className="card-ttl">📁 Material Institucional</span></div>
                  <div>
                    {[
                      { nom: 'Calendario Académico 2026', t: 'PDF', p: '1.4 MB' },
                      { nom: 'Reglamento Estudiantil Vigente', t: 'PDF', p: '2.8 MB' },
                      { nom: 'Guía de Estilos de Grado y Tesis', t: 'DOCX', p: '520 KB' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 26 }}>📄</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{r.nom}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{r.t} · {r.p}</p>
                        </div>
                        <button onClick={() => alert(`Descargando ${r.nom}...`)} className="btn b-secondary b-sm">
                          Descargar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA 4: PERFIL                                           */}
          {/* ========================================================= */}
          {currentView === 'perfil' && (
            <div style={{ maxWidth: 720 }}>
              {/* ── Identidad ── */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl">👤 Mi Perfil</span>
                  <span className={`bs ${user.role === 'estudiante' ? 'bg-b' : 'bg-p'}`}>
                    {roleLabels[user.role] || user.role}
                  </span>
                </div>
                <div className="card-bd">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <div className={`s-avatar ${user.avatarClass || 'av-blue'}`} style={{ width: 60, height: 60, fontSize: 21, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                      {user.avatar}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>{user.name}</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                        Código institucional: <strong>{user.code}</strong>
                      </p>
                    </div>
                  </div>

                  {/* ── Datos académicos (solo lectura: los emite el sistema) ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                        {user.program ? 'Programa' : 'Dependencia'}
                      </span>
                      <strong style={{ fontSize: 13 }}>{user.program || user.department || 'Facultad General'}</strong>
                    </div>
                    {user.semester && (
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                          Semestre
                        </span>
                        <strong style={{ fontSize: 13 }}>{user.semester}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                        Sesión iniciada
                      </span>
                      <strong style={{ fontSize: 13 }}>{user.username || user.code || '—'}</strong>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>
                    ℹ️ Los datos académicos los administra la institución y no se pueden editar desde el portal.
                  </p>
                </div>
              </div>

              {/* ── Datos personales: lectura + modo edición ── */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl">📋 Datos Personales</span>
                  {!editando && (
                    <button type="button" className="btn b-outline b-sm" onClick={handleEditProfile}>
                      ✏️ Editar Información
                    </button>
                  )}
                </div>
                <div className="card-bd">
                  {!editando ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      {[
                        ['Nombre completo', user.name],
                        ['Correo electrónico', user.email],
                        ['Teléfono', user.phone],
                        ['Dirección de residencia', user.address],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
                            {label}
                          </span>
                          <strong style={{ fontSize: 13.5, color: value ? '#1e293b' : '#94a3b8', fontWeight: value ? 600 : 400 }}>
                            {value || 'No registrado'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="f-group">
                        <label className="f-label" htmlFor="pf-name">Nombre completo</label>
                        <input
                          id="pf-name"
                          className="f-ctrl"
                          type="text"
                          value={perfilDraft.name}
                          onChange={(e) => { setPerfilDraft({ ...perfilDraft, name: e.target.value }); setPerfilMsg(null); }}
                          placeholder="Ej. Carlos Andrés Martínez"
                          autoFocus
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                        <div className="f-group">
                          <label className="f-label" htmlFor="pf-email">Correo electrónico</label>
                          <input
                            id="pf-email"
                            className="f-ctrl"
                            type="email"
                            value={perfilDraft.email}
                            onChange={(e) => { setPerfilDraft({ ...perfilDraft, email: e.target.value }); setPerfilMsg(null); }}
                            placeholder="usuario@uni.edu.co"
                          />
                        </div>
                        <div className="f-group">
                          <label className="f-label" htmlFor="pf-phone">Teléfono</label>
                          <input
                            id="pf-phone"
                            className="f-ctrl"
                            type="tel"
                            value={perfilDraft.phone}
                            onChange={(e) => { setPerfilDraft({ ...perfilDraft, phone: e.target.value }); setPerfilMsg(null); }}
                            placeholder="300 000 0000"
                          />
                        </div>
                      </div>

                      <div className="f-group">
                        <label className="f-label" htmlFor="pf-address">Dirección de residencia</label>
                        <input
                          id="pf-address"
                          className="f-ctrl"
                          type="text"
                          value={perfilDraft.address}
                          onChange={(e) => { setPerfilDraft({ ...perfilDraft, address: e.target.value }); setPerfilMsg(null); }}
                          placeholder="Cra. 00 #00-00, Ciudad"
                        />
                      </div>
                    </>
                  )}

                  {perfilMsg && (
                    <div
                      role="status"
                      style={{
                        background: perfilMsg.ok ? '#dcfce7' : '#fee2e2',
                        color: perfilMsg.ok ? '#15803d' : '#b91c1c',
                        border: `1px solid ${perfilMsg.ok ? '#86efac' : '#fca5a5'}`,
                        padding: '10px 14px',
                        borderRadius: 9,
                        fontSize: 13,
                        marginTop: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{perfilMsg.ok ? '✅' : '⚠️'}</span>
                      <span>{perfilMsg.text}</span>
                    </div>
                  )}

                  {editando && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                      <button type="button" className="btn b-primary" onClick={handleSaveProfile}>
                        💾 Guardar Cambios
                      </button>
                      <button type="button" className="btn b-secondary" onClick={handleResetProfile}>
                        ↩️ Descartar Cambios
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Acciones ── */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl">⚙️ Acciones</span>
                </div>
                <div className="card-bd" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn b-secondary" onClick={() => handleNavigate('academico', 'certificados')}>
                    📜 Mis Certificados
                  </button>
                  <button type="button" className="btn b-secondary" onClick={() => handleNavigate('academico', 'pagos')}>
                    💳 Estado de Cuenta
                  </button>
                  <button
                    type="button"
                    className="btn b-danger"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    🚪 Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: SOLICITAR CERTIFICADO ── */}
      {modalCert && (
        <div className="modal-ov open">
          <div className="modal-box">
            <div className="modal-hd">
              <span className="modal-ttl">📄 Solicitar: {modalCert}</span>
              <button className="modal-x" onClick={() => setModalCert(null)}>✕</button>
            </div>
            <div className="modal-bd">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: 12, fontSize: 13, color: '#1d4ed8', marginBottom: 16 }}>
                ℹ️ Disponible en <strong>2 a 5 días hábiles</strong> después de la solicitud.
              </div>
              <div className="f-group">
                <label className="f-label">Destino</label>
                <select className="f-ctrl">
                  <option>Uso personal</option>
                  <option>Entidad financiera</option>
                  <option>Empresa / Empleador</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="f-group">
                <label className="f-label">Número de copias</label>
                <input type="number" min="1" max="5" defaultValue="1" className="f-ctrl" />
              </div>
              <div className="f-group">
                <label className="f-label">Observaciones</label>
                <textarea className="f-ctrl" rows={2} placeholder="Indicaciones adicionales..."></textarea>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn b-secondary" onClick={() => setModalCert(null)}>Cancelar</button>
              <button className="btn b-primary" onClick={() => handleSolicitarCertificado(modalCert)}>
                📤 Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VOLANTE DE PAGO OFICIAL ── */}
      {modalVolante && (
        <div className="modal-ov open">
          <div className="modal-box">
            <div className="modal-hd">
              <span className="modal-ttl">📄 Volante de Pago</span>
              <button className="modal-x" onClick={() => setModalVolante(null)}>✕</button>
            </div>
            <div className="modal-bd">
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: 14, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏛️</div>
                <h3 style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>UniPlataforma — Universidad</h3>
                <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 16px' }}>NIT: 900.123.456-7</p>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'left' }}>
                  {[
                    ['Estudiante', user.name],
                    ['Código', user.code],
                    ['Concepto', modalVolante.concepto],
                    ['Valor', formatCurrency(modalVolante.valor)],
                    ['Vence', '25 de julio de 2026'],
                    ['Referencia', `REF-2026-${user.code}`],
                  ].map(([k, v], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>{k}:</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn b-secondary" onClick={() => setModalVolante(null)}>Cerrar</button>
              <button className="btn b-primary" onClick={() => { alert('Imprimiendo comprobante en PDF...'); setModalVolante(null); }}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ENTREGAR TAREA ── */}
      {modalEntrega && (
        <div className="modal-ov open">
          <div className="modal-box">
            <div className="modal-hd">
              <span className="modal-ttl">📤 Entregar: {modalEntrega.titulo}</span>
              <button className="modal-x" onClick={() => setModalEntrega(null)}>✕</button>
            </div>
            <div className="modal-bd">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: 12, marginBottom: 14, fontSize: 13 }}>
                <strong style={{ color: '#1d4ed8' }}>{modalEntrega.titulo}</strong><br />
                <span style={{ color: '#3b82f6' }}>
                  Corte {modalEntrega.corte} · Fecha: {formatDate(modalEntrega.fechaEntrega)} · {modalEntrega.puntos} pts
                </span>
              </div>
              <div className="upload-area">
                <div style={{ fontSize: 40, marginBottom: 8 }}>☁️</div>
                <p style={{ fontWeight: 600, color: '#475569', margin: 0 }}>Arrastra tu archivo aquí</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>PDF, DOCX, ZIP — máx. 20MB</p>
              </div>
              <div className="f-group" style={{ marginTop: 14 }}>
                <label className="f-label">Comentario (opcional)</label>
                <textarea className="f-ctrl" rows={2} placeholder="Escribe un comentario..."></textarea>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn b-secondary" onClick={() => setModalEntrega(null)}>Cancelar</button>
              <button className="btn b-success" onClick={() => handleEntregarTarea(modalEntrega.id)}>
                📤 Enviar entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
