/* =============================================
   Configuración completa del curso (configcurso)
   Compartida por director y administrador.
   - Director: solo puede editar cupo, modo de acceso
     y docente titular. Busca/inscribe estudiantes
     y asigna/reemplaza docente.
   - Admin: usa la misma vista unificada con sus
     permisos habituales.
   ============================================= */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { configCurso, buscarUsuarios, inscribirUsuarioCurso, retirarEstudianteCurso, actualizarCurso } from '../api/client';

const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', border: '1px solid #d9d5cc', borderRadius: 8, fontSize: 13, background: '#fff' };
const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9' };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f0eee9', '#4e4a43'], green: ['#d8f0e5', '#0a6e4b'], amber: ['#fbefd6', '#99610e'],
    red: ['#ffe0e5', '#c1122c'], blue: ['#e3f1ff', '#06468c'], purple: ['#efe9fb', '#5a37ad'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{children}</span>;
};

export default function ConfigCurso() {
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
  const [reemplazarDocente, setReemplazarDocente] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await configCurso(id);
      setData(res);
      setForm({
        modoAcceso: res.curso.modoAcceso || 'manual',
        cupo: res.curso.cupo ?? '',
        docenteId: res.curso.docenteId || '',
        nombre: res.curso.nombre,
        grupo: res.curso.grupo,
        semestre: res.curso.semestre ?? '',
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
        await inscribirUsuarioCurso ? null : null;
        const payload = {
          cupo: form.cupo === '' ? null : Number(form.cupo),
          modoAcceso: form.modoAcceso,
          docenteId: form.docenteId || null,
        };
        const { directorActualizarCurso } = await import('../api/client');
        await directorActualizarCurso(curso.id, payload);
      } else if (esAdmin) {
        const payload = {
          nombre: form.nombre,
          grupo: form.grupo,
          semestre: form.semestre === '' ? null : Number(form.semestre),
          cupo: form.cupo === '' ? null : Number(form.cupo),
          modoAcceso: form.modoAcceso,
          docenteId: form.docenteId || null,
        };
        const { actualizarCurso } = await import('../api/client');
        await actualizarCurso(curso.id, payload);
      }
      setMensaje('Configuración guardada.');
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
        if (!estudianteId) throw new Error('No se encontró la ficha de estudiante para este usuario');
        if (r.yaInscrito) throw new Error('Este estudiante ya está inscrito en el curso');
        const res = await inscribirUsuarioCurso(curso.id, { estudianteId, rolEnCurso: 'estudiante' });
        setMensaje(`Inscrito: ${r.nombre}${res?.total != null ? ` (total: ${res.total})` : ''}`);
      } else {
        const docenteId = r.docenteId;
        if (!docenteId) throw new Error('No se encontró la ficha de docente para este usuario');
        const res = await inscribirUsuarioCurso(curso.id, {
          docenteId,
          rolEnCurso: 'docente',
          forzarReemplazo: docenteTitular ? true : false,
        });
        setMensaje(res?.profesor ? `Docente asignado: ${res.profesor}` : `Docente asignado: ${r.nombre}`);
      }
      setBusqueda('');
      setResultados([]);
      setReemplazarDocente(false);
      await cargar();
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

  if (cargando) return <ModuleLayout title="Configuración del curso"><div style={card}>Cargando…</div></ModuleLayout>;
  if (error) {
    return (
      <ModuleLayout title="Configuración del curso">
        <div style={{ ...card, background: '#fff1f3', borderColor: '#f4c2ca', color: '#c1122c' }}>{error}</div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Configuración del curso"
      subtitle={`${curso.codigo} · ${curso.nombre} · Grupo ${curso.grupo}`}
    >
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn" onClick={volver}><Icon name="flecha-izquierda" size={15} /> Volver</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => navigate(`/curso/${curso.id}`)}>Ver curso</button>
            <Badge tone="purple">{curso.programa || '—'}</Badge> <Badge tone="blue">Semestre {curso.semestre ?? '—'}</Badge> <Badge tone={curso.modoAcceso === 'auto' ? 'green' : 'slate'}>{curso.modoAcceso === 'auto' ? 'Autoinscripción' : 'Manual'}</Badge>
          </div>
        </div>

        {mensaje && (
          <div style={{ ...card, padding: 10, background: mensaje.includes('No se pudo') || mensaje.includes('ya está') || mensaje.includes('alcanzó') || mensaje.includes('Falta') ? '#fff1f3' : '#e9f7f1', borderColor: mensaje.includes('No se pudo') || mensaje.includes('ya está') || mensaje.includes('alcanzó') || mensaje.includes('Falta') ? '#f4c2ca' : '#b6e3cf', color: mensaje.includes('No se pudo') || mensaje.includes('ya está') || mensaje.includes('alcanzó') || mensaje.includes('Falta') ? '#c1122c' : '#0a6e4b' }}>
            <span style={{ fontSize: 13 }}>{mensaje}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Configuración del curso</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, gridColumn: '1 / -1' }}>
                Nombre completo del curso
                <input value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} disabled={!esAdmin} />
              </label>
              <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                Nombre corto / Código
                <input value={form.grupo ? `${curso.codigo}_${form.grupo}` : curso.codigo || form.grupo || ''} style={{ ...input, width: '100%', marginTop: 4 }} disabled />
              </label>
              <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                Grupo
                <input value={form.grupo || ''} onChange={(e) => setForm({ ...form, grupo: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} disabled={!esAdmin} />
              </label>
              <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                Semestre
                <input type="number" min={1} value={form.semestre ?? ''} onChange={(e) => setForm({ ...form, semestre: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} disabled={!esAdmin} />
              </label>
              <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                Cupo
                <input type="number" min={0} placeholder="Sin límite" value={form.cupo ?? ''} onChange={(e) => setForm({ ...form, cupo: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, gridColumn: '1 / -1' }}>
                Métodos de matriculación
                <select value={form.modoAcceso} onChange={(e) => setForm({ ...form, modoAcceso: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }}>
                  <option value="manual">Matriculación manual</option>
                  <option value="auto">Auto-matriculación (Estudiante)</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, gridColumn: '1 / -1' }}>
                Docente titular
                <select value={form.docenteId || ''} onChange={(e) => setForm({ ...form, docenteId: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }}>
                  <option value="">Sin asignar</option>
                  {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre}{d.area ? ` · ${d.area}` : ''}</option>)}
                </select>
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn" onClick={guardar} disabled={guardando}>
                  <Icon name="guardar" size={15} /> {guardando ? 'Guardando…' : 'Guardar configuración'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9c988e', marginTop: 10 }}>
              {esDirector ? 'Como director solo puede ajustar cupo, modo de acceso y docente titular.' : 'Desde aquí puede gestionar la configuración del curso.'}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Buscar y matricular</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <input
                placeholder="Buscar por nombre, apellido, correo o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ ...input, flex: '1 1 260px' }}
              />
              <select value={rolEnCurso} onChange={(e) => setRolEnCurso(e.target.value)} style={input}>
                <option value="estudiante">Inscribir como Estudiante</option>
                <option value="docente">Asignar como Docente</option>
              </select>
            </div>
            {docenteTitular && rolEnCurso === 'docente' && (
              <div style={{ fontSize: 12, color: '#6f6b62', marginBottom: 10 }}>
                Docente titular actual: <strong>{docenteTitular.nombre}</strong>. Al asignar otro docente se reemplazará el titular.
              </div>
            )}
            {buscando && <div style={{ fontSize: 12, color: '#9c988e' }}>Buscando…</div>}
            {resultados.length > 0 && (
              <div style={{ border: '1px solid #e5e2da', borderRadius: 10, overflow: 'hidden' }}>
                {resultados.map((r) => (
                  <div key={`${r.usuarioId || r.nombre}-${r.documento || r.correo}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #f0eee9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{r.nombre}</div>
                      <div style={{ fontSize: 11, color: '#9c988e' }}>
                        {r.correo || '—'}{r.documento ? ` · ${r.documento}` : ''}{r.programa ? ` · ${r.programa}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#9c988e' }}>
                        {r.esEstudiante && <span>Estudiante</span>}{r.esEstudiante && r.esDocente ? ' / ' : ''}{r.esDocente && <span>Docente</span>}
                        {r.yaInscrito ? ' · Ya inscrito' : ''}
                      </div>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: '5px 10px', fontSize: 11, background: rolEnCurso === 'docente' ? '#0a84ff' : '#0a6e4b', color: '#fff' }}
                      disabled={inscribiendo === (r.usuarioId || r.nombre) || (rolEnCurso === 'estudiante' && r.yaInscrito)}
                      onClick={() => matricular(r)}
                    >
                      {inscribiendo === (r.usuarioId || r.nombre) ? 'Procesando…' : rolEnCurso === 'docente' ? (docenteTitular && r.docenteId !== docenteTitular.id ? 'Reemplazar docente titular' : 'Asignar como docente') : r.yaInscrito ? 'Ya inscrito' : 'Matricular al curso'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {busqueda.trim().length >= 2 && resultados.length === 0 && !buscando && (
              <div style={{ fontSize: 12, color: '#9c988e' }}>Sin resultados para esa búsqueda.</div>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Usuarios matriculados</div>
              <div style={{ fontSize: 12, color: '#9c988e' }}>Docente y estudiantes en la misma lista. El docente aparece identificado con (D).</div>
            </div>
            <Badge tone="purple">Cupo: {curso.cupo ?? 'Sin límite'} · Inscritos: {inscritos.length}</Badge>
          </div>
          {usuariosMatriculados.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9c988e' }}>No hay usuarios matriculados aún.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Usuario</th>
                    <th style={th}>Nombre</th>
                    <th style={th}>Correo</th>
                    <th style={th}>Documento</th>
                    <th style={th}>Programa</th>
                    <th style={th}>Rol</th>
                    <th style={th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosMatriculados.map((u, idx) => (
                    <tr key={`${u.tipo}-${u.id}-${idx}`}>
                      <td style={td}><code style={{ fontSize: 12 }}>{u.estudianteId || u.docenteId || u.id}</code></td>
                      <td style={td}><strong>{u.nombre} {u.etiqueta ? <span style={{ color: '#06468c' }}>{u.etiqueta}</span> : null}</strong></td>
                      <td style={td}>{u.correo || '—'}</td>
                      <td style={td}>{u.documento || '—'}</td>
                      <td style={td}>{u.programa || '—'}</td>
                      <td style={td}><Badge tone={u.tipo === 'docente' ? 'blue' : 'green'}>{u.tipo === 'docente' ? 'Docente' : 'Estudiante'}</Badge></td>
                      <td style={td}>
                        {u.tipo === 'estudiante' && u.estudianteId ? (
                          <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => retirar({ estudianteId: u.estudianteId, nombre: u.nombre })}>
                            <Icon name="eliminar" size={14} /> Retirar
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#9c988e' }}>Gestionado desde docente titular</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
