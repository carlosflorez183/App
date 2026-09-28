import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('EST001');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, demoUsers } = useAuth();
  const navigate = useNavigate();

  const handleSelectDemo = (uKey) => {
    const user = demoUsers[uKey];
    if (user) {
      setUsername(uKey);
      setPassword(user.password);
      setError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const res = login(username, password);
      setLoading(false);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error || 'Credenciales inválidas');
      }
    }, 300);
  };

  const demos = [
    { key: 'EST001', label: 'Estudiante', badge: 'EST001 / 123456', color: '#3b82f6' },
    { key: 'PROF001', label: 'Docente', badge: 'PROF001 / 123456', color: '#8b5cf6' },
    { key: 'ADMIN', label: 'Administrador', badge: 'ADMIN / admin123', color: '#10b981' },
    { key: 'RECTOR', label: 'Rectoría', badge: 'RECTOR / rector123', color: '#ef4444' },
    { key: 'TALENTO', label: 'Talento Humano', badge: 'TALENTO / 123456', color: '#f59e0b' },
    { key: 'CONTA', label: 'Contabilidad', badge: 'CONTA / 123456', color: '#06b6d4' },
  { key: 'ADMI', label: 'Admisiones', badge: 'ADMI / 123456', color: '#a855f7' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #312e81 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px'
    }}>
      {/* Partículas decorativas */}
      <div className="particle p1" style={{ position: 'absolute', width: 300, height: 300, background: '#60a5fa', top: -80, left: -80, opacity: 0.12, borderRadius: '50%' }} />
      <div className="particle p2" style={{ position: 'absolute', width: 200, height: 200, background: '#818cf8', bottom: 40, right: -60, opacity: 0.12, borderRadius: '50%' }} />
      <div className="particle p3" style={{ position: 'absolute', width: 140, height: 140, background: '#34d399', top: '42%', left: '64%', opacity: 0.12, borderRadius: '50%' }} />
      <div className="particle p4" style={{ position: 'absolute', width: 100, height: 100, background: '#f472b6', top: '63%', left: '6%', opacity: 0.12, borderRadius: '50%' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 76,
            height: 76,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,.25)',
            fontSize: 34
          }}>
            🏛️
          </div>
          <h1 style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>UniPlataforma</h1>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, marginTop: 4 }}>Sistema Integral Académico y Administrativo</p>
        </div>

        {/* Tarjeta de login */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 20px 48px rgba(0,0,0,.25)'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Iniciar Sesión</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Ingresa tus credenciales para acceder al portal</p>

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Usuario / Código Institucional
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. EST001, PROF001..."
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,.35)',
                transition: 'transform 0.15s, opacity 0.15s',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Ingresando...' : 'Acceder al Sistema →'}
            </button>
          </form>

          {/* Selector de perfiles demo rápido */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Acceso rápido de demostración:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {demos.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => handleSelectDemo(d.key)}
                  style={{
                    background: username === d.key ? '#eff6ff' : '#f8fafc',
                    border: `1.5px solid ${username === d.key ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{d.label}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{d.key}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 20 }}>
          © 2026 UniPlataforma — React v18 + Vite
        </p>
      </div>
    </div>
  );
}
