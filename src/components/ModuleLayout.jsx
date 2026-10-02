/* =============================================
   Layout común de los módulos por rol.
   Sidebar + Topbar + contenido, con navegación
   de los ítems que pertenecen al Dashboard.
   ============================================= */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePersistentData } from '../hooks/usePersistentData';
import { marcarNotificacionLeida } from '../api/client';
import { notificacionesDeRol } from '../data/mockData';
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
  // Cuando la navegación vive en el Sidebar, el módulo no dibuja la barra de
  // pestañas: solo la usa como lista de secciones válidas.
  hideTabs = false,
  // Muestra el nombre de la sección activa como subtítulo del Topbar.
  titleFromTab = false,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData, { recargar }] = usePersistentData();

  // El módulo es dueño de su pestaña: puede recibirla por prop o leerla de ?tab=
  const urlTab = params.get('tab');
  const current = activeTab || urlTab || initialTab || tabs[0]?.key;

  /* Se cambia solo la clave de la pestaña. Si se reemplazara la query
     entera, se perderían el curso seleccionado y cualquier otro parámetro,
     y el módulo volvería a su estado inicial. */
  const setTab = (key) => {
    if (onTabChange) onTabChange(key);
    if (!tabs.some((t) => t.key === key)) return;
    const siguiente = new URLSearchParams(params);
    siguiente.set('tab', key);
    setParams(siguiente, { replace: true });
  };

  // Los ítems de menú que pertenecen al Dashboard viven en su propio estado,
  // así que desde un módulo hay que saltar a la ruta con la vista pedida.
  const handleNavigate = (view, tab) => {
    if (view === 'home') return navigate('/dashboard?view=home');
    if (view === 'perfil') return navigate('/dashboard?view=perfil');
    navigate(`/dashboard?view=${view}${tab ? `&tab=${tab}` : ''}`);
  };

  /* Marca en pantalla al instante y lo confirma en el servidor. */
  const marcarLeida = (n) => {
    setData((d) => ({
      ...d,
      notificaciones: d.notificaciones.map((x) =>
        x.id === n.id ? { ...x, leida: true } : x
      ),
    }));
    marcarNotificacionLeida(n.id)
      .catch(() => {})
      .finally(recargar);
  };

  const handleOpenNotif = (n) => {
    marcarLeida(n);
    const dest = n.destino || {};
    if (dest.cursoId) return navigate(`/curso/${dest.cursoId}`);
    // Notificaciones de un módulo administrativo apuntan a su propia ruta.
    if (dest.ruta) {
      return navigate(`${dest.ruta}${dest.tab ? `?tab=${dest.tab}` : ''}`);
    }
    handleNavigate(dest.vista, dest.tab);
  };

  const markRead = (n) => marcarLeida(n);

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
          subtitle={
            titleFromTab
              ? tabs.find((t) => t.key === current)?.label || subtitle
              : subtitle
          }
          onNavigate={handleNavigate}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          notifications={notificacionesDeRol(data.notificaciones, user?.role)}
          onMarkNotifRead={markRead}
          onOpenNotif={handleOpenNotif}
        />

        <div className="main-content">
          {tabs.length > 0 && !hideTabs && (
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

          {typeof children === 'function'
            ? children({ tab: current, setTab, data, setData, recargar })
            : children}

          {aside}
        </div>
      </div>

      {user ? null : null}
    </div>
  );
}
