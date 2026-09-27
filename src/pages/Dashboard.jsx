import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { INITIAL_DATA, formatCurrency, formatDate } from '../data/mockData';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function Dashboard() {
  const { user, roleLabels } = useAuth();
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState('academico'); // 'home', 'academico', 'lms', 'perfil'
  const [currentTab, setCurrentTab] = useState('certificados'); // dentro de academico: 'notas', 'certificados', 'pagos', 'horario'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(INITIAL_DATA);

  // Modales
  const [modalCert, setModalCert] = useState(null);
  const [modalVolante, setModalVolante] = useState(null);
  const [modalEntrega, setModalEntrega] = useState(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleNavigate = (view, tab = null) => {
    setCurrentView(view);
    if (tab) {
      setCurrentTab(tab);
    } else {
      if (view === 'academico') setCurrentTab('notas');
      else if (view === 'lms') setCurrentTab('cursos');
    }
  };

  const handleMarkNotifRead = (id) => {
    setData((prev) => ({
      ...prev,
      notificaciones: prev.notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    }));
  };

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

  // Cálculos de Pagos
  const totalPagado = data.pagos
    .filter((p) => p.estado === 'pagado')
    .reduce((acc, p) => acc + p.valor, 0);
  const totalPendiente = data.pagos
    .filter((p) => p.estado === 'pendiente')
    .reduce((acc, p) => acc + p.valor, 0);

  // Cálculos de Tareas
  const tareasPendientes = data.actividades.filter((a) => a.estado_est === 'pendiente');
  const tareasEntregadas = data.actividades.filter((a) => a.estado_est !== 'pendiente');

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
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          notifications={data.notificaciones}
          onMarkNotifRead={handleMarkNotifRead}
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
                <div className="stat-card">
                  <div className="stat-ic" style={{ background: '#dbeafe' }}>⭐</div>
                  <div>
                    <div className="stat-v">4.2</div>
                    <div className="stat-l">Promedio actual</div>
                    <div className="stat-ch up">▲ 0.1 vs anterior</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-ic" style={{ background: '#dcfce7' }}>📚</div>
                  <div>
                    <div className="stat-v">4</div>
                    <div className="stat-l">Materias activas</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-ic" style={{ background: '#ede9fe' }}>✅</div>
                  <div>
                    <div className="stat-v">3</div>
                    <div className="stat-l">Tareas pendientes</div>
                    <div className="stat-ch dn">1 próxima a vencer</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-ic" style={{ background: '#fef9c3' }}>💳</div>
                  <div>
                    <div className="stat-v">1</div>
                    <div className="stat-l">Pago pendiente</div>
                  </div>
                </div>
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
          {currentView === 'academico' && (
            <div className="fade-in">
              {/* Barra de Subpestañas superior idéntica a las capturas */}
              <div className="tabs-bar">
                <button
                  className={`t-btn ${currentTab === 'notas' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('notas')}
                >
                  ⭐ Mis Notas
                </button>
                <button
                  className={`t-btn ${currentTab === 'certificados' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('certificados')}
                >
                  📜 Certificados
                </button>
                <button
                  className={`t-btn ${currentTab === 'pagos' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('pagos')}
                >
                  💳 Pagos
                </button>
                <button
                  className={`t-btn ${currentTab === 'horario' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('horario')}
                >
                  📅 Horario
                </button>
              </div>

              {/* ── SUBPESTAÑA: CERTIFICADOS (EXACTO A IMAGEN 1) ── */}
              {currentTab === 'certificados' && (
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
              {currentTab === 'pagos' && (
                <div>
                  {/* 3 Tarjetas KPI superiores */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#dcfce7' }}>✅</div>
                      <div>
                        <div className="stat-v" style={{ fontSize: 20, color: '#059669' }}>{formatCurrency(totalPagado)}</div>
                        <div className="stat-l">Total pagado 2026</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#fee2e2' }}>🕐</div>
                      <div>
                        <div className="stat-v" style={{ fontSize: 20, color: '#dc2626' }}>{formatCurrency(totalPendiente)}</div>
                        <div className="stat-l">Pendiente</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#dbeafe' }}>🧾</div>
                      <div>
                        <div className="stat-v">{data.pagos.length}</div>
                        <div className="stat-l">Total recibos</div>
                      </div>
                    </div>
                  </div>

                  {/* Estado de Cuenta */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl">💳 Estado de Cuenta</span>
                    </div>
                    <div className="overflow-x">
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
                          {data.pagos.map((p) => (
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
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: HORARIO (CONSERVADO DE LA MIGRACIÓN) ── */}
              {currentTab === 'horario' && (
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
              {currentTab === 'notas' && (
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
          {currentView === 'lms' && (
            <div className="fade-in">
              <div className="tabs-bar">
                <button
                  className={`t-btn ${currentTab === 'cursos' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('cursos')}
                >
                  📚 Mis Cursos
                </button>
                <button
                  className={`t-btn ${currentTab === 'tareas' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('tareas')}
                >
                  ✅ Tareas
                </button>
                <button
                  className={`t-btn ${currentTab === 'recursos' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('recursos')}
                >
                  📁 Recursos
                </button>
              </div>

              {/* ── SUBPESTAÑA: TAREAS (EXACTO A IMAGEN 3) ── */}
              {currentTab === 'tareas' && (
                <div>
                  {/* 3 Tarjetas KPI superiores */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#ffedd5' }}>⏰</div>
                      <div>
                        <div className="stat-v" style={{ color: '#ea580c' }}>{tareasPendientes.length}</div>
                        <div className="stat-l">Pendientes</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#dcfce7' }}>✅</div>
                      <div>
                        <div className="stat-v" style={{ color: '#059669' }}>{tareasEntregadas.length}</div>
                        <div className="stat-l">Entregadas</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-ic" style={{ background: '#dbeafe' }}>📊</div>
                      <div>
                        <div className="stat-v" style={{ color: '#2563eb' }}>87%</div>
                        <div className="stat-l">Tasa de entrega</div>
                      </div>
                    </div>
                  </div>

                  {/* Todas las actividades */}
                  <div className="card">
                    <div className="card-hd">
                      <span className="card-ttl">✅ Todas las actividades</span>
                    </div>
                    <div>
                      {data.actividades.map((a) => {
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
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUBPESTAÑA: CURSOS ── */}
              {currentTab === 'cursos' && (
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
              {currentTab === 'recursos' && (
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
            <div className="card" style={{ maxWidth: 600, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div className={`s-avatar ${user.avatarClass || 'av-blue'}`} style={{ width: 56, height: 56, fontSize: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                  {user.avatar}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{user.name}</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{roleLabels[user.role]} · Código: {user.code}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, fontSize: 13 }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 700 }}>Correo Electrónico</span>
                  <strong>{user.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 700 }}>Programa</span>
                  <strong>{user.program || user.department || 'Facultad General'}</strong>
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
