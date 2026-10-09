/* =============================================
   Cálculo de nómina.

   Este módulo NO toca la base: recibe un empleado y los parámetros de la
   corrida y devuelve los números. Así el mismo cálculo se puede usar desde el
   seed, desde las rutas y desde una prueba suelta, sin levantar Postgres, y lo
   que se guarda siempre es lo que esta función calculó.

   La retención en la fuente sigue la tabla progresiva del artículo 383 del
   Estatuto Tributario: se aplica un porcentaje distinto según en qué tramo cae
   la base gravable, y los tramos están expresados en UVT (Unidad de Valor
   Tributario), no en pesos. Por eso hay que pasar la UVT vigente.

   Lo que calcula:
     devengado   = salario base + conceptos de ingreso
     deducciones = salud (4%) + pensión (4%) + solidarity (1% si gana más de 4 SMLMV)
                  + retención en la fuente
     neto        = devengado - deducciones
   ============================================= */

export const CONCEPTO = {
  SALARIO: 'SALARIO',
  HORAS_EXTRA: 'HORAS_EXTRA',
  BONIFICACION: 'BONIFICACION',
  SALUD: 'SALUD',
  PENSION: 'PENSION',
  SOLIDARIDAD: 'SOLIDARIDAD',
  RETENCION: 'RETENCION',
};

/* Porcentaje de los aportes a salud y pensión. Son los del régimen general de
   un empleado de planta; no se ajustan por cargo ni por universidad. */
const APORTE_SALUD = 0.04;
const APORTE_PENSION = 0.04;
/* El fondo de solidaridad aplica solo a quien gana más de 4 salarios
   mínimos, y es el 1% del salario. */
const UMBRAL_SOLIDARIDAD_SMLMV = 4;
const PORCENTAJE_SOLIDARIDAD = 0.01;

/* Tabla progresiva de retención, en UVT. `hasta` es el tope del tramo en UVT y
   `porcentaje` lo que se aplica a lo que excede el tramo anterior.
   Es la estructura del artículo 383: los primeros 95 UVT no pagan retención, y
   de ahí en adelante el porcentaje sube por tramos. */
const TRAMOS_RETENCION = [
  { hasta: 95, porcentaje: 0 },
  { hasta: 150, porcentaje: 0.19 },
  { hasta: 360, porcentaje: 0.28 },
  { hasta: 640, porcentaje: 0.33 },
  { hasta: 945, porcentaje: 0.35 },
  { hasta: 2300, porcentaje: 0.37 },
  { hasta: null, porcentaje: 0.39 },
];

/* Renta exenta: el 25% de los ingresos no es objeto de retención, con un tope.
   En UVT el tope del artículo 383 es 240 UVT mensuales. La parte de la renta
   exenta que depende del empleado (intereses, dividendos, o la!!
   exoneración que cubre el aporte obligatorio a pensión) la declara el propio
   empleado ante la institución; aquí se calcula solo el 25% automático. */
const PORCENTAJE_RENTA_EXENTA = 0.25;
const TOPE_RENTA_EXENTA_UVT = 240;

/* Redondea a pesos enteros. Todos los conceptos se redondean antes de sumar: si
   se sumaran los valores sin redondear y se redondeara el total, el neto del
   certificado no coincidiría con la suma de los renglones que lo componen. */
const pesos = (valor) => Math.round(valor);

/* Salario mensual con el que se liquida a un docente según su categoría. Los
   docentes de la tabla `docentes` no traen salario propio: la institución les
   asigna uno por escala, y esa escala es la que se aplica aquí. El valor por
   defecto cubre una categoría no listada para que la corrida no falle. */
export const SALARIO_DOCENTE = {
  'Docente titular': 6500000,
  'Docente de planta': 6000000,
  'Docente contractual': 4200000,
  'Catedrático': 3600000,
  'Adjunto': 3200000,
  'Asistente': 3000000,
  'Contratado': 2800000,
};

export const salarioDocentePorCategoria = (categoria) =>
  SALARIO_DOCENTE[categoria] ?? 3000000;

/* ── Novedades de nómina ──────────────────────────────────────────────────
   Una novedad es un hecho que Talento Humano reporta (incapacidad, licencia,
   retiro, bono…) y que Contabilidad vuelve un ajuste al salario. El sistema
   calcula un valor sugerido y Contabilidad puede cambiarlo antes de liquidar. */
export const TIPOS_NOVEDAD = {
  INCAPACIDAD: 'incapacidad',
  LICENCIA: 'licencia',
  VACACIONES: 'vacaciones',
  RETIRO: 'retiro',
  BONIFICACION: 'bonificacion',
  HORAS_EXTRA: 'horas_extra',
  DESCUENTO: 'descuento',
};

export const ETIQUETA_NOVEDAD = {
  incapacidad: 'Incapacidad',
  licencia: 'Licencia o permiso',
  vacaciones: 'Vacaciones',
  retiro: 'Retiro o renuncia',
  bonificacion: 'Bonificación',
  horas_extra: 'Horas extra',
  descuento: 'Descuento (préstamo, libranza)',
};

