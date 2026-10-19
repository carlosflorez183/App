/* =============================================
   Editor de estudiante (vista tipo "configuración").
   Reúne en un solo formulario los datos del
   estudiante y los de su cuenta de acceso, para
   no editar media ficha en un lado y la otra
   mitad en otro.
   ============================================= */
import React, { useEffect, useState } from 'react';
import Icon from './Icon';

const ESTADOS = ['activo', 'matriculado', 'en_inscripcion', 'retirado', 'graduado', 'bloqueado'];
const JORNADAS = ['diurna', 'nocturna', 'sabado-matutina'];

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

export default function EditorEstudiante({
  abierto,
  estudiante,
  cuenta,
  programas = [],
  guardando = false,
  onGuardar,
  onCerrar,
}) {
  /* Se inicializa con campos definidos para que los inputs nazcan
     controlados; el efecto los rellena con el estudiante al abrir. */
  const [f, setF] = useState({
    nombre: '', documento: '', correo: '', telefono: '', direccion: '',
    programaId: '', semestre: 1, jornada: 'diurna', estado: 'activo',
    fechaIngreso: '', usuario: '',
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  /* El formulario se arma cada vez que se abre, con los datos actuales. */
  useEffect(() => {
    if (!abierto || !estudiante) return;
    setF({
      nombre: estudiante.nombre || '',
      documento: estudiante.documento || '',
      correo: estudiante.correo || '',
      telefono: estudiante.telefono || '',
      direccion: estudiante.direccion || '',
      programaId: estudiante.programaId ?? programas[0]?.id ?? '',
      semestre: estudiante.semestre ?? 1,
      jornada: estudiante.jornada || 'diurna',
      estado: estudiante.estado || 'activo',
      fechaIngreso: (estudiante.fechaIngreso || '').slice(0, 10),
      usuario: cuenta?.usuario || '',
    });
    setPassword('');
    setError('');
  }, [abierto, estudiante, cuenta]);

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
    if (!String(f.documento || '').trim()) return setError('El documento es obligatorio.');
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
        aria-label="Editar estudiante"
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
            <div style={{ fontSize: 16, fontWeight: 800, color: '#211d17' }}>Editar estudiante</div>
            <div style={{ fontSize: 12, color: '#9c988e', marginTop: 2 }}>
              {estudiante.nombre} · {estudiante.id}
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
            Datos del estudiante
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 22 }}>
            <label style={etiqueta}>
              Nombre completo
              <input style={campo} value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </label>
            <label style={etiqueta}>
              Documento
              <input value={f.documento} onChange={(e) => set('documento', e.target.value)} style={campo} />
            </label>
            <label style={etiqueta}>
              Correo
              <input type="email" value={f.correo} onChange={(e) => set('correo', e.target.value)} style={campo} />
            </label>
            <label style={etiqueta}>
              Teléfono
              <input value={f.telefono} onChange={(e) => set('telefono', e.target.value)} style={campo} />
            </label>
            <label style={{ ...etiqueta, gridColumn: '1 / -1' }}>
              Dirección
              <input value={f.direccion} onChange={(e) => set('direccion', e.target.value)} style={campo} />
            </label>
            <label style={etiqueta}>
              Programa
              <select value={f.programaId} onChange={(e) => set('programaId', e.target.value)} style={campo}>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </label>
            <label style={etiqueta}>
              Semestre
              <input type="number" min={1} max={12} value={f.semestre} onChange={(e) => set('semestre', e.target.value)} style={campo} />
            </label>
            <label style={etiqueta}>
              Jornada
              <select value={f.jornada} onChange={(e) => set('jornada', e.target.value)} style={campo}>
                {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </label>
            <label style={etiqueta}>
              Estado
              <select value={f.estado} onChange={(e) => set('estado', e.target.value)} style={campo}>
                {ESTADOS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label style={etiqueta}>
              Fecha de ingreso
              <input type="date" value={f.fechaIngreso} onChange={(e) => set('fechaIngreso', e.target.value)} style={campo} />
            </label>
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, color: '#211d17', margin: '0 0 10px' }}>
            Cuenta de acceso
          </div>
          {cuenta ? (
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
                Contraseña nueva (opcional)
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dejar en blanco para no cambiarla"
                  style={campo}
                />
              </label>
              <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#9c988e' }}>
                La contraseña solo se cambia si escribes una nueva (mínimo 6 caracteres).
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#9c988e', border: '1px dashed #e5e2da', borderRadius: 10, padding: 12, background: '#fbfaf7' }}>
              Este estudiante no tiene cuenta de acceso al campus.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 20px 20px' }}>
          <button className="btn" style={{ background: '#f0eee9' }} onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn" onClick={guardar} disabled={guardando}>
            <Icon name="guardar" size={16} /> {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
