/* =============================================
   Panel de inicio para roles administrativos.
   Los roles que no son estudiante/profesor no
   tienen notas, cursos ni tareas: su portada debe
   mostrar sus propios indicadores y, sobre todo,
   accesos que sí lleven a una pantalla real.
   ============================================= */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../data/mockData';
import { cartera, estadoCuenta } from '../data/registro';

const TONES = {
  slate:  ['#f1f5f9', '#475569'],
  green:  ['#dcfce7', '#15803d'],
  amber:  ['#fef3c7', '#b45309'],
  red:    ['#fee2e2', '#b91c1c'],
  blue:   ['#dbeafe', '#1d4ed8'],
  purple: ['#ede9fe', '#6d28d9'],
};

const Badge = ({ children, tone = 'slate' }) => {
  const [bg, fg] = TONES[tone] || TONES.slate;
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{children}</span>;
};

const Kpi = ({ icon, bg, value, label, hint, color, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16,
        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%',
        fontFamily: 'inherit', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</div>}
      </div>
    </Tag>
  );
};

const Tarjeta = ({ titulo, children, accion }) => (
  <div className="card">
    <div className="card-hd">
      <span className="card-ttl">{titulo}</span>
      {accion}
    </div>
    {children}
  </div>
);

const Fila = ({ titulo, valor, tone }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
    <span style={{ color: '#475569', minWidth: 0 }}>{titulo}</span>
    {tone ? <Badge tone={tone}>{valor}</Badge> : <strong style={{ whiteSpace: 'nowrap' }}>{valor}</strong>}
  </div>
);

/* =============================================
   Contenido por rol
   ============================================= */

