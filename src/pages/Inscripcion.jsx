import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from '../components/Select';
import Icon from '../components/Icon';
import { datosInscripcion, registroInscripcion } from '../api/client';
import '../assets/css/login-cul.css';

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
  const [requisitos, setRequisitos] = useState([]);
  const [procesoAbierto, setProcesoAbierto] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null); // { tipo: 'exito' | 'error' | 'info', mensaje }
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);
  const [datosDeAcceso, setDatosDeAcceso] = useState(null);
  const [documentosAdjuntos, setDocumentosAdjuntos] = useState({}); // reqId -> { nombre, tamano, mime, base64 }

  useEffect(() => {
    let vivo = true;
    datosInscripcion()
      .then((res) => {
        if (!vivo) return;
        setProgramas(res?.programas || []);
        setRequisitos(res?.requisitos || []);
        setProcesoAbierto(!!res?.procesoAbierto);
      })
      .catch(() => {
        if (vivo) setError('No se pudieron cargar los programas. Intenta de nuevo más tarde.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  const mostrarToast = (mensaje, tipo = 'info') => {
    setToast({ mensaje, tipo });
    setTimeout(() => {
      setToast((actual) => (actual?.mensaje === mensaje ? null : actual));
    }, 4000);
  };

  const aBase64 = (file) =>
    new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result).split(',')[1]);
      lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
      lector.readAsDataURL(file);
    });

  const manejarArchivo = async (reqId, file) => {
    if (!file) return;
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_BYTES) {
      mostrarToast(`"${file.name}" supera el límite de 10 MB.`, 'error');
      return;
    }
    try {
      const base64 = await aBase64(file);
      setDocumentosAdjuntos((prev) => ({
        ...prev,
        [reqId]: {
          nombre: file.name,
          tamano: file.size,
          mime: file.type || 'application/pdf',
          base64,
        },
      }));
      mostrarToast(`Documento "${file.name}" cargado correctamente`, 'exito');
    } catch {
      mostrarToast('Error al procesar el archivo seleccionado.', 'error');
    }
  };

  const quitarArchivo = (reqId) => {
    setDocumentosAdjuntos((prev) => {
      const copia = { ...prev };
      delete copia[reqId];
      return copia;
    });
    mostrarToast('Documento removido.', 'info');
  };

  const cambiar = (e) => setDatos((d) => ({ ...d, [e.target.name]: e.target.value }));
  const cambiarSoloNumeros = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setDatos((d) => ({ ...d, [e.target.name]: val }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');

    if (datos.documento && datos.documento.length < 4) {
      setError('El documento de identidad debe tener al menos 4 dígitos numéricos.');
      return;
    }

    if (datos.telefono && (datos.telefono.length < 7 || datos.telefono.length > 15)) {
      setError('El teléfono debe contener únicamente números (entre 7 y 15 dígitos).');
      return;
    }

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
      if (datos.responsableTelefono.length < 7 || datos.responsableTelefono.length > 15) {
        setError('El teléfono del acudiente/responsable debe contener únicamente números (entre 7 y 15 dígitos).');
        return;
      }
    }

    setEnviando(true);
    try {
      const docsArray = Object.entries(documentosAdjuntos).map(([reqId, fileObj]) => ({
        requisitoId: Number(reqId),
        archivo: fileObj.nombre,
        archivoB64: fileObj.base64,
        archivoMime: fileObj.mime,
      }));

      const res = await registroInscripcion({
        ...datos,
        programaId: Number(datos.programaId),
        documentos: docsArray,
      });
      setExito(res?.mensaje || 'Inscripción registrada.');
      setDatosDeAcceso(res?.credenciales || null);
      mostrarToast('¡Inscripción y documentos enviados con éxito!', 'exito');
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la inscripción.');
      mostrarToast(err?.message || 'Error al registrar inscripción.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-page">
      {/* Toast Flotante */}
      {toast && (
        <div className={`login-toast is-${toast.tipo === 'exito' ? 'exito' : toast.tipo === 'error' ? 'error' : 'info'}`}>
          <Icon name={toast.tipo === 'exito' ? 'check' : toast.tipo === 'error' ? 'alerta' : 'info'} size={18} color="#ffffff" />
          <span>{toast.mensaje}</span>
        </div>
      )}

      {/* Cabecera institucional idéntica al Login */}
      <header className="login-brand">
        <div className="login-logo" aria-hidden="true">
          <Icon name="logo" size={32} color="#ffffff" />
        </div>
        <h1 className="login-title">UniPlataforma</h1>
        <p className="login-subtitle">Sistema Integral Académico y Administrativo</p>
      </header>

      {/* Tarjeta principal con el estilo del Login */}
      <main className="login-card login-card--wide">
        {exito ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#e3f7ec',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px'
            }}>
              <Icon name="check" size={28} color="#0e8a5f" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Inscripción registrada con éxito
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 18 }}>
              {exito}
            </p>

            {Object.keys(documentosAdjuntos).length > 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 16,
                fontSize: 12.5,
                color: '#0f172a',
                textAlign: 'left',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#12408a' }}>
                  📄 Documentos de requisitos adjuntados ({Object.keys(documentosAdjuntos).length}):
                </div>
                {Object.values(documentosAdjuntos).map((doc, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                    ✓ {doc.nombre} ({(doc.tamano / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            )}

            {datos.esMenorDeEdad && datos.responsableNombre && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 16,
                fontSize: 12.5,
                color: '#0f172a',
                textAlign: 'left',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#12408a' }}>
                  Responsable / Acudiente registrado:
                </div>
                <div style={{ color: '#334155' }}>
                  {datos.responsableNombre} ({datos.responsableParentesco}) · {datos.responsableTipoDoc} {datos.responsableDocumento}
                </div>
                <div style={{ color: '#334155' }}>
                  Teléfono: {datos.responsableTelefono}{datos.responsableEmail ? ` · ${datos.responsableEmail}` : ''}
                </div>
              </div>
            )}

            {datosDeAcceso && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 18,
                fontSize: 12.5,
                color: '#0f172a',
                textAlign: 'left',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#12408a' }}>
                  Tus datos de acceso (guárdalos):
                </div>
                <div>Usuario: <strong>{datosDeAcceso.usuario}</strong></div>
                <div>Contraseña temporal: <strong>{datosDeAcceso.password}</strong></div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: '#475569' }}>
                  Entra a la plataforma para el seguimiento de tu admisión y estado del expediente.
                </div>
              </div>
            )}

            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
              Tu usuario de ingreso es tu número de documento. La contraseña temporal también es tu documento; el
              sistema te pedirá cambiarla al primer ingreso.
            </p>

            <Link
              to="/login"
              className="btn-primary"
              style={{
                display: 'inline-block',
                textDecoration: 'none',
                textAlign: 'center',
                padding: '13px 28px',
                width: 'auto',
              }}
            >
              Ir a Iniciar Sesión →
            </Link>
          </div>
        ) : (
          <>
            <h2>Inscripción de Aspirantes</h2>
            <p className="hint">Completa tus datos personales y adjunta los requisitos para agilizar tu admisión</p>

            {!procesoAbierto && (
              <div className="login-alert login-alert--warning">
                <Icon name="alerta" size={16} color="#b45309" />
                <span>Por ahora no hay un proceso de inscripción abierto.</span>
              </div>
            )}

            {error && (
              <div className="login-alert login-alert--error">
                <Icon name="alerta" size={16} color="#d2233c" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={enviar}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre completo del aspirante *</label>
                <input
                  id="nombre"
                  name="nombre"
                  value={datos.nombre}
                  onChange={cambiar}
                  required
                  placeholder="Ej. Ana María Pérez"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="documento">Documento de identidad *</label>
                  <input
                    id="documento"
                    name="documento"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={20}
                    value={datos.documento}
                    onChange={cambiarSoloNumeros}
                    required
                    placeholder="Ej. 1020304050"
                  />
                </div>

                <div className="form-group">
                  <Select
                    label="Programa académico *"
                    value={String(datos.programaId || '')}
                    onChange={(v) => setDatos((d) => ({ ...d, programaId: v }))}
                    groups={[{
                      options: [
                        { value: '', label: 'Selecciona un programa…' },
                        ...programas.map((p) => ({ value: String(p.id), label: `${p.nombre} — ${p.facultad}` })),
                      ]
                    }]}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={datos.email}
                    onChange={cambiar}
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    id="telefono"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    name="telefono"
                    value={datos.telefono}
                    onChange={cambiarSoloNumeros}
                    placeholder="Ej. 3001234567"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="direccion">Dirección de residencia</label>
                <input
                  id="direccion"
                  name="direccion"
                  value={datos.direccion}
                  onChange={cambiar}
                  placeholder="Ej. Calle 10 #5-30"
                />
              </div>

              {/* Sección Menor de edad */}
              <div
                className={`inscripcion-checkbox-card ${datos.esMenorDeEdad ? 'is-active' : ''}`}
                onClick={() => setDatos((d) => ({ ...d, esMenorDeEdad: !d.esMenorDeEdad }))}
              >
                <div style={{ paddingRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    ¿El aspirante es menor de edad? (menor de 18 años)
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
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
                />
              </div>

              {datos.esMenorDeEdad && (
                <div className="inscripcion-subcard">
                  <div className="inscripcion-subcard-header">
                    <Icon name="users" size={18} color="#12408a" />
                    <div>
                      <div className="inscripcion-subcard-title">
                        Datos del padre, madre o persona responsable
                      </div>
                      <div className="inscripcion-subcard-subtitle">
                        Información requerida para postulantes menores de edad
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <Select
                      label="Parentesco o relación con el aspirante *"
                      value={datos.responsableParentesco}
                      onChange={(v) => setDatos((d) => ({ ...d, responsableParentesco: v }))}
                      groups={[{
                        options: [
                          { value: 'Madre', label: 'Madre' },
                          { value: 'Padre', label: 'Padre' },
                          { value: 'Tutor / Acudiente legal', label: 'Tutor / Acudiente legal' },
                          { value: 'Abuelo / Abuela', label: 'Abuelo / Abuela' },
                          { value: 'Hermano(a) mayor de edad', label: 'Hermano(a) mayor de edad' },
                          { value: 'Otro familiar', label: 'Otro familiar responsable' },
                        ]
                      }]}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="responsableNombre">Nombre completo del padre, madre o responsable *</label>
                    <input
                      id="responsableNombre"
                      name="responsableNombre"
                      value={datos.responsableNombre}
                      onChange={cambiar}
                      required={datos.esMenorDeEdad}
                      placeholder="Ej. Carmen Rodríguez de Pérez"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <Select
                        label="Tipo de documento *"
                        value={datos.responsableTipoDoc}
                        onChange={(v) => setDatos((d) => ({ ...d, responsableTipoDoc: v }))}
                        groups={[{
                          options: [
                            { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
                            { value: 'CE', label: 'Cédula de Extranjería (CE)' },
                            { value: 'Pasaporte', label: 'Pasaporte' },
                            { value: 'PPT', label: 'Permiso Protección Temporal (PPT)' },
                          ]
                        }]}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="responsableDocumento">Número de documento *</label>
                      <input
                        id="responsableDocumento"
                        name="responsableDocumento"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={20}
                        value={datos.responsableDocumento}
                        onChange={cambiarSoloNumeros}
                        required={datos.esMenorDeEdad}
                        placeholder="Ej. 52345678"
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="responsableTelefono">Teléfono de contacto *</label>
                      <input
                        id="responsableTelefono"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={15}
                        name="responsableTelefono"
                        value={datos.responsableTelefono}
                        onChange={cambiarSoloNumeros}
                        required={datos.esMenorDeEdad}
                        placeholder="Ej. 3101234567"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="responsableEmail">Correo electrónico (opcional)</label>
                      <input
                        id="responsableEmail"
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

              {/* Sección de Documentos de Requisitos */}
              {requisitos.length > 0 && (
                <div className="inscripcion-subcard" style={{ marginBottom: 20 }}>
                  <div className="requisitos-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="archivo" size={18} color="#12408a" />
                      <div>
                        <div className="inscripcion-subcard-title">
                          Documentos de Requisitos
                        </div>
                        <div className="inscripcion-subcard-subtitle">
                          Formatos PDF o imagen (máximo 10 MB cada uno)
                        </div>
                      </div>
                    </div>
                    <span className="requisitos-badge">
                      {Object.keys(documentosAdjuntos).length} de {requisitos.length} listos
                    </span>
                  </div>

                  {/* Barra de progreso de carga */}
                  <div className="requisitos-track">
                    <div
                      className="requisitos-bar"
                      style={{
                        width: `${(Object.keys(documentosAdjuntos).length / requisitos.length) * 100}%`,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {requisitos.map((r) => {
                      const adjunto = documentosAdjuntos[r.id];
                      return (
                        <div
                          key={r.id}
                          className={`requisito-row ${adjunto ? 'is-uploaded' : ''}`}
                        >
                          <div style={{ minWidth: 160, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {r.nombre} {r.obligatorio && <span style={{ color: '#d2233c' }}>*</span>}
                            </div>
                            <div style={{ fontSize: 11, color: adjunto ? '#0e8a5f' : '#64748b', marginTop: 2 }}>
                              {adjunto
                                ? `✓ ${adjunto.nombre} (${(adjunto.tamano / (1024 * 1024)).toFixed(2)} MB)`
                                : 'Pendiente de adjuntar (opcional ahora, o súbelo en tu portal)'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label
                              className={`btn-requisito-upload ${adjunto ? 'is-uploaded' : ''}`}
                              style={{ color: adjunto ? '#12408a' : '#ffffff' }}
                            >
                              <Icon name={adjunto ? 'reemplazar' : 'subir'} size={14} color={adjunto ? '#12408a' : '#ffffff'} />
                              <span style={{ color: adjunto ? '#12408a' : '#ffffff' }}>{adjunto ? 'Cambiar' : 'Subir archivo'}</span>
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) manejarArchivo(r.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>

                            {adjunto && (
                              <button
                                type="button"
                                className="btn-requisito-delete"
                                onClick={() => quitarArchivo(r.id)}
                                title="Quitar archivo"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={enviando || !procesoAbierto}
                style={{
                  opacity: enviando || !procesoAbierto ? 0.6 : 1,
                  cursor: enviando || !procesoAbierto ? 'not-allowed' : 'pointer',
                  fontSize: 14.5,
                }}
              >
                {enviando ? 'Enviando inscripción y documentos…' : 'Enviar inscripción'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 18 }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" style={{ color: '#12408a', fontWeight: 700, textDecoration: 'none' }}>
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </main>

      {/* Pie institucional idéntico al Login */}
      <p className="login-tagline">Aquí tienes todo para ser feliz</p>
      <p className="login-since">Educación con calidad y sentido social. Desde 1965.</p>
    </div>
  );
}
