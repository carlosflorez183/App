import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentView, currentTab, onNavigate, isOpen, onClose }) {
  const { user, logout, roleLabels } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isEst = user.role === 'estudiante';
  const isProf = user.role === 'profesor';

  const isItemActive = (view, tab) => {
    if (tab) {
      return currentView === view && currentTab === tab;
    }
    return currentView === view;
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 90,
            display: 'block'
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
        width: 260,
        background: 'linear-gradient(180deg, #1e3a8a 0%, #1e1b4b 100%)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflowY: 'auto'
      }}>
        {/* Logo exacto al original */}
        <div className="sidebar-logo" style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div className="logo-ic" style={{
            width: 42,
            height: 42,
            background: 'rgba(255,255,255,.15)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#fff',
            flexShrink: 0
          }}>
            🏛️
          </div>
          <div>
            <div className="logo-txt" style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              UniPlataforma
            </div>
            <div className="logo-sub" style={{ color: 'rgba(255,255,255,.5)', fontSize: 10 }}>
              Sistema Integrado
            </div>
          </div>
        </div>

        {/* Info de usuario en Sidebar */}
        <div className="sidebar-user" style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div className={`s-avatar ${user.avatarClass || 'av-blue'}`} style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0
          }}>
            {user.avatar || 'CA'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="s-name" style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div className="s-role" style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>
              {roleLabels[user.role] || user.role}
            </div>
          </div>
        </div>

        {/* Menú de Navegación idéntico al original */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: '10px 0' }}>
          {/* PRINCIPAL */}
          <div className="nav-sec" style={{ padding: '8px 20px 3px', color: 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            PRINCIPAL
          </div>
          <div
            className={`nav-item ${isItemActive('home') ? 'active' : ''}`}
            onClick={() => { onNavigate('home'); onClose(); }}
          >
            <span className="ni">🏠</span>
            <span>Inicio</span>
          </div>

          {/* ACADÉMICO */}
          <div className="nav-sec" style={{ padding: '8px 20px 3px', color: 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 10 }}>
            ACADÉMICO
          </div>
          {isEst && (
            <>
              <div
                className={`nav-item ${isItemActive('academico', 'notas') ? 'active' : ''}`}
                onClick={() => { onNavigate('academico', 'notas'); onClose(); }}
              >
                <span className="ni">⭐</span>
                <span>Mis Notas</span>
              </div>
              <div
                className={`nav-item ${isItemActive('academico', 'certificados') ? 'active' : ''}`}
                onClick={() => { onNavigate('academico', 'certificados'); onClose(); }}
              >
                <span className="ni">📜</span>
                <span>Certificados</span>
              </div>
              <div
                className={`nav-item ${isItemActive('academico', 'pagos') ? 'active' : ''}`}
                onClick={() => { onNavigate('academico', 'pagos'); onClose(); }}
              >
                <span className="ni">💳</span>
                <span>Pagos / Volante</span>
              </div>
              <div
                className={`nav-item ${isItemActive('academico', 'horario') ? 'active' : ''}`}
                onClick={() => { onNavigate('academico', 'horario'); onClose(); }}
              >
                <span className="ni">📅</span>
                <span>Mi Horario</span>
              </div>
            </>
          )}

          {isProf && (
            <>
              <div
                className={`nav-item ${isItemActive('academico', 'registro_notas') ? 'active' : ''}`}
                onClick={() => { onNavigate('academico', 'registro_notas'); onClose(); }}
              >
                <span className="ni">⭐</span>
                <span>Registro Notas</span>
              </div>
              <div
                className={`nav-item ${isItemActive('academico', 'notas') ? 'active' : ''}`}
                onClick={() => { onNavigate('academico', 'notas'); onClose(); }}
              >
                <span className="ni">📋</span>
                <span>Ver Notas</span>
              </div>
              <div
                className={`nav-item ${isItemActive('academico', 'certificados') ? 'active' : ''}`}
                onClick={() => { onNavigate('academico', 'certificados'); onClose(); }}
              >
                <span className="ni">📜</span>
                <span>Certificados</span>
              </div>
            </>
          )}

          {/* CAMPUS VIRTUAL */}
          <div className="nav-sec" style={{ padding: '8px 20px 3px', color: 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 10 }}>
            CAMPUS VIRTUAL
          </div>
          <div
            className={`nav-item ${isItemActive('lms', 'cursos') ? 'active' : ''}`}
            onClick={() => { onNavigate('lms', 'cursos'); onClose(); }}
          >
            <span className="ni">📚</span>
            <span>Mis Cursos</span>
          </div>
          <div
            className={`nav-item ${isItemActive('lms', 'tareas') ? 'active' : ''}`}
            onClick={() => { onNavigate('lms', 'tareas'); onClose(); }}
          >
            <span className="ni">✅</span>
            <span>Tareas</span>
            <span className="nb">2</span>
          </div>
          <div
            className={`nav-item ${isItemActive('lms', 'recursos') ? 'active' : ''}`}
            onClick={() => { onNavigate('lms', 'recursos'); onClose(); }}
          >
            <span className="ni">📁</span>
            <span>Recursos</span>
          </div>

          {/* MATRÍCULA */}
          <div className="nav-sec" style={{ padding: '8px 20px 3px', color: 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 10 }}>
            MATRÍCULA
          </div>
          <div
            className="nav-item"
            onClick={() => { navigate('/matricula'); onClose(); }}
          >
            <span className="ni">📝</span>
            <span>Matricular Materias</span>
          </div>

          {/* PERSONAL */}
          <div className="nav-sec" style={{ padding: '8px 20px 3px', color: 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 10 }}>
            PERSONAL
          </div>
          <div
            className={`nav-item ${isItemActive('perfil') ? 'active' : ''}`}
            onClick={() => { onNavigate('perfil'); onClose(); }}
          >
            <span className="ni">👤</span>
            <span>Mi Perfil</span>
          </div>
        </nav>

        {/* Footer Cerrar Sesión */}
        <div className="sidebar-foot" style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <button
            className="btn-logout"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
