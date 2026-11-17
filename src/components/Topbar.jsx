import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { menuForRole } from '../config/navMenu';
import Icon from './Icon';

/* Diccionario de sinónimos y palabras clave por clave de ítem del menú */
const KEYWORDS_BY_KEY = {
  home: ['inicio', 'principal', 'dashboard', 'resumen', 'estado'],
  documentos_ingreso: ['documentos', 'requisitos', 'cedula', 'cédula', 'icfes', 'bachillerato', 'ingreso', 'admision', 'admisión', 'subir', 'archivos', 'inscripcion', 'inscripción'],
  notas: ['notas', 'calificaciones', 'promedio', 'corte', 'parcial', 'definitiva', 'materia'],
  certificados: ['certificado', 'certificados', 'constancia', 'estudios', 'paz y salvo', 'tramite', 'trámite'],
  pagos: ['pagos', 'pago', 'volante', 'factura', 'deuda', 'arancel', 'recibo', 'banco'],
  horario: ['horario', 'clases', 'dias', 'días', 'horas', 'salon', 'salón'],
  registro_notas: ['registro', 'calificar', 'notas', 'evaluar', 'planillas', 'acta'],
  cursos: ['cursos', 'curso', 'mis cursos', 'asignaturas', 'materias', 'aula', 'campus'],
  tareas: ['tareas', 'tarea', 'entregas', 'actividades', 'taller', 'calificar', 'deberes'],
  recursos: ['recursos', 'material', 'biblioteca', 'lecturas', 'documentos', 'guias', 'guías'],
  matricular: ['matricular', 'matricula', 'matrícula', 'inscribir', 'materias', 'asignaturas', 'semestre', 'pensum'],
  consultar_pensum: ['pensum', 'malla', 'plan de estudios', 'creditos', 'créditos', 'carrera', 'programa'],
  adm_resumen: ['resumen', 'admisiones', 'indicadores', 'convocatoria'],
  adm_aspirantes: ['aspirantes', 'inscritos', 'candidatos', 'postulantes', 'seleccion', 'selección'],
  adm_estudiantes: ['estudiantes', 'alumnos', 'matriculados', 'listado'],
  adm_procesos: ['procesos', 'periodos', 'periodo', 'fechas', 'convocatoria', 'apertura'],
  adm_documentos: ['documentos', 'requisitos', 'validacion', 'validación', 'expedientes'],
  adm_registro: ['registro', 'legalizacion', 'legalización', 'admitidos'],
  adm_expedientes: ['expedientes', 'carpetas', 'historial', 'archivo'],
  adm_cuenta: ['cuenta', 'estado de cuenta', 'cartera', 'saldos', 'cobros'],
  adm_certificados: ['certificados', 'emision', 'emisión', 'solicitudes'],
  adm_reportes: ['reportes', 'informes', 'estadisticas', 'estadísticas'],
  admin_resumen: ['resumen', 'administracion', 'administración', 'panel'],
  admin_usuarios: ['usuarios', 'cuentas', 'accesos', 'claves', 'roles'],
  admin_estudiantes: ['estudiantes', 'alumnos', 'padron', 'padrón'],
  admin_programas: ['programas', 'carreras', 'facultades', 'oferta'],
  admin_cursos: ['cursos', 'secciones', 'grupos', 'aulas'],
  admin_docentes: ['docentes', 'profesores', 'planta', 'profesorado'],
  admin_matricula: ['matricula', 'matrícula', 'cupos', 'inscripcion', 'inscripción'],
  rectoria: ['rectoria', 'rectoría', 'indicadores', 'sostenibilidad', 'proyectos', 'presupuesto'],
  docente: ['catedra', 'cátedra', 'docente', 'mis cursos', 'clases'],
  dir_resumen: ['resumen', 'direccion', 'dirección', 'programa'],
  dir_cursos: ['cursos', 'asignaturas', 'grupos'],
  dir_estudiantes: ['estudiantes', 'alumnos'],
  dir_matricular: ['matricular', 'matricula', 'inscripciones'],
  dir_docentes: ['docentes', 'profesores'],
  th_planta: ['planta', 'docentes', 'empleados', 'personal'],
  th_convocatorias: ['convocatorias', 'vacantes', 'plazas'],
  th_capacitaciones: ['capacitaciones', 'talleres', 'cursos'],
  th_carga: ['carga', 'horas', 'distribucion', 'distribución'],
  th_areas: ['areas', 'áreas', 'departamentos'],
  th_nomina: ['nomina', 'nómina', 'sueldos', 'salarios', 'pagos'],
  th_novedades: ['novedades', 'permisos', 'incapacidades'],
  th_certificados: ['certificados', 'laborales', 'constancias'],
  con_recaudo: ['recaudo', 'ingresos', 'caja', 'pagos'],
  con_cartera: ['cartera', 'mora', 'cobro', 'deudores'],
  con_conciliacion: ['conciliacion', 'conciliación', 'bancos', 'extractos'],
  con_egresos: ['egresos', 'gastos', 'compras', 'facturas'],
  con_nomina: ['nomina', 'nómina', 'pagos', 'seguridad social'],
  con_novedades: ['novedades', 'descuentos', 'ajustes'],
  perfil: ['perfil', 'mi perfil', 'cuenta', 'clave', 'contraseña', 'password', 'foto', 'telefono', 'teléfono', 'correo', 'email', 'direccion', 'dirección', 'datos'],
};

