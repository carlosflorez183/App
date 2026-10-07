/* =============================================
   UniPlataforma — Datos de demostración (ES Module)
   ============================================= */

// ─────────────────────────────────────────────────────────────────────────────
// Planes de estudio de los demás programas.
//
// Los nombres de las asignaturas y sus créditos se tomaron de planes de estudio
// publicados por universidades colombianas (ver FUENTES_PLANES). Donde la fuente
// no detallaba el semestre de cada asignatura, la distribución por semestre es
// referencial. Los campos de presentación (docente, horarios) se generan de
// forma determinista para no duplicar miles de líneas de datos estáticos.
// ─────────────────────────────────────────────────────────────────────────────
const FUENTES_PLANES = {
  2:  'Ing. Civil — Universidad de San Sebastián de Bellavista (10 sem, 165 cr)',
  3:  'Administración de Empresas — Universidad de Sucre (9 sem)',
  4:  'Contaduría Pública — Universidad Libre (8 sem)',
  5:  'Psicología — Universidad de Antioquia (10 sem)',
  6:  'Derecho — Universidad Humboldt de Colombia (8 sem)',
  7:  'Esp. en Gerencia de Proyectos — Universidad de América (28 cr)',
  8:  'Maestría en Educación — plan referencial (4 sem)',
  9:  'Tecnología en Sistemas — Institución Universitaria Salazar y Herrera (6 sem, 105 cr)',
  10: 'Tecnología en Contabilidad — Universidad de San Buenaventura (6 sem)',
};

const DOCENTES = [
  'Dra. Mendez', 'Dr. Ramírez', 'Ing. Suárez', 'Dr. González',
  'Lic. Vargas', 'Mg. Castillo', 'Dra. Laura Sánchez', 'Dr. Lozano', 'Mg. Ariza',
];

const BLOQUES_HORARIO = [
  'Lun 7-9am', 'Mar 7-9am', 'Mié 7-9am', 'Jue 7-9am', 'Vie 7-9am', 'Sáb 8-10am',
];

const AREA = {
  B: 'Básica',
  H: 'Humanidades',
  P: 'Profesional',
  E: 'Electiva',
};

/**
 * Expande un plan compacto a objetos de materia.
 * Cada semestre es un arreglo de filas [código, nombre, créditos, área].
 */
const plan = (programaId, semestres) =>
  semestres.flatMap((filas, i) => {
    const semestre = i + 1;
    return filas.map(([codigo, nombre, creditos, area], j) => {
      const i0 = i * 20 + j;
      return {
        id: programaId * 10000 + semestre * 100 + j + 1,
        programaId,
        semestre,
        codigo,
        nombre,
        area: AREA[area] || area,
        creditos,
        profesor: DOCENTES[i0 % DOCENTES.length],
        horas: Math.max(2, creditos + 1),
        estado: 'disponible',
        prerrequisito: null,
        horarios: [BLOQUES_HORARIO[(i0 + j) % 6], BLOQUES_HORARIO[(i0 + j + 3) % 6]],
      };
    });
  });

