import React, { useState } from 'react';
import Icon, { Ico } from '../components/Icon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../data/mockData';
import { usePersistentData } from '../hooks/usePersistentData';
import { registrarMatricula } from '../api/client';

export default function Matricula({ readOnly = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Plan de estudios desde el estado compartido (API con respaldo al mock).
  const [data] = usePersistentData();

  const [paso, setPaso] = useState(0);
  const [modalidad, setModalidad] = useState(data.matricula.modalidades[0]);
  const [programa, setPrograma] = useState(data.matricula.programas[0]);
  const [semestre, setSemestre] = useState(6);
  // Preselecciona dos materias disponibles del semestre por defecto. Se deriva
  // del plan para no depender de ids fijos (el mock y la base numeran distinto).
  const [seleccionadas, setSeleccionadas] = useState(() =>
    data.matricula.materias
      .filter((m) => m.programaId === programa?.id && m.semestre === 6 && m.estado === 'disponible')
      .slice(0, 2)
      .map((m) => m.id)
  );
  const [matriculaFinalizada, setMatriculaFinalizada] = useState(false);
  const [guardandoMatricula, setGuardandoMatricula] = useState(false);
  const [errorMatricula, setErrorMatricula] = useState('');

  const programasFiltrados = data.matricula.programas.filter(
    (p) => p.modalidadId === modalidad?.id
  );

  const materiasDisponibles = data.matricula.materias.filter(
    (m) => m.programaId === programa?.id && m.semestre === semestre
  );

  const materiasSeleccionadasObj = data.matricula.materias.filter((m) =>
    seleccionadas.includes(m.id)
  );

  const creditosSeleccionados = materiasSeleccionadasObj.reduce(
    (acc, m) => acc + m.creditos,
    0
  );
  const maxCreditos = 23;

  /* La matrícula se habilita cuando Admisiones valida el expediente de
     documentos del estudiante. Hasta entonces el portal no deja matricular. */
  const docsPendientes =
    user?.role === 'estudiante' && user?.estudiante?.documentos !== 'completo';

  if (docsPendientes) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="card">
          <div className="card-hd">
            <span className="card-ttl">
              <Icon name="candado" size={16} /> Matrícula no habilitada
            </span>
          </div>
          <div className="card-bd">
            <p style={{ fontSize: 13, color: '#6b675e', margin: '0 0 14px' }}>
              Tu expediente de documentos <strong>aún no está validado por Admisiones</strong>.
              Cuando revisen y aprueben lo que subiste, este apartado se habilitará y
              podrás matricular tus materias del periodo 2026-2.
            </p>
            <p style={{ fontSize: 12, color: '#9c988e', margin: '0 0 18px' }}>
              Si Admisiones rechazó alguno de tus documentos, allí verás el motivo y
              podrás subir una versión corregida.
            </p>
            <button
              className="btn b-primary"
              data-testid="ir-documentos-ingreso"
              onClick={() => navigate('/dashboard?view=ingreso&tab=documentos')}
            >
              <Icon name="adm-documentos" size={15} /> Ver mis documentos de admisión
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // Al cambiar de modalidad, el programa y las materias elegidas dejarian de
  // corresponder, asi que se resincronizan con la nueva modalidad.
  const selectModalidad = (m) => {
    setModalidad(m);
    if (modalidad?.id === m.id) return;
    const primero = data.matricula.programas.find((p) => p.modalidadId === m.id);
    if (primero) setPrograma(primero);
    setSeleccionadas([]);
  };

  // Las materias cargadas pertenecen a un solo programa: al cambiar de
  // programa se limpia la seleccion para no arrastrar asignaturas ajenas.
  const selectPrograma = (p) => {
    setPrograma(p);
    if (programa?.id === p.id) return;
    setSeleccionadas([]);
  };

  /* Confirma la matrícula contra la API. En modo sin servidor (la app también
     corre con datos de respaldo) el fallo de red no debe romper el flujo: se
     conserva la confirmación local. Si el servidor responde con un error
     (créditos, materias bloqueadas), se muestra el motivo. */
  const confirmarMatricula = async () => {
    setGuardandoMatricula(true);
    setErrorMatricula('');
    try {
      await registrarMatricula(materiasSeleccionadasObj.map((m) => m.id));
      setMatriculaFinalizada(true);
    } catch (err) {
      if (!err?.status) setMatriculaFinalizada(true);
      else setErrorMatricula(err.message);
    } finally {
      setGuardandoMatricula(false);
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
    <div style={{ minHeight: '100vh', background: '#f0eee9' }}>
      {/* Topbar superior */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e2da',
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
              color: '#00116f',
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
          <div style={{ width: 1, height: 18, background: '#cdc9bf' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#211d17' }}>
            {readOnly ? 'Consulta de Plan de Estudios' : 'Proceso de Matrícula Académica 2026-2'}
          </span>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6f6b62' }}>
            {readOnly ? (
              <>Consulta: <strong>{user?.name}</strong> ({user?.code})</>
            ) : (
              <>Estudiante: <strong>{user?.name}</strong> ({user?.code})</>
            )}
          </div>
        </div>
      </header>

      {/* Hero del Stepper */}
      <div style={{ background: 'radial-gradient(90% 130% at 100% 0%, rgba(0,169,255,.45) 0%, rgba(0,169,255,0) 55%), linear-gradient(120deg,#00116f 0%,#06468c 55%,#002fff 120%)', color: '#fff', padding: '24px 0 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Portal de Autogestión</p>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: '4px 0', fontFamily: "'Iowan Old Style','Palatino Linotype','Book Antiqua',Georgia,serif" }}>Matrícula en Línea</h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                {readOnly
                  ? 'Consulta de plan de estudios — no modifica la matrícula del estudiante'
                  : `${programa?.nombre} — Semestre ${semestre}`}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {readOnly ? (
                <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '8px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{materiasDisponibles.length}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Asignaturas del semestre</div>
                </div>
              ) : (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '8px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{creditosSeleccionados} / {maxCreditos}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Créditos Seleccionados</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '8px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{seleccionadas.length}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Materias</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Barra de progreso de pasos */}
          {!readOnly && (
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
                      background: isDone ? '#17a06d' : (isActive ? '#fff' : 'rgba(255,255,255,0.2)'),
                      color: isDone ? '#fff' : (isActive ? '#0a2fb0' : 'rgba(255,255,255,0.8)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      border: `2px solid ${isActive || isDone ? '#fff' : 'transparent'}`
                    }}>
                      {isDone ? <><Icon name="check" size={14} /></> : p.num + 1}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                      {p.label}
                    </span>
                  </div>
                  {idx < pasosList.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: isDone ? '#17a06d' : 'rgba(255,255,255,0.25)', margin: '0 8px 16px' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Contenedor del contenido del paso */}
      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 20px' }}>
        {readOnly && (
          <div className="fade-in">
            <div style={{ background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6f6b62' }}>Programa:</span>
              <select
                value={programa?.id || ''}
                onChange={(e) => {
                  setPrograma(data.matricula.programas.find((p) => p.id === Number(e.target.value)));
                  setSemestre(1);
                }}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cdc9bf', fontSize: 13 }}
              >
                {data.matricula.programas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: '#9c988e' }}>
                Plan de estudios completo. La matrícula la realiza el estudiante en su portal.
              </span>
            </div>

            {Array.from({ length: programa?.semestres || 10 }, (_, i) => i + 1).map((s) => {
              const ms = data.matricula.materias.filter((m) => m.programaId === programa?.id && m.semestre === s);
              if (ms.length === 0) return null;
              return (
                <div key={s} style={{ background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 18, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>Semestre {s}</span>
                    <span style={{ fontSize: 12, color: '#6f6b62', fontWeight: 700 }}>
                      {ms.length} asignaturas · {ms.reduce((a, m) => a + m.creditos, 0)} créditos
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                    {ms.map((m) => (
                      <div key={m.id} style={{ border: '1px solid #e5e2da', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: '#00116f', fontWeight: 800 }}>{m.codigo}</div>
                        <div style={{ fontSize: 13, color: '#211d17', fontWeight: 600 }}>{m.nombre}</div>
                        <div style={{ fontSize: 11, color: '#9c988e', marginTop: 3 }}>
                          {m.creditos} cr · {m.area} · {m.profesor}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!readOnly && (
        <>
        {/* ========================================================= */}
        {/* PASO 0: MODALIDAD                                         */}
        {/* ========================================================= */}
        {paso === 0 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#211d17', marginBottom: 6 }}>1. Selecciona el Nivel de Formación</h3>
            <p style={{ fontSize: 13, color: '#6f6b62', marginBottom: 6 }}>Elige la modalidad académica correspondiente a tu plan curricular</p>
            <p style={{ fontSize: 12, color: '#0a5cae', marginBottom: 20, fontWeight: 600 }}>
              Haz doble clic en la modalidad para seleccionarla y continuar al programa.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {data.matricula.modalidades.map((m) => (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectModalidad(m)}
                  onDoubleClick={() => { selectModalidad(m); setPaso(1); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); selectModalidad(m); } }}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    border: `2px solid ${modalidad?.id === m.id ? '#0a5cae' : '#e5e2da'}`,
                    boxShadow: modalidad?.id === m.id ? '0 8px 24px rgba(6,70,140,0.18)' : '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 12 }}><Ico name={m.icon} size={36} /></div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: '#211d17', marginBottom: 6 }}>{m.nombre}</h4>
                  <p style={{ fontSize: 12, color: '#6f6b62', lineHeight: 1.5, marginBottom: 14 }}>{m.descripcion}</p>
                  <span style={{ fontSize: 11, background: '#eef7ff', color: '#04295f', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
                    {m.programas} Programas Disponibles
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 1: PROGRAMA                                          */}
        {/* ========================================================= */}
        {paso === 1 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#211d17', marginBottom: 6 }}>2. Selecciona tu Programa Académico</h3>
            <p style={{ fontSize: 13, color: '#6f6b62', marginBottom: 6 }}>Mostrando carreras en la modalidad: <strong>{modalidad.nombre}</strong></p>
            <p style={{ fontSize: 12, color: '#0a5cae', marginBottom: 20, fontWeight: 600 }}>
              Haz doble clic en el programa para seleccionarlo y continuar a las materias.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {programasFiltrados.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectPrograma(p)}
                  onDoubleClick={() => { selectPrograma(p); setPaso(2); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); selectPrograma(p); } }}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    border: `2px solid ${programa?.id === p.id ? '#0a5cae' : '#e5e2da'}`,
                    boxShadow: programa?.id === p.id ? '0 8px 24px rgba(6,70,140,0.18)' : '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}><Ico name={p.icon} size={32} /></div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#211d17', margin: 0 }}>{p.nombre}</h4>
                  <div style={{ fontSize: 12, color: '#6f6b62', margin: '4px 0 12px' }}>{p.facultad}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, background: '#f0eee9', color: '#4e4a43', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      {p.semestres} Semestres
                    </span>
                    <span style={{ fontSize: 10, background: '#f0eee9', color: '#4e4a43', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      {p.jornada}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-start' }}>
              <button
                onClick={() => setPaso(0)}
                style={{ background: '#fff', border: '1px solid #cdc9bf', padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                ← Atrás
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
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#211d17', margin: 0 }}>3. Selecciona tus Asignaturas</h3>
                <p style={{ fontSize: 13, color: '#6f6b62', margin: '4px 0 0' }}>Haz clic en las materias disponibles para agregarlas a tu carga académica</p>
              </div>

              {/* Selector de Semestre */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6f6b62' }}>Semestre:</span>
                {Array.from({ length: programa?.semestres || 10 }, (_, i) => i + 1).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSemestre(s)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${semestre === s ? '#0a5cae' : '#cdc9bf'}`,
                      background: semestre === s ? '#eef7ff' : '#fff',
                      color: semestre === s ? '#0a5cae' : '#4e4a43',
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
                      background: isCursada ? '#f7f6f3' : '#fff',
                      borderRadius: 14,
                      padding: 18,
                      border: `2px solid ${isSelected ? '#0a5cae' : '#e5e2da'}`,
                      boxShadow: isSelected ? '0 6px 18px rgba(6,70,140,0.14)' : 'none',
                      cursor: isCursada || isBlocked ? 'not-allowed' : 'pointer',
                      opacity: isCursada ? 0.65 : 1,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0a5cae', background: '#eef7ff', padding: '2px 8px', borderRadius: 6 }}>
                        {m.codigo}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isSelected ? '#d8f0e5' : (isCursada ? '#f0eee9' : '#f7f6f3'),
                        color: isSelected ? '#0a6e4b' : '#6f6b62'
                      }}>
                        {isSelected ? <><Icon name="check" size={14} /> Seleccionada</> : (isCursada ? 'Ya cursada' : `${m.creditos} Créditos`)}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 15, fontWeight: 800, color: '#211d17', marginBottom: 4 }}>{m.nombre}</h4>
                    <div style={{ fontSize: 12, color: '#6f6b62', marginBottom: 8 }}>Profesor: {m.profesor}</div>

                    <div style={{ fontSize: 11, color: '#4e4a43', background: '#f7f6f3', padding: '6px 10px', borderRadius: 8 }}>
                      <Icon name="reloj" size={16} /> Horarios: {m.horarios?.join(', ') || 'Por definir'}
                    </div>

                    {m.prerrequisito && (
                      <div style={{ fontSize: 10, color: '#e0a52e', marginTop: 6 }}>
                        <Icon name="alerta" size={14} /> Prerrequisito: {m.prerrequisito}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setPaso(1)}
                style={{ background: '#fff', border: '1px solid #cdc9bf', padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
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
                style={{ background: '#00116f', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
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
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#211d17', marginBottom: 6 }}>4. Verificación de Horario</h3>
            <p style={{ fontSize: 13, color: '#6f6b62', marginBottom: 20 }}>Comprueba que no existan traslapes o cruces en tu franja académica</p>

            <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((dia) => (
                  <div key={dia} style={{ background: '#f7f6f3', borderRadius: 12, padding: 14, border: '1px solid #e5e2da', minHeight: 200 }}>
                    <div style={{ fontWeight: 800, color: '#00116f', fontSize: 13, marginBottom: 12, borderBottom: '1px solid #cdc9bf', paddingBottom: 6 }}>
                      {dia}
                    </div>
                    {materiasSeleccionadasObj.map((m) => {
                      const tieneClase = m.horarios?.some(h => h.toLowerCase().startsWith(dia.toLowerCase().slice(0, 3)));
                      if (!tieneClase) return null;
                      return (
                        <div key={m.id} style={{ background: '#eef7ff', borderLeft: '3px solid #0a5cae', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#04295f' }}>{m.codigo}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#211d17' }}>{m.nombre}</div>
                          <div style={{ fontSize: 10, color: '#6f6b62' }}>{m.horarios?.find(h => h.toLowerCase().startsWith(dia.toLowerCase().slice(0, 3)))}</div>
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
                style={{ background: '#fff', border: '1px solid #cdc9bf', padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                ← Modificar Materias
              </button>
              <button
                onClick={() => setPaso(4)}
                style={{ background: '#00116f', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
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
                  <div style={{ fontSize: 56, marginBottom: 12 }}></div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: '#17a06d', marginBottom: 8 }}>¡Matrícula Exitosa!</h3>
                  <p style={{ fontSize: 13, color: '#6f6b62', maxWidth: 440, margin: '0 auto 24px' }}>
                    Tus materias han sido inscritas en el sistema académico. Tu horario oficial ya se encuentra disponible en tu Dashboard.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                      background: '#00116f',
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
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #e5e2da', paddingBottom: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}><Icon name="edificio" size={16} /></div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#211d17', margin: 0 }}>Comprobante de Pre-Matrícula</h3>
                    <p style={{ fontSize: 12, color: '#6f6b62', margin: '4px 0 0' }}>Periodo Académico: 2026-2</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#6f6b62' }}>Estudiante:</span>
                      <div style={{ fontWeight: 700 }}>{user?.name}</div>
                    </div>
                    <div>
                      <span style={{ color: '#6f6b62' }}>Código / Documento:</span>
                      <div style={{ fontWeight: 700 }}>{user?.code}</div>
                    </div>
                    <div>
                      <span style={{ color: '#6f6b62' }}>Programa:</span>
                      <div style={{ fontWeight: 700 }}>{programa?.nombre}</div>
                    </div>
                    <div>
                      <span style={{ color: '#6f6b62' }}>Total Créditos:</span>
                      <div style={{ fontWeight: 800, color: '#0a5cae' }}>{creditosSeleccionados} Créditos</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f0eee9', paddingTop: 16, marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Asignaturas Registradas ({materiasSeleccionadasObj.length}):</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {materiasSeleccionadasObj.map((m) => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: '#f7f6f3', padding: '8px 12px', borderRadius: 8 }}>
                          <span><strong>{m.codigo}</strong> — {m.nombre}</span>
                          <span style={{ fontWeight: 700, color: '#00116f' }}>{m.creditos} CR</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e5e2da', paddingTop: 16, marginBottom: 24 }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#6f6b62' }}>Valor Estimado de Matrícula:</span>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#17a06d' }}>{formatCurrency(3950000)}</div>
                    </div>
                    <button
                      onClick={() => alert('Generando volante de pago oficial en PDF...')}
                      style={{ background: '#f0eee9', border: '1px solid #cdc9bf', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Icon name="imprimir" size={16} /> Imprimir Volante
                    </button>
                  </div>

                  {errorMatricula && (
                    <div style={{ background: '#fdecec', color: '#b02a2a', border: '1px solid #f2c4c4', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                      <Icon name="alerta" size={14} /> {errorMatricula}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setPaso(3)}
                      style={{ flex: 1, background: '#fff', border: '1px solid #cdc9bf', padding: '12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ← Volver a Horario
                    </button>
                    <button
                      onClick={confirmarMatricula}
                      disabled={guardandoMatricula}
                      style={{ flex: 2, background: '#17a06d', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 800, cursor: guardandoMatricula ? 'wait' : 'pointer', opacity: guardandoMatricula ? 0.7 : 1 }}
                    >
                      {guardandoMatricula ? 'Registrando…' : <>Confirmar y Registrar Matrícula <Icon name="check" size={14} /></>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
