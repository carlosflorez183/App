/* =============================================
   Configuración del curso
   Editar: datos visuales + imágenes con drag & drop
   (sin usuarios, sin modo acceso — esos van en ConfigCursoUsuarios)
   ============================================= */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { configCurso } from '../api/client';

/* ── Tokens de diseño ─────────────────────────────────────────────────── */
const card  = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 14, padding: 22 };
const input = { padding: '9px 12px', border: '1px solid #d9d5cc', borderRadius: 9, fontSize: 13, background: '#fff', width: '100%', outline: 'none', transition: 'border-color .15s', boxSizing: 'border-box' };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate:  ['#f0eee9', '#4e4a43'],
    green:  ['#d8f0e5', '#0a6e4b'],
    blue:   ['#e3f1ff', '#06468c'],
    purple: ['#efe9fb', '#5a37ad'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return (
    <span style={{ background: bg, color: fg, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
};

/* ── Componente de zona de carga de imagen ────────────────────────────── */
const CONFIGS = {
  portada: {
    label: 'Portada del curso',
    hint: 'Se muestra en la cabecera de la vista del campus. Recomendado: 1280 × 400 px.',
    ratio: '100% / 220px',
    icon: 'imagen',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  banner: {
    label: 'Banner',
    hint: 'Banner ancho para destacar el curso. Recomendado: 1600 × 300 px.',
    ratio: '100% / 180px',
    icon: 'imagen',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  imagen: {
    label: 'Imagen de portada',
    hint: 'Miniatura cuadrada usada en listados y tarjetas. Recomendado: 400 × 400 px.',
    ratio: '100% / 200px',
    icon: 'imagen',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
};

function ZonaImagen({ tipo, url, subiendo, onChange }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const cfg = CONFIGS[tipo];

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    onChange(tipo, file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const esSubiendo = subiendo === tipo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Etiqueta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2d2a24' }}>{cfg.label}</span>
        {url && (
          <button
            type="button"
            onClick={() => onChange(tipo, null)}
            style={{ fontSize: 11, color: '#c1122c', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, transition: 'background .15s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fff1f3'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            Quitar
          </button>
        )}
      </div>

      {/* Zona drop / preview */}
      <div
        onClick={() => !esSubiendo && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{
          position: 'relative',
          width: '100%',
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          border: drag ? '2px dashed #7c3aed' : url ? '2px solid transparent' : '2px dashed #d9d5cc',
          cursor: esSubiendo ? 'wait' : 'pointer',
          background: url ? 'transparent' : '#f7f6f3',
          transition: 'border-color .2s, box-shadow .2s',
          boxShadow: drag ? '0 0 0 4px #ede9fe' : url ? '0 2px 12px rgba(0,0,0,.1)' : 'none',
        }}
      >
        {url ? (
          /* Preview con overlay de hover */
          <>
            <img
              src={url}
              alt={cfg.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,.45)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity .2s',
              color: '#fff', gap: 6,
            }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = 1; }}
              onMouseOut={(e) => { e.currentTarget.style.opacity = 0; }}
            >
              <Icon name="imagen" size={28} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>Cambiar imagen</span>
            </div>
          </>
        ) : (
          /* Placeholder vacío */
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10,
          }}>
            {esSubiendo ? (
              <>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '3px solid #ede9fe', borderTopColor: '#7c3aed',
                  animation: 'uni-spin 0.7s linear infinite',
                }} />
                <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Subiendo…</span>
              </>
            ) : (
              <>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: cfg.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,.15)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2d2a24' }}>
                    {drag ? 'Suelta aquí' : 'Arrastra o haz clic'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9c988e', marginTop: 3 }}>
                    PNG, JPG, WEBP · máx. 5 MB
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Spinner encima de preview si está subiendo con imagen previa */}
        {esSubiendo && url && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,.7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid #ede9fe', borderTopColor: '#7c3aed',
              animation: 'uni-spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Subiendo…</span>
          </div>
        )}
      </div>

      {/* Botón de selección visible y llamativo */}
      <button
        type="button"
        disabled={esSubiendo}
        onClick={() => ref.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '9px 0', borderRadius: 9, border: 'none', cursor: esSubiendo ? 'wait' : 'pointer',
          background: cfg.gradient,
          color: '#fff', fontSize: 12, fontWeight: 700,
          boxShadow: '0 2px 8px rgba(0,0,0,.12)',
          transition: 'opacity .15s, transform .12s',
          opacity: esSubiendo ? 0.6 : 1,
        }}
        onMouseOver={(e) => { if (!esSubiendo) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.18)'; } }}
        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)'; }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {esSubiendo ? 'Subiendo…' : url ? 'Cambiar imagen' : 'Seleccionar imagen'}
      </button>

      {/* Hint */}
      <p style={{ fontSize: 11, color: '#9c988e', margin: 0, lineHeight: 1.4 }}>{cfg.hint}</p>

      {/* Input file oculto */}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────────────────── */
export default function ConfigCurso() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const esDirector = user?.role === 'director';
  const esAdmin    = user?.role === 'admin';

  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [form, setForm]       = useState({});
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo]   = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await configCurso(id);
      setData(res);
      setForm({
        nombre:      res.curso.nombre      || '',
        nombreCorto: res.curso.nombreCorto || res.curso.codigo || '',
        grupo:       res.curso.grupo       || '',
        semestre:    res.curso.semestre    ?? '',
        portadaUrl:  res.curso.portadaUrl  || '',
        bannerUrl:   res.curso.bannerUrl   || '',
        imagenUrl:   res.curso.imagenUrl   || '',
        resumen:     res.curso.resumen     || '',
        descripcion: res.curso.descripcion || '',
        fechaInicio: res.curso.fechaInicio ? String(res.curso.fechaInicio).substring(0, 10) : '',
        fechaFin:    res.curso.fechaFin    ? String(res.curso.fechaFin).substring(0, 10)    : '',
        visible:     res.curso.visible !== false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const curso = data?.curso || {};

  /* Maneja subida o limpieza (null = quitar) */
  const handleImagen = async (tipo, file) => {
    if (file === null) {
      setForm(f => ({ ...f, [`${tipo}Url`]: '' }));
      return;
    }
    setSubiendo(tipo);
    setMensaje(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('uni_token');
      const res = await fetch('/api/uploads/curso', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al subir');
      setForm(f => ({ ...f, [`${tipo}Url`]: json.url }));
      setMensaje('✓ Imagen cargada correctamente.');
    } catch (err) {
      setMensaje(err.message);
    } finally {
      setSubiendo(null);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const payload = {
        nombre:      form.nombre,
        nombreCorto: form.nombreCorto,
        grupo:       form.grupo,
        semestre:    form.semestre === '' ? null : Number(form.semestre),
        portadaUrl:  form.portadaUrl  || null,
        bannerUrl:   form.bannerUrl   || null,
        imagenUrl:   form.imagenUrl   || null,
        resumen:     form.resumen,
        descripcion: form.descripcion,
        fechaInicio: form.fechaInicio || null,
        fechaFin:    form.fechaFin    || null,
        visible:     form.visible !== false,
      };
      const { actualizarCurso } = await import('../api/client');
      await actualizarCurso(curso.id, payload);
      setMensaje('✓ Cambios guardados.');
      await cargar();
    } catch (err) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const volver = () => {
    if (esDirector) navigate('/director?tab=cursos');
    else if (esAdmin) navigate('/admin?tab=cursos');
    else navigate(-1);
  };

  /* ── Keyframe de animación ── */
  const spinStyle = `
    @keyframes uni-spin { to { transform: rotate(360deg); } }
    .uni-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
    .uni-textarea:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
  `;

  if (cargando) return (
    <ModuleLayout title="Editar curso">
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, color: '#7c3aed' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'uni-spin .7s linear infinite' }} />
        Cargando…
      </div>
    </ModuleLayout>
  );

  if (error) return (
    <ModuleLayout title="Editar curso">
      <div style={{ ...card, background: '#fff1f3', borderColor: '#f4c2ca', color: '#c1122c' }}>{error}</div>
    </ModuleLayout>
  );

  const esError = mensaje && (mensaje.startsWith('Error') || !mensaje.startsWith('✓'));

  return (
    <ModuleLayout title="Editar curso" subtitle={`${curso.codigo} · ${curso.nombre} · Grupo ${curso.grupo}`}>
      <style>{spinStyle}</style>

      <div className="fade-in" style={{ display: 'grid', gap: 18 }}>

        {/* ── Barra superior ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn" onClick={volver}>
            <Icon name="flecha-izquierda" size={15} /> Volver
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn" onClick={() => navigate(`/curso/${curso.id}`)}>Vista del curso</button>
            <Badge tone="purple">{curso.programa || '—'}</Badge>
          </div>
        </div>

        {/* ── Alerta de mensaje ── */}
        {mensaje && (
          <div style={{
            padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            background: esError ? '#fff1f3' : '#f0fdf4',
            borderLeft: `4px solid ${esError ? '#f43f5e' : '#22c55e'}`,
            color: esError ? '#c1122c' : '#15803d',
            border: `1px solid ${esError ? '#fecdd3' : '#bbf7d0'}`,
          }}>
            {mensaje}
          </div>
        )}

        {/* ── Datos del curso ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cursos" size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1816' }}>Datos del curso</div>
              <div style={{ fontSize: 11, color: '#9c988e' }}>Información general e identificación</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>

            <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43' }}>Nombre completo del curso</span>
              <input
                className="uni-input"
                value={form.nombre || ''}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                style={input}
                disabled={!esAdmin}
                placeholder="Ej: Ingeniería de Software"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43' }}>Nombre corto</span>
              <input
                className="uni-input"
                value={form.nombreCorto || ''}
                onChange={(e) => setForm({ ...form, nombreCorto: e.target.value })}
                style={input}
                disabled={!esAdmin}
                placeholder="IS-801"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43' }}>Grupo</span>
              <input
                className="uni-input"
                value={form.grupo || ''}
                onChange={(e) => setForm({ ...form, grupo: e.target.value })}
                style={input}
                disabled={!esAdmin}
                placeholder="A"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43' }}>Semestre</span>
              <input
                className="uni-input"
                type="number"
                min={1}
                value={form.semestre ?? ''}
                onChange={(e) => setForm({ ...form, semestre: e.target.value })}
                style={input}
                disabled={!esAdmin}
                placeholder="8"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43' }}>Fecha de inicio</span>
              <input
                className="uni-input"
                type="date"
                value={form.fechaInicio || ''}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                style={input}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43' }}>Fecha de finalización</span>
              <input
                className="uni-input"
                type="date"
                value={form.fechaFin || ''}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                style={input}
              />
            </label>

          </div>
        </div>

        {/* ── Imágenes ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f093fb, #f5576c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="imagen" size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1816' }}>Imágenes del curso</div>
              <div style={{ fontSize: 11, color: '#9c988e' }}>Arrastra archivos o haz clic para subir. PNG, JPG, WEBP.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            <ZonaImagen tipo="portada" url={form.portadaUrl} subiendo={subiendo} onChange={handleImagen} />
            <ZonaImagen tipo="banner"  url={form.bannerUrl}  subiendo={subiendo} onChange={handleImagen} />
            <ZonaImagen tipo="imagen"  url={form.imagenUrl}  subiendo={subiendo} onChange={handleImagen} />
          </div>
        </div>

        {/* ── Descripción del curso ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4facfe, #00f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="archivo-texto" size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1816' }}>Descripción del curso</div>
              <div style={{ fontSize: 11, color: '#9c988e' }}>Descripción que verán los estudiantes</div>
            </div>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4e4a43' }}>Descripción completa</span>
            <textarea
              className="uni-textarea"
              value={form.descripcion || ''}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={6}
              placeholder="Contenido, competencias, metodología…"
              style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
            />
          </label>
        </div>

        {/* ── Barra de guardado ── */}
        <div style={{
          ...card,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderColor: '#c4b5fd',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95' }}>¿Todo listo?</div>
            <div style={{ fontSize: 12, color: '#6d28d9' }}>Guarda los cambios para que se reflejen en el campus.</div>
          </div>
          <button
            onClick={guardar}
            disabled={guardando || subiendo !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 28px', borderRadius: 10, border: 'none',
              background: guardando ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: guardando || subiendo !== null ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(109,40,217,.35)',
              transition: 'opacity .15s, transform .12s',
            }}
            onMouseOver={(e) => { if (!guardando) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Icon name="guardar" size={16} />
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

      </div>
    </ModuleLayout>
  );
}
