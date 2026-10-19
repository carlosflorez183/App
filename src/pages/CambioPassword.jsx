import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

const campo = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1.5px solid #cdc9bf',
  outline: 'none',
  fontSize: 14,
  boxSizing: 'border-box',
};

const etiqueta = { display: 'block', fontSize: 12, fontWeight: 700, color: '#4e4a43', marginBottom: 6 };

/* Pantalla de primer ingreso: la cuenta nació con la contraseña temporal
   (el documento) y no se puede usar la plataforma hasta cambiarla. */
export default function CambioPassword() {
  const { user, cambiarPassword, logout } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!actual) {
      setError('Escribe tu contraseña actual (tu documento).');
      return;
    }
    if (nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (nueva === actual) {
      setError('La nueva contraseña debe ser distinta a la temporal.');
      return;
    }
    setGuardando(true);
    const res = await cambiarPassword(actual, nueva);
    setGuardando(false);
    if (!res.success) setError(res.error);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(120% 120% at 82% -10%, rgba(0,169,255,.4) 0%, rgba(0,169,255,0) 55%), radial-gradient(90% 90% at -10% 110%, rgba(255,49,77,.32) 0%, rgba(255,49,77,0) 55%), linear-gradient(135deg, #00116f 0%, #04295f 48%, #000b47 100%)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '32px 28px', boxShadow: '0 20px 48px rgba(0,0,0,.25)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: '#e8eefc', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <Icon name="bloqueado" size={26} color="#06468c" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#211d17', marginBottom: 6, textAlign: 'center' }}>
            Cambia tu contraseña
          </h2>
          <p style={{ fontSize: 13, color: '#6f6b62', marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>
            Hola {user?.name || ''}. Por seguridad debes reemplazar la contraseña temporal antes de continuar.
          </p>

          {error && (
            <div style={{ background: '#ffe0e5', color: '#d2233c', border: '1px solid #f4b6bf', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alerta" size={16} color="#d2233c" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={enviar}>
            <div style={{ marginBottom: 16 }}>
              <label style={etiqueta}>Contraseña actual (tu documento)</label>
              <input style={campo} type="password" value={actual} onChange={(e) => setActual(e.target.value)} required placeholder="••••••••" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={etiqueta}>Nueva contraseña</label>
              <input style={campo} type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={etiqueta}>Confirmar nueva contraseña</label>
              <input style={campo} type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required placeholder="Repite la contraseña" />
            </div>

            <button type="submit" disabled={guardando} style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #00116f 0%, #06468c 60%, #0a5cae 100%)',
              color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1,
            }}>
              {guardando ? 'Guardando…' : 'Guardar y continuar →'}
            </button>
          </form>

          <button type="button" onClick={logout} style={{ width: '100%', marginTop: 12, padding: '10px', background: 'transparent', color: '#6f6b62', border: 'none', fontSize: 13, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
