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
  const [datos, setDatos] = useState({
    nombre: '',
    documento: '',
    programaId: '',
    email: '',
    telefono: '',
    direccion: '',
    esMenorDeEdad: false,
    responsableParentesco: 'Madre',
    responsableNombre: '',
    responsableTipoDoc: 'CC',
    responsableDocumento: '',
    responsableTelefono: '',
    responsableEmail: '',
  });
  const [programas, setProgramas] = useState([]);
  const [procesoAbierto, setProcesoAbierto] = useState(true);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);
  const [datosDeAcceso, setDatosDeAcceso] = useState(null);

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

    if (datos.esMenorDeEdad) {
      if (
        !datos.responsableNombre.trim() ||
        !datos.responsableDocumento.trim() ||
        !datos.responsableTelefono.trim()
      ) {
        setError(
          'Para aspirantes menores de edad, debes completar el nombre, documento y teléfono del padre, madre o persona responsable.'
        );
        return;
      }
    }

    setEnviando(true);
    try {
      const res = await registroInscripcion({
        ...datos,
        programaId: Number(datos.programaId),
      });
      setExito(res?.mensaje || 'Inscripción registrada.');
      setDatosDeAcceso(res?.credenciales || null);
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
              <p style={{ fontSize: 13, color: '#6f6b62', lineHeight: 1.6, marginBottom: 16 }}>{exito}</p>
              {datos.esMenorDeEdad && datos.responsableNombre && (
                <div style={{
                  background: '#f0f5fc',
                  border: '1px solid #c8dcf6',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 18,
                  fontSize: 12.5,
                  color: '#06468c',
                  textAlign: 'left',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Responsable / Acudiente registrado:</div>
                  <div>{datos.responsableNombre} ({datos.responsableParentesco}) · {datos.responsableTipoDoc} {datos.responsableDocumento}</div>
                  <div>Teléfono: {datos.responsableTelefono}{datos.responsableEmail ? ` · ${datos.responsableEmail}` : ''}</div>
                </div>
              )}
              {datosDeAcceso && (
                <div style={{
                  background: '#f0f5fc', border: '1px solid #c8dcf6', borderRadius: 12,
                  padding: '12px 14px', marginBottom: 18, fontSize: 12.5, color: '#06468c', textAlign: 'left',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Tus datos de acceso (guárdalos):</div>
                  <div>Usuario: <strong>{datosDeAcceso.usuario}</strong></div>
                  <div>Contraseña temporal: <strong>{datosDeAcceso.password}</strong></div>
                  <div style={{ marginTop: 4 }}>Entra a la plataforma y sube tus documentos de admisión; el sistema te pedirá cambiar la contraseña.</div>
                </div>
              )}
              <p style={{ fontSize: 12, color: '#6f6b62', marginBottom: 20 }}>
                Tu usuario de ingreso es tu número de documento. La contraseña temporal también es tu documento; el
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
                  <label style={etiqueta}>Nombre completo del aspirante *</label>
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

                <div style={{ marginBottom: 16 }}>
                  <label style={etiqueta}>Dirección de residencia</label>
                  <input style={campo} name="direccion" value={datos.direccion} onChange={cambiar} placeholder="Ej. Calle 10 #5-30" />
                </div>

                {/* Sección Menor de edad */}
                <div
                  onClick={() => setDatos((d) => ({ ...d, esMenorDeEdad: !d.esMenorDeEdad }))}
                  style={{
                    marginBottom: 16,
                    padding: '12px 14px',
                    background: datos.esMenorDeEdad ? '#f0f5fc' : '#fbfaf7',
                    border: `1.5px solid ${datos.esMenorDeEdad ? '#0a84ff' : '#cdc9bf'}`,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ paddingRight: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#211d17' }}>
                      ¿El aspirante es menor de edad? (menor de 18 años)
                    </div>
                    <div style={{ fontSize: 12, color: '#6f6b62', marginTop: 2 }}>
                      En caso afirmativo, se requerirán los datos del padre, madre o persona responsable.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="esMenorDeEdad"
                    name="esMenorDeEdad"
                    checked={datos.esMenorDeEdad}
                    onChange={(e) => setDatos((d) => ({ ...d, esMenorDeEdad: e.target.checked }))}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 19, height: 19, cursor: 'pointer', accentColor: '#00116f' }}
                  />
                </div>

                {datos.esMenorDeEdad && (
                  <div style={{
                    background: '#f8fafd',
                    border: '1.5px solid #bdd7f5',
                    borderRadius: 14,
                    padding: '16px',
                    marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #dce8f8' }}>
                      <Icon name="users" size={18} color="#06468c" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#06468c' }}>
                          Datos del padre, madre o persona responsable
                        </div>
                        <div style={{ fontSize: 11.5, color: '#556a8a' }}>
                          Información requerida para postulantes menores de edad
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={etiqueta}>Parentesco o relación con el aspirante *</label>
                      <select
                        style={campo}
                        name="responsableParentesco"
                        value={datos.responsableParentesco}
                        onChange={cambiar}
                        required={datos.esMenorDeEdad}
                      >
                        <option value="Madre">Madre</option>
                        <option value="Padre">Padre</option>
                        <option value="Tutor / Acudiente legal">Tutor / Acudiente legal</option>
                        <option value="Abuelo / Abuela">Abuelo / Abuela</option>
                        <option value="Hermano(a) mayor de edad">Hermano(a) mayor de edad</option>
                        <option value="Otro familiar">Otro familiar responsable</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={etiqueta}>Nombre completo del padre, madre o responsable *</label>
                      <input
                        style={campo}
                        name="responsableNombre"
                        value={datos.responsableNombre}
                        onChange={cambiar}
                        required={datos.esMenorDeEdad}
                        placeholder="Ej. Carmen Rodríguez de Pérez"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <label style={etiqueta}>Tipo de documento *</label>
                        <select
                          style={campo}
                          name="responsableTipoDoc"
                          value={datos.responsableTipoDoc}
                          onChange={cambiar}
                          required={datos.esMenorDeEdad}
                        >
                          <option value="CC">Cédula de Ciudadanía (CC)</option>
                          <option value="CE">Cédula de Extranjería (CE)</option>
                          <option value="Pasaporte">Pasaporte</option>
                          <option value="PPT">Permiso Protección Temporal (PPT)</option>
                        </select>
                      </div>
                      <div style={{ flex: 1.2 }}>
                        <label style={etiqueta}>Número de documento *</label>
                        <input
                          style={campo}
                          name="responsableDocumento"
                          value={datos.responsableDocumento}
                          onChange={cambiar}
                          required={datos.esMenorDeEdad}
                          placeholder="Ej. 52345678"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={etiqueta}>Teléfono de contacto *</label>
                        <input
                          style={campo}
                          type="tel"
                          name="responsableTelefono"
                          value={datos.responsableTelefono}
                          onChange={cambiar}
                          required={datos.esMenorDeEdad}
                          placeholder="Ej. 3101234567"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={etiqueta}>Correo electrónico (opcional)</label>
                        <input
                          style={campo}
                          type="email"
                          name="responsableEmail"
                          value={datos.responsableEmail}
                          onChange={cambiar}
                          placeholder="acudiente@ejemplo.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
