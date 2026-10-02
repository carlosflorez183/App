/* =============================================
   Runner de la prueba de acciones.

   Levanta Vite, abre prueba-acciones.html con un
   token real por rol, y lee el reporte que publica
   la pagina. A diferencia del smoke (que solo mira
   que un modulo pinte texto), esta prueba PULSA los
   botones y comprueba que la escritura llega al
   servidor: asi se detectan imports olvidados y
   manejadores sin conectar, que no rompen el build.

   Requiere la API levantada (docker compose up -d).

   Uso:  npm run acciones

   Variables opcionales:
     ACCIONES_BROWSER  ruta a Chrome/Edge
     ACCIONES_HEADFUL  1 para abrir una ventana visible
   ============================================= */
import { spawn, execFile } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.ACCIONES_PUERTO || 5198);
const API = process.env.ACCIONES_API || 'http://localhost:3000';
const CANDIDATOS = [
  process.env.ACCIONES_BROWSER,
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
  console.error('No se encontro Chrome ni Edge. Define ACCIONES_BROWSER con la ruta al ejecutable.');
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
  for (let i = 0; i < intentos; i += 1) {
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

/* La prueba escribe datos de verdad: se deja el ROL configurable y se avisa,
   porque al terminar conviene volver a sembrar la base. */
const ROLES = (process.env.ACCIONES_ROLES || 'profesor,talento_humano,contabilidad,admin')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

let servidor = null;
let codigo = 1;

const volcarDom = (url) =>
  new Promise((res, rej) => {
    /* Cada corrida usa un perfil limpio y desligado del Chrome del usuario:
       asi la prueba no compite con su navegador ni deja el suyo tocado. */
    const perfil = path.join(os.tmpdir(), `acciones-perfil-${process.pid}-${Date.now()}`);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${perfil}`,
      /* La prueba escribe de verdad y espera varias respuestas de la API:
         el presupuesto tiene que holgadamente por encima de los 90s que
         usa el smoke, o el navegador corta antes de publicar el reporte. */
      '--virtual-time-budget=150000',
      '--dump-dom',
      url,
    ];
    if (process.env.ACCIONES_HEADFUL === '1') args.shift();
    execFile(
      navegador,
      args,
      { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, windowsHide: true, timeout: 240000 },
      (err, stdout) => {
        rmSync(perfil, { recursive: true, force: true });
        if (err) rej(err);
        else res(stdout);
      }
    );
  });

try {
  /* Sin API no hay nada que probar: los formularios aparecen pero nunca
     confirman la escritura, y el fallo seria EngineShot. */
  if (!(await esperarServidor(`${API}/api/salud`, 6))) {
    console.error(`La API no responde en ${API}. Levantala con:  docker compose up -d`);
    process.exit(1);
  }

  if (!(await puertoLibre(PUERTO))) {
    console.error(`El puerto ${PUERTO} esta ocupado. Define ACCIONES_PUERTO con otro valor.`);
    process.exit(1);
  }

  const vite = path.join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js');
  servidor = spawn(process.execPath, [vite, '--port', String(PUERTO), '--strictPort'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });

  if (!(await esperarServidor(`http://localhost:${PUERTO}/prueba-acciones.html`))) {
    console.error('Vite no respondio a tiempo.');
    process.exit(1);
  }

  const reportes = [];

  for (const rol of ROLES) {
    const dom = await volcarDom(`http://localhost:${PUERTO}/prueba-acciones.html?rol=${rol}`);
    const m = dom.match(/<pre id="smoke-result">([\s\S]*?)<\/pre>/);
    if (!m) {
      console.error(`[${rol}] La pagina no publico el reporte (#smoke-result).`);
      reportes.push(`FALLA ${rol} :: sin reporte`);
      continue;
    }
    const reporte = decodificar(m[1]);
    reportes.push(reporte);
    console.log(reporte);
    console.log('');
  }

  const problemas = reportes.filter((r) => /^(FALLA|VACIO)/m.test(r) || !/^OK /m.test(r));
  codigo = problemas.length ? 1 : 0;

  if (codigo === 0) {
    console.log(`Acciones verificadas para: ${ROLES.join(', ')}.`);
    console.log('La prueba escribio datos reales; vuelve a sembrar con:  docker compose up --force-recreate --abort-on-container-exit seed');
  }
} catch (error) {
  console.error('Error ejecutando la prueba de acciones:', error.message);
  codigo = 1;
} finally {
  if (servidor) servidor.kill();
}

process.exit(codigo);
