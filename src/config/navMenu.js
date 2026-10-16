/* =============================================
   Menú de navegación por rol.
   Fuente única de verdad: el Sidebar no decide
   qué ve cada usuario, solo dibuja esta lista.
   ============================================= */

// kind: 'view'  -> delega en el onNavigate del módulo actual (Dashboard)
// kind: 'route' -> navega a otra ruta del SPA
export const NAV_MENU = [
  {
    section: 'Principal',
    items: [
      { key: 'home', label: 'Inicio', icon: 'home', kind: 'view', view: 'home', roles: '*' },
    ],
  },
  {
    section: 'Académico',
    items: [
      { key: 'notas', label: 'Mis Notas', icon: 'notas', kind: 'view', view: 'academico', tab: 'notas', roles: ['estudiante'] },
      { key: 'certificados', label: 'Certificados', icon: 'certificados', kind: 'view', view: 'academico', tab: 'certificados', roles: ['estudiante', 'profesor'] },
      { key: 'pagos', label: 'Pagos / Volante', icon: 'pagos', kind: 'view', view: 'academico', tab: 'pagos', roles: ['estudiante'] },
      { key: 'horario', label: 'Mi Horario', icon: 'horario', kind: 'view', view: 'academico', tab: 'horario', roles: ['estudiante'] },
      { key: 'registro_notas', label: 'Registro Notas', icon: 'registro-notas', kind: 'route', to: '/docente', tab: 'notas', roles: ['profesor'] },
    ],
  },
  {
    section: 'Campus Virtual',
    items: [
      { key: 'cursos', label: 'Mis Cursos', icon: 'cursos', kind: 'view', view: 'lms', tab: 'cursos', roles: ['estudiante', 'profesor'] },
      /* Para el estudiante es la lista de lo que tiene por entregar. Para el
         docente es lo contrario: lo que recibio y tiene que revisar y
         calificar. Son dos trabajos distintos y no pueden llamarse igual. */
      { key: 'tareas', label: 'Tareas', icon: 'tareas', kind: 'view', view: 'lms', tab: 'tareas', badge: 2, roles: ['estudiante'] },
      { key: 'tareas', label: 'Por Calificar', icon: 'tareas-calificar', kind: 'view', view: 'lms', tab: 'tareas', roles: ['profesor'] },
      { key: 'recursos', label: 'Recursos', icon: 'recursos', kind: 'view', view: 'lms', tab: 'recursos', roles: ['estudiante', 'profesor'] },
    ],
  },
  {
    section: 'Matrícula',
    items: [
      { key: 'matricular', label: 'Matricular Materias', icon: 'matricular', kind: 'route', to: '/matricula', roles: ['estudiante'] },
      { key: 'consultar_pensum', label: 'Consultar Pensum', icon: 'pensum', kind: 'route', to: '/pensum', roles: ['admisiones'] },
    ],
  },
  {
    section: 'Admisiones y Registro',
    items: [
      { key: 'adm_resumen', label: 'Resumen', icon: 'adm-resumen', kind: 'route', to: '/admisiones', tab: 'resumen', roles: ['admisiones'] },
      { key: 'adm_aspirantes', label: 'Aspirantes', icon: 'adm-aspirantes', kind: 'route', to: '/admisiones', tab: 'aspirantes', roles: ['admisiones'] },
      { key: 'adm_procesos', label: 'Procesos', icon: 'adm-procesos', kind: 'route', to: '/admisiones', tab: 'procesos', roles: ['admisiones'] },
      { key: 'adm_documentos', label: 'Documentos', icon: 'adm-documentos', kind: 'route', to: '/admisiones', tab: 'documentos', roles: ['admisiones'] },
      { key: 'adm_registro', label: 'Registro', icon: 'adm-registro', kind: 'route', to: '/admisiones', tab: 'registro', roles: ['admisiones'] },
      { key: 'adm_expedientes', label: 'Expedientes', icon: 'adm-expedientes', kind: 'route', to: '/admisiones', tab: 'expedientes', roles: ['admisiones'] },
      { key: 'adm_cuenta', label: 'Estado de cuenta', icon: 'adm-cuenta', kind: 'route', to: '/admisiones', tab: 'cuenta', roles: ['admisiones'] },
      { key: 'adm_certificados', label: 'Certificados', icon: 'adm-certificados', kind: 'route', to: '/admisiones', tab: 'certificados', roles: ['admisiones'] },
      { key: 'adm_reportes', label: 'Reportes', icon: 'adm-reportes', kind: 'route', to: '/admisiones', tab: 'reportes', roles: ['admisiones'] },
    ],
  },
  {
    section: 'Administración',
    items: [
      { key: 'rectoria', label: 'Rectoría e Indicadores', icon: 'rectoria', kind: 'route', to: '/rectoria', roles: ['rectoria'] },
      { key: 'docente', label: 'Mi Cátedra', icon: 'docente', kind: 'route', to: '/docente', roles: ['profesor'] },
    ],
  },
  {
    section: 'Panel de Administración',
    items: [
      { key: 'admin_resumen', label: 'Resumen', icon: 'admin-resumen', kind: 'route', to: '/admin', tab: 'resumen', roles: ['admin'] },
      { key: 'admin_usuarios', label: 'Usuarios', icon: 'admin-usuarios', kind: 'route', to: '/admin', tab: 'usuarios', roles: ['admin'] },
      { key: 'admin_estudiantes', label: 'Estudiantes', icon: 'admin-estudiantes', kind: 'route', to: '/admin', tab: 'estudiantes', roles: ['admin'] },
      { key: 'admin_programas', label: 'Programas', icon: 'admin-programas', kind: 'route', to: '/admin', tab: 'programas', roles: ['admin'] },
      { key: 'admin_pensum', label: 'Pensum', icon: 'admin-pensum', kind: 'route', to: '/admin', tab: 'pensum', roles: ['admin'] },
      { key: 'admin_docentes', label: 'Docentes', icon: 'admin-docentes', kind: 'route', to: '/admin', tab: 'docentes', roles: ['admin'] },
      { key: 'admin_asignacion', label: 'Asignación docente', icon: 'admin-asignacion', kind: 'route', to: '/admin', tab: 'asignacion', roles: ['admin'] },
      { key: 'admin_matricula', label: 'Matrícula', icon: 'admin-matricula', kind: 'route', to: '/admin', tab: 'matricula', roles: ['admin'] },
    ],
  },
  {
    section: 'Talento Humano',
    items: [
      { key: 'th_planta', label: 'Planta docente', icon: 'th-planta', kind: 'route', to: '/talento-humano', tab: 'planta', roles: ['talento_humano'] },
      { key: 'th_convocatorias', label: 'Convocatorias', icon: 'th-convocatorias', kind: 'route', to: '/talento-humano', tab: 'convocatorias', roles: ['talento_humano'] },
      { key: 'th_capacitaciones', label: 'Capacitaciones', icon: 'th-capacitaciones', kind: 'route', to: '/talento-humano', tab: 'capacitaciones', roles: ['talento_humano'] },
      { key: 'th_carga', label: 'Carga académica', icon: 'th-carga', kind: 'route', to: '/talento-humano', tab: 'carga', roles: ['talento_humano'] },
      { key: 'th_areas', label: 'Áreas', icon: 'th-areas', kind: 'route', to: '/talento-humano', tab: 'areas', roles: ['talento_humano'] },
      { key: 'th_nomina', label: 'Nómina', icon: 'th-nomina', kind: 'route', to: '/talento-humano', tab: 'nomina', roles: ['talento_humano'] },
      { key: 'th_novedades', label: 'Novedades', icon: 'th-novedades', kind: 'route', to: '/talento-humano', tab: 'novedades', roles: ['talento_humano'] },
      { key: 'th_certificados', label: 'Certificados', icon: 'th-certificados', kind: 'route', to: '/talento-humano', tab: 'certificados', roles: ['talento_humano'] },
    ],
  },
  {
    section: 'Contabilidad',
    items: [
      { key: 'con_recaudo', label: 'Recaudo', icon: 'con-recaudo', kind: 'route', to: '/contabilidad', tab: 'recaudo', roles: ['contabilidad'] },
      { key: 'con_cartera', label: 'Cartera', icon: 'con-cartera', kind: 'route', to: '/contabilidad', tab: 'cartera', roles: ['contabilidad'] },
      { key: 'con_conciliacion', label: 'Conciliación', icon: 'con-conciliacion', kind: 'route', to: '/contabilidad', tab: 'conciliacion', roles: ['contabilidad'] },
      { key: 'con_egresos', label: 'Egresos', icon: 'con-egresos', kind: 'route', to: '/contabilidad', tab: 'egresos', roles: ['contabilidad'] },
      { key: 'con_nomina', label: 'Nómina', icon: 'con-nomina', kind: 'route', to: '/contabilidad', tab: 'nomina', roles: ['contabilidad'] },
      { key: 'con_novedades', label: 'Novedades', icon: 'con-novedades', kind: 'route', to: '/contabilidad', tab: 'novedades', roles: ['contabilidad'] },
    ],
  },
  {
    section: 'Personal',
    items: [
      { key: 'perfil', label: 'Mi Perfil', icon: 'perfil', kind: 'view', view: 'perfil', roles: '*' },
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

/* Pestaña que muestra cada módulo cuando se entra sin ?tab=.
   El Sidebar la necesita para resaltar el ítem correcto en /admisiones. */
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
