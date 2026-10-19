import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginDemo, demoUsers, roleLabels } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error);
    }
  };

  /* Acceso rápido de demostración: entra con la cuenta elegida. El backend
     valida contra la base de datos; aquí no hay contraseñas. */
  const handleSelectDemo = async (usuario) => {
    setError('');
    setLoading(true);
    setUsername(usuario);
    const res = await loginDemo(usuario);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setLoading(false);
      setError(res.error);
    }
  };

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

          <p style={{ textAlign: 'center', fontSize: 12, color: '#6f6b62', marginTop: 16 }}>
            ¿Aún no estás inscrito?{' '}
            <Link to="/inscripcion" style={{ color: '#06468c', fontWeight: 700, textDecoration: 'none' }}>
              Regístrate aquí
            </Link>
          </p>

          {demoUsers.length > 0 && (
            <div style={{ marginTop: 20, borderTop: '1px solid #e5e2da', paddingTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43', marginBottom: 10 }}>
                Acceso rápido de demostración
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {demoUsers.map((d) => (
                  <button
                    key={d.usuario}
                    type="button"
                    onClick={() => handleSelectDemo(d.usuario)}
                    disabled={loading}
                    style={{
                      background: '#f7f6f3',
                      border: '1.5px solid #e5e2da',
                      borderRadius: 8,
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#211d17' }}>
                      {roleLabels?.[d.role] || d.role}
                    </div>
                    <div style={{ fontSize: 10, color: '#6f6b62', marginTop: 2 }}>{d.usuario}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 20 }}>
          © 2026 UniPlataforma
        </p>
      </div>
    </div>
  );
}
