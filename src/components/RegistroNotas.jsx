import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import Select from './Select';
import Avatar from './Avatar';
import TarjetasRegistro from './TarjetasRegistro';
import { guardarNotaCorte, listarEstudiantesCurso } from '../api/client';

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#6f6b62', borderBottom: '1px solid #e5e2da' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0eee9' };
const card = { background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18 };
const input = { padding: '8px 10px', borderRadius: 8, border: '1px solid #cdc9bf', fontSize: 13, background: '#fff' };

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
      <div style={{ ...card, textAlign: 'center', color: '#9c988e', padding: 24 }}>
        No tiene cursos asignados. Pida a la dirección que le asignen uno para registrar notas.
      </div>
    );
  }

  const sinNota1 = alumnos.filter((a) => a.nota1 === null).length;

  return (
    <div>
      <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6f6b62' }}>Curso:</span>
        <Select
          label="Curso"
          value={String(cursoId)}
          onChange={(v) => onCambiarCurso(Number(v))}
          groups={[{ options: cursos.map((c) => ({
            value: String(c.id),
            label: `${c.nombre} (${c.grupo})`,
          })) }]}
        />
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
              <Select
                label="Filtrar por programa"
                value={filtroPrograma}
                onChange={setFiltroPrograma}
                groups={[{ options: [
                  { value: '', label: 'Todos los programas' },
                  ...programas.map((p) => ({ value: p, label: p })),
                ] }]}
              />
            )}
            <span style={{ fontSize: 11, color: '#9c988e' }}>
              {alumnos.length} matriculado{alumnos.length === 1 ? '' : 's'}
              {sinNota1 > 0 ? ` · ${sinNota1} sin nota del corte 1` : ''}
            </span>
          </>
        )}
      </div>

      {error && (
        <div style={{ background: '#ffe0e5', color: '#8f0d22', border: '1px solid #f4c2ca', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {cargando && !roster && (
        <div style={{ ...card, textAlign: 'center', color: '#9c988e', padding: 24 }}>
          Cargando alumnos del curso...
        </div>
      )}

      {!cargando && !error && alumnos.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: '#9c988e', padding: 24 }}>
          Nadie está matriculado en este curso todavía. Use la pestaña
          <strong> Estudiantes</strong> del curso, o el botón <strong>Inscribir estudiantes</strong>,
          para añadir alumnos.
        </div>
      )}

      {alumnos.length > 0 && (
        <div style={card}>
          {filtrados.length === 0 && (
            <div style={{ fontSize: 12, color: '#9c988e', paddingBottom: 10 }}>
              Ningún alumno coincide con la búsqueda.
            </div>
          )}
          <div className="reg-lista">
            {filtrados.map((a) => (
              <div key={a.estudianteId} className="reg-card" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                <Avatar nombre={a.nombre} foto={a.avatar} clase={a.avatarClass} tamano={44} radio={22} />
                <div>
                  <div className="reg-nombre">{a.nombre}</div>
                  <div className="reg-sub">{a.documento}{a.semestre ? ` · semestre ${a.semestre}` : ''}{a.programa ? ` · ${a.programa}` : ''}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    {['nota1', 'nota2', 'nota3'].map((k, i) => {
                      const manual = listaCortes(a.cortesManuales).includes(i + 1);
                      const desde = a.desdeEntregas?.[i + 1] || { valor: null, total: 0, calificadas: 0, sinEntregar: 0, sinCalificar: 0, actividades: 0 };
                      return (
                        <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: '#6f6b62', textTransform: 'uppercase', letterSpacing: .5 }}>Corte {i + 1}</label>
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
                          <div style={{ fontSize: 10, lineHeight: 1.3 }}>
                            {manual ? (
                              <span style={{ color: '#6d4ac4', fontWeight: 700 }}>escrita a mano</span>
                            ) : desde.actividades ? (
                              <>
                                <span style={{ color: '#0b6169' }}>
                                  <Icon name="archivo" size={16} /> {desde.calificadas} de {desde.actividades} actividad{desde.actividades === 1 ? '' : 'es'}
                                </span>
                                {desde.sinEntregar > 0 && (
                                  <div style={{ color: '#c1122c', fontWeight: 700 }}>
                                    {desde.sinEntregar} sin entregar = 0
                                  </div>
                                )}
                                {desde.sinCalificar > 0 && (
                                  <div style={{ color: '#99610e' }}>{desde.sinCalificar} sin calificar</div>
                                )}
                              </>
                            ) : (
                              <span style={{ color: '#9c988e' }}>sin actividades</span>
                            )}
                            {manual && (
                              <button
                                type="button"
                                data-testid={`recalcular-${a.estudianteId}-${i + 1}`}
                                onClick={() => recalcularCorte(a, i + 1)}
                                title={`Volver a calcular el corte ${i + 1} con las entregas calificadas (${desde.calificadas || 0} de ${desde.actividades || 0})`}
                                style={{
                                  display: 'block', marginTop: 2, background: 'none', border: 0, padding: 0,
                                  fontSize: 10, color: '#06468c', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                                }}
                              >
                                ↻ recalcular desde entregas
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, alignSelf: 'start' }}>
                  {a.definitiva ?? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#99610e' }}>
                      Falta {[a.nota1, a.nota2, a.nota3].findIndex((n) => n === null || n === undefined) + 1} corte
                      {[a.nota1, a.nota2, a.nota3].filter((n) => n === null || n === undefined).length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {filtrados.length === 0 && (
              <div style={{ fontSize: 12, color: '#9c988e', paddingBottom: 10 }}>
                Ningún alumno coincide con la búsqueda.
              </div>
            )}
          </div>
        </div>

      )}
    </div>
  );
}
