export const CLAVES_ROL = {
  estudiante: 'estudiante',
  profesor: 'profesor',
  admin: 'admin',
  admisiones: 'admisiones',
  rectoria: 'rectoria',
  talento_humano: 'talento_humano',
  contabilidad: 'contabilidad',
};

export const USUARIOS_DEMO = [
  {
    usuario: 'EST001', password: '123456', role: 'estudiante',
    nombre: 'Carlos Andrés Martínez', codigo: '20231001',
    documento: '1.023.445.671', programaId: 1, semester: '6',
    email: 'c.martinez@uni.edu.co', telefono: '310 456 7890',
    direccion: 'Cra. 12 #45-67, Bogotá', avatar: 'CA', avatarClass: 'av-blue',
  },
  {
    usuario: 'PROF001', password: '123456', role: 'profesor',
    nombre: 'Dra. Laura Sánchez', codigo: 'DOC-0045',
    email: 'l.sanchez@uni.edu.co', telefono: '311 222 3344',
    direccion: 'Cra. 7 #89-10, Bogotá', avatar: 'LS', avatarClass: 'av-purple',
  },
  {
    usuario: 'ADMI', password: '123456', role: 'admisiones',
    nombre: 'Ana Camila Restrepo', codigo: 'ADM-004',
    email: 'a.restrepo@uni.edu.co', telefono: '317 222 9911',
    direccion: 'Cra. 11 #22-33, Bogotá', avatar: 'AR', avatarClass: 'av-purple',
  },
  {
    usuario: 'ADMIN', password: 'admin123', role: 'admin',
    nombre: 'Administrador General', codigo: 'ADM-001',
    email: 'admin@uni.edu.co', telefono: '318 555 1122',
    direccion: 'Cra. 1 #2-3, Bogotá', avatar: 'AG', avatarClass: 'av-green',
  },
  {
    usuario: 'RECTOR', password: 'rector123', role: 'rectoria',
    nombre: 'Rector Juan Pablo Gómez', codigo: 'REC-001',
    email: 'rector@uni.edu.co', telefono: '300 111 2233',
    direccion: 'Cra. 5 #6-7, Bogotá', avatar: 'JG', avatarClass: 'av-red',
  },
  {
    usuario: 'TALENTO', password: '123456', role: 'talento_humano',
    nombre: 'María Fernanda López', codigo: 'TH-002',
    email: 'm.lopez@uni.edu.co', telefono: '315 909 1212',
    direccion: 'Cra. 9 #30-25, Bogotá', avatar: 'ML', avatarClass: 'av-yellow',
  },
  {
    usuario: 'CONTA', password: '123456', role: 'contabilidad',
    nombre: 'Jorge Alberto Ríos', codigo: 'CONT-003',
    email: 'j.rios@uni.edu.co', telefono: '316 404 5050',
    direccion: 'Cra. 3 #14-8, Bogotá', avatar: 'JR', avatarClass: 'av-blue',
  },
];

/* Módulos a los que tiene acceso cada rol. `*` = acceso total.
   Cada rol trabaja en su módulo: el administrador NO entra a Admisiones
   (tiene su propio panel) y el pensum solo lo consultan Admisiones y
   Administración. */
export const ACCESO_POR_ROL = {
  estudiante: ['notas', 'pagos', 'certificados', 'horario', 'matricula', 'cursos', 'tareas', 'perfil'],
  profesor: ['cursos', 'tareas', 'notas', 'recursos', 'perfil'],
  admisiones: ['admisiones', 'notificaciones', 'perfil'],
  admin: ['admin', 'matricula', 'pensum', 'notificaciones', 'perfil'],
  rectoria: ['rectoria', 'notificaciones', 'perfil'],
  talento_humano: ['talento-humano', 'notificaciones', 'perfil'],
  contabilidad: ['contabilidad', 'notificaciones', 'perfil'],
};
