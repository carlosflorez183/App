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
import Icon from './Icon';

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
  // Contenido a sangre completa (pega con el sidebar y la Topbar). Las páginas
  // que lo usan se encargan de su propio aire interior.
  flush = false,
  // Muestra el nombre de la sección activa como subtítulo del Topbar.
  titleFromTab = false,
  // Dentro del módulo, el sidebar muestra una sola entrada (el módulo) en
  // lugar de todas sus secciones. Solo lo usa el Panel de Administración.
  colapsarSidebar = false,
  rutaModulo = null,
  seccionColapso = null,
  seccionesOcultas = [],
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

  /* Navegación por teclado de las pestañas (patrón WAI-ARIA tabs):
     flechas mueven el foco y Home/End van a los extremos. */
  const moverTab = (e, idx) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let destino = idx;
    if (e.key === 'ArrowRight') destino = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') destino = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') destino = 0;
    if (e.key === 'End') destino = tabs.length - 1;
    const key = tabs[destino].key;
    setTab(key);
    document.getElementById(`tab-${key}`)?.focus();
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
    <div className="app-wrap admin-shell">
      <Sidebar
        currentView=""
        currentTab=""
        compactModuleNav={colapsarSidebar || (tabs.length > 0 && !hideTabs)}
        compactModuleLabel={title}
        compactModulePath={colapsarSidebar ? rutaModulo : null}
        collapseModuleNav={colapsarSidebar}
        collapseSectionPath={colapsarSidebar ? seccionColapso : null}
        seccionesOcultas={seccionesOcultas}
        hideStudentSections={false}
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

        <div className={`main-content${tabs.length > 0 && !hideTabs ? ' has-admin-tabs' : ''}${flush ? ' module-flush' : ''}`}>
          {tabs.length > 0 && !hideTabs ? (
            <div className="admin-modern">
              <header className="admin-modern-top">
                <div className="admin-modern-inner">
                  <nav
                    className="admin-modern-tabs"
                    role="tablist"
                    aria-label={`Secciones de ${title}`}
                  >
                    {tabs.map((t, idx) => (
                      <button
                        key={t.key}
                        id={`tab-${t.key}`}
                        type="button"
                        role="tab"
                        aria-selected={current === t.key}
                        aria-controls={`panel-${t.key}`}
                        tabIndex={current === t.key ? 0 : -1}
                        className={`admin-modern-tab${current === t.key ? ' is-active' : ''}`}
                        onClick={() => setTab(t.key)}
                        onKeyDown={(e) => moverTab(e, idx)}
                      >
                        {t.icon ? <Icon name={t.icon} size={16} /> : null}
                        {t.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </header>

              <main className="admin-modern-main admin-modern-inner">
                <div
                  role="tabpanel"
                  id={`panel-${current}`}
                  aria-labelledby={`tab-${current}`}
                >
                  {typeof children === 'function'
                    ? children({ tab: current, setTab, data, setData, recargar })
                    : children}
                </div>
              </main>
            </div>
          ) : (
            <>
              <div>
                {typeof children === 'function'
                  ? children({ tab: current, setTab, data, setData, recargar })
                  : children}
              </div>
              {aside}
            </>
          )}

          {tabs.length > 0 && !hideTabs ? null : aside}
        </div>
      </div>

      {user ? null : null}
    </div>
  );
}
