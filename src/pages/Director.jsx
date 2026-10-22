/* =============================================
   Módulo del Director de programa.
   El director gestiona SOLO su programa: configura
   los cursos (cupo, modo de acceso y docente),
   consulta estudiantes y docentes y matricula
   estudiantes manualmente.
   ============================================= */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import {
  directorResumen,
  directorCursos,
  directorEstudiantes,
  directorDocentes,
  directorRosterCurso,
  directorCandidatosCurso,
  directorInscribir,
  directorRetirar,
} from '../api/client';

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: 'grafica-barras' },
  { key: 'cursos', label: 'Cursos', icon: 'cursos' },
  { key: 'estudiantes', label: 'Estudiantes', icon: 'admin-estudiantes' },
  { key: 'matricular', label: 'Matricular', icon: 'matricular' },
  { key: 'docentes', label: 'Docentes', icon: 'admin-docentes' },
];

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9' };
const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', border: '1px solid #d9d5cc', borderRadius: 8, fontSize: 13, background: '#fff' };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f0eee9', '#4e4a43'], green: ['#d8f0e5', '#0a6e4b'], amber: ['#fbefd6', '#99610e'],
    red: ['#ffe0e5', '#c1122c'], blue: ['#e3f1ff', '#06468c'], purple: ['#efe9fb', '#5a37ad'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{children}</span>;
};

const SITUACION = {
  bloqueado: { label: 'Bloqueado por documentos', tone: 'red' },
  retirado: { label: 'Retirado', tone: 'slate' },
  graduado: { label: 'Graduado', tone: 'purple' },
  sin_cuenta: { label: 'Sin cuenta', tone: 'amber' },
  inactivo: { label: 'Cuenta inactiva', tone: 'red' },
  mora: { label: 'En mora', tone: 'amber' },
  habilitado: { label: 'Habilitado', tone: 'green' },
};

const situacionTone = (s) => SITUACION[s] || { label: s, tone: 'slate' };

