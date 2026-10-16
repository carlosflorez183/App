import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, notificacionesDeRol } from '../data/mockData';
import { certificadoDescargable } from '../data/registro';
import { usePersistentData } from '../hooks/usePersistentData';
import Icon, { Ico } from '../components/Icon';
import {
  actualizarActividad,
  descargarCertificado,
  listarPorCalificar,
  marcarNotificacionLeida,
  solicitarCertificado,
} from '../api/client';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PanelInicio, { tienePanelPropio } from '../components/PanelInicio';
import { menuForRole } from '../config/navMenu';

export default function Dashboard() {
  const { user: sesion, roleLabels, logout, updateProfile } = useAuth();
  /* `user` puede llegar nulo mientras se valida la sesión, y también se queda
     nulo si el token vence a media pantalla (p. ej. al cambiar de cuenta en
     otra pestaña). Leer user.role a mano reventaba la página entera con
     "cannot read properties of null"; con un usuario vacío el enrutador
     muestra el login y no se pierde nada. */
  const user = sesion || {
    name: '', role: '', code: '', username: '', email: '', phone: '', address: '',
    avatar: '', avatarClass: 'av-blue', program: '', department: '', semester: null,
  };
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
  const [data, setData, { recargar }] = usePersistentData();

  // Si la URL pide una pestaña que este rol no tiene, se usa la primera suya.
  const tabDe = (lista, porDefecto) =>
    lista.some((i) => i.tab === currentTab) ? currentTab : lista[0]?.tab || porDefecto;
  const tabAcademico = tabDe(tabsAcademico, 'certificados');
  const tabLms = tabDe(tabsLms, 'cursos');

  // Modales
  const [modalCert, setModalCert] = useState(null);
  const [modalVolante, setModalVolante] = useState(null);
  const [modalEntrega, setModalEntrega] = useState(null);

  // Descarga de certificados: cuál está bajando y qué pasó al terminar
  const [descargando, setDescargando] = useState(null);
  const [avisoDescargas, setAvisoDescargas] = useState(null);

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

  /* Bandeja "Por Calificar" del docente: lo que sus estudiantes entregaron y
     sigue sin nota. Se pide al servidor y no se arma con el estado de la
     actividad, porque una actividad puede tener 30 entregas y ninguna
     calificada. Va antes del corte por `user` para no romper el orden de los
     hooks en los reintentos de autenticacion. */
  const esDocente = user?.role === 'profesor';
  const [porCalificar, setPorCalificar] = useState([]);
  const [errorBandeja, setErrorBandeja] = useState('');
  const cargarBandeja = useCallback(async () => {
    if (!esDocente) return;
    try {
      setPorCalificar(await listarPorCalificar());
      setErrorBandeja('');
    } catch (err) {
      setErrorBandeja(err.message);
    }
  }, [esDocente]);
  useEffect(() => { cargarBandeja(); }, [cargarBandeja]);

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
    marcarNotificacionLeida(id).catch(() => {}).finally(recargar);
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
    // Notificaciones de un módulo administrativo apuntan a su propia ruta.
    if (d.ruta) {
      navigate(`${d.ruta}${d.tab ? `?tab=${d.tab}` : ''}`);
      return;
    }
    if (d.vista) handleNavigate(d.vista, d.tab || null);
  };

  const toggleFiltro = (actual, nuevo, setter) => setter(actual === nuevo ? 'todas' : nuevo);

  const handleEntregarTarea = (actId) => {
    const act = data.actividades.find((a) => a.id === actId);
    setData((prev) => ({
      ...prev,
      actividades: prev.actividades.map((a) =>
        a.id === actId ? { ...a, estado_est: 'entregado' } : a
      ),
    }));
    if (act) {
      actualizarActividad(act.cursoId, actId, { estadoEst: 'entregado' })
        .catch(() => {})
        .finally(recargar);
    }
    setModalEntrega(null);
    alert('¡Tarea entregada exitosamente! ');
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
    solicitarCertificado(tipo).catch(() => {}).finally(recargar);
    setModalCert(null);
    alert(`Solicitud de ${tipo} enviada correctamente. Disponible en 2 a 5 días hábiles.`);
  };

  /* Descarga del certificado. El PDF lo genera el servidor con los datos
     guardados; aquí solo se pide el archivo y se le pasa al navegador. Antes
     esto era un `alert` que decía "Descargando..." sin bajar nada. */
  const handleDescargarCertificado = async (certificado) => {
    setDescargando(certificado.id);
    try {
      const nombre = await descargarCertificado(certificado.id);
      setAvisoDescargas({
        ok: true,
        texto: `Se descargó ${nombre}. Ábrelo para ver el certificado con sello de la universidad.`,
      });
    } catch (err) {
      setAvisoDescargas({
        ok: false,
        texto: `No se pudo descargar el certificado: ${err.message}`,
      });
    } finally {
      setDescargando(null);
    }
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

  /* El docente no gestiona pagos ni tiene notas propias: su portada muestra
     sus cursos y actividades, no un promedio ni un volumetrico de pagos. */
  const totalEstudiantes = data.cursos.reduce((acc, c) => acc + (c.estudiantes || 0), 0);

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
    topbarSub = esDocente ? 'Registro de notas y certificados' : 'Notas, certificados y pagos';
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
          notifications={notificacionesDeRol(data.notificaciones, user.role)}
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
                  <div className="hero-period"><Icon name="calendario" size={16} /> Viernes, 26 de Septiembre de 2026</div>
                  <div className="hero-title">Hola, {user.name.split(' ')[0]} <Icon name="estrella" size={18} /></div>
                  <div className="hero-sub">{roleLabels[user.role] || user.role} · {user.code || ''}</div>
                </div>
                <div className="hero-badge">
                  <div className="hero-badge-v">2026-1</div>
                  <div className="hero-badge-l">Período académico</div>
                </div>
              </div>

              {/* Los roles administrativos no tienen notas, cursos ni tareas:
                  su portada es la del panel del cargo, no la del estudiante. */}
              {tienePanelPropio(user.role) ? (
                <PanelInicio role={user.role} data={data} />
              ) : (
                <div>
                  {/* El docente no tiene notas ni volumetricos de pago: su
                      portada muestra lo suyo (cursos, actividades y
                      estudiantes). El alumno si ve promedio y pagos. */}
                  {esDocente ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                      <button
                        type="button"
                        className="stat-card stat-card-btn"
                        onClick={() => handleNavigate('lms', 'cursos')}
                        title="Ver mis cursos"
                      >
                        <div className="stat-ic" style={{ background: '#6d4ac4' }}><Icon name="libro" size={18} /></div>
                        <div>
                          <div className="stat-v">{data.cursos.length}</div>
                          <div className="stat-l">Mis cursos</div>
                          <div className="stat-go">Ver cursos →</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="stat-card stat-card-btn"
                        onClick={() => handleNavigate('lms', 'tareas')}
                        title="Ver entregas por revisar"
                      >
                        <div className="stat-ic" style={{ background: '#efe9fb' }}><Icon name="cuaderno" size={18} /></div>
                        <div>
                          <div className="stat-v">{porCalificar.filter((e) => !e.calificada).length}</div>
                          <div className="stat-l">Por calificar</div>
                          <div className="stat-go">Revisar entregas →</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="stat-card stat-card-btn"
                        onClick={() => handleNavigate('lms', 'cursos')}
                        title="Ver estudiantes"
                      >
                        <div className="stat-ic" style={{ background: '#d8f0e5' }}><Icon name="usuarios" size={18} /></div>
                        <div>
                          <div className="stat-v">{totalEstudiantes}</div>
                          <div className="stat-l">Estudiantes</div>
                          <div className="stat-go">Ver cursos →</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="stat-card stat-card-btn"
                        onClick={() => navigate('/docente?tab=notas')}
                        title="Ir al registro de notas"
                      >
                        <div className="stat-ic" style={{ background: '#e3f1ff' }}><Icon name="cuaderno" size={18} /></div>
                        <div>
                          <div className="stat-v">{data.materias.length}</div>
                          <div className="stat-l">Asignaturas</div>
                          <div className="stat-go">Registrar notas →</div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                      <button
                        type="button"
                        className="stat-card stat-card-btn"
                        onClick={() => handleNavigate('academico', 'notas')}
                        title="Ver mis notas"
                      >
                        <div className="stat-ic" style={{ background: '#e3f1ff' }}><Icon name="estrella" size={18} /></div>
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
                        <div className="stat-ic" style={{ background: '#d8f0e5' }}><Icon name="libro" size={18} /></div>
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
                        <div className="stat-ic" style={{ background: '#efe9fb' }}><Icon name="check" size={18} /></div>
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
                        <div className="stat-ic" style={{ background: '#fbefd6' }}><Icon name="tarjeta-credito" size={18} /></div>
                        <div>
                          <div className="stat-v">{pagosPendientes}</div>
                          <div className="stat-l">Pagos pendientes</div>
                          <div className="stat-go">Ver pagos →</div>
                        </div>
                      </button>
                    </div>
                  )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div className="card">
                  <div className="card-hd"><span className="card-ttl"> Accesos Rápidos</span></div>
                  <div className="card-bd">
                    <div className="qa-grid">
                      {/* Notas y Pagos son del alumno: el docente abre su
                          registro de notas, no un promedio que no gestiona. */}
                      {esDocente ? (
                        <button onClick={() => navigate('/docente?tab=notas')} className="qa-btn">
                          <div className="qa-ic" style={{ background: '#0a84ff' }}><Icon name="cuaderno" size={18} /></div>
                          <span className="qa-lbl">Registro Notas</span>
                        </button>
                      ) : (
                        <button onClick={() => handleNavigate('academico', 'notas')} className="qa-btn">
                          <div className="qa-ic" style={{ background: '#0a84ff' }}><Icon name="estrella" size={18} /></div>
                          <span className="qa-lbl">Mis Notas</span>
                        </button>
                      )}
                      {esDocente && (
                        <button onClick={() => handleNavigate('lms', 'tareas')} className="qa-btn">
                          <div className="qa-ic" style={{ background: '#0e8a5f' }}><Icon name="mensaje" size={18} /></div>
                          <span className="qa-lbl">Foros</span>
                        </button>
                      )}
                      {!esDocente && (
                        <button onClick={() => handleNavigate('academico', 'pagos')} className="qa-btn">
                          <div className="qa-ic" style={{ background: '#0e8a5f' }}><Icon name="tarjeta-credito" size={18} /></div>
                          <span className="qa-lbl">Pagos</span>
                        </button>
                      )}
                      <button onClick={() => handleNavigate('academico', 'certificados')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#c77e12' }}><Icon name="certificado" size={18} /></div>
                        <span className="qa-lbl">Certificados</span>
                      </button>
                      <button onClick={() => handleNavigate('lms', 'cursos')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#6d4ac4' }}><Icon name="libro" size={18} /></div>
                        <span className="qa-lbl">Mis Cursos</span>
                      </button>
                      <button onClick={() => handleNavigate('lms', 'tareas')} className="qa-btn">
                        <div className="qa-ic" style={{ background: '#c2560f' }}>{esDocente ? <><Icon name="cuaderno" size={18} /></> : <><Icon name="check" size={18} /></>}</div>
                        <span className="qa-lbl">{esDocente ? 'Por Calificar' : 'Tareas'}</span>
                      </button>
                      {!esDocente && (
                        <button onClick={() => navigate('/matricula')} className="qa-btn">
                          <div className="qa-ic" style={{ background: '#0a2fb0' }}><Icon name="cuaderno" size={18} /></div>
                          <span className="qa-lbl">Matrícula</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-hd"><span className="card-ttl"><Icon name="calendario" size={16} /> Próximos eventos</span></div>
                  <div>
                    {data.eventos.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f0eee9' }}>
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
                          background: ev.tipo === 'tarea' ? '#fbe9d8' : '#e3f1ff',
                          color: ev.tipo === 'tarea' ? '#9c4710' : '#06468c'
                        }}>
                          <span style={{ fontSize: 17, lineHeight: 1 }}>{ev.fecha}</span>
                          <span>ago</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#211d17', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.titulo}
                          </p>
                          <p style={{ fontSize: 11, color: '#9c988e', margin: '2px 0 0' }}>
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
                    <Ico name={t.icon} size={15} /> {t.label}
                  </button>
                ))}
              </div>

              {/* ── SUBPESTAÑA: CERTIFICADOS (EXACTO A IMAGEN 1) ── */}
              {tabAcademico === 'certificados' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>

                    {[
                      { ic: <Icon name="archivo" size={16} />, t: 'Certificado de Estudios', bg: '#e3f1ff' },
                      { ic: <Icon name="estrella" size={18} />, t: 'Constancia de Notas', bg: '#d8f0e5' },
                      { ic: <Icon name="check" size={18} />, t: 'Paz y Salvo Financiero', bg: '#fbefd6' },
                      { ic: 'cuaderno', t: 'Certificado de Matrícula', bg: '#efe9fb' },
                      { ic: 'graduacion', t: 'Constancia de Egresado', bg: '#dfe7ff' },
                      { ic: <Icon name="correo" size={18} />, t: 'Carta de Presentación', bg: '#fbe6ef' },
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
                          border: '2px solid #e5e2da',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                          transition: 'all .18s',
                          fontFamily: 'inherit'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#8ecbff';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#e5e2da';
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
                          <Ico name={c.ic} size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#211d17', margin: 0 }}>{c.t}</p>
                          <p style={{ fontSize: 12, color: '#6f6b62', margin: '2px 0 0' }}>Click para solicitar</p>
                        </div>
                        <span style={{ color: '#cdc9bf', fontSize: 14 }}>›</span>
                      </button>
                    ))}
                  </div>

                  {/* Tabla Mis Solicitudes */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl"><Icon name="reloj" size={16} /> Mis Solicitudes</span>
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
                                <span className={`bs ${certificadoDescargable(c) ? 'bg-g' : 'bg-y'}`}>
                                  {certificadoDescargable(c)
                                    ? (c.estado === 'entregado' ? <><Icon name="check" size={18} /> Entregado</> : <><Icon name="check" size={18} /> Disponible</>)
                                    : <><Icon name="reloj" size={14} /> En proceso</>}
                                </span>
                              </td>
                              <td>
                                {certificadoDescargable(c) ? (
                                  <button
                                    onClick={() => handleDescargarCertificado(c)}
                                    disabled={descargando === c.id}
                                    data-testid={`descargar-certificado-${c.id}`}
                                    className="btn b-primary b-sm"
                                  >
                                    {descargando === c.id ? <><Icon name="reloj" size={14} /> Generando...</> : <><Icon name="descargar" size={18} /> Descargar</>}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#9c988e' }}>En proceso...</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Lo que pasó al pedir el archivo. Sin esto el botón
                        "funcionaba" y nadie sabía por qué a veces no bajaba
                        nada: un 409 o un token vencido se veían igual. */}
                    {avisoDescargas && (
                      <div
                        role="status"
                        data-testid="aviso-descarga-certificado"
                        style={{
                          margin: '0 18px 16px', padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: avisoDescargas.ok ? '#d8f0e5' : '#ffe0e5',
                          color: avisoDescargas.ok ? '#0a6e4b' : '#c1122c',
                        }}
                      >
                        {avisoDescargas.texto}
                      </div>
                    )}
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
                      <div className="stat-ic" style={{ background: '#d8f0e5' }}><Icon name="check" size={18} /></div>
                      <div>
                        <div className="stat-v" style={{ fontSize: 20, color: '#0e8a5f' }}>{formatCurrency(totalPagado)}</div>
                        <div className="stat-l">Total pagado 2026</div>
                        <div className="stat-go">{pagosFiltro === 'pagados' ? <><Icon name="check" size={14} /> Filtrando</> : 'Ver solo pagados →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${pagosFiltro === 'pendientes' ? 'is-active' : ''}`}
                      onClick={() => toggleFiltro(pagosFiltro, 'pendientes', setPagosFiltro)}
                      aria-pressed={pagosFiltro === 'pendientes'}
                    >
                      <div className="stat-ic" style={{ background: '#ffe0e5' }}><Icon name="reloj" size={16} /></div>
                      <div>
                        <div className="stat-v" style={{ fontSize: 20, color: '#d2233c' }}>{formatCurrency(totalPendiente)}</div>
                        <div className="stat-l">Pendiente</div>
                        <div className="stat-go">{pagosFiltro === 'pendientes' ? <><Icon name="check" size={14} /> Filtrando</> : 'Ver solo pendientes →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${pagosFiltro === 'todos' ? 'is-active' : ''}`}
                      onClick={() => setPagosFiltro('todos')}
                      aria-pressed={pagosFiltro === 'todos'}
                    >
                      <div className="stat-ic" style={{ background: '#e3f1ff' }}><Icon name="recibo" size={18} /></div>
                      <div>
                        <div className="stat-v">{data.pagos.length}</div>
                        <div className="stat-l">Total recibos</div>
                        <div className="stat-go">{pagosFiltro === 'todos' ? <><Icon name="check" size={14} /> Mostrando todo</> : 'Ver todos →'}</div>
                      </div>
                    </button>
                  </div>

                  {/* Estado de Cuenta */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl"><Icon name="tarjeta-credito" size={18} /> Estado de Cuenta</span>
                      <span className="bs bg-s">
                        {pagosVisibles.length} de {data.pagos.length} recibos
                        {pagosFiltro !== 'todos' && ' · filtrado'}
                      </span>
                    </div>
                    <div className="overflow-x">
                      {pagosVisibles.length === 0 ? (
                        <div style={{ padding: '28px 20px', textAlign: 'center', color: '#9c988e', fontSize: 13 }}>
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
                                  {p.estado === 'pagado' ? <><Icon name="check" size={18} /> Pagado</> : <><Icon name="x" size={14} /> Pendiente</>}
                                </span>
                              </td>
                              <td>
                                {p.estado === 'pagado' ? (
                                  <button
                                    onClick={() => alert(`Imprimiendo comprobante de ${p.concepto}...`)}
                                    className="btn b-secondary b-sm"
                                  >
                                    <Icon name="recibo" size={18} /> Comprobante
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setModalVolante(p)}
                                    className="btn b-primary b-sm"
                                  >
                                    <Icon name="archivo" size={16} /> Volante
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
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#211d17' }}>
                    Horario Semanal — Periodo 2026-1
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((dia) => (
                      <div key={dia} style={{ background: '#f7f6f3', borderRadius: 12, padding: 14, border: '1px solid #e5e2da', minHeight: 220 }}>
                        <div style={{ fontWeight: 800, color: '#00116f', fontSize: 13, marginBottom: 10, borderBottom: '1px solid #cdc9bf', paddingBottom: 6 }}>
                          {dia}
                        </div>
                        <div style={{ background: '#eef7ff', borderLeft: '3px solid #0a5cae', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#04295f' }}>7:00am - 9:00am</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#211d17' }}>Bases de Datos II</div>
                          <div style={{ fontSize: 10, color: '#6f6b62' }}>Lab B-205</div>
                        </div>
                        <div style={{ background: '#f4f0fb', borderLeft: '3px solid #8a5cf0', padding: '8px 10px', borderRadius: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#4e2a94' }}>9:00am - 11:00am</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#211d17' }}>Ingeniería de Software</div>
                          <div style={{ fontSize: 10, color: '#6f6b62' }}>Aula 304</div>
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
                      <div className="stat-ic" style={{ background: '#e3f1ff' }}><Icon name="estrella" size={18} /></div>
                      <div>
                        <div className="stat-v">4.2</div>
                        <div className="stat-l">Promedio 2026-1</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#d8f0e5' }}><Icon name="libro" size={18} /></div>
                      <div>
                        <div className="stat-v">{data.materias.filter(m => m.periodo === '2026-1').length}</div>
                        <div className="stat-l">Materias activas</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#efe9fb' }}>graduacion</div>
                      <div>
                        <div className="stat-v">82</div>
                        <div className="stat-l">Créditos acumulados</div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl"><Icon name="estrella" size={18} /> Materias — Semestre 2026-1</span>
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
                              <td><code style={{ fontSize: 11, color: '#6f6b62' }}>{m.codigo}</code></td>
                              <td><strong>{m.nombre}</strong><br /><span style={{ fontSize: 11, color: '#9c988e' }}>{m.profesor}</span></td>
                              <td style={{ textAlign: 'center' }}>{m.creditos}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: m.nota1 >= 3 ? '#0e8a5f' : '#d2233c' }}>{m.nota1 ?? '—'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: m.nota2 >= 3 ? '#0e8a5f' : '#d2233c' }}>{m.nota2 ?? '—'}</td>
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
                    <Ico name={t.icon} size={15} /> {t.label}
                  </button>
                ))}
              </div>

              {/* ── SUBPESTAÑA: TAREAS ──
                  Para el estudiante son las actividades que tiene por
                  entregar. Para el docente es la bandeja de lo que recibio
                  y tiene que revisar: ver el documento y poner la nota. */}
              {tabLms === 'tareas' && esDocente && (
                <div data-testid="docente-por-calificar">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#fbe9d8' }}><Icon name="reloj" size={18} /></div>
                      <div>
                        <div className="stat-v" style={{ color: '#c2560f' }}>
                          {porCalificar.filter((e) => !e.calificada).length}
                        </div>
                        <div className="stat-l">Sin calificar</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#d8f0e5' }}><Icon name="check" size={18} /></div>
                      <div>
                        <div className="stat-v" style={{ color: '#0e8a5f' }}>
                          {porCalificar.filter((e) => e.calificada).length}
                        </div>
                        <div className="stat-l">Calificadas</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#e3f1ff' }}><Icon name="archivo" size={16} /></div>
                      <div>
                        <div className="stat-v" style={{ color: '#0a5cae' }}>
                          {porCalificar.filter((e) => e.archivo).length}
                        </div>
                        <div className="stat-l">Con documento</div>
                      </div>
                    </div>
                  </div>

                  {errorBandeja && (
                    <div className="card" style={{ padding: 16, marginBottom: 16, color: '#8f0d22', fontSize: 13 }}>
                      No se pudo cargar la bandeja: {errorBandeja}
                    </div>
                  )}

                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl"><Icon name="cuaderno" size={18} /> Entregas por revisar</span>
                      <button type="button" className="btn b-outline b-sm" onClick={cargarBandeja}>
                        Actualizar
                      </button>
                    </div>
                    <div>
                      {porCalificar.length === 0 ? (
                        <div style={{ padding: '28px 20px', textAlign: 'center', color: '#9c988e', fontSize: 13 }}>
                          No hay entregas por revisar. Cuando un estudiante entregue algo, aparecerá aquí.
                        </div>
                      ) : (
                        porCalificar.map((e) => (
                          <div
                            key={e.entregaId}
                            style={{ padding: '14px 20px', borderBottom: '1px solid #f0eee9', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
                          >
                            <div style={{ flex: 1, minWidth: 220 }}>
                              <p style={{ fontWeight: 700, color: '#211d17', fontSize: 14, margin: '0 0 2px' }}>
                                {e.estudiante}
                              </p>
                              <p style={{ fontSize: 12, color: '#6f6b62', margin: 0 }}>
                                {e.titulo} · Corte {e.corte} · {e.puntos} pts
                              </p>
                              <p style={{ fontSize: 11, color: '#9c988e', margin: '3px 0 0' }}>
                                {e.archivo ? <><Icon name="archivo" size={16} />{e.archivo}</> : e.tieneRespuestas ? <><Icon name="cuaderno" size={18} /> Respuestas del parcial</> : 'Sin documento'}
                                {e.entregadoEn ? ` · ${formatDate(e.entregadoEn)}` : ''}
                              </p>
                            </div>
                            <span className={`bs ${e.calificada ? 'bg-g' : 'bg-y'}`}>
                              {e.calificada ? `Nota ${e.nota}` : 'Sin calificar'}
                            </span>
                        <button
                          type="button"
                          className="btn b-primary b-sm"
                          onClick={() => navigate(`/curso/${e.cursoId}?tab=entrega&id=${e.actividadId}&est=${e.estudianteId}&volver=actividad`)}
                        >
                              {e.calificada ? 'Ver hoja' : 'Revisar y calificar'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tabLms === 'tareas' && !esDocente && (
                <div>
                  {/* 3 Tarjetas KPI — clicables = filtro */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${tareasFiltro === 'pendientes' ? 'is-active' : ''}`}
                      onClick={() => toggleFiltro(tareasFiltro, 'pendientes', setTareasFiltro)}
                      aria-pressed={tareasFiltro === 'pendientes'}
                    >
                      <div className="stat-ic" style={{ background: '#fbe9d8' }}><Icon name="reloj" size={18} /></div>
                      <div>
                        <div className="stat-v" style={{ color: '#c2560f' }}>{tareasPendientes.length}</div>
                        <div className="stat-l">Pendientes</div>
                        <div className="stat-go">{tareasFiltro === 'pendientes' ? <><Icon name="check" size={14} /> Filtrando</> : 'Ver solo pendientes →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${tareasFiltro === 'entregadas' ? 'is-active' : ''}`}
                      onClick={() => toggleFiltro(tareasFiltro, 'entregadas', setTareasFiltro)}
                      aria-pressed={tareasFiltro === 'entregadas'}
                    >
                      <div className="stat-ic" style={{ background: '#d8f0e5' }}><Icon name="check" size={18} /></div>
                      <div>
                        <div className="stat-v" style={{ color: '#0e8a5f' }}>{tareasEntregadas.length}</div>
                        <div className="stat-l">Realizadas</div>
                        <div className="stat-go">{tareasFiltro === 'entregadas' ? <><Icon name="check" size={14} /> Filtrando</> : 'Ver solo realizadas →'}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`stat-card stat-card-btn ${tareasFiltro === 'todas' ? 'is-active' : ''}`}
                      onClick={() => setTareasFiltro('todas')}
                      aria-pressed={tareasFiltro === 'todas'}
                    >
                      <div className="stat-ic" style={{ background: '#e3f1ff' }}><Icon name="grafica-barras" size={18} /></div>
                      <div>
                        <div className="stat-v" style={{ color: '#0a5cae' }}>{tasaEntrega}%</div>
                        <div className="stat-l">Tasa de entrega</div>
                        <div className="stat-go">{tareasFiltro === 'todas' ? <><Icon name="check" size={14} /> Mostrando todo</> : 'Ver todas →'}</div>
                      </div>
                    </button>
                  </div>

                  {/* Actividades filtradas */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl"><Icon name="check" size={18} /> Actividades</span>
                      <span className="bs bg-s">
                        {tareasVisibles.length} de {data.actividades.length}
                        {tareasFiltro !== 'todas' && ' · filtrado'}
                      </span>
                    </div>
                    <div>
                      {tareasVisibles.length === 0 ? (
                        <div style={{ padding: '28px 20px', textAlign: 'center', color: '#9c988e', fontSize: 13 }}>
                          No hay actividades que coincidan con este filtro.
                        </div>
                      ) : (
                      tareasVisibles.map((a) => {
                        const cursoObj = data.cursos.find((c) => c.id === a.cursoId);
                        const tcol = {
                          taller: { bg: '#e3f1ff', color: '#06468c' },
                          quiz: { bg: '#fbefd6', color: '#99610e' },
                          proyecto: { bg: '#efe9fb', color: '#5a37ad' },
                          informe: { bg: '#d8f0e5', color: '#0a6e4b' },
                        }[a.tipo] || { bg: '#f0eee9', color: '#4e4a43' };

                        return (
                          <div key={a.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f0eee9' }}>
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
                                  <span style={{ fontSize: 12, color: '#9c988e' }}>{cursoObj?.nombre || ''}</span>
                                </div>
                                <p style={{ fontWeight: 700, color: '#211d17', fontSize: 14, margin: '0 0 2px' }}>{a.titulo}</p>
                                <p style={{ fontSize: 13, color: '#6f6b62', margin: '0 0 6px' }}>{a.descripcion}</p>
                                <p style={{ fontSize: 11, color: '#9c988e', margin: 0 }}>
                                  <Icon name="calendario" size={16} /> {formatDate(a.fechaEntrega)} · <Icon name="estrella" size={18} /> {a.puntos} pts · Corte {a.corte || '?'}
                                </p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                <span className={`bs ${a.estado_est === 'calificado' ? 'bg-g' : (a.estado_est === 'entregado' ? 'bg-b' : 'bg-r')}`}>
                                  {a.estado_est === 'calificado' ? <><Icon name="check" size={14} />{a.nota}/{a.puntos}</> : (a.estado_est === 'entregado' ? 'Entregado' : 'Pendiente')}
                                </span>
                                {a.estado_est === 'pendiente' && (
                                  <button
                                    onClick={() => setModalEntrega(a)}
                                    className="btn b-primary b-sm"
                                  >
                                    subir Entregar
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
                    <strong style={{ color: '#3a3630' }}>{data.cursos.length} cursos activos — 2026-1</strong>
                    {esDocente ? (
                      /* El docente no se matricula a si mismo: matricula a los
                         alumnos de SU curso, asi que el botón lo lleva a la
                         lista de inscritos del primer curso que tiene. */
                      <button
                        onClick={() => data.cursos[0] && navigate(`/curso/${data.cursos[0].id}?tab=estudiantes`)}
                        className="btn b-outline b-sm"
                        disabled={!data.cursos.length}
                      >
                        <Icon name="usuarios" size={18} /> Inscribir estudiantes
                      </button>
                    ) : (
                      <button onClick={() => navigate('/matricula')} className="btn b-outline b-sm">
                        <Icon name="cuaderno" size={18} /> Ir a Matrícula
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {data.cursos.map((c) => (
                      <div
                        key={c.id}
                        className="course-card"
                        onClick={() => navigate(`/curso/${c.id}`)}
                      >
                        <div className="course-img" style={{ background: c.color }}><Ico name={c.icon} size={22} /></div>
                        <div className="course-info">
                          <div className="course-title">{c.nombre}</div>
                          <div className="course-meta">marcador {c.codigo} · Grupo {c.grupo}</div>
                          <div className="course-meta"><Icon name="usuario" size={16} /> {c.profesor}</div>
                          <div className="course-meta" style={{ marginBottom: 10 }}><Icon name="usuarios" size={18} /> {c.estudiantes} estudiantes</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: '#6f6b62' }}>Progreso</span>
                            <span style={{ fontWeight: 700 }}>{c.progreso}%</span>
                          </div>
                          <div className="prog-bar">
                            <div
                              className="prog-fill"
                              style={{
                                width: `${c.progreso}%`,
                                background: c.progreso === 100 ? '#17a06d' : (c.progreso > 60 ? '#0a84ff' : '#e0a52e')
                              }}
                            />
                          </div>
                          {/* Acceso directo a la matriculacion del propio curso:
                              abrir el curso y luego buscar la pestaña hace
                              demasiado trabajo para una acción frecuente. */}
                          {esDocente && (
                            <button
                              className="btn b-outline b-sm"
                              style={{ marginTop: 10, width: '100%' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/curso/${c.id}?tab=estudiantes`);
                              }}
                            >
                              <Icon name="usuarios" size={18} /> Gestionar inscritos
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: RECURSOS ── */}
              {tabLms === 'recursos' && (
                <div className="card">
                  <div className="card-hd"><span className="card-ttl"><Icon name="carpeta" size={16} /> Material Institucional</span></div>
                  <div>
                    {[
                      { nom: 'Calendario Académico 2026', t: 'PDF', p: '1.4 MB' },
                      { nom: 'Reglamento Estudiantil Vigente', t: 'PDF', p: '2.8 MB' },
                      { nom: 'Guía de Estilos de Grado y Tesis', t: 'DOCX', p: '520 KB' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #f0eee9' }}>
                        <div style={{ fontSize: 26 }}><Icon name="archivo" size={16} /></div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#211d17', margin: 0 }}>{r.nom}</p>
                          <p style={{ fontSize: 11, color: '#9c988e', margin: '2px 0 0' }}>{r.t} · {r.p}</p>
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
                  <span className="card-ttl"><Icon name="usuario" size={16} /> Mi Perfil</span>
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
                      <p style={{ fontSize: 12, color: '#6f6b62', margin: '4px 0 0' }}>
                        Código institucional: <strong>{user.code}</strong>
                      </p>
                    </div>
                  </div>

                  {/* ── Datos académicos (solo lectura: los emite el sistema) ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, padding: 14, background: '#f7f6f3', border: '1px solid #e5e2da', borderRadius: 10 }}>
                    <div>
                      <span style={{ color: '#6f6b62', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                        {user.program ? 'Programa' : 'Dependencia'}
                      </span>
                      <strong style={{ fontSize: 13 }}>{user.program || user.department || 'Facultad General'}</strong>
                    </div>
                    {user.semester && (
                      <div>
                        <span style={{ color: '#6f6b62', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                          Semestre
                        </span>
                        <strong style={{ fontSize: 13 }}>{user.semester}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#6f6b62', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                        Sesión iniciada
                      </span>
                      <strong style={{ fontSize: 13 }}>{user.username || user.code || '—'}</strong>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#9c988e', margin: '10px 0 0' }}>
                    <Icon name="info" size={14} /> Los datos académicos los administra la institución y no se pueden editar desde el portal.
                  </p>
                </div>
              </div>

              {/* ── Datos personales: lectura + modo edición ── */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl"> Datos Personales</span>
                  {!editando && (
                    <button type="button" className="btn b-outline b-sm" onClick={handleEditProfile}>
                      <Icon name="editar" size={16} /> Editar Información
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
                          <span style={{ color: '#6f6b62', display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
                            {label}
                          </span>
                          <strong style={{ fontSize: 13.5, color: value ? '#211d17' : '#9c988e', fontWeight: value ? 600 : 400 }}>
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
                        background: perfilMsg.ok ? '#d8f0e5' : '#ffe0e5',
                        color: perfilMsg.ok ? '#0a6e4b' : '#c1122c',
                        border: `1px solid ${perfilMsg.ok ? '#a7e3c8' : '#f4b6bf'}`,
                        padding: '10px 14px',
                        borderRadius: 9,
                        fontSize: 13,
                        marginTop: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{perfilMsg.ok ? <><Icon name="check" size={18} /></> : <><Icon name="alerta" size={14} /></>}</span>
                      <span>{perfilMsg.text}</span>
                    </div>
                  )}

                  {editando && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                      <button type="button" className="btn b-primary" onClick={handleSaveProfile}>
                        <Icon name="guardar" size={16} /> Guardar Cambios
                      </button>
                      <button type="button" className="btn b-secondary" onClick={handleResetProfile}>
                        <Icon name="flecha-izquierda" size={16} /> Descartar Cambios
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Acciones ── */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl"><Icon name="config" size={16} /> Acciones</span>
                </div>
                <div className="card-bd" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn b-secondary" onClick={() => handleNavigate('academico', 'certificados')}>
                    <Icon name="certificado" size={18} /> Mis Certificados
                  </button>
                  <button type="button" className="btn b-secondary" onClick={() => handleNavigate('academico', 'pagos')}>
                    <Icon name="tarjeta-credito" size={18} /> Estado de Cuenta
                  </button>
                  <button
                    type="button"
                    className="btn b-danger"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    <Icon name="salir" size={16} /> Cerrar Sesión
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
              <span className="modal-ttl"><Icon name="archivo" size={16} /> Solicitar: {modalCert}</span>
              <button className="modal-x" onClick={() => setModalCert(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-bd">
              <div style={{ background: '#eef7ff', border: '1px solid #cfe8ff', borderRadius: 9, padding: 12, fontSize: 13, color: '#06468c', marginBottom: 16 }}>
                <Icon name="info" size={14} /> Disponible en <strong>2 a 5 días hábiles</strong> después de la solicitud.
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
                <Icon name="subir" size={18} /> Enviar Solicitud
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
              <span className="modal-ttl"><Icon name="archivo" size={16} /> Volante de Pago</span>
              <button className="modal-x" onClick={() => setModalVolante(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-bd">
              <div style={{ border: '2px dashed #cdc9bf', borderRadius: 14, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}><Icon name="edificio" size={18} /></div>
                <h3 style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>UniPlataforma — Universidad</h3>
                <p style={{ color: '#6f6b62', fontSize: 13, margin: '4px 0 16px' }}>NIT: 900.123.456-7</p>
                <div style={{ background: '#f7f6f3', borderRadius: 10, padding: 16, textAlign: 'left' }}>
                  {[
                    ['Estudiante', user.name],
                    ['Código', user.code],
                    ['Concepto', modalVolante.concepto],
                    ['Valor', formatCurrency(modalVolante.valor)],
                    ['Vence', '25 de julio de 2026'],
                    ['Referencia', `REF-2026-${user.code}`],
                  ].map(([k, v], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e5e2da', fontSize: 13 }}>
                      <span style={{ color: '#6f6b62' }}>{k}:</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn b-secondary" onClick={() => setModalVolante(null)}>Cerrar</button>
              <button className="btn b-primary" onClick={() => { alert('Imprimiendo comprobante en PDF...'); setModalVolante(null); }}>
                imprimir Imprimir
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
              <span className="modal-ttl"><Icon name="subir" size={18} /> Entregar: {modalEntrega.titulo}</span>
              <button className="modal-x" onClick={() => setModalEntrega(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-bd">
              <div style={{ background: '#eef7ff', border: '1px solid #cfe8ff', borderRadius: 9, padding: 12, marginBottom: 14, fontSize: 13 }}>
                <strong style={{ color: '#06468c' }}>{modalEntrega.titulo}</strong><br />
                <span style={{ color: '#0a84ff' }}>
                  Corte {modalEntrega.corte} · Fecha: {formatDate(modalEntrega.fechaEntrega)} · {modalEntrega.puntos} pts
                </span>
              </div>
              <div className="upload-area">
                <div style={{ fontSize: 40, marginBottom: 8 }}><Icon name="subir" size={40} /></div>
                <p style={{ fontWeight: 600, color: '#4e4a43', margin: 0 }}>Arrastra tu archivo aquí</p>
                <p style={{ fontSize: 12, color: '#9c988e', margin: '4px 0 0' }}>PDF, DOCX, ZIP — máx. 20MB</p>
              </div>
              <div className="f-group" style={{ marginTop: 14 }}>
                <label className="f-label">Comentario (opcional)</label>
                <textarea className="f-ctrl" rows={2} placeholder="Escribe un comentario..."></textarea>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn b-secondary" onClick={() => setModalEntrega(null)}>Cancelar</button>
              <button className="btn b-success" onClick={() => handleEntregarTarea(modalEntrega.id)}>
                <Icon name="subir" size={18} /> Enviar entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
