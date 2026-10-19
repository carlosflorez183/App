import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { datosInscripcion, registroInscripcion } from '../api/client';

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

export default function Inscripcion() {
  const [datos, setDatos] = useState({ nombre: '', documento: '', programaId: '', email: '', telefono: '', direccion: '' });
  const [programas, setProgramas] = useState([]);
  const [procesoAbierto, setProcesoAbierto] = useState(true);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    let vivo = true;
    datosInscripcion()
      .then((res) => {
        if (!vivo) return;
        setProgramas(res?.programas || []);
        setProcesoAbierto(!!res?.procesoAbierto);
      })
      .catch(() => {
        if (vivo) setError('No se pudieron cargar los programas. Intenta de nuevo más tarde.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  const cambiar = (e) => setDatos((d) => ({ ...d, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const res = await registroInscripcion({
        ...datos,
        programaId: Number(datos.programaId),
      });
      setExito(res?.mensaje || 'Inscripción registrada.');
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la inscripción.');
    } finally {
      setEnviando(false);
    }
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
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 68, height: 68,
            background: 'linear-gradient(140deg,#ff314d,#e01936)',
            borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 14px 30px -10px rgba(255,49,77,.75)',
          }}>
            <Icon name="logo" size={24} color="#ffffff" />
          </div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 900, margin: 0 }}>Inscripción de Aspirantes</h1>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, marginTop: 4 }}>
            Registra tus datos para iniciar el proceso de admisión
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: 20, padding: '28px 26px', boxShadow: '0 20px 48px rgba(0,0,0,.25)' }}>
          {exito ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e3f7ec', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <Icon name="check" size={26} color="#1f9d55" />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#211d17', marginBottom: 8 }}>Inscripción registrada</h2>
              <p style={{ fontSize: 13, color: '#6f6b62', lineHeight: 1.6, marginBottom: 20 }}>{exito}</p>
              <p style={{ fontSize: 12, color: '#6f6b62', marginBottom: 20 }}>
                Tu usuario de ingreso será tu número de documento. La contraseña temporal también es tu documento; el
                sistema te pedirá cambiarla al primer ingreso.
              </p>
              <Link to="/login" style={{ display: 'inline-block', padding: '11px 22px', background: 'linear-gradient(135deg, #00116f 0%, #06468c 60%, #0a5cae 100%)', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Ir a Iniciar Sesión →
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#211d17', marginBottom: 6 }}>Formulario de inscripción</h2>
              <p style={{ fontSize: 12, color: '#6f6b62', marginBottom: 18 }}>
                Los campos con * son obligatorios
              </p>

              {!procesoAbierto && (
                <div style={{ background: '#fff4e5', color: '#9a6200', border: '1px solid #f2d3a0', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="alerta" size={16} color="#9a6200" />
                  <span>Por ahora no hay un proceso de inscripción abierto.</span>
                </div>
              )}

              {error && (
                <div style={{ background: '#ffe0e5', color: '#d2233c', border: '1px solid #f4b6bf', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="alerta" size={16} color="#d2233c" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={enviar}>
                <div style={{ marginBottom: 14 }}>
                  <label style={etiqueta}>Nombre completo *</label>
                  <input style={campo} name="nombre" value={datos.nombre} onChange={cambiar} required placeholder="Ej. Ana María Pérez" />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={etiqueta}>Documento de identidad *</label>
                  <input style={campo} name="documento" value={datos.documento} onChange={cambiar} required placeholder="Ej. 1020304050" />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={etiqueta}>Programa académico *</label>
                  <select style={campo} name="programaId" value={datos.programaId} onChange={cambiar} required>
                    <option value="">Selecciona un programa…</option>
                    {programas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — {p.facultad}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={etiqueta}>Correo electrónico</label>
                    <input style={campo} type="email" name="email" value={datos.email} onChange={cambiar} placeholder="tucorreo@ejemplo.com" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={etiqueta}>Teléfono</label>
                    <input style={campo} name="telefono" value={datos.telefono} onChange={cambiar} placeholder="Ej. 3001234567" />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={etiqueta}>Dirección</label>
                  <input style={campo} name="direccion" value={datos.direccion} onChange={cambiar} placeholder="Ej. Calle 10 #5-30" />
                </div>

                <button type="submit" disabled={enviando || !procesoAbierto} style={{
                  width: '100%', padding: '12px',
                  background: 'linear-gradient(135deg, #00116f 0%, #06468c 60%, #0a5cae 100%)',
                  color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: enviando || !procesoAbierto ? 'not-allowed' : 'pointer',
                  opacity: enviando || !procesoAbierto ? 0.6 : 1,
                }}>
                  {enviando ? 'Enviando…' : 'Enviar inscripción'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#6f6b62', marginTop: 18 }}>
                ¿Ya tienes cuenta? <Link to="/login" style={{ color: '#06468c', fontWeight: 700, textDecoration: 'none' }}>Inicia sesión</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
