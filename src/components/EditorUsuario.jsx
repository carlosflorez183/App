/* =============================================
   Editor de cuenta de acceso (vista tipo
   "configuración"). Reúne en un solo formulario los
   datos de la cuenta y su acceso, en el mismo tono
   que el editor de estudiante.
   ============================================= */
import React, { useEffect, useState } from 'react';
import Icon from './Icon';

const etiqueta = { fontSize: 12, color: '#4e4a43', fontWeight: 600 };
const campo = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cdc9bf',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 4,
  background: '#fff',
};

export default function EditorUsuario({
  abierto,
  usuario,
  modo = 'editar',
  roles = [],
  guardando = false,
  onGuardar,
  onCerrar,
}) {
  const creando = modo === 'crear';
  /* Campos definidos desde el inicio para que los inputs nazcan controlados;
     el efecto los rellena con la cuenta al abrir. */
  const [f, setF] = useState({
    nombre: '', email: '', telefono: '', direccion: '',
    role: 'estudiante', usuario: '', activo: true,
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!abierto) return;
    if (creando) {
      setF({
        nombre: '', email: '', telefono: '', direccion: '',
        role: 'estudiante', usuario: '', activo: true,
      });
      setPassword('');
      setError('');
      return;
    }
    if (!usuario) return;
    setF({
      nombre: usuario.nombre || '',
      email: usuario.email || '',
      telefono: usuario.telefono || '',
      direccion: usuario.direccion || '',
      role: usuario.role || 'estudiante',
      usuario: usuario.usuario || '',
      activo: usuario.activo !== false,
    });
    setPassword('');
    setError('');
  }, [abierto, usuario, creando]);

  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => {
      if (e.key === 'Escape' && !guardando) onCerrar?.();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, guardando, onCerrar]);

  if (!abierto) return null;

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    setError('');
    if (!String(f.nombre || '').trim()) return setError('El nombre es obligatorio.');
    if (!String(f.usuario || '').trim()) return setError('El usuario de ingreso es obligatorio.');
    if (password && password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    const res = await onGuardar?.({ ...f, password });
    if (res?.error) setError(res.error);
    return undefined;
  };

  return (
    <div
      role="presentation"
      onMouseDown={() => !guardando && onCerrar?.()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(24,20,14,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={creando ? 'Nueva cuenta' : 'Editar usuario'}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,.25)',
        }}
      >
        {/* Encabezado */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: '#fff',
          padding: '18px 22px',
          borderBottom: '1px solid #eee9e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#211d17' }}>
              {creando ? 'Nueva cuenta' : 'Editar usuario'}
            </div>
            <div style={{ fontSize: 12, color: '#9c988e', marginTop: 2 }}>
              {creando ? 'Completa los datos de acceso del nuevo usuario' : `${usuario?.nombre || ''} · ${usuario?.usuario || ''}`}
            </div>
          </div>
          <button
            className="btn"
            style={{ background: '#f0eee9', padding: '6px 10px' }}
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <Icon name="borrar" size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {error && (
            <div style={{ background: '#ffe0e5', color: '#c1122c', border: '1px solid #f4b6bf', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
              <Icon name="alerta" size={14} /> {error}
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 800, color: '#211d17', margin: '0 0 10px' }}>
            Datos de la cuenta
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 22 }}>
            <label style={etiqueta}>
              Nombre completo
              <input style={campo} value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </label>
            <label style={etiqueta}>
              Rol
              <select value={f.role} onChange={(e) => set('role', e.target.value)} style={campo}>
                {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label style={etiqueta}>
              Correo
              <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} style={campo} />
            </label>
            <label style={etiqueta}>
              Teléfono
              <input value={f.telefono} onChange={(e) => set('telefono', e.target.value)} style={campo} />
            </label>
            <label style={{ ...etiqueta, gridColumn: '1 / -1' }}>
              Dirección
              <input value={f.direccion} onChange={(e) => set('direccion', e.target.value)} style={campo} />
            </label>
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, color: '#211d17', margin: '0 0 10px' }}>
            Acceso
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={etiqueta}>
              Usuario (nombre de ingreso)
              <input
                value={f.usuario}
                onChange={(e) => set('usuario', e.target.value.toUpperCase())}
                style={{ ...campo, textTransform: 'uppercase' }}
              />
            </label>
            <label style={etiqueta}>
              {creando ? 'Contraseña (opcional)' : 'Contraseña nueva (opcional)'}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={creando ? 'En blanco: se usa el usuario como contraseña temporal' : 'Dejar en blanco para no cambiarla'}
                style={campo}
              />
            </label>
            <label style={{ ...etiqueta, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={f.activo}
                onChange={(e) => set('activo', e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Cuenta habilitada (puede iniciar sesión)
            </label>
            <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#9c988e' }}>
              {creando
                ? 'Si dejas la contraseña en blanco, el usuario y la contraseña temporal serán el mismo dato y se pedirá cambiarla al primer ingreso.'
                : 'La contraseña solo se cambia si escribes una nueva (mínimo 6 caracteres).'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 20px 20px' }}>
          <button className="btn" style={{ background: '#f0eee9' }} onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn" onClick={guardar} disabled={guardando}>
            <Icon name={creando ? 'check' : 'guardar'} size={16} /> {guardando ? 'Guardando…' : (creando ? 'Crear cuenta' : 'Guardar cambios')}
          </button>
        </div>
      </div>
    </div>
  );
}
