import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { menuForRole, NAV_SEC_STYLE, TAB_POR_DEFECTO } from '../config/navMenu';
import Icon from './Icon';

export default function Sidebar({ currentView, currentTab, onNavigate, isOpen, onClose, compactModuleNav = false, compactModuleLabel, compactModulePath = null, compactModuleView = null, collapseModuleNav = false, hideStudentSections = false, collapseSectionPath = null, seccionesOcultas = [] }) {
  const { user, logout, roleLabels } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  if (!user) return null;

  const isRouteActive = (item) => {
    if (pathname !== item.to) return false;
    if (item.key.startsWith('module-')) return true;
    if (!item.tab) return !search;
    // Entrar a /admisiones sin ?tab= abre la pestaña por defecto, no deja
    // el menú sin nada resaltado.
    const actual = new URLSearchParams(search).get('tab') || TAB_POR_DEFECTO[item.to];
    return actual === item.tab;
  };

  const isItemActive = (view, tab) => {
    if (tab) {
      return currentView === view && currentTab === tab;
    }
    return currentView === view;
  };

  const menuBase = menuForRole(user.role, user.estudiante);
  /* El estudiante no ve el detalle del sidebar (Notas, Certificados, Pagos…):
     solo la entrada principal del módulo y, al entrar, las pestañas quedan en
     la barra superior, igual que los demás roles. */
  const menuVisual = (user.role === 'estudiante' || user.role === 'profesor')
    ? menuBase.map((sec) => {
      if (sec.section === 'Académico') {
        return {
          section: sec.section,
          items: [{ key: 'academico', label: sec.section, icon: 'notas', kind: 'view', view: 'academico' }],
        };
      }
      if (sec.section === 'Campus Virtual') {
        return {
          section: sec.section,
          items: [{ key: 'lms', label: sec.section, icon: 'cursos', kind: 'view', view: 'lms' }],
        };
      }
      return sec;
    })
    : menuBase;
  const sections = menuVisual
    .map((sec) => {
      if (!compactModuleNav) return sec;
      /* Ruta que identifica la sección a colapsar (puede diferir de la ruta del
     módulo actual, p. ej. en Consultar Pensum se colapsa Admisiones). */
  const rutaColapso = collapseSectionPath || compactModulePath;
  const isCurrentModule = sec.items.some((item) => (
        (rutaColapso && item.kind === 'route' && item.to === rutaColapso)
        ||
        (!rutaColapso && compactModuleView && item.kind === 'view' && item.view === compactModuleView)
        ||
        (!rutaColapso && item.kind === 'route' && item.to === pathname && item.tab)
        || (!rutaColapso && !compactModuleView && item.kind === 'view' && item.view === currentView)
      ));
      if (compactModulePath && isCurrentModule && collapseModuleNav) {
        return {
          ...sec,
          items: [{
            key: `module-summary-${compactModulePath || compactModuleView}`,
            label: (collapseSectionPath && collapseSectionPath !== compactModulePath)
              ? sec.section
              : (compactModuleLabel || sec.section),
            icon: 'admin-resumen',
            kind: compactModuleView ? 'view' : 'route',
            view: compactModuleView || undefined,
            to: (collapseSectionPath && collapseSectionPath !== compactModulePath)
              ? collapseSectionPath
              : (compactModulePath || undefined),
            tab: undefined,
          }],
        };
      }
      return sec;
    })
    .filter((sec) => !(hideStudentSections && ['Académico', 'Campus Virtual', 'Matrícula'].includes(sec.section)))
    .filter((sec) => !(seccionesOcultas || []).includes(sec.section))
    .filter((sec) => sec.items.length > 0);

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
        width: 210,
        background: 'radial-gradient(120% 60% at 100% 100%, rgba(0,169,255,.22) 0%, rgba(0,169,255,0) 55%), radial-gradient(90% 50% at 0% 0%, rgba(255,49,77,.14) 0%, rgba(255,49,77,0) 50%), linear-gradient(180deg,#00116f 0%,#000b47 60%,#00072e 100%)',
        borderRight: '1px solid rgba(255,255,255,.06)',
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
            width: 44,
            height: 44,
            background: 'linear-gradient(140deg,#ff314d,#e01936)',
            borderRadius: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 6px 16px -6px rgba(255,49,77,.8)'
          }}>
            <Icon name="logo" size={22} />
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
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
            overflow: 'hidden',
            padding: 0
          }}>
            {user.avatar && (String(user.avatar).startsWith('http') || String(user.avatar).startsWith('data:image')) ? (
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
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

        {/* Menú de navegación dirigido por rol (src/config/navMenu.js). Para el
            estudiante la ficha define qué ve mientras está en ingreso. */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: '10px 0' }}>
          {sections.map((sec) => (
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
                    <span className="ni"><Icon name={item.icon} size={16} /></span>
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
            <Icon name="salir" size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
