import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { INITIAL_DATA, formatDate } from '../data/mockData';

export default function Curso() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const cursoId = parseInt(id, 10) || 1;
  const curso = INITIAL_DATA.cursos.find((c) => c.id === cursoId) || INITIAL_DATA.cursos[0];
  const cursoInfo = INITIAL_DATA.cursos_info[curso.id] || { programa: 'Ing. de Sistemas', semestre: 6 };

  const [activeTab, setActiveTab] = useState('inicio');
  const [actividades, setActividades] = useState(
    INITIAL_DATA.actividades.filter((a) => a.cursoId === curso.id)
  );
  const anuncios = INITIAL_DATA.anuncios.filter((a) => a.cursoId === curso.id);

  const pendientesCount = actividades.filter((a) => a.estado_est === 'pendiente').length;

  const getTipoIconAndColor = (tipo) => {
    switch (tipo) {
      case 'taller':
        return { ic: '🔧', bg: '#dbeafe' };
      case 'proyecto':
        return { ic: '📋', bg: '#ede9fe' };
      case 'quiz':
        return { ic: '❓', bg: '#fef9c3' };
      case 'informe':
        return { ic: '📝', bg: '#dcfce7' };
      case 'parcial':
        return { ic: '📄', bg: '#ffedd5' };
      default:
        return { ic: '✅', bg: '#f1f5f9' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── TOPBAR EXACTO ── */}
      <div className="pg-top">
        <div className="pg-top-inner">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Volver
          </button>
          <div className="sep" />
          <div className="breadcrumb">
            <span
              onClick={() => navigate('/dashboard')}
              style={{ cursor: 'pointer', color: '#64748b' }}
            >
              Inicio
            </span>
            <span>›</span>
            <span
              onClick={() => navigate('/dashboard')}
              style={{ cursor: 'pointer', color: '#64748b' }}
            >
              Campus Virtual
            </span>
            <span>›</span>
            <strong>{curso.nombre}</strong>
          </div>
          <div className="hdr-right">
            <span className="hdr-pill">2026-1</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '5px 12px'
            }}>
              <div className="hdr-av av-blue">
                {user?.avatar || 'CA'}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                {user?.name ? user.name.split(' ')[0] : 'Carlos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO BANNER PURPURA EXACTO ── */}
      <div className="curso-hero" style={{ background: curso.color || 'linear-gradient(135deg,#6d28d9,#8b5cf6)' }}>
        <div className="hero-inner">
          <div className="hero-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Ícono en tarjeta blanca con sombra */}
              <div className="hero-ic-box">
                {curso.icon}
              </div>
              <div className="hero-info">
                <div className="hero-tags">
                  <span className="hero-tag">{curso.codigo}</span>
                  <span className="hero-tag">Grupo {curso.grupo}</span>
                  <span className="hero-tag">{cursoInfo.programa}</span>
                  <span className="hero-tag">{cursoInfo.semestre}° Semestre</span>
                  <span className="hero-tag">2026-1</span>
                </div>
                <div className="hero-name">{curso.nombre}</div>
                <div className="hero-meta">
                  👤 {curso.profesor} &nbsp;·&nbsp; 👥 {curso.estudiantes} estudiantes
                </div>
              </div>
            </div>
            <div className="hero-btns">
              <button className="hero-btn" onClick={() => setActiveTab('asistencia')}>
                📋 Asistencia
              </button>
              <button className="hero-btn" onClick={() => setActiveTab('estudiantes')}>
                👥 Estudiantes
              </button>
            </div>
          </div>

          {/* 6 Estadísticas métricas idénticas */}
          <div className="hero-stats">
            <div className="hs">
              <div className="hs-v">{curso.progreso}%</div>
              <div className="hs-l">Progreso</div>
            </div>
            <div className="hs">
              <div className="hs-v">{actividades.length}</div>
              <div className="hs-l">Actividades</div>
            </div>
            <div className="hs">
              <div className="hs-v">{pendientesCount}</div>
              <div className="hs-l">Pendientes</div>
            </div>
            <div className="hs">
              <div className="hs-v">{curso.estudiantes}</div>
              <div className="hs-l">Estudiantes</div>
            </div>
            <div className="hs">
              <div className="hs-v">5</div>
              <div className="hs-l">Recursos</div>
            </div>
            <div className="hs">
              <div className="hs-v">16</div>
              <div className="hs-l">Semanas</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS EXACTOS ── */}
      <div className="curso-tabs">
        <div className="ct-inner">
          <button
            className={`ct-btn ${activeTab === 'inicio' ? 'active' : ''}`}
            onClick={() => setActiveTab('inicio')}
          >
            🏠 Inicio
          </button>
          <button
            className={`ct-btn ${activeTab === 'corte1' ? 'active' : ''}`}
            onClick={() => setActiveTab('corte1')}
          >
            🟩 Corte 1
          </button>
          <button
            className={`ct-btn ${activeTab === 'corte2' ? 'active' : ''}`}
            onClick={() => setActiveTab('corte2')}
          >
            🟦 Corte 2
          </button>
          <button
            className={`ct-btn ${activeTab === 'corte3' ? 'active' : ''}`}
            onClick={() => setActiveTab('corte3')}
          >
            🟧 Corte 3
          </button>
          <button
            className={`ct-btn ${activeTab === 'notas' ? 'active' : ''}`}
            onClick={() => setActiveTab('notas')}
          >
            ⭐ Notas
          </button>
          <button
            className={`ct-btn ${activeTab === 'asistencia' ? 'active' : ''}`}
            onClick={() => setActiveTab('asistencia')}
          >
            📋 Asistencia
          </button>
          <button
            className={`ct-btn ${activeTab === 'estudiantes' ? 'active' : ''}`}
            onClick={() => setActiveTab('estudiantes')}
          >
            👥 Estudiantes
          </button>
          <button
            className={`ct-btn ${activeTab === 'recursos' ? 'active' : ''}`}
            onClick={() => setActiveTab('recursos')}
          >
            📁 Recursos
          </button>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="pg-content">
        {/* ========================================================= */}
        {/* TAB 1: INICIO (EXACTO A LA IMAGEN 1)                       */}
        {/* ========================================================= */}
        {activeTab === 'inicio' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
            {/* Columna Izquierda */}
            <div>
              {/* Bloque Anuncios */}
              <div className="card">
                <div className="card-hd">
                  <span className="card-ttl">📢 Anuncios</span>
                </div>
                <div>
                  {anuncios.map((a) => (
                    <div key={a.id} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        background: '#ffedd5',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0
                      }}>
                        📢
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', margin: '0 0 3px' }}>{a.titulo}</p>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{a.contenido}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '5px 0 0' }}>{formatDate(a.fecha)} · {a.autor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloque Actividades Recientes */}
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-hd">
                  <span className="card-ttl">✅ Actividades recientes</span>
                  <button
                    onClick={() => setActiveTab('corte1')}
                    style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Ver por corte →
                  </button>
                </div>
                <div>
                  {actividades.slice(0, 4).map((a) => {
                    const { ic, bg } = getTipoIconAndColor(a.tipo);
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          flexShrink: 0
                        }}>
                          {ic}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.titulo}
                          </p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                            Corte {a.corte} · {formatDate(a.fechaEntrega)} · {a.puntos} pts
                          </p>
                        </div>
                        {a.estado_est === 'calificado' ? (
                          <span className="bs bg-g">✓ {a.nota}/{a.puntos}</span>
                        ) : a.estado_est === 'entregado' ? (
                          <span className="bs bg-b">Entregado</span>
                        ) : (
                          <span className="bs bg-y">Pendiente</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Columna Derecha (Progreso por Corte) */}
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-hd">
                  <span className="card-ttl">📊 Progreso por corte</span>
                </div>
                <div className="card-bd">
                  {/* Corte 1 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        Corte 1 <span style={{ color: '#94a3b8', fontSize: 11 }}>(30%)</span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#059669' }}>3.8</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: '76%', background: '#22c55e' }} />
                    </div>
                  </div>

                  {/* Corte 2 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        Corte 2 <span style={{ color: '#94a3b8', fontSize: 11 }}>(30%)</span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#059669' }}>4</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: '80%', background: '#3b82f6' }} />
                    </div>
                  </div>

                  {/* Corte 3 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        Corte 3 <span style={{ color: '#94a3b8', fontSize: 11 }}>(40%)</span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#94a3b8' }}>—</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: '0%', background: '#cbd5e1' }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>No iniciado</p>
                  </div>

                  {/* Nota parcial grande */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Nota parcial</span>
                    <span style={{ fontWeight: 900, fontSize: 24, color: '#4338ca' }}>3.9</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TABS CORTES 1, 2, 3                                       */}
        {/* ========================================================= */}
        {(activeTab === 'corte1' || activeTab === 'corte2' || activeTab === 'corte3') && (() => {
          const numCorte = activeTab === 'corte1' ? 1 : activeTab === 'corte2' ? 2 : 3;
          const cfg = {
            1: { label: 'Corte 1', peso: '30%', border: '#10b981', bg: '#f0fdf4', nota: 3.8 },
            2: { label: 'Corte 2', peso: '30%', border: '#3b82f6', bg: '#eff6ff', nota: 4.0 },
            3: { label: 'Corte 3', peso: '40%', border: '#8b5cf6', bg: '#faf5ff', nota: null },
          }[numCorte];

          const actsCorte = actividades.filter((a) => a.corte === numCorte);

          return (
            <div>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                borderLeft: `5px solid ${cfg.border}`,
                padding: '16px 20px',
                marginBottom: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: cfg.bg, color: cfg.border, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Peso: <strong>{cfg.peso}</strong> de la nota final
                    </span>
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    {cfg.label} — {curso.nombre}
                  </h2>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: cfg.nota ? '#059669' : '#cbd5e1' }}>
                    {cfg.nota ?? '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Nota corte</div>
                </div>
              </div>

              {actsCorte.map((a) => {
                const { ic, bg } = getTipoIconAndColor(a.tipo);
                return (
                  <div key={a.id} className="act-item">
                    <div className="act-ic-box" style={{ background: bg }}>
                      {ic}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>{a.titulo}</h4>
                          <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{a.descripcion}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a' }}>{a.puntos} pts</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: 11, color: '#ef4444' }}>📅 Entrega: {formatDate(a.fechaEntrega)}</span>
                        {a.estado_est === 'calificado' ? (
                          <span className="bs bg-g">✓ Nota: {a.nota}/{a.puntos}</span>
                        ) : (
                          <span className="bs bg-y">Pendiente</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB: NOTAS COMPLETAS                                      */}
        {/* ========================================================= */}
        {activeTab === 'notas' && (
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Resumen de Calificaciones</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Actividad</th>
                  <th style={{ padding: '10px 14px' }}>Corte</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Puntaje Obtenido</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Total</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Calificación</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{a.titulo}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>Corte {a.corte}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: a.nota ? '#059669' : '#94a3b8' }}>
                      {a.nota ?? '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>{a.puntos}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: a.nota ? '#059669' : '#94a3b8' }}>
                      {a.nota ? (a.nota / a.puntos * 5).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: ASISTENCIA                                           */}
        {/* ========================================================= */}
        {activeTab === 'asistencia' && (
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Control de Asistencia a Clases</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['05 Ago', '12 Ago', '19 Ago', '26 Ago'].map((f, i) => (
                <span key={f} className={`f-chip ${i === 2 ? 'active' : ''}`}>{f}</span>
              ))}
            </div>
            <table className="asist-tbl">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th style={{ textAlign: 'center' }}>05 Ago</th>
                  <th style={{ textAlign: 'center' }}>12 Ago</th>
                  <th style={{ textAlign: 'center' }}>19 Ago</th>
                  <th style={{ textAlign: 'center' }}>% Total</th>
                </tr>
              </thead>
              <tbody>
                {INITIAL_DATA.listaEstudiantes.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.nombre}</td>
                    <td style={{ textAlign: 'center' }}><span className="a-btn a-p">P</span></td>
                    <td style={{ textAlign: 'center' }}><span className="a-btn a-p">P</span></td>
                    <td style={{ textAlign: 'center' }}><span className="a-btn a-p">P</span></td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>100%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: ESTUDIANTES                                          */}
        {/* ========================================================= */}
        {activeTab === 'estudiantes' && (
          <div className="card">
            <div className="card-hd">
              <span className="card-ttl">👥 Lista de Estudiantes Inscritos ({INITIAL_DATA.listaEstudiantes.length})</span>
            </div>
            <div>
              {INITIAL_DATA.listaEstudiantes.map((e) => (
                <div key={e.id} className="est-row">
                  <div className="est-av av-blue">
                    {e.nombre.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{e.nombre}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Cód: {e.codigo}</p>
                  </div>
                  <span style={{ fontSize: 11, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                    Activo
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: RECURSOS                                             */}
        {/* ========================================================= */}
        {activeTab === 'recursos' && (
          <div className="card">
            <div className="card-hd">
              <span className="card-ttl">📁 Material de Clase y Recursos</span>
            </div>
            <div>
              {[
                { n: 'Guía de Normalización 3FN', t: 'PDF', p: '1.2 MB' },
                { n: 'Diapositivas Unidad 2 — SQL Avanzado', t: 'PPTX', p: '4.8 MB' },
                { n: 'Script Creación Tablas Empresa XYZ', t: 'SQL', p: '45 KB' },
              ].map((r, i) => (
                <div key={i} className="res-row">
                  <div style={{ fontSize: 24 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{r.n}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{r.t} · {r.p}</p>
                  </div>
                  <button
                    onClick={() => alert(`Descargando ${r.n}...`)}
                    className="btn b-secondary b-sm"
                  >
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
