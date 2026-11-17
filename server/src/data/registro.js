/* =============================================
   Lógica compartida de Registro y Admisiones.
   Estados de estudiante, estado de cuenta y tipos
   de certificado. Sin estado propio: todas las
   funciones son puras sobre `data.estudiantes`.
   ============================================= */

export const ESTADO_ESTUDIANTE = {
  activo:          { label: 'Activo',          tone: 'green'  },
  en_inscripcion:  { label: 'En inscripción',   tone: 'blue'   },
  retirado:        { label: 'Retirado',         tone: 'slate'  },
  graduado:        { label: 'Graduado',         tone: 'purple' },
};

export const DOC_ESTUDIANTE = {
  completo:    { label: 'Completo',    tone: 'green' },
  pendiente:   { label: 'Pendiente',   tone: 'amber' },
  incompleto:  { label: 'Incompleto',  tone: 'red'   },
};

/* ---------- Estado de cuenta ---------- */

export const saldo = (estudiante) =>
  (estudiante?.pagos || [])
    .filter((p) => p.estado !== 'pagado')
    .reduce((acc, p) => acc + p.valor, 0);

export const pagosVencidos = (estudiante) =>
  (estudiante?.pagos || []).filter((p) => p.estado === 'vencido');

/** Semáforo de cartera: al día, pendiente o en mora. */
export const estadoCuenta = (estudiante) => {
  if (estudiante.estado === 'retirado') return { key: 'cerrado',  label: 'Cuenta cerrada', tone: 'slate'  };
  if (pagosVencidos(estudiante).length > 0) return { key: 'mora',    label: 'En mora',        tone: 'red'    };
  if (saldo(estudiante) > 0)              return { key: 'pendiente', label: 'Pago pendiente', tone: 'amber'  };
  return { key: 'al_dia', label: 'Paz y salvo', tone: 'green' };
};

/** Suma la cartera de todos los estudiantes con un filtro previo. */
export const cartera = (estudiantes) =>
  (estudiantes || []).reduce(
    (acc, e) => {
      (e.pagos || []).forEach((p) => {
        acc[p.estado] = (acc[p.estado] || 0) + p.valor;
      });
      if (estadoCuenta(e).key === 'mora') acc.conMora += 1;
      if (estadoCuenta(e).key === 'al_dia') acc.alDia += 1;
      return acc;
    },
    { pagado: 0, pendiente: 0, vencido: 0, conMora: 0, alDia: 0 }
  );

/* ---------- Certificados ---------- */

export const TIPOS_CERTIFICADO = [
  { id: 'estudios',   nombre: 'Certificado de Estudios',      requiere: 'ninguno',        descripcion: 'Rinde de matrícula, programa y periodo cursado.' },
  { id: 'notas',      nombre: 'Constancia de Notas',          requiere: 'ninguno',        descripcion: 'Promedio y materias calificadas del semestre.' },
  { id: 'matricula',  nombre: 'Certificado de Matrícula',     requiere: 'pagos',          descripcion: 'Vigencia de la matrícula del periodo actual.' },
  { id: 'paz_salvo',  nombre: 'Paz y Salvo Financiero',       requiere: 'pagos',          descripcion: 'Certifica que no tiene saldos pendientes.' },
  { id: 'contenido',  nombre: 'Constancia de Contenidos',    requiere: 'ninguno',        descripcion: 'Contenido programático y competencias del programa.' },
  { id: 'notas_completo', nombre: 'Certificado de Calificaciones', requiere: 'ninguno',    descripcion: 'Historial académico completo con créditos.' },
];

/** Un certificado solo se emite si el estudiante no bloquea el trámite. */
export const puedeEmitir = (estudiante, tipoId) => {
  const tipo = TIPOS_CERTIFICADO.find((t) => t.id === tipoId);
  if (!tipo) return { ok: false, motivo: 'Tipo de certificado desconocido.' };
  if (estudiante.estado === 'retirado')
    return { ok: false, motivo: 'El estudiante está retirado: solo aplica constancia de retiro.' };
  if (tipo.requiere === 'pagos' && saldo(estudiante) > 0)
    return {
      ok: false,
      motivo: pagosVencidos(estudiante).length > 0
        ? `Está en mora: hay conceptos vencidos.`
        : `Tiene saldo pendiente de $${saldo(estudiante).toLocaleString('es-CO')}.`,
    };
  if (tipo.id === 'estudios' && estudiante.estado === 'en_inscripcion')
    return { ok: false, motivo: 'La matrícula del periodo aún no está registrada.' };
  return { ok: true, motivo: '' };
};

export const estadoCertificado = (c) =>
  c.estado === 'disponible'
    ? { label: 'Disponible', tone: 'green' }
    : c.estado === 'entregado'
      ? { label: 'Entregado', tone: 'green' }
      : c.estado === 'anulado'
        ? { label: 'Anulado', tone: 'red' }
        : { label: 'En trámite', tone: 'amber' };

/* Un certificado se puede bajar cuando ya está listo: lo que sigue en trámite no
   se descarga todavía, ni el propio alumno ni Admisiones. El servidor aplica la
   misma regla en /certificados/:id/pdf. */
export const certificadoDescargable = (c) => c.estado === 'disponible' || c.estado === 'entregado';
