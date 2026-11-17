/* =============================================
   Avatar compartido de toda la aplicación.
   Muestra la foto de perfil del usuario si tiene una
   (como en WhatsApp) y, si no, sus iniciales sobre el
   color de su rol. Úsalo en tablas, tarjetas y topbar
   para que todas las pantallas muestren lo mismo.
   ============================================= */
import React from 'react';

const COLORES = {
  'av-blue': '#2563eb',
  'av-green': '#059669',
  'av-orange': '#ea580c',
  'av-purple': '#7c3aed',
  'av-red': '#dc2626',
  'av-teal': '#0d9488',
};

// Iniciales a partir del nombre ("Laura Sánchez" -> "LS").
export const iniciales = (nombre = '') => {
  const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primera + ultima).toUpperCase();
};

// Solo se muestran fotos reales: data:image (subidas) o URL http(s).
const esFotoValida = (src) =>
  typeof src === 'string' && (src.startsWith('data:image/') || /^https?:\/\//.test(src));

export default function Avatar({ nombre, foto, clase = 'av-blue', tamano = 36, radio = 10, style = {} }) {
  const fondo = COLORES[clase] || COLORES['av-blue'];
  const base = {
    width: tamano,
    height: tamano,
    borderRadius: radio,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: '#fff',
    fontWeight: 700,
    fontSize: Math.max(11, Math.round(tamano * 0.38)),
    background: fondo,
    ...style,
  };

  if (esFotoValida(foto)) {
    return (
      <span style={base} title={nombre}>
        <img src={foto} alt={nombre || 'Foto de perfil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    );
  }
  return (
    <span style={base} title={nombre} aria-label={nombre}>
      {iniciales(nombre)}
    </span>
  );
}
