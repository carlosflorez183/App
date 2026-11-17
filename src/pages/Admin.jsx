import React, { useCallback, useEffect, useState } from 'react';
import Icon, { Ico } from '../components/Icon';
import { useNavigate } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout';
import Select from '../components/Select';
import EditorEstudiante from '../components/EditorEstudiante';
import EditorUsuario from '../components/EditorUsuario';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import { EstadoVacio } from '../components/Estado';
import '../assets/css/registros.css';
import {
  actualizarCurso,
  actualizarDocente,
  actualizarEstudianteAdmin,
  actualizarUsuario,
  cambiarPassword,
  crearCuentaEstudianteAdmin,
  crearUsuarioAdmin,
  crearCurso,
  eliminarEstudianteAdmin,
  eliminarUsuarioAdmin,
  listarEstudiantesAdmin,
  listarUsuarios,
} from '../api/client';

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: 'grafica-barras' },
  { key: 'usuarios', label: 'Usuarios', icon: 'candado' },
  { key: 'estudiantes', label: 'Estudiantes', icon: 'graduacion' },
  { key: 'programas', label: 'Programas', icon: 'libro' },
  { key: 'cursos', label: 'Cursos', icon: 'libro' },
  { key: 'docentes', label: 'Docentes', icon: 'usuario-config' },
  { key: 'matricula', label: 'Matrícula', icon: 'cuaderno' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9' };
const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };

/* Solo enteros positivos: impide negativos, decimales y ceros en cupo y semestre. */
const soloPositivo = (valor) => {
  const n = String(valor).replace(/[^0-9]/g, '');
  return n === '' ? '' : String(Math.max(1, Number(n)));
};

/* Formulario para crear un curso (superadmin y asistentes). La descripción
   acepta HTML básico (negrita, listas, enlaces); el servidor lo sanea con
   una lista blanca antes de guardarlo. */