/* Un mes laboral se cuenta de 30 días y 240 horas, que es la convención con la
   que se liquida un salario mensual en Colombia. */
const DIAS_MES = 30;
const HORAS_MES = 240;
/* Recargo de una hora extra: 125% del valor hora ordinaria. */
const RECARGO_HORA_EXTRA = 1.25;

/* Valor de los días no laborados: el salario mensual repartido entre 30 días. */
const valorPorDias = (salarioBase, dias) =>
  pesos(((Number(salarioBase) || 0) / DIAS_MES) * (Number(dias) || 0));

/* Valor sugerido de una novedad. Devuelve `tipoAjuste` ("ingreso", "descuento"
   o "ninguno") y si la persona debe salir de la corrida (`excluye`), que es el
   caso del retiro. Contabilidad puede cambiar el valor antes de liquidar. */
export function calcularNovedad(novedad, salarioBase) {
  const sueldo = Number(salarioBase) || 0;
  switch (novedad.tipo) {
    case TIPOS_NOVEDAD.INCAPACIDAD:
      return { valor: valorPorDias(sueldo, novedad.dias), tipoAjuste: 'descuento', excluye: false };
    case TIPOS_NOVEDAD.LICENCIA:
      return novedad.modalidad === 'remunerada'
        ? { valor: 0, tipoAjuste: 'ninguno', excluye: false }
        : { valor: valorPorDias(sueldo, novedad.dias), tipoAjuste: 'descuento', excluye: false };
    case TIPOS_NOVEDAD.VACACIONES:
      return { valor: 0, tipoAjuste: 'ninguno', excluye: false };
    case TIPOS_NOVEDAD.RETIRO:
      return { valor: 0, tipoAjuste: 'ninguno', excluye: true };
    case TIPOS_NOVEDAD.BONIFICACION:
      return { valor: pesos(Number(novedad.valor) || 0), tipoAjuste: 'ingreso', excluye: false };
    case TIPOS_NOVEDAD.HORAS_EXTRA: {
      const horas = Number(novedad.horas) || 0;
      return {
        valor: pesos((sueldo / HORAS_MES) * horas * RECARGO_HORA_EXTRA),
        tipoAjuste: 'ingreso',
        excluye: false,
      };
    }
    case TIPOS_NOVEDAD.DESCUENTO:
      return { valor: pesos(Number(novedad.valor) || 0), tipoAjuste: 'descuento', excluye: false };
    default:
      return { valor: 0, tipoAjuste: 'ninguno', excluye: false };
  }
};

/* Calcula la retención en la fuente para una base gravable.
   Se recorre la tabla tramo por tramo: cada uno se cobra sobre lo que la base
   supera del tramo anterior, no sobre todo el monto. Así los primeros 95 UVT
   quedan sin retención y el 19% solo aplica a la parte que pasa de ahí. */
export function retencionEnLaFuente(baseGravable, uvt) {
  if (!uvt || uvt <= 0) return 0;
  const baseEnUvt = baseGravable / uvt;
  let anterior = 0;
  let total = 0;
  for (const tramo of TRAMOS_RETENCION) {
    if (tramo.hasta != null && baseEnUvt <= tramo.hasta) {
      total += (baseEnUvt - anterior) * tramo.porcentaje;
      return pesos(total * uvt);
    }
    total += (tramo.hasta - anterior) * tramo.porcentaje;
    anterior = tramo.hasta;
  }
  total += (baseEnUvt - anterior) * TRAMOS_RETENCION.at(-1).porcentaje;
  return pesos(total * uvt);
}

/* Renta exenta que se resta de la base gravable. */
export function rentaExenta(base, uvt) {
  if (!uvt || uvt <= 0) return 0;
  const tope = TOPE_RENTA_EXENTA_UVT * uvt;
  return pesos(Math.min(base * PORCENTAJE_RENTA_EXENTA, tope));
}

/* El cálculo completo de una persona para una corrida. Sirve igual para un
   `Empleado` que para un `Docente`: lo único que necesita es un id y un salario
   base (`baseSalarial` o `salario`).
   `ingresosExtra` son los conceptos que no vienen del salario fijo: horas
   extra, bonificaciones. Se suman al devengado porque sí son ingreso y también
   son base de retención. */
