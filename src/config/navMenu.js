/* =============================================
   Men� de navegaci�n por rol.
   Fuente �nica de verdad: el Sidebar no decide
   qu� ve cada usuario, solo dibuja esta lista.
   ============================================= */

// kind: 'view'  -> delega en el onNavigate del m�dulo actual (Dashboard)
// kind: 'route' -> navega a otra ruta del SPA
export const NAV_MENU = [
  {
    section: 'Principal',
    items: [
      { key: 'home', label: 'Inicio', icon: '📋', kind: 'view', view: 'home', roles: '*' },
    ],
  },
  {
    section: 'Acad�mico',
    items: [
      { key: 'notas', label: 'Mis Notas', icon: '?', kind: 'view', view: 'academico', tab: 'notas', roles: ['estudiante'] },
      { key: 'certificados', label: 'Certificados', icon: '📋', kind: 'view', view: 'academico', tab: 'certificados', roles: ['estudiante', 'profesor'] },
      { key: 'pagos', label: 'Pagos / Volante', icon: '📋', kind: 'view', view: 'academico', tab: 'pagos', roles: ['estudiante'] },
      { key: 'horario', label: 'Mi Horario', icon: '📋', kind: 'view', view: 'academico', tab: 'horario', roles: ['estudiante'] },
      { key: 'registro_notas', label: 'Registro Notas', icon: '📋', kind: 'route', to: '/docente', tab: 'notas', roles: ['profesor'] },
    ],
  },
  {
    section: 'Campus Virtual',
    items: [
      { key: 'cursos', label: 'Mis Cursos', icon: '📋', kind: 'view', view: 'lms', tab: 'cursos', roles: ['estudiante', 'profesor'] },
      /* Para el estudiante es la lista de lo que tiene por entregar. Para el
         docente es lo contrario: lo que recibio y tiene que revisar y
         calificar. Son dos trabajos distintos y no pueden llamarse igual. */
      { key: 'tareas', label: 'Tareas', icon: '?', kind: 'view', view: 'lms', tab: 'tareas', badge: 2, roles: ['estudiante'] },
      { key: 'tareas', label: 'Por Calificar', icon: '📋', kind: 'view', view: 'lms', tab: 'tareas', roles: ['profesor'] },
      { key: 'recursos', label: 'Recursos', icon: '📋', kind: 'view', view: 'lms', tab: 'recursos', roles: ['estudiante', 'profesor'] },
    ],
  },
  {
    section: 'Matr�cula',
    items: [
      { key: 'matricular', label: 'Matricular Materias', icon: '📋', kind: 'route', to: '/matricula', roles: ['estudiante'] },
      { key: 'consultar_pensum', label: 'Consultar Pensum', icon: '📋', kind: 'route', to: '/pensum', roles: ['admisiones'] },
    ],
  },
  {
    section: 'Admisiones y Registro',
    items: [
      { key: 'adm_resumen', label: 'Resumen', icon: '📋', kind: 'route', to: '/admisiones', tab: 'resumen', roles: ['admisiones'] },
      { key: 'adm_aspirantes', label: 'Aspirantes', icon: '📋', kind: 'route', to: '/admisiones', tab: 'aspirantes', roles: ['admisiones'] },
      { key: 'adm_procesos', label: 'Procesos', icon: '???', kind: 'route', to: '/admisiones', tab: 'procesos', roles: ['admisiones'] },
      { key: 'adm_documentos', label: 'Documentos', icon: '📋', kind: 'route', to: '/admisiones', tab: 'documentos', roles: ['admisiones'] },
      { key: 'adm_registro', label: 'Registro', icon: '📋', kind: 'route', to: '/admisiones', tab: 'registro', roles: ['admisiones'] },
      { key: 'adm_expedientes', label: 'Expedientes', icon: '📋', kind: 'route', to: '/admisiones', tab: 'expedientes', roles: ['admisiones'] },
      { key: 'adm_cuenta', label: 'Estado de cuenta', icon: '📋', kind: 'route', to: '/admisiones', tab: 'cuenta', roles: ['admisiones'] },
      { key: 'adm_certificados', label: 'Certificados', icon: '📋', kind: 'route', to: '/admisiones', tab: 'certificados', roles: ['admisiones'] },
      { key: 'adm_reportes', label: 'Reportes', icon: '📋', kind: 'route', to: '/admisiones', tab: 'reportes', roles: ['admisiones'] },
    ],
  },
  {
    section: 'Administraci�n',
    items: [
      { key: 'rectoria', label: 'Rector�a e Indicadores', icon: '???', kind: 'route', to: '/rectoria', roles: ['rectoria'] },
      { key: 'docente', label: 'Mi C�tedra', icon: '?????', kind: 'route', to: '/docente', roles: ['profesor'] },
    ],
  },
  {
    section: 'Panel de Administraci�n',
    items: [
      { key: 'admin_resumen', label: 'Resumen', icon: '📋', kind: 'route', to: '/admin', tab: 'resumen', roles: ['admin'] },
      { key: 'admin_usuarios', label: 'Usuarios', icon: '📋', kind: 'route', to: '/admin', tab: 'usuarios', roles: ['admin'] },
      { key: 'admin_estudiantes', label: 'Estudiantes', icon: '📋', kind: 'route', to: '/admin', tab: 'estudiantes', roles: ['admin'] },
      { key: 'admin_programas', label: 'Programas', icon: '📋', kind: 'route', to: '/admin', tab: 'programas', roles: ['admin'] },
      { key: 'admin_pensum', label: 'Pensum', icon: '📋', kind: 'route', to: '/admin', tab: 'pensum', roles: ['admin'] },
      { key: 'admin_docentes', label: 'Docentes', icon: '?????', kind: 'route', to: '/admin', tab: 'docentes', roles: ['admin'] },
      { key: 'admin_asignacion', label: 'Asignaci�n docente', icon: '📋', kind: 'route', to: '/admin', tab: 'asignacion', roles: ['admin'] },
      { key: 'admin_matricula', label: 'Matr�cula', icon: '📋', kind: 'route', to: '/admin', tab: 'matricula', roles: ['admin'] },
    ],
  },
  {
    section: 'Talento Humano',
    items: [
      { key: 'th_planta', label: 'Planta docente', icon: '?????', kind: 'route', to: '/talento-humano', tab: 'planta', roles: ['talento_humano'] },
      { key: 'th_convocatorias', label: 'Convocatorias', icon: '📋', kind: 'route', to: '/talento-humano', tab: 'convocatorias', roles: ['talento_humano'] },
      { key: 'th_capacitaciones', label: 'Capacitaciones', icon: '📋', kind: 'route', to: '/talento-humano', tab: 'capacitaciones', roles: ['talento_humano'] },
      { key: 'th_carga', label: 'Carga acad�mica', icon: '📋', kind: 'route', to: '/talento-humano', tab: 'carga', roles: ['talento_humano'] },
      { key: 'th_areas', label: '�reas', icon: '???', kind: 'route', to: '/talento-humano', tab: 'areas', roles: ['talento_humano'] },
      { key: 'th_nomina', label: 'N�mina', icon: '📋', kind: 'route', to: '/talento-humano', tab: 'nomina', roles: ['talento_humano'] },
      { key: 'th_novedades', label: 'Novedades', icon: '📋', kind: 'route', to: '/talento-humano', tab: 'novedades', roles: ['talento_humano'] },
      { key: 'th_certificados', label: 'Certificados', icon: '📋', kind: 'route', to: '/talento-humano', tab: 'certificados', roles: ['talento_humano'] },
    ],
  },
  {
    section: 'Contabilidad',
    items: [
      { key: 'con_recaudo', label: 'Recaudo', icon: '📋', kind: 'route', to: '/contabilidad', tab: 'recaudo', roles: ['contabilidad'] },
      { key: 'con_cartera', label: 'Cartera', icon: '📋', kind: 'route', to: '/contabilidad', tab: 'cartera', roles: ['contabilidad'] },
      { key: 'con_conciliacion', label: 'Conciliaci�n', icon: '📋', kind: 'route', to: '/contabilidad', tab: 'conciliacion', roles: ['contabilidad'] },
      { key: 'con_egresos', label: 'Egresos', icon: '📋', kind: 'route', to: '/contabilidad', tab: 'egresos', roles: ['contabilidad'] },
      { key: 'con_nomina', label: 'N?mina', icon: '📋', kind: 'route', to: '/contabilidad', tab: 'nomina', roles: ['contabilidad'] },
            { key: 'con_novedades', label: 'Novedades', icon: '📋', kind: 'route', to: '/contabilidad', tab: 'novedades', roles: ['contabilidad'] },
      { key: 'con_nomina', label: 'N?mina', icon: '📋', kind: 'route', to: '/contabilidad', tab: 'nomina', roles: ['contabilidad'] },
    ],
  },
  {
    section: 'Personal',
    items: [
      { key: 'perfil', label: 'Mi Perfil', icon: '📋', kind: 'view', view: 'perfil', roles: '*' },
    ],
  },
];

export const menuForRole = (role) =>
  NAV_MENU
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((i) => i.roles === '*' || i.roles.includes(role)),
    }))
    .filter((sec) => sec.items.length > 0);

/* Pesta�a que muestra cada m�dulo cuando se entra sin ?tab=.
   El Sidebar la necesita para resaltar el �tem correcto en /admisiones. */
export const TAB_POR_DEFECTO = {
  '/admisiones': 'resumen',
  '/admin': 'resumen',
  '/rectoria': 'indicadores',
  '/docente': 'cursos',
  '/talento-humano': 'planta',
  '/contabilidad': 'recaudo',
};

export const NAV_SEC_STYLE = {
  padding: '8px 20px 3px',
  color: 'rgba(255,255,255,.4)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
};
