/* =============================================
   Barrera de errores global.
   Evita que un fallo de render deje la pantalla
   en blanco: muestra un aviso y permite recargar.
   ============================================= */
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Error de interfaz:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f6f4ef' }}>
        <div style={{ maxWidth: 460, textAlign: 'center', background: '#fff', border: '1px solid #e5e2da', borderRadius: 14, padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Algo salió mal</div>
          <p style={{ fontSize: 13.5, color: '#6f6b62', lineHeight: 1.5, marginBottom: 18 }}>
            Ocurrió un error al mostrar esta pantalla. Puedes recargar la aplicación; si persiste, repórtalo a
            soporte con una captura.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn" onClick={() => this.setState({ error: null })}>Reintentar</button>
            <button className="btn" onClick={() => window.location.reload()}>Recargar</button>
          </div>
        </div>
      </div>
    );
  }
}