const PLANES = {
  // Ingeniería Civil — Universidad de San Sebastián de Bellavista
  2: [
    [['IC-101','Representación Gráfica',3,'B'],['IC-102','Química General',3,'B'],['IC-103','Habilidades Matemáticas',3,'B'],['IC-104','Introducción a la Ingeniería',3,'P'],['IC-105','Inglés I',2,'H'],['IC-106','Filosofía Institucional',2,'H'],['IC-107','Filosofía Teológica',2,'H']],
    [['MAT-201','Cálculo Diferencial',3,'B'],['MAT-202','Álgebra Lineal',3,'B'],['IC-201','Topografía y Cartografía',3,'P'],['IC-202','Antropología',2,'H'],['IC-203','Comunicación Oral y Escrita',2,'H'],['IC-204','Inglés II',2,'H']],
    [['MAT-301','Cálculo Integral',3,'B'],['FIS-301','Física Mecánica',3,'B'],['IC-301','Lógica de Programación',3,'B'],['IC-302','Geomática',3,'P'],['IC-303','Inglés III',2,'H'],['IC-304','Epistemología',2,'H']],
    [['MAT-401','Cálculo Vectorial',3,'B'],['FIS-401','Electricidad y Magnetismo',3,'B'],['MAT-402','Ecuaciones Diferenciales',3,'B'],['IC-401','Estática',3,'P'],['IC-402','Geología',3,'P'],['IC-403','Inglés IV',2,'H']],
    [['MAT-501','Probabilidad y Estadística',2,'B'],['IC-501','Mecánica de Fluidos',3,'P'],['IC-502','Mecánica de Materiales',3,'P'],['IC-503','Materiales de Construcción',3,'P'],['IC-504','Inglés V',2,'H'],['IC-505','Cultura Teológica',2,'H'],['INV-501','Opcional de Investigación I',2,'E']],
    [['IC-601','Gestión Ambiental y Desarrollo Sostenible',3,'P'],['IC-602','Hidrología',3,'P'],['IC-603','Análisis Estructural',3,'P'],['IC-604','Mecánica de Suelos',3,'P'],['IC-605','Diseño Geométrico de Vías',3,'P'],['IC-606','Inglés VI',2,'H']],
    [['IC-701','Hidráulica',3,'P'],['IC-702','Concreto Reforzado',3,'P'],['IC-703','Fundaciones',3,'P'],['IC-704','Tránsito y Transporte',3,'P'],['IC-705','Procesos Constructivos',3,'P'],['INV-701','Opcional de Investigación II',2,'E']],
    [['IC-801','Formulación y Evaluación de Proyectos',3,'P'],['IC-802','Acueductos',3,'P'],['IC-803','Diseño de Estructuras',3,'P'],['IC-804','Pavimentos',3,'P'],['IC-805','Presupuesto y Programación de Obras',3,'P'],['IC-806','Filosofía Política',2,'H']],
    [['IC-901','Diseño de Ingeniería Civil',3,'P'],['IC-902','Alcantarillados',3,'P'],['IC-903','Legislación para Ingenieros',3,'P'],['IC-904','Componente de Énfasis I',3,'P'],['IC-905','Componente de Énfasis II',3,'P'],['IC-906','Ética',2,'H']],
    [['IC-1001','Componente de Énfasis III',3,'P'],['IC-1002','Componente de Énfasis IV',3,'P'],['IC-1003','Cátedra Opcional Institucional',3,'E'],['IC-1004','Cátedra Opcional Complementaria',3,'E'],['PRY-1001','Opción de Grado',4,'P']],
  ],

  // Administración de Empresas — Universidad de Sucre
  3: [
    [['ADM-101','Introducción a la Administración',3,'P'],['MAT-101','Matemáticas I',3,'B'],['CONT-101','Contabilidad I',3,'P'],['HUM-101','Comunicación I',2,'H'],['HUM-102','Ciencias Humanas',2,'H'],['ADM-102','Historia Empresarial',1,'H'],['CUI-101','Cátedra Universitaria de Vida I',1,'H']],
    [['CONT-201','Contabilidad II',3,'P'],['MAT-201','Matemáticas II',3,'B'],['ECO-201','Microeconomía',3,'P'],['ADM-201','Procesos Administrativos I',3,'P'],['DER-201','Legislación Empresarial I',2,'P'],['HUM-201','Comunicación II',2,'H']],
    [['CONT-301','Costos',2,'P'],['MAT-301','Matemáticas III',3,'B'],['ECO-301','Macroeconomía',3,'P'],['ADM-301','Procesos Administrativos II',3,'P'],['DER-301','Legislación Empresarial II',2,'P'],['MET-301','Metodología de la Investigación',2,'P']],
    [['ADM-401','Comportamiento Humano en las Organizaciones',2,'P'],['MKT-401','Fundamentos de Marketing I',2,'P'],['EST-401','Estadística I',2,'B'],['ADM-402','Talento Humano',3,'P'],['ECO-401','Economía Colombiana',2,'P'],['MAT-401','Matemática Financiera I',3,'B'],['ELE-401','Electiva I: Financieros y Servicios',2,'E']],
    [['ADM-501','Desarrollo Organizacional',2,'P'],['EST-501','Estadística II',2,'B'],['ETI-501','Ética Empresarial',2,'H'],['MKT-501','Fundamentos de Marketing II',2,'P'],['CONT-501','Tributaria',2,'P'],['FIN-501','Análisis Financiero',3,'P'],['MAT-501','Matemática Financiera II',3,'B']],
    [['ADM-601','Administración de Salarios',2,'P'],['MKT-601','Comportamiento del Consumidor',2,'P'],['SST-601','Gestión Ambiental',1,'P'],['ADM-602','Investigación de Operaciones',2,'P'],['CONT-601','Presupuesto',3,'P'],['AUD-601','Gestión de Auditoría y Calidad',3,'P'],['ELE-601','Electiva II',2,'E']],
    [['EMP-701','Emprendimiento',3,'P'],['ECO-701','Comercio Exterior',2,'P'],['FIN-701','Finanzas Internacionales',1,'P'],['FIN-702','Gerencia Financiera',2,'P'],['MKT-701','Investigación de Mercados',2,'P'],['ADM-701','Administración de la Producción',3,'P'],['MIS-701','Sistema de Información Gerencial',2,'P']],
    [['PRA-801','Prácticas',6,'P']],
    [['ADM-901','Gerencia Estratégica',3,'P'],['PRY-901','Gestión de Proyectos',3,'P'],['FIN-901','Valoración de Empresas',2,'P'],['ELE-901','Profundización',3,'E'],['PRY-902','Trabajo de Grado',5,'P']],
  ],

  // Contaduría Pública — Universidad Libre
  4: [
    [['CONT-101','Ciclo Básico Contable',4,'P'],['MAT-101','Fundamentos de Matemáticas',4,'B'],['ECO-101','Fundamentos de Economía',2,'B'],['DER-101','Principios de Derecho y Constitución',2,'H'],['HUM-101','Expresión Verbal y Escrita',2,'H'],['CUI-101','Cátedra Unilibrista',1,'H'],['ELE-101','Electiva I',2,'E']],
    [['CONT-201','Ciclo de Ingresos',4,'P'],['MAT-201','Cálculo I',4,'B'],['ECO-201','Economía de Empresa',2,'B'],['ADM-201','Fundamentos de Administración',3,'P'],['DER-201','Derecho Comercial',2,'P'],['MET-201','Epistemología y Metodología de la Investigación',2,'H'],['DER-202','Comercio y Negocios Globales',2,'P']],
    [['CONT-301','Ciclo de Egresos y Administración de Inventarios',4,'P'],['CONT-302','Teorías Contables',2,'P'],['MAT-301','Matemáticas Financieras',3,'B'],['EST-301','Estadística Descriptiva',3,'B'],['ECO-301','Coyuntura Económica Nacional',2,'B'],['EMP-301','Emprendimiento e Innovación',2,'P'],['DER-301','Derecho Laboral y de Seguridad Social',2,'P']],
    [['CONT-401','Ciclo de Inversiones y Financiación',4,'P'],['CONT-402','Sistemas de Costeo',4,'P'],['CONT-403','Contabilidad Ambiental',2,'P'],['EST-401','Estadística Inferencial',3,'B'],['ADM-401','Gerencia Estratégica Organizacional',2,'P'],['MKT-401','Fundamentos de Mercadeo',1,'P'],['MET-401','Modelos de Investigación',2,'H']],
    [['CONT-501','Ciclo de Estados Financieros',4,'P'],['CONT-502','Costos Gerenciales',4,'P'],['TRI-501','Fundamentos y Normatividad Tributaria',3,'P'],['AUD-501','Aseguramiento y Fundamentos de Control',3,'P'],['ADM-501','Investigación de Operaciones',3,'P'],['ELE-501','Electiva II',2,'E']],
    [['FIN-601','Administración Financiera',3,'P'],['CONT-601','Presupuestos Empresariales',3,'P'],['AUD-601','Auditoría Aplicada',4,'P'],['TRI-601','Impuesto Sobre la Renta y Complementarios',3,'P'],['AUD-602','Revisoría Fiscal',3,'P'],['OPT-601','Optativa I',3,'E']],
    [['PRY-701','Formulación y Gestión de Proyectos',3,'P'],['FIN-701','Finanzas Corporativas',3,'P'],['CONT-701','Contabilidad y Finanzas Públicas',3,'P'],['TRI-701','Impuestos a las Ventas y Retención en la Fuente',3,'P'],['AUD-701','Revisoría Fiscal',3,'P'],['OPT-701','Optativa II',4,'E']],
    [['ADM-801','Simulación Gerencial',2,'P'],['TRI-801','Impuestos Territoriales y Procedimientos Tributarios',3,'P'],['AUD-801','Auditoría de Sistemas',3,'P'],['ETI-801','Ética Profesional',2,'H'],['ELE-801','Electiva III',2,'E'],['OPT-801','Optativa III',4,'E']],
  ],

  // Psicología — Universidad de Antioquia
  5: [
    [['PSI-101','Historia y epistemología de la Psicología',3,'B'],['PSI-102','Fundamentos de Psicobiología',3,'B'],['PSI-103','Bases socioculturales del comportamiento',3,'H'],['PSI-104','Fundamentos de Neuroanatomía',3,'B'],['ELE-101','Electiva de Profundización I',2,'E']],
    [['PSI-201','Sensación, Percepción, Atención y Memoria',3,'B'],['PSI-202','Neuropsicología',3,'B'],['PSI-203','Teoría evolutiva y del desarrollo infantil',4,'B'],['PSI-204','Neurociencias',3,'B'],['ELE-201','Electiva de Profundización II',2,'E']],
    [['PSI-301','Pensamiento, Lenguaje, Inteligencia, Aprendizaje y Conciencia',3,'B'],['PSI-302','Emoción y Motivación',3,'B'],['PSI-303','Psicolinguística',3,'B'],['MET-301','Metodología de Investigación',2,'P'],['EST-301','Estadística Descriptiva',2,'B']],
    [['PSI-401','Personalidad',3,'P'],['PSI-402','Escuelas Psicológicas',3,'P'],['PSI-403','Psicobiología',3,'B'],['PRA-401','Práctica de Observación e Intervención I',2,'P'],['HUM-401','Socio Humanística I',3,'H']],
    [['PSI-501','Psicopatología',3,'P'],['PSI-502','Fundamentos de Clínica',3,'P'],['PSI-503','Psicometría',3,'P'],['SEM-501','Seminario de Investigación I',2,'P'],['HUM-501','Socio Humanística II',3,'H']],
    [['PSI-601','Psicología Social',3,'P'],['PSI-602','Fundamentos de Psicoanálisis',3,'P'],['PSI-603','Estructuras Clínicas I',3,'P'],['PRA-601','Práctica de Intervención II',2,'P'],['HUM-601','Socio Humanística III',3,'H']],
    [['PSI-701','Estructuras Clínicas II',3,'P'],['PSI-702','Psicología de la Salud y Ocupacional',4,'P'],['ETI-701','Ética Profesional',3,'H'],['SEM-701','Seminario de Investigación II',2,'P'],['HUM-701','Socio Humanística IV',3,'H']],
    [['PSI-801','Escuela Psicológica Específica',3,'P'],['PSI-802','Diagnóstico y Evaluación Clínica',3,'P'],['SEM-801','Seminario de Profundización III',2,'P'],['OPT-801','Optativa Profesional',2,'E']],
    [['PRA-901','Práctica Profesional III',4,'P'],['PRA-902','Práctica Profesional IV',4,'P'],['ELE-901','Electiva de Profundización III',2,'E']],
    [['PRY-1001','Trabajo de Grado',6,'P']],
  ],

  // Derecho — Universidad Humboldt de Colombia
  6: [
    [['DER-101','Introducción al Estudio del Derecho',3,'P'],['DER-102','Filosofía del Derecho',3,'H'],['DER-103','Sociología Jurídica',3,'P'],['DER-104','Epistemología',2,'H'],['DER-105','Lógica Jurídica',3,'P'],['DER-106','Razonamiento Cuantitativo',2,'B'],['DER-107','Métodos de Investigación',2,'P'],['DER-108','Inglés I',2,'H'],['ELE-101','Electiva I',2,'E']],
    [['DER-201','Hermenéutica Jurídica y Análisis Jurisprudencial',3,'P'],['DER-202','Teoría General del Proceso',3,'P'],['DER-203','Teoría General de la Prueba',3,'P'],['DER-204','Mecanismos Alternativos de Solución de Conflictos',3,'P'],['DER-205','Ciudadanía',2,'H'],['DER-206','TICs',2,'P'],['INV-201','Investigación Disciplinar',2,'P'],['DER-207','Inglés II',2,'H'],['ELE-201','Electiva II',2,'E']],
    [['DER-301','Derecho Civil: Personas',4,'P'],['DER-302','Derecho Civil: Bienes',4,'P'],['DER-303','Familia, Niñez y Adolescencia',3,'P'],['DER-304','Sucesiones',3,'P'],['DER-305','Obligaciones',3,'P'],['DER-306','Notariado y Registro',2,'P'],['DER-307','Procesal Civil General',3,'P'],['CJ-301','Consultorio Jurídico I',4,'P'],['DER-308','Inglés III',2,'H'],['ELE-301','Electiva III',2,'E']],
    [['DER-401','Contratos Civiles',3,'P'],['DER-402','Comercial General',3,'P'],['DER-403','Títulos Valores',3,'P'],['DER-404','Contratos Mercantiles',3,'P'],['DER-405','Sociedades Mercantiles',3,'P'],['DER-406','Procesal Civil Especial y Práctica Forense',3,'P'],['DER-407','Derecho Constitucional Económico',3,'P'],['CJ-401','Consultorio Jurídico II',4,'P'],['DER-408','Inglés IV',2,'H'],['ELE-401','Electiva IV',2,'E']],
    [['DER-501','Derecho Administrativo',4,'P'],['DER-502','Derecho Tributario y Aduanero',3,'P'],['DER-503','Derecho Laboral',3,'P'],['DER-504','Seguridad Social',3,'P'],['DER-505','Procesal Administrativo',3,'P'],['DER-506','Penal General',3,'P'],['CJ-501','Consultorio Jurídico III',4,'P'],['DER-507','Inglés V',2,'H'],['ELE-501','Electiva V',2,'E']],
    [['DER-601','Penal Especial',3,'P'],['DER-602','Procesal Penal',3,'P'],['DER-603','Derecho Internacional Público y Privado',3,'P'],['DER-604','Contratación Estatal',3,'P'],['DER-605','Derecho de Daños',3,'P'],['DER-606','Justicia Ambiental',3,'P'],['CJ-601','Consultorio Jurídico IV',4,'P'],['DER-607','Inglés VI',2,'H'],['ELE-601','Electiva VI',2,'E']],
    [['DER-701','Derecho Tributario',3,'P'],['DER-702','Procesal Tributario',3,'P'],['DER-703','Penal Internacional',3,'P'],['DER-704','Seguridad Social y Administrativa',3,'P'],['DER-705','Derecho de la Empresa y del Comercio',3,'P'],['DER-706','Conflictos Colectivos',3,'P'],['CJ-701','Consultorio Jurídico V',4,'P'],['ELE-701','Electiva VII',2,'E']],
    [['PRA-801','Práctica Profesional',6,'P'],['CJ-801','Consultorio Jurídico VI',4,'P'],['DER-801','Seminario de Investigación Jurídica',2,'P'],['PRY-801','Trabajo de Grado',6,'P']],
  ],

  // Especialización en Gerencia de Proyectos — Universidad de América
  7: [
    [['GER-101','Fundamentos e Iniciación de Proyectos',2,'P'],['GER-102','Liderazgo y Negociación en Proyectos',2,'P'],['GER-103','Gerencia de Recursos Humanos y Comunicaciones',2,'P'],['GER-104','Ética y Responsabilidad Social Empresarial',2,'P'],['GER-105','Planeación Estratégica del Alcance, Tiempo y Calidad',2,'P'],['GER-106','Presupuesto y Costos de Proyectos',2,'P'],['ELE-101','Electiva I',1,'E']],
    [['GER-201','Gerencia de Proyectos',2,'P'],['GER-202','Integración del Proyecto',2,'P'],['GER-203','Gerencia de Innovación y Creatividad',2,'P'],['GER-204','Formulación y Evaluación de Proyectos',2,'P'],['GER-205','Interventoría, Seguros y Aspectos Legales',2,'P'],['GER-206','Trabajo de Proyecto',1,'P'],['ELE-201','Electiva II',1,'E']],
  ],

  // Maestría en Educación — plan referencial
  8: [
    [['MED-101','Fundamentos de Educación',3,'P'],['MED-102','Teorías del Aprendizaje y la Enseñanza',3,'P'],['MED-103','Metodología de la Investigación Educativa',3,'P'],['MED-104','Epistemología de la Educación',3,'P']],
    [['MED-201','Diseño Curriculum y Planificación Educativa',3,'P'],['MED-202','Evaluación Educativa',3,'P'],['MED-203','Políticas Educativas y Gestión Escolar',3,'P'],['MED-204','Seminario de Investigación I',2,'P']],
    [['MED-301','Liderazgo y Convivencia Escolar',3,'P'],['MED-302','Tecnologías y Medios para la Enseñanza',3,'P'],['MED-303','Inclusión y Atención a la Diversidad',3,'P'],['MED-304','Seminario de Investigación II',2,'P']],
    [['MED-401','Electiva de Profundización',2,'E'],['MED-402','Trabajo de Grado',4,'P']],
  ],

  // Tecnología en Sistemas — Institución Universitaria Salazar y Herrera
  9: [
    [['SIS-101','Lógica de Programación',2,'B'],['SIS-102','Introducción a los Sistemas',2,'B'],['SIS-103','Hardware',3,'B'],['SIS-104','Competencias Informáticas',2,'B'],['SIS-105','Cultura Constitucional',2,'H'],['SIS-106','Matemáticas Operativas',3,'B'],['SIS-107','Geometría y Trigonometría',2,'B'],['SIS-108','Redacción y Ortografía',2,'H']],
    [['SIS-201','Algoritmos y Programación',3,'P'],['SIS-202','Sistemas Operativos',3,'P'],['SIS-203','Análisis y Diseño de Sistemas',3,'P'],['MAT-201','Cálculo Diferencial',3,'B'],['SIS-204','Comprensión Lectora',2,'H'],['SIS-205','Cristología',3,'H']],
    [['SIS-301','Introducción a los Lenguajes de Programación',3,'P'],['SIS-302','Transmisión de Datos',3,'P'],['SIS-303','Estructuras de Datos',3,'P'],['ELE-301','Electiva Complementaria I',2,'E'],['MET-301','Fundamentos de Investigación',2,'P'],['SIS-304','Comunicación Escritural',2,'H'],['ELE-302','Electiva Socio-Humanística I',2,'E']],
    [['SIS-401','Lenguaje de Programación Orientada a Objetos',3,'P'],['SIS-402','Redes de Área Local',3,'P'],['SIS-403','Profundización I',3,'P'],['SIS-404','Bases de Datos I',3,'P'],['ELE-401','Electiva Complementaria II',2,'E'],['ELE-402','Competencias en Empresarismo I',2,'E'],['ELE-403','Competencias Investigativas I',2,'E'],['SIS-405','Retórica y Argumentación',2,'H']],
    [['SIS-501','Lenguaje de Programación para la Web',3,'P'],['SIS-502','Redes de Área Extensa',3,'P'],['SIS-503','Profundización II',3,'P'],['SIS-504','Bases de Datos II',3,'P'],['PRA-501','Práctica Empresarial y/o Social I',3,'P'],['ELE-501','Competencias en Desarrollo Empresarial II',2,'E'],['ELE-502','Competencias Investigativas II',2,'E'],['EST-501','Estadística General',3,'B'],['ELE-503','Electiva Socio-Humanística II',2,'E']],
    [['SIS-601','Lenguaje de Programación para Dispositivos Móviles',3,'P'],['SIS-602','Servidores',3,'P'],['SIS-603','Profundización III',3,'P'],['SIS-604','Laboratorio de Software',3,'P'],['PRA-601','Práctica Empresarial y/o Social II',3,'P'],['ELE-601','Competencias en Desarrollo Empresarial III',2,'E'],['ELE-602','Competencias Investigativas III',2,'E'],['ETI-601','Ética Profesional',2,'H']],
  ],

  // Tecnología en Contabilidad — Universidad de San Buenaventura
  10: [
    [['TCO-101','Derecho Constitucional Económico',2,'P'],['TCO-102','Razonamiento Lógico y Numérico',2,'B'],['TCO-103','Fundamentos de Economía',2,'B'],['TCO-104','Fundamentos de Administración',2,'P'],['TCO-105','Técnicas Contables',2,'P'],['TCO-106','Informática Aplicada',2,'P'],['HUM-101','Habilidades Comunicativas',2,'H'],['HUM-102','Proyecto de Vida',2,'H'],['CUL-101','Identidad Institucional',2,'H']],
    [['DER-201','Derecho Laboral y Comercial',4,'P'],['MAT-201','Matemáticas para la Empresa',2,'B'],['ECO-201','Microeconomía Básica',4,'B'],['TCO-201','Contabilidad para Pymes',4,'P'],['ELE-201','Electiva Segundo Semestre',2,'E'],['MET-201','Métodos de Investigación',2,'P'],['CUL-201','Cultura Ecológica',2,'H']],
    [['EST-301','Estadística Básica',3,'B'],['ECO-301','Macroeconomía Básica',4,'B'],['TCO-301','Contabilidad para Corporaciones',4,'P'],['ELE-301','Electiva Tercer Semestre',2,'E'],['MAT-301','Matemáticas Financieras',2,'B'],['TRI-301','Derecho Tributario Nacional',2,'P'],['ELE-302','Electiva Humanística',2,'E']],
    [['EST-401','Estadística Inferencial',3,'B'],['TCO-401','Pensamiento Contable',4,'P'],['TCO-402','Teoría y Sistemas de Control',4,'P'],['FIN-401','Finanzas Operativas',2,'P'],['TRI-401','Derecho Tributario Territorial',2,'P'],['TRI-402','Derecho Tributario Internacional',2,'P'],['ELE-401','Electiva Humanística',2,'E']],
    [['TCO-501','Contabilidades Especiales',4,'P'],['TCO-502','Contabilidad Analítica',4,'P'],['ADM-501','Planeación de Operaciones y Recursos',2,'P'],['FIN-501','Teoría Financiera Corporativa',2,'P'],['ELE-501','Electiva Humanística',2,'E']],
    [['TCO-601','Consultorio Contable en Informática',4,'P'],['AUD-601','Auditoría',4,'P'],['FIN-601','Teoría Financiera Internacional',2,'P']],
  ],
};

