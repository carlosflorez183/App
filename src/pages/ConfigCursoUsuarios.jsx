/* =============================================
   Usuarios matriculados del curso (separado)
   ============================================= */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from '../components/Select';
import ModuleLayout from '../components/ModuleLayout';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { configCurso, buscarUsuarios, inscribirUsuarioCurso, retirarEstudianteCurso } from '../api/client';
import '../assets/css/registros.css';

const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', border: '1px solid #d9d5cc', borderRadius: 8, fontSize: 13, background: '#fff' };
const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9' };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f0eee9', '#4e4a43'], green: ['#d8f0e5', '#0a6e4b'], blue: ['#e3f1ff', '#06468c'], purple: ['#efe9fb', '#5a37ad'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{children}</span>;
};

export default function ConfigCursoUsuarios() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const esDirector = user?.role === 'director';
  const esAdmin = user?.role === 'admin';

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [rolEnCurso, setRolEnCurso] = useState('estudiante');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [inscribiendo, setInscribiendo] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await configCurso(id);
      setData(res);
      setForm({
        modoAcceso: res.curso.modoAcceso || 'manual',
        cupo: res.curso.cupo ?? '',
        docenteId: res.curso.docenteId || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    let vivo = true;
    const q = busqueda.trim();
    if (q.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const res = await buscarUsuarios(q, id);
        if (vivo) setResultados(res || []);
      } catch (err) {
        if (vivo) setMensaje(err.message);
      } finally {
        if (vivo) setBuscando(false);
      }
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [busqueda, id]);

  const curso = data?.curso || {};
  const inscritos = data?.inscritos || [];
  const docentes = data?.docentes || [];
  const docenteTitular = data?.docenteTitular || null;
  const usuariosMatriculados = data?.usuariosMatriculados || [
    ...(docenteTitular ? [{ tipo: 'docente', rol: 'docente', etiqueta: '(D)', nombre: docenteTitular.nombre, correo: docenteTitular.email, id: docenteTitular.id, docenteId: docenteTitular.id, estudianteId: null }] : []),
    ...inscritos.map((e) => ({ tipo: 'estudiante', rol: 'estudiante', etiqueta: '', ...e, id: e.estudianteId })),
  ];

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      if (esDirector) {
        const payload = { cupo: form.cupo === '' ? null : Number(form.cupo), modoAcceso: form.modoAcceso, docenteId: form.docenteId || null };
        const { directorActualizarCurso } = await import('../api/client');
        await directorActualizarCurso(curso.id, payload);
      } else if (esAdmin) {
        const payload = { cupo: form.cupo === '' ? null : Number(form.cupo), modoAcceso: form.modoAcceso, docenteId: form.docenteId || null };
        const { actualizarCurso } = await import('../api/client');
        await actualizarCurso(curso.id, payload);
      }
      setMensaje('Guardado.');
      await cargar();
    } catch (err) {
      setMensaje(`No se pudo guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const matricular = async (r) => {
    setInscribiendo(r.usuarioId || r.estudianteId || r.nombre);
    setMensaje(null);
    try {
      if (rolEnCurso === 'estudiante') {
        const estudianteId = r.estudianteId;
        if (!estudianteId) throw new Error('No se encontró la ficha de estudiante');
        if (r.yaInscrito) throw new Error('Ya está inscrito');
        const res = await inscribirUsuarioCurso(curso.id, { estudianteId, rolEnCurso: 'estudiante' });
        setMensaje(`Inscrito: ${r.nombre}${res?.total != null ? ` (total: ${res.total})` : ''}`);
      } else {
        const docenteId = r.docenteId;
        if (!docenteId) throw new Error('No se encontró la ficha de docente');
        const res = await inscribirUsuarioCurso(curso.id, { docenteId, rolEnCurso: 'docente', forzarReemplazo: docenteTitular ? true : false });
        setMensaje(res?.profesor ? `Docente asignado: ${res.profesor}` : `Docente asignado: ${r.nombre}`);
      }
      setBusqueda(''); setResultados([]); await cargar();
    } catch (err) {
      setMensaje(err.message);
    } finally {
      setInscribiendo(null);
    }
  };

  const retirar = async (est) => {
    setMensaje(null);
    try {
      await retirarEstudianteCurso(curso.id, est.estudianteId);
      setMensaje(`Retirado: ${est.nombre}`);
      await cargar();
    } catch (err) {
      setMensaje(err.message);
    }
  };

  const volver = () => {
    if (esDirector) navigate('/director?tab=cursos');
    else if (esAdmin) navigate('/admin?tab=cursos');
    else navigate(-1);
  };

  if (cargando) return <ModuleLayout title="Usuarios matriculados"><div style={card}>Cargando…</div></ModuleLayout>;
  if (error) return <ModuleLayout title="Usuarios matriculados"><div style={{ ...card, background: '#fff1f3', borderColor: '#f4c2ca', color: '#c1122c' }}>{error}</div></ModuleLayout>;

  return (
    <ModuleLayout title="Usuarios matriculados" subtitle={`${curso.codigo} · ${curso.nombre} · Grupo ${curso.grupo}`}>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn" onClick={volver}><Icon name="flecha-izquierda" size={15} /> Volver</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => navigate(`/curso/${curso.id}`)}>Vista</button>
            <Badge tone="purple">{curso.programa || '—'}</Badge>
          </div>
        </div>

        {mensaje && (
          <div style={{ ...card, padding: 10, background: mensaje.includes('No se pudo') || mensaje.includes('ya está') || mensaje.includes('Ya está') ? '#fff1f3' : '#e9f7f1', borderColor: mensaje.includes('No se pudo') || mensaje.includes('ya está') || mensaje.includes('Ya está') ? '#f4c2ca' : '#b6e3cf', color: mensaje.includes('No se pudo') || mensaje.includes('ya está') || mensaje.includes('Ya está') ? '#c1122c' : '#0a6e4b' }}>
            <span style={{ fontSize: 13 }}>{mensaje}</span>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Configuración de acceso y asignación</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            <Select
              label="Modo de acceso"
              value={form.modoAcceso}
              onChange={(v) => setForm({ ...form, modoAcceso: v })}
              groups={[{ options: [
                { value: 'manual', label: 'Manual — se asigna desde aquí' },
                { value: 'auto', label: 'Automática — se inscribe al matricular la materia' },
              ] }]}
            />
            <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
              Cupo
              <input type="number" min={0} placeholder="Sin límite" value={form.cupo ?? ''} onChange={(e) => setForm({ ...form, cupo: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <Select
                label="Docente titular"
                value={String(form.docenteId || '')}
                onChange={(v) => setForm({ ...form, docenteId: v })}
                groups={[{ options: [
                  { value: '', label: 'Sin asignar' },
                  ...docentes.map((d) => ({ value: String(d.id), label: `${d.nombre}${d.area ? ` · ${d.area}` : ''}` })),
                ] }]}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={guardar} disabled={guardando}><Icon name="guardar" size={15} /> {guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Buscar y matricular / Asignar docente</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <input placeholder="Buscar por nombre, apellido, correo o documento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...input, flex: '1 1 260px' }} />
            <Select
              label="Rol en el curso"
              value={rolEnCurso}
              onChange={setRolEnCurso}
              groups={[{ options: [
                { value: 'estudiante', label: 'Inscribir como Estudiante' },
                { value: 'docente', label: 'Asignar como Docente titular' },
              ] }]}
            />
          </div>
          {docenteTitular && rolEnCurso === 'docente' && <div style={{ fontSize: 12, color: '#6f6b62', marginBottom: 10 }}>Docente titular actual: <strong>{docenteTitular.nombre}</strong>. Al asignar otro docente se reemplazará el titular.</div>}
          {buscando && <div style={{ fontSize: 12, color: '#9c988e' }}>Buscando…</div>}
          {resultados.length > 0 && (
            <div style={{ border: '1px solid #e5e2da', borderRadius: 10, overflow: 'hidden' }}>
              {resultados.map((r) => (
                <div key={`${r.usuarioId || r.nombre}-${r.documento || r.correo}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #f0eee9' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.nombre}</div>
                    <div style={{ fontSize: 11, color: '#9c988e' }}>{r.correo || '—'}{r.documento ? ` · ${r.documento}` : ''}{r.programa ? ` · ${r.programa}` : ''}</div>
                    <div style={{ fontSize: 11, color: '#9c988e' }}>{r.esEstudiante && <span>Estudiante</span>}{r.esEstudiante && r.esDocente ? ' / ' : ''}{r.esDocente && <span>Docente</span>}{r.yaInscrito ? ' · Ya inscrito' : ''}</div>
                  </div>
                  <button className="btn" style={{ padding: '5px 10px', fontSize: 11, background: rolEnCurso === 'docente' ? '#0a84ff' : '#0a6e4b', color: '#fff' }} disabled={inscribiendo === (r.usuarioId || r.nombre) || (rolEnCurso === 'estudiante' && r.yaInscrito)} onClick={() => matricular(r)}>
                    {inscribiendo === (r.usuarioId || r.nombre) ? 'Procesando…' : rolEnCurso === 'docente' ? (docenteTitular && r.docenteId !== docenteTitular.id ? 'Reemplazar docente titular' : 'Asignar como docente titular') : r.yaInscrito ? 'Ya inscrito' : 'Matricular'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Usuarios matriculados</div>
              <div style={{ fontSize: 12, color: '#9c988e' }}>Lista unificada. Docente identificado con (D).</div>
            </div>
            <Badge tone="purple">Cupo: {curso.cupo ?? 'Sin límite'} · Inscritos: {inscritos.length}</Badge>
          </div>
          {usuariosMatriculados.length === 0 ? <div style={{ fontSize: 13, color: '#9c988e' }}>No hay usuarios matriculados aún.</div> : (
            <div className="reg-lista">
              {usuariosMatriculados.map((u, idx) => (
                <div key={`${u.tipo}-${u.id}-${idx}`} className="reg-card">
                  <Avatar nombre={u.nombre} clase={u.tipo === 'docente' ? 'av-blue' : 'av-green'} tamano={40} radio={20} />
                  <div className="reg-id">
                    <div className="reg-nombre">
                      {u.nombre}{u.etiqueta ? <span style={{ color: '#06468c', fontWeight: 700 }}> {u.etiqueta}</span> : null}
                    </div>
                    <div className="reg-sub"><code style={{ fontSize: 11 }}>{u.estudianteId || u.docenteId || u.id}</code></div>
                  </div>
                  <div className="reg-datos">
                    <div className="reg-dato">
                      <span className="reg-etq">Correo</span>
                      <span>{u.correo || '—'}</span>
                    </div>
                    <div className="reg-dato">
                      <span className="reg-etq">Documento</span>
                      <span>{u.documento || '—'}</span>
                    </div>
                    <div className="reg-dato">
                      <span className="reg-etq">Programa</span>
                      <span>{u.programa || '—'}</span>
                    </div>
                  </div>
                  <div className="reg-estado">
                    <Badge tone={u.tipo === 'docente' ? 'blue' : 'green'}>{u.tipo === 'docente' ? 'Docente' : 'Estudiante'}</Badge>
                  </div>
                  <div className="reg-acciones">
                    {u.tipo === 'estudiante' && u.estudianteId ? (
                      <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => retirar({ estudianteId: u.estudianteId, nombre: u.nombre })}>
                        <Icon name="eliminar" size={14} /> Retirar
                      </button>
                    ) : <span style={{ fontSize: 11, color: '#9c988e' }}>Docente titular</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
