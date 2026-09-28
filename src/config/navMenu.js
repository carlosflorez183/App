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
      { key: 'home', label: 'Inicio', icon: '🏠', kind: 'view', view: 'home', roles: '*' },
    ],
  },
  {
    section: 'Académico',
    items: [
      { key: 'notas', label: 'Mis Notas', icon: '⭐', kind: 'view', view: 'academico', tab: 'notas', roles: ['estudiante'] },
      { key: 'certificados', label: 'Certificados', icon: '📜', kind: 'view', view: 'academico', tab: 'certificados', roles: ['estudiante', 'profesor'] },
      { key: 'pagos', label: 'Pagos / Volante', icon: '💳', kind: 'view', view: 'academico', tab: 'pagos', roles: ['estudiante'] },
      { key: 'horario', label: 'Mi Horario', icon: '📅', kind: 'view', view: 'academico', tab: 'horario', roles: ['estudiante'] },
      { key: 'registro_notas', label: 'Registro Notas', icon: '📝', kind: 'route', to: '/docente', tab: 'notas', roles: ['profesor'] },
    ],
  },
  {
    section: 'Campus Virtual',
    items: [
      { key: 'cursos', label: 'Mis Cursos', icon: '📚', kind: 'view', view: 'lms', tab: 'cursos', roles: '*' },
      { key: 'tareas', label: 'Tareas', icon: '✅', kind: 'view', view: 'lms', tab: 'tareas', badge: 2, roles: ['estudiante', 'profesor'] },
      { key: 'recursos', label: 'Recursos', icon: '📁', kind: 'view', view: 'lms', tab: 'recursos', roles: '*' },
    ],
  },
  {
    section: 'Matrícula',
    items: [
      { key: 'matricular', label: 'Matricular Materias', icon: '📝', kind: 'route', to: '/matricula', roles: ['estudiante'] },
      { key: 'consultar_pensum', label: 'Consultar Pensum', icon: '📖', kind: 'route', to: '/pensum', roles: ['admin', 'rectoria', 'talento_humano', 'contabilidad', 'profesor', 'admisiones'] },
    ],
  },
  {
    section: 'Administración',
    items: [
      { key: 'admin', label: 'Panel de Administración', icon: '🛠️', kind: 'route', to: '/admin', roles: ['admin'] },
      { key: 'admisiones', label: 'Admisiones', icon: '🎓', kind: 'route', to: '/admisiones', roles: ['admin', 'admisiones'] },
      { key: 'rectoria', label: 'Rectoría e Indicadores', icon: '🏛️', kind: 'route', to: '/rectoria', roles: ['rectoria'] },
      { key: 'docente', label: 'Mi Cátedra', icon: '👨‍🏫', kind: 'route', to: '/docente', roles: ['profesor'] },
      { key: 'talento_humano', label: 'Talento Humano', icon: '🧑‍💼', kind: 'route', to: '/talento-humano', roles: ['talento_humano'] },
      { key: 'contabilidad', label: 'Contabilidad', icon: '🧾', kind: 'route', to: '/contabilidad', roles: ['contabilidad'] },
    ],
  },
  {
    section: 'Personal',
    items: [
      { key: 'perfil', label: 'Mi Perfil', icon: '👤', kind: 'view', view: 'perfil', roles: '*' },
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

export const NAV_SEC_STYLE = {
  padding: '8px 20px 3px',
  color: 'rgba(255,255,255,.4)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
};
