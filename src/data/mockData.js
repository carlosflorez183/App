/* =============================================
   UniPlataforma — Datos de demostración (ES Module)
   ============================================= */
export const INITIAL_DATA = {
  materias: [
    { id:1, codigo:'IS-301', nombre:'Estructuras de Datos', creditos:3, profesor:'Dr. Ramírez', nota1:4.2, nota2:3.8, nota3:4.5, definitiva:4.2, estado:'aprobado', periodo:'2026-1' },
    { id:2, codigo:'IS-305', nombre:'Bases de Datos II', creditos:4, profesor:'Dra. Laura Sánchez', nota1:3.5, nota2:4.0, nota3:null, definitiva:null, estado:'en_curso', periodo:'2026-1' },
    { id:3, codigo:'IS-310', nombre:'Ingeniería de Software', creditos:3, profesor:'Mg. Torres', nota1:4.8, nota2:4.5, nota3:null, definitiva:null, estado:'en_curso', periodo:'2026-1' },
    { id:4, codigo:'MAT-201', nombre:'Cálculo Diferencial', creditos:4, profesor:'Dr. González', nota1:2.8, nota2:3.1, nota3:2.5, definitiva:2.8, estado:'reprobado', periodo:'2025-2' },
    { id:5, codigo:'IS-201', nombre:'Prog. Orientada a Objetos', creditos:3, profesor:'Dra. Mendez', nota1:4.6, nota2:4.7, nota3:4.9, definitiva:4.7, estado:'aprobado', periodo:'2025-2' },
    { id:6, codigo:'HUM-101', nombre:'Ética Profesional', creditos:2, profesor:'Lic. Vargas', nota1:4.0, nota2:4.2, nota3:4.1, definitiva:4.1, estado:'aprobado', periodo:'2025-2' },
  ],
  certificados: [
    { id:1, tipo:'Certificado de Estudios', fecha:'2026-07-15', estado:'disponible', solicitado:'2026-07-10' },
    { id:2, tipo:'Constancia de Notas', fecha:'2026-06-20', estado:'disponible', solicitado:'2026-06-18' },
    { id:3, tipo:'Paz y Salvo Financiero', fecha:null, estado:'en_proceso', solicitado:'2026-08-01' },
    { id:4, tipo:'Certificado de Matrícula', fecha:'2026-02-01', estado:'disponible', solicitado:'2026-01-28' },
  ],
  pagos: [
    { id:1, concepto:'Matrícula Semestre 2026-1', valor:3850000, fecha_limite:'2026-01-25', fecha_pago:'2026-01-20', estado:'pagado', referencia:'PAG-20260120-001' },
    { id:2, concepto:'Derechos Complementarios', valor:180000, fecha_limite:'2026-02-10', fecha_pago:'2026-02-08', estado:'pagado', referencia:'PAG-20260208-002' },
    { id:3, concepto:'Matrícula Semestre 2026-2', valor:3950000, fecha_limite:'2026-07-25', fecha_pago:null, estado:'pendiente', referencia:null },
    { id:4, concepto:'Seguro Estudiantil 2026', valor:45000, fecha_limite:'2026-03-01', fecha_pago:'2026-02-28', estado:'pagado', referencia:'PAG-20260228-003' },
  ],
  cursos: [
    { id:1, nombre:'Bases de Datos II', codigo:'IS-305', profesor:'Dra. Laura Sánchez', grupo:'A', estudiantes:28, icon:'🗄️', color:'linear-gradient(135deg,#6d28d9,#8b5cf6)', progreso:65 },
    { id:2, nombre:'Ingeniería de Software', codigo:'IS-310', profesor:'Mg. Torres', grupo:'B', estudiantes:32, icon:'💻', color:'linear-gradient(135deg,#0369a1,#0ea5e9)', progreso:50 },
    { id:3, nombre:'Estructuras de Datos', codigo:'IS-301', profesor:'Dr. Ramírez', grupo:'A', estudiantes:30, icon:'🌲', color:'linear-gradient(135deg,#065f46,#10b981)', progreso:100 },
  ],
  actividades: [
    { id:1,  cursoId:1, corte:2, titulo:'Taller de Normalización 3FN',      tipo:'taller',   fechaEntrega:'2026-08-25', descripcion:'Normalizar el esquema entregado hasta tercera forma normal.',              puntos:50,  estado_est:'pendiente',  nota:null },
    { id:2,  cursoId:1, corte:3, titulo:'Proyecto Final — Diseño BD',        tipo:'proyecto', fechaEntrega:'2026-09-10', descripcion:'Diseñar e implementar una base de datos completa para un caso de negocio.',puntos:100, estado_est:'pendiente',  nota:null },
    { id:3,  cursoId:2, corte:2, titulo:'Diagrama UML — Casos de Uso',       tipo:'taller',   fechaEntrega:'2026-08-22', descripcion:'Construir el diagrama de casos de uso para el sistema propuesto.',         puntos:40,  estado_est:'entregado',  nota:null },
    { id:4,  cursoId:2, corte:2, titulo:'Informe de Requisitos (ERS)',        tipo:'informe',  fechaEntrega:'2026-08-28', descripcion:'Elaborar el documento de especificación de requisitos de software.',      puntos:60,  estado_est:'pendiente',  nota:null },
    { id:5,  cursoId:1, corte:1, titulo:'Quiz SQL — Consultas Avanzadas',     tipo:'quiz',     fechaEntrega:'2026-08-19', descripcion:'Quiz de 10 preguntas sobre subconsultas y joins complejos.',               puntos:30,  estado_est:'calificado', nota:27  },
    { id:6,  cursoId:1, corte:1, titulo:'Taller Modelo Entidad–Relación',     tipo:'taller',   fechaEntrega:'2026-07-30', descripcion:'Diseñar el modelo ER para el caso de estudio de la empresa XYZ.',         puntos:40,  estado_est:'calificado', nota:36  },
    { id:7,  cursoId:2, corte:1, titulo:'Parcial 1 — Requisitos',             tipo:'parcial',  fechaEntrega:'2026-08-05', descripcion:'Examen escrito sobre conceptos de análisis de requisitos.',               puntos:50,  estado_est:'calificado', nota:43  },
    { id:8,  cursoId:3, corte:1, titulo:'Taller Pilas y Colas',               tipo:'taller',   fechaEntrega:'2026-07-15', descripcion:'Implementar estructuras de pilas y colas en Java.',                       puntos:30,  estado_est:'calificado', nota:28  },
    { id:9,  cursoId:3, corte:2, titulo:'Parcial 2 — Árboles y Grafos',       tipo:'parcial',  fechaEntrega:'2026-08-20', descripcion:'Examen sobre árboles binarios, AVL y grafos.',                            puntos:50,  estado_est:'calificado', nota:45  },
    { id:10, cursoId:3, corte:3, titulo:'Proyecto Final — Algoritmos',        tipo:'proyecto', fechaEntrega:'2026-09-25', descripcion:'Implementar y comparar tres algoritmos de ordenamiento con análisis de complejidad.', puntos:80, estado_est:'pendiente', nota:null },
  ],
  anuncios: [
    { id:1, cursoId:1, titulo:'Cambio de horario — semana del 25 ago', contenido:'La clase del martes 26 se traslada al miércoles 27 a las 8am. Laboratorio B-205.', fecha:'2026-08-21', autor:'Dra. Laura Sánchez' },
    { id:2, cursoId:2, titulo:'Material de apoyo disponible', contenido:'Se subió la guía de diagramas UML en la sección de recursos. Revisar antes de la próxima clase.', fecha:'2026-08-20', autor:'Mg. Torres' },
  ],
  empleados: [
    { id:1, nombre:'Dr. Ramírez García', cargo:'Docente TC', dependencia:'Fac. Ingeniería', tipo:'planta', salario:4800000, estado:'activo', ingreso:'2019-03-01', doc:'12345678' },
    { id:2, nombre:'Dra. Laura Sánchez', cargo:'Docente TC', dependencia:'Fac. Ingeniería', tipo:'planta', salario:5200000, estado:'activo', ingreso:'2017-08-15', doc:'23456789' },
    { id:3, nombre:'María Fernanda López', cargo:'Jefa Talento Humano', dependencia:'Talento Humano', tipo:'administrativo', salario:4200000, estado:'activo', ingreso:'2020-01-10', doc:'34567890' },
    { id:4, nombre:'Jorge Alberto Ríos', cargo:'Contador', dependencia:'Contabilidad', tipo:'administrativo', salario:3800000, estado:'activo', ingreso:'2021-06-01', doc:'45678901' },
    { id:5, nombre:'Mg. Torres Herrera', cargo:'Docente MT', dependencia:'Fac. Ingeniería', tipo:'hora_catedra', salario:2400000, estado:'activo', ingreso:'2023-02-01', doc:'56789012' },
    { id:6, nombre:'Ana Cristina Vega', cargo:'Secretaria Académica', dependencia:'Rectoría', tipo:'administrativo', salario:2800000, estado:'activo', ingreso:'2018-09-01', doc:'67890123' },
    { id:7, nombre:'Luis Fernando Mora', cargo:'Técnico Sistemas', dependencia:'Sistemas', tipo:'administrativo', salario:2600000, estado:'licencia', ingreso:'2022-04-01', doc:'78901234' },
  ],
  movimientos: [
    { id:1, concepto:'Matrículas Semestre 2026-1', tipo:'ingreso', valor:485000000, fecha:'2026-02-01', cuenta:'Ingresos Académicos' },
    { id:2, concepto:'Pago Nómina Docentes — Julio', tipo:'egreso', valor:98500000, fecha:'2026-07-30', cuenta:'Gastos de Personal' },
    { id:3, concepto:'Pago Nómina Admin. — Julio', tipo:'egreso', valor:42300000, fecha:'2026-07-30', cuenta:'Gastos de Personal' },
    { id:4, concepto:'Transferencia MEN', tipo:'ingreso', valor:320000000, fecha:'2026-07-15', cuenta:'Transferencias Nación' },
    { id:5, concepto:'Mantenimiento Planta Física', tipo:'egreso', valor:12800000, fecha:'2026-07-20', cuenta:'Gastos Generales' },
    { id:6, concepto:'Servicios Públicos — Julio', tipo:'egreso', valor:8400000, fecha:'2026-07-25', cuenta:'Servicios Públicos' },
    { id:7, concepto:'Educación Continua', tipo:'ingreso', valor:18500000, fecha:'2026-08-05', cuenta:'Otros Ingresos' },
  ],
  proyectos: [
    { id:1, nombre:'Plan de Mejoramiento Académico 2026', area:'Académico', responsable:'Vicerrectoría', presupuesto:45000000, ejecutado:28000000, avance:62, estado:'en_ejecucion', inicio:'2026-01-15', fin:'2026-12-31' },
    { id:2, nombre:'Renovación Equipos Laboratorios', area:'Infraestructura', responsable:'Planeación', presupuesto:120000000, ejecutado:95000000, avance:79, estado:'en_ejecucion', inicio:'2026-03-01', fin:'2026-09-30' },
    { id:3, nombre:'Acreditación Programa Ingeniería', area:'Calidad', responsable:'Rectoría', presupuesto:25000000, ejecutado:8000000, avance:32, estado:'en_ejecucion', inicio:'2026-02-01', fin:'2027-06-30' },
    { id:4, nombre:'Sistema Bienestar Estudiantil', area:'Bienestar', responsable:'Bienestar', presupuesto:35000000, ejecutado:35000000, avance:100, estado:'completado', inicio:'2025-08-01', fin:'2026-07-31' },
  ],
  notificaciones: [
    { id:1, titulo:'Nota publicada', msg:'Quiz SQL: 27/30 puntos', tipo:'success', tiempo:'Hace 2 horas', leida:false },
    { id:2, titulo:'Tarea por vencer', msg:'Taller Normalización 3FN vence el 25 ago', tipo:'warning', tiempo:'Hace 5 horas', leida:false },
    { id:3, titulo:'Nuevo anuncio', msg:'Bases de Datos II: Cambio de horario', tipo:'info', tiempo:'Hace 1 día', leida:false },
    { id:4, titulo:'Volante disponible', msg:'Matrícula 2026-2 ya está disponible', tipo:'info', tiempo:'Hace 3 días', leida:true },
  ],
  eventos: [
    { fecha:22, titulo:'Entrega UML IS-310', tipo:'tarea' },
    { fecha:25, titulo:'Taller Normalización', tipo:'tarea' },
    { fecha:27, titulo:'Clase BD II (cambio)', tipo:'clase' },
    { fecha:28, titulo:'Informe Requisitos', tipo:'tarea' },
  ],
  listaEstudiantes: [
    { id:1, nombre:'Carlos Andrés Martínez', codigo:'20231001', nota1:4.2, nota2:3.8 },
    { id:2, nombre:'Ana Lucía Ospina', codigo:'20231002', nota1:3.9, nota2:4.1 },
    { id:3, nombre:'Diego Fernando Ruiz', codigo:'20231003', nota1:2.5, nota2:3.0 },
    { id:4, nombre:'Valentina Torres', codigo:'20231004', nota1:4.8, nota2:4.7 },
    { id:5, nombre:'Sebastián Mora', codigo:'20231005', nota1:3.5, nota2:3.8 },
    { id:6, nombre:'Isabella García', codigo:'20231006', nota1:4.0, nota2:4.2 },
  ],
  cursos_info: {
    1: { programa:'Ing. de Sistemas', semestre:6 },
    2: { programa:'Ing. de Sistemas', semestre:6 },
    3: { programa:'Ing. de Sistemas', semestre:5 },
  },
  matricula: {
    modalidades: [
      { id:1, nombre:'Pregrado', icon:'🎓', bgClass:'bg-blue-100', descripcion:'Programas de formación universitaria de nivel profesional', programas:6 },
      { id:2, nombre:'Posgrado', icon:'🏛️', bgClass:'bg-purple-100', descripcion:'Especializaciones, maestrías y doctorados', programas:4 },
      { id:3, nombre:'Tecnología', icon:'⚙️', bgClass:'bg-green-100', descripcion:'Programas tecnológicos de nivel profesional técnico', programas:3 },
    ],
    programas: [
      { id:1, modalidadId:1, nombre:'Ingeniería de Sistemas', facultad:'Fac. Ingeniería', semestres:10, creditos:168, icon:'💻', bgClass:'bg-blue-100', snies:'53010135', jornada:'Diurno' },
      { id:2, modalidadId:1, nombre:'Ingeniería Civil', facultad:'Fac. Ingeniería', semestres:10, creditos:172, icon:'🏗️', bgClass:'bg-yellow-100', snies:'53010146', jornada:'Diurno' },
      { id:3, modalidadId:1, nombre:'Administración de Empresas', facultad:'Fac. Ciencias Económicas', semestres:9, creditos:148, icon:'📊', bgClass:'bg-green-100', snies:'53010123', jornada:'Nocturno' },
      { id:4, modalidadId:1, nombre:'Contaduría Pública', facultad:'Fac. Ciencias Económicas', semestres:9, creditos:152, icon:'📒', bgClass:'bg-teal-100', snies:'53010157', jornada:'Nocturno' },
      { id:5, modalidadId:1, nombre:'Psicología', facultad:'Fac. Ciencias Sociales', semestres:10, creditos:164, icon:'🧠', bgClass:'bg-purple-100', snies:'53010201', jornada:'Diurno' },
      { id:6, modalidadId:1, nombre:'Derecho', facultad:'Fac. Ciencias Jurídicas', semestres:10, creditos:180, icon:'⚖️', bgClass:'bg-red-100', snies:'53010088', jornada:'Nocturno' },
      { id:7, modalidadId:2, nombre:'Esp. en Gerencia de Proyectos', facultad:'Fac. Posgrados', semestres:2, creditos:32, icon:'📋', bgClass:'bg-indigo-100', snies:'91010001', jornada:'Sabatino' },
      { id:8, modalidadId:2, nombre:'Maestría en Educación', facultad:'Fac. Posgrados', semestres:4, creditos:64, icon:'📚', bgClass:'bg-pink-100', snies:'91010010', jornada:'Sabatino' },
      { id:9, modalidadId:3, nombre:'Tecnología en Sistemas', facultad:'Fac. Ingeniería', semestres:6, creditos:108, icon:'🖥️', bgClass:'bg-cyan-100', snies:'73010001', jornada:'Diurno' },
      { id:10, modalidadId:3, nombre:'Tecnología en Contabilidad', facultad:'Fac. Económicas', semestres:6, creditos:102, icon:'🧮', bgClass:'bg-orange-100', snies:'73010009', jornada:'Nocturno' },
    ],
    materias: [
      { id:101, programaId:1, semestre:1, codigo:'IS-101', nombre:'Fundamentos de Programación', area:'Básica', creditos:3, profesor:'Dr. Ramírez', horas:4, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:102, programaId:1, semestre:1, codigo:'MAT-101', nombre:'Álgebra Lineal', area:'Básica', creditos:3, profesor:'Dra. Martínez', horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:103, programaId:1, semestre:1, codigo:'HUM-101', nombre:'Ética Profesional', area:'Humanidades', creditos:2, profesor:'Lic. Vargas', horas:2, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:104, programaId:1, semestre:1, codigo:'MAT-102', nombre:'Cálculo Diferencial', area:'Básica', creditos:4, profesor:'Dr. González', horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:105, programaId:1, semestre:1, codigo:'IS-102', nombre:'Lógica Matemática', area:'Básica', creditos:3, profesor:'Mg. Pérez', horas:3, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am'] },
      { id:201, programaId:1, semestre:2, codigo:'IS-201', nombre:'Prog. Orientada a Objetos', area:'Profesional', creditos:3, profesor:'Dra. Mendez', horas:4, estado:'disponible', prerrequisito:'IS-101', horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:202, programaId:1, semestre:2, codigo:'MAT-201', nombre:'Cálculo Integral', area:'Básica', creditos:4, profesor:'Dr. González', horas:5, estado:'disponible', prerrequisito:'MAT-102', horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:203, programaId:1, semestre:2, codigo:'IS-202', nombre:'Estructuras Discretas', area:'Básica', creditos:3, profesor:'Mg. Castro', horas:3, estado:'disponible', prerrequisito:'IS-102', horarios:['Mié 9-11am'] },
      { id:204, programaId:1, semestre:2, codigo:'IS-203', nombre:'Arquitectura de Computadores', area:'Profesional', creditos:3, profesor:'Dr. Mora', horas:4, estado:'disponible', prerrequisito:null, horarios:['Vie 7-9am','Lun 11am-1pm'] },
      { id:205, programaId:1, semestre:2, codigo:'HUM-201', nombre:'Comunicación Escrita', area:'Humanidades', creditos:2, profesor:'Lic. Ruiz', horas:2, estado:'disponible', prerrequisito:null, horarios:['Jue 11am-1pm'] },
      { id:601, programaId:1, semestre:6, codigo:'IS-301', nombre:'Estructuras de Datos', area:'Profesional', creditos:3, profesor:'Dr. Ramírez', horas:4, estado:'cursada', prerrequisito:'IS-201', horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:602, programaId:1, semestre:6, codigo:'IS-305', nombre:'Bases de Datos II', area:'Profesional', creditos:4, profesor:'Dra. Laura Sánchez', horas:5, estado:'disponible', prerrequisito:'IS-301', horarios:['Mar 7-9am','Jue 7-9am','Vie 7-8am'] },
      { id:603, programaId:1, semestre:6, codigo:'IS-310', nombre:'Ingeniería de Software', area:'Profesional', creditos:3, profesor:'Mg. Torres', horas:4, estado:'disponible', prerrequisito:null, horarios:['Mié 9-11am','Vie 9-10am'] },
      { id:604, programaId:1, semestre:6, codigo:'IS-315', nombre:'Redes de Computadores', area:'Profesional', creditos:3, profesor:'Ing. Suárez', horas:4, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mar 9-10am'] },
      { id:605, programaId:1, semestre:6, codigo:'ELT-601', nombre:'Electiva Profesional I', area:'Electiva', creditos:2, profesor:'Por asignar', horas:2, estado:'disponible', prerrequisito:null, horarios:['Jue 2-4pm'] },
      { id:606, programaId:1, semestre:6, codigo:'HUM-601', nombre:'Emprendimiento', area:'Humanidades', creditos:2, profesor:'Mg. Ariza', horas:2, estado:'habilitada', prerrequisito:'HUM-101', horarios:['Vie 10am-12pm'] },
      { id:701, programaId:1, semestre:7, codigo:'IS-401', nombre:'Desarrollo Web Avanzado', area:'Profesional', creditos:3, profesor:'Ing. Valencia', horas:4, estado:'disponible', prerrequisito:'IS-310', horarios:['Lun 7-9am','Mié 7-8am'] },
      { id:702, programaId:1, semestre:7, codigo:'IS-405', nombre:'Inteligencia Artificial', area:'Profesional', creditos:3, profesor:'Dr. Herrera', horas:4, estado:'disponible', prerrequisito:'IS-301', horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:703, programaId:1, semestre:7, codigo:'IS-410', nombre:'Sistemas Distribuidos', area:'Profesional', creditos:3, profesor:'Mg. Blanco', horas:3, estado:'bloqueada', prerrequisito:'IS-315', horarios:['Mié 9-11am'] },
      { id:704, programaId:1, semestre:7, codigo:'ELT-701', nombre:'Electiva Profesional II', area:'Electiva', creditos:2, profesor:'Por asignar', horas:2, estado:'disponible', prerrequisito:null, horarios:['Vie 2-4pm'] },
      { id:301, programaId:3, semestre:1, codigo:'ADM-101', nombre:'Fundamentos de Administración', area:'Profesional', creditos:3, profesor:'Mg. Castillo', horas:4, estado:'disponible', prerrequisito:null, horarios:['Lun 6-8pm','Mié 6-8pm'] },
      { id:302, programaId:3, semestre:1, codigo:'ECO-101', nombre:'Economía General', area:'Básica', creditos:3, profesor:'Dr. Lozano', horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 6-8pm','Jue 6-8pm'] },
      { id:303, programaId:3, semestre:1, codigo:'MAT-301', nombre:'Matemáticas Financieras', area:'Básica', creditos:3, profesor:'Mg. Torres', horas:3, estado:'disponible', prerrequisito:null, horarios:['Vie 6-9pm'] },
      { id:304, programaId:3, semestre:1, codigo:'HUM-301', nombre:'Comunicación Empresarial', area:'Humanidades', creditos:2, profesor:'Lic. Vega', horas:2, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
    ]
  }
};

export const formatCurrency = (val) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};