export function liquidar(persona, { uvt, smlmv, ingresosExtra = [], ajustes = [], fechaPago } = {}) {
  const salarioBase = Number(persona.baseSalarial ?? persona.salario ?? 0);
  const fecha = fechaPago ? new Date(fechaPago) : new Date();

  /* ── Devengado ── */
  const conceptos = [];
  conceptos.push({
    tipo: 'devengado',
    codigo: CONCEPTO.SALARIO,
    nombre: salarioBase ? 'Salario base' : 'Salario base (sin dato registrado)',
    valor: pesos(salarioBase),
    orden: 1,
  });
  let devengado = pesos(salarioBase);
  let orden = 2;
  for (const extra of ingresosExtra) {
    const valor = pesos(Number(extra.valor) || 0);
    if (valor <= 0) continue;
    conceptos.push({
      tipo: 'devengado',
      codigo: extra.codigo || CONCEPTO.BONIFICACION,
      nombre: extra.nombre || 'Ingreso adicional',
      valor,
      orden: orden++,
    });
    devengado += valor;
  }

  /* Ajustes que suben el salario (bonificaciones, horas extra). Van antes de
     los aportes porque sí son ingreso y también son base de aportes. */
  for (const ajuste of ajustes) {
    if (ajuste.tipo !== 'devengado') continue;
    const valor = pesos(Number(ajuste.valor) || 0);
    if (valor <= 0) continue;
    conceptos.push({
      tipo: 'devengado',
      codigo: ajuste.codigo || CONCEPTO.BONIFICACION,
      nombre: ajuste.nombre || 'Ingreso por novedad',
      valor,
      orden: orden++,
    });
    devengado += valor;
  }

  /* ── Deducciones ── */
  const salud = pesos(devengado * APORTE_SALUD);
  const pension = pesos(devengado * APORTE_PENSION);
  conceptos.push({
    tipo: 'deduccion', codigo: CONCEPTO.SALUD, nombre: 'Aportes a salud (4%)',
    valor: salud, base: devengado, porcentaje: APORTE_SALUD, orden: orden++,
  });
  conceptos.push({
    tipo: 'deduccion', codigo: CONCEPTO.PENSION, nombre: 'Aportes a pensión (4%)',
    valor: pension, base: devengado, porcentaje: APORTE_PENSION, orden: orden++,
  });

  const umbral = (smlmv || 0) * UMBRAL_SOLIDARIDAD_SMLMV;
  const aplicaSolidaridad = umbral > 0 && devengado > umbral;
  const solidaridad = aplicaSolidaridad ? pesos(devengado * PORCENTAJE_SOLIDARIDAD) : 0;
  if (aplicaSolidaridad) {
    conceptos.push({
      tipo: 'deduccion', codigo: CONCEPTO.SOLIDARIDAD, nombre: 'Fondo de solidaridad (1%)',
      valor: solidaridad, base: devengado, porcentaje: PORCENTAJE_SOLIDARIDAD, orden: orden++,
    });
  }

  /* La base de retención es el devengado menos health y pensión: esos aportes
     son a nombre del empleado y no se le retienen encima. El fondo de
     solidaridad sí es un levy real y por eso no se resta de la base. Los
     ajustes de descuento (incapacidad, préstamo) tampoco son ingreso, así que
     bajan la base de retención. */
  const ajustesDeduccion = ajustes
    .filter((a) => a.tipo === 'deduccion')
    .reduce((s, a) => s + pesos(Number(a.valor) || 0), 0);
  const baseRetencion = pesos(devengado - salud - pension - ajustesDeduccion);
  const exenta = rentaExenta(baseRetencion, uvt);
  const baseGravable = pesos(Math.max(0, baseRetencion - exenta));
  const retencion = retencionEnLaFuente(baseGravable, uvt);
  if (retencion > 0) {
    conceptos.push({
      tipo: 'deduccion', codigo: CONCEPTO.RETENCION, nombre: 'Retención en la fuente',
      valor: retencion, base: baseGravable, orden: orden++,
    });
  }

  /* Los descuentos por novedad no son aportes ni retención: son descuentos
     directos al neto (una incapacidad, un préstamo). Se agregan al final. */
  for (const ajuste of ajustes) {
    if (ajuste.tipo !== 'deduccion') continue;
    const valor = pesos(Number(ajuste.valor) || 0);
    if (valor <= 0) continue;
    conceptos.push({
      tipo: 'deduccion',
      codigo: ajuste.codigo || 'NOVEDAD',
      nombre: ajuste.nombre || 'Descuento por novedad',
      valor,
      orden: orden++,
    });
  }

  const deducciones = salud + pension + solidaridad + retencion + ajustesDeduccion;
  const neto = pesos(devengado - deducciones);

  return {
    personaId: persona.id,
    salarioBase,
    devengado,
    deducciones,
    neto,
    baseRetencion,
    rentaExenta: exenta,
    baseGravable,
    retencion,
    conceptos,
    fechaPago: fecha,
  };
}

/* Totales de una corrida entera. */
export function totalizar(liquidaciones) {
  return liquidaciones.reduce((acc, l) => ({
    devengado: acc.devengado + l.devengado,
    deducciones: acc.deducciones + l.deducciones,
    neto: acc.neto + l.neto,
    retencion: acc.retencion + l.retencion,
  }), { devengado: 0, deducciones: 0, neto: 0, retencion: 0 });
}
