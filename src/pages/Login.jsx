import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Credenciales inválidas');
    }
  };

  const demos = [
    { key: 'EST001', label: 'Estudiante', badge: 'EST001 / 123456', color: '#0a84ff' },
    { key: 'PROF001', label: 'Docente', badge: 'PROF001 / 123456', color: '#8a5cf0' },
    { key: 'ADMIN', label: 'Administrador', badge: 'ADMIN / admin123', color: '#17a06d' },
    { key: 'RECTOR', label: 'Rectoría', badge: 'RECTOR / rector123', color: '#ff314d' },
    { key: 'TALENTO', label: 'Talento Humano', badge: 'TALENTO / 123456', color: '#e0a52e' },
    { key: 'CONTA', label: 'Contabilidad', badge: 'CONTA / 123456', color: '#0e8a9c' },
    { key: 'ADMI', label: 'Admisiones', badge: 'ADMI / 123456', color: '#8a5cf0' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(120% 120% at 82% -10%, rgba(0,169,255,.4) 0%, rgba(0,169,255,0) 55%), radial-gradient(90% 90% at -10% 110%, rgba(255,49,77,.32) 0%, rgba(255,49,77,0) 55%), linear-gradient(135deg, #00116f 0%, #04295f 48%, #000b47 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px'
    }}>
      {/* Partículas decorativas */}
      <div className="particle p1" style={{ position: 'absolute', width: 300, height: 300, background: '#4da3ff', top: -80, left: -80, opacity: 0.12, borderRadius: '50%' }} />
      <div className="particle p2" style={{ position: 'absolute', width: 200, height: 200, background: '#6f8fe8', bottom: 40, right: -60, opacity: 0.12, borderRadius: '50%' }} />
      <div className="particle p3" style={{ position: 'absolute', width: 140, height: 140, background: '#00a9ff', top: '42%', left: '64%', opacity: 0.14, borderRadius: '50%' }} />
      <div className="particle p4" style={{ position: 'absolute', width: 100, height: 100, background: '#ff314d', top: '63%', left: '6%', opacity: 0.14, borderRadius: '50%' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 76,
            height: 76,
            background: 'linear-gradient(140deg,#ff314d,#e01936)',
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 14px 30px -10px rgba(255,49,77,.75)',
            fontSize: 34
          }}>
            <Icon name="logo" size={26} color="#ffffff" />
          </div>
          <h1 style={{ color: 'white', fontSize: 27, fontWeight: 900, letterSpacing: -0.5, fontFamily: "'Iowan Old Style','Palatino Linotype','Book Antiqua',Georgia,serif" }}>UniPlataforma</h1>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, marginTop: 4 }}>Sistema Integral Académico y Administrativo</p>
        </div>

        {/* Tarjeta de login */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 20px 48px rgba(0,0,0,.25)'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#211d17', marginBottom: 6 }}>Iniciar Sesión</h2>
          <p style={{ fontSize: 12, color: '#6f6b62', marginBottom: 20 }}>Ingresa tus credenciales para acceder al portal</p>

          {error && (
            <div style={{
              background: '#ffe0e5',
              color: '#d2233c',
              border: '1px solid #f4b6bf',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Icon name="alerta" size={16} color="#d2233c" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4e4a43', marginBottom: 6 }}>
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
                  border: '1.5px solid #cdc9bf',
                  outline: 'none',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4e4a43', marginBottom: 6 }}>
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
                  border: '1.5px solid #cdc9bf',
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
                background: 'linear-gradient(135deg, #00116f 0%, #06468c 60%, #0a5cae 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 20px -8px rgba(0,17,111,.75)',
                transition: 'transform 0.15s, opacity 0.15s',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Ingresando...' : 'Acceder al Sistema →'}
            </button>
          </form>

          {/* Selector de perfiles demo rápido */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #e5e2da' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9c988e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Acceso rápido de demostración:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {demos.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => handleSelectDemo(d.key)}
                  style={{
                    background: username === d.key ? '#eef7ff' : '#f7f6f3',
                    border: `1.5px solid ${username === d.key ? '#0a84ff' : '#e5e2da'}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#211d17' }}>{d.label}</div>
                  <div style={{ fontSize: 10, color: '#6f6b62', marginTop: 2 }}>{d.key}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 20 }}>
          © 2026 UniPlataforma
        </p>
      </div>
    </div>
  );
}