function PanelAdmisiones({ data, go }) {
  const adm = data.admisiones;
  const est = data.estudiantes;
  const totales = cartera(est);
  const inscritos = est.filter((e) => e.estado === 'en_inscripcion');
  const enMora = est.filter((e) => estadoCuenta(e).key === 'mora');
  const proceso = adm.periodos.find((p) => p.estado === 'inscripciones') || adm.periodos[0];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>
        <Kpi icon="👥" bg="#dbeafe" value={adm.aspirantes.length} label="Aspirantes" hint={`${adm.aspirantes.filter((a) => a.estado === 'en_proceso').length} en revisión`} onClick={() => go('/admisiones', 'aspirantes')} />
        <Kpi icon="🎓" bg="#dcfce7" value={adm.aspirantes.filter((a) => a.estado === 'admitido').length} label="Admitidos" color="#15803d" onClick={() => go('/admisiones', 'registro')} />
        <Kpi icon="📝" bg="#fef3c7" value={inscritos.length} label="Por matricular" color="#b45309" onClick={() => go('/admisiones', 'registro')} />
        <Kpi icon="💳" bg="#fee2e2" value={formatCurrency(totales.pendiente + totales.vencido)} label="Saldo por cobrar" color="#b91c1c" hint={`${enMora.length} en mora`} onClick={() => go('/admisiones', 'cuenta')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="⚡ Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Aspirantes', ic: '👥', c: '#3b82f6', to: 'aspirantes' },
              { l: 'Procesos', ic: '🗓️', c: '#0d9488', to: 'procesos' },
              { l: 'Documentos', ic: '📎', c: '#ea580c', to: 'documentos' },
              { l: 'Registro', ic: '🎓', c: '#4338ca', to: 'registro' },
              { l: 'Expedientes', ic: '📁', c: '#7c3aed', to: 'expedientes' },
              { l: 'Estado de cuenta', ic: '💳', c: '#059669', to: 'cuenta' },
              { l: 'Certificados', ic: '📜', c: '#d97706', to: 'certificados' },
              { l: 'Reportes', ic: '📈', c: '#db2777', to: 'reportes' },
            ].map((x) => (
              <button key={x.to} className="qa-btn" onClick={() => go('/admisiones', x.to)}>
                <div className="qa-ic" style={{ background: x.c }}>{x.ic}</div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>

        <div>
          <Tarjeta titulo="🗓️ Proceso vigente">
            <div style={{ padding: '0 16px 8px' }}>
              <Fila titulo="Convocatoria" valor={proceso.nombre} />
              <Fila titulo="Cierre de inscripciones" valor={formatDate(proceso.fechaCierre)} />
              <Fila titulo="Resultados" valor={formatDate(proceso.fechaResultados)} />
              <Fila titulo="Inscripción de admitidos" valor={formatDate(proceso.fechaInscripcion)} />
              <Fila titulo="Cupos ofertados" valor={proceso.cuposTotales.toLocaleString('es-CO')} />
            </div>
          </Tarjeta>

          <Tarjeta titulo="🔔 Pendientes" accion={<button className="btn b-outline b-sm" onClick={() => go('/admisiones', 'resumen')}>Ver todo</button>}>
            <div style={{ padding: '0 16px 8px' }}>
              {[
                { t: 'Documentos por revisar', d: adm.aspirantes.filter((a) => a.documentos !== 'completo').length, tone: 'red', tab: 'documentos' },
                { t: 'Aspirantes sin decisión', d: adm.aspirantes.filter((a) => a.estado === 'en_proceso').length, tone: 'amber', tab: 'aspirantes' },
                { t: 'Admitidos por matricular', d: inscritos.length, tone: 'blue', tab: 'registro' },
                { t: 'Certificados en trámite', d: data.certificadosEmitidos.filter((c) => c.estado === 'solicitado' || c.estado === 'en_proceso').length, tone: 'purple', tab: 'certificados' },
              ].map((x) => (
                <div
                  key={x.t}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}
                >
                  <span style={{ fontSize: 13, color: '#475569' }}>{x.t}</span>
                  <Badge tone={x.tone}>{x.d}</Badge>
                </div>
              ))}
            </div>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}

function PanelAdmin({ data, go }) {
  const programas = data.matricula.programas;
  const docentes = data.docentes;
  const est = data.estudiantes;
  const matriculados = programas.reduce((a, p) => a + p.matriculados, 0);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>
        <Kpi icon="📚" bg="#dbeafe" value={programas.length} label="Programas" onClick={() => go('/admin', 'programas')} />
        <Kpi icon="👨‍🏫" bg="#dcfce7" value={docentes.length} label="Docentes" color="#15803d" onClick={() => go('/admin', 'docentes')} />
        <Kpi icon="🎓" bg="#ede9fe" value={matriculados.toLocaleString('es-CO')} label="Matriculados" onClick={() => go('/admin', 'matricula')} />
        <Kpi icon="👥" bg="#fef3c7" value={est.length} label="Expedientes en registro" onClick={() => go('/admisiones', 'expedientes')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="⚡ Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Panel de Admin', ic: '🛠️', c: '#3b82f6', to: '/admin' },
              { l: 'Programas', ic: '📚', c: '#059669', to: '/admin', tab: 'programas' },
              { l: 'Docentes', ic: '👨‍🏫', c: '#7c3aed', to: '/admin', tab: 'docentes' },
              { l: 'Matrícula', ic: '🎓', c: '#4338ca', to: '/admin', tab: 'matricula' },
              { l: 'Finanzas', ic: '💰', c: '#d97706', to: '/admin', tab: 'finanzas' },
              { l: 'Admisiones', ic: '🎓', c: '#0d9488', to: '/admisiones' },
              { l: 'Consultar Pensum', ic: '📖', c: '#db2777', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}>{x.ic}</div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo="🏛️ Instituciones">
          <div style={{ padding: '0 16px 8px' }}>
            {data.matricula.modalidades.map((m) => (
              <Fila key={m.id} titulo={m.nombre} valor={`${m.programas} programas`} />
            ))}
          </div>
        </Tarjeta>
      </div>
    </>
  );
}

function PanelRectoria({ data, go }) {
  const proyectos = data.proyectos;
  const programas = data.matricula.programas;
  const presupuesto = proyectos.reduce((a, p) => a + p.presupuesto, 0);
  const ejecutado = proyectos.reduce((a, p) => a + p.ejecutado, 0);
  const avance = presupuesto ? Math.round((ejecutado / presupuesto) * 100) : 0;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>
        <Kpi icon="📊" bg="#dbeafe" value={`${avance}%`} label="Ejecución del plan" onClick={() => go('/rectoria', 'indicadores')} />
        <Kpi icon="💰" bg="#dcfce7" value={formatCurrency(presupuesto)} label="Presupuesto aprobado" color="#15803d" onClick={() => go('/rectoria', 'sostenibilidad')} />        <Kpi icon="📚" bg="#ede9fe" value={programas.length} label="Oferta académica" onClick={() => go('/rectoria', 'programas')} />
        <Kpi icon="🎯" bg="#fef3c7" value={proyectos.length} label="Proyectos vigentes" onClick={() => go('/rectoria', 'sostenibilidad')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="⚡ Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Indicadores', ic: '📊', c: '#3b82f6', to: '/rectoria', tab: 'indicadores' },
              { l: 'Oferta académica', ic: '📚', c: '#059669', to: '/rectoria', tab: 'programas' },
              { l: 'Admisiones', ic: '🎓', c: '#0d9488', to: '/rectoria', tab: 'admisiones' },
              { l: 'Sostenibilidad', ic: '💰', c: '#d97706', to: '/rectoria', tab: 'sostenibilidad' },
              { l: 'Consultar Pensum', ic: '📖', c: '#db2777', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}>{x.ic}</div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo="🌱 Sostenibilidad">
          <div style={{ padding: '0 16px 8px' }}>
            {proyectos.map((p) => (
              <Fila key={p.id} titulo={p.nombre} valor={`${p.avance}%`} />
            ))}
          </div>
        </Tarjeta>
      </div>
    </>
  );
}

function PanelTalentoHumano({ data, go }) {
  const emp = data.empleados;
  const docentes = data.docentes;
  const nomina = emp.reduce((a, e) => a + e.salario, 0);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>
        <Kpi icon="👨‍🏫" bg="#dbeafe" value={docentes.length} label="Planta docente" onClick={() => go('/talento-humano', 'planta')} />
        <Kpi icon="🧑‍💼" bg="#dcfce7" value={emp.length} label="Servidores públicos" color="#15803d" onClick={() => go('/talento-humano', 'planta')} />
        <Kpi icon="💵" bg="#fef3c7" value={formatCurrency(nomina)} label="Nómina mensual" onClick={() => go('/talento-humano', 'carga')} />
        <Kpi icon="📚" bg="#ede9fe" value={new Set(docentes.map((d) => d.area)).size} label="Áreas académicas" onClick={() => go('/talento-humano', 'areas')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="⚡ Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Planta docente', ic: '👨‍🏫', c: '#3b82f6', to: '/talento-humano', tab: 'planta' },
              { l: 'Carga académica', ic: '⚖️', c: '#059669', to: '/talento-humano', tab: 'carga' },
              { l: 'Áreas', ic: '📚', c: '#7c3aed', to: '/talento-humano', tab: 'areas' },
              { l: 'Consultar Pensum', ic: '📖', c: '#db2777', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}>{x.ic}</div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo="🗂️ Distribución">
          <div style={{ padding: '0 16px 8px' }}>
            {['planta', 'administrativo', 'hora_catedra'].map((t) => (
              <Fila key={t} titulo={t === 'hora_catedra' ? 'Hora cátedra' : t === 'planta' ? 'Planta' : 'Administrativos'} valor={emp.filter((e) => e.tipo === t).length} />
            ))}
            {emp.filter((e) => e.estado !== 'activo').map((e) => (
              <Fila key={e.id} titulo={e.nombre} valor={e.estado} tone="amber" />
            ))}
          </div>
        </Tarjeta>
      </div>
    </>
  );
}

function PanelContabilidad({ data, go }) {
  const mov = data.movimientos;
  const ingresos = mov.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.valor, 0);
  const egresos = mov.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + m.valor, 0);
  const totales = cartera(data.estudiantes);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>
        <Kpi icon="📈" bg="#dcfce7" value={formatCurrency(ingresos)} label="Ingresos del periodo" color="#15803d" onClick={() => go('/contabilidad', 'recaudo')} />
        <Kpi icon="📉" bg="#fee2e2" value={formatCurrency(egresos)} label="Egresos del periodo" color="#b91c1c" onClick={() => go('/contabilidad', 'conciliacion')} />
        <Kpi icon="💰" bg="#dbeafe" value={formatCurrency(ingresos - egresos)} label="Resultado" onClick={() => go('/contabilidad', 'conciliacion')} />
        <Kpi icon="📋" bg="#fef3c7" value={formatCurrency(totales.pendiente + totales.vencido)} label="Cartera de estudiantes" color="#b45309" onClick={() => go('/admisiones', 'cuenta')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="⚡ Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Recaudo', ic: '💰', c: '#059669', to: '/contabilidad', tab: 'recaudo' },
              { l: 'Cartera', ic: '📋', c: '#d97706', to: '/contabilidad', tab: 'cartera' },
              { l: 'Conciliación', ic: '✅', c: '#3b82f6', to: '/contabilidad', tab: 'conciliacion' },
              { l: 'Estado de cuenta', ic: '💳', c: '#4338ca', to: '/admisiones', tab: 'cuenta' },
              { l: 'Consultar Pensum', ic: '📖', c: '#db2777', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}>{x.ic}</div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo="📄 Últimos movimientos">
          <div style={{ padding: '0 16px 8px' }}>
            {mov.slice(0, 5).map((m) => (
              <Fila key={m.id} titulo={m.concepto} valor={formatCurrency(m.valor)} tone={m.tipo === 'ingreso' ? 'green' : 'red'} />
            ))}
          </div>
        </Tarjeta>
      </div>
    </>
  );
}

const PANELES = {
  admisiones: PanelAdmisiones,
  admin: PanelAdmin,
  rectoria: PanelRectoria,
  talento_humano: PanelTalentoHumano,
  contabilidad: PanelContabilidad,
};

/** ¿Este rol necesita un panel administrativo propio? */
export const tienePanelPropio = (role) => Boolean(PANELES[role]);

export default function PanelInicio({ role, data, hero }) {
  const navigate = useNavigate();
  const Panel = PANELES[role];

  const go = (to, tab) =>
    navigate(tab ? `${to}?tab=${tab}` : to);

  if (!Panel) return null;

  return (
    <>
      {hero}
      <Panel data={data} go={go} />
    </>
  );
}