const MATERIAS_OTROS_PROGRAMAS = Object.entries(PLANES).flatMap(
  ([programaId, semestres]) => plan(Number(programaId), semestres)
);

export const FUENTES = FUENTES_PLANES;

/* =============================================
   Estudiantes matriculados.
   Es el registro que consume Admisiones y Registro:
   expedientes, estado de cuenta y certificados.
   Se construye de forma determinista (sin azar)
   para que el demo sea estable entre recargas.
   ============================================= */

const ASPIRANTES = [
  { id:'ASP-0001', nombre:'Mariana Restrepo Hoyos', documento:'1.008.774.215', programaId:1, puntajeIcfes:412, examen:78, promedio:4.62, fecha:'2026-05-12', estado:'admitido', documentos:'completo' },
  { id:'ASP-0002', nombre:'Juan Pablo Cardona', documento:'1.019.882.204', programaId:1, puntajeIcfes:388, examen:71, promedio:4.41, fecha:'2026-05-14', estado:'en_proceso', documentos:'pendiente' },
  { id:'ASP-0003', nombre:'Laura Fernanda Gómez', documento:'1.032.117.450', programaId:5, puntajeIcfes:401, examen:74, promedio:4.55, fecha:'2026-05-18', estado:'admitido', documentos:'completo' },
  { id:'ASP-0004', nombre:'Andrés Felipe Ortiz', documento:'1.021.663.908', programaId:2, puntajeIcfes:352, examen:66, promedio:4.08, fecha:'2026-05-20', estado:'en_proceso', documentos:'pendiente' },
  { id:'ASP-0005', nombre:'Sofía Palacio Naranjo', documento:'1.044.209.775', programaId:4, puntajeIcfes:377, examen:82, promedio:4.70, fecha:'2026-05-22', estado:'admitido', documentos:'completo' },
  { id:'ASP-0006', nombre:'Daniel Esteban Ríos', documento:'1.016.554.331', programaId:9, puntajeIcfes:298, examen:69, promedio:3.85, fecha:'2026-05-23', estado:'rechazado', documentos:'completo' },
  { id:'ASP-0007', nombre:'Valentina Cruz Mesa', documento:'1.037.441.029', programaId:3, puntajeIcfes:365, examen:70, promedio:4.33, fecha:'2026-05-25', estado:'en_proceso', documentos:'incompleto' },
  { id:'ASP-0008', nombre:'Nicolás Arturo Prieto', documento:'1.028.771.690', programaId:6, puntajeIcfes:344, examen:75, promedio:4.28, fecha:'2026-05-27', estado:'admitido', documentos:'completo' },
  { id:'ASP-0009', nombre:'Camila Andrea Pérez', documento:'1.041.996.517', programaId:5, puntajeIcfes:395, examen:68, promedio:4.47, fecha:'2026-05-28', estado:'en_proceso', documentos:'pendiente' },
  { id:'ASP-0010', nombre:'Sebastián Lozano Vega', documento:'1.013.332.884', programaId:8, puntajeIcfes:421, examen:88, promedio:4.75, fecha:'2026-06-01', estado:'admitido', documentos:'completo' },
  { id:'ASP-0011', nombre:'Isabella Moreno Rojas', documento:'1.035.668.142', programaId:7, puntajeIcfes:409, examen:85, promedio:4.60, fecha:'2026-06-02', estado:'admitido', documentos:'completo' },
  { id:'ASP-0012', nombre:'Tomás Alejandro Ruiz', documento:'1.009.887.213', programaId:1, puntajeIcfes:331, examen:64, promedio:3.92, fecha:'2026-06-04', estado:'rechazado', documentos:'completo' },
  { id:'ASP-0013', nombre:'Manuela Ochoa Pérez', documento:'1.048.330.761', programaId:10, puntajeIcfes:287, examen:72, promedio:4.05, fecha:'2026-06-05', estado:'en_proceso', documentos:'incompleto' },
  { id:'ASP-0014', nombre:'Samuel Betancur López', documento:'1.026.774.508', programaId:3, puntajeIcfes:358, examen:73, promedio:4.29, fecha:'2026-06-08', estado:'admitido', documentos:'completo' },
];

