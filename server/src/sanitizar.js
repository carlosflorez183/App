/* =============================================
   Sanitizador de HTML con lista blanca.
   Se aplica al contenido que escriben docentes y
   asistentes (descripción de cursos, actividades).
   Solo deja etiquetas de formato y estructura; quita
   scripts, estilos peligrosos, eventos y URLs
   javascript:. No es un parser completo: ante la duda
   escapa el contenido.
   ============================================= */

const ETIQUETAS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

// Atributos permitidos por etiqueta (el resto se descarta).
const ATRIBUTOS = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
  '*': new Set(['class']),
};

const escapar = (t) => t
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Solo se aceptan enlaces y fuentes http(s), mailto o rutas relativas.
const urlSegura = (valor) => {
  const v = String(valor || '').trim().replace(/[\u0000-\u001F\u007F\s]/g, '');
  if (/^(https?:|mailto:|\/|#)/i.test(v)) return v;
  return null;
};

export function sanearHtml(entrada) {
  if (entrada === null || entrada === undefined) return null;
  const texto = String(entrada);

  // Quita bloques peligrosos completos antes de procesar etiquetas.
  const limpio = texto
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)[^>]*\/?>/gi, '');

  return limpio.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)|(<)/g, (todo, nombre, attrs, suelto, lt) => {
    if (suelto !== undefined) return suelto;
    if (lt !== undefined) return '&lt;';

    const tag = nombre.toLowerCase();
    if (!ETIQUETAS.has(tag)) return '';

    const cierre = todo.startsWith('</');
    if (cierre) return `</${tag}>`;

    const permitidos = new Set([...(ATRIBUTOS[tag] || []), ...ATRIBUTOS['*']]);
    const partes = [];
    const reAtr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let m;
    while ((m = reAtr.exec(attrs || '')) !== null) {
      const nombreAtr = m[1].toLowerCase();
      const valor = m[2] ?? m[3] ?? m[4] ?? '';
      if (nombreAtr.startsWith('on')) continue; // eventos (onclick, onerror…)
      if (!permitidos.has(nombreAtr)) continue;
      if ((nombreAtr === 'href' || nombreAtr === 'src')) {
        const seguro = urlSegura(valor);
        if (!seguro) continue;
        partes.push(`${nombreAtr}="${escapar(seguro)}"`);
        continue;
      }
      partes.push(`${nombreAtr}="${escapar(valor)}"`);
    }
    // Los enlaces que abren en otra pestaña deben llevar rel de seguridad.
    if (tag === 'a' && partes.some((p) => p.startsWith('target='))) {
      partes.push('rel="noopener noreferrer"');
    }
    const cierreAuto = tag === 'br' || tag === 'hr' || tag === 'img' ? ' /' : '';
    return `<${tag}${partes.length ? ` ${partes.join(' ')}` : ''}${cierreAuto}>`;
  });
}
