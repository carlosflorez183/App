import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';


const Dashboard = lazy(() => import('./pages/Dashboard'));
const Matricula = lazy(() => import('./pages/Matricula'));
const Curso = lazy(() => import('./pages/Curso'));
const Admin = lazy(() => import('./pages/Admin'));
const Admisiones = lazy(() => import('./pages/Admisiones'));
const Docente = lazy(() => import('./pages/Docente'));
const Rectoria = lazy(() => import('./pages/Rectoria'));
const TalentoHumano = lazy(() => import('./pages/TalentoHumano'));
const Contabilidad = lazy(() => import('./pages/Contabilidad'));
const Director = lazy(() => import('./pages/Director'));
const ConfigCurso = lazy(() => import('./pages/ConfigCurso'));
const Inscripcion = lazy(() => import('./pages/Inscripcion'));
const CambioPassword = lazy(() => import('./pages/CambioPassword'));

function Cargando() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: '#6f6b62', fontSize: 14 }}>
      Cargando…
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.debeCambiarPassword) {
    return <CambioPassword />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function ConsultaPensum() {
  return (
    <ProtectedRoute roles={['admisiones']}>
      <Matricula readOnly />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Cargando />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/inscripcion" element={<Inscripcion />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/matricula"
                element={
                  <ProtectedRoute roles={['estudiante']}>
                    <Matricula />
                  </ProtectedRoute>
                }
              />

              <Route path="/pensum" element={<ConsultaPensum />} />

              <Route
                path="/curso/:id"
                element={
                  <ProtectedRoute>
                    <Curso />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admisiones"
                element={
                  <ProtectedRoute roles={['admisiones']}>
                    <Admisiones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docente"
                element={
                  <ProtectedRoute roles={['profesor']}>
                    <Docente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rectoria"
                element={
                  <ProtectedRoute roles={['rectoria']}>
                    <Rectoria />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/talento-humano"
                element={
                  <ProtectedRoute roles={['talento_humano']}>
                    <TalentoHumano />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contabilidad"
                element={
                  <ProtectedRoute roles={['contabilidad']}>
                    <Contabilidad />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/director"
                element={
                  <ProtectedRoute roles={['director']}>
                    <Director />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/director/configcurso/:id"
                element={
                  <ProtectedRoute roles={['director']}>
                    <ConfigCurso />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configcurso/:id"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <ConfigCurso />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