export default function Director() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [docentesProg, setDocentesProg] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [cursoSel, setCursoSel] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [matCurso, setMatCurso] = useState(null);
  const [matInscritos, setMatInscritos] = useState([]);
  const [matCandidatos, setMatCandidatos] = useState([]);
  const [matBusqueda, setMatBusqueda] = useState('');
  const [matAviso, setMatAviso] = useState(null);

  const cargarTodo = useCallback(async () => {
    setError(null);
    try {
      const [r, c, d] = await Promise.all([
        directorResumen(),
        directorCursos(),
        directorDocentes(),
      ]);
      setResumen(r);
      setCursos(c.cursos || []);
      setDocentes(c.docentes || []);
      setDocentesProg(d || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  useEffect(() => {
    let vivo = true;
    directorEstudiantes({ estado: filtroEstado || undefined })
      .then((lista) => { if (vivo) setEstudiantes(lista || []); })
      .catch((err) => { if (vivo) setError(err.message); });
    return () => { vivo = false; };
  }, [filtroEstado]);

  const cursoActual = useMemo(
    () => cursos.find((c) => c.id === cursoSel) || cursos[0] || null,
    [cursos, cursoSel]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return estudiantes;
    return estudiantes.filter((e) =>
      [e.nombre, e.documento, e.usuario].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [estudiantes, busqueda]);

  const abrirConfig = (curso) => {
    if (!curso?.id) return;
    navigate(`/director/configcurso/${curso.id}`);
  };

  const abrirMatricula = async (curso) => {
    setMatCurso(curso);
    setMatAviso(null);
    setMatBusqueda('');
    try {
      const [roster, candidatos] = await Promise.all([
        directorRosterCurso(curso.id),
        directorCandidatosCurso(curso.id),
      ]);
      setMatInscritos(roster?.estudiantes || []);
      setMatCandidatos(candidatos || []);
    } catch (err) {
      setMatAviso({ ok: false, text: err.message });
    }
  };

  const inscribir = async (estudianteId) => {
    try {
      await directorInscribir(matCurso.id, estudianteId);
      setMatAviso({ ok: true, text: 'Estudiante inscrito en el curso.' });
      await abrirMatricula(matCurso);
    } catch (err) {
      setMatAviso({ ok: false, text: err.message });
    }
  };

  const retirar = async (estudianteId) => {
    try {
      await directorRetirar(matCurso.id, estudianteId);
      setMatAviso({ ok: true, text: 'Estudiante retirado del curso.' });
      await abrirMatricula(matCurso);
    } catch (err) {
      setMatAviso({ ok: false, text: err.message });
    }
  };

  return (
    <ModuleLayout
      title="Dirección de Programa"
      subtitle={resumen?.programa?.nombre || user?.program || 'Gestión del programa'}
      tabs={TABS}
      titleFromTab
    >
      {({ tab }) => {
        if (cargando) return <div style={card}>Cargando información del programa…</div>;
        if (error) {
          return (
            <div style={{ ...card, background: '#fff1f3', borderColor: '#f4c2ca', color: '#c1122c' }}>
              {error}
            </div>
          );
        }

        if (tab === 'resumen') {
          const prog = resumen?.programa || {};
          const filas = [
            ['Facultad', prog.facultad || '—', 'Unidad académica'],
            ['Modalidad', prog.modalidad || '—', 'Nivel de formación'],
            ['Semestres', prog.semestres ?? '—', 'Duración del plan'],
            ['Créditos', prog.creditos ?? '—', 'Total del plan'],
            ['Cupo', prog.cupo ?? '—', 'Admisión por cohorte'],
          ];
          return (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                {[
                  ['Estudiantes', resumen?.estudiantes?.total ?? 0, 'En el programa'],
                  ['Cursos', resumen?.cursos?.total ?? 0, `${resumen?.cursos?.inscritos ?? 0} inscripciones`],
                  ['Docentes', resumen?.docentes ?? 0, 'Con carga en el programa'],
                  ['Acceso automático', resumen?.cursos?.auto ?? 0, `${resumen?.cursos?.manual ?? 0} manuales`],
                ].map(([l, v, s]) => (
                  <div key={l} style={card}>
                    <div style={{ fontSize: 12, color: '#6f6b62', fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{v}</div>
                    <div style={{ fontSize: 11, color: '#9c988e', marginTop: 4 }}>{s}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...card, marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>{prog.nombre}</div>
                {filas.map(([k, v, s]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0eee9', fontSize: 13 }}>
                    <span style={{ color: '#6f6b62' }}>{k} <span style={{ fontSize: 11, color: '#c3bfb6' }}>· {s}</span></span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (tab === 'cursos') {
          /* Flujo estilo Moodle: Periodo → Programa → Semestre → Curso */
          const programaActual = resumen?.programa;
          const periodos = [{ id: 1, nombre: '2026-1', activo: true }];
          const semestres = [...new Set(cursos.map((c) => c.semestre).filter(Boolean))].sort((a, b) => a - b);
          const cursosPorSemestre = semestres.map((s) => ({
            semestre: s,
            items: cursos.filter((c) => c.semestre === s).sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')),
          }));
          return (
            <div className="fade-in">
              <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Periodo
                  <select style={{ ...input, minWidth: 160 }} value="2026-1" readOnly>
                    <option value="2026-1">2026-1</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 260 }}>
                  Programa
                  <input style={{ ...input, width: '100%' }} value={programaActual?.nombre || ''} readOnly />
                </label>
              </div>

              {cursos.length === 0 ? (
                <div style={card}>Este programa no tiene cursos asignados en este periodo.</div>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {cursosPorSemestre.map((bloque) => (
                    <div key={bloque.semestre} style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>Semestre {bloque.semestre}</div>
                        <Badge tone="purple">{bloque.items.length} curso(s)</Badge>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                        {bloque.items.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => abrirConfig(c)}
                            style={{ textAlign: 'left', background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <strong style={{ fontSize: 14 }}>{c.nombre}</strong>
                              <Badge tone={c.modoAcceso === 'auto' ? 'green' : 'slate'}>{c.modoAcceso === 'auto' ? 'Auto' : 'Manual'}</Badge>
                            </div>
                            <div style={{ fontSize: 12, color: '#6f6b62' }}>{c.codigo} · Grupo {c.grupo} · {c.profesor || 'Sin docente'}</div>
                            <div style={{ fontSize: 11, color: '#9c988e' }}>Inscritos: {c.inscritos}{c.cupo ? ` / Cupo: ${c.cupo}` : ''}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (tab === 'estudiantes') {
          return (
            <div className="fade-in">
              <div style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Situación
                  <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ ...input, minWidth: 180 }}>
                    <option value="">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="en_inscripcion">En inscripción</option>
                    <option value="retirado">Retirados</option>
                    <option value="graduado">Graduados</option>
                  </select>
                </label>
                <input
                  placeholder="Buscar por nombre, documento o código…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ ...input, minWidth: 240, flex: 1 }}
                />
                <span style={{ fontSize: 12, color: '#9c988e' }}>{visibles.length} de {estudiantes.length}</span>
              </div>

              <div style={card}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Código</th>
                        <th style={th}>Estudiante</th>
                        <th style={th}>Sem.</th>
                        <th style={th}>Estado</th>
                        <th style={th}>Documentos</th>
                        <th style={th}>Cuenta</th>
                        <th style={th}>Situación de matrícula</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((e) => {
                        const s = situacionTone(e.situacion);
                        return (
                          <tr key={e.id}>
                            <td style={td}><code style={{ fontSize: 12, color: '#4e4a43' }}>{e.id}</code></td>
                            <td style={td}><strong>{e.nombre}</strong><br /><span style={{ fontSize: 11, color: '#9c988e' }}>{e.documento}</span></td>
                            <td style={td}>{e.semestre}</td>
                            <td style={td}><Badge tone={e.estado === 'activo' ? 'green' : e.estado === 'retirado' ? 'slate' : 'amber'}>{e.estado}</Badge></td>
                            <td style={td}><Badge tone={e.documentos === 'completo' ? 'green' : 'amber'}>{e.documentos}</Badge></td>
                            <td style={td}>
                              {e.usuario ? (
                                <Badge tone={e.usuarioActivo ? 'blue' : 'red'}>{e.usuario}</Badge>
                              ) : (
                                <span style={{ fontSize: 11, color: '#9c988e' }}>sin cuenta</span>
                              )}
                            </td>
                            <td style={td}><Badge tone={s.tone}>{s.label}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {visibles.length === 0 && <div style={{ padding: 16, fontSize: 13, color: '#9c988e' }}>No hay estudiantes que coincidan.</div>}
              </div>
            </div>
          );
        }

        if (tab === 'matricular') {
          const filtrados = matCandidatos.filter((c) =>
            [c.nombre, c.documento].some((v) => String(v || '').toLowerCase().includes(matBusqueda.trim().toLowerCase()))
          );
          return (
            <div className="fade-in">
              <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#4e4a43', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 260 }}>
                  Curso a matricular
                  <select
                    value={matCurso?.id || ''}
                    onChange={(e) => abrirMatricula(cursos.find((c) => c.id === Number(e.target.value)))}
                    style={{ ...input, width: '100%' }}
                  >
                    <option value="">Selecciona un curso…</option>
                    {cursos.map((c) => <option key={c.id} value={c.id}>S{c.semestre ?? '—'} · {c.codigo} — {c.nombre}</option>)}
                  </select>
                </label>
                {matCurso && <Badge tone="purple">{matInscritos.length} inscrito(s)</Badge>}
              </div>

              {matAviso && (
                <div style={{ ...card, marginBottom: 14, background: matAviso.ok ? '#e9f7f1' : '#fff1f3', borderColor: matAviso.ok ? '#b6e3cf' : '#f4c2ca', padding: 12 }}>
                  <span style={{ fontSize: 13, color: matAviso.ok ? '#0a6e4b' : '#c1122c' }}>{matAviso.text}</span>
                </div>
              )}

              {!matCurso ? (
                <div style={card}>Selecciona un curso para gestionar su matrícula.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  <div style={card}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Inscritos ({matInscritos.length})</div>
                    {matInscritos.length === 0 && <div style={{ fontSize: 13, color: '#9c988e' }}>Aún no hay estudiantes inscritos.</div>}
                    {matInscritos.map((e) => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0eee9' }}>
                        <span style={{ fontSize: 13 }}>
                          <strong>{e.nombre}</strong>
                          <span style={{ display: 'block', fontSize: 11, color: '#9c988e' }}>{e.codigo || e.id}</span>
                        </span>
                        <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => retirar(e.id)}>
                          Retirar
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={card}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Agregar estudiante</div>
                    <input
                      placeholder="Buscar por nombre o documento…"
                      value={matBusqueda}
                      onChange={(e) => setMatBusqueda(e.target.value)}
                      style={{ ...input, width: '100%', marginBottom: 12 }}
                    />
                    {filtrados.length === 0 && <div style={{ fontSize: 13, color: '#9c988e' }}>No hay candidatos disponibles.</div>}
                    {filtrados.slice(0, 40).map((e) => (
                      <div key={e.estudianteId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0eee9' }}>
                        <span style={{ fontSize: 13 }}>
                          <strong>{e.nombre}</strong>
                          <span style={{ display: 'block', fontSize: 11, color: '#9c988e' }}>
                            {e.documento} · {e.programa || '—'}{e.esPropio === false ? ' · otro programa' : ''}
                          </span>
                        </span>
                        <button className="btn" style={{ padding: '4px 9px', fontSize: 11, background: '#0a6e4b', color: '#fff' }} onClick={() => inscribir(e.estudianteId)}>
                          Inscribir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (tab === 'docentes') {
          return (
            <div className="fade-in">
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Docentes del programa</div>
                <div style={{ fontSize: 12, color: '#9c988e', marginBottom: 14 }}>Docentes con carga académica en los cursos de su programa.</div>
                {docentesProg.length === 0 && <div style={{ fontSize: 13, color: '#9c988e' }}>No hay docentes asignados a cursos del programa.</div>}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Docente</th>
                        <th style={th}>Área</th>
                        <th style={th}>Título</th>
                        <th style={th}>Correo</th>
                        <th style={th}>Cursos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docentesProg.map((d) => (
                        <tr key={d.id}>
                          <td style={td}><strong>{d.nombre}</strong></td>
                          <td style={td}>{d.area || '—'}</td>
                          <td style={td}>{d.titulo || '—'}</td>
                          <td style={td}>{d.email || '—'}</td>
                          <td style={td}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {(d.cursos || []).map((c) => <Badge key={c.id} tone="blue">{c.codigo}</Badge>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        return null;
      }}
    </ModuleLayout>
  );
}
