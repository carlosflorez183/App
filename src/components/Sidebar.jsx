import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { menuForRole, NAV_SEC_STYLE } from '../config/navMenu';

export default function Sidebar({ currentView, currentTab, onNavigate, isOpen, onClose }) {
  const { user, logout, roleLabels } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  if (!user) return null;

  const isRouteActive = (item) => {
    if (pathname !== item.to) return false;
    if (!item.tab) return !search;
    return new URLSearchParams(search).get('tab') === item.tab;
  };

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

        {/* Menú de navegación dirigido por rol (src/config/navMenu.js) */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: '10px 0' }}>
          {menuForRole(user.role).map((sec) => (
            <div key={sec.section}>
              <div className="nav-sec" style={{ ...NAV_SEC_STYLE, marginTop: 10 }}>
                {sec.section.toUpperCase()}
              </div>
              {sec.items.map((item) => {
                const active = item.kind === 'view'
                  ? isItemActive(item.view, item.tab)
                  : isRouteActive(item);
                return (
                  <div
                    key={item.key}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => {
                      if (item.kind === 'view') onNavigate(item.view, item.tab);
                      else navigate(`${item.to}${item.tab ? `?tab=${item.tab}` : ''}`);
                      onClose();
                    }}
                  >
                    <span className="ni">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge ? <span className="nb">{item.badge}</span> : null}
                  </div>
                );
              })}
            </div>
          ))}
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