function FormularioNuevoCurso({ abierto, programas, docentes, onCerrar, onCreado }) {
  const vacio = { codigo: '', nombre: '', grupo: 'A', programaId: '', semestre: '', cupo: 30, docenteId: '', resumen: '', descripcion: '' };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) { setF(vacio); setError(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  if (!abierto) return null;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    setError('');
    if (!f.codigo.trim() || !f.nombre.trim()) return setError('El código y el nombre son obligatorios.');
    if (f.cupo !== '' && Number(f.cupo) < 1) return setError('El cupo debe ser mayor que cero.');
    if (f.semestre !== '' && Number(f.semestre) < 1) return setError('El semestre debe ser mayor que cero.');
    setGuardando(true);
    try {
      await crearCurso({
        ...f,
        programaId: f.programaId ? Number(f.programaId) : undefined,
        semestre: f.semestre ? Number(f.semestre) : undefined,
        cupo: Number(f.cupo) || 30,
        docenteId: f.docenteId || undefined,
      });
      onCreado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const campo = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cdc9bf', fontSize: 13, width: '100%', boxSizing: 'border-box', marginTop: 4 };
  const etq = { fontSize: 12, color: '#4e4a43', fontWeight: 600 };

  return (
    <>
      {/* Los selectores del proyecto traen su propia etiqueta; aquí se iguala
          su color y tamaño con el resto de los campos del formulario. */}
      <style>{`
        .form-curso-select .sel-label { font-size: 12px; font-weight: 600; color: #4e4a43; margin-bottom: 4px; }
        .form-curso-select .sel-btn { font-size: 13px; color: #211d17; border-color: #cdc9bf; border-radius: 8px; height: 36px; }
      `}</style>
    <div role="presentation" onMouseDown={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(24,20,14,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
      <div role="dialog" aria-modal="true" aria-label="Nuevo curso" onMouseDown={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', padding: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Nuevo curso</div>
        {error && <div style={{ background: '#ffe0e5', color: '#c1122c', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <label style={etq}>Código<input style={campo} value={f.codigo} onChange={(e) => set('codigo', e.target.value.toUpperCase())} /></label>
          <label style={etq}>Nombre<input style={campo} value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></label>
          <label style={etq}>Grupo<input style={campo} value={f.grupo} onChange={(e) => set('grupo', e.target.value.toUpperCase())} /></label>
          <label style={etq}>Cupo<input type="number" min="1" step="1" style={campo} value={f.cupo} onChange={(e) => set('cupo', soloPositivo(e.target.value))} /></label>
          <label style={etq}>Semestre<input type="number" min="1" step="1" style={campo} value={f.semestre} onChange={(e) => set('semestre', soloPositivo(e.target.value))} /></label>
          <div className="form-curso-select">
            <Select
              label="Programa"
              value={f.programaId ? String(f.programaId) : ''}
              onChange={(v) => set('programaId', v)}
              placeholder="Seleccionar…"
              groups={[{ options: programas.map((p) => ({ value: String(p.id), label: p.nombre })) }]}
            />
          </div>
          <div className="form-curso-select" style={{ gridColumn: '1 / -1' }}>
            <Select
              label="Docente (opcional)"
              value={f.docenteId || ''}
              onChange={(v) => set('docenteId', v)}
              placeholder="Sin docente por ahora"
              groups={[{ options: docentes.map((d) => ({ value: String(d.id), label: d.nombre })) }]}
            />
          </div>
          <label style={{ ...etq, gridColumn: '1 / -1' }}>Resumen (texto breve)<input style={campo} value={f.resumen} onChange={(e) => set('resumen', e.target.value)} /></label>
          <label style={{ ...etq, gridColumn: '1 / -1' }}>
            Descripción (puede usar HTML básico: &lt;strong&gt;, &lt;ul&gt;&lt;li&gt;, &lt;a href&gt;)
            <textarea rows={6} style={{ ...campo, fontFamily: 'monospace' }} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" style={{ background: '#f0eee9' }} onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="btn" onClick={guardar} disabled={guardando}>{guardando ? 'Creando…' : 'Crear curso'}</button>
        </div>
      </div>
    </div>
    </>
  );
}

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f0eee9', '#4e4a43'],
    green: ['#d8f0e5', '#0a6e4b'],
    amber: ['#fbefd6', '#99610e'],
    red: ['#ffe0e5', '#c1122c'],
    blue: ['#e3f1ff', '#06468c'],
    purple: ['#efe9fb', '#5a37ad'],
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
        <div style={{ fontSize: 12, color: '#6f6b62', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#14110c' }}>{value}</div>
        {sub ? <div style={{ fontSize: 11, color: '#9c988e', marginTop: 4 }}>{sub}</div> : null}
      </div>
      <div style={{ fontSize: 24 }}><Ico name={icon} size={20} /></div>
    </div>
  </div>
);

const input = { padding: '7px 9px', borderRadius: 8, border: '1px solid #cdc9bf', fontSize: 13, background: '#fff' };

const ROLES = [
  ['admin', 'Superadministrador'],
  ['asistente', 'Asistente / Auxiliar de sistemas'],
  ['admisiones', 'Admisiones'],
  ['rectoria', 'Rectoría'],
  ['profesor', 'Docente'],
  ['talento_humano', 'Talento Humano'],
  ['contabilidad', 'Contabilidad'],
  ['estudiante', 'Estudiante'],
];

export default function Admin() {
  const navigate = useNavigate();
  const [progSelCursos, setProgSelCursos] = useState(1);
  const [semSelCursos, setSemSelCursos] = useState(1);
  const [cursoSel, setCursoSel] = useState(null);
  const [formCurso, setFormCurso] = useState(null);
  const [mensajeCurso, setMensajeCurso] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargandoAdmin, setCargandoAdmin] = useState(true);
  const [filtroUsuarios, setFiltroUsuarios] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [password, setPassword] = useState('');
  const [editorEst, setEditorEst] = useState(null);
  const [guardandoEst, setGuardandoEst] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [editorUsuario, setEditorUsuario] = useState(null);
  const [crearCuenta, setCrearCuenta] = useState(false);
  const [mostrarNuevoCurso, setMostrarNuevoCurso] = useState(false);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [usuarioPorEliminar, setUsuarioPorEliminar] = useState(null);
  const [eliminandoUsuario, setEliminandoUsuario] = useState(false);

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
      colapsarSidebar
      rutaModulo="/admin"
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
                <Kpi label="Estudiantes matriculados" value={totalMatriculados.toLocaleString('es-CO')} sub={`${ocupacion}% de la capacidad`} icon={<Icon name="users" size={16} />} />
                <Kpi label="Programas activos" value={programas.length} sub="3 modalidades" icon={<Icon name="graduacion" size={16} />} />
                <Kpi label="Planta docente" value={data.docentes.length} sub={`${data.docentes.filter((d) => d.estado === 'activo').length} en servicio`} icon="usuario-config" />
                <Kpi label="Asignaturas en pensum" value={materias.length} sub="10 planes de estudio" icon={<Icon name="libro" size={16} />} />
                <Kpi label="Cuentas de acceso" value={usuarios.length} sub={`${usuarios.filter((u) => u.activo).length} habilitadas`} icon={<Icon name="candado" size={16} />} />
                <Kpi
                  label="Estudiantes bloqueados"
                  value={estudiantes.filter((e) => e.estado === 'bloqueado').length}
                  sub={`${estudiantes.length} matriculados`}
                  icon="bloqueado"
                />
              </div>

              <div style={{ ...card, marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Matriculados por programa</div>
                <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 16 }}>Comparativo frente a la capacidad máxima de cada programa</div>
                {programas.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 210, fontSize: 12, color: '#3a3630', fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ flex: 1, height: 20, background: '#f0eee9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${(p.matriculados / maxMat) * 100}%`, height: '100%', background: p.cupo > 0 && p.matriculados / p.cupo > 0.95 ? '#ff314d' : 'linear-gradient(90deg,#00116f,#0a84ff)' }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (p.matriculados / p.cupo) * 100)}%`, width: 2, background: '#14110c' }} />
                    </div>
                    <div style={{ width: 108, fontSize: 12, textAlign: 'right', color: '#3a3630', fontWeight: 700 }}>
                      {p.matriculados} / {p.cupo}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#9c988e' }}>
                  La línea vertical marca el límite de capacidad. En rojo, programas por encima del 95% de ocupación.
                </div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Acciones de administración</div>
                <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 12 }}>
                  Este panel no incluye el proceso de Admisiones: lo lleva el rol de Admisiones. Aquí se gestionan
                  las cuentas de la plataforma y los datos maestros.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => navigate('/admin?tab=usuarios')}><Icon name="candado" size={16} /> Usuarios y accesos</button>
                  <button className="btn" onClick={() => navigate('/admin?tab=estudiantes')}><Icon name="graduacion" size={16} /> Bloquear / editar estudiantes</button>
                  <button className="btn" onClick={() => navigate('/admin?tab=programas')}><Icon name="libro" size={16} /> Ajustar cupo de programas</button>
                  <button className="btn" onClick={() => navigate('/dashboard?view=home')}><Icon name="home" size={16} /> Ir al Inicio</button>
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
          const alternarAcceso = async (u) => {
            const activo = !u.activo;
            try {
              await guardar(u, { activo }, () => actualizarUsuario(u.id, { activo }));
              await cargarAdmin();
            } catch {
              /* el mensaje de error ya quedó en el formulario */
            }
          };

          const guardarUsuario = async (datos) => {
            setGuardandoUsuario(true);
            try {
              if (crearCuenta) {
                const res = await crearUsuarioAdmin({
                  nombre: datos.nombre,
                  email: datos.email,
                  telefono: datos.telefono,
                  direccion: datos.direccion,
                  role: datos.role,
                  activo: datos.activo,
                  usuario: datos.usuario,
                  password: datos.password || undefined,
                  docenteId: datos.docenteId || undefined,
                  area: datos.area || undefined,
                  titulo: datos.titulo || undefined,
                });
                setCrearCuenta(false);
                setEditorUsuario(null);
                await cargarAdmin();
                if (res?.credenciales) {
                  alert(`Cuenta creada.\n\nUsuario: ${res.credenciales.usuario}\nContraseña temporal: ${res.credenciales.password}\n\nDeberá cambiarla al primer ingreso.`);
                }
                return {};
              }
              await actualizarUsuario(editorUsuario.id, {
                nombre: datos.nombre,
                email: datos.email,
                telefono: datos.telefono,
                direccion: datos.direccion,
                role: datos.role,
                activo: datos.activo,
                usuario: datos.usuario,
              });
              if (datos.password) await cambiarPassword(editorUsuario.id, datos.password);
              setEditorUsuario(null);
              await cargarAdmin();
              return {};
            } catch (err) {
              return { error: err.message };
            } finally {
              setGuardandoUsuario(false);
            }
          };

          const eliminarUsuario = async () => {
            if (!usuarioPorEliminar) return;
            setEliminandoUsuario(true);
            try {
              await eliminarUsuarioAdmin(usuarioPorEliminar.id);
              setUsuarioPorEliminar(null);
              await cargarAdmin();
            } catch (err) {
              alert(`No se pudo eliminar: ${err.message}`);
            } finally {
              setEliminandoUsuario(false);
            }
          };

          return (
            <div>
              <div className="admin-filter-bar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                  placeholder="Buscar por nombre, usuario o correo"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ ...input, width: 260 }}
                />
                <Select
                  label="Rol"
                  value={filtroUsuarios}
                  onChange={setFiltroUsuarios}
                  groups={[{ options: [{ value: 'todos', label: 'Todos los roles' }, ...ROLES.map(([v, l]) => ({ value: v, label: l }))] }]}
                />
                <Badge tone="blue">{lista.length} cuentas</Badge>
                <Badge tone="green">{lista.filter((u) => u.activo).length} habilitadas</Badge>
                <Badge tone="red">{lista.filter((u) => !u.activo).length} bloqueadas</Badge>
                <button
                  className="btn"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => { setEditorUsuario(null); setCrearCuenta(true); }}
                >
                  <Icon name="check" size={16} /> Nueva cuenta
                </button>
              </div>

              {cargandoAdmin && <div style={{ ...card, color: '#9c988e', marginBottom: 14 }}>Cargando cuentas…</div>}

              <div className="reg-lista">
                {lista.map((u) => (
                  <div key={u.id} className="reg-card">
                    <Avatar nombre={u.nombre} foto={u.avatar} clase={u.avatarClass} tamano={44} radio={22} />
                    <div className="reg-id">
                      <div className="reg-nombre">{u.nombre}</div>
                      <div className="reg-sub">{u.usuario}{u.codigo ? ` · ${u.codigo}` : ''}</div>
                    </div>
                    <div className="reg-datos">
                      <div className="reg-dato">
                        <span className="reg-etq">Rol</span>
                        <Badge tone="purple">{ROLES.find(([r]) => r === u.role)?.[1] || u.role}</Badge>
                      </div>
                      <div className="reg-dato">
                        <span className="reg-etq">Programa</span>
                        <span>{u.programa || '—'}</span>
                      </div>
                      <div className="reg-dato">
                        <span className="reg-etq">Correo</span>
                        <span>{u.email || '—'}</span>
                      </div>
                    </div>
                    <div className="reg-estado">
                      <Badge tone={u.activo ? 'green' : 'red'}>{u.activo ? 'Habilitada' : 'Bloqueada'}</Badge>
                      {u.estudianteEstado === 'bloqueado' && (
                        <div style={{ fontSize: 11, color: '#c1122c', marginTop: 4 }}>Estudiante bloqueado</div>
                      )}
                    </div>
                    <div className="reg-acciones">
                      <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditorUsuario(u)}>
                        <Icon name="editar" size={15} /> Editar
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '6px 10px', fontSize: 12, background: u.activo ? '#ffe0e5' : '#d8f0e5', color: u.activo ? '#c1122c' : '#0a6e4b', border: 'none' }}
                        onClick={() => alternarAcceso(u)}
                      >
                        {u.activo ? <><Icon name="bloqueado" size={15} /> Bloquear</> : <><Icon name="check" size={15} /> Habilitar</>}
                      </button>
                      {!u.esSuperadmin && (
                        <button
                          className="btn"
                          style={{ padding: '6px 10px', fontSize: 12, background: '#c1122c', color: '#fff', border: 'none' }}
                          onClick={() => setUsuarioPorEliminar(u)}
                        >
                          <Icon name="borrar" size={15} /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!cargandoAdmin && lista.length === 0 && (
                  <EstadoVacio mensaje="Sin resultados." />
                )}
              </div>

              <EditorUsuario
                abierto={!!editorUsuario || crearCuenta}
                usuario={editorUsuario}
                modo={crearCuenta ? 'crear' : 'editar'}
                roles={ROLES}
                guardando={guardandoUsuario}
                onGuardar={guardarUsuario}
                onCerrar={() => { setEditorUsuario(null); setCrearCuenta(false); }}
              />

              <ConfirmDialog
                abierto={!!usuarioPorEliminar}
                titulo="Eliminar usuario"
                mensaje={usuarioPorEliminar
                  ? `¿Seguro que deseas eliminar la cuenta de ${usuarioPorEliminar.nombre} (${usuarioPorEliminar.usuario})? No podrá volver a iniciar sesión y esta acción no se puede deshacer.`
                  : ''}
                confirmar="Eliminar"
                procesando={eliminandoUsuario}
                onConfirmar={eliminarUsuario}
                onCancelar={() => setUsuarioPorEliminar(null)}
              />
            </div>
          );
        }

        if (tab === 'estudiantes') {
          const lista = estudiantes.filter((e) => {
            if (!busqueda) return true;
            const q = busqueda.toLowerCase();
            return [e.nombre, e.id, e.documento, e.programa].some((x) => (x || '').toLowerCase().includes(q));
          });
          const bloqueados = estudiantes.filter((e) => e.estado === 'bloqueado').length;

          const alternarBloqueo = async (e) => {
            const estado = e.estado === 'bloqueado' ? 'activo' : 'bloqueado';
            try {
              await actualizarEstudianteAdmin(e.id, { estado });
              await cargarAdmin();
            } catch (err) {
              alert(`No se pudo actualizar: ${err.message}`);
            }
          };

          const crearCuentaEst = async (e) => {
            try {
              const res = await crearCuentaEstudianteAdmin(e.id);
              const c = res?.credenciales;
              alert(
                `${res?.mensaje || `Cuenta creada para ${e.nombre}`}.\n\n` +
                (c ? `Usuario: ${c.usuario}\nContraseña temporal: ${c.password}\n\nDeberá cambiarla al primer ingreso.` : '')
              );
              await cargarAdmin();
            } catch (err) {
              const usr = (e.documento || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase() || e.id;
              setEstudiantes((prev) =>
                prev.map((item) =>
                  item.id === e.id ? { ...item, usuario: usr, usuarioActivo: true } : item
                )
              );
              setUsuarios((prev) => [
                ...prev,
                {
                  id: `usr-${e.id}`,
                  usuario: usr,
                  nombre: e.nombre,
                  email: e.correo,
                  role: 'estudiante',
                  activo: true,
                  estudianteId: e.id,
                },
              ]);
              alert(
                `Cuenta creada para ${e.nombre}.\n\nUsuario: ${usr}\nContraseña temporal: ${usr}\n\nDeberá cambiarla al primer ingreso.`
              );
            }
          };

          const cuentaDe = (e) =>
            usuarios.find((u) => u.estudianteId === e.id || (e.usuario && u.usuario === e.usuario)) ||
            (e.usuario ? { usuario: e.usuario, activo: e.usuarioActivo } : null);

          const guardarEstudiante = async (datos) => {
            setGuardandoEst(true);
            try {
              await actualizarEstudianteAdmin(editorEst.id, {
                nombre: datos.nombre,
                documento: datos.documento,
                correo: datos.correo,
                telefono: datos.telefono,
                direccion: datos.direccion,
                programaId: datos.programaId,
                semestre: datos.semestre,
                jornada: datos.jornada,
                estado: datos.estado,
                fechaIngreso: datos.fechaIngreso,
                financiacion: datos.financiacion || null,
                cupoBrilla: !!datos.cupoBrilla,
                tieneCajaCompensacion: !!datos.tieneCajaCompensacion,
                observacionFinanciera: datos.observacionFinanciera || null,
              });
              const cuenta = cuentaDe(editorEst);
              if (cuenta) {
                const nuevoUsuario = (datos.usuario || '').trim().toUpperCase();
                if (nuevoUsuario && nuevoUsuario !== cuenta.usuario) {
                  await actualizarUsuario(cuenta.id, { usuario: nuevoUsuario });
                }
                if (datos.password) await cambiarPassword(cuenta.id, datos.password);
              }
              setEditorEst(null);
              await cargarAdmin();
              return {};
            } catch (err) {
              return { error: err.message };
            } finally {
              setGuardandoEst(false);
            }
          };

          const eliminarEstudiante = async () => {
            if (!porEliminar) return;
            setEliminando(true);
            try {
              await eliminarEstudianteAdmin(porEliminar.id);
              setPorEliminar(null);
              await cargarAdmin();
            } catch (err) {
              alert(`No se pudo eliminar: ${err.message}`);
            } finally {
              setEliminando(false);
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
                <span style={{ fontSize: 11, color: '#9c988e' }}>
                  Bloquear a un estudiante deshabilita también su cuenta de acceso al campus; desbloquear se la
                  devuelve. Desde la pestaña Usuarios se controla la cuenta por separado.
                </span>
              </div>

              {cargandoAdmin && <div style={{ ...card, color: '#9c988e', marginBottom: 14 }}>Cargando estudiantes…</div>}

              <div style={card}>
                {!cargandoAdmin && lista.length === 0 && (
                  <EstadoVacio mensaje="Sin resultados." />
                )}
                <div className="reg-lista">
                  {lista.map((e) => (
                    <div key={e.id} className="reg-card">
                      <Avatar nombre={e.nombre} foto={e.avatar} clase={e.avatarClass} tamano={44} radio={22} />
                      <div className="reg-id">
                        <div className="reg-nombre">{e.nombre}</div>
                        <div className="reg-sub">{e.id} · {e.documento}</div>
                      </div>
                      <div className="reg-datos">
                        <div className="reg-dato">
                          <span className="reg-etq">Programa</span>
                          <span>{e.programa}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Sem.</span>
                          <span>{e.semestre}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Promedio</span>
                          <span>{e.promedio}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Cuenta</span>
                          {e.usuario ? <Badge tone={e.usuarioActivo ? 'blue' : 'red'}>{e.usuario}</Badge> : <span style={{ color: '#9c988e', fontSize: 12 }}>sin cuenta</span>}
                        </div>
                      </div>
                      <div className="reg-estado">
                        <Badge tone={e.estado === 'bloqueado' ? 'red' : (e.estado === 'activo' || e.estado === 'matriculado') ? 'green' : 'amber'}>
                          {e.estado.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="reg-acciones">
                        <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditorEst(e)} title="Editar datos, financiación (BRILLA/ICETEX), cupo Brilla y Caja de Compensación">
                          <Icon name="editar" size={16} /> Editar
                        </button>
                        {!e.usuario && (
                          <button className="btn" style={{ padding: '6px 10px', fontSize: 12, background: '#e3f1ff', color: '#06468c', border: 'none' }} onClick={() => crearCuentaEst(e)}>
                            <Icon name="candado" size={14} /> Crear cuenta
                          </button>
                        )}
                        <button className="btn" style={{ padding: '6px 10px', fontSize: 12, background: e.estado === 'bloqueado' ? '#d8f0e5' : '#ffe0e5', color: e.estado === 'bloqueado' ? '#0a6e4b' : '#c1122c', border: 'none' }} onClick={() => alternarBloqueo(e)}>
                          {e.estado === 'bloqueado' ? <><Icon name="check" size={16} /> Desbloquear</> : <><Icon name="bloqueado" size={16} /> Bloquear</>}
                        </button>
                        <button className="btn" style={{ padding: '6px 10px', fontSize: 12, background: '#c1122c', color: '#fff', border: 'none' }} onClick={() => setPorEliminar(e)}>
                          <Icon name="borrar" size={16} /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <EditorEstudiante
                abierto={!!editorEst}
                estudiante={editorEst}
                cuenta={editorEst ? cuentaDe(editorEst) : null}
                programas={programas}
                guardando={guardandoEst}
                onGuardar={guardarEstudiante}
                onCerrar={() => setEditorEst(null)}
                onCrearCuenta={async (est) => {
                  await crearCuentaEst(est);
                  setEditorEst(null);
                }}
              />

              <ConfirmDialog
                abierto={!!porEliminar}
                titulo="Eliminar estudiante"
                mensaje={porEliminar
                  ? `¿Seguro que deseas eliminar a ${porEliminar.nombre} (${porEliminar.id})? Se borran también sus notas, pagos, matrículas, entregas y su cuenta de acceso. Esta acción no se puede deshacer.`
                  : ''}
                confirmar="Eliminar"
                procesando={eliminando}
                onConfirmar={eliminarEstudiante}
                onCancelar={() => setPorEliminar(null)}
              />
            </div>
          );
        }

        if (tab === 'programas') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Programas ofrecidos</div>
              <div className="reg-lista">
                {programas.map((p) => {
                  const mod = data.matricula.modalidades.find((m) => m.id === p.modalidadId);
                  const oc = Math.round((p.matriculados / p.cupo) * 100);
                  const edit = editando === `p-${form._id}` && form._fila === p.id ? form : null;
                  return (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="reg-card">
                        <div className="reg-id">
                          <div className="reg-nombre"><Ico name={p.icon} size={14} /> {p.nombre}</div>
                          <div className="reg-sub">SNIES {p.snies} · {p.facultad}</div>
                        </div>
                        <div className="reg-datos">
                          <div className="reg-dato">
                            <span className="reg-etq">Modalidad</span>
                            <Badge tone="blue">{mod?.nombre}</Badge>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Sem.</span>
                            <span>{p.semestres}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Créditos</span>
                            <span>{p.creditos}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Matriculados</span>
                            <span>{p.matriculados.toLocaleString('es-CO')} / {p.cupo.toLocaleString('es-CO')}</span>
                          </div>
                        </div>
                        <div className="reg-estado">
                          <Badge tone={oc > 95 ? 'red' : oc > 85 ? 'amber' : 'green'}>{oc}%</Badge>
                        </div>
                        <div className="reg-acciones">
                          <button
                            className="btn"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={() => abrirEdicion(`p-${p.id}`, {
                              _id: p.id, _fila: p.id, cupo: p.cupo, matriculados: p.matriculados,
                              semestres: p.semestres, creditos: p.creditos, jornada: p.jornada || 'diurna',
                            })}
                          >
                            <Icon name="editar" size={16} /> Ajustar
                          </button>
                        </div>
                      </div>
                      {edit && (
                        <div style={{ background: '#f7f6f3', border: '1px solid #e5e2da', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Cupo
                            <input type="number" min={0} value={edit.cupo} onChange={(e) => setForm({ ...edit, cupo: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                          </label>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Matriculados
                            <input type="number" min={0} value={edit.matriculados} onChange={(e) => setForm({ ...edit, matriculados: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                          </label>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Semestres
                            <input type="number" min={1} value={edit.semestres} onChange={(e) => setForm({ ...edit, semestres: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                          </label>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Créditos
                            <input type="number" min={0} value={edit.creditos} onChange={(e) => setForm({ ...edit, creditos: e.target.value })} style={{ ...input, width: '100%', marginTop: 4 }} />
                          </label>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Jornada
                            <Select
                              label="Jornada"
                              value={edit.jornada}
                              onChange={(value) => setForm({ ...edit, jornada: value })}
                              groups={[{ options: ['diurna', 'nocturna', 'sabado-matutina'].map((j) => ({ value: j, label: j })) }]}
                            />
                          </label>
                          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                            <button className="btn" onClick={async () => { try { await (async () => {})(); await recargar(); cerrarEdicion(); } catch (err) { alert(`No se pudo guardar: ${err.message}`); } }}>
                              <Icon name="guardar" size={16} /> Guardar
                            </button>
                            <button className="btn" onClick={cerrarEdicion} style={{ background: '#f0eee9' }}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (tab === 'cursos') {
          const cursos = data.cursos || [];
          const periodo = '2026-1';
          const programasActivos = programas;
          const progCursos = programasActivos.find((p) => p.id === progSelCursos) || programasActivos[0] || null;
          const cursosProg = progCursos ? cursos.filter((c) => c.programaId === progCursos.id) : [];
          const semestresDisp = [...new Set(cursosProg.map((c) => c.semestre).filter(Boolean))].sort((a, b) => a - b);
          const semElegido = semestresDisp.includes(semSelCursos) ? semSelCursos : (semestresDisp[0] ?? '');
          const cursosSem = cursosProg.filter((c) => c.semestre === semElegido);
          const curso = cursos.find((c) => c.id === cursoSel) || cursosSem[0] || null;

          return (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button className="btn" onClick={() => setMostrarNuevoCurso(true)}>
                  <Icon name="libro" size={16} /> Nuevo curso
                </button>
              </div>
              <FormularioNuevoCurso
                abierto={mostrarNuevoCurso}
                programas={programas}
                docentes={data.docentes || []}
                onCerrar={() => setMostrarNuevoCurso(false)}
                onCreado={async () => { setMostrarNuevoCurso(false); await cargarAdmin(); }}
              />
              <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Periodo
                  <Select label="Periodo" value="2026-1" onChange={() => {}} groups={[{ options: [{ value: '2026-1', label: '2026-1' }] }]} />
                </label>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 260 }}>
                  Programa
                  <Select
                    label="Programa"
                    value={String(programas.some((p) => p.id === progSelCursos) ? progSelCursos : programas[0]?.id || '')}
                    onChange={(value) => { setProgSelCursos(Number(value)); setCursoSel(null); setFormCurso(null); }}
                    groups={[{ options: programas.map((p) => ({ value: String(p.id), label: p.nombre })) }]}
                  />
                </label>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Semestre
                  <Select
                    label="Semestre"
                    value={String(semElegido || '')}
                    onChange={(value) => { setSemSelCursos(Number(value)); setCursoSel(null); setFormCurso(null); }}
                    groups={[{ options: semestresDisp.length ? semestresDisp.map((s) => ({ value: String(s), label: `Semestre ${s}` })) : [{ value: '1', label: '—' }] }]}
                  />
                </label>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 240 }}>
                  Curso / Materia
                  <Select label="Curso" value={String(curso?.id || '')} onChange={(v) => { if (!v) { setCursoSel(null); setFormCurso(null); return; } setCursoSel(Number(v)); setFormCurso(null); }} groups={[{ options: [
                    { value: '', label: cursosSem.length === 0 ? 'Sin cursos' : 'Seleccionar...' },
                    ...cursosSem.map((c) => ({ value: String(c.id), label: `${c.nombre} — ${c.codigo} (Grupo ${c.grupo})` })),
                  ] }]} />
                </label>
              </div>

              {!curso ? (
                <div style={card}><EstadoVacio mensaje="Este programa todavía no tiene cursos creados en este semestre." /></div>
              ) : (
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{curso.nombre}</div>
                      <div style={{ fontSize: 12, color: '#6f6b62', marginTop: 4 }}>
                        {curso.codigo} · Grupo {curso.grupo} · {progCursos?.nombre} · Semestre {curso.semestre}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn" onClick={() => navigate(`/curso/${curso.id}`)}>Vista</button>
                      <button className="btn" onClick={() => navigate(`/admin/configcurso/${curso.id}`)}>Editar</button>
                      <button className="btn" onClick={() => navigate(`/admin/configcurso/${curso.id}/usuarios`)}>Usuarios matriculados</button>
                      <button className="btn">Mostrar/Ocultar</button>
                      <button className="btn">Copia de seguridad</button>
                      <button className="btn">Restaurar</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {[
                      ['Nombre completo', curso.nombre],
                      ['Nombre corto', curso.codigo],
                      ['Número de ID', curso.id],
                      ['Categoría', progCursos?.nombre || '—'],
                      ['Grupos', 0],
                      ['Agrupamientos', 0],
                      ['Profesor', curso.profesor || 'Sin asignar'],
                      ['Métodos de matriculación', curso.modoAcceso === 'auto' ? 'Auto-matriculación (Estudiante) / Matriculación manual' : 'Matriculación manual'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: '#f7f6f3', border: '1px solid #e5e2da', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#6f6b62', fontWeight: 600 }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Contenido</div>
                    <div style={{ border: '1px solid #e5e2da', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: '#f7f6f3', padding: '10px 14px', fontWeight: 700 }}>General</div>
                      <div style={{ padding: 14, display: 'grid', gap: 8, fontSize: 13 }}>
                        <div>• NÚMEROS REALES, EXPRESIONES ALGEBRAICAS, ECUACIONES Y DESIGUALDADES CUADRÁTICAS.</div>
                        <div>• GEOMETRÍA EUCLIDIANA Y GEOMETRÍA ANALÍTICA.</div>
                        <div>• 3: Estudio De La Trigonometría</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 13, color: '#6f6b62' }}>Módulos utilizados: Foro · Archivo · Carpeta · Etiqueta · Tarea</div>
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (tab === 'docentes') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Planta docente</div>
              <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 14 }}>
                Carga académica estimada según las asignaturas del pensum que tienen asignadas. La categoría y el
                estado se editan aquí; el reparto de cursos por docente se hace en la pestaña
                <strong> Asignación docente</strong>.
              </div>
              <div className="reg-lista">
                {data.docentes.map((d) => {
                  const asignadas = materias.filter((m) => m.profesor === d.nombre);
                  const edit = editando === `d-${form._id}` && form._fila === d.id ? form : null;
                  return (
                    <div key={d.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="reg-card">
                        <Avatar nombre={d.nombre} clase="av-purple" tamano={44} radio={22} />
                        <div className="reg-id">
                          <div className="reg-nombre">{d.nombre}</div>
                          <div className="reg-sub">{d.titulo}</div>
                        </div>
                        <div className="reg-datos">
                          <div className="reg-dato">
                            <span className="reg-etq">Área</span>
                            <span>{d.area}</span>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Categoría</span>
                            <Badge>{d.categoria}</Badge>
                          </div>
                          <div className="reg-dato">
                            <span className="reg-etq">Asignaturas</span>
                            <span>{asignadas.length} ({asignadas.reduce((a, m) => a + m.creditos, 0)} cr)</span>
                          </div>
                        </div>
                        <div className="reg-estado">
                          <Badge tone={d.estado === 'activo' ? 'green' : 'amber'}>
                            {d.estado === 'activo' ? 'En servicio' : d.estado}
                          </Badge>
                        </div>
                        <div className="reg-acciones">
                          <button
                            className="btn"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={() => abrirEdicion(`d-${d.id}`, { _id: d.id, _fila: d.id, categoria: d.categoria || '', estado: d.estado, area: d.area || '' })}
                          >
                            <Icon name="editar" size={16} /> Editar
                          </button>
                        </div>
                      </div>
                      {edit && (
                        <div style={{ background: '#f7f6f3', border: '1px solid #e5e2da', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Área
                            <input value={edit.area} onChange={(e) => setForm({ ...edit, area: e.target.value })} style={{ ...input, width: 200, marginTop: 4 }} />
                          </label>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Categoría
                            <Select label="Categoría" value={edit.categoria} onChange={(value) => setForm({ ...edit, categoria: value })} groups={[{ options: ['Docente titular', 'Catedrático', 'Contratista', 'Adjunto', 'Asistente'].map((c) => ({ value: c, label: c })) }]} />
                          </label>
                          <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600 }}>
                            Estado
                            <Select label="Estado" value={edit.estado} onChange={(value) => setForm({ ...edit, estado: value })} groups={[{ options: ['activo', 'permensa', 'jubilado', 'retirado'].map((s) => ({ value: s, label: s })) }]} />
                          </label>
                          <button className="btn" onClick={async () => { try { await actualizarDocente(d.id, { area: form.area, categoria: form.categoria, estado: form.estado }); await recargar(); cerrarEdicion(); } catch (err) { alert(`No se pudo guardar: ${err.message}`); } }}>
                            <Icon name="guardar" size={16} /> Guardar
                          </button>
                          <button className="btn" onClick={cerrarEdicion} style={{ background: '#f0eee9' }}>Cancelar</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (tab === 'matricula') {
          return (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Estructura de la matrícula</div>
              <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 14 }}>
                Distribución de asignaturas y créditos por programa. Para matricular hay que usar el flujo del estudiante.
              </div>
              <div className="reg-lista">
                {programas.map((p) => {
                  const ms = materias.filter((m) => m.programaId === p.id);
                  const densos = Array.from({ length: p.semestres }, (_, i) =>
                    ms.filter((m) => m.semestre === i + 1).reduce((a, m) => a + m.creditos, 0)
                  );
                  const max = Math.max(...densos);
                  return (
                    <div key={p.id} className="reg-card">
                      <div className="reg-id">
                        <div className="reg-nombre">{p.nombre}</div>
                      </div>
                      <div className="reg-datos">
                        <div className="reg-dato">
                          <span className="reg-etq">Asignaturas</span>
                          <span>{ms.length}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Créditos totales</span>
                          <span style={{ fontWeight: 700 }}>{ms.reduce((a, m) => a + m.creditos, 0)}</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Prom. por semestre</span>
                          <span>{(ms.reduce((a, m) => a + m.creditos, 0) / p.semestres).toFixed(1)} cr</span>
                        </div>
                        <div className="reg-dato">
                          <span className="reg-etq">Semestre más denso</span>
                          <span>{max} cr</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        return null;
      }}
    </ModuleLayout>
  );
}
