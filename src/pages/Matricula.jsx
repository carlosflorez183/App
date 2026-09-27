import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { INITIAL_DATA, formatCurrency } from '../data/mockData';

export default function Matricula() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState(0);
  const [modalidad, setModalidad] = useState(INITIAL_DATA.matricula.modalidades[0]);
  const [programa, setPrograma] = useState(INITIAL_DATA.matricula.programas[0]);
  const [semestre, setSemestre] = useState(6);
  const [seleccionadas, setSeleccionadas] = useState([602, 603]); // IS-305 y IS-310 por defecto
  const [matriculaFinalizada, setMatriculaFinalizada] = useState(false);

  const programasFiltrados = INITIAL_DATA.matricula.programas.filter(
    (p) => p.modalidadId === modalidad?.id
  );

  const materiasDisponibles = INITIAL_DATA.matricula.materias.filter(
    (m) => m.programaId === programa?.id && m.semestre === semestre
  );

  const materiasSeleccionadasObj = INITIAL_DATA.matricula.materias.filter((m) =>
    seleccionadas.includes(m.id)
  );

  const creditosSeleccionados = materiasSeleccionadasObj.reduce(
    (acc, m) => acc + m.creditos,
    0
  );
  const maxCreditos = 18;

  const toggleMateria = (materia) => {
    if (materia.estado === 'cursada' || materia.estado === 'bloqueada') return;

    if (seleccionadas.includes(materia.id)) {
      setSeleccionadas(seleccionadas.filter((id) => id !== materia.id));
    } else {
      if (creditosSeleccionados + materia.creditos > maxCreditos) {
        alert(`No puedes superar el límite de ${maxCreditos} créditos para este periodo.`);
        return;
      }
      setSeleccionadas([...seleccionadas, materia.id]);
    }
  };

  const pasosList = [
    { num: 0, label: 'Modalidad' },
    { num: 1, label: 'Programa' },
    { num: 2, label: 'Materias' },
    { num: 3, label: 'Horario' },
    { num: 4, label: 'Confirmación' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Topbar superior */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 20px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#1e3a8a',
              fontSize: 13,
              fontWeight: 700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 8
            }}
          >
            ← Volver al Dashboard
          </button>
          <div style={{ width: 1, height: 18, background: '#cbd5e1' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Proceso de Matrícula Académica 2026-2
          </span>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
            Estudiante: <strong>{user?.name}</strong> ({user?.code})
          </div>
        </div>
      </header>

      {/* Hero del Stepper */}
      <div style={{ background: 'linear-gradient(135deg, #4338ca, #1e3a8a)', color: '#fff', padding: '24px 0 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Portal de Autogestión</p>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: '4px 0' }}>Matrícula en Línea</h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                {programa?.nombre} — Semestre {semestre}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '8px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{creditosSeleccionados} / {maxCreditos}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Créditos Seleccionados</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '8px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{seleccionadas.length}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Materias</div>
              </div>
            </div>
          </div>

          {/* Barra de progreso de pasos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
            {pasosList.map((p, idx) => {
              const isDone = paso > p.num;
              const isActive = paso === p.num;
              return (
                <React.Fragment key={p.num}>
                  <div
                    onClick={() => setPaso(p.num)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isDone ? '#10b981' : (isActive ? '#fff' : 'rgba(255,255,255,0.2)'),
                      color: isDone ? '#fff' : (isActive ? '#4338ca' : 'rgba(255,255,255,0.8)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      border: `2px solid ${isActive || isDone ? '#fff' : 'transparent'}`
                    }}>
                      {isDone ? '✓' : p.num + 1}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                      {p.label}
                    </span>
                  </div>
                  {idx < pasosList.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: isDone ? '#10b981' : 'rgba(255,255,255,0.25)', margin: '0 8px 16px' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenedor del contenido del paso */}
      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 20px' }}>
        {/* ========================================================= */}
        {/* PASO 0: MODALIDAD                                         */}
        {/* ========================================================= */}
        {paso === 0 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>1. Selecciona el Nivel de Formación</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Elige la modalidad académica correspondiente a tu plan curricular</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {INITIAL_DATA.matricula.modalidades.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setModalidad(m)}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    border: `2px solid ${modalidad?.id === m.id ? '#2563eb' : '#e2e8f0'}`,
                    boxShadow: modalidad?.id === m.id ? '0 8px 24px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{m.icon}</div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{m.nombre}</h4>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>{m.descripcion}</p>
                  <span style={{ fontSize: 11, background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
                    {m.programas} Programas Disponibles
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPaso(1)}
                style={{
                  background: '#1e3a8a',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continuar a Programa →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 1: PROGRAMA                                          */}
        {/* ========================================================= */}
        {paso === 1 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>2. Selecciona tu Programa Académico</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Mostrando carreras en la modalidad: <strong>{modalidad.nombre}</strong></p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {programasFiltrados.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPrograma(p)}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    border: `2px solid ${programa?.id === p.id ? '#2563eb' : '#e2e8f0'}`,
                    boxShadow: programa?.id === p.id ? '0 8px 24px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{p.icon}</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>{p.nombre}</h4>
                  <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px' }}>{p.facultad}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      {p.semestres} Semestres
                    </span>
                    <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      {p.jornada}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setPaso(0)}
                style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                ← Atrás
              </button>
              <button
                onClick={() => setPaso(2)}
                style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                Continuar a Selección de Materias →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 2: SELECCIÓN DE MATERIAS                             */}
        {/* ========================================================= */}
        {paso === 2 && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>3. Selecciona tus Asignaturas</h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Haz clic en las materias disponibles para agregarlas a tu carga académica</p>
              </div>

              {/* Selector de Semestre */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Semestre:</span>
                {[1, 2, 6, 7].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSemestre(s)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${semestre === s ? '#2563eb' : '#cbd5e1'}`,
                      background: semestre === s ? '#eff6ff' : '#fff',
                      color: semestre === s ? '#2563eb' : '#475569',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Sem {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {materiasDisponibles.map((m) => {
                const isSelected = seleccionadas.includes(m.id);
                const isBlocked = m.estado === 'bloqueada';
                const isCursada = m.estado === 'cursada';

                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMateria(m)}
                    style={{
                      background: isCursada ? '#f8fafc' : '#fff',
                      borderRadius: 14,
                      padding: 18,
                      border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                      boxShadow: isSelected ? '0 6px 18px rgba(37,99,235,0.1)' : 'none',
                      cursor: isCursada || isBlocked ? 'not-allowed' : 'pointer',
                      opacity: isCursada ? 0.65 : 1,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
                        {m.codigo}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isSelected ? '#dcfce7' : (isCursada ? '#f1f5f9' : '#f8fafc'),
                        color: isSelected ? '#15803d' : '#64748b'
                      }}>
                        {isSelected ? '✓ Seleccionada' : (isCursada ? 'Ya cursada' : `${m.creditos} Créditos`)}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{m.nombre}</h4>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Profesor: {m.profesor}</div>

                    <div style={{ fontSize: 11, color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                      🕒 Horarios: {m.horarios?.join(', ') || 'Por definir'}
                    </div>

                    {m.prerrequisito && (
                      <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 6 }}>
                        ⚠️ Prerrequisito: {m.prerrequisito}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setPaso(1)}
                style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                ← Atrás
              </button>
              <button
                onClick={() => {
                  if (seleccionadas.length === 0) {
                    alert('Debes seleccionar al menos una materia para continuar.');
                    return;
                  }
                  setPaso(3);
                }}
                style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                Ver Horario y Avanzar →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 3: REVISIÓN DE HORARIO Y CRUCES                      */}
        {/* ========================================================= */}
        {paso === 3 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>4. Verificación de Horario</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Comprueba que no existan traslapes o cruces en tu franja académica</p>

            <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((dia) => (
                  <div key={dia} style={{ background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0', minHeight: 200 }}>
                    <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: 13, marginBottom: 12, borderBottom: '1px solid #cbd5e1', paddingBottom: 6 }}>
                      {dia}
                    </div>
                    {materiasSeleccionadasObj.map((m) => {
                      const tieneClase = m.horarios?.some(h => h.toLowerCase().startsWith(dia.toLowerCase().slice(0, 3)));
                      if (!tieneClase) return null;
                      return (
                        <div key={m.id} style={{ background: '#eff6ff', borderLeft: '3px solid #2563eb', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#1e40af' }}>{m.codigo}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{m.nombre}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{m.horarios?.find(h => h.toLowerCase().startsWith(dia.toLowerCase().slice(0, 3)))}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setPaso(2)}
                style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                ← Modificar Materias
              </button>
              <button
                onClick={() => setPaso(4)}
                style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                Confirmar y Generar Matrícula →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 4: CONFIRMACIÓN Y COMPROBANTE                        */}
        {/* ========================================================= */}
        {paso === 4 && (
          <div className="fade-in">
            <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 680, margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
              {matriculaFinalizada ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: '#10b981', marginBottom: 8 }}>¡Matrícula Exitosa!</h3>
                  <p style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
                    Tus materias han sido inscritas en el sistema académico. Tu horario oficial ya se encuentra disponible en tu Dashboard.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                      background: '#1e3a8a',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 28px',
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Volver al Dashboard Principal
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏛️</div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', margin: 0 }}>Comprobante de Pre-Matrícula</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Periodo Académico: 2026-2</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Estudiante:</span>
                      <div style={{ fontWeight: 700 }}>{user?.name}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Código / Documento:</span>
                      <div style={{ fontWeight: 700 }}>{user?.code}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Programa:</span>
                      <div style={{ fontWeight: 700 }}>{programa?.nombre}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Total Créditos:</span>
                      <div style={{ fontWeight: 800, color: '#2563eb' }}>{creditosSeleccionados} Créditos</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Asignaturas Registradas ({materiasSeleccionadasObj.length}):</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {materiasSeleccionadasObj.map((m) => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>
                          <span><strong>{m.codigo}</strong> — {m.nombre}</span>
                          <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{m.creditos} CR</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e2e8f0', paddingTop: 16, marginBottom: 24 }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Valor Estimado de Matrícula:</span>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{formatCurrency(3950000)}</div>
                    </div>
                    <button
                      onClick={() => alert('Generando volante de pago oficial en PDF...')}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      🖨️ Imprimir Volante
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setPaso(3)}
                      style={{ flex: 1, background: '#fff', border: '1px solid #cbd5e1', padding: '12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ← Volver a Horario
                    </button>
                    <button
                      onClick={() => setMatriculaFinalizada(true)}
                      style={{ flex: 2, background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}
                    >
                      Confirmar y Registrar Matrícula ✓
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
