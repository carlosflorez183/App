/* =============================================
   Seed de demostración.

   Lee los datos desde el frontend (src/data/mockData.js) para que haya una sola
   fuente de verdad: cambias el mock, corres el seed y la base queda alineada.

   Rutas:  npm run prisma:seed
   Docker:  MOCK_DATA_PATH=/app/mock/mockData.js
   ============================================= */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { USUARIOS_DEMO, CLAVES_ROL } from '../src/demoUsuarios.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const RUTA_MOCK = process.env.MOCK_DATA_PATH || resolve(aqui, '../../src/data/mockData.js');

const { INITIAL_DATA } = await import(pathToFileURL(RUTA_MOCK).href);

const prisma = new PrismaClient();

const fecha = (v) => (v ? new Date(`${v}T00:00:00Z`) : null);

/* El corte y la definitiva se calculan con las MISMAS reglas que usa el servidor
   (`src/calificaciones.js`): si el ejemplo de la base usara otro criterio, el
   docente veria un numero en el registro que la plataforma no sabe explicar. */
const { definitivaDe, estadoDe, listaCortes, resumenCorte } = await import('../src/calificaciones.js');

/* Cuántas preguntas de un parcial respondió bien el alumno. */
const aciertos = (respuestas, preguntas) => preguntas.filter((p) => respuestas[p.id] === p.correcta).length;

/* Vacía todas las tablas de una vez.

   Se usa TRUNCATE ... RESTART IDENTITY en lugar de deleteMany porque deleteMany
   NO reinicia las secuencias de los id autoincrementales: en la segunda corrida
   los cursos arrancarían en 4 y las actividades del mock (cursoId 1..3) no
   encontrarían su curso. CASCADE además resuelve el orden de las claves foráneas. */
const TABLAS = [
  'horarios', 'notificaciones', 'eventos', 'requisitos_documento',
  'config_ponderacion', 'proyectos', 'movimientos', 'empleados',
  'convocatorias_postulados', 'convocatorias', 'capacitaciones', 'gastos',
  'preguntas', 'asistencias_registro', 'asistencias_sesion', 'foro_mensajes',
  'entregas', 'inscripciones',
  'certificados_emitidos', 'notas', 'pagos', 'actividades', 'anuncios',
  'cursos', 'estudiantes', 'aspirantes', 'procesos_admision', 'docentes',
  'usuarios', 'materias', 'programas', 'modalidades',
];

/* Un PDF minimo pero valido (lo abren Chrome, Acrobat y el visor de Windows).
   La tabla xref exige la posicion exacta de cada objeto, y esas posiciones se
   cuentan en BYTES, no en caracteres: con tildes o ñ un string mide menos que
   su Buffer. Por eso el archivo se arma concatenando Buffers y carries. */
function pdfDemo(titulo, lineas) {
  const esc = (s) => String(s).replace(/[\\()]/g, (c) => '\\' + c);
  const b = (s) => Buffer.from(s, 'latin1');

  const ops = [
    `BT /F1 16 Tf 72 720 Td (${esc(titulo)}) Tj ET`,
    ...lineas.map((l, i) => `BT /F1 11 Tf 72 ${694 - i * 18} Td (${esc(l)}) Tj ET`),
  ].join('\n');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${b(ops).length} >>\nstream\n${ops}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const partes = [b('%PDF-1.4\n')];
  const offsets = [];
  let largo = partes[0].length;
  objetos.forEach((cuerpo, i) => {
    offsets.push(largo);
    const trozo = b(`${i + 1} 0 obj\n${cuerpo}\nendobj\n`);
    partes.push(trozo);
    largo += trozo.length;
  });

  const inicioXref = largo;
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  partes.push(b(xref));

  return Buffer.concat(partes);
}

