/* =============================================
   Reparto de docentes a cursos.
   Lo usan Administración y Rectoría (dirección),
   que son las dos instancias que asignan carga
   académica. Es un componente aparte y no una
   pestaña más porque los dos paneles necesitan
  exactamente la misma tabla: duplicarla hacía
  que se desincronizaran el día que un campo
  cambiaba en uno y no en el otro.
   ============================================= */
import React, { useCallback, useEffect, useState } from 'react';
import { asignarDocenteCurso, listarAsignacionDocentes } from '../api/client';

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };
const input = { padding: '7px 9px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' };

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: ['#f1f5f9', '#475569'],
    green: ['#dcfce7', '#15803d'],
    amber: ['#fef3c7', '#b45309'],
    red: ['#fee2e2', '#b91c1c'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return (
    <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
};

export default function AsignacionDocentes() {
  const [cursos, setCursos] = useState(null);
  const [docentes, setDocentes] = useState([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const datos = await listarAsignacionDocentes();
      setCursos(datos.cursos);
      setDocentes(datos.docentes);
      setError('');
    } catch (err) {
      setCursos(null);
      setError(`No se pudo cargar el reparto de docentes: ${err.message}`);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* El cambio se guarda al instante: quien reparte carga académica no está
     para confirmar formularios, y un select que no guarda parece roto. */
  const asignar = async (cursoId, docenteId) => {
    setGuardando(cursoId);
    setError('');
    setExito('');
    try {
      await asignarDocenteCurso(cursoId, docenteId);
      const nombre = docentes.find((d) => d.id === docenteId)?.nombre;
      setExito(nombre
        ? `${nombre} quedó a cargo del curso.`
        : 'El curso quedó sin docente asignado.');
      await cargar();
    } catch (err) {
      setError(`No se pudo asignar: ${err.message}`);
    } finally {
      setGuardando(0);
    }
  };

  const sinDocente = (cursos || []).filter((c) => !c.docenteId).length;

  return (
    <div style={card}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Asignación de docentes a cursos</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
        El docente que aparece en el curso es el mismo que puede abrirlo, poner notas y calificar
        entregas. Un curso sin docente queda en manos de nadie: aparece marcado en rojo.
        {sinDocente > 0 ? ` Hay ${sinDocente} curso${sinDocente === 1 ? '' : 's'} sin asignar.` : ''}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {exito && (
        <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          {exito}
        </div>
      )}

      {!cursos && !error && <div style={{ fontSize: 12, color: '#94a3b8' }}>Cargando cursos...</div>}

      {cursos && cursos.length === 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>No hay cursos creados en este periodo.</div>
      )}

      {cursos && cursos.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Curso</th>
                <th style={th}>Código</th>
                <th style={th}>Grupo</th>
                <th style={th}>Docente</th>
                <th style={th}>Inscritos</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((c) => (
                <tr key={c.id}>
                  <td style={td}><strong>{c.nombre}</strong></td>
                  <td style={td}>{c.codigo}</td>
                  <td style={td}>{c.grupo}</td>
                  <td style={td}>
                    <select
                      value={c.docenteId || ''}
                      disabled={guardando === c.id}
                      onChange={(e) => asignar(c.id, e.target.value)}
                      style={{ ...input, minWidth: 230 }}
                    >
                      <option value="">Sin docente asignado</option>
                      {docentes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre} · {d.area} ({d.cursos} curso{d.cursos === 1 ? '' : 's'})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>{c.estudiantes}</td>
                  <td style={td}>
                    {c.docenteId
                      ? <Badge tone="green">{guardando === c.id ? 'Guardando...' : 'Asignado'}</Badge>
                      : <Badge tone="red">Sin docente</Badge>}
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