// Estudiantes que ya venían de periodos anteriores, para que el registro no
// tengan solo admisiones del 2026-1.
const PREVIOS = [
  { nombre:'Carlos Andrés Martínez', documento:'1.023.445.671', codigo:'20231001', programaId:1, semestre:6, promedio:4.20, nota1:4.2, nota2:3.8, estado:'activo',  ingreso:'2023-08-01' },
  { nombre:'Ana Lucía Ospina',        documento:'1.031.774.290', codigo:'20231002', programaId:4, semestre:7, promedio:3.95, nota1:3.9, nota2:4.1, estado:'activo',  ingreso:'2023-08-01' },
  { nombre:'Diego Fernando Ruiz',     documento:'1.019.552.803', codigo:'20231003', programaId:2, semestre:8, promedio:2.85, nota1:2.5, nota2:3.0, estado:'retirado', ingreso:'2022-08-01' },
  { nombre:'Valentina Torres',        documento:'1.043.908.115', codigo:'20231004', programaId:5, semestre:5, promedio:4.72, nota1:4.8, nota2:4.7, estado:'activo',  ingreso:'2024-02-01' },
  { nombre:'Sebastián Mora',          documento:'1.037.221.664', codigo:'20231005', programaId:6, semestre:8, promedio:3.60, nota1:3.5, nota2:3.8, estado:'activo',  ingreso:'2022-08-01' },
  { nombre:'Isabella García',         documento:'1.046.335.027', codigo:'20231006', programaId:3, semestre:7, promedio:4.15, nota1:4.0, nota2:4.2, estado:'graduado', ingreso:'2021-08-01' },
];

const CONCEPTOS = [
  { concepto:'Matrícula Semestre 2026-1',   valor:3850000, tipo:'matricula' },
  { concepto:'Seguro estudiantil',         valor:96000,   tipo:'matricula' },
  { concepto:'Laboratorio y materiales',   valor:320000,  tipo:'matricula' },
  { concepto:'Certificados y constancias', valor:85000,  tipo:'certificado' },
  { concepto:'Derechos de grado',          valor:1250000, tipo:'grado' },
];

// Perfil de pago por estudiante. Es fijo (no aleatorio) para que la cartera
// tenga siempre los tres escenarios: al día, con saldo y en mora.
const PERFIL_PAGO = ['al_dia','pendiente','al_dia','mora','pendiente','al_dia','pendiente','al_dia','pendiente','mora','al_dia','pendiente','al_dia'];
const CICLO_DOCS = ['completo','completo','pendiente','completo','incompleto'];
const JORNADAS   = ['Diurno','Nocturno'];

const slug = (nombre) =>
  nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '')
    .trim()
    .replace(/\s+/g, '.');

const pagosDe = (indice, perfil, semestre) =>
  CONCEPTOS
    .filter((c) => c.tipo !== 'grado' || semestre >= 8)
    .map((c, i) => {
      const ultimo = i === CONCEPTOS.filter((x) => x.tipo !== 'grado' || semestre >= 8).length - 1;
      let est = 'pagado';
      if (perfil !== 'al_dia' && ultimo) est = 'pendiente';
      if (perfil === 'mora' && ultimo) est = 'vencido';
      return {
        id: `PG-${indice + 1}-${i + 1}`,
        concepto: c.concepto,
        tipo: c.tipo,
        valor: c.valor,
        // Todos los cobros vencen a mitad de cada mes del periodo.
        fecha_limite: `2026-0${i < 3 ? 2 : 3}-15`,
        fecha_pago: est === 'pagado' ? `2026-0${i < 3 ? 1 : 2}-${10 + (i % 9)}` : null,
        estado: est,
        referencia: est === 'pagado' ? `PAG-2026${i < 3 ? '02' : '03'}-${String(indice + 1).padStart(3, '0')}` : null,
      };
    });

const construirEstudiantes = () => {
  const lista = [];

  PREVIOS.forEach((e, i) => {
    lista.push({
      id: e.codigo,
      nombre: e.nombre,
      documento: e.documento,
      correo: slug(e.nombre) + '@uni.edu.co',
      telefono: `31${2 + (i % 7)} ${100 + i * 37} ${2000 + i * 111}`,
      direccion: `Cra. ${10 + i} #${20 + i}-${11 + i}, Bogotá`,
      programaId: e.programaId,
      semestre: e.semestre,
      jornada: JORNADAS[i % 2],
      promedio: e.promedio,
      estado: e.estado,
      documentos: CICLO_DOCS[i % CICLO_DOCS.length],
      fechaIngreso: e.ingreso,
      admisioId: null,
      pagos: pagosDe(i, e.estado === 'retirado' ? 'mora' : PERFIL_PAGO[i], e.semestre),
    });
  });

  ASPIRANTES.filter((a) => a.estado === 'admitido').forEach((a, i) => {
    const n = i + PREVIOS.length;
    lista.push({
      id: `2026${String(1000 + i)}`,
      nombre: a.nombre,
      documento: a.documento,
      correo: slug(a.nombre) + '@uni.edu.co',
      telefono: `31${3 + (i % 6)} ${200 + i * 41} ${3000 + i * 97}`,
      direccion: `Cll. ${40 + i} #${30 + i}-${21 + i}, Bogotá`,
      programaId: a.programaId,
      semestre: 1,
      jornada: JORNADAS[(i + 1) % 2],
      promedio: a.promedio,
      // El proceso vigente tiene abierta la inscripción de admitidos.
      estado: 'en_inscripcion',
      documentos: a.documentos,
      fechaIngreso: '2026-07-15',
      admisioId: a.id,
      pagos: pagosDe(n, PERFIL_PAGO[n], 1),
    });
  });

  return lista;
};

export const ESTUDIANTES = construirEstudiantes();

