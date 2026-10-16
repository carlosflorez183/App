/* =============================================
   Exportación a Excel (.xlsx) sin dependencias.
   Arma un libro Office Open XML: es un archivo ZIP
   con entradas almacenadas (sin comprimir) y las
   partes XML mínimas. Excel, LibreOffice y Google
   Sheets lo abren de forma nativa.
   ============================================= */

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapar = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);

/* CRC-32 (IEEE 802.3): lo exige el formato ZIP. */
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const codificar = (texto) => new TextEncoder().encode(texto);

const letraColumna = (n) => {
  let s = '';
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function filaXml(n, celdas) {
  const contenido = celdas
    .map((c, i) => {
      const ref = `${letraColumna(i + 1)}${n}`;
      const s = c.estilo ? ` s="${c.estilo}"` : '';
      if (typeof c.num === 'number' && Number.isFinite(c.num)) return `<c r="${ref}"${s}><v>${c.num}</v></c>`;
      if (c.v === undefined || c.v === null || c.v === '') return s ? `<c r="${ref}"${s}/>` : '';
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapar(c.v)}</t></is></c>`;
    })
    .join('');
  return `<row r="${n}">${contenido}</row>`;
}

function hojaXml(hoja) {
  const columnas = hoja.columnas || [];
  const cols = columnas
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho || 16}" customWidth="1"/>`)
    .join('');
  const filas = [filaXml(1, columnas.map((c) => ({ v: c.titulo, estilo: 1 })))];
  (hoja.filas || []).forEach((fila, idx) => {
    filas.push(
      filaXml(
        idx + 2,
        fila.map((valor, c) => {
          const col = columnas[c] || {};
          if (typeof valor === 'number' && Number.isFinite(valor)) return { num: valor, estilo: col.moneda ? 2 : 0 };
          return { v: valor, estilo: 0 };
        })
      )
    );
  });
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${filas.join('')}</sheetData></worksheet>`
  );
}

function estilosXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>` +
    `<fonts count="2">` +
    `<font><sz val="11"/><name val="Calibri"/></font>` +
    `<font><sz val="11"/><b/><color rgb="FFFFFFFF"/></font>` +
    `</fonts>` +
    `<fills count="3">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF003366"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="3">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
    `</cellXfs></styleSheet>`
  );
}

function parteLibro(nombres) {
  const hojas = nombres
    .map((nombre, i) => `<sheet name="${escapar(nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${hojas}</sheets></workbook>`
  );
}

function relsLibro(n) {
  const hojas = [];
  for (let i = 1; i <= n; i++) {
    hojas.push(
      `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`
    );
  }
  hojas.push(
    `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
  );
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.join('')}</Relationships>`
  );
}

function tiposContenido(n) {
  const hojas = [];
  for (let i = 1; i <= n; i++) {
    hojas.push(
      `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );
  }
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    hojas.join('') +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`
  );
}

const RELS_RAIZ =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`;

/* Arma el ZIP (método "store"): cabeceras locales, directorio central y EOCD. */
function empaquetar(entradas) {
  const partes = [];
  const central = [];
  let offset = 0;

  for (const entrada of entradas) {
    const nombre = codificar(entrada.nombre);
    const datos = entrada.datos;
    const crc = crc32(datos);

    const local = new Uint8Array(30 + nombre.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, datos.length, true);
    lv.setUint32(22, datos.length, true);
    lv.setUint16(26, nombre.length, true);
    lv.setUint16(28, 0, true);
    local.set(nombre, 30);

    const cd = new Uint8Array(46 + nombre.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, datos.length, true);
    cv.setUint32(24, datos.length, true);
    cv.setUint16(28, nombre.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nombre, 46);

    partes.push(local, datos);
    central.push(cd);
    offset += local.length + datos.length;
  }

  const inicioCentral = offset;
  let tamCentral = 0;
  for (const cd of central) {
    partes.push(cd);
    tamCentral += cd.length;
  }

  const fin = new Uint8Array(22);
  const fv = new DataView(fin.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(4, 0, true);
  fv.setUint16(6, 0, true);
  fv.setUint16(8, central.length, true);
  fv.setUint16(10, central.length, true);
  fv.setUint32(12, tamCentral, true);
  fv.setUint32(16, inicioCentral, true);
  fv.setUint16(20, 0, true);
  partes.push(fin);

  let total = 0;
  for (const p of partes) total += p.length;
  const salida = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    salida.set(p, pos);
    pos += p.length;
  }
  return salida;
}

/**
 * Construye un libro .xlsx en memoria.
 * @param {Array<{nombre:string, columnas:Array<{titulo:string, ancho?:number, moneda?:boolean}>, filas:Array<Array<any>>}>} hojas
 * @returns {Uint8Array}
 */
export function construirXlsx(hojas) {
  const lista = Array.isArray(hojas) ? hojas : [hojas];
  const entradas = [
    { nombre: '[Content_Types].xml', datos: codificar(tiposContenido(lista.length)) },
    { nombre: '_rels/.rels', datos: codificar(RELS_RAIZ) },
    { nombre: 'xl/workbook.xml', datos: codificar(parteLibro(lista.map((h) => h.nombre))) },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: codificar(relsLibro(lista.length)) },
    { nombre: 'xl/styles.xml', datos: codificar(estilosXml()) },
  ];
  lista.forEach((hoja, i) => {
    entradas.push({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: codificar(hojaXml(hoja)) });
  });
  return empaquetar(entradas);
}

/**
 * Descarga un .xlsx en el navegador.
 * @param {string} archivo nombre sin extensión
 * @param {Array|Object} hojas una hoja o lista de hojas
 */
export function descargarExcel(archivo, hojas) {
  const bytes = construirXlsx(hojas);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.endsWith('.xlsx') ? archivo : `${archivo}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
