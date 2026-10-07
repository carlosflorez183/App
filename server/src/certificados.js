/* =============================================
   Generación del PDF de un certificado.

   El botón "Descargar" del portal no puede inventar el archivo en el
   navegador: lo arma el servidor con los datos que están guardados, y así el
   certificado que baja el alumno es el mismo que ve la university en su
   expediente. Si el documento se generara en el cliente, cada navegador
   inventaría su propia versión.
   ============================================= */
import PDFDocument from 'pdfkit';
import crypto from 'node:crypto';

/* Nombre de la institución. No hay tabla de institución en la base, así que
   vive aquí como una constante del servidor: es el sello que va en el papel. */
const INSTITUCION = 'Universidad Tecnológica del Sur';
const SECRETARIA = 'Secretaría General';
/* Quiénes firman. No hay tabla de empleados en la base, así que son del
   membrete del certificado; se cambian en un solo sitio. */
const FIRMANTES = [
  { nombre: 'Dra. Laura Sánchez', cargo: SECRETARIA },
  { nombre: 'Ing. Suárez', cargo: 'Decano(a) de la Facultad' },
];

/* Fecha en letras, como se escribe un acta: "12 de marzo de 2026". */
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function fechaEnLetras(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/* Código de verificación para que cualquiera pueda confirmar que el documento no
   es inventado. Sale de los datos reales del certificado, así que el mismo
   certificado siempre muestra el mismo código y dos certificados distintos
   nunca muestran el mismo. */
export function codigoVerificacion(certificado) {
  const base = `${certificado.id}|${certificado.estudianteId}|${certificado.tipo}|${certificado.fecha?.toISOString?.() || ''}`;
  return crypto.createHash('sha256').update(base).digest('hex').slice(0, 12).toUpperCase();
}

/* Quita las tildes sin depender de cómo se guardó el texto. Al pasar a NFD
   cada letra acentuada queda separada de su tilde combinante, así que basta
   con quedarse con los caracteres que no son marcas de acentuación: "ñ" queda
   como "n" y "í" como "i". El filtro va por código de carácter a propósito,
   porque un rango escrito con caracteres combinantes invisibles es fácil de
   corromper y el resultado era un nombre tipo "matri-cula". */
const sinTildes = (texto) => [...texto.normalize('NFD')]
  .filter((caracter) => {
    const codigo = caracter.charCodeAt(0);
    /* Las marcas de acentuación combinantes ocupan los códigos 0x300 a 0x36f;
       todo lo demás (letras, números, espacios) se queda. */
    return codigo < 0x0300 || codigo > 0x036f;
  })
  .join('');

/* Nombre de archivo sin espacios, tildes ni ñ, para que no llegue roto a
   Windows ni se vea partido en el portal. */
export function nombreArchivo(certificado) {
  const tipo = sinTildes(certificado.tipo)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `certificado-${certificado.matricula || certificado.estudianteId}-${tipo}-${certificado.id}.pdf`;
}

/* El módulo no toca la base: recibe el certificado ya leído y solo lo imprime.
   Así la plantilla se puede probar suelta, sin levantar Postgres. */

/* Escribe el PDF en el documento. La plantilla usa las fuentes estándar del
   PDF (Helvetica): acentos y ñ salen bien sin tener que embeber archivos de
   fuentes en el contenedor. */
export function escribirCertificado(doc, certificado) {
  const e = certificado.estudiante;
  const color = '#0f3d5c';
  const gris = '#475569';
  const izq = doc.page.margins.left;
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  /* ── Marco y membrete ── */
  doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).lineWidth(1.4).stroke(color);
  doc.rect(34, 34, doc.page.width - 68, doc.page.height - 68).lineWidth(0.4).stroke('#94a3b8');

  doc.save();
  doc.roundedRect(doc.page.width / 2 - 19, 56, 38, 38, 8).fill(color);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(17)
    .text('U', doc.page.width / 2 - 19, 64, { width: 38, align: 'center' });
  doc.restore();

  doc.fillColor(color).font('Helvetica-Bold').fontSize(15)
    .text(INSTITUCION, izq, 100, { width: anchoUtil, align: 'center' });
  doc.font('Helvetica').fontSize(8.5).fillColor(gris)
    .text('Registro y Administración · Sistema Integrado de Información Universitaria', izq, 119, { width: anchoUtil, align: 'center' });

  doc.moveTo(izq, 138).lineTo(doc.page.width - izq, 138).lineWidth(0.8).stroke('#cbd5e1');

  /* ── Cuerpo ── */
  doc.y = 160;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(gris)
    .text('CERTIFICADO', izq, doc.y, { width: anchoUtil, align: 'center', characterSpacing: 2 });
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(color)
    .text(certificado.tipo.toUpperCase(), izq, doc.y, { width: anchoUtil, align: 'center' });

  doc.moveDown(1.4);
  doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
    .text('La ', { continued: true })
    .text(SECRETARIA.toUpperCase(), { continued: true })
    .text(' de la ', { continued: true })
    .text(INSTITUCION, { continued: true })
    .text(', en uso de sus atribuciones legales, certifica que:', { width: anchoUtil, align: 'justify' });

  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a')
    .text(e?.nombre || 'Estudiante no encontrado', izq, doc.y, { width: anchoUtil, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(gris)
    .text(`identificado con documento ${e?.documento || '—'}`, izq, doc.y + 1, { width: anchoUtil, align: 'center' });

  doc.moveDown(1.4);
  const fechas = [
    ['Programa', e?.programa?.nombre || '—'],
    ['Facultad', e?.programa?.facultad || '—'],
    ['Matrícula', certificado.matricula || e?.id || '—'],
    ['Semestre cursado', e?.semestre ? `${e.semestre}°` : '—'],
    ['Fecha de ingreso', fechaEnLetras(e?.fechaIngreso)],
    ['Fecha de emisión', fechaEnLetras(certificado.fecha)],
  ];
  for (const [campo, valor] of fechas) {
    const y = doc.y;
    doc.font('Helvetica').fontSize(9.5).fillColor(gris)
      .text(`${campo}:`, izq + 24, y, { width: 150, continued: false });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a')
      .text(valor || '—', izq + 178, y - 1.5, { width: anchoUtil - 202 });
    doc.moveDown(0.35);
  }

  doc.moveDown(0.8);
  doc.font('Helvetica').fontSize(10.5).fillColor('#1e293b')
    .text('El presente documento se expide a petición del interesado, para los fines '
      + 'legales y administrativos que al mismo convengan.', izq, doc.y, { width: anchoUtil, align: 'justify' });

  /* ── Firmas ── */
  const yFirma = doc.page.height - 150;
  FIRMANTES.forEach((firmante, i) => {
    const x = izq + i * (anchoUtil / 2) + 8;
    doc.moveTo(x, yFirma + 22).lineTo(x + anchoUtil / 2 - 56, yFirma + 22).lineWidth(0.8).stroke('#334155');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
      .text(firmante.nombre, x, yFirma + 27, { width: anchoUtil / 2 - 56, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor(gris)
      .text(firmante.cargo, x, yFirma + 39, { width: anchoUtil / 2 - 56, align: 'center' });
  });

  /* ── Pie: código de verificación ── */
  const codigo = codigoVerificacion(certificado);
  doc.moveTo(izq, doc.page.height - 96).lineTo(doc.page.width - izq, doc.page.height - 96).lineWidth(0.4).stroke('#cbd5e1');
  doc.font('Helvetica').fontSize(8).fillColor(gris)
    .text(`Folio interno CE-${String(certificado.id).padStart(5, '0')}`, izq, doc.page.height - 88, { width: anchoUtil / 2 });
  doc.text(`Código de verificación: ${codigo}`, doc.page.width / 2, doc.page.height - 88, {
    width: anchoUtil / 2, align: 'right',
  });
  doc.fontSize(7).fillColor('#94a3b8')
    .text('Este certificado se expide electrónicamente. Su autenticidad puede verificarse '
      + 'presentando el código de verificación ante la Secretaría General.', izq, doc.page.height - 74, {
      width: anchoUtil, align: 'center',
    });
}

/* Arma el documento completo como un Buffer, que es lo que necesita Fastify
   para mandar un `Content-Disposition: attachment`. */
export async function pdfDeCertificado(certificado) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 56 });
  /* Los metadatos del PDF se rellenan aquí y no por constructor: pdfkit los
     ignora en las opciones. Es lo primero que se ve al abrir el archivo, así que
     el título tiene que decir de qué certificado se trata. */
  doc.info.Title = `${certificado.tipo} - ${certificado.estudiante?.nombre || 'estudiante'}`;
  doc.info.Author = INSTITUCION;
  doc.info.Subject = `Folio CE-${String(certificado.id).padStart(5, '0')} · Matrícula ${certificado.matricula || certificado.estudianteId}`;
  doc.info.Keywords = `certificado, ${certificado.tipo}, ${certificado.matricula || certificado.estudianteId}`;
  escribirCertificado(doc, certificado);
  doc.end();
  return doc;
}
