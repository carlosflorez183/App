/* =============================================
   Estado inicial de la aplicación (`GET /api/bootstrap`).

   Devuelve todo lo que el frontend necesita al entrar, ya con la MISMA forma
   que tenía `INITIAL_DATA` en el mock. Así las vistas siguen leyendo
   `data.materias`, `data.admisiones.aspirantes`, etc., sin cambios, pero los
   datos vienen de Postgres.

   Notas de forma:
   - Las fechas se devuelven como 'YYYY-MM-DD' porque `formatDate` del frontend
     hace `new Date(valor + 'T00:00:00')`.
   - `materias` (raíz) son las NOTAS del estudiante demo. El plan de estudios
     va en `matricula.materias`.
   ============================================= */
import { prisma } from '../config.js';

const dos = (n) => String(n).padStart(2, '0');

/* Date -> 'YYYY-MM-DD' (o null). */
const soloFecha = (d) =>
  d ? `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}` : null;

/* Date -> 'YYYY-MM-DDTHH:mm' (o null). Los tres campos de fecha de una
   actividad llegan al frontend con hora: el docente elige un minuto exacto
   para abrir y cerrar, y recortarlo a 'YYYY-MM-DD' hacia alla una entrega que
   cierra a las 10:00 como si cerrara a las 23:59. */
const fechaYHora = (d) =>
  d ? `${soloFecha(d)}T${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}` : null;

