/* =============================================
   PDF de los certificados laborales.

   Son tres documentos distintos y no una plantilla con campos variables,
   porque no dicen lo mismo:

     constancia_laboral    qué cargo tiene y desde cuándo.
     certificado_ingresos  cuánto devenga.
     ingresos_retenciones  cuánto devengó y cuánto se le retuvo en un periodo,
                           que es lo que el empleado necesita para su
                           declaración de renta.

   Igual que en certificados.js, este módulo no toca la base: recibe el
   certificado ya leído con sus liquidaciones y conceptos, y solo lo imprime.
   Los renglones vienen de `Concepto`, no se vuelven a calcular: el certificado
   tiene que mostrar lo que realmente se cobró, aunque después cambien el
   salario o la UVT.
   ============================================= */
import PDFDocument from 'pdfkit';
import crypto from 'node:crypto';
import { fechaEnLetras } from './certificados.js';

const INSTITUCION = 'Universidad Tecnológica del Sur';
const TALENTO_HUMANO = 'Talento Humano';

/* Quiénes firman. La Jefa de Talento Humano es la que expide, y el contador
   da fe de las cifras: en un certificado de retenciones eso es lo que lo hace
   válido. */
const FIRMANTES = [
  { nombre: 'María Fernanda López', cargo: 'Jefa de Talento Humano' },
  { nombre: 'Jorge Alberto Ríos', cargo: 'Contador General' },
];

const MESES_CORTOS = {
  '01': 'enero', '02': 'febrero', '03': 'marzo', '04': 'abril', '05': 'mayo', '06': 'junio',
  '07': 'julio', '08': 'agosto', '09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre',
};

/* "2026-08" → "agosto de 2026". */
export function periodoEnLetras(periodo) {
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return periodo || '';
  const [anio, mes] = periodo.split('-');
  return `${MESES_CORTOS[mes] || mes} de ${anio}`;
}

const COP = (valor) => `$${Number(valor || 0).toLocaleString('es-CO')}`;

/* Código de verificación. Se arma con el contenido del certificado, así que
   cambia si cambian las cifras: dos certificados del mismo empleado con
   periodos distintos nunca muestran el mismo código. */
export function codigoVerificacion(certificado) {
  const liq = certificado.liquidacion;
  const base = [
    certificado.id,
    certificado.empleadoId,
    certificado.tipo,
    certificado.periodo || '',
    liq?.devengado ?? '',
    liq?.retencion ?? '',
    certificado.fecha?.toISOString?.() || '',
  ].join('|');
  return crypto.createHash('sha256').update(base).digest('hex').slice(0, 12).toUpperCase();
}

/* Nombre de archivo sin tildes ni espacios. */
export function nombreArchivo(certificado) {
  const tipo = certificado.tipo.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  const per = certificado.periodo ? `-${certificado.periodo}` : '';
  return `certificado-laboral-${certificado.empleado?.documento || certificado.empleadoId}-${tipo}${per}-${certificado.id}.pdf`;
}

/* ── Piezas del membrete, compartidas por las tres plantillas ─────────── */

function membrete(doc) {
  const color = '#1e3a5f';
  const gris = '#475569';
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).lineWidth(1.4).stroke(color);
  doc.rect(34, 34, doc.page.width - 68, doc.page.height - 68).lineWidth(0.4).stroke('#94a3b8');

  doc.save();
  doc.roundedRect(doc.page.width / 2 - 19, 56, 38, 38, 8).fill(color);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(17)
    .text('U', doc.page.width / 2 - 19, 64, { width: 38, align: 'center' });
  doc.restore();

  doc.fillColor(color).font('Helvetica-Bold').fontSize(15)
    .text(INSTITUCION, izq, 100, { width: ancho, align: 'center' });
  doc.font('Helvetica').fontSize(8.5).fillColor(gris)
    .text(`${TALENTO_HUMANO} · Vicerrectoría Administrativa`, izq, 119, { width: ancho, align: 'center' });

  doc.moveTo(izq, 138).lineTo(doc.page.width - izq, 138).lineWidth(0.8).stroke('#cbd5e1');
  return { color, gris, izq, ancho };
}

/* Tabla de dos columnas para los datos del empleado. */
function datos(doc, izq, ancho, filas) {
  doc.moveDown(0.6);
  for (const [campo, valor] of filas) {
    const y = doc.y;
    doc.font('Helvetica').fontSize(9.5).fillColor('#475569')
      .text(`${campo}:`, izq + 20, y, { width: 165 });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a')
      .text(valor || '—', izq + 190, y - 1.5, { width: ancho - 214 });
    doc.moveDown(0.35);
  }
}

