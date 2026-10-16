/* =============================================
   Panel de inicio para roles administrativos.
   Los roles que no son estudiante/profesor no
   tienen notas, cursos ni tareas: su portada debe
   mostrar sus propios indicadores y, sobre todo,
   accesos que sí lleven a una pantalla real.
   ============================================= */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { Ico } from './Icon';
import { formatCurrency, formatDate } from '../data/mockData';
import { cartera, estadoCuenta } from '../data/registro';

const TONES = {
  slate:  ['#f0eee9', '#4e4a43'],
  green:  ['#d8f0e5', '#0a6e4b'],
  amber:  ['#fbefd6', '#99610e'],
  red:    ['#ffe0e5', '#c1122c'],
  blue:   ['#e3f1ff', '#06468c'],
  purple: ['#efe9fb', '#5a37ad'],
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
        background: '#fff', border: '1px solid #e5e2da', borderRadius: 12, padding: 16,
        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%',
        fontFamily: 'inherit', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}><Ico name={icon} size={20} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: color || '#14110c' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6f6b62', fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#9c988e' }}>{hint}</div>}
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
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0eee9', fontSize: 13 }}>
    <span style={{ color: '#4e4a43', minWidth: 0 }}>{titulo}</span>
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
        <Kpi icon="users" bg="#e3f1ff" value={adm.aspirantes.length} label="Aspirantes" hint={`${adm.aspirantes.filter((a) => a.estado === 'en_proceso').length} en revisión`} onClick={() => go('/admisiones', 'aspirantes')} />
        <Kpi icon="graduacion" bg="#d8f0e5" value={adm.aspirantes.filter((a) => a.estado === 'admitido').length} label="Admitidos" color="#0a6e4b" onClick={() => go('/admisiones', 'registro')} />
        <Kpi icon="cuaderno" bg="#fbefd6" value={inscritos.length} label="Por matricular" color="#99610e" onClick={() => go('/admisiones', 'registro')} />
        <Kpi icon="tarjeta-credito" bg="#ffe0e5" value={formatCurrency(totales.pendiente + totales.vencido)} label="Saldo por cobrar" color="#c1122c" hint={`${enMora.length} en mora`} onClick={() => go('/admisiones', 'cuenta')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Aspirantes', ic: 'users', c: '#0a84ff', to: 'aspirantes' },
              { l: 'Procesos', ic: 'calendario-dias', c: '#0e7c86', to: 'procesos' },
              { l: 'Documentos', ic: 'archivo', c: '#c2560f', to: 'documentos' },
              { l: 'Registro', ic: 'graduacion', c: '#0a2fb0', to: 'registro' },
              { l: 'Expedientes', ic: 'carpeta', c: '#6d4ac4', to: 'expedientes' },
              { l: 'Estado de cuenta', ic: 'tarjeta-credito', c: '#0e8a5f', to: 'cuenta' },
              { l: 'Certificados', ic: 'certificado', c: '#c77e12', to: 'certificados' },
              { l: 'Reportes', ic: 'grafica-barras', c: '#c81e63', to: 'reportes' },
            ].map((x) => (
              <button key={x.to} className="qa-btn" onClick={() => go('/admisiones', x.to)}>
                <div className="qa-ic" style={{ background: x.c }}><Ico name={x.ic} size={18} /></div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>

        <div>
          <Tarjeta titulo="Proceso vigente">
            <div style={{ padding: '0 16px 8px' }}>
              <Fila titulo="Convocatoria" valor={proceso.nombre} />
              <Fila titulo="Cierre de inscripciones" valor={formatDate(proceso.fechaCierre)} />
              <Fila titulo="Resultados" valor={formatDate(proceso.fechaResultados)} />
              <Fila titulo="Inscripción de admitidos" valor={formatDate(proceso.fechaInscripcion)} />
              <Fila titulo="Cupos ofertados" valor={proceso.cuposTotales.toLocaleString('es-CO')} />
            </div>
          </Tarjeta>

          <Tarjeta titulo="Pendientes" accion={<button className="btn b-outline b-sm" onClick={() => go('/admisiones', 'resumen')}>Ver todo</button>}>
            <div style={{ padding: '0 16px 8px' }}>
              {[
                { t: 'Documentos por revisar', d: adm.aspirantes.filter((a) => a.documentos !== 'completo').length, tone: 'red', tab: 'documentos' },
                { t: 'Aspirantes sin decisión', d: adm.aspirantes.filter((a) => a.estado === 'en_proceso').length, tone: 'amber', tab: 'aspirantes' },
                { t: 'Admitidos por matricular', d: inscritos.length, tone: 'blue', tab: 'registro' },
                { t: 'Certificados en trámite', d: data.certificadosEmitidos.filter((c) => c.estado === 'solicitado' || c.estado === 'en_proceso').length, tone: 'purple', tab: 'certificados' },
              ].map((x) => (
                <div
                  key={x.t}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid #f0eee9' }}
                >
                  <span style={{ fontSize: 13, color: '#4e4a43' }}>{x.t}</span>
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
        <Kpi icon="libro" bg="#e3f1ff" value={programas.length} label="Programas" onClick={() => go('/admin', 'programas')} />
        <Kpi icon="usuario-config" bg="#d8f0e5" value={docentes.length} label="Docentes" color="#0a6e4b" onClick={() => go('/admin', 'docentes')} />
        <Kpi icon="graduacion" bg="#efe9fb" value={matriculados.toLocaleString('es-CO')} label="Matriculados" onClick={() => go('/admin', 'matricula')} />
        <Kpi icon="users" bg="#fbefd6" value={est.length} label="Expedientes en registro" onClick={() => go('/admisiones', 'expedientes')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Panel de Admin', ic: 'config', c: '#0a84ff', to: '/admin' },
              { l: 'Programas', ic: 'libro', c: '#0e8a5f', to: '/admin', tab: 'programas' },
              { l: 'Docentes', ic: 'usuario-config', c: '#6d4ac4', to: '/admin', tab: 'docentes' },
              { l: 'Matrícula', ic: 'graduacion', c: '#0a2fb0', to: '/admin', tab: 'matricula' },
              { l: 'Finanzas', ic: 'billete', c: '#c77e12', to: '/admin', tab: 'finanzas' },
              { l: 'Admisiones', ic: 'graduacion', c: '#0e7c86', to: '/admisiones' },
              { l: 'Consultar Pensum', ic: 'libro', c: '#c81e63', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}><Ico name={x.ic} size={18} /></div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo="Instituciones">
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
        <Kpi icon="grafica-barras" bg="#e3f1ff" value={`${avance}%`} label="Ejecución del plan" onClick={() => go('/rectoria', 'indicadores')} />
        <Kpi icon="billete" bg="#d8f0e5" value={formatCurrency(presupuesto)} label="Presupuesto aprobado" color="#0a6e4b" onClick={() => go('/rectoria', 'sostenibilidad')} />        <Kpi icon="libro" bg="#efe9fb" value={programas.length} label="Oferta académica" onClick={() => go('/rectoria', 'programas')} />
        <Kpi icon="objetivo" bg="#fbefd6" value={proyectos.length} label="Proyectos vigentes" onClick={() => go('/rectoria', 'sostenibilidad')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Indicadores', ic: <Icon name="grafica-barras" size={16} />, c: '#0a84ff', to: '/rectoria', tab: 'indicadores' },
              { l: 'Oferta académica', ic: 'libro', c: '#0e8a5f', to: '/rectoria', tab: 'programas' },
              { l: 'Admisiones', ic: 'graduacion', c: '#0e7c86', to: '/rectoria', tab: 'admisiones' },
              { l: 'Sostenibilidad', ic: 'billete', c: '#c77e12', to: '/rectoria', tab: 'sostenibilidad' },
              { l: 'Consultar Pensum', ic: 'libro', c: '#c81e63', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}><Ico name={x.ic} size={18} /></div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo={<><Icon name="hoja" size={16} /> Sostenibilidad</>}>
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
        <Kpi icon="usuario-config" bg="#e3f1ff" value={docentes.length} label="Planta docente" onClick={() => go('/talento-humano', 'planta')} />
        <Kpi icon="usuario" bg="#d8f0e5" value={emp.length} label="Servidores públicos" color="#0a6e4b" onClick={() => go('/talento-humano', 'planta')} />
        <Kpi icon="billete" bg="#fbefd6" value={formatCurrency(nomina)} label="Nómina mensual" onClick={() => go('/talento-humano', 'carga')} />
        <Kpi icon="libro" bg="#efe9fb" value={new Set(docentes.map((d) => d.area)).size} label="Áreas académicas" onClick={() => go('/talento-humano', 'areas')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Planta docente', ic: 'usuario-config', c: '#0a84ff', to: '/talento-humano', tab: 'planta' },
              { l: 'Carga académica', ic: <Icon name="balanza" size={16} />, c: '#0e8a5f', to: '/talento-humano', tab: 'carga' },
              { l: 'Áreas', ic: 'libro', c: '#6d4ac4', to: '/talento-humano', tab: 'areas' },
              { l: 'Consultar Pensum', ic: 'libro', c: '#c81e63', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}><Ico name={x.ic} size={18} /></div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo={<><Icon name="carpeta-arbol" size={16} /> Distribución</>}>
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
        <Kpi icon="grafica-barras" bg="#d8f0e5" value={formatCurrency(ingresos)} label="Ingresos del periodo" color="#0a6e4b" onClick={() => go('/contabilidad', 'recaudo')} />
        <Kpi icon="tendencia-abajo" bg="#ffe0e5" value={formatCurrency(egresos)} label="Egresos del periodo" color="#c1122c" onClick={() => go('/contabilidad', 'conciliacion')} />
        <Kpi icon="billete" bg="#e3f1ff" value={formatCurrency(ingresos - egresos)} label="Resultado" onClick={() => go('/contabilidad', 'conciliacion')} />
        <Kpi icon="recibo" bg="#fbefd6" value={formatCurrency(totales.pendiente + totales.vencido)} label="Cartera de estudiantes" color="#99610e" onClick={() => go('/admisiones', 'cuenta')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Tarjeta titulo="Accesos rápidos">
          <div className="qa-grid">
            {[
              { l: 'Recaudo', ic: 'billete', c: '#0e8a5f', to: '/contabilidad', tab: 'recaudo' },
              { l: 'Cartera', ic: 'tarjeta-credito', c: '#c77e12', to: '/contabilidad', tab: 'cartera' },
              { l: 'Conciliación', ic: <Icon name="check" size={16} />, c: '#0a84ff', to: '/contabilidad', tab: 'conciliacion' },
              { l: 'Estado de cuenta', ic: 'tarjeta-credito', c: '#0a2fb0', to: '/admisiones', tab: 'cuenta' },
              { l: 'Consultar Pensum', ic: 'libro', c: '#c81e63', to: '/pensum' },
            ].map((x) => (
              <button key={x.l} className="qa-btn" onClick={() => go(x.to, x.tab)}>
                <div className="qa-ic" style={{ background: x.c }}><Ico name={x.ic} size={18} /></div>
                <span className="qa-lbl">{x.l}</span>
              </button>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo={<><Icon name="archivo" size={16} /> Últimos movimientos</>}>
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
