import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  borrarDocumentoIngreso,
  descargarDocumentoIngreso,
  misDocumentos,
  subirDocumentoIngreso,
} from '../api/client';

/* Tope de archivo: el mismo de la API (4 MB). */
const MAX_BYTES = 4 * 1024 * 1024;

const TONO = {
  aprobado: { bg: '#d8f0e5', fg: '#0a6e4b', txt: 'Aprobado' },
  rechazado: { bg: '#ffe0e5', fg: '#c1122c', txt: 'Rechazado' },
  pendiente: { bg: '#fbefd6', fg: '#99610e', txt: 'En revisión' },
  ninguno: { bg: '#f0eee9', fg: '#6b675e', txt: 'Sin subir' },
};

const tonoDe = (archivo) => (archivo ? TONO[archivo.estado] || TONO.pendiente : TONO.ninguno);

const kB = (n) => (n > 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/* Archivo del navegador -> base64 sin el prefijo data:... , para mandarlo en
   JSON como hace la API (mismo patrón que el material del campus). */
const aBase64 = (file) =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(',')[1]);
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(file);
  });

export default function DocumentosIngreso() {
  const navigate = useNavigate();
  const [expo, setExpo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);
  const [subiendo, setSubiendo] = useState(null);
  const inputs = useRef({});

  const cargar = useCallback(async () => {
    try {
      setExpo(await misDocumentos());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const subir = async (requisito, file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setAviso({ ok: false, texto: `${file.name} pesa ${kB(file.size)}: el máximo es 4 MB.` });
      return;
    }
    setSubiendo(requisito.id);
    setAviso(null);
    try {
      const archivoB64 = await aBase64(file);
      await subirDocumentoIngreso(requisito.id, {
        archivoB64,
        archivo: file.name,
        archivoMime: file.type || 'application/pdf',
      });
      setAviso({ ok: true, texto: `${requisito.nombre}: archivo subido. Admisiones lo revisará y te avisará si algo falta.` });
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: `No se pudo subir ${requisito.nombre}: ${err.message}` });
    } finally {
      setSubiendo(null);
    }
  };

  const quitar = async (requisito) => {
    setSubiendo(requisito.id);
    setAviso(null);
    try {
      await borrarDocumentoIngreso(requisito.id);
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setSubiendo(null);
    }
  };

  if (cargando) {
    return <div className="card"><div className="card-bd" style={{ color: '#6b675e', fontSize: 13 }}>Cargando tu expediente…</div></div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-bd" style={{ color: '#c1122c', fontSize: 13 }}>No se pudo cargar el expediente: {error}</div>
      </div>
    );
  }

  if (!expo) return null;

  const { estudiante, requisitos, puedeMatricular } = expo;
  const subidos = requisitos.filter((r) => r.archivo).length;
  const rechazados = requisitos.filter((r) => r.archivo?.estado === 'rechazado').length;

  return (
    <div style={{ maxWidth: 820 }}>
      {/* ── Estado del expediente ── */}
      <div className="card">
        <div className="card-hd">
          <span className="card-ttl"><Icon name="adm-documentos" size={16} /> Documentos de Admisión</span>
          <span className="bs" style={{ background: puedeMatricular ? '#d8f0e5' : '#fbefd6', color: puedeMatricular ? '#0a6e4b' : '#99610e' }}>
            {puedeMatricular ? 'Expediente validado' : 'En revisión'}
          </span>
        </div>
        <div className="card-bd">
          <p style={{ fontSize: 13, color: '#6b675e', margin: '0 0 14px' }}>
            Hola {estudiante.nombre} (código {estudiante.id}), sube aquí los documentos que pide tu programa.
            Admisiones los revisa y, cuando todo esté aprobado, se habilita <strong>Matricular Materias</strong>.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px', background: '#f8f7f3', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#211d17' }}>{subidos}/{requisitos.length}</div>
              <div style={{ fontSize: 11, color: '#9c988e' }}>documentos subidos</div>
            </div>
            <div style={{ flex: '1 1 140px', background: '#f8f7f3', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: rechazados ? '#c1122c' : '#0a6e4b' }}>{rechazados}</div>
              <div style={{ fontSize: 11, color: '#9c988e' }}>observados por Admisiones</div>
            </div>
            <div style={{ flex: '1 1 140px', background: '#f8f7f3', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#211d17' }}>{estudiante.documentos}</div>
              <div style={{ fontSize: 11, color: '#9c988e' }}>estado del expediente</div>
            </div>
          </div>

          {puedeMatricular && (
            <div style={{ marginTop: 16, background: '#d8f0e5', border: '1px solid #a7e3c8', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#0a6e4b' }}><Icon name="check-circle" size={18} /></span>
              <span style={{ flex: 1, fontSize: 13, color: '#0a6e4b', fontWeight: 600 }}>
                Tu expediente está validado. Ya puedes matricular tus materias.
              </span>
              <button className="btn b-primary b-sm" data-testid="ir-matricula" onClick={() => navigate('/matricula')}>
                <Icon name="matricular" size={15} /> Ir a matricular
              </button>
            </div>
          )}
        </div>
      </div>

      {aviso && (
        <div style={{
          marginTop: 14, borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center',
          background: aviso.ok ? '#d8f0e5' : '#ffe0e5',
          color: aviso.ok ? '#0a6e4b' : '#c1122c',
          border: `1px solid ${aviso.ok ? '#a7e3c8' : '#f4b6bf'}`,
          fontSize: 13,
        }}>
          <span>{aviso.ok ? <Icon name="check" size={16} /> : <Icon name="alerta" size={14} />}</span>
          <span>{aviso.texto}</span>
        </div>
      )}

      {/* ── Lista de requisitos ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-hd">
          <span className="card-ttl"><Icon name="archivo" size={16} /> Requisitos del expediente</span>
        </div>
        <div>
          {requisitos.map((r) => {
            const tono = tonoDe(r.archivo);
            return (
              <div key={r.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f0eee9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#211d17', margin: 0 }}>
                      {r.nombre}
                      {r.obligatorio && <span style={{ color: '#c1122c', marginLeft: 4 }}>*</span>}
                    </p>
                    <p style={{ fontSize: 11, color: '#9c988e', margin: '3px 0 0' }}>
                      {r.archivo
                        ? <>
                            {r.archivo.nombre} · {kB(r.archivo.tamano)} ·
                            subido {r.archivo.subidoEn ? new Date(r.archivo.subidoEn).toLocaleDateString('es-CO') : ''}
                          </>
                        : 'Aún no has subido este documento (PDF o imagen, máximo 4 MB).'}
                    </p>
                  </div>

                  <span style={{ background: tono.bg, color: tono.fg, borderRadius: 20, padding: '4px 11px', fontSize: 11, fontWeight: 700 }}>
                    {tono.txt}
                  </span>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      style={{ display: 'none' }}
                      ref={(el) => { inputs.current[r.id] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        subir(r, file);
                      }}
                    />
                    <button
                      className="btn b-secondary b-sm"
                      data-testid={`subir-${r.clave}`}
                      disabled={subiendo === r.id}
                      onClick={() => inputs.current[r.id]?.click()}
                    >
                      <Icon name="subir" size={15} /> {r.archivo ? 'Reemplazar' : 'Subir archivo'}
                    </button>

                    {r.archivo && (
                      <button
                        className="btn b-secondary b-sm"
                        onClick={() => descargarDocumentoIngreso(r.id).catch((err) => setAviso({ ok: false, texto: err.message }))}
                      >
                        <Icon name="descargar" size={15} /> Ver
                      </button>
                    )}

                    {r.archivo && r.archivo.estado !== 'aprobado' && (
                      <button
                        className="btn b-secondary b-sm"
                        disabled={subiendo === r.id}
                        onClick={() => quitar(r)}
                      >
                        <Icon name="borrar" size={15} /> Quitar
                      </button>
                    )}
                  </div>
                </div>

                {r.archivo?.observacion && (
                  <div style={{
                    marginTop: 10, background: '#ffe0e5', border: '1px solid #f4b6bf', borderRadius: 10,
                    padding: '8px 12px', fontSize: 12, color: '#c1122c', display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="mensaje" size={14} /></span>
                    <span>
                      <strong>Admisiones:</strong> {r.archivo.observacion}
                      {r.archivo.estado === 'rechazado' && ' Sube una versión corregida del documento.'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {!requisitos.length && (
            <div style={{ padding: '18px', fontSize: 13, color: '#6b675e' }}>
              No hay requisitos vigentes en este momento. Admisiones los publicará pronto.
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#9c988e', marginTop: 12 }}>
        Los documentos con <span style={{ color: '#c1122c' }}>*</span> son obligatorios. Si Admisiones marca uno como
        rechazado verás aquí el motivo y podrás subirlo de nuevo.
      </p>
    </div>
  );
}
