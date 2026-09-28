/* =============================================
   Runner del smoke test de render.

   Levanta Vite, abre smoke.html en un navegador
   headless, lee el reporte que publica la pagina
   y devuelve codigo de salida 1 si algo falla.

   Uso:  npm run smoke

   Variables opcionales:
     SMOKE_BROWSER  ruta a Chrome/Edge (si no, se busca solo)
     SMOKE_HEADFUL  1 para abrir una ventana visible y no cerrarla
   ============================================= */
import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 5199;
const CANDIDATOS = [
  process.env.SMOKE_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const navegador = CANDIDATOS.find((p) => existsSync(p));
if (!navegador) {
  console.error('No se encontro Chrome ni Edge. Define SMOKE_BROWSER con la ruta al ejecutable.');
  process.exit(1);
}

const puertoLibre = (puerto) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(puerto);
  });

const esperarServidor = async (url, intentos = 40) => {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch {
      /* aun no responde */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const decodificar = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const ROLES = (process.env.SMOKE_ROLES || 'estudiante,admisiones,profesor')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

let servidor = null;
let codigo = 1;

const volcarDom = (url) =>
  new Promise((res, rej) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--virtual-time-budget=20000',
      '--dump-dom',
      url,
    ];
    if (process.env.SMOKE_HEADFUL === '1') args.shift();
    execFile(
      navegador,
      args,
      { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (err, stdout) => (err ? rej(err) : res(stdout))
    );
  });

try {
  if (!(await puertoLibre(PUERTO))) {
    console.error(`El puerto ${PUERTO} esta ocupado. Cierra el proceso que lo usa o cambia PUERTO en scripts/smoke.mjs.`);
    process.exit(1);
  }

  const vite = path.join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js');
  servidor = spawn(process.execPath, [vite, '--port', String(PUERTO), '--strictPort'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });

  if (!(await esperarServidor(`http://localhost:${PUERTO}/smoke.html`))) {
    console.error('Vite no respondio a tiempo.');
    process.exit(1);
  }

  const reportes = [];

  for (const rol of ROLES) {
    const dom = await volcarDom(`http://localhost:${PUERTO}/smoke.html?rol=${rol}`);
    const m = dom.match(/<pre id="smoke-result">([\s\S]*?)<\/pre>/);
    if (!m) {
      console.error(`[${rol}] La pagina no publico el reporte (#smoke-result).`);
      console.error('Revisa que src/smoke.jsx compile y que no haya errores en la consola.');
      reportes.push(`FALLA ${rol} :: sin reporte`);
      continue;
    }
    const reporte = decodificar(m[1]);
    reportes.push(reporte);
    console.log(reporte);
    console.log('');
  }

  const problemas = reportes.filter((r) => !/^OK /m.test(r) || /^(FALLA|VACIO)/m.test(r));
  codigo = problemas.length ? 1 : 0;
} catch (error) {
  console.error('Error ejecutando el smoke test:', error.message);
  codigo = 1;
} finally {
  if (servidor) servidor.kill();
}

process.exit(codigo);
