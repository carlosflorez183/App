/* =============================================
   Smoke test de render.
   Monta cada modulo con cada una de sus pestañas
   dentro de un error boundary y publica el
   reporte en #smoke-result para que un navegador
   headless lo lea (ver scripts/smoke.mjs).

   No es una prueba de comportamiento: no hace
   clic ni comprueba lógica de negocio. Solo
   detecta errores de render y pantallas vacías.
   ============================================= */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Admin from './pages/Admin';
import Admisiones from './pages/Admisiones';
import Docente from './pages/Docente';
import Rectoria from './pages/Rectoria';
import TalentoHumano from './pages/TalentoHumano';
import Contabilidad from './pages/Contabilidad';
import Matricula from './pages/Matricula';
import Dashboard from './pages/Dashboard';
import Curso from './pages/Curso';

const errores = [];

// Se puede pedir un rol concreto con ?rol= para comprobar que el menú y las
// pestañas del Dashboard se ajustan a ese usuario (scripts/smoke.mjs lo usa).
const ROLES_DEMO = {
  estudiante: { name: 'Carlos Andrés Martínez', code: '20231001', role: 'estudiante', avatar: 'CA' },
  admin: { name: 'Administrador General', code: 'ADM-001', role: 'admin', avatar: 'AG' },
  admisiones: { name: 'Ana Camila Restrepo', code: 'ADM-004', role: 'admisiones', avatar: 'AR' },
  profesor: { name: 'Dra. Laura Sánchez', code: 'DOC-0045', role: 'profesor', avatar: 'LS' },
  rectoria: { name: 'Rector Juan Pablo Gómez', code: 'REC-001', role: 'rectoria', avatar: 'JG' },
};

const rolPedido = new URLSearchParams(window.location.search).get('rol');
// Siempre debe haber sesión: las páginas usan `user.role`. Sin token, el
// estado cae al mock, que es justo lo que el smoke quiere comprobar.
if (rolPedido && ROLES_DEMO[rolPedido]) {
  localStorage.setItem('uni_session', JSON.stringify(ROLES_DEMO[rolPedido]));
} else {
  localStorage.setItem('uni_session', JSON.stringify(ROLES_DEMO.estudiante));
}
localStorage.removeItem('uni_token');
const ETIQUETA_ROL = rolPedido && ROLES_DEMO[rolPedido] ? rolPedido : 'estudiante';

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    errores.push({ caso: this.props.caso, error: String((error && error.message) || error) });
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

const CASOS = [];

// Un caso por cada pestaña del módulo. El router se monta con ?tab= porque
// ModuleLayout, Dashboard y Admin leen la pestaña de la URL.
const addTabs = (nombre, Componente, tabs) => {
  tabs.forEach((tab) => {
    CASOS.push({
      caso: `${nombre}:${tab}`,
      nodo: (
        <MemoryRouter initialEntries={[`/x?tab=${tab}`]}>
          <Componente />
        </MemoryRouter>
      ),
    });
  });

  // Un caso que solo muestra su aviso de "cargando" tampoco sirve: significa que
  // el módulo no llegó a montar contenido. Eso lo revisa scripts/smoke.mjs al
  // comparar el texto del DOM, no aquí.
};

addTabs('Admin', Admin, ['resumen', 'usuarios', 'estudiantes', 'programas', 'pensum', 'docentes', 'matricula']);
addTabs('Admisiones', Admisiones, ['resumen', 'aspirantes', 'procesos', 'documentos', 'registro', 'expedientes', 'cuenta', 'certificados', 'reportes']);
addTabs('Docente', Docente, ['cursos', 'notas', 'actividades', 'asistencia', 'foro']);
addTabs('Rectoria', Rectoria, ['indicadores', 'programas', 'admisiones', 'sostenibilidad']);
addTabs('TalentoHumano', TalentoHumano, ['planta', 'convocatorias', 'capacitaciones', 'carga', 'areas', 'nomina', 'certificados']);
addTabs('Contabilidad', Contabilidad, ['recaudo', 'cartera', 'conciliacion', 'egresos', 'nomina']);

CASOS.push({
  caso: 'Matricula:editable',
  nodo: (
    <MemoryRouter initialEntries={['/matricula']}>
      <Matricula />
    </MemoryRouter>
  ),
});

CASOS.push({
  caso: 'Matricula:lectura',
  nodo: (
    <MemoryRouter initialEntries={['/pensum']}>
      <Matricula readOnly />
    </MemoryRouter>
  ),
});

CASOS.push({
  caso: 'Dashboard:academico',
  nodo: (
    <MemoryRouter initialEntries={['/dashboard?view=academico&tab=notas']}>
      <Dashboard />
    </MemoryRouter>
  ),
});

// El Dashboard con la vista por defecto: para roles sin pestañas académicas
// (admisiones, rectoría, contabilidad...) debe caer en Inicio, no en un panel
// de estudiante.
CASOS.push({
  caso: 'Dashboard:porDefecto',
  nodo: (
    <MemoryRouter initialEntries={['/dashboard']}>
      <Dashboard />
    </MemoryRouter>
  ),
});

CASOS.push({
  caso: 'Curso:1',
  nodo: (
    <MemoryRouter initialEntries={['/curso/1']}>
      <Routes>
        <Route path="/curso/:id" element={<Curso />} />
      </Routes>
    </MemoryRouter>
  ),
});

function App() {
  return (
    <AuthProvider>
      {CASOS.map((c, i) => (
        <div key={i} data-caso={c.caso} data-smoke="1">
          <Boundary caso={c.caso}>{c.nodo}</Boundary>
        </div>
      ))}
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);

setTimeout(() => {
  const fallidos = new Set(errores.map((e) => e.caso));
  const lineas = errores.map((e) => `FALLA ${e.caso} :: ${e.error}`);

  // Un caso que no lanzó error pero quedó vacío también es un problema:
  // normalmente significa que la pestaña pedida no existe y no hay fallback.
  document.querySelectorAll('[data-smoke]').forEach((nodo) => {
    const caso = nodo.getAttribute('data-caso');
    if (!fallidos.has(caso) && nodo.childElementCount === 0) {
      lineas.push(`VACIO ${caso} :: no renderizo ningun elemento`);
    }
  });

  // Y un caso que sigue esperando datos del servidor tampoco: delata que el
    // módulo se quedó en su estado de carga. Se exceptúa cuando ya mostró un
    // error, porque entonces la respuesta llegó y la decisión es del rol.
  document.querySelectorAll('[data-smoke]').forEach((nodo) => {
    const caso = nodo.getAttribute('data-caso');
    const esperando = nodo.querySelector('[data-cargando]');
    const conError = /No se pudo|No pudo/.test(nodo.textContent || '');
    if (esperando && !conError) {
      lineas.push(`PENDIENTE ${caso} :: se quedo en el aviso de carga`);
    }
  });

  const pre = document.createElement('pre');
  pre.id = 'smoke-result';
  pre.textContent =
    `ROL=${ETIQUETA_ROL}\n` +
    `CASOS=${CASOS.length}\n` +
    (lineas.length ? lineas.join('\n') : `OK ${CASOS.length} casos renderizan contenido`);
  document.body.appendChild(pre);
}, 9000);