export const INITIAL_DATA = {
  materias: [
    { id:1, codigo:'IS-602', nombre:'Ingeniería de Software',        creditos:4, profesor:'Dra. Laura Sánchez', nota1:4.8, nota2:4.5, nota3:null, definitiva:null, estado:'en_curso', periodo:'2026-1' },
    { id:2, codigo:'IS-603', nombre:'Redes Computacionales I',      creditos:4, profesor:'Ing. Suárez',      nota1:3.5, nota2:4.0, nota3:null, definitiva:null, estado:'en_curso', periodo:'2026-1' },
    { id:3, codigo:'IS-601', nombre:'Arquitectura del Computador',   creditos:4, profesor:'Dr. Ramírez',      nota1:4.2, nota2:3.8, nota3:4.5, definitiva:4.2, estado:'aprobado', periodo:'2026-1' },
    { id:4, codigo:'MAT-302', nombre:'Cálculo Integral',             creditos:4, profesor:'Dra. Mendez',      nota1:2.8, nota2:3.1, nota3:2.5, definitiva:2.8, estado:'reprobado', periodo:'2025-2' },
    { id:5, codigo:'IS-402', nombre:'Programación Orientada a Objetos', creditos:4, profesor:'Dra. Mendez',   nota1:4.6, nota2:4.7, nota3:4.9, definitiva:4.7, estado:'aprobado', periodo:'2025-2' },
    { id:6, codigo:'HUM-601', nombre:'Ética',                         creditos:2, profesor:'Lic. Vargas',      nota1:4.0, nota2:4.2, nota3:4.1, definitiva:4.1, estado:'aprobado', periodo:'2025-2' },
  ],
  /* Certificados de los estudiantes: los que emiten Registro/Admisiones y los que
     el alumno tiene solicitados y aún no se le entregan. El `id` va numérico
     porque es el que usa la API al bajar el PDF, y `codigo` es el folio que se
     muestra en las tablas. */
  certificadosEmitidos: [
    { id:1, codigo:'CE-0001', estudianteId:'20231006', tipo:'Certificado de Calificaciones', fecha:'2026-08-05', solicitado:null,          estado:'entregado',  matricula:'20231006' },
    { id:2, codigo:'CE-0002', estudianteId:'20231001', tipo:'Paz y Salvo Financiero',       fecha:'2026-08-12', solicitado:null,          estado:'entregado',  matricula:'20231001' },
    { id:3, codigo:'CE-0003', estudianteId:'20231004', tipo:'Constancia de Notas',          fecha:null,         solicitado:'2026-08-20', estado:'en_proceso', matricula:'20231004' },
  ],
  certificados: [
    /* Los certificados del propio alumno: los que pidió y los que le emitieron sin
       que los pidiera (el Paz y Salvo, que sale en `certificadosEmitidos`). */
    { id:1, tipo:'Certificado de Estudios', fecha:'2026-07-15', estado:'disponible', solicitado:'2026-07-10' },
    { id:2, tipo:'Constancia de Notas', fecha:'2026-06-20', estado:'disponible', solicitado:'2026-06-18' },
    { id:3, tipo:'Paz y Salvo Financiero', fecha:null, estado:'en_proceso', solicitado:'2026-08-01' },
    { id:4, tipo:'Certificado de Matrícula', fecha:'2026-02-01', estado:'disponible', solicitado:'2026-01-28' },
    { id:5, tipo:'Paz y Salvo Financiero', fecha:'2026-08-12', estado:'entregado', solicitado:null },
  ],
  pagos: [
    { id:1, concepto:'Matrícula Semestre 2026-1', valor:3850000, fecha_limite:'2026-01-25', fecha_pago:'2026-01-20', estado:'pagado', referencia:'PAG-20260120-001' },
    { id:2, concepto:'Derechos Complementarios', valor:180000, fecha_limite:'2026-02-10', fecha_pago:'2026-02-08', estado:'pagado', referencia:'PAG-20260208-002' },
    { id:3, concepto:'Matrícula Semestre 2026-2', valor:3950000, fecha_limite:'2026-07-25', fecha_pago:null, estado:'pendiente', referencia:null },
    { id:4, concepto:'Seguro Estudiantil 2026', valor:45000, fecha_limite:'2026-03-01', fecha_pago:'2026-02-28', estado:'pagado', referencia:'PAG-20260228-003' },
  ],
  cursos: [
    { id:1, nombre:'Ingeniería de Software',       codigo:'IS-602', profesor:'Dra. Laura Sánchez', grupo:'A', estudiantes:32, icon:'💻', color:'linear-gradient(135deg,#6d28d9,#8b5cf6)', progreso:50 },
    { id:2, nombre:'Redes Computacionales I',     codigo:'IS-603', profesor:'Ing. Suárez',   grupo:'B', estudiantes:28, icon:'🌐', color:'linear-gradient(135deg,#0369a1,#0ea5e9)', progreso:65 },
    { id:3, nombre:'Arquitectura del Computador',  codigo:'IS-601', profesor:'Dr. Ramírez',   grupo:'A', estudiantes:30, icon:'🔌', color:'linear-gradient(135deg,#065f46,#10b981)', progreso:100 },
  ],
  actividades: [
    { id:1,  cursoId:1, corte:2, titulo:'Diagramas UML — Casos de Uso',    tipo:'taller',   fechaEntrega:'2026-08-22', descripcion:'Modelar los casos de uso y sus diagramas para el sistema propuesto.',            puntos:40,  estado_est:'pendiente',  nota:null },
    { id:2,  cursoId:1, corte:3, titulo:'Proyecto Final — Especificación',  tipo:'proyecto', fechaEntrega:'2026-09-10', descripcion:'Entregar la especificación completa de requerimientos y el modelo de arquitectura.',   puntos:100, estado_est:'pendiente',  nota:null },
    { id:3,  cursoId:1, corte:2, titulo:'Informe de Requisitos (ERS)',        tipo:'informe',  fechaEntrega:'2026-08-28', descripcion:'Documento de especificación de requisitos de software conforme a IEEE 830.',         puntos:60,  estado_est:'pendiente',  nota:null },
    { id:4,  cursoId:1, corte:1, titulo:'Parcial 1 — Análisis de Requisitos', tipo:'parcial', fechaEntrega:'2026-08-05', descripcion:'Examen escrito sobre técnicas de levantamiento y análisis de requisitos.',         puntos:50,  estado_est:'calificado', nota:43  },
    { id:5,  cursoId:2, corte:2, titulo:'Taller de Configuración de LAN',    tipo:'taller',   fechaEntrega:'2026-08-25', descripcion:'Configurar una LAN con subredes, switches y direccionamiento estático.',              puntos:50,  estado_est:'pendiente',  nota:null },
    { id:6,  cursoId:2, corte:1, titulo:'Quiz — Modelo TCP/IP',              tipo:'quiz',     fechaEntrega:'2026-08-19', descripcion:'Quiz de 10 preguntas sobre el modelo en capas y el protocolo TCP/IP.',             puntos:30,  estado_est:'calificado', nota:27  },
    { id:7,  cursoId:2, corte:3, titulo:'Laboratorio de Enrutamiento OSPF',  tipo:'taller',   fechaEntrega:'2026-09-25', descripcion:'Configurar y verificar rutas OSPF entre tres routers de laboratorio.',               puntos:70,  estado_est:'pendiente',  nota:null },
    { id:8,  cursoId:3, corte:1, titulo:'Taller de Puertos y Direcciones',    tipo:'taller',   fechaEntrega:'2026-07-15', descripcion:'Identificar puertos de E/S y su direccionamiento en el computador.',                  puntos:30,  estado_est:'calificado', nota:28  },
    { id:9,  cursoId:3, corte:2, titulo:'Parcial 2 — ALU y Pipeline',         tipo:'parcial',  fechaEntrega:'2026-08-20', descripcion:'Examen sobre la unidad aritmética-lógica y el pipeline del procesador.',               puntos:50,  estado_est:'calificado', nota:45  },
    { id:10, cursoId:3, corte:3, titulo:'Proyecto Final — Processor Simple', tipo:'proyecto', fechaEntrega:'2026-09-25', descripcion:'Implementar un procesador simple en HDL con su unidad de control.',                   puntos:80,  estado_est:'pendiente',  nota:null },
  ],
  anuncios: [
    { id:1, cursoId:1, titulo:'Cambio de horario — semana del 25 ago', contenido:'La clase del martes 26 se traslada al miércoles 27 a las 8am. Laboratorio B-205.', fecha:'2026-08-21', autor:'Dra. Laura Sánchez' },
    { id:2, cursoId:2, titulo:'Material de apoyo disponible', contenido:'Se subió la guía de direccionamiento IP y la plantilla de la práctica en la sección de recursos.', fecha:'2026-08-20', autor:'Ing. Suárez' },
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
  // Cada notificación declara sus roles (roles: '*' = todos) y un destino:
  //   destino.vista/tab -> vista del Dashboard, destino.ruta/tab -> ruta propia del módulo,
  //   destino.cursoId -> detalle de un curso.
  notificaciones: [
    /* ---------- Estudiante ---------- */
    { id:101, roles:['estudiante'], titulo:'Nota publicada', msg:'Quiz SQL: 27/30 puntos', tipo:'success', tiempo:'Hace 2 horas', leida:false, destino:{ vista:'academico', tab:'notas' } },
    { id:102, roles:['estudiante'], titulo:'Tarea por vencer', msg:'Taller Normalización 3FN vence el 25 ago', tipo:'warning', tiempo:'Hace 5 horas', leida:false, destino:{ vista:'lms', tab:'tareas', filtroTareas:'pendientes' } },
    { id:103, roles:['estudiante'], titulo:'Nuevo anuncio', msg:'Ingeniería de Software: Cambio de horario', tipo:'info', tiempo:'Hace 1 día', leida:false, destino:{ cursoId:1 } },
    { id:104, roles:['estudiante'], titulo:'Volante disponible', msg:'Matrícula 2026-2 ya está disponible', tipo:'info', tiempo:'Hace 3 días', leida:true, destino:{ vista:'academico', tab:'pagos', filtroPagos:'pendientes' } },

    /* ---------- Profesor ---------- */
    { id:201, roles:['profesor'], titulo:'Entregas por calificar', msg:'3 submissions sin nota en Bases de Datos', tipo:'warning', tiempo:'Hace 1 hora', leida:false, destino:{ vista:'lms', tab:'tareas', filtroTareas:'entregadas' } },
    { id:202, roles:['profesor'], titulo:'Acta de nota pendiente', msg:'IS-310 tiene 28students sin confirmar', tipo:'warning', tiempo:'Hace 4 horas', leida:false, destino:{ vista:'academico', tab:'notas' } },
    { id:203, roles:['profesor'], titulo:'Nuevo anuncio', msg:'Ingeniería de Software: Cambio de horario', tipo:'info', tiempo:'Hace 1 día', leida:false, destino:{ cursoId:1 } },
    { id:204, roles:['profesor'], titulo:'Cátedra iniciada', msg:'Programación de Videojuegos abre su periodo de notas', tipo:'info', tiempo:'Hace 2 días', leida:true, destino:{ vista:'academico', tab:'cursos' } },

    /* ---------- Admisiones y Registro ---------- */
    { id:301, roles:['admisiones','admin'], titulo:'Expedientes incompletos', msg:'5 aspirantes con documentación pendiente', tipo:'warning', tiempo:'Hace 30 minutos', leida:false, destino:{ ruta:'/admisiones', tab:'documentos' } },
    { id:302, roles:['admisiones','admin'], titulo:'Aspirantes sin decisión', msg:'5 resultados en proceso por definir', tipo:'warning', tiempo:'Hace 2 horas', leida:false, destino:{ ruta:'/admisiones', tab:'aspirantes' } },
    { id:303, roles:['admisiones','admin'], titulo:'Pendientes de matrícula', msg:'7 admitidos por matricular', tipo:'info', tiempo:'Hace 5 horas', leida:false, destino:{ ruta:'/admisiones', tab:'registro' } },
    { id:304, roles:['admisiones','admin'], titulo:'Certificado solicitado', msg:'1 trámite esperando emisión', tipo:'info', tiempo:'Hace 1 día', leida:false, destino:{ ruta:'/admisiones', tab:'certificados' } },
    { id:305, roles:['admisiones','admin'], titulo:'Cartera en mora', msg:'3 estudiantes con saldo vencido', tipo:'warning', tiempo:'Hace 2 días', leida:false, destino:{ ruta:'/admisiones', tab:'cuenta' } },

    /* ---------- Administración ---------- */
    { id:401, roles:['admin'], titulo:'Programas sin cupo asignado', msg:'2 programas requieren definir la oferta de cupos', tipo:'warning', tiempo:'Hace 1 hora', leida:false, destino:{ ruta:'/admin', tab:'programas' } },
    { id:402, roles:['admin'], titulo:'Docentes por vincular', msg:'2 docentes sin programa asignado', tipo:'info', tiempo:'Hace 3 horas', leida:false, destino:{ ruta:'/admin', tab:'docentes' } },
    { id:403, roles:['admin'], titulo:'Proceso de admisiones activo', msg:'El periodo 2026-2 está en etapa de resultados', tipo:'info', tiempo:'Hace 1 día', leida:false, destino:{ ruta:'/admisiones' } },
    { id:404, roles:['admin'], titulo:'Reporte financiero disponible', msg:'Ejecución presupuestal corte a agosto', tipo:'success', tiempo:'Hace 3 días', leida:true, destino:{ ruta:'/admin', tab:'finanzas' } },

    /* ---------- Rectoría ---------- */
    { id:501, roles:['rectoria'], titulo:'Indicadores bajo meta', msg:'3 indicadores de Convergence están en rojo', tipo:'warning', tiempo:'Hace 1 hora', leida:false, destino:{ ruta:'/rectoria', tab:'indicadores' } },
    { id:502, roles:['rectoria'], titulo:'Ejecución presupuestal', msg:'62% del presupuesto anual comprometido', tipo:'info', tiempo:'Hace 4 horas', leida:false, destino:{ ruta:'/rectoria', tab:'sostenibilidad' } },
    { id:503, roles:['rectoria'], titulo:'Programas en riesgo', msg:'2 programas con baja matrícula de primer semestre', tipo:'warning', tiempo:'Hace 1 día', leida:false, destino:{ ruta:'/rectoria', tab:'programas' } },
    { id:504, roles:['rectoria'], titulo:'Tasa de admisión', msg:'El proceso 2026-2 cerró con 50% de admitidos', tipo:'success', tiempo:'Hace 4 días', leida:true, destino:{ ruta:'/rectoria', tab:'admisiones' } },

    /* ---------- Talento Humano ---------- */
    { id:601, roles:['talento_humano'], titulo:'Sobrecarga académica', msg:'2 docentes superan el 120% de la carga', tipo:'warning', tiempo:'Hace 2 horas', leida:false, destino:{ ruta:'/talento-humano', tab:'carga' } },
    { id:602, roles:['talento_humano'], titulo:'Plaza vacante', msg:'Ingeniería de Software sin docente titular', tipo:'info', tiempo:'Hace 6 horas', leida:false, destino:{ ruta:'/talento-humano', tab:'planta' } },
    { id:603, roles:['talento_humano'], titulo:'Áreas sin cubrir', msg:'1 área depende de un docente por contrato', tipo:'warning', tiempo:'Hace 1 día', leida:false, destino:{ ruta:'/talento-humano', tab:'areas' } },
    { id:604, roles:['talento_humano'], titulo:'Aptitud en riesgo', msg:'1 docente próximo a cumplir 70 años', tipo:'info', tiempo:'Hace 3 días', leida:true, destino:{ ruta:'/talento-humano', tab:'planta' } },

    /* ---------- Contabilidad ---------- */
    { id:701, roles:['contabilidad'], titulo:'Conciliación pendiente', msg:'2 Extractos bancarios sin cuadrar', tipo:'warning', tiempo:'Hace 45 minutos', leida:false, destino:{ ruta:'/contabilidad', tab:'conciliacion' } },
    { id:702, roles:['contabilidad'], titulo:'Recaudo del día', msg:'Cierre de caja con 48 transacciones', tipo:'info', tiempo:'Hace 3 horas', leida:false, destino:{ ruta:'/contabilidad', tab:'recaudo' } },
    { id:703, roles:['contabilidad'], titulo:'Cartera en mora', msg:'3 estudiantes con saldo vencido', tipo:'warning', tiempo:'Hace 1 día', leida:false, destino:{ ruta:'/contabilidad', tab:'cartera' } },
    { id:704, roles:['contabilidad'], titulo:'Comprobantes sin enviar', msg:'4 recibos quedan pendientes de envío', tipo:'info', tiempo:'Hace 2 días', leida:false, destino:{ ruta:'/contabilidad', tab:'recaudo' } },
  ],
  eventos: [
    { fecha:22, titulo:'Entrega UML IS-310', tipo:'tarea' },
    { fecha:25, titulo:'Taller Normalización', tipo:'tarea' },
    { fecha:27, titulo:'Clase BD II (cambio)', tipo:'clase' },
    { fecha:28, titulo:'Informe Requisitos', tipo:'tarea' },
  ],
  listaEstudiantes: PREVIOS.map((e) => ({ id:e.codigo, nombre:e.nombre, codigo:e.codigo, nota1:e.nota1, nota2:e.nota2 })),
  estudiantes: ESTUDIANTES,
  cursos_info: {
    1: { programa:'Ing. de Sistemas y Computación', semestre:6 },
    2: { programa:'Ing. de Sistemas y Computación', semestre:6 },
    3: { programa:'Ing. de Sistemas y Computación', semestre:6 },
  },

  // ── Docentes (módulo de administration y cátedra) ──────────────────────────
  docentes: [
    { id:'DOC-0045', nombre:'Dra. Laura Sánchez', area:'Ingeniería de Software', titulo:'Magíster en Ingeniería de Software', email:'l.sanchez@uni.edu.co', estado:'activo', categoria:'Docente titular' },
    { id:'DOC-0046', nombre:'Dr. Ramírez', area:'Arquitectura de Computadores', titulo:'Doctor en Ingeniería Eléctrica', email:'j.ramirez@uni.edu.co', estado:'activo', categoria:'Docente titular' },
    { id:'DOC-0047', nombre:'Ing. Suárez', area:'Redes y Telecomunicaciones', titulo:'Magíster en Telecomunicaciones', email:'m.suarez@uni.edu.co', estado:'activo', categoria:'Docente titular' },
    { id:'DOC-0048', nombre:'Dra. Mendez', area:'Matemáticas', titulo:'Doctora en Ciencias', email:'l.mendez@uni.edu.co', estado:'activo', categoria:'Docente titular' },
    { id:'DOC-0049', nombre:'Dr. González', area:'Física', titulo:'Doctor en Física', email:'a.gonzalez@uni.edu.co', estado:'activo', categoria:'Docente titular' },
    { id:'DOC-0050', nombre:'Lic. Vargas', area:'Humanidades', titulo:'Licenciatura en Filosofía', email:'c.vargas@uni.edu.co', estado:'activo', categoria:'Docente contractual' },
    { id:'DOC-0051', nombre:'Mg. Castillo', area:'Administración', titulo:'Magíster en Administración', email:'r.castillo@uni.edu.co', estado:'activo', categoria:'Docente titular' },
    { id:'DOC-0052', nombre:'Dr. Lozano', area:'Estadística', titulo:'Doctor en Estadística', email:'d.lozano@uni.edu.co', estado:'activo', categoria:'Docente titular' },
    { id:'DOC-0053', nombre:'Mg. Ariza', area:'Proyectos', titulo:'Magíster en Ingeniería de Proyectos', email:'p.ariza@uni.edu.co', estado:'permanencia', categoria:'Docente de planta' },
  ],

  // ── Admisiones ─────────────────────────────────────────────────────────────
  admisiones: {
    procesoAbierto: true,
    periodos: [
      { id:1, nombre:'Admisión 2026-1', fechaApertura:'2026-01-15', fechaCierre:'2026-06-30', fechaResultados:'2026-07-10', fechaInscripcion:'2026-07-15', cuposTotales:820, estado:'inscripciones' },
      { id:2, nombre:'Admisión 2026-2', fechaApertura:'2026-06-01', fechaCierre:'2026-11-30', fechaResultados:'2026-12-10', fechaInscripcion:'2026-12-15', cuposTotales:820, estado:'convocatoria' },
      { id:3, nombre:'Admisión 2027-1', fechaApertura:'2027-01-05', fechaCierre:'2027-05-30', fechaResultados:'2027-06-08', fechaInscripcion:'2027-06-15', cuposTotales:860, estado:'planificado' },
    ],
    configuracion: [
      { id:'cfg-icfes', nombre:'Prueba Saber 11', peso:45, obligatorio:true, descripción:'Puntaje de la prueba Saber 11 o equivalente.' },
      { id:'cfg-examen', nombre:'Examen de admisión institucional', peso:30, obligatorio:true, descripción:'Examen interno que mide razonamiento y UDP.' },
      { id:'cfg-prom', nombre:'Promedio de bachillerato', peso:15, obligatorio:true, descripción:'Promedio registrado en el certificado.' },
      { id:'cfg-udp', nombre:'UDP / prueba de orientación', peso:10, obligatorio:false, descripcion:'Prueba de UDP, ponderada al 10%.' },
    ],
    documentos: [
      { id:'doc-1', nombre:'Cédula de ciudadanía', obligatorio:true, vigente:true },
      { id:'doc-2', nombre:'Certificado de bachillerato', obligatorio:true, vigente:true },
      { id:'doc-3', nombre:'Resultados Saber 11', obligatorio:true, vigente:true },
      { id:'doc-4', nombre:'Certificado de matrícula de bachillerato', obligatorio:true, vigente:false },
      { id:'doc-5', nombre:'Formato de matrícula', obligatorio:true, vigente:false },
    ],
    aspirantes: ASPIRANTES,
  },

  matricula: {
    modalidades: [
      { id:1, nombre:'Pregrado', icon:'🎓', bgClass:'bg-blue-100', descripcion:'Programas de formación universitaria de nivel profesional', programas:6 },
      { id:2, nombre:'Posgrado', icon:'🏛️', bgClass:'bg-purple-100', descripcion:'Especializaciones, maestrías y doctorados', programas:4 },
      { id:3, nombre:'Tecnología', icon:'⚙️', bgClass:'bg-green-100', descripcion:'Programas tecnológicos de nivel profesional técnico', programas:3 },
    ],
    programas: [
      { id:1, modalidadId:1, nombre:'Ingeniería de Sistemas y Computación', facultad:'Fac. Ingeniería', semestres:10, creditos:198, cupo:1150, matriculados:1040, icon:'💻', bgClass:'bg-blue-100', snies:'53010135', jornada:'Diurno' },
      { id:2, modalidadId:1, nombre:'Ingeniería Civil', facultad:'Fac. Ingeniería', semestres:10, creditos:167, cupo:900, matriculados:812, icon:'🏗️', bgClass:'bg-yellow-100', snies:'53010146', jornada:'Diurno' },
      { id:3, modalidadId:1, nombre:'Administración de Empresas', facultad:'Fac. Ciencias Económicas', semestres:9, creditos:130, cupo:1300, matriculados:1186, icon:'📊', bgClass:'bg-green-100', snies:'53010123', jornada:'Nocturno' },
      { id:4, modalidadId:1, nombre:'Contaduría Pública', facultad:'Fac. Ciencias Económicas', semestres:8, creditos:145, cupo:1080, matriculados:974, icon:'📒', bgClass:'bg-teal-100', snies:'53010157', jornada:'Nocturno' },
      { id:5, modalidadId:1, nombre:'Psicología', facultad:'Fac. Ciencias Sociales', semestres:10, creditos:125, cupo:1160, matriculados:1052, icon:'🧠', bgClass:'bg-purple-100', snies:'53010201', jornada:'Diurno' },
      { id:6, modalidadId:1, nombre:'Derecho', facultad:'Fac. Ciencias Jurídicas', semestres:8, creditos:198, cupo:860, matriculados:768, icon:'⚖️', bgClass:'bg-red-100', snies:'53010088', jornada:'Nocturno' },
      { id:7, modalidadId:2, nombre:'Esp. en Gerencia de Proyectos', facultad:'Fac. Posgrados', semestres:2, creditos:25, cupo:220, matriculados:186, icon:'📋', bgClass:'bg-indigo-100', snies:'91010001', jornada:'Sabatino' },
      { id:8, modalidadId:2, nombre:'Maestría en Educación', facultad:'Fac. Posgrados', semestres:4, creditos:40, cupo:180, matriculados:148, icon:'📚', bgClass:'bg-pink-100', snies:'91010010', jornada:'Sabatino' },
      { id:9, modalidadId:3, nombre:'Tecnología en Sistemas', facultad:'Fac. Ingeniería', semestres:6, creditos:117, cupo:800, matriculados:694, icon:'🖥️', bgClass:'bg-cyan-100', snies:'73010001', jornada:'Diurno' },
      { id:10, modalidadId:3, nombre:'Tecnología en Contabilidad', facultad:'Fac. Económicas', semestres:6, creditos:100, cupo:820, matriculados:712, icon:'🧮', bgClass:'bg-orange-100', snies:'73010009', jornada:'Nocturno' },
    ],
    // Plan de estudios de Ingeniería de Sistemas y Computación — CUL.
    // Los créditos son estimados (el documento oficial no era legible); el
    // prerrequisito se deja null para no inventar reglas de bloqueo.
    materias: [
      { id:101,  programaId:1, semestre:1, codigo:'FIS-101', nombre:'Física Mecánica',                        area:'Básica',      creditos:4, profesor:'Dr. González',     horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:102,  programaId:1, semestre:1, codigo:'HUM-101', nombre:'Comunicación Oral y Escrita',           area:'Humanidades',  creditos:2, profesor:'Lic. Vargas',      horas:2, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:103,  programaId:1, semestre:1, codigo:'MAT-101', nombre:'Fundamentos Matemáticos',               area:'Básica',      creditos:3, profesor:'Dra. Mendez',      horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:104,  programaId:1, semestre:1, codigo:'HUM-102', nombre:'Formación del Espíritu Científico',     area:'Humanidades',  creditos:2, profesor:'Lic. Vargas',      horas:2, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
      { id:105,  programaId:1, semestre:1, codigo:'IS-101',  nombre:'Fundamentos de Programación',          area:'Básica',      creditos:4, profesor:'Dr. Ramírez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:106,  programaId:1, semestre:1, codigo:'IS-102',  nombre:'Introducción a la Ingeniería',        area:'Profesional',  creditos:2, profesor:'Mg. Ariza',        horas:2, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:107,  programaId:1, semestre:1, codigo:'HUM-103', nombre:'Sociedad y Tecnología',            area:'Humanidades',  creditos:2, profesor:'Lic. Vargas',      horas:2, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
      { id:201,  programaId:1, semestre:2, codigo:'HUM-201', nombre:'Constitución Política',                area:'Humanidades',  creditos:2, profesor:'Dr. Lozano',       horas:2, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:202,  programaId:1, semestre:2, codigo:'FIS-201', nombre:'Física Calor',                          area:'Básica',      creditos:4, profesor:'Dr. González',     horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:203,  programaId:1, semestre:2, codigo:'IS-201',  nombre:'Laboratorio de Programación 2',       area:'Básica',      creditos:2, profesor:'Dr. Ramírez',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:204,  programaId:1, semestre:2, codigo:'MAT-201', nombre:'Cálculo Diferencial',                  area:'Básica',      creditos:4, profesor:'Dra. Mendez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:205,  programaId:1, semestre:2, codigo:'MAT-202', nombre:'Álgebra Lineal',                      area:'Básica',      creditos:3, profesor:'Dra. Mendez',      horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:206,  programaId:1, semestre:2, codigo:'IS-202',  nombre:'Programación',                         area:'Básica',      creditos:4, profesor:'Dr. Ramírez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:301,  programaId:1, semestre:3, codigo:'ADM-301', nombre:'Fundamentos Administrativos',         area:'Profesional',  creditos:3, profesor:'Mg. Castillo',     horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:302,  programaId:1, semestre:3, codigo:'IS-301',  nombre:'Estructuras de Datos',                area:'Profesional',  creditos:4, profesor:'Dr. Ramírez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:303,  programaId:1, semestre:3, codigo:'ELE-301', nombre:'Electiva de Humanidades',             area:'Electiva',    creditos:2, profesor:'Por asignar',      horas:2, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:304,  programaId:1, semestre:3, codigo:'MAT-301', nombre:'Estadística Descriptiva',              area:'Básica',      creditos:3, profesor:'Dr. Lozano',       horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:305,  programaId:1, semestre:3, codigo:'FIS-301', nombre:'Física Eléctrica',                     area:'Básica',      creditos:4, profesor:'Dr. González',     horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:306,  programaId:1, semestre:3, codigo:'MAT-302', nombre:'Cálculo Integral',                     area:'Básica',      creditos:4, profesor:'Dra. Mendez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:401,  programaId:1, semestre:4, codigo:'IS-401',  nombre:'Base de Datos I',                     area:'Profesional',  creditos:4, profesor:'Dra. Laura Sánchez', horas:5, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:402,  programaId:1, semestre:4, codigo:'MAT-401', nombre:'Ecuaciones Diferenciales',            area:'Básica',      creditos:4, profesor:'Dra. Mendez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:403,  programaId:1, semestre:4, codigo:'MAT-402', nombre:'Estadística Inferencial',              area:'Básica',      creditos:3, profesor:'Dr. Lozano',       horas:4, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:404,  programaId:1, semestre:4, codigo:'IS-402',  nombre:'Programación Orientada a Objetos',   area:'Profesional',  creditos:4, profesor:'Dra. Mendez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:501,  programaId:1, semestre:5, codigo:'FIS-501', nombre:'Electrónica Análoga',                  area:'Básica',      creditos:4, profesor:'Dr. González',     horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:502,  programaId:1, semestre:5, codigo:'ELE-501', nombre:'Electiva Disciplinar II',             area:'Electiva',    creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:503,  programaId:1, semestre:5, codigo:'ELE-502', nombre:'Electiva Disciplinar (Base de Datos)', area:'Electiva',   creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
      { id:504,  programaId:1, semestre:5, codigo:'MET-501', nombre:'Metodología de la Investigación',     area:'Profesional',  creditos:3, profesor:'Mg. Ariza',        horas:3, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:505,  programaId:1, semestre:5, codigo:'MAT-501', nombre:'Métodos Numéricos',                   area:'Básica',      creditos:3, profesor:'Dra. Mendez',      horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:506,  programaId:1, semestre:5, codigo:'IS-501',  nombre:'Sistemas Operativos',                 area:'Profesional',  creditos:4, profesor:'Ing. Suárez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:507,  programaId:1, semestre:5, codigo:'IS-502',  nombre:'Teoría General de Sistemas',          area:'Profesional',  creditos:3, profesor:'Mg. Torres',       horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:601,  programaId:1, semestre:6, codigo:'IS-601',  nombre:'Arquitectura del Computador',         area:'Profesional',  creditos:4, profesor:'Dr. Ramírez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:602,  programaId:1, semestre:6, codigo:'FIS-601', nombre:'Electrónica Digital',                 area:'Básica',      creditos:3, profesor:'Dr. González',     horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:603,  programaId:1, semestre:6, codigo:'HUM-601', nombre:'Ética',                               area:'Humanidades',  creditos:2, profesor:'Lic. Vargas',      horas:2, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:604,  programaId:1, semestre:6, codigo:'ADM-601', nombre:'Gestión Financiera',                 area:'Profesional',  creditos:3, profesor:'Mg. Castillo',     horas:3, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:605,  programaId:1, semestre:6, codigo:'MAT-601', nombre:'Investigación de Operaciones',       area:'Profesional',  creditos:3, profesor:'Dr. Lozano',       horas:4, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
      { id:606,  programaId:1, semestre:6, codigo:'IS-602',  nombre:'Ingeniería de Software',             area:'Profesional',  creditos:4, profesor:'Mg. Torres',       horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:607,  programaId:1, semestre:6, codigo:'IS-603',  nombre:'Redes Computacionales I',           area:'Profesional',  creditos:4, profesor:'Ing. Suárez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:701,  programaId:1, semestre:7, codigo:'IS-701',  nombre:'Auditoría Informática',             area:'Profesional',  creditos:3, profesor:'Ing. Suárez',      horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:702,  programaId:1, semestre:7, codigo:'PRY-701', nombre:'Creatividad e Innovación',          area:'Profesional',  creditos:2, profesor:'Mg. Ariza',        horas:2, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
      { id:703,  programaId:1, semestre:7, codigo:'ELE-701', nombre:'Electiva Disciplinar (Redes)',      area:'Electiva',    creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:704,  programaId:1, semestre:7, codigo:'IS-702',  nombre:'Ingeniería de Software II',          area:'Profesional',  creditos:4, profesor:'Mg. Torres',       horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:705,  programaId:1, semestre:7, codigo:'HUM-701', nombre:'Legislación de Software',           area:'Humanidades',  creditos:2, profesor:'Dr. Lozano',       horas:2, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:706,  programaId:1, semestre:7, codigo:'IS-703',  nombre:'Sistemas de Control',                area:'Profesional',  creditos:4, profesor:'Dr. Ramírez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:801,  programaId:1, semestre:8, codigo:'IS-801',  nombre:'Administración de Sistemas de Información', area:'Profesional', creditos:3, profesor:'Mg. Castillo', horas:4, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:802,  programaId:1, semestre:8, codigo:'IS-802',  nombre:'Compiladores',                       area:'Profesional',  creditos:4, profesor:'Dr. Ramírez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:803,  programaId:1, semestre:8, codigo:'ELE-801', nombre:'Electiva Disciplinar III',          area:'Electiva',    creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:804,  programaId:1, semestre:8, codigo:'ELE-802', nombre:'Electiva de Profundización I',       area:'Electiva',    creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
      { id:805,  programaId:1, semestre:8, codigo:'ADM-801', nombre:'Gestión Ambiental',                  area:'Profesional',  creditos:2, profesor:'Lic. Vargas',      horas:2, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:806,  programaId:1, semestre:8, codigo:'IS-803',  nombre:'Inteligencia Artificial',           area:'Profesional',  creditos:4, profesor:'Dr. Ramírez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:807,  programaId:1, semestre:8, codigo:'IS-804',  nombre:'Sistemas Distribuidos',             area:'Profesional',  creditos:4, profesor:'Ing. Suárez',      horas:5, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:901,  programaId:1, semestre:9, codigo:'ELE-901', nombre:'Electiva de Profundización II',      area:'Electiva',    creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Vie 8-10am'] },
      { id:902,  programaId:1, semestre:9, codigo:'ELE-902', nombre:'Electiva de Profundización III',     area:'Electiva',    creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Sáb 8-10am'] },
      { id:903,  programaId:1, semestre:9, codigo:'ELE-903', nombre:'Electiva de Profundización IV',      area:'Electiva',    creditos:3, profesor:'Por asignar',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Mar 7-9am','Jue 7-9am'] },
      { id:904,  programaId:1, semestre:9, codigo:'PRY-901', nombre:'Formulación de Proyectos Tecnológicos', area:'Profesional', creditos:3, profesor:'Mg. Ariza',      horas:3, estado:'disponible', prerrequisito:null, horarios:['Mar 9-11am','Jue 9-10am'] },
      { id:905,  programaId:1, semestre:9, codigo:'PRY-902', nombre:'Proyecto',                          area:'Profesional',  creditos:3, profesor:'Mg. Ariza',        horas:3, estado:'disponible', prerrequisito:null, horarios:['Lun 9-11am','Mié 9-11am'] },
      { id:906,  programaId:1, semestre:9, codigo:'MAT-901', nombre:'Simulación Digital',                 area:'Básica',      creditos:3, profesor:'Dr. Lozano',       horas:4, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      { id:1001, programaId:1, semestre:10, codigo:'PRA-1001', nombre:'Práctica Empresarial',              area:'Profesional',  creditos:12, profesor:'Coordinador de práctica', horas:16, estado:'disponible', prerrequisito:null, horarios:['Sáb 7-12am'] },
      { id:1002, programaId:1, semestre:10, codigo:'PRY-1001', nombre:'Proyecto II',                     area:'Profesional',  creditos:8, profesor:'Mg. Ariza',        horas:12, estado:'disponible', prerrequisito:null, horarios:['Lun 7-9am','Mié 7-9am'] },
      ...MATERIAS_OTROS_PROGRAMAS,
    ]
  }
};

export const formatCurrency = (val) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

export const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      /* La API entrega fechas ya completas ("2026-09-22T00:00:00.000Z"), pero el
         mock y los <input type="date"> las mandan como "2026-09-22". Concatenar
         'T00:00:00' a un valor que ya trae hora lo vuelve "Invalid Date". */
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T00:00:00` : dateStr);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

  /* Fecha CON hora, para cuando importa el momento y no solo el dia: una
     entrega que cierra a las 10:00 no es lo mismo que una que cierra a las
     22:00. Formato: "20/10/2026, 10:00 a. m.". */
  export const formatDateTime = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T00:00:00` : dateStr);
      if (Number.isNaN(d.getTime())) return '-';
      return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s/g, ' ')}`;
    };

/* Cada rol ve únicamente su propia bandeja. `roles: '*'` (o ausente) hace que la
   notificación se muestre a todos los roles. */
export const notificacionesDeRol = (lista, rol) =>
  (lista || []).filter(
    (n) => !n.roles || n.roles === '*' || n.roles.includes(rol)
  );
