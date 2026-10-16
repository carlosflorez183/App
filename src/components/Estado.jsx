/* =============================================
   Estados de pantalla unificados: vacío y error.
   Las pestañas de los módulos repetían cada una
   su propio aviso con tamaños y colores distintos;
   centralizarlos deja el mismo criterio en todas.
   ============================================= */
import React from 'react';

export function EstadoVacio({ mensaje = 'No hay datos para mostrar.' }) {
  return (
    <div style={{
      textAlign: 'center',
      color: '#9c988e',
      padding: 28,
      border: '1px dashed #e5e2da',
      borderRadius: 12,
      background: '#fbfaf7',
      fontSize: 13.5,
      fontWeight: 600,
    }}>
      {mensaje}
    </div>
  );
}

export function EstadoError({ mensaje = 'No se pudieron cargar los datos.', onReintentar }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 24,
      borderRadius: 12,
      border: '1px solid #f2c4c4',
      background: '#fdecec',
      color: '#b02a2a',
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{mensaje}</div>
      {onReintentar && (
        <button className="btn" style={{ marginTop: 12 }} onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
