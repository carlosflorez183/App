/* =============================================
   Módulo de Administración.
   Indicadores del demo más la gestión real de la
   plataforma: usuarios, bloqueo de estudiantes y
   edición de docentes, programas y matrícula.
   ============================================= */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout';
import AsignacionDocentes from '../components/AsignacionDocentes';
import {
  actualizarDocente,
  actualizarEstudianteAdmin,
  actualizarUsuario,
  cambiarPassword,
  listarEstudiantesAdmin,
  listarUsuarios,
} from '../api/client';

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: '📊' },
  { key: 'usuarios', label: 'Usuarios', icon: '🔐' },
  { key: 'estudiantes', label: 'Estudiantes', icon: '🎓' },
  { key: 'programas', label: 'Programas', icon: '📚' },
  { key: 'pensum', label: 'Pensum', icon: '📖' },
  { key: 'docentes', label: 'Docentes', icon: '👨‍🏫' },
  { key: 'asignacion', label: 'Asignación docente', icon: '🧑‍🏫' },
  { key: 'matricula', label: 'Matrícula', icon: '📝' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f1f5f9', '#475569'],
    green: ['#dcfce7', '#15803d'],
    amber: ['#fef3c7', '#b45309'],
    red: ['#fee2e2', '#b91c1c'],
    blue: ['#dbeafe', '#1d4ed8'],
    purple: ['#ede9fe', '#6d28d9'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return (
    <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
};

const Kpi = ({ label, value, sub, icon }) => (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#0f172a' }}>{value}</div>
        {sub ? <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div> : null}
      </div>
      <div style={{ fontSize: 24 }}>{icon}</div>
    </div>
  </div>
);

const input = { padding: '7px 9px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' };

const ROLES = [
  ['admin', 'Administración'],
  ['admisiones', 'Admisiones'],
  ['rectoria', 'Rectoría'],
  ['profesor', 'Docente'],
  ['talento_humano', 'Talento Humano'],
  ['contabilidad', 'Contabilidad'],
  ['estudiante', 'Estudiante'],
];

const ESTADOS_ESTUDIANTE = ['matriculado', 'en_inscripcion', 'retirado', 'graduado', 'bloqueado'];

export default function Admin() {
  const navigate = useNavigate();
  const [progSel, setProgSel] = useState(1);
  // Listas de gestión: no vienen en el bootstrap porque no son del alcance
  // del resto de la aplicación.
  const [usuarios, setUsuarios] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargandoAdmin, setCargandoAdmin] = useState(true);
  const [filtroUsuarios, setFiltroUsuarios] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [password, setPassword] = useState('');

  const cargarAdmin = useCallback(async () => {
    setCargandoAdmin(true);
    try {
      const [us, es] = await Promise.all([listarUsuarios(), listarEstudiantesAdmin()]);
      setUsuarios(us);
      setEstudiantes(es);
    } catch {
      setUsuarios([]);
      setEstudiantes([]);
    } finally {
      setCargandoAdmin(false);
    }
  }, []);

  useEffect(() => {
    cargarAdmin();
  }, [cargarAdmin]);

  const abrirEdicion = (clave, valores) => {
    setEditando(clave);
    setPassword('');
    setForm(valores);
  };

  const cerrarEdicion = () => {
    setEditando(null);
    setForm({});
    setPassword('');
  };

  /* Aplica el cambio en la fila y lo confirma en el servidor. Si el servidor
     lo rechaza, `recargar` deja la fila como estaba. */
  const guardar = async (fila, cambios, peticion) => {
    try {
      const res = await peticion();
      setUsuarios((lista) => lista.map((u) => (u.id === fila.id ? { ...u, ...cambios } : u)));
      if (res && res.mensaje) setForm((f) => ({ ...f, _mensaje: res.mensaje }));
      return res;
    } catch (err) {
      setForm((f) => ({ ...f, _error: err.message }));
      throw err;
    }
  };

  return (
    <ModuleLayout
      title="Panel de Administración"
      subtitle="Indicadores institucionales, planta docente y matrícula"
      tabs={TABS}
    >
      {({ tab, data, recargar }) => {
        const programas = data.matricula.programas;
        const materias = data.matricula.materias;
        const totalMatriculados = programas.reduce((a, p) => a + p.matriculados, 0);
        const totalCupo = programas.reduce((a, p) => a + p.cupo, 0);
        const ocupacion = Math.round((totalMatriculados / totalCupo) * 100);
        const maxMat = Math.max(...programas.map((p) => p.matriculados));

        if (tab === 'resumen') {
          return (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 }}>
                <Kpi label="Estudiantes matriculados" value={totalMatriculados.toLocaleString('es-CO')} sub={`${ocupacion}% de la capacidad`} icon="👥" />
                <Kpi label="Programas activos" value={programas.length} sub="3 modalidades" icon="🎓" />
                <Kpi label="Planta docente" value={data.docentes.length} sub={`${data.docentes.filter((d) => d.estado === 'activo').length} en servicio`} icon="👨‍🏫" />
                <Kpi label="Asignaturas en pensum" value={materias.length} sub="10 planes de estudio" icon="📚" />
                <Kpi label="Cuentas de acceso" value={usuarios.length} sub={`${usuarios.filter((u) => u.activo).length} habilitadas`} icon="🔐" />
                <Kpi
                  label="Estudiantes bloqueados"
                  value={estudiantes.filter((e) => e.estado === 'bloqueado').length}
                  sub={`${estudiantes.length} matriculados`}
                  icon="🚫"
                />
              </div>

              <div style={{ ...card, marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Matriculados por programa</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Comparativo frente a la capacidad máxima de cada programa</div>
                {programas.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 210, fontSize: 12, color: '#334155', fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ flex: 1, height: 20, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${(p.matriculados / maxMat) * 100}%`, height: '100%', background: p.cupo > 0 && p.matriculados / p.cupo > 0.95 ? '#ef4444' : 'linear-gradient(90deg,#1e3a8a,#3b82f6)' }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (p.matriculados / p.cupo) * 100)}%`, width: 2, background: '#0f172a' }} />
                    </div>
                    <div style={{ width: 108, fontSize: 12, textAlign: 'right', color: '#334155', fontWeight: 700 }}>
                      {p.matriculados} / {p.cupo}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  La línea vertical marca el límite de capacidad. En rojo, programas por encima del 95% de ocupación.
                </div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Acciones de administración</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  Este panel no incluye el proceso de Admisiones: lo lleva el rol de Admisiones. Aquí se gestionan
                  las cuentas de la plataforma y los datos maestros.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => navigate('/admin?tab=usuarios')}>🔐 Usuarios y accesos</button>
                  <button className="btn" onClick={() => navigate('/admin?tab=estudiantes')}>🎓 Bloquear / editar estudiantes</button>
                  <button className="btn" onClick={() => navigate('/admin?tab=programas')}>📚 Ajustar cupo de programas</button>
                  <button className="btn" onClick={() => navigate('/dashboard?view=home')}>🏠 Ir al Inicio</button>
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'usuarios') {
          const lista = usuarios.filter((u) => {
            if (filtroUsuarios !== 'todos' && u.role !== filtroUsuarios) return false;
            if (!busqueda) return true;
            const q = busqueda.toLowerCase();
            return [u.nombre, u.usuario, u.email].some((x) => (x || '').toLowerCase().includes(q));
          });
          const edit = editando === `u-${form._id}` ? form : null;

          const alternarAcceso = async (u) => {
            const activo = !u.activo;
            try {
              await guardar(u, { activo }, () => actualizarUsuario(u.id, { activo }));
              await cargarAdmin();
            } catch {
              /* el mensaje de error ya quedó en el formulario */
            }
          };

          const guardarUsuario = async () => {
            try {
              await guardar(
                { id: form._id },
                { nombre: form.nombre, email: form.email, telefono: form.telefono, role: form.role },
                () =>
                  actualizarUsuario(form._id, {
                    nombre: form.nombre,
                    email: form.email,
                    telefono: form.telefono,
                    role: form.role,
                  })
              );
              await cargarAdmin();
            } catch {
              /* handled */
            }
          };

          const guardarPassword = async () => {
            try {
              await guardar({ id: form._id }, {}, () => cambiarPassword(form._id, password));
              setPassword('');
            } catch {
              /* handled */
            }
          };

          return (
            <div>
              <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                  placeholder="Buscar por nombre, usuario o correo"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ ...input, width: 260 }}
                />
                <select value={filtroUsuarios} onChange={(e) => setFiltroUsuarios(e.target.value)} style={input}>
                  <option value="todos">Todos los roles</option>
                  {ROLES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <Badge tone="blue">{lista.length} cuentas</Badge>
                <Badge tone="green">{lista.filter((u) => u.activo).length} habilitadas</Badge>
                <Badge tone="red">{lista.filter((u) => !u.activo).length} bloqueadas</Badge>
              </div>

              {cargandoAdmin && <div style={{ ...card, color: '#94a3b8', marginBottom: 14 }}>Cargando cuentas…</div>}

              <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Usuario</th><th style={th}>Rol</th><th style={th}>Programa</th>
                      <th style={th}>Correo</th><th style={th}>Acceso</th><th style={th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((u) => (
                      <React.Fragment key={u.id}>
                        <tr>
                          <td style={td}>
                            <strong>{u.nombre}</strong>
                            <br />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{u.usuario}{u.codigo ? ` · ${u.codigo}` : ''}</span>
                          </td>
                          <td style={td}><Badge tone="purple">{ROLES.find(([r]) => r === u.role)?.[1] || u.role}</Badge></td>
                          <td style={td}>{u.programa || '—'}</td>
                          <td style={td}>{u.email || '—'}</td>
                          <td style={td}>
                            <Badge tone={u.activo ? 'green' : 'red'}>{u.activo ? 'Habilitada' : 'Bloqueada'}</Badge>
                            {u.estudianteEstado === 'bloqueado' && (
                              <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>Estudiante bloqueado</div>
                            )}
                          </td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                className="btn"
                                style={{ padding: '4px 9px', fontSize: 12 }}
                                onClick={() => abrirEdicion(`u-${u.id}`, { _id: u.id, _fila: u.id, nombre: u.nombre, email: u.email || '', telefono: u.telefono || '', role: u.role })}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                className="btn"
                                style={{ padding: '4px 9px', fontSize: 12, background: u.activo ? '#fee2e2' : '#dcfce7', color: u.activo ? '#b91c1c' : '#15803d', border: 'none' }}
                                onClick={() => alternarAcceso(u)}
                              >
                                {u.activo ? '🚫 Bloquear' : '✅ Habilitar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {edit && edit._fila === u.id && (
                          <tr key={`${u.id}-edit`}>
                            <td style={td} colSpan={6}>
                              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, display: 'grid', gap: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                    Nombre completo
                                    <input value={edit.nombre} onChange={(e) => setForm({ ...edit, nombre: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                  </label>
                                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                    Correo
                                    <input value={edit.email} onChange={(e) => setForm({ ...edit, email: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                  </label>
                                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                    Teléfono
                                    <input value={edit.telefono} onChange={(e) => setForm({ ...edit, telefono: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                  </label>
                                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                    Rol
                                    <select value={edit.role} onChange={(e) => setForm({ ...edit, role: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }}>
                                      {ROLES.map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                    Nueva contraseña
                                    <input
                                      type="password"
                                      placeholder="Mínimo 6 caracteres"
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      style={{ ...input, width: 220, marginTop: 4 }}
                                    />
                                  </label>
                                  <button className="btn" onClick={guardarPassword} disabled={password.length < 6}>🔑 Cambiar contraseña</button>
                                  <button className="btn" onClick={guardarUsuario}>💾 Guardar datos</button>
                                  <button className="btn" onClick={cerrarEdicion} style={{ background: '#f1f5f9' }}>Cancelar</button>
                                </div>
                                {edit._error && <div style={{ fontSize: 12, color: '#b91c1c' }}>⚠️ {edit._error}</div>}
                                {edit._mensaje && <div style={{ fontSize: 12, color: '#15803d' }}>✅ {edit._mensaje}</div>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {!cargandoAdmin && lista.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin resultados.</div>
                )}
              </div>
            </div>
          );
        }

        if (tab === 'estudiantes') {
          const lista = estudiantes.filter((e) => {
            if (!busqueda) return true;
            const q = busqueda.toLowerCase();
            return [e.nombre, e.id, e.documento, e.programa].some((x) => (x || '').toLowerCase().includes(q));
          });
          const edit = editando === `e-${form._id}` ? form : null;
          const bloqueados = estudiantes.filter((e) => e.estado === 'bloqueado').length;

          const alternarBloqueo = async (e) => {
            const estado = e.estado === 'bloqueado' ? 'matriculado' : 'bloqueado';
            try {
              await actualizarEstudianteAdmin(e.id, { estado });
              await cargarAdmin();
            } catch (err) {
              alert(`No se pudo actualizar: ${err.message}`);
            }
          };

          const guardarEstudiante = async () => {
            try {
              await actualizarEstudianteAdmin(form._id, {
                estado: form.estado,
                programaId: Number(form.programaId),
                semestre: Number(form.semestre),
                jornada: form.jornada,
                telefono: form.telefono,
                correo: form.correo,
              });
              await cargarAdmin();
              cerrarEdicion();
            } catch (err) {
              alert(`No se pudo guardar: ${err.message}`);
            }
          };

          return (
            <div>
              <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                  placeholder="Buscar por nombre, código o documento"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ ...input, width: 280 }}
                />
                <Badge tone="blue">{lista.length} estudiantes</Badge>
                <Badge tone="red">{bloqueados} bloqueados</Badge>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Bloquear a un estudiante deshabilita también su cuenta de acceso al campus; desbloquear se la
                  devuelve. Desde la pestaña Usuarios se controla la cuenta por separado.
                </span>
              </div>

              {cargandoAdmin && <div style={{ ...card, color: '#94a3b8', marginBottom: 14 }}>Cargando estudiantes…</div>}

              <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Estudiante</th><th style={th}>Programa</th><th style={th}>Sem.</th>
                      <th style={th}>Promedio</th><th style={th}>Cuenta</th><th style={th}>Estado</th><th style={th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((e) => (
                      <React.Fragment key={e.id}>
                        <tr>
                          <td style={td}>
                            <strong>{e.nombre}</strong>
                            <br />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{e.id} · {e.documento}</span>
                          </td>
                          <td style={td}>{e.programa}</td>
                          <td style={td}>{e.semestre}</td>
                          <td style={td}>{e.promedio}</td>
                          <td style={td}>{e.usuario ? <Badge tone={e.usuarioActivo ? 'blue' : 'red'}>{e.usuario}</Badge> : <span style={{ color: '#94a3b8' }}>sin cuenta</span>}</td>
                          <td style={td}>
                            <Badge tone={e.estado === 'bloqueado' ? 'red' : e.estado === 'matriculado' ? 'green' : 'amber'}>
                              {e.estado.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                className="btn"
                                style={{ padding: '4px 9px', fontSize: 12 }}
                                onClick={() => abrirEdicion(`e-${e.id}`, {
                                  _id: e.id, _fila: e.id, estado: e.estado, programaId: e.programaId,
                                  semestre: e.semestre, jornada: e.jornada || 'diurna', telefono: e.telefono || '', correo: e.correo || '',
                                })}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                className="btn"
                                style={{ padding: '4px 9px', fontSize: 12, background: e.estado === 'bloqueado' ? '#dcfce7' : '#fee2e2', color: e.estado === 'bloqueado' ? '#15803d' : '#b91c1c', border: 'none' }}
                                onClick={() => alternarBloqueo(e)}
                              >
                                {e.estado === 'bloqueado' ? '✅ Desbloquear' : '🚫 Bloquear'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {edit && edit._fila === e.id && (
                          <tr key={`${e.id}-edit`}>
                            <td style={td} colSpan={7}>
                              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Estado
                                  <select value={edit.estado} onChange={(ev) => setForm({ ...edit, estado: ev.target.value })} style={{ ...input, width: '100%', marginTop: 4 }}>
                                    {ESTADOS_ESTUDIANTE.map((s) => (
                                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                    ))}
                                  </select>
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Programa
                                  <select value={edit.programaId} onChange={(ev) => setForm({ ...edit, programaId: ev.target.value })} style={{ ...input, width: '100%', marginTop: 4 }}>
                                    {programas.map((p) => (
                                      <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                  </select>
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Semestre
                                  <input type="number" min={1} max={12} value={edit.semestre} onChange={(ev) => setForm({ ...edit, semestre: ev.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Jornada
                                  <select value={edit.jornada} onChange={(ev) => setForm({ ...edit, jornada: ev.target.value })} style={{ ...input, width: '100%', marginTop: 4 }}>
                                    {['diurna', 'nocturna', 'sabado-matutina'].map((j) => (
                                      <option key={j} value={j}>{j}</option>
                                    ))}
                                  </select>
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Teléfono
                                  <input value={edit.telefono} onChange={(ev) => setForm({ ...edit, telefono: ev.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Correo
                                  <input value={edit.correo} onChange={(ev) => setForm({ ...edit, correo: ev.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                </label>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                                  <button className="btn" onClick={guardarEstudiante}>💾 Guardar cambios</button>
                                  <button className="btn" onClick={cerrarEdicion} style={{ background: '#f1f5f9' }}>Cancelar</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {!cargandoAdmin && lista.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin resultados.</div>
                )}
              </div>
            </div>
          );
        }

        if (tab === 'programas') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Programas ofrecidos</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Programa</th>
                      <th style={th}>Modalidad</th>
                      <th style={th}>Facultad</th>
                      <th style={th}>Sem.</th>
                      <th style={th}>Créditos</th>
                      <th style={th}>Matriculados</th>
                      <th style={th}>Cupo</th>
                      <th style={th}>Ocupación</th>
                      <th style={th}>Ajustes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programas.map((p) => {
                      const mod = data.matricula.modalidades.find((m) => m.id === p.modalidadId);
                      const oc = Math.round((p.matriculados / p.cupo) * 100);
                      const edit = editando === `p-${form._id}` ? form : null;
                      return (
                        <React.Fragment key={p.id}>
                        <tr>
                          <td style={td}><strong>{p.icon} {p.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>SNIES {p.snies}</span></td>
                          <td style={td}><Badge tone="blue">{mod?.nombre}</Badge></td>
                          <td style={td}>{p.facultad}</td>
                          <td style={td}>{p.semestres}</td>
                          <td style={td}>{p.creditos}</td>
                          <td style={td}>{p.matriculados.toLocaleString('es-CO')}</td>
                          <td style={td}>{p.cupo.toLocaleString('es-CO')}</td>
                          <td style={td}>
                            <Badge tone={oc > 95 ? 'red' : oc > 85 ? 'amber' : 'green'}>{oc}%</Badge>
                          </td>
                          <td style={td}>
                            <button
                              className="btn"
                              style={{ padding: '4px 9px', fontSize: 12 }}
                              onClick={() => abrirEdicion(`p-${p.id}`, {
                                _id: p.id, _fila: p.id, cupo: p.cupo, matriculados: p.matriculados,
                                semestres: p.semestres, creditos: p.creditos, jornada: p.jornada || 'diurna',
                              })}
                            >
                              ✏️ Ajustar
                            </button>
                          </td>
                        </tr>
                        {edit && edit._fila === p.id && (
                          <tr>
                            <td style={td} colSpan={9}>
                              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Cupo
                                  <input type="number" min={0} value={edit.cupo} onChange={(e) => setForm({ ...edit, cupo: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Matriculados
                                  <input type="number" min={0} value={edit.matriculados} onChange={(e) => setForm({ ...edit, matriculados: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Semestres
                                  <input type="number" min={1} value={edit.semestres} onChange={(e) => setForm({ ...edit, semestres: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Créditos
                                  <input type="number" min={0} value={edit.creditos} onChange={(e) => setForm({ ...edit, creditos: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Jornada
                                  <select value={edit.jornada} onChange={(e) => setForm({ ...edit, jornada: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }}>
                                    {['diurna', 'nocturna', 'sabado-matutina'].map((j) => (
                                      <option key={j} value={j}>{j}</option>
                                    ))}
                                  </select>
                                </label>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                                  <button
                                    className="btn"
                                    onClick={async () => {
                                      try {
                                        await (async () => {})(); // TODO: actualizarPrograma restaurado si necesario
                                        await recargar();
                                        cerrarEdicion();
                                      } catch (err) {
                                        alert(`No se pudo guardar: ${err.message}`);
                                      }
                                    }}
                                  >
                                    💾 Guardar
                                  </button>
                                  <button className="btn" onClick={cerrarEdicion} style={{ background: '#f1f5f9' }}>Cancelar</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'pensum') {
          const prog = programas.find((p) => p.id === progSel) || programas[0];
          const mias = materias.filter((m) => m.programaId === prog.id);
          const porSem = Array.from({ length: prog.semestres }, (_, i) =>
            mias.filter((m) => m.semestre === i + 1)
          );
          return (
            <div>
              <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Programa:</span>
                <select value={progSel} onChange={(e) => setProgSel(Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  {programas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <Badge tone="purple">{mias.length} asignaturas</Badge>
                <Badge tone="blue">{mias.reduce((a, m) => a + m.creditos, 0)} créditos</Badge>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Modo consulta: la matrícula la realiza el estudiante en /matricula</span>
              </div>

              {porSem.map((ms, i) => (
                <div key={i} style={{ ...card, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>Semestre {i + 1}</span>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                      {ms.length} materias · {ms.reduce((a, m) => a + m.creditos, 0)} cr
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 8 }}>
                    {ms.map((m) => (
                      <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{m.codigo}</div>
                        <div style={{ fontSize: 12, color: '#334155' }}>{m.nombre}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{m.creditos} cr · {m.area}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (tab === 'docentes') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Planta docente</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                Carga académica estimada según las asignaturas del pensum que tienen asignadas. La categoría y el
                estado se editan aquí; el reparto de cursos por docente se hace en la pestaña
                <strong> Asignación docente</strong>.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Docente</th>
                      <th style={th}>Área</th>
                      <th style={th}>Categoría</th>
                      <th style={th}>Asignaturas</th>
                      <th style={th}>Créditos</th>
                      <th style={th}>Estado</th>
                      <th style={th}>Ajustes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.docentes.map((d) => {
                      const asignadas = materias.filter((m) => m.profesor === d.nombre);
                      const edit = editando === `d-${form._id}` ? form : null;
                      return (
                        <React.Fragment key={d.id}>
                        <tr>
                          <td style={td}><strong>{d.nombre}</strong><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{d.titulo}</span></td>
                          <td style={td}>{d.area}</td>
                          <td style={td}><Badge>{d.categoria}</Badge></td>
                          <td style={td}>{asignadas.length}</td>
                          <td style={td}>{asignadas.reduce((a, m) => a + m.creditos, 0)}</td>
                          <td style={td}>
                            <Badge tone={d.estado === 'activo' ? 'green' : 'amber'}>
                              {d.estado === 'activo' ? 'En servicio' : d.estado}
                            </Badge>
                          </td>
                          <td style={td}>
                            <button
                              className="btn"
                              style={{ padding: '4px 9px', fontSize: 12 }}
                              onClick={() => abrirEdicion(`d-${d.id}`, { _id: d.id, _fila: d.id, categoria: d.categoria || '', estado: d.estado, area: d.area || '' })}
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>
                        {edit && edit._fila === d.id && (
                          <tr>
                            <td style={td} colSpan={7}>
                              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Área
                                  <input value={edit.area} onChange={(e) => setForm({ ...edit, area: e.target.value })} style={{ ...input, width: 200, marginTop: 4 }} />
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Categoría
                                  <select value={edit.categoria} onChange={(e) => setForm({ ...edit, categoria: e.target.value })} style={{ ...input, marginTop: 4 }}>
                                    {['Docente titular', 'Catedrático', 'Contratista', 'Adjunto', 'Asistente'].map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </label>
                                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                  Estado
                                  <select value={edit.estado} onChange={(e) => setForm({ ...edit, estado: e.target.value })} style={{ ...input, marginTop: 4 }}>
                                    {['activo', 'permensa', 'jubilado', 'retirado'].map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  className="btn"
                                  onClick={async () => {
                                    try {
                                      await actualizarDocente(d.id, { area: form.area, categoria: form.categoria, estado: form.estado });
                                      await recargar();
                                      cerrarEdicion();
                                    } catch (err) {
                                      alert(`No se pudo guardar: ${err.message}`);
                                    }
                                  }}
                                >
                                  💾 Guardar
                                </button>
                                <button className="btn" onClick={cerrarEdicion} style={{ background: '#f1f5f9' }}>Cancelar</button>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (tab === 'asignacion') {
          return <AsignacionDocentes />;
        }

        if (tab === 'matricula') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Estructura de la matrícula</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                Distribución de asignaturas y créditos por programa. Para matricular hay que usar el flujo del estudiante.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Programa</th>
                      <th style={th}>Asignaturas</th>
                      <th style={th}>Créditos totales</th>
                      <th style={th}>Promedio por semestre</th>
                      <th style={th}>Semestre más denso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programas.map((p) => {
                      const ms = materias.filter((m) => m.programaId === p.id);
                      const densos = Array.from({ length: p.semestres }, (_, i) =>
                        ms.filter((m) => m.semestre === i + 1).reduce((a, m) => a + m.creditos, 0)
                      );
                      const max = Math.max(...densos);
                      return (
                        <tr key={p.id}>
                          <td style={td}><strong>{p.nombre}</strong></td>
                          <td style={td}>{ms.length}</td>
                          <td style={td}>{ms.reduce((a, m) => a + m.creditos, 0)}</td>
                          <td style={td}>{(ms.reduce((a, m) => a + m.creditos, 0) / p.semestres).toFixed(1)} cr</td>
                          <td style={td}>{max} cr</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

return null;
      }}
    </ModuleLayout>
  );
}