function firmas(doc) {
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - 148;
  FIRMANTES.forEach((firmante, i) => {
    const x = izq + i * (ancho / 2) + 8;
    doc.moveTo(x, y + 22).lineTo(x + ancho / 2 - 56, y + 22).lineWidth(0.8).stroke('#334155');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
      .text(firmante.nombre, x, y + 27, { width: ancho / 2 - 56, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
      .text(firmante.cargo, x, y + 39, { width: ancho / 2 - 56, align: 'center' });
  });
}

function pie(doc, certificado) {
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.moveTo(izq, doc.page.height - 96).lineTo(doc.page.width - izq, doc.page.height - 96)
    .lineWidth(0.4).stroke('#cbd5e1');
  doc.font('Helvetica').fontSize(8).fillColor('#475569')
    .text(`Folio interno CL-${String(certificado.id).padStart(5, '0')}`, izq, doc.page.height - 88, { width: ancho / 2 });
  doc.text(`Código de verificación: ${codigoVerificacion(certificado)}`, doc.page.width / 2, doc.page.height - 88, {
    width: ancho / 2, align: 'right',
  });
  doc.fontSize(7).fillColor('#94a3b8')
    .text('Documento equivalente emitido electrónicamente. La autenticidad se verifica '
      + 'con el código anterior ante la Oficina de Talento Humano.', izq, doc.page.height - 74, {
      width: ancho, align: 'center',
    });
}

/* ── Constancia laboral ──────────────────────────────────────────────── */

export function escribirConstanciaLaboral(doc, certificado) {
  const { color, gris, izq, ancho } = membrete(doc);
  const e = certificado.empleado;

  doc.y = 158;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(gris)
    .text('CERTIFICADO', izq, doc.y, { width: ancho, align: 'center', characterSpacing: 2 });
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(color)
    .text('CONSTANCIA LABORAL', izq, doc.y, { width: ancho, align: 'center' });

  doc.moveDown(1.3);
  doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
    .text('La ', { continued: true })
    .text(TALENTO_HUMANO.toUpperCase(), { continued: true })
    .text(' de la ', { continued: true })
    .text(INSTITUCION, { continued: true })
    .text(', en uso de sus atribuciones legales, certifica que:', { width: ancho, align: 'justify' });

  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a')
    .text(e?.nombre || 'Empleado no encontrado', izq, doc.y, { width: ancho, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(gris)
    .text(`identificado con documento ${e?.documento || '—'}`, izq, doc.y + 1, { width: ancho, align: 'center' });

  doc.moveDown(1.3);
  doc.font('Helvetica').fontSize(10.5).fillColor('#1e293b')
    .text('Se encuentra vinculado a esta Institución, desempeñando el cargo de '
      + `${e?.cargo || '—'}, en la dependencia ${e?.dependencia || '—'}, `
      + `con una relación contractual de tipo ${e?.tipo || '—'}.`, { width: ancho, align: 'justify' });

  datos(doc, izq, ancho, [
    ['Fecha de ingreso', fechaEnLetras(e?.ingreso)],
    ['Tiempo de servicio', tiempoDeServicio(e?.ingreso)],
    ['Fecha de emisión', fechaEnLetras(certificado.fecha)],
  ]);

  doc.moveDown(0.7);
  doc.font('Helvetica').fontSize(10.5).fillColor('#1e293b')
    .text('La presente constancia se expide a petición del interesado para los fines '
      + 'legales y administrativos que al mismo convengan.', { width: ancho, align: 'justify' });

  firmas(doc);
  pie(doc, certificado);
}

/* Años y meses cumplidos desde el ingreso. Se calcula con días, no con meses
   de calendario: un mes a medio camino no cuenta como mes cumplido. */
export function tiempoDeServicio(ingreso) {
  if (!ingreso) return null;
  const desde = new Date(ingreso);
  if (Number.isNaN(desde.getTime())) return null;
  const hoy = new Date();
  let anios = hoy.getUTCFullYear() - desde.getUTCFullYear();
  let meses = hoy.getUTCMonth() - desde.getUTCMonth();
  if (hoy.getUTCDate() < desde.getUTCDate()) meses -= 1;
  if (meses < 0) { anios -= 1; meses += 12; }
  if (anios < 0) return null;
  const partes = [];
  if (anios) partes.push(`${anios} año${anios === 1 ? '' : 's'}`);
  if (meses || !anios) partes.push(`${meses} mes${meses === 1 ? '' : 'es'}`);
  return partes.join(' y ');
}

/* ── Certificado de ingresos ──────────────────────────────────────────── */

export function escribirCertificadoIngresos(doc, certificado) {
  const { color, gris, izq, ancho } = membrete(doc);
  const e = certificado.empleado;
  const liq = certificado.liquidacion;

  doc.y = 158;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(gris)
    .text('CERTIFICADO', izq, doc.y, { width: ancho, align: 'center', characterSpacing: 2 });
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(color)
    .text('DE INGRESOS', izq, doc.y, { width: ancho, align: 'center' });

  doc.moveDown(1.3);
  doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
    .text('La ', { continued: true })
    .text(TALENTO_HUMANO.toUpperCase(), { continued: true })
    .text(' de la ', { continued: true })
    .text(INSTITUCION, { continued: true })
    .text(', certifica que el empleado identificado con documento ', { width: ancho, align: 'justify' })
    .text(e?.documento || '—', { continued: true })
    .text(', ocupa el cargo de ', { width: ancho, align: 'justify' })
    .text(e?.cargo || '—', { continued: true })
    .text(` y tiene un ingreso mensual de ${COP(liq?.salarioBase ?? e?.salario)}.`, {
      width: ancho, align: 'justify',
    });

  datos(doc, izq, ancho, [
    ['Nombre', e?.nombre],
    ['Dependencia', e?.dependencia],
    ['Tipo de contrato', e?.tipo],
    ['Fecha de ingreso', fechaEnLetras(e?.ingreso)],
    ['Fecha de emisión', fechaEnLetras(certificado.fecha)],
  ]);

  firmas(doc);
  pie(doc, certificado);
}

/* ── Certificado de ingresos y retenciones ────────────────────────────── */

export function escribirIngresosRetenciones(doc, certificado) {
  const { color, gris, izq, ancho } = membrete(doc);
  const e = certificado.empleado;
  const liq = certificado.liquidacion;
  const nomina = certificado.nomina;
  const periodo = periodoEnLetras(certificado.periodo);

  doc.y = 152;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(gris)
    .text('CERTIFICADO', izq, doc.y, { width: ancho, align: 'center', characterSpacing: 2 });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(color)
    .text('DE INGRESOS Y RETENCIONES', izq, doc.y, { width: ancho, align: 'center' });

  doc.moveDown(1.1);
  doc.font('Helvetica').fontSize(10.5).fillColor('#1e293b')
    .text(`${TALENTO_HUMANO} de la ${INSTITUCION}, en calidad de agente de retención, `
      + `certifica que durante el periodo de ${periodo} el empleado que a continuación `
      + 'se identifica devengó y tuvo los siguientes descuentos:', { width: ancho, align: 'justify' });

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
    .text(e?.nombre || 'Empleado no encontrado', izq, doc.y, { width: ancho, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(gris)
    .text(`${e?.documento || '—'} · ${e?.cargo || '—'} · ${e?.dependencia || '—'}`, {
      izq, width: ancho, align: 'center',
    });

  /* ── Tabla de conceptos ──
     Se imprime desde `Concepto`, que es lo que se guardó al liquidar. Si un
     empleado tuviera horas extra, aparecen como renglón y no como un total. */
  const conceptos = liq?.conceptos || [];
  const yTabla = doc.y + 14;
  const xTabla = izq + 16;
  const anchoTabla = ancho - 32;
  const colConcepto = anchoTabla * 0.56;
  const colBase = anchoTabla * 0.18;
  const colValor = anchoTabla - colConcepto - colBase;

  doc.rect(xTabla, yTabla, anchoTabla, 20).fill('#eef2f7');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a5f');
  doc.text('CONCEPTO', xTabla + 8, yTabla + 6, { width: colConcepto - 8 });
  doc.text('BASE', xTabla + colConcepto, yTabla + 6, { width: colBase, align: 'right' });
  doc.text('VALOR', xTabla + colConcepto + colBase, yTabla + 6, { width: colValor - 8, align: 'right' });

  let y = yTabla + 20;
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
  for (const c of conceptos) {
    const alto = 16;
    doc.text(c.nombre, xTabla + 8, y + 4, { width: colConcepto - 8 });
    doc.fillColor('#64748b').fontSize(8.5)
      .text(c.base ? COP(c.base) : '', xTabla + colConcepto, y + 4, { width: colBase, align: 'right' });
    doc.fillColor(c.tipo === 'deduccion' ? '#b91c1c' : '#15803d').font('Helvetica-Bold').fontSize(9)
      .text(COP(c.valor), xTabla + colConcepto + colBase, y + 4, { width: colValor - 8, align: 'right' });
    doc.moveTo(xTabla, y + alto).lineTo(xTabla + anchoTabla, y + alto).lineWidth(0.3).stroke('#e2e8f0');
    y += alto;
  }

  const totalFila = (etiqueta, valor, colorTexto) => {
    y += 2;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#334155')
      .text(etiqueta, xTabla + 8, y + 4, { width: colConcepto + colBase - 8 });
    doc.fillColor(colorTexto)
      .text(COP(valor), xTabla + colConcepto + colBase, y + 4, { width: colValor - 8, align: 'right' });
    y += 17;
  };

  totalFila('TOTAL DEVENGADO', liq?.devengado, '#15803d');
  totalFila('TOTAL DEDUCIDO', liq?.deducciones, '#b91c1c');
  totalFila('NETO PAGADO', liq?.neto, '#0f172a');

  /* ── Bloque de retención ──
     Es la parte que el empleado necesita para su declaración de renta, así que
     va explícita y no solo implícita en el total de deducciones. */
  y += 6;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a5f')
    .text('DETERMINACIÓN DE LA RETENCIÓN EN LA FUENTE', xTabla, y);
  y += 14;
  doc.font('Helvetica').fontSize(9).fillColor('#334155');
  /* El bloque se arma con lo que hay en la liquidación, no recalculando: los
     aportes se leen de los conceptos SALUD y PENSION, que son los que
     efectivamente se descontaron. La línea cuadra porque la base de retención
     se guardó como devengado menos esos mismos dos conceptos. */
  const aportes = sumaConceptos(liq, ['SALUD', 'PENSION']);
  const bloque = [
    ['Ingreso bruto del periodo', liq?.devengado],
    ['Menos aportes a salud y pensión', -aportes],
    ['Base de retención', liq?.baseRetencion],
    ['Menos renta exenta (25%)', -Math.abs(liq?.rentaExenta || 0)],
    ['Base gravable', liq?.baseGravable],
    ['Retención en la fuente practicada', liq?.retencion],
  ];
  for (const [etiqueta, valor] of bloque) {
    const esTotal = etiqueta === 'Retención en la fuente practicada';
    doc.font(esTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
      .fillColor(esTotal ? '#b91c1c' : '#334155')
      .text(etiqueta, xTabla + 8, y, { width: 240 });
    doc.text(COP(Math.abs(valor || 0)), xTabla + colConcepto + colBase, y, {
      width: colValor - 8, align: 'right',
    });
    y += 14;
  }

  doc.moveDown(0.8);
  doc.font('Helvetica').fontSize(8.5).fillColor('#64748b')
    .text(`Valor de la UVT aplicada: ${COP(nomina?.uvt)}. `
      + `Valor de la retención calculada con la tabla progresiva del artículo 383 del `
      + `Estatuto Tributario.`, { width: ancho, align: 'justify' });

  firmas(doc);
  pie(doc, certificado);
}

/* Suma los valores de los conceptos con esos códigos. */
function sumaConceptos(liq, codigos) {
  if (!liq?.conceptos) return 0;
  return liq.conceptos
    .filter((c) => c.tipo === 'deduccion' && codigos.includes(c.codigo))
    .reduce((a, c) => a + c.valor, 0);
}

/* Arma el PDF del tipo que corresponda y devuelve el Buffer de Fastify. */
export async function pdfDeCertificadoLaboral(certificado) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 56 });
  doc.info.Title = `${certificado.tipo} - ${certificado.empleado?.nombre || 'empleado'}`;
  doc.info.Author = INSTITUCION;
  doc.info.Subject = `Folio CL-${String(certificado.id).padStart(5, '0')}`
    + (certificado.periodo ? ` · Periodo ${periodoEnLetras(certificado.periodo)}` : '');
  doc.info.Keywords = `certificado laboral, ${certificado.tipo}, ${certificado.periodo || ''}`.trim();

  if (certificado.tipo === 'constancia_laboral') escribirConstanciaLaboral(doc, certificado);
  else if (certificado.tipo === 'certificado_ingresos') escribirCertificadoIngresos(doc, certificado);
  else escribirIngresosRetenciones(doc, certificado);

  doc.end();
  return doc;
}