async function limpiar() {
  const lista = TABLAS.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE;`);
}

/* "Lun 7-9am" -> { dia: "Lun", bloque: "7-9am" } */
function horarioDesdeTexto(texto) {
  const m = /^(\w+)\s+(.+)$/.exec(texto);
  return m ? { dia: m[1], bloque: m[2] } : { dia: texto, bloque: '' };
}

async function main() {
  console.log(`→ Leyendo datos de ${RUTA_MOCK}`);
  console.log('→ Limpiando tablas');
  await limpiar();

  /* ── Modalidades y programas ─────────────────────────────────────────── */
  console.log('→ Modalidades y programas');
  const modalidadId = new Map();
  for (const m of INITIAL_DATA.matricula.modalidades) {
    const c = await prisma.modalidad.create({
      data: { nombre: m.nombre, descripcion: m.descripcion, icon: m.icon, bgClass: m.bgClass },
    });
    modalidadId.set(m.id, c.id);
  }

  const programas = INITIAL_DATA.matricula.programas;
  const pid = new Map();
  for (const p of programas) {
    const c = await prisma.programa.create({
      data: {
        modalidadId: modalidadId.get(p.modalidadId),
        nombre: p.nombre,
        facultad: p.facultad,
        semestres: p.semestres,
        creditos: p.creditos,
        cupo: p.cupo,
        matriculados: p.matriculados,
        snies: p.snies,
        jornada: p.jornada,
        icon: p.icon,
        bgClass: p.bgClass,
      },
    });
    pid.set(p.id, c.id);
  }
  console.log(`  ${modalidadId.size} modalidades, ${pid.size} programas`);

  /* ── Materias y horarios ─────────────────────────────────────────────── */
  console.log('→ Materias del plan de estudios');
  const materias = INITIAL_DATA.matricula.materias;
  await prisma.materia.createMany({
    data: materias.map((m) => ({
      programaId: pid.get(m.programaId),
      semestre: m.semestre,
      codigo: m.codigo,
      nombre: m.nombre,
      area: m.area,
      creditos: m.creditos,
      profesor: m.profesor,
      horas: m.horas,
      estado: m.estado,
    })),
    skipDuplicates: true,
  });

  // createMany no admite relaciones anidadas, así que los horarios van aparte.
  const creadas = await prisma.materia.findMany({ select: { id: true, programaId: true, codigo: true } });
  const clave = new Map(creadas.map((m) => [`${m.programaId}:${m.codigo}`, m.id]));
  const horarios = [];
  for (const m of materias) {
    const id = clave.get(`${pid.get(m.programaId)}:${m.codigo}`);
    for (const h of m.horarios || []) horarios.push({ materiaId: id, ...horarioDesdeTexto(h) });
  }
  await prisma.horario.createMany({ data: horarios });
  console.log(`  ${materias.length} materias, ${horarios.length} horarios`);

  /* ── Admisiones ──────────────────────────────────────────────────────── */
  console.log('→ Procesos de admisión');
  const adm = INITIAL_DATA.admisiones;
  const procesoId = new Map();
  for (const p of adm.periodos) {
    const c = await prisma.procesoAdmision.create({
      data: {
        nombre: p.nombre,
        fechaApertura: fecha(p.fechaApertura),
        fechaCierre: fecha(p.fechaCierre),
        fechaResultados: fecha(p.fechaResultados),
        fechaInscripcion: fecha(p.fechaInscripcion),
        cuposTotales: p.cuposTotales,
        estado: p.estado,
        procesoAbierto: p.estado === 'inscripciones',
      },
    });
    procesoId.set(p.id, c.id);
  }
  // Los aspirantes del mock pertenecen al proceso vigente.
  const vigente = procesoId.get(adm.periodos[0].id);

  await prisma.configPonderacion.createMany({
    data: adm.configuracion.map((c) => ({
      clave: c.id,
      nombre: c.nombre,
      peso: c.peso,
      obligatorio: !!c.obligatorio,
      descripcion: c.descripcion || c.descripción || null,
    })),
  });
  await prisma.requisitoDocumento.createMany({
    data: adm.documentos.map((x) => ({
      clave: x.id,
      nombre: x.nombre,
      obligatorio: !!x.obligatorio,
      vigente: !!x.vigente,
    })),
  });

  console.log('→ Aspirantes');
  const porCodigo = new Map();
  for (const a of adm.aspirantes) {
    const c = await prisma.aspirante.create({
      data: {
        procesoId: vigente,
        programaId: pid.get(a.programaId),
        nombre: a.nombre,
        documento: a.documento,
        puntajeIcfes: a.puntajeIcfes,
        examen: a.examen,
        promedio: a.promedio,
        fecha: fecha(a.fecha),
        estado: a.estado,
        documentos: a.documentos,
      },
    });
    porCodigo.set(a.id, c.id);
  }
  console.log(`  ${porCodigo.size} aspirantes`);

  /* ── Estudiantes ─────────────────────────────────────────────────────── */
  console.log('→ Estudiantes');
  const estudiantes = INITIAL_DATA.estudiantes;
  for (const e of estudiantes) {
    const aspId = e.admisioId ? porCodigo.get(e.admisioId) : null;
    await prisma.estudiante.create({
      data: {
        id: e.id,
        nombre: e.nombre,
        documento: e.documento,
        correo: e.correo,
        telefono: e.telefono,
        direccion: e.direccion,
        programaId: pid.get(e.programaId),
        semestre: e.semestre,
        jornada: e.jornada,
        promedio: e.promedio,
        estado: e.estado,
        documentos: e.documentos,
        fechaIngreso: fecha(e.fechaIngreso),
        aspiranteId: aspId || null,
      },
    });
  }
  console.log(`  ${estudiantes.length} estudiantes`);

  /* ── Pagos, notas y certificados ─────────────────────────────────────── */
  console.log('→ Pagos, notas y certificados');
  const pagos = [];
  for (const e of estudiantes) {
    for (const p of e.pagos || []) {
      pagos.push({
        estudianteId: e.id,
        concepto: p.concepto,
        tipo: p.tipo,
        valor: p.valor,
        fechaLimite: fecha(p.fecha_limite),
        fechaPago: fecha(p.fecha_pago),
        estado: p.estado,
        referencia: p.referencia,
      });
    }
  }
  await prisma.pago.createMany({ data: pagos });

  // `materias` en la raíz del mock son en realidad las notas del estudiante demo.
  await prisma.nota.createMany({
    data: INITIAL_DATA.materias.map((m) => ({
      estudianteId: '20231001',
      programaId: pid.get(1),
      codigo: m.codigo,
      nombre: m.nombre,
      creditos: m.creditos,
      profesor: m.profesor,
      nota1: m.nota1,
      nota2: m.nota2,
      nota3: m.nota3,
      definitiva: m.definitiva,
      estado: m.estado,
      periodo: m.periodo,
    })),
  });

  // Certificados emitidos directamente por Registro (sin solicitud previa).
  await prisma.certificadoEmitido.createMany({
    data: INITIAL_DATA.certificadosEmitidos.map((c) => ({
      estudianteId: c.estudianteId,
      matricula: c.matricula,
      tipo: c.tipo,
      fecha: fecha(c.fecha),
      estado: c.estado,
    })),
  });
  // Solicitudes del alumno demo: mismas filas, pero con la fecha de solicitud.
  await prisma.certificadoEmitido.createMany({
    data: INITIAL_DATA.certificados.map((c) => ({
      estudianteId: '20231001',
      matricula: '20231001',
      tipo: c.tipo,
      fecha: fecha(c.fecha),
      solicitado: fecha(c.solicitado),
      estado: c.estado,
    })),
  });
  console.log(`  ${pagos.length} pagos, ${INITIAL_DATA.materias.length} notas`);

  /* ── Campus virtual ──────────────────────────────────────────────────── */
  console.log('→ Cursos, actividades y anuncios');
  /* Primero los docentes: curso.docenteId los referencia como clave foránea. */
  const DOCENTES = INITIAL_DATA.docentes;
  await prisma.docente.createMany({
    data: DOCENTES.map((x) => ({
      id: x.id,
      nombre: x.nombre,
      area: x.area,
      titulo: x.titulo,
      email: x.email,
      estado: x.estado,
      categoria: x.categoria,
    })),
  });
  /* Los cursos deben quedar atados a un docente real, no solo al nombre.
     Sin esto el backend no puede saber qué curso le pertenece a cada profesor. */
  await prisma.curso.createMany({
    data: INITIAL_DATA.cursos.map((c) => {
      const docente = DOCENTES.find((d) => d.nombre === c.profesor) || DOCENTES[0];
      return {
        nombre: c.nombre,
        codigo: c.codigo,
        profesor: c.profesor,
        docenteId: docente?.id ?? null,
        grupo: c.grupo,
        estudiantes: c.estudiantes,
        icono: c.icon,
        color: c.color,
        progreso: c.progreso,
      };
    }),
  });
  /* ── Inscripciones: la lista real de alumnos de cada curso ────────────
     `Curso.estudiantes` era un número del mock (32, 28, 30) que no decía QUIÉN
     estaba en el curso, y sin esa lista el registro de notas del docente no
     tenía filas de dónde sacar. Cada curso se abre a los programas que lo
     toman: los tres son materias de ingeniería (prefijo IS), así que van
     Ingeniería de Sistemas e Ingeniería Civil. Retirados y graduados no se
     inscriben. */
  const PROGRAMAS_POR_CURSO = {
    'IS-602': [1, 2],
    'IS-603': [1, 2],
    'IS-601': [1],
  };
  const NO_INSCRIBIBLES = ['retirado', 'graduado'];
  const cursos = await prisma.curso.findMany({ orderBy: { id: 'asc' } });
  const inscritos = [];
  for (const curso of cursos) {
    const programas = PROGRAMAS_POR_CURSO[curso.codigo] || [];
    const alumnos = estudiantes
      .filter((e) => programas.includes(e.programaId) && !NO_INSCRIBIBLES.includes(e.estado))
      .map((e) => e.id);
    inscritos.push(...alumnos.map((estudianteId) => ({
      estudianteId, cursoId: curso.id, periodo: '2026-1', estado: 'matriculado',
    })));
  }
  await prisma.inscripcion.createMany({ data: inscritos });

  /* Cada alumno inscrito necesita su fila de notas por corte en esa materia:
     es la que el registro del docente edita. Las que ya existan (el estudiante
     demo viene con seis materias del mock) no se tocan. */
  const existentes = await prisma.nota.findMany({
    where: { periodo: '2026-1' },
    select: { estudianteId: true, codigo: true },
  });
  const yaTiene = new Set(existentes.map((n) => `${n.estudianteId}|${n.codigo}`));
  const faltantes = [];
  inscritos.forEach(({ estudianteId, cursoId }, i) => {
    const curso = cursos.find((c) => c.id === cursoId);
    if (!curso || yaTiene.has(`${estudianteId}|${curso.codigo}`)) return;
    const est = estudiantes.find((e) => e.id === estudianteId);
    /* Solo los primeros alumnos traen nota: el resto deja las celdas vacías
       para que el docente vea de verdad lo que tiene que registrar. */
    const nota1 = i < 3 ? Math.round(Math.min(5, (est?.promedio || 3) - 0.2) * 10) / 10 : null;
    const nota2 = i < 3 ? Math.round(Math.min(5, (est?.promedio || 3) + 0.1) * 10) / 10 : null;
    /* Un corte queda abierto para que el docente tenga algo que registrar. Con
       los tres puestos sale la definitiva; con dos NO: una definitiva con la
       mitad de las notas es un numero que despues se contradice solo en
       cuanto el docente pone el tercer corte. */
    const nota3 = i === 0 ? 4.2 : null;
    const definitiva = nota1 !== null && nota2 !== null && nota3 !== null
      ? Number(((nota1 + nota2 + nota3) / 3).toFixed(2))
      : null;
    faltantes.push({
      estudianteId,
      programaId: pid.get(est?.programaId || 1),
      codigo: curso.codigo,
      nombre: curso.nombre,
      creditos: INITIAL_DATA.materias.find((m) => m.codigo === curso.codigo)?.creditos || 4,
      profesor: curso.profesor,
      nota1,
      nota2,
      nota3,
      definitiva,
      estado: definitiva !== null ? (definitiva >= 3 ? 'aprobado' : 'reprobado') : 'en_curso',
      periodo: '2026-1',
    });
  });
  if (faltantes.length) await prisma.nota.createMany({ data: faltantes });

  /* El contador del curso se recalcula desde las inscripciones: un número del
     mock que no cuadra con la lista real vuelve a mentir en la cabecera. */
  for (const curso of cursos) {
    const total = await prisma.inscripcion.count({ where: { cursoId: curso.id } });
    await prisma.curso.update({ where: { id: curso.id }, data: { estudiantes: total } });
  }
  console.log(`  ${inscritos.length} inscripciones, ${faltantes.length} filas de nota nuevas`);

  // Las claves foráneas autogeneradas arrancan en 1 y el mock ya usa esos ids.
  await prisma.actividad.createMany({
    data: INITIAL_DATA.actividades.map((a) => ({
      cursoId: a.cursoId,
      corte: a.corte,
      titulo: a.titulo,
      tipo: a.tipo,
      fechaEntrega: fecha(a.fechaEntrega),
      descripcion: a.descripcion,
      puntos: a.puntos,
      estadoEst: a.estado_est,
      nota: a.nota,
    })),
  });
  /* Un parcial con preguntas, para que la vista de entregas tenga algo real
     que mostrar: respuestas de parcial y entregas con archivo. */
  const parcialDemo = await prisma.actividad.findFirst({
    where: { cursoId: 1, tipo: 'parcial' },
    orderBy: { id: 'asc' },
  });
  if (parcialDemo) {
    await prisma.pregunta.createMany({
      data: [
        {
          actividadId: parcialDemo.id,
          enunciado: '¿Qué diagrama UML modela las interacciones entre objetos?',
          opciones: ['Diagrama de clases', 'Diagrama de secuencia', 'Diagrama de clases', 'Diagrama de paquetes'],
          correcta: 1,
          puntos: 10,
        },
        {
          actividadId: parcialDemo.id,
          enunciado: '¿Qué significa el cardinalidad 1..* en una asociación?',
          opciones: ['Obligatorio uno', 'Cero o uno', 'Uno o muchos', 'Muchos'],
          correcta: 2,
          puntos: 10,
        },
        {
          actividadId: parcialDemo.id,
          enunciado: '¿Cuál es la vista estructural de un sistema?',
          opciones: ['Vista de casos de uso', 'Vista de diseño', 'Vista de requisitos', 'Vista de pruebas'],
          correcta: 1,
          puntos: 10,
        },
      ],
    });
  }
  await prisma.anuncio.createMany({
    data: INITIAL_DATA.anuncios.map((a) => ({
      cursoId: a.cursoId,
      titulo: a.titulo,
      contenido: a.contenido,
      fecha: fecha(a.fecha),
      autor: a.autor,
    })),
  });

  /* ── Talento humano, tesorería y rectoría ────────────────────────────── */
  console.log('→ Personal, movimientos y proyectos');
  /* Los docentes se crean arriba, antes de los cursos, porque curso.docenteId
     los referencia. Ver bloque "Campus virtual". */
  await prisma.empleado.createMany({
    data: INITIAL_DATA.empleados.map((x) => ({
      nombre: x.nombre,
      cargo: x.cargo,
      dependencia: x.dependencia,
      tipo: x.tipo,
      salario: x.salario,
      estado: x.estado,
      ingreso: fecha(x.ingreso),
      documento: x.doc,
    })),
  });
  await prisma.movimiento.createMany({
    data: INITIAL_DATA.movimientos.map((x) => ({
      concepto: x.concepto,
      tipo: x.tipo,
      valor: x.valor,
      fecha: fecha(x.fecha),
      cuenta: x.cuenta,
    })),
  });
  await prisma.proyecto.createMany({
    data: INITIAL_DATA.proyectos.map((x) => ({
      nombre: x.nombre,
      area: x.area,
      responsable: x.responsable,
      presupuesto: x.presupuesto,
      ejecutado: x.ejecutado,
      avance: x.avance,
      estado: x.estado,
      inicio: fecha(x.inicio),
      fin: fecha(x.fin),
    })),
  });
  await prisma.evento.createMany({
    data: INITIAL_DATA.eventos.map((x) => ({ fecha: x.fecha, titulo: x.titulo, tipo: x.tipo })),
  });

  /* ── Notificaciones ──────────────────────────────────────────────────── */
  console.log('→ Notificaciones');
  await prisma.notificacion.createMany({
    data: INITIAL_DATA.notificaciones.map((n, i) => ({
      titulo: n.titulo,
      msg: n.msg,
      tipo: n.tipo,
      tiempo: n.tiempo,
      leida: !!n.leida,
      roles: n.roles || [],
      destino: n.destino || null,
      orden: i,
    })),
  });

  /* ── Usuarios de demostración ────────────────────────────────────────── */
  console.log('→ Usuarios');
  for (const u of USUARIOS_DEMO) {
    await prisma.usuario.create({
      data: {
        usuario: u.usuario,
        password: bcrypt.hashSync(u.password || '123456', 10),
        nombre: u.nombre,
        role: u.role,
        codigo: u.codigo,
        email: u.email,
        telefono: u.telefono,
        direccion: u.direccion,
        programaId: u.programaId ? pid.get(u.programaId) : null,
        semestre: u.semestre,
        avatar: u.avatar,
        avatarClass: u.avatarClass,
      },
    });
  }
  console.log(`  ${USUARIOS_DEMO.length} usuarios`);

  /* ── Enlaces Usuario <-> Estudiante / Docente ────────────────────────── */
  for (const u of USUARIOS_DEMO.filter((x) => CLAVES_ROL[x.role] === 'estudiante')) {
    const usuario = await prisma.usuario.findUnique({ where: { usuario: u.usuario } });
    const est = await prisma.estudiante.findFirst({ where: { documento: u.documento } });
    if (usuario && est) {
      await prisma.estudiante.update({ where: { id: est.id }, data: { usuarioId: usuario.id } });
    }
  }
  const usuarioProf = await prisma.usuario.findUnique({ where: { usuario: 'PROF001' } });
  if (usuarioProf) {
    await prisma.docente.update({ where: { id: 'DOC-0045' }, data: { usuarioId: usuarioProf.id } });
  }

  /* ── Talento Humano: convocatorias, postulados y capacitaciones ──────── */
  console.log('\n Convocatorias y capacitaciones');
  const convocatorias = await prisma.convocatoria.createMany({
    data: [
      { cargo: 'Docente de cátedra en Programación', area: 'Ingeniería de Software', dependencia: 'Facultad de Ingeniería', vinculo: 'catedra', cupos: 2, apertura: '2026-07-01T00:00:00Z', cierre: '2026-08-15T00:00:00Z', estado: 'abierta', requisitos: 'Titulación afín, con experiencia docente de 2 años.' },
      { cargo: 'Docente titular en Contabilidad', area: 'Contabilidad', dependencia: 'Facultad de Ciencias Económicas', vinculo: 'titular', cupos: 1, apertura: '2026-06-15T00:00:00Z', cierre: '2026-07-30T00:00:00Z', estado: 'en_evaluacion', requisitos: 'Contador público con experiencia en auditoría.' },
      { cargo: 'Asistente de investigación en Salud', area: 'Salud', dependencia: 'Facultad de Medicina', vinculo: 'asistente', cupos: 3, apertura: '2026-05-01T00:00:00Z', cierre: '2026-06-10T00:00:00Z', estado: 'resuelta', requisitos: 'Estudiante de posgrado o doctor en ciencias con publicación.' },
      { cargo: 'Jefe de admisiones', area: 'Admisiones', dependencia: 'Dirección de Admisiones', vinculo: 'libre', cupos: 1, apertura: '2026-09-01T00:00:00Z', cierre: '2026-10-10T00:00:00Z', estado: 'abierta', requisitos: 'Experiencia en procesos de admisión universitaria.' },
    ],
  });

  const abiertas = await prisma.convocatoria.findMany({ orderBy: { id: 'asc' } });
  const postulados = [];
  const NOMBRES = [
    ['Ana Sofía Ríos', '1.019.223.445'], ['Julián Betancur', '1.019.887.112'],
    ['Marcela Ospina', '1.019.554.730'], ['Andrés Villamil', '1.019.334.021'],
    ['Carolina Pemberton', '1.019.667.894'], ['Nicolás Arango', '1.019.112.556'],
  ];
  for (let i = 0; i < abiertas.length; i += 1) {
    const c = abiertas[i];
    const n = 2 + (i % 3);
    for (let k = 0; k < n; k += 1) {
      const [nombre, documento] = NOMBRES[(i * 2 + k) % NOMBRES.length];
      postulados.push({
        convocatoriaId: c.id,
        nombre,
        documento: `${documento.slice(0, 12)}-${i}${k}`,
        titulo: ['Maestría', 'Doctorado', 'Especialización'][k % 3],
        experiencia: (i + k) % 6,
        puntaje: 60 + ((i * 7 + k * 5) % 40),
        estado: c.estado === 'abierta' ? 'recibida' : ['en_estudio', 'aceptado', 'rechazado'][k % 3],
      });
    }
  }
  await prisma.convocatoriaPostulado.createMany({ data: postulados });

  await prisma.capacitacion.createMany({
    data: [
      { nombre: 'Evaluación por competencias', tema: 'Docencia', fecha: '2026-09-15T00:00:00Z', horas: 8, docente: 'Dra. Laura Sánchez', cupos: 30, inscritos: 22, estado: 'programada' },
      { nombre: 'Aulas virtuales y TAAD', tema: 'Tecnología educativa', fecha: '2026-08-20T00:00:00Z', horas: 6, docente: 'Ing. Mauricio Rojas', cupos: 25, inscritos: 25, estado: 'finalizada' },
      { nombre: 'Rúbricas y retroalimentación', tema: 'Docencia', fecha: '2026-10-05T00:00:00Z', horas: 4, docente: 'Dr. Fernando Ramírez', cupos: 20, inscritos: 11, estado: 'programada' },
      { nombre: 'Actualización normativa SNIES', tema: 'Regulación', fecha: '2026-07-10T00:00:00Z', horas: 3, docente: 'Secretaría General', cupos: 40, inscritos: 33, estado: 'finalizada' },
    ],
  });

  /* ── Contabilidad: egresos ──────────────────────────────────────────── */
  console.log(' Egresos');
  await prisma.gasto.createMany({
    data: [
      { concepto: 'Nómina docente cátedra', categoria: 'Docencia', dependencia: 'Vicerrectoría Académica', valor: 186000000, fecha: '2026-08-31T00:00:00Z', estado: 'pagado', comprobante: 'CT-2026-0812' },
      { concepto: 'Nómina administrativa', categoria: 'Administración', dependencia: 'Dirección General', valor: 94000000, fecha: '2026-08-31T00:00:00Z', estado: 'pagado', comprobante: 'CT-2026-0813' },
      { concepto: 'Laboratorios de ingeniería', categoria: 'Infraestructura', dependencia: 'Facultad de Ingeniería', valor: 128000000, fecha: '2026-09-05T00:00:00Z', estado: 'aprobado', comprobante: 'CT-2026-0901' },
      { concepto: 'Biblioteca y bases de datos', categoria: 'Bienestar', dependencia: 'Vicerrectoría de Estudiantes', valor: 47000000, fecha: '2026-09-10T00:00:00Z', estado: 'pagado', comprobante: 'CT-2026-0904' },
      { concepto: 'Gastos de investigación', categoria: 'Investigación', dependencia: 'Dirección de Investigación', valor: 76000000, fecha: '2026-09-12T00:00:00Z', estado: 'registrado', comprobante: null },
      { concepto: 'Mantenimiento de sedes', categoria: 'Infraestructura', dependencia: 'Dirección General', valor: 38500000, fecha: '2026-09-18T00:00:00Z', estado: 'registrado', comprobante: null },
      { concepto: 'Bienestar del estudiante', categoria: 'Bienestar', dependencia: 'Vicerrectoría de Estudiantes', valor: 52000000, fecha: '2026-09-20T00:00:00Z', estado: 'aprobado', comprobante: 'CT-2026-0915' },
      { concepto: 'Licencias de software académico', categoria: 'Docencia', dependencia: 'Facultad de Ingeniería', valor: 24000000, fecha: '2026-09-22T00:00:00Z', estado: 'registrado', comprobante: null },
    ],
  });

  /* ── Campus: asistencia, parcial, foro ──────────────────────────────── */
  console.log(' Asistencia, parcial y foro');
  const parcial = await prisma.actividad.create({
    include: { preguntas: true },
    data: {
      cursoId: 1,
      corte: 2,
      titulo: 'Parcial 1: fundamentos de programación',
      tipo: 'parcial',
      fechaEntrega: '2026-09-18T00:00:00Z',
      descripcion: 'Evaluación de la unidad 1 con 3 preguntas de selección múltiple.',
      puntos: 20,
      estadoEst: 'pendiente',
      preguntas: {
        create: [
          { enunciado: '¿Cuál de estos es un tipo de dato primitivo?', opciones: ['ArrayList', 'Entero', 'Clase', 'Interfaz'], correcta: 1, puntos: 5 },
          { enunciado: '¿Qué estructura ejecuta en orden de inserción?', opciones: ['Conjunto', 'Pila', 'Cola', 'Tabla hash'], correcta: 2, puntos: 5 },
          { enunciado: 'La complejidad de la búsqueda binaria es:', opciones: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], correcta: 2, puntos: 5 },
        ],
      },
    },
  });
  console.log(`  parcial "${parcial.titulo}" con ${parcial.preguntas.length} preguntas`);

  const cursoDemo = await prisma.curso.findFirst({ orderBy: { id: 'asc' } });
  /* Asistencia, entregas y respuestas del parcial salen de los ALUMNOS REALES
     del curso demo. Antes se tomaban los primeros estudiantes de la base, y
     eso dejaba al docente viendo entregas y_listados_ de alumnos que no
     estaban matriculados en su materia. */
  const alumnosDelCurso = await prisma.inscripcion.findMany({
    where: { cursoId: cursoDemo.id, periodo: '2026-1' },
    orderBy: { inscritoEn: 'asc' },
    select: { estudianteId: true },
  });
  const FECHAS_SESION = ['2026-09-01T00:00:00Z', '2026-09-08T00:00:00Z'];
  const TEMAS_SESION = ['Repaso de la unidad 1', 'Sustentación del taller en pareja'];
  for (let i = 0; i < FECHAS_SESION.length; i += 1) {
    await prisma.asistenciaSesion.create({
      data: {
        cursoId: cursoDemo.id,
        fecha: FECHAS_SESION[i],
        tema: TEMAS_SESION[i],
          registros: {
            create: alumnosDelCurso.map((e, k) => ({
              estudianteId: e.estudianteId,
              estado: k % 7 === 0 ? 'ausente' : k % 5 === 0 ? 'tardanza' : 'presente',
            })),
        },
      },
    });
  }

  /* Entregas de ejemplo: archivos, texto y respuestas de un parcial, para que
     el docente tenga algo que revisar al entrar al curso. */
  const parcialConPreguntas = await prisma.actividad.findFirst({
    where: { cursoId: cursoDemo.id, tipo: 'parcial', preguntas: { some: {} } },
    include: { preguntas: { orderBy: { id: 'asc' } } },
  });
  const tallerDemo = await prisma.actividad.findFirst({
    where: { cursoId: cursoDemo.id, tipo: 'taller' },
    orderBy: { id: 'asc' },
  });
  const ENTREGABLES = [
    { contenido: 'Adjunto el diagrama de casos de uso y el de secuencia en un PDF.', estado: 'calificado', nota: 32, comentario: 'Los diagramas están completos. Falta el de despliegue.' },
    { contenido: 'La entrega va en el repositorio, adjunto el enlace al informe.', estado: 'calificado', nota: 36, comentario: 'Buen modelado de las interacciones. Falta actualizar el diagrama de despliegue.' },
  ];
  if (tallerDemo) {
    /* El archivo va en base64 para que el docente lo pueda abrir y descargar
       de verdad, no solo ver el nombre. */
    const pdf = pdfDemo('Diagramas UML', [
      'Taller 1 - Diagrama de casos de uso',
      '',
      'Actores: Estudiante, Docente, Sistema de matriculas.',
      'Caso: Registrar matricula  -> Actor: Estudiante',
      'Caso: Consultar nota        ->  Actor: Estudiante',
      'Caso: Publicar nota         ->  Actor: Docente',
      '',
      'Grupo 3 - Ingenieria de Software (IS-602)',
    ]);
    await prisma.entrega.createMany({
      data: alumnosDelCurso.slice(0, ENTREGABLES.length).map((e, i) => ({
        actividadId: tallerDemo.id,
        estudianteId: e.estudianteId,
        estado: ENTREGABLES[i].estado,
        /* Solo el primero adjunta el PDF; el segundo entrego por repositorio. */
        archivo: i === 0 ? 'casos-de-uso-grupo-3.pdf' : null,
        archivoB64: i === 0 ? pdf.toString('base64') : null,
        archivoMime: i === 0 ? 'application/pdf' : null,
        archivoTamano: i === 0 ? pdf.length : null,
        contenido: ENTREGABLES[i].contenido,
        nota: ENTREGABLES[i].nota ?? null,
        comentario: ENTREGABLES[i].comentario ?? null,
        entregadoEn: new Date('2026-08-22T18:00:00Z'),
        calificacionEn: ENTREGABLES[i].nota != null ? new Date('2026-08-27T15:00:00Z') : null,
      })),
    });
  }
  if (parcialConPreguntas) {
    const { id: p1, correcta: c1 } = parcialConPreguntas.preguntas[0] || {};
    const { id: p2, correcta: c2 } = parcialConPreguntas.preguntas[1] || {};
    const { id: p3, correcta: c3 } = parcialConPreguntas.preguntas[2] || {};
    /* El primero acierta las tres, el segundo se equivoca en la última. */
    const respuestas = [
      { [p1]: c1, [p2]: c2, [p3]: c3 },
      { [p1]: c1, [p2]: c2, [p3]: 0 },
    ].filter((r) => Object.keys(r).length);
    if (respuestas.length) {
      await prisma.entrega.createMany({
        data: alumnosDelCurso.slice(0, respuestas.length).map((e, i) => ({
          actividadId: parcialConPreguntas.id,
          estudianteId: e.estudianteId,
          /* La nota del parcial sale de las respuestas correctas. Sin esto el
             parcial quedaba sin calificar y el corte 1 del curso demo no
             tenía de dónde Sacarse. */
          nota: aciertos(respuestas[i], parcialConPreguntas.preguntas) * 10,
          comentario: i === 0 ? 'Perfecto: las tres preguntas bien.' : 'Bien, pero se te fue la última.',
          calificacionEn: new Date('2026-09-08T17:00:00Z'),
          estado: 'calificado',
          respuestas: respuestas[i],
          entregadoEn: new Date('2026-09-05T20:00:00Z'),
        })),
      });
    }
  }

  /* Y los dos alumnos entregan todo lo que ya se vencio del curso, para que el
     ejemplo no los deje con cortes en cero por trabajos que no se debian. Las
     notas de esas entregas se guardan con el mismo criterio de siempre. */
  const actividadesVencidas = await prisma.actividad.findMany({
    where: {
      cursoId: cursoDemo.id,
      OR: [{ fechaEntrega: null }, { fechaEntrega: { lte: new Date() } }],
    },
    orderBy: { id: 'asc' },
  });
  const yaTienen = new Set((await prisma.entrega.findMany({
    where: { actividadId: { in: actividadesVencidas.map((a) => a.id) } },
    select: { actividadId: true },
  })).map((e) => e.actividadId));
  const extra = [];
  for (const actividad of actividadesVencidas) {
    if (yaTienen.has(actividad.id)) continue;
    const puntos = actividad.puntos || 0;
    if (!puntos) continue;
    alumnosDelCurso.forEach(({ estudianteId }, i) => {
      /* Al segundo alumno se le restan seis puntos: así se ve que el corte es
         distinto por estudiante y no un número del curso. */
      extra.push({
        actividadId: actividad.id,
        estudianteId,
        estado: 'calificado',
        nota: puntos - (i * 6),
        comentario: 'Buen trabajo, entregado a tiempo.',
        contenido: 'Se adjunta el documento solicitado en la plataforma.',
        entregadoEn: new Date('2026-09-12T18:00:00Z'),
        calificacionEn: new Date('2026-09-15T10:00:00Z'),
      });
    });
  }
  if (extra.length) {
    await prisma.entrega.createMany({ data: extra });
    console.log(`  ${extra.length} entregas de ejemplo ya calificadas`);
  }

  /* Las notas de corte y las entregas tienen que contar la MISMA historia: cada
     corte es el promedio de TODAS las actividades del corte (lo que no se
     entregó vale cero) y la definitiva pesa 30%, 30% y 40%. Si el seed pone un
     4,8 a mano y no hay ninguna entrega que lo respalde, el docente ve en el
     registro "media de 0 entregas" debajo del número. */
  const [actividadesCurso, entregasAlumno] = await Promise.all([
    prisma.actividad.findMany({ select: { id: true, cursoId: true, corte: true, puntos: true, fechaEntrega: true } }),
    prisma.entrega.findMany({ select: { estudianteId: true, actividadId: true, nota: true } }),
  ]);
  const notasDelPeriodo = await prisma.nota.findMany({ where: { periodo: '2026-1' } });
  const cursosPorCodigo = new Map(cursos.map((c) => [c.codigo, c.id]));
  let recalculadas = 0;
  for (const nota of notasDelPeriodo) {
    const cursoId = cursosPorCodigo.get(nota.codigo);
    if (!cursoId) continue;
    const delCurso = actividadesCurso.filter((a) => a.cursoId === cursoId);
    const suyas = entregasAlumno.filter((e) => e.estudianteId === nota.estudianteId);
    const manuales = listaCortes(nota.cortesManuales);
    /* Sin actividades de este alumno en el curso no se toca su fila: las
       materias del mock que no tienen trabajos siguen con sus notas. */
    const datos = {};
    let toco = false;
    for (const corte of [1, 2, 3]) {
      if (manuales.includes(corte)) continue;
      const calculo = resumenCorte(corte, delCurso, suyas);
      /* Un corte sin nada vencido todavia se deja vacio: no es cero, es que
         aun no hay nada que promediar. */
      if (calculo.valor === null) continue;
      if (calculo.valor !== nota[`nota${corte}`]) { datos[`nota${corte}`] = calculo.valor; toco = true; }
    }
    if (!toco) continue;
    const n1 = datos.nota1 ?? nota.nota1 ?? null;
    const n2 = datos.nota2 ?? nota.nota2 ?? null;
    const n3 = datos.nota3 ?? nota.nota3 ?? null;
    datos.definitiva = definitivaDe(n1, n2, n3);
    datos.estado = estadoDe(datos.definitiva);
    await prisma.nota.update({ where: { id: nota.id }, data: datos });
    recalculadas += 1;
  }
  if (recalculadas) console.log(`  ${recalculadas} notas de corte sacadas de las entregas calificadas`);

  await prisma.foroMensaje.createMany({
    data: [
      { cursoId: cursoDemo.id, tema: 'Dudas sobre el parcial 1', autor: 'Dra. Laura Sánchez', mensaje: 'Subí el material de apoyo con los ejercicios tipo. Recuerden que el parcial cubre la unidad 1 completa.', fecha: '2026-09-10T14:00:00Z' },
      { cursoId: cursoDemo.id, tema: 'Dudas sobre el parcial 1', autor: 'Juan Sebastián Pérez', mensaje: 'Profe, si cambio el orden de las preguntas, ¿bajan puntos?', fecha: '2026-09-10T16:20:00Z' },
      { cursoId: cursoDemo.id, tema: 'Dudas sobre el parcial 1', autor: 'Dra. Laura Sánchez', mensaje: 'No, el orden puede cambiar. Se califica por respuesta correcta.', fecha: '2026-09-11T09:05:00Z' },
      { cursoId: cursoDemo.id, tema: 'Fechas del taller en equipo', autor: 'Mg. Torres', mensaje: 'La entrega grupal queda para el 30 de septiembre. Suban un solo documento por equipo.', fecha: '2026-09-12T11:00:00Z' },
    ],
  });

  console.log(`  ${postulados.length} postulados, ${convocatorias.count} convocatorias`);
  console.log('\n✔ Seed completo');
}

main()
  .catch((e) => {
    console.error('✖ Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