export default async function rutasBootstrap(app) {
  app.get('/bootstrap', { preHandler: [app.autenticar] }, async (req) => {
    /* El estudiante "dueño" de las vistas personales: el vinculado al usuario
       autenticado si es alumno, o el del demo. */
    const propio = await prisma.estudiante.findFirst({ where: { usuarioId: req.usuario.id } });
    const estudianteId = propio?.id || '20231001';

    /* Un profesor solo debe ver SUS cursos. El filtro va en el servidor (y no
       en el frontend) para que ni la API ni la lista de la barra lateral
       muestren asignaturas de otros docentes. El admin y los demas roles
       ven el total, como antes. */
    let filtroCursos = {};
    if (req.usuario.role === 'profesor') {
      const docente = await prisma.docente.findFirst({ where: { usuarioId: req.usuario.id } });
      if (docente) filtroCursos = { docenteId: docente.id };
    }

    const [
      modalidades,
      programas,
      planMaterias,
      procesos,
      configuracion,
      documentos,
      aspirantes,
      estudiantes,
      notas,
      certificados,
      cursos,
      actividades,
      anuncios,
      docentes,
      empleados,
      movimientos,
      proyectos,
      notificaciones,
      eventos,
    ] = await Promise.all([
      prisma.modalidad.findMany({ orderBy: { id: 'asc' } }),
      prisma.programa.findMany({ orderBy: { id: 'asc' } }),
      prisma.materia.findMany({ orderBy: [{ programaId: 'asc' }, { semestre: 'asc' }, { id: 'asc' }], include: { horarios: true } }),
      prisma.procesoAdmision.findMany({ orderBy: { id: 'asc' } }),
      prisma.configPonderacion.findMany({ orderBy: { id: 'asc' } }),
      prisma.requisitoDocumento.findMany({ orderBy: { id: 'asc' } }),
      prisma.aspirante.findMany({ orderBy: { id: 'asc' } }),
      prisma.estudiante.findMany({ orderBy: { id: 'asc' }, include: { pagos: { orderBy: { id: 'asc' } } } }),
      prisma.nota.findMany({ where: { estudianteId }, orderBy: { id: 'asc' } }),
      prisma.certificadoEmitido.findMany({ orderBy: { id: 'asc' } }),
      prisma.curso.findMany({ where: filtroCursos, orderBy: { id: 'asc' } }),
      /* Las actividades van filtradas por los mismos cursos del profesor: si
         no, su barra lateral y su lista de tareas le taughten a calificar
         actividades de otros docentes. */
      prisma.actividad.findMany({
        where: filtroCursos.docenteId ? { curso: filtroCursos } : {},
        orderBy: { id: 'asc' },
      }),
      prisma.anuncio.findMany({ orderBy: { id: 'asc' } }),
      prisma.docente.findMany({ orderBy: { id: 'asc' } }),
      prisma.empleado.findMany({ orderBy: { id: 'asc' } }),
      prisma.movimiento.findMany({ orderBy: { id: 'asc' } }),
      prisma.proyecto.findMany({ orderBy: { id: 'asc' } }),
      prisma.notificacion.findMany({ orderBy: { orden: 'asc' } }),
      prisma.evento.findMany({ orderBy: { id: 'asc' } }),
    ]);

    const porModalidad = new Map();
    for (const p of programas) porModalidad.set(p.modalidadId, (porModalidad.get(p.modalidadId) || 0) + 1);

    const pagosDemo = estudiantes.find((e) => e.id === estudianteId)?.pagos || [];

    /* Al profesor le interesan unicamente las notas de SUS asignaturas: las de
       los demas docentes no salen ni en el registro de notas ni en el panel.
       Se filtran por el codigo de los cursos que ya son suyos. */
    const codigosVisibles = new Set(cursos.map((c) => c.codigo));
    const notasVisibles = req.usuario.role === 'profesor'
      ? notas.filter((n) => codigosVisibles.has(n.codigo))
      : notas;

    return {
      /* Notas del estudiante demo. */
      materias: notasVisibles.map((n) => ({
        id: n.id,
        codigo: n.codigo,
        nombre: n.nombre,
        creditos: n.creditos,
        profesor: n.profesor,
        nota1: n.nota1,
        nota2: n.nota2,
        nota3: n.nota3,
        definitiva: n.definitiva,
        estado: n.estado,
        periodo: n.periodo,
      })),

      /* Certificados emitidos por Registro (sin solicitud del alumno). */
      certificadosEmitidos: certificados
        .filter((c) => !c.solicitado)
        .map((c) => ({
          id: `CE-${String(c.id).padStart(4, '0')}`,
          estudianteId: c.estudianteId,
          tipo: c.tipo,
          fecha: soloFecha(c.fecha),
          estado: c.estado,
          matricula: c.matricula,
        })),

      /* Solicitudes del propio alumno. */
      certificados: certificados
        .filter((c) => c.solicitado && c.estudianteId === estudianteId)
        .map((c) => ({
          id: c.id,
          tipo: c.tipo,
          fecha: soloFecha(c.fecha),
          estado: c.estado,
          solicitado: soloFecha(c.solicitado),
        })),

      /* Cobros del estudiante demo. */
      pagos: pagosDemo.map((p) => ({
        id: p.id,
        concepto: p.concepto,
        valor: p.valor,
        fecha_limite: soloFecha(p.fechaLimite),
        fecha_pago: soloFecha(p.fechaPago),
        estado: p.estado,
        referencia: p.referencia,
      })),

      cursos: cursos.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        codigo: c.codigo,
        profesor: c.profesor,
        docenteId: c.docenteId,
        grupo: c.grupo,
        estudiantes: c.estudiantes,
        icon: c.icono,
        color: c.color,
        progreso: c.progreso,
      })),

      actividades: actividades.map((a) => ({
        id: a.id,
        cursoId: a.cursoId,
        corte: a.corte,
        titulo: a.titulo,
        tipo: a.tipo,
        fechaEntrega: fechaYHora(a.fechaEntrega),
        fechaInicio: fechaYHora(a.fechaInicio),
        fechaCierre: fechaYHora(a.fechaCierre),
        descripcion: a.descripcion,
        puntos: a.puntos,
        estado_est: a.estadoEst,
        nota: a.nota,
      })),

      anuncios: anuncios.map((a) => ({
        id: a.id,
        cursoId: a.cursoId,
        titulo: a.titulo,
        contenido: a.contenido,
        fecha: soloFecha(a.fecha),
        autor: a.autor,
      })),

      empleados: empleados.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        cargo: e.cargo,
        dependencia: e.dependencia,
        tipo: e.tipo,
        salario: e.salario,
        estado: e.estado,
        ingreso: soloFecha(e.ingreso),
        doc: e.documento,
      })),

      movimientos: movimientos.map((m) => ({
        id: m.id,
        concepto: m.concepto,
        tipo: m.tipo,
        valor: m.valor,
        fecha: soloFecha(m.fecha),
        cuenta: m.cuenta,
      })),

      proyectos: proyectos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        area: p.area,
        responsable: p.responsable,
        presupuesto: p.presupuesto,
        ejecutado: p.ejecutado,
        avance: p.avance,
        estado: p.estado,
        inicio: soloFecha(p.inicio),
        fin: soloFecha(p.fin),
      })),

      notificaciones: notificaciones.map((n) => ({
        id: n.id,
        roles: n.roles,
        titulo: n.titulo,
        msg: n.msg,
        tipo: n.tipo,
        tiempo: n.tiempo,
        leida: n.leida,
        destino: n.destino || null,
      })),

      eventos: eventos.map((e) => ({ fecha: e.fecha, titulo: e.titulo, tipo: e.tipo })),

      docentes: docentes.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        area: d.area,
        titulo: d.titulo,
        email: d.email,
        estado: d.estado,
        categoria: d.categoria,
      })),

      admisiones: {
        procesoAbierto: procesos.some((p) => p.procesoAbierto),
        periodos: procesos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          fechaApertura: soloFecha(p.fechaApertura),
          fechaCierre: soloFecha(p.fechaCierre),
          fechaResultados: soloFecha(p.fechaResultados),
          fechaInscripcion: soloFecha(p.fechaInscripcion),
          cuposTotales: p.cuposTotales,
          estado: p.estado,
        })),
        configuracion: configuracion.map((c) => ({
          id: c.clave,
          nombre: c.nombre,
          peso: c.peso,
          obligatorio: c.obligatorio,
          descripcion: c.descripcion,
        })),
        documentos: documentos.map((d) => ({
          id: d.clave,
          nombre: d.nombre,
          obligatorio: d.obligatorio,
          vigente: d.vigente,
        })),
        aspirantes: aspirantes.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          documento: a.documento,
          programaId: a.programaId,
          puntajeIcfes: a.puntajeIcfes,
          examen: a.examen,
          promedio: a.promedio,
          fecha: soloFecha(a.fecha),
          estado: a.estado,
          documentos: a.documentos,
        })),
      },

      matricula: {
        modalidades: modalidades.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          icon: m.icon,
          bgClass: m.bgClass,
          descripcion: m.descripcion,
          programas: porModalidad.get(m.id) || 0,
        })),
        programas: programas.map((p) => ({
          id: p.id,
          modalidadId: p.modalidadId,
          nombre: p.nombre,
          facultad: p.facultad,
          semestres: p.semestres,
          creditos: p.creditos,
          cupo: p.cupo,
          matriculados: p.matriculados,
          icon: p.icon,
          bgClass: p.bgClass,
          snies: p.snies,
          jornada: p.jornada,
        })),
        materias: planMaterias.map((m) => ({
          id: m.id,
          programaId: m.programaId,
          semestre: m.semestre,
          codigo: m.codigo,
          nombre: m.nombre,
          area: m.area,
          creditos: m.creditos,
          profesor: m.profesor,
          horas: m.horas,
          estado: m.estado,
          prerrequisito: m.prerrequisitoId,
          horarios: m.horarios.map((h) => `${h.dia} ${h.bloque}`.trim()),
        })),
      },

      estudiantes: estudiantes.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        documento: e.documento,
        correo: e.correo,
        telefono: e.telefono,
        direccion: e.direccion,
        programaId: e.programaId,
        semestre: e.semestre,
        jornada: e.jornada,
        promedio: e.promedio,
        estado: e.estado,
        documentos: e.documentos,
        fechaIngreso: soloFecha(e.fechaIngreso),
        admisioId: e.aspiranteId,
        pagos: e.pagos.map((p) => ({
          id: p.id,
          concepto: p.concepto,
          tipo: p.tipo,
          valor: p.valor,
          fecha_limite: soloFecha(p.fechaLimite),
          fecha_pago: soloFecha(p.fechaPago),
          estado: p.estado,
          referencia: p.referencia,
        })),
      })),
    };
  });
}
