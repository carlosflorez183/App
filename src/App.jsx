import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matricula from './pages/Matricula';
import Curso from './pages/Curso';
import Admin from './pages/Admin';
import Admisiones from './pages/Admisiones';
import Docente from './pages/Docente';
import Rectoria from './pages/Rectoria';
import TalentoHumano from './pages/TalentoHumano';
import Contabilidad from './pages/Contabilidad';

// Sin sesión: al login. Con sesión pero sin el rol permitido: al dashboard.
function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
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

// El plan de estudios en modo lectura lo consulta Admisiones; el administrador
// lo tiene dentro de su propio panel. Los demás roles no lo necesitan.
function ConsultaPensum() {
  return (
    <ProtectedRoute roles={['admisiones']}>
      <Matricula readOnly />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Solo el estudiante puede ejecutar el proceso de matrícula. */}
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
          {/* Admisiones es exclusivo del proceso de admisión. El administrador
              tiene su propio panel en /admin y no entra a este módulo. */}
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
