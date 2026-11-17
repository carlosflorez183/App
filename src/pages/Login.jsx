import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import '../assets/css/login-cul.css';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginDemo, demoUsers, roleLabels } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    onLogin?.({ usuario, clave });

    const res = await login(usuario, clave);
    setLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error);
    }
  };

  const handleSelectDemo = async (usuarioDemo) => {
    setError('');
    setLoading(true);
    setUsuario(usuarioDemo);
    const res = await loginDemo(usuarioDemo);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setLoading(false);
      setError(res.error);
    }
  };

  return (
    <div className="login-page">
      <header className="login-brand">
        <div className="login-logo" aria-hidden="true">
          <Icon name="logo" size={32} color="#ffffff" />
        </div>
        <h1 className="login-title">UniPlataforma</h1>
        <p className="login-subtitle">Sistema Integral Académico y Administrativo</p>
      </header>

      <main className="login-card">
        <h2>Iniciar sesión</h2>
        <p className="hint">Ingresa tus credenciales para acceder al portal</p>

        {error && (
          <div style={{ background: '#ffe0e5', color: '#d2233c', border: '1px solid #f4b6bf', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="usuario">Usuario / Código institucional</label>
          <input
            id="usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            style={{ textTransform: 'uppercase' }}
          />

          <label htmlFor="clave">Contraseña</label>
          <input
            id="clave"
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password"
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Ingresando...' : 'Acceder al sistema'}
          </button>
        </form>

        {demoUsers.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #e5e2da' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 10 }}>Acceso rápido de demostración</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {demoUsers.map((d) => (
                <button
                  key={d.usuario}
                  type="button"
                  onClick={() => handleSelectDemo(d.usuario)}
                  disabled={loading}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{roleLabels?.[d.role] || d.role}</div>
                  <div style={{ fontSize: 10, color: '#475569' }}>{d.usuario}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 16 }}>
          ¿Aún no estás inscrito?{' '}
          <Link to="/inscripcion" style={{ color: '#12408a', fontWeight: 700, textDecoration: 'none' }}>
            Regístrate aquí
          </Link>
        </p>
      </main>

      <p className="login-tagline">Aquí tienes todo para ser feliz</p>
      <p className="login-since">Educación con calidad y sentido social. Desde 1965.</p>
    </div>
  );
}
