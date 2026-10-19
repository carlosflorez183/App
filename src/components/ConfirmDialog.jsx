/* =============================================
   Diálogo de confirmación reutilizable.
   Se usa antes de acciones destructivas (como
   eliminar un estudiante) para no borrar nada
   por un clic accidental.
   ============================================= */
import React, { useEffect } from 'react';

export default function ConfirmDialog({
  abierto,
  titulo = 'Confirmar acción',
  mensaje = '',
  confirmar = 'Confirmar',
  cancelar = 'Cancelar',
  procesando = false,
  onConfirmar,
  onCancelar,
}) {
  /* Escape cierra el diálogo mientras no se esté procesando. */
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => {
      if (e.key === 'Escape' && !procesando) onCancelar?.();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, procesando, onCancelar]);

  if (!abierto) return null;

  return (
    <div
      role="presentation"
      onMouseDown={() => !procesando && onCancelar?.()}
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
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 24px 60px -12px rgba(0,0,0,.45)',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, color: '#211d17', marginBottom: 8 }}>
          {titulo}
        </div>
        <div style={{ fontSize: 13.5, color: '#4e4a43', lineHeight: 1.5 }}>{mensaje}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button
            className="btn"
            style={{ background: '#f0eee9', color: '#3a3630' }}
            onClick={onCancelar}
            disabled={procesando}
          >
            {cancelar}
          </button>
          <button
            className="btn"
            style={{ background: '#c1122c', color: '#fff', border: 'none' }}
            onClick={onConfirmar}
            disabled={procesando}
          >
            {procesando ? 'Eliminando…' : confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
