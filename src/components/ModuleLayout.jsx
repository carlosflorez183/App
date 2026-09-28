/* =============================================
   Layout común de los módulos por rol.
   Sidebar + Topbar + contenido, con navegación
   de los ítems que pertenecen al Dashboard.
   ============================================= */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePersistentData } from '../hooks/usePersistentData';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function ModuleLayout({
  title,
  subtitle,
  tabs = [],
  initialTab,
  activeTab,
  onTabChange,
  children,
  aside,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = usePersistentData();

  // El módulo es dueño de su pestaña: puede recibirla por prop o leerla de ?tab=
  const urlTab = params.get('tab');
  const current = activeTab || urlTab || initialTab || tabs[0]?.key;

  const setTab = (key) => {
    if (onTabChange) onTabChange(key);
    if (!tabs.some((t) => t.key === key)) return;
    setParams({ tab: key }, { replace: true });
  };

  // Los ítems de menú que pertenecen al Dashboard viven en su propio estado,
  // así que desde un módulo hay que saltar a la ruta con la vista pedida.
  const handleNavigate = (view, tab) => {
    if (view === 'home') return navigate('/dashboard?view=home');
    if (view === 'perfil') return navigate('/dashboard?view=perfil');
    navigate(`/dashboard?view=${view}${tab ? `&tab=${tab}` : ''}`);
  };

  const handleOpenNotif = (n) => {
    setData((d) => ({
      ...d,
      notificaciones: d.notificaciones.map((x) =>
        x.id === n.id ? { ...x, leida: true } : x
      ),
    }));
    const dest = n.destino || {};
    if (dest.cursoId) return navigate(`/curso/${dest.cursoId}`);
    handleNavigate(dest.vista, dest.tab);
  };

  const markRead = (n) =>
    setData((d) => ({
      ...d,
      notificaciones: d.notificaciones.map((x) =>
        x.id === n.id ? { ...x, leida: true } : x
      ),
    }));

  return (
    <div className="app-wrap">
      <Sidebar
        currentView=""
        currentTab=""
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="content-area">
        <Topbar
          title={title}
          subtitle={subtitle}
          onNavigate={handleNavigate}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          notifications={data.notificaciones}
          onMarkNotifRead={markRead}
          onOpenNotif={handleOpenNotif}
        />

        <div className="main-content">
          {tabs.length > 0 && (
            <div className="t-tabs" style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={`t-btn ${current === t.key ? 'active' : ''}`}
                  onClick={() => setTab(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {t.icon ? <span>{t.icon}</span> : null}
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {typeof children === 'function' ? children({ tab: current, setTab, data, setData }) : children}

          {aside}
        </div>
      </div>

      {user ? null : null}
    </div>
  );
}
