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

/* Nombre de la institución. Queda vacío a propósito: estos PDF son de
   demostración y el membrete no debe mostrar un nombre real. Si algún día se
   despliega con una institución concreta, se pone aquí y el membrete entero lo
   hereda (queda centrado y sin descuadrar porque las plantillas ya reservan el
   renglón). */
const INSTITUCION = '';
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
  const color = '#1b2a4a';
  const dorado = '#9a7b3f';
  const gris = '#475569';
  const izq = doc.page.margins.left;
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  /* ── Marco y membrete, al estilo clásico CUL ──
     Doble filete: uno grueso en color institucional y uno fino dorado por
     dentro, con un tercer filete aún más fino enmarcando el cuerpo. Así el
     papel se lee como un diploma y no como una factura. */
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).lineWidth(2.4).stroke(color);
  doc.rect(31, 31, doc.page.width - 62, doc.page.height - 62).lineWidth(0.8).stroke(dorado);
  doc.rect(38, 38, doc.page.width - 76, doc.page.height - 76).lineWidth(0.4).stroke('#cbd5e1');

  /* Escudo: círculo en color institucional con filete dorado. Va centrado y
     sustituye al nombre de la institución cuando este va vacío en la demo. */
  doc.save();
  doc.circle(doc.page.width / 2, 88, 26).lineWidth(2).fillAndStroke(color, dorado);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
    .text('U', doc.page.width / 2 - 26, 78, { width: 52, align: 'center' });
  doc.restore();

  let y = 126;
  if (INSTITUCION) {
    doc.fillColor(color).font('Helvetica-Bold').fontSize(16)
      .text(INSTITUCION, izq, y, { width: anchoUtil, align: 'center', characterSpacing: 0.6 });
    y = doc.y + 3;
  }
  doc.font('Helvetica').fontSize(8.5).fillColor(gris)
    .text('Registro y Administración · Sistema Integrado de Información Universitaria', izq, y, { width: anchoUtil, align: 'center' });

  /* Filete decorativo con rombo central, como en los diplomas. */
  const yFilete = y + 16;
  doc.moveTo(izq + 30, yFilete).lineTo(doc.page.width / 2 - 14, yFilete).lineWidth(0.8).stroke(dorado);
  doc.moveTo(doc.page.width / 2 + 14, yFilete).lineTo(doc.page.width - izq - 30, yFilete).lineWidth(0.8).stroke(dorado);
  doc.save();
  doc.moveTo(doc.page.width / 2, yFilete - 5)
    .lineTo(doc.page.width / 2 + 5, yFilete)
    .lineTo(doc.page.width / 2, yFilete + 5)
    .lineTo(doc.page.width / 2 - 5, yFilete)
    .closePath().fill(dorado);
  doc.restore();

  /* ── Cuerpo ── */
  doc.y = yFilete + 26;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(gris)
    .text('CERTIFICADO', izq, doc.y, { width: anchoUtil, align: 'center', characterSpacing: 4 });
  doc.moveDown(0.7);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(color)
    .text(certificado.tipo.toUpperCase(), izq, doc.y, { width: anchoUtil, align: 'center', characterSpacing: 1 });

  doc.moveDown(1.5);
  doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
    .text('La ', { continued: true })
    .text(SECRETARIA.toUpperCase(), { continued: true })
    .text(INSTITUCION ? ' de la ' : ' del Sistema Integrado de Información Universitaria, ', { continued: true })
    .text(INSTITUCION || '', { continued: true })
    .text('en uso de sus atribuciones legales, certifica que:', { width: anchoUtil, align: 'justify' });

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
    doc.moveTo(x, yFirma + 22).lineTo(x + anchoUtil / 2 - 56, yFirma + 22).lineWidth(0.8).stroke(color);
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
  doc.info.Author = INSTITUCION || 'Sistema Integrado de Información Universitaria';
  doc.info.Subject = `Folio CE-${String(certificado.id).padStart(5, '0')} · Matrícula ${certificado.matricula || certificado.estudianteId}`;
  doc.info.Keywords = `certificado, ${certificado.tipo}, ${certificado.matricula || certificado.estudianteId}`;
  escribirCertificado(doc, certificado);
  doc.end();
  return doc;
}