export default function Topbar({ title, subtitle, onNavigate, onToggleSidebar, notifications, onMarkNotifRead, onOpenNotif }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  const unreadCount = notifications ? notifications.filter(n => !n.leida).length : 0;

  /* Construir el catálogo de búsqueda filtrado estrictamente según el perfil/rol actual */
  const searchableItems = useMemo(() => {
    if (!user?.role) return [];
    const menu = menuForRole(user.role, user.estudiante);
    return menu.flatMap(sec => sec.items).map(item => {
      const extraKeywords = KEYWORDS_BY_KEY[item.key] || [];
      return {
        label: item.label,
        key: item.key,
        kind: item.kind,
        view: item.view,
        tab: item.tab,
        to: item.to,
        icon: item.icon,
        keywords: [item.label.toLowerCase(), ...extraKeywords],
      };
    });
  }, [user?.role, user?.estudiante]);

  /* Busca coincidencias en los ítems permitidos del rol */
  const handleSearch = (val) => {
    setSearchVal(val);
    if (!val.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const q = val.toLowerCase().trim();
    const hits = searchableItems.filter((item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((kw) => kw.includes(q) || q.includes(kw))
    );
    setSearchResults(hits);
    setShowSearch(true);
  };

  const handleSelectResult = (item) => {
    if (item.kind === 'route' && item.to) {
      navigate(item.tab ? `${item.to}?tab=${item.tab}` : item.to);
    } else if (onNavigate) {
      onNavigate(item.view, item.tab);
    } else if (item.view) {
      navigate(`/dashboard?view=${item.view}${item.tab ? `&tab=${item.tab}` : ''}`);
    }
    setSearchVal('');
    setSearchResults([]);
    setShowSearch(false);
  };

  /* Cierra el dropdown si se hace clic fuera */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="topbar">
      <div>
        <div className="tb-title">{title}</div>
        {subtitle && <div className="tb-sub">{subtitle}</div>}
      </div>

      <div className="tb-actions">
        {/* Menú lateral en móvil */}
        <button
          type="button"
          className="ic-btn tb-burger"
          onClick={onToggleSidebar}
          aria-label="Abrir menú de navegación"
        >
          <Icon name="menu" size={18} />
        </button>

        {/* Barra de búsqueda con resultados */}
        <div className="tb-search" ref={searchRef} style={{ position: 'relative' }}>
          <Icon name="buscar" size={16} color="#6f6b62" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchVal}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            autoComplete="off"
          />
          {showSearch && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: '#fff', border: '1px solid #e5e2da', borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 200, overflow: 'hidden',
            }}>
              {searchResults.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', border: 'none', background: 'transparent',
                    textAlign: 'left', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                    color: '#211d17',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f6f4ef'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Icon name="buscar" size={14} color="#6f6b62" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {showSearch && searchResults.length === 0 && searchVal.trim() && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: '#fff', border: '1px solid #e5e2da', borderRadius: 10,
              padding: '12px 14px', fontSize: 12, color: '#9c988e',
              boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 200,
            }}>
              Sin resultados para "{searchVal}"
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div style={{ position: 'relative' }}>
          <div className="ic-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <Icon name="campana" size={18} />
            {unreadCount > 0 && <div className="dot" />}
          </div>

          {showNotifs && (
            <div className="notif-panel open" style={{ right: 0, top: 48 }}>
              <div className="notif-head">
                <span>Notificaciones ({unreadCount})</span>
                <button onClick={() => setShowNotifs(false)}>Cerrar</button>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications && notifications.length > 0 ? (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="notif-item"
                      onClick={() => {
                        if (onMarkNotifRead) onMarkNotifRead(n.id);
                        if (onOpenNotif) onOpenNotif(n);
                        setShowNotifs(false);
                      }}
                      style={{ cursor: 'pointer', background: n.leida ? '#fff' : '#eef7ff', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit' }}
                    >
                      <div
                        className="notif-ic"
                        style={{ background: n.tipo === 'success' ? '#d8f0e5' : n.tipo === 'warning' ? '#fbefd6' : '#e3f1ff' }}
                      >
                        {n.tipo === 'success' ? <Icon name="check" size={16} color="#0e8a5f" /> : n.tipo === 'warning' ? <Icon name="alerta" size={16} color="#c77e12" /> : <Icon name="info" size={16} color="#0a5cae" />}
                      </div>
                      <div className="notif-txt flex-1">
                        <p>{n.titulo}</p>
                        <span>{n.msg}</span>
                        <small>{n.tiempo}</small>
                      </div>
                      {!n.leida && <div className="notif-dot" />}
                    </button>
                  ))
                ) : (
                  <div style={{ padding: 18, textAlign: 'center', color: '#9c988e', fontSize: 12 }}>
                    Sin notificaciones
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de usuario — clicable: lleva a Mi Perfil */}
        <button
          type="button"
          className="tb-user"
          onClick={() => onNavigate && onNavigate('perfil')}
          title="Ver mi perfil"
          aria-label={`Ver mi perfil — ${user?.name || 'usuario'}`}
        >
          <div className={`tb-av ${user?.avatarClass || 'av-blue'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, overflow: 'hidden' }}>
            {user?.avatar && (String(user.avatar).startsWith('http') || String(user.avatar).startsWith('data:image')) ? (
              <img src={user.avatar} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className="tb-name">
            {user?.name ? user.name.split(' ')[0] : 'Usuario'}
          </span>
        </button>
      </div>
    </div>
  );
}
