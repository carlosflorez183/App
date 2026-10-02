import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { guardarNotaCorte, listarEstudiantesCurso } from '../api/client';

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' };

export function leerNota(texto) {
  const limpio = String(texto).trim().replace(',', '.');
  if (limpio === '') return { valor: null };
  const valor = Number(limpio);
  if (Number.isNaN(valor)) return { valor: NaN };
  return { valor: Math.round(valor * 100) / 100 };
}

function listaCortes(texto) {
  return String(texto || '')
    .split(',')
    .map((c) => Number(c.trim()))
    .filter((c) => c === 1 || c === 2 || c === 3);
}

export default function RegistroNotas({ cursos, cursoId, onCambiarCurso }) {
  const [roster, setRoster] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const nodos = useRef({});
  const fijarNodo = useCallback((clave, nodo) => {
    if (nodo) nodos.current[clave] = nodo;
  }, []);

  const cargar = useCallback(async () => {
    if (!cursoId) { setRoster(null); return; }
    setCargando(true);
    try {
      setRoster(await listarEstudiantesCurso(cursoId));
      setError('');
    } catch (err) {
      setRoster(null);
      setError(`No se pudo cargar el registro de notas: ${err.message}`);
    } finally {
      setCargando(false);
    }
  }, [cursoId]);

  useEffect(() => {
    setBusqueda('');
    setFiltroPrograma('');
    cargar();
  }, [cargar]);

  const alumnos = useMemo(() => (roster ? roster.estudiantes : []), [roster]);
  const programas = useMemo(
    () => [...new Set(alumnos.map((a) => a.programa).filter(Boolean))],
    [alumnos]
  );
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (filtroPrograma && a.programa !== filtroPrograma) return false;
      if (!texto) return true;
      return a.nombre.toLowerCase().includes(texto)
        || String(a.documento || '').includes(texto)
        || String(a.programa || '').toLowerCase().includes(texto);
    });
  }, [alumnos, busqueda, filtroPrograma]);

  const guardarNota = async (estudianteId, campo, valor, nodo) => {
    try {
      const guardado = await guardarNotaCorte(cursoId, estudianteId, { [campo]: valor });
      setRoster((r) => (r
        ? { ...r, estudiantes: r.estudiantes.map((a) => (a.estudianteId === estudianteId ? { ...a, ...guardado } : a)) }
        : r));
      setError('');

      if (nodo && document.activeElement !== nodo) {
        const { valor: enPantalla } = leerNota(nodo.value);
        const { valor: delServidor } = leerNota(guardado[campo] ?? '');
        if (enPantalla !== delServidor) nodo.value = guardado[campo] ?? '';
      }
    } catch (err) {
      setError(`No se guardó la nota: ${err.message}`);
    }
  };

  const escribirNota = (alumno, campo, numeroCorte, nodo) => {
    const { valor } = leerNota(nodo.value);
    if (Number.isNaN(valor)) {
      setError(`La nota del corte ${numeroCorte} de ${alumno.nombre} no es un número (se escribió «${nodo.value.trim()}»).`);
      return;
    }
    if (valor < 0 || valor > 5) {
      setError(`La nota del corte ${numeroCorte} de ${alumno.nombre} debe estar entre 0 y 5.`);
      return;
    }
    if (valor === alumno[campo]) return;
    guardarNota(alumno.estudianteId, campo, valor, nodo);
  };


  const recalcularCorte = async (alumno, numeroCorte) => {
    try {
      const guardado = await guardarNotaCorte(cursoId, alumno.estudianteId, { recalcular: numeroCorte });
      setRoster((r) => (r
        ? {
          ...r,
          estudiantes: r.estudiantes.map((a) => (a.estudianteId === alumno.estudianteId
            ? { ...a, ...guardado }
            : a)),
        }
        : r));
      const nodo = nodos.current[`${alumno.estudianteId}-${numeroCorte}`];

      if (nodo && document.activeElement !== nodo) {
        nodo.value = guardado[`nota${numeroCorte}`] ?? '';
      }
      setError('');
    } catch (err) {
      setError(`No se pudo recalcular el corte ${numeroCorte} de ${alumno.nombre}: ${err.message}`);
    }
  };

  if (!cursoId) {
    return (
      <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: 24 }}>
        No tiene cursos asignados. Pida a la dirección que le asignen uno para registrar notas.
      </div>
    );
  }

  const sinNota1 = alumnos.filter((a) => a.nota1 === null).length;

  return (
    <div>
      <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Curso:</span>
        <select
          value={cursoId}
          onChange={(e) => onCambiarCurso(Number(e.target.value))}
          style={input}
        >
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre} ({c.grupo})</option>
          ))}
        </select>
        {!cargando && roster && (
          <>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, código o programa"
              style={{ ...input, width: 250 }}
              aria-label="Buscar alumno"
            />
            {programas.length > 1 && (
              <select
                value={filtroPrograma}
                onChange={(e) => setFiltroPrograma(e.target.value)}
                style={input}
                aria-label="Filtrar por programa"
              >
                <option value="">Todos los programas</option>
                {programas.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {alumnos.length} matriculado{alumnos.length === 1 ? '' : 's'}
              {sinNota1 > 0 ? ` · ${sinNota1} sin nota del corte 1` : ''}
            </span>
          </>
        )}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {cargando && !roster && (
        <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: 24 }}>
          Cargando alumnos del curso...
        </div>
      )}

      {!cargando && !error && alumnos.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: 24 }}>
          Nadie está matriculado en este curso todavía. Use la pestaña
          <strong> Estudiantes</strong> del curso, o el botón <strong>Inscribir estudiantes</strong>,
          para añadir alumnos.
        </div>
      )}

      {alumnos.length > 0 && (
        <div style={card}>
          {filtrados.length === 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', paddingBottom: 10 }}>
              Ningún alumno coincide con la búsqueda.
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Estudiante</th>
                <th style={th}>Programa</th>
                <th style={th}>Corte 1</th>
                <th style={th}>Corte 2</th>
                <th style={th}>Corte 3</th>
                <th style={{ ...th, textAlign: 'right' }}>Definitiva</th>
              </tr>
            </thead>

            <tbody key={cursoId}>
              {filtrados.map((a) => (
                <tr key={a.estudianteId}>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{a.nombre}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {a.documento}{a.semestre ? ` · semestre ${a.semestre}` : ''}
                    </div>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#64748b' }}>{a.programa || '—'}</td>
                  {['nota1', 'nota2', 'nota3'].map((k, i) => {
                    const manual = listaCortes(a.cortesManuales).includes(i + 1);
                    const desde = a.desdeEntregas?.[i + 1] || { valor: null, total: 0, calificadas: 0, sinEntregar: 0, sinCalificar: 0, actividades: 0 };
                    return (
                      <td key={k} style={td}>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={a[k] ?? ''}
                          ref={(nodo) => fijarNodo(`${a.estudianteId}-${i + 1}`, nodo)}

                          onBlur={(e) => escribirNota(a, k, i + 1, e.target)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          style={{ ...input, width: 78, padding: '4px 6px' }}
                          aria-label={`Nota corte ${i + 1} de ${a.nombre}`}
                        />
                        <div style={{ fontSize: 10, marginTop: 4, lineHeight: 1.3 }}>
                          {manual ? (
                            <span style={{ color: '#7c3aed', fontWeight: 700 }}>✍ escrita a mano</span>
                          ) : desde.actividades ? (
                            <>
                              <span style={{ color: '#0f766e' }}>
                                📄 {desde.calificadas} de {desde.actividades} actividad{desde.actividades === 1 ? '' : 'es'}
                              </span>
                              {desde.sinEntregar > 0 && (
                                <div style={{ color: '#b91c1c', fontWeight: 700 }}>
                                  {desde.sinEntregar} sin entregar = 0
                                </div>
                              )}
                              {desde.sinCalificar > 0 && (
                                <div style={{ color: '#b45309' }}>{desde.sinCalificar} sin calificar</div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>sin actividades</span>
                          )}
                          {manual && (
                            <button
                              type="button"
                              data-testid={`recalcular-${a.estudianteId}-${i + 1}`}
                              onClick={() => recalcularCorte(a, i + 1)}
                              title={`Volver a calcular el corte ${i + 1} con las entregas calificadas (${desde.calificadas || 0} de ${desde.actividades || 0})`}
                              style={{
                                display: 'block', marginTop: 2, background: 'none', border: 0, padding: 0,
                                fontSize: 10, color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                              }}
                            >
                              ↻ recalcular desde entregas
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                    {a.definitiva ?? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309' }}>
                        Falta {[a.nota1, a.nota2, a.nota3].findIndex((n) => n === null || n === undefined) + 1} corte
                        {[a.nota1, a.nota2, a.nota3].filter((n) => n === null || n === undefined).length === 1 ? '' : 's'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
