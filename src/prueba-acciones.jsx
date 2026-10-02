/* =============================================
   Prueba de ACCIONES de los módulos (temporal).

   No basta con comprobar que un módulo pinta
   datos: hay que pulsar sus botones y verificar
   que la llamada llega al servidor. Esta página
   monta cada módulo con un token real y ejecuta
   un guion de clics, anotando el resultado.
   ============================================= */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Docente from './pages/Docente';
import Curso from './pages/Curso';
import Dashboard from './pages/Dashboard';
import TalentoHumano from './pages/TalentoHumano';
import Contabilidad from './pages/Contabilidad';
import Admin from './pages/Admin';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const lineas = [];
const ok = (n, d = '') => lineas.push(`OK ${n}${d ? ` :: ${d}` : ''}`);
const falla = (n, d) => lineas.push(`FALLA ${n} :: ${d}`);

/* Cualquier ReferenceError (un import olvidado, un nombre mal escrito) sale
   por consola y no se ve en la pantalla. Aquí se atrapa. */
const errores = [];
window.addEventListener('error', (e) => errores.push(String(e.message)));
const consola = console.error;
console.error = (...a) => { errores.push(a.map(String).join(' ')); consola(...a); };

const texto = () => document.body.innerText;
const porTexto = (t, etiqueta = 'button') =>
  [...document.querySelectorAll(etiqueta)].find((b) => (b.innerText || '').includes(t));

/* React rastrea el valor de cada input controlado y descarta el evento si no
   cambia segun su propio setter. Por eso hay que invocar el setter nativo del
   elemento correcto: el de HTMLInputElement para un input, el de
   HTMLSelectElement para un select, etc. */
const SETTERS = {
  INPUT: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set,
  TEXTAREA: Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set,
  SELECT: Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set,
};

const escribir = (el, valor) => {
  SETTERS[el.tagName].call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/* Rellena un formulario como lo haria una persona: cada campo con un valor
   valido segun su tipo. Asi una falla solo puede deberse al modulo y no a que
   el guion dejo un campo obligatorio vacio (lo bloquearia el navegador). */
function rellenar(form) {
  let n = 0;
  form.querySelectorAll('input').forEach((el) => {
    if (el.type === 'radio' || el.type === 'checkbox' || el.type === 'submit' || el.type === 'button') return;
    n += 1;
    if (el.type === 'date') {
      el.focus();
      escribir(el, '2026-03-11');
    } else if (el.type === 'datetime-local') {
      el.focus();
      escribir(el, '2026-03-11T10:00');
    } else if (el.type === 'number') {
      escribir(el, '10');
    } else {
      escribir(el, `Dato de prueba ${n}`);
    }
  });
  form.querySelectorAll('select').forEach((s) => {
    const opcion = [...s.options].find((o) => o.value !== '');
    if (opcion) {
      s.focus();
      escribir(s, opcion.value);
    }
  });
  form.querySelectorAll('textarea').forEach((t) => escribir(t, 'Contenido de prueba automatica'));
  n += 1;
  return n;
}

/* Al enviar un <form> se ignora la validacion nativa del navegador, asi que
   aqui se dispara el onSubmit de React directamente, como si el usuario
   hubiera pulsado el boton. */
async function enviar(form) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await dormir(1600);
}

/* Si el modulo mostro un error, se reporta: asi se distingue un fallo real
   de un guion que no logro disparar la accion. */
function errorVisible() {
  const m = texto().match(/No se (?:pudo|guard|cre|abri|elimin|public|registr|concili)[^\n]{0,120}/);
  return m ? m[0] : '';
}

async function esperarTexto(t, ms = 9000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (texto().includes(t)) return true;
    await dormir(250);
  }
  return false;
}

async function docente() {
  const raiz = document.getElementById('caso-docente');
  createRoot(raiz).render(
    <AuthProvider>
    <MemoryRouter initialEntries={['/docente']}>
      <Docente />
    </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3000);

  /* --- El camino que reporto el usuario: desde "Mis cursos" se pulsa el
     boton de un curso y debe abrir ESA pestaña, no volver a la primera.
     Si el selector de curso borra la query, se regresa a "Mis cursos" y
     el docente ve una pantalla sin ningun boton. --- */
  /* Ojo: en el encabezado de ModuleLayout tambien hay una pestaña llamada
     "Asistencia". Lo que nos interesa es el botón de la fila del curso,
     dentro de la tabla. */
  const atajo = [...document.querySelectorAll('#caso-docente table button')].find((b) => b.innerText.includes('Asistencia'));
  if (new URLSearchParams(location.search).has('sin_atajo')) {
    ok('Docente:atajo', 'omitido por ?sin_atajo');
  } else if (!atajo) {
    const botones = [...document.querySelectorAll('#caso-docente button')].map((b) => b.innerText.trim()).filter(Boolean);
    falla('Docente:atajo', `no hay botón en la tabla. Botones visibles: ${JSON.stringify(botones.slice(0, 14))}`);
  } else if (atajo) {
    atajo.click();
    await dormir(1500);
    if (await esperarTexto('Abrir sesión', 6000)) {
      ok('Docente:atajo', 'el botón del curso abre la asistencia de ese curso');
    } else {
      falla('Docente:atajo', `no llegó a la pestaña de asistencia. URL=${location.search} Pantalla: ${texto().slice(0, 300)}`);
    }
  }

  // --- Asistencia: abrir sesión y marcar ---
  if (!(await esperarTexto('Abrir sesión'))) {
    falla('Docente:asistencia', 'no se pintó el formulario al abrir con ?curso=1');
  } else {
    ok('Docente:asistencia', 'el formulario aparece con enlace directo');
    const form = document.querySelector('form');
    escribir(form.querySelector('input[type=date]'), '2026-03-11');
    escribir(form.querySelector('input:not([type=date])'), 'Prueba de asistencia automatica');
    porTexto('Abrir y marcar').click();
    if (await esperarTexto('Guardar asistencia')) {
      ok('Docente:abrir-sesion', 'la sesión se abrió y habilitó el marcado');
      const fila = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === 'Ausente');
      if (fila.length) {
        fila[0].click();
        await dormir(400);
        porTexto('Guardar asistencia').click();
        if (await esperarTexto('Asistencia guardada', 6000)) ok('Docente:guardar-asistencia', 'el estado llegó al servidor');
        else falla('Docente:guardar-asistencia', `sin confirmación. Pantalla: ${texto().slice(-160)}`);
      } else {
        falla('Docente:marcar', 'no hay botones de estado por estudiante');
      }
    } else {
      falla('Docente:abrir-sesion', `no apareció el botón de guardar. Pantalla: ${texto().slice(-200)}`);
    }
  }

  // --- Actividades: crear una ---
  location.hash = '';
  const raiz2 = document.getElementById('caso-docente-act');
  createRoot(raiz2).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/docente?tab=actividades&curso=1']}>
        <Docente />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3000);
  if (!(await esperarTexto('Nueva actividad'))) {
    falla('Docente:actividades', 'no aparece el formulario de actividad');
  } else {
    ok('Docente:actividades', 'el formulario aparece con enlace directo');
    const form = [...raiz2.querySelectorAll('form')].find((f) => f.innerText.includes('Nueva actividad'));
    rellenar(form);
    await enviar(form);
    if (await esperarTexto('Actividad creada', 6000)) ok('Docente:crear-actividad', 'se creó contra la API');
    else falla('Docente:crear-actividad', `sin confirmación${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
  }

  // --- Parcial con preguntas ---
  const formP = [...raiz2.querySelectorAll('form')].find((f) => f.innerText.includes('Nuevo parcial'));
  if (!formP) {
    falla('Docente:parcial', 'no aparece el formulario de parcial');
  } else {
    rellenar(formP);
    await enviar(formP);
    if (await esperarTexto('Parcial creado', 6000)) ok('Docente:crear-parcial', 'se creó con sus preguntas');
    else falla('Docente:crear-parcial', `sin confirmación${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
  }

  // --- Foro ---
  const raiz3 = document.getElementById('caso-docente-foro');
  createRoot(raiz3).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/docente?tab=foro&curso=1']}>
        <Docente />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3000);
  if (!(await esperarTexto('Publicar mensaje'))) {
    falla('Docente:foro', 'no aparece el formulario de publicación');
  } else {
    ok('Docente:foro', 'el formulario aparece con enlace directo');
    const form = document.querySelector('#caso-docente-foro form');
    escribir(form.querySelector('input'), 'Tema de prueba');
    escribir(form.querySelector('textarea'), 'Mensaje de prueba automatica');
    await enviar(form);
    if (await esperarTexto('Mensaje publicado', 6000)) ok('Docente:publicar-foro', 'el mensaje llegó al servidor');
    else falla('Docente:publicar-foro', `sin confirmación. Pantalla: ${texto().slice(-160)}`);
  }

  /* --- Registro de notas por estudiante: una fila por alumno del curso ---
     Esta pestaña vivía de las asignaturas del estudiante de ejemplo, así que
     no había ni un solo alumno que calificar. Ahora las filas salen de la
     matriculación real del curso. */
  /* Montaje SIN ?curso=, que es como se llega desde el menú. El listado se
     pedía solo cuando ese parámetro venía en la URL, así que en esta ruta la
     tabla salía vacía con el aviso de "nadie está matriculado" aunque el
     curso tuviera alumnos. Cada montaje necesita su propio contenedor. */
  const raizSinCurso = document.createElement('div');
  raizSinCurso.id = 'caso-docente-notas-sin-curso';
  document.body.appendChild(raizSinCurso);
  createRoot(raizSinCurso).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/docente?tab=notas']}>
        <Docente />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3500);
  if (raizSinCurso.innerText.includes('Nadie está matriculado')) {
    falla('Docente:registro-sin-curso', `entrando sin ?curso= dice que no hay matriculados. Pantalla: ${raizSinCurso.innerText.slice(-220)}`);
  } else if (![...raizSinCurso.querySelectorAll('table')].some((t) => t.innerText.includes('Corte 1'))) {
    falla('Docente:registro-sin-curso', `entrando sin ?curso= no muestra la tabla. Pantalla: ${raizSinCurso.innerText.slice(-220)}`);
  } else {
    ok('Docente:registro-sin-curso', 'el registro carga los alumnos aunque la URL no traiga ?curso=');
  }

  const raizNotas = document.createElement('div');
  raizNotas.id = 'caso-docente-notas';
  document.body.appendChild(raizNotas);
  createRoot(raizNotas).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/docente?tab=notas&curso=1']}>
        <Docente />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3200);
  const tablaAlumnos = [...raizNotas.querySelectorAll('table')]
    .find((t) => t.innerText.includes('Estudiante') && t.innerText.includes('Corte 1'));
  if (!tablaAlumnos) {
    falla('Docente:registro', `no aparece la tabla de alumnos. Pantalla: ${texto().slice(-260)}`);
    return;
  }
  const tokenNotas = localStorage.getItem('uni_token');
  const filasAlumno = [...tablaAlumnos.querySelectorAll('tbody tr')];
  const rosterNotas = await (await fetch('/api/cursos/1/estudiantes', {
    headers: { authorization: `Bearer ${tokenNotas}` },
  })).json().catch(() => ({}));
  const matriculados = rosterNotas.estudiantes || [];
  /* La fila debe traer el nombre de un alumno REAL del curso: es lo que
     diferencia el registro nuevo de la tabla de asignaturas que se quitó. */
  const conNombre = filasAlumno.filter((f) => matriculados.some((e) => f.innerText.includes(e.nombre)));
  if (filasAlumno.length > 0 && conNombre.length === filasAlumno.length) {
    ok('Docente:registro', `${filasAlumno.length} alumno(s) matriculado(s) listados en el registro`);

  /* El registro tiene que explicar de dónde sale cada corte, con la misma
     cuenta que hace el servidor: si no, la docente ve un número que nadie sabe
     de dónde salió. El texto va dentro de la fila, así que se busca en la fila. */
  const primeraFila = filasAlumno[0];
  const detalle = matriculados.find((e) => primeraFila.innerText.includes(e.nombre));
  const corte2Api = detalle?.desdeEntregas?.['2'];
  const esperaDetalle = corte2Api && corte2Api.actividades
    ? new RegExp(`${corte2Api.calificadas}\\s+de\\s+${corte2Api.actividades}\\s+actividad`)
    : null;
  const mencionaFalta = corte2Api && corte2Api.sinEntregar > 0 ? /sin entregar = 0/.test(primeraFila.innerText) : true;
  if (detalle && esperaDetalle && esperaDetalle.test(primeraFila.innerText) && mencionaFalta) {
    ok('Docente:registro-explica-corte', `la fila dice de dónde sale el corte 2 de ${detalle.nombre}: ${corte2Api.calificadas} de ${corte2Api.actividades} actividades${corte2Api.sinEntregar ? `, ${corte2Api.sinEntregar} sin entregar = 0` : ''}`);
  } else {
    falla('Docente:registro-explica-corte', `la fila de ${detalle?.nombre} no explica el corte 2 (api=${JSON.stringify(corte2Api)}). Pantalla: ${primeraFila.innerText.replace(/\s+/g, ' ').slice(0, 240)}`);
  }
  } else {
    falla('Docente:registro', `solo ${conNombre.length} de ${filasAlumno.length} filas coinciden con un alumno matriculado`);
  }
  const camposCorte = filasAlumno[0]?.querySelectorAll('input[aria-label^="Nota corte"]') || [];
  const corte3 = camposCorte[2];
  if (camposCorte.length !== 3) {
    falla('Docente:cortes', `la fila tiene ${camposCorte.length} cortes editables y se esperaban 3`);
    return;
  }
  ok('Docente:cortes', 'la fila tiene los cortes 1, 2 y 3');
  /* Se guarda la nota que tenía para dejarla como estaba al terminar. */
  const nota3Original = corte3.value;
  const nota1Original = camposCorte[0].value;
  /* El guion escribe la coma porque así se teclea una nota en Colombia. El
     campo es de texto justamente por eso: con type="number" el navegador
     borra la coma y al docente le desaparecía lo que acababa de escribir. */
  escribir(corte3, '3,7');
  /* React escucha onBlur como `focusout`: disparar `blur` a mano no llega al
     manejador y la nota nunca se guardaría, así que el guion no probaría nada. */
  corte3.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  await dormir(2200);
  /* Se confirma contra la API: el mensaje en pantalla puede mentir. */
  const rosterNotas2 = await (await fetch('/api/cursos/1/estudiantes', {
    headers: { authorization: `Bearer ${tokenNotas}` },
  })).json().catch(() => ({}));
  const alumnoConNota = (rosterNotas2.estudiantes || []).find((e) => e.nota3 === 3.7);
  if (alumnoConNota) {
    ok('Docente:guardar-corte', `la nota del corte 3 de ${alumnoConNota.nombre} quedó en el servidor`);
    /* Y con la misma nota, la definitiva de los tres cortes sale sola: es el
       motivo por el que el docente se queja cuando no le guarda. */
    const conDefinitiva = (rosterNotas2.estudiantes || [])
      .find((e) => e.nombre === alumnoConNota.nombre);
    if (conDefinitiva && conDefinitiva.nota1 !== null && conDefinitiva.nota2 !== null && typeof conDefinitiva.definitiva === 'number') {
      ok('Docente:definitiva', `con los tres cortes la definitiva de ${conDefinitiva.nombre} quedó en ${conDefinitiva.definitiva}`);
    } else {
      falla('Docente:definitiva', `con los tres cortes cargados la definitiva sigue vacía${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
    }
  } else {
    falla('Docente:guardar-corte', `la API no devolvió nota3=3.7 para la nota escrita con coma${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
  }

  /* Un campo con un espacio no es un cero: es una nota sin poner. */
  const corte3Vivo = filasAlumno[0].querySelectorAll('input[aria-label^="Nota corte"]')[2];
  escribir(corte3Vivo, ' ');
  corte3Vivo.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  await dormir(1800);
  const rosterNotas3 = await (await fetch('/api/cursos/1/estudiantes', {
    headers: { authorization: `Bearer ${tokenNotas}` },
  })).json().catch(() => ({}));
  const filaSinCero = (rosterNotas3.estudiantes || []).find((e) => e.nombre === (alumnoConNota?.nombre || ''));
  if (filaSinCero && filaSinCero.nota3 === null) {
    ok('Docente:nota-vacia', 'un campo en blanco no le pone un cero al alumno');
  } else {
    falla('Docente:nota-vacia', `un campo en blanco dejó nota3=${filaSinCero ? JSON.stringify(filaSinCero.nota3) : '?'} en vez de vacía`);
  }

  /* Guardar no debe esconder el campo: el docente califica seguido, corte por
     corte, y si el input se remonta pierde el foco al tabular. */
  const corte1Vivo = filasAlumno[0].querySelectorAll('input[aria-label^="Nota corte"]')[0];
  escribir(corte1Vivo, '3,4');
  corte1Vivo.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  await dormir(1800);
  const corte1SigueVivo = filasAlumno[0].querySelectorAll('input[aria-label^="Nota corte"]')[0];
  if (corte1SigueVivo === corte1Vivo && corte1Vivo.value === '3,4') {
    ok('Docente:nota-no-remonta', 'tras guardar, el campo sigue en su sitio con lo que se escribió');
  } else {
    falla('Docente:nota-no-remonta', 'guardar la nota rehizo el campo y el docente perdería el foco al tabular');
  }

  /* Se devuelve el valor original para no dejar el dato de ejemplo
     cambiado por una corrida de pruebas, y se sueltan las marcas de "escrito a
     mano": esta prueba escribe cortes a proposito, y si quedaran bloqueados las
     pruebas siguientes no verian como se mueve un corte al calificar un
     trabajo. */
  const limpiar = { 'content-type': 'application/json', authorization: `Bearer ${tokenNotas}` };
  const idLimpieza = (alumnoConNota?.estudianteId || (matriculados[0] || {}).estudianteId);
  await fetch(`/api/cursos/1/notas/${idLimpieza}`, {
    method: 'PATCH', headers: limpiar,
    body: JSON.stringify({ nota1: nota1Original === '' ? null : Number(String(nota1Original).replace(',', '.')) }),
  }).catch(() => {});
  await fetch(`/api/cursos/1/notas/${idLimpieza}`, {
    method: 'PATCH', headers: limpiar,
    body: JSON.stringify({ nota3: nota3Original === '' ? null : Number(String(nota3Original).replace(',', '.')) }),
  }).catch(() => {});
  for (const corte of [1, 2, 3]) {
    await fetch(`/api/cursos/1/notas/${idLimpieza}`, {
      method: 'PATCH', headers: limpiar, body: JSON.stringify({ recalcular: corte }),
    }).catch(() => {});
  }
}

/* Lo que la docente hizo en una pestaña tiene que verse en la cuenta del
   alumno, y un 403 tiene que explicarse en español: la usuaria cambió de
   cuenta en otra pestaña para revisar y la nota salía "no se guardó". */
async function notaLlegaAlAlumno() {
  const docente = await (await fetch('/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'PROF001', password: '123456' }),
  })).json();
  const alumno = await (await fetch('/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'EST001', password: '123456' }),
  })).json();
  const hd = { 'content-type': 'application/json', authorization: `Bearer ${docente.token}` };
  const ha = { authorization: `Bearer ${alumno.token}` };

  /* La definitiva se pesa 30/30/40, no es el promedio plano. Aqui los cortes se
     ponen a proposito para que las dos cuentas den numeros distintos:
     5, 0 y 0 -> ponderada 1,5 (0.3*5) | promedio plano 1,67.
     Si la plataforma hiciera la media simple, la prueba no distinguiria nada. */
  /* Lo que había antes se lee del roster: es la única lectura que existe de las
     notas de un alumno, y sin esto la prueba dejaría el curso con 5/0/0. */
  const filaOriginal = ((await (await fetch('/api/cursos/1/estudiantes', { headers: hd })).json().catch(() => ({}))).estudiantes || [])
    .find((e) => e.estudianteId === '20231001') || {};
  const original = { nota1: filaOriginal.nota1, nota2: filaOriginal.nota2, nota3: filaOriginal.nota3 };
  for (const cuerpo of [{ nota1: '5' }, { nota2: 0 }, { nota3: 0 }]) {
    await fetch('/api/cursos/1/notas/20231001', { method: 'PATCH', headers: hd, body: JSON.stringify(cuerpo) }).catch(() => {});
  }
  const notasAlumno = await (await fetch('/api/notas', { headers: ha })).json().catch(() => ({}));
  const materia = (notasAlumno.notas || notasAlumno || []).find((n) => n.codigo === 'IS-602');
  const mediaPlana = Math.round(((5 + 0 + 0) / 3) * 100) / 100;
  const ponderada = 1.5;
  if (materia && materia.nota1 === 5 && materia.nota2 === 0 && materia.nota3 === 0 && materia.definitiva === ponderada) {
    ok('Docente:definitiva-ponderada', `5/0/0 dio definitiva ${materia.definitiva} con el peso 30/30/40, no ${mediaPlana} (promedio plano), y el alumno la ve en "${materia.nombre}"`);
  } else {
    falla('Docente:definitiva-ponderada', `con 5/0/0 la definitiva deberia ser ${ponderada} y no ${mediaPlana}: el alumno ve ${JSON.stringify(materia)}`);
  }

  /* La definitiva solo existe con los tres cortes: con dos de tres no hay nota
     final, y el registro tiene que dejarlo vacío en vez de mostrar un numero
     viejo que ya no sale de los cortes que hay. */
  await fetch('/api/cursos/1/notas/20231001', { method: 'PATCH', headers: hd, body: JSON.stringify({ nota3: null }) }).catch(() => {});
  const rosterSinTercero = (await (await fetch('/api/cursos/1/estudiantes', { headers: hd })).json().catch(() => ({}))).estudiantes || [];
  const filaSinTercero = rosterSinTercero.find((e) => e.estudianteId === '20231001');
  if (filaSinTercero && filaSinTercero.nota3 === null && filaSinTercero.definitiva === null) {
    ok('Docente:definitiva-requiere-tres', 'con el corte 3 vacío la definitiva queda vacía, no con un número viejo');
  } else {
    falla('Docente:definitiva-requiere-tres', `con el corte 3 vacío el registro dio nota3=${filaSinTercero?.nota3} definitiva=${filaSinTercero?.definitiva}`);
  }

  /* Con el token del estudiante la escritura tiene que negarse, pero con un
     mensaje que se pueda entender y no con la palabra "Forbidden". */
  const r = await fetch('/api/cursos/1/notas/20231001', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${alumno.token}` },
    body: JSON.stringify({ nota1: 1 }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  const texto = String(cuerpo.message || cuerpo.error || '');
  if (r.status === 403 && /[a-zá-ú]/i.test(texto) && !/forbidden|unauthorized/i.test(texto)) {
    ok('Docente:error-en-espanol', `un rechazo llega en español: "${texto}"`);
  } else {
    falla('Docente:error-en-espanol', `el rechazo llegó como ${r.status} ${JSON.stringify(cuerpo)}`);
  }

  /* Y el alumno sí puede ver las fechas de su asistencia en el curso. */
  const asis = await fetch('/api/cursos/1/asistencias', { headers: ha });
  const sesiones = await asis.json().catch(() => []);
  const conFecha = (Array.isArray(sesiones) ? sesiones : []).filter((s) => s.fecha);
  const soloSuyo = conFecha.every((s) => s.registros.length <= 1);
  if (asis.status === 200 && conFecha.length > 0 && soloSuyo) {
    ok('Curso:asistencia-estudiante', `el alumno ve ${conFecha.length} fecha(s) y solo su propio registro`);
  } else {
    falla('Curso:asistencia-estudiante', `asistencia del alumno -> ${asis.status} ${JSON.stringify(sesiones).slice(0, 120)}`);
  }

  /* Se devuelve el valor que tenia y se sueltan las marcas de "escrito a
     mano": esta prueba escribe tres cortes a proposito, y si se dejaran
     marcados las pruebas siguientes encontrarian cortes bloqueados que el
     docente no escribio. */
  if (original.nota1 != null || original.nota2 != null || original.nota3 != null) {
    await fetch('/api/cursos/1/notas/20231001', {
      method: 'PATCH', headers: hd,
      body: JSON.stringify({
        nota1: original.nota1, nota2: original.nota2, nota3: original.nota3,
      }),
    }).catch(() => {});
  }
  for (const corte of [1, 2, 3]) {
    await fetch('/api/cursos/1/notas/20231001', {
      method: 'PATCH', headers: hd, body: JSON.stringify({ recalcular: corte }),
    }).catch(() => {});
  }
}

/* El corte es el promedio de TODAS las actividades del corte, y lo que el alumno
   no entregó vale cero. Aquí se rehace esa cuenta con datos sueltos —qué
   actividades hay y qué tiene entregadas cada alumno— en vez de copiar el número
   que ya calculó el servidor: si las dos cuentas coinciden, el servidor está
   aplicando la regla y no otra cosa (por ejemplo, promediar solo lo entregado). */
async function corteEsperado(idEstudiante, corte, auth) {
  const actividades = (await (await fetch('/api/cursos/1/entregas', { headers: auth })).json().catch(() => [])) || [];
  const delCorte = actividades.filter((a) => a.corte === corte);
  let suma = 0;
  let calificadas = 0;
  let sinEntregar = 0;
  let sinCalificar = 0;
  for (const a of delCorte) {
    /* Lo que aún no vencía no se le puede contar como falta al alumno. */
    if (a.fechaEntrega && new Date(a.fechaEntrega).getTime() > Date.now()) continue;
    const entregas = (await (await fetch(`/api/cursos/1/actividades/${a.id}/entregas`, { headers: auth })).json().catch(() => [])) || [];
    const e = entregas.find((x) => x.estudianteId === idEstudiante);
    if (!e) { sinEntregar += 1; continue; }
    if (e.nota === null || e.nota === undefined || !a.puntos) { sinCalificar += 1; continue; }
    suma += (e.nota / a.puntos) * 5;
    calificadas += 1;
  }
  const total = calificadas + sinEntregar;
  return {
    valor: total ? Math.round((suma / total) * 100) / 100 : null,
    calificadas,
    sinEntregar,
    sinCalificar,
    total,
    actividades: delCorte.length,
  };
}

/* El corte sale de las entregas, pero lo que el docente escribe a mano manda:
   si no, calificar un taller le cambia la nota que él acaba de poner. */
async function corteManualManda() {
  const docente = await (await fetch('/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'PROF001', password: '123456' }),
  })).json();
  const hd = { 'content-type': 'application/json', authorization: `Bearer ${docente.token}` };
  const hdLectura = { authorization: `Bearer ${docente.token}` };
  const roster = async () => {
    const r = await (await fetch('/api/cursos/1/estudiantes', { headers: hdLectura })).json().catch(() => ({}));
    return (r.estudiantes || []).find((e) => e.estudianteId === '20231001') || {};
  };
  const resumen = (await (await fetch('/api/cursos/1/entregas', { headers: hdLectura })).json().catch(() => [])) || [];
  const taller = resumen.find((a) => a.tipo === 'taller' && a.entregadas > 0);
  if (!taller) {
    falla('Docente:corte-manual', 'no hay una actividad con entregas para probar el corte');
    return;
  }
  const corte = taller.corte;
  const original = await roster();
  const notaEntregaAntes = (await (await fetch(`/api/cursos/1/actividades/${taller.id}/entregas`, { headers: hdLectura })).json()
    .catch(() => [])) || [];
  const entrega = notaEntregaAntes.find((e) => e.estudianteId === '20231001');
  const puntos = taller.puntos;

  /* 1) la docente escribe el corte a mano */
  await fetch('/api/cursos/1/notas/20231001', {
    method: 'PATCH', headers: hd, body: JSON.stringify({ [`nota${corte}`]: '4,9' }),
  }).catch(() => {});

  /* 2) califica la entrega al máximo: la entrega se guarda, el corte no se toca */
  const resp = await (await fetch(`/api/cursos/1/actividades/${taller.id}/entregas/20231001`, {
    method: 'PATCH', headers: hd, body: JSON.stringify({ nota: puntos }),
  })).json().catch(() => ({}));
  const tras = await roster();
  const entregaGuardada = (await (await fetch(`/api/cursos/1/actividades/${taller.id}/entregas`, { headers: hdLectura })).json()
    .catch(() => [])) || [];
  const notaDeLaEntrega = entregaGuardada.find((e) => e.estudianteId === '20231001')?.nota;
  if (resp?.corte?.motivo === 'manual' && tras[`nota${corte}`] === 4.9 && notaDeLaEntrega === puntos) {
    ok('Docente:corte-manual', `calificar ${puntos}/${puntos} guardó la entrega y dejó el corte ${corte} en 4,9 (lo que escribió la docente)`);
  } else {
    falla('Docente:corte-manual', `corte ${corte}=${tras[`nota${corte}`]} motivo=${resp?.corte?.motivo || '-'} entrega=${notaDeLaEntrega}`);
  }

  /* 3) suelta la nota a mano: el corte vuelve a salir de las entregas */
  await fetch('/api/cursos/1/notas/20231001', {
    method: 'PATCH', headers: hd, body: JSON.stringify({ recalcular: corte }),
  }).catch(() => {});
  const liberado = await roster();
  /* Lo esperado sale de la regla, no de "la nota maxima es 5": el corte promedia
     las tres actividades del corte 2, no solo el taller que se acaba de calificar. */
  const cuenta = await corteEsperado('20231001', corte, hdLectura);
  if (!liberado.cortesManuales && liberado[`nota${corte}`] === cuenta.valor) {
    ok('Docente:recalcular-corte', `«recalcular» devolvió el corte ${corte} a ${cuenta.valor}, el promedio de ${cuenta.calificadas} de ${cuenta.actividades} actividades (${cuenta.sinEntregar} sin entregar)`);
  } else {
    falla('Docente:recalcular-corte', `el corte ${corte} quedó en ${liberado[`nota${corte}`]} cuando la cuenta da ${cuenta.valor}, con manual="${liberado.cortesManuales}"`);
  }

  /* Se deja la base como estaba: la nota original de la entrega y el corte. */
  if (entrega?.nota != null) {
    await fetch(`/api/cursos/1/actividades/${taller.id}/entregas/20231001`, {
      method: 'PATCH', headers: hd, body: JSON.stringify({ nota: entrega.nota, comentario: entrega.comentario || null }),
    }).catch(() => {});
  }
  await fetch('/api/cursos/1/notas/20231001', {
    method: 'PATCH', headers: hd, body: JSON.stringify({ recalcular: corte }),
  }).catch(() => {});
  const restaurado = await roster();
  if (original[`nota${corte}`] == null || restaurado[`nota${corte}`] === original[`nota${corte}`]) {
    ok('Docente:base-intacta', `el corte ${corte} volvió a su valor de prueba (${restaurado[`nota${corte}`]})`);
  } else {
    falla('Docente:base-intacta', `el corte ${corte} quedó en ${restaurado[`nota${corte}`]} y antes valía ${original[`nota${corte}`]}`);
  }

  /* Y el alumno ve SU nota en cada actividad, no la nota única del curso. */
  const alumno = await (await fetch('/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'EST001', password: '123456' }),
  })).json();
  const mis = await (await fetch('/api/cursos/1/mis-notas', {
    headers: { authorization: `Bearer ${alumno.token}` },
  })).json().catch(() => null);
  const suyo = (mis?.entregas || []).find((e) => e.actividadId === taller.id);
  if (suyo && suyo.nota === (entrega?.nota ?? null) && mis?.miNota) {
    ok('Curso:nota-por-actividad', `el alumno ve ${suyo.nota}/${suyo.puntos} en "${suyo.titulo}" y su corte ${corte}=${mis.miNota[`nota${corte}`]}`);
  } else {
    falla('Curso:nota-por-actividad', `el alumno no ve su nota: ${JSON.stringify(suyo)}`);
  }
}

/* La falla que reportó la docente: en un corte de tres actividades, entregado y
   calificado una sola, el corte salía 5. Lo que no se entrega tiene que contar
   cero, así que ese caso da 1,67 y no 5.

   No hace falta tocar la base: el curso 2 tiene actividades en las que nadie
   entregó, y el mismo alumno matriculado en el 1. Con un solo corte y una sola
   actividad sin entregar, el corte tiene que ser 0 (no "sin nota"), porque la
   falta es del alumno y vale cero. */
async function loQueNoSeEntregaValeCero() {
  const admin = await (await fetch('/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'ADMIN', password: 'admin123' }),
  })).json().catch(() => ({}));
  const hd = { authorization: `Bearer ${admin.token}` };
  const roster = (await (await fetch('/api/cursos/2/estudiantes', { headers: hd })).json().catch(() => ({}))).estudiantes || [];
  const conFalta = roster.filter((e) => Object.values(e.desdeEntregas || {}).some((c) => c?.sinEntregar > 0));
  if (!conFalta.length) {
    falla('Docente:sin-entregar-cero', 'el curso 2 ya no tiene actividades sin entregar: el ejemplo del seed cambió y esta prueba necesita ese caso');
    return;
  }
  const fila = conFalta[0];
  const faltantes = Object.entries(fila.desdeEntregas).filter(([, c]) => c.sinEntregar > 0);
  const [corte, detalle] = faltantes[0];
  /* 0 entregadas de 1 actividad y esa actividad sin entregar -> el corte es 0.
     Lo importante es que NO sea null: null significaría "el docente todavía no
     tiene el dato", que es justo lo que la docente saw. */
  const todosCero = faltantes.every(([, c]) => c.valor === 0);
  const todosCuentan = faltantes.every(([, c]) => c.total === c.actividades && c.calificadas === 0);
  if (todosCero && todosCuentan && fila[`nota${corte}`] === 0) {
    ok('Docente:sin-entregar-cero', `${fila.nombre} no entregó ${detalle.actividades} actividad(es) del corte ${corte} y el corte quedó en 0, no en blanco ni en 5`);
  } else {
    falla('Docente:sin-entregar-cero', `cortes sin entregar=${JSON.stringify(faltantes.map(([k, v]) => [k, v.valor, v.total, v.actividades]))} nota${corte}=${fila[`nota${corte}`]}`);
  }
}

/* ============================================================
   Página del CURSO (/curso/1): lo mismo que el módulo Docente,
   pero entrando por la URL que usa el usuario.
   ============================================================ */
async function paginaCurso() {
  /* Cada montaje necesita un contenedor nuevo: createRoot no admite que se
     le pase dos veces el mismo nodo, y el guion cambia de pestaña varias
     veces. */
  let nMontaje = 0;
  const raizDe = () => {
    const previo = document.getElementById('caso-curso');
    if (previo) previo.remove();
    const nuevo = document.createElement('div');
    nuevo.id = `caso-curso-${(nMontaje += 1)}`;
    document.body.appendChild(nuevo);
    return nuevo;
  };

  /* `tab` puede traer mas parametros: se pasa tal cual a la URL, para poder
     entrar directo a una actividad o a un hilo como lo haria un enlace. */
  const montar = async (tab) => {
    const raiz = raizDe();
    createRoot(raiz).render(
      <AuthProvider>
        <MemoryRouter initialEntries={[`/curso/1?tab=${tab}`]}>
          <Curso />
        </MemoryRouter>
      </AuthProvider>
    );
    /* Se espera a que la pagina llegue desde la API en vez de dormir un
       tiempo fijo: en una corrida lenta el guion se adelantaba y leia la
       pantalla de la pestaña anterior. */
    const limite = Date.now() + 12000;
    while (Date.now() < limite) {
      if (!/No se pudo cargar/.test(raiz.innerText) && raiz.querySelector('table, form, .card')) break;
      await dormir(250);
    }
    await dormir(1200);
    return raiz;
  };

  /* --- Notas: la lista de actividades y la calificación en el sitio --- */
  /* Antes esta pestaña tenía UN número por actividad, el mismo para toda la
     clase, y la nota de un trabajo no llegaba a ningún corte. Ahora lista las
     actividades con sus entregas y al abrir una se califica alumno por alumno,
     en la misma pantalla. */
  let raiz = await montar('notas');
  const tokenDoc = localStorage.getItem('uni_token');
  /* Token del estudiante: hay acciones que solo se pueden comprobar mirando lo
     que ve el ALUMNO (por ejemplo, el material que adjunto el docente). Se pide
     su propia sesion sin cerrar la del docente, que es la que se esta probando. */
  const sesionAlumno = await (await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'EST001', password: '123456' }),
  })).json().catch(() => null);
  const tokenEst = sesionAlumno?.token || '';

  const authDoc = { authorization: `Bearer ${tokenDoc}` };
  const resumen = (await (await fetch('/api/cursos/1/entregas', { headers: authDoc })).json().catch(() => [])) || [];
  const actividadNotas = resumen.find((a) => a.tipo === 'taller' && a.entregadas > 0);
  const botonCalificar = actividadNotas && raiz.querySelector(`[data-testid="notas-calificar-${actividadNotas.id}"]`);
  if (!botonCalificar) {
    falla('Curso:notas', `la pestaña Notas no lista "${actividadNotas ? actividadNotas.titulo : 'el taller'}". Pantalla: ${texto().slice(0, 260)}`);
  } else {
    ok('Curso:notas', `la pestaña Notas lista ${resumen.length} actividades con sus entregas calificadas`);
    botonCalificar.click();
    await dormir(1800);
    const inline = raiz.querySelector('[data-testid^="nota-inline-"]');
    if (!inline) {
      falla('Curso:calificar-en-el-sitio', `la actividad no muestra la nota por estudiante. Pantalla: ${texto().slice(0, 260)}`);
    } else {
      ok('Curso:calificar-en-el-sitio', 'la actividad abierta muestra un campo de nota por estudiante');
      const idEstudiante = inline.dataset.testid.split('-').pop();
      /* Si este alumno tiene un corte escrito a mano, la entrega no lo mueve y
         la prueba no mediría nada. Se sueltan antes de empezar. */
      const hdNotas = { 'content-type': 'application/json', authorization: `Bearer ${tokenDoc}` };
      for (const c of [1, 2, 3]) {
        await fetch(`/api/cursos/1/notas/${idEstudiante}`, {
          method: 'PATCH', headers: hdNotas, body: JSON.stringify({ recalcular: c }),
        }).catch(() => {});
      }
      /* Se califica en la mitad del puntaje: la nota del corte tiene que salir
         de ahí (mitad de 5 = 2,5) y no de un número escrito a mano. */
      const mitad = Math.round(actividadNotas.puntos / 2);
      const entregas = (await (await fetch(`/api/cursos/1/actividades/${actividadNotas.id}/entregas`, { headers: authDoc })).json()
        .catch(() => [])) || [];
      const notaAntes = entregas.find((e) => e.estudianteId === idEstudiante)?.nota ?? null;
      escribir(inline, String(mitad));
      /* El campo nunca estuvo enfocado, así que `blur()` no dispara nada: se
         manda el focusout como lo haría el docente al salir del campo. */
      inline.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await dormir(2500);
      /* Se confirma contra la API y no contra el mensaje en pantalla: asi la
         prueba verifica el dato guardado y no solo el texto de la interfaz. */
      const roster = await (await fetch('/api/cursos/1/estudiantes', { headers: authDoc })).json().catch(() => ({}));
      const fila = (roster.estudiantes || []).find((e) => e.estudianteId === idEstudiante);
      const corte = actividadNotas.corte;
      /* La cuenta se rehace actividad por actividad: si el corte fuera solo el
         promedio de lo entregado, al calificar esta actividad el número no se
         movería, y esa es justamente la falla que se quiere cazar. */
      const cuenta = await corteEsperado(idEstudiante, corte, authDoc);
      const detalle = fila?.desdeEntregas?.[corte];
      const cuadra = fila?.[`nota${corte}`] === cuenta.valor
        && detalle?.calificadas === cuenta.calificadas
        && detalle?.sinEntregar === cuenta.sinEntregar
        && detalle?.actividades === cuenta.actividades
        && !fila.cortesManuales;
      if (cuadra) {
        ok('Curso:calificacion-llega-al-corte', `${mitad}/${actividadNotas.puntos} dejó el corte ${corte} de ${fila.nombre} en ${cuenta.valor} (${cuenta.calificadas} de ${cuenta.actividades} actividades, ${cuenta.sinEntregar} sin entregar, ${cuenta.sinCalificar} sin calificar)`);
      } else {
        falla('Curso:calificacion-llega-al-corte', `el corte ${corte} quedó en ${fila?.[`nota${corte}`]} y la cuenta da ${cuenta.valor}; detalle=${JSON.stringify(detalle)} manual="${fila?.cortesManuales}"${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
      }
      /* Se devuelve la nota que tenía la entrega para que la corrida no deje el
         ejemplo del curso cambiado. */
      await fetch(`/api/cursos/1/actividades/${actividadNotas.id}/entregas/${idEstudiante}`, {
        method: 'PATCH', headers: hdNotas, body: JSON.stringify({ nota: notaAntes }),
      }).catch(() => {});
      await fetch(`/api/cursos/1/notas/${idEstudiante}`, {
        method: 'PATCH', headers: hdNotas, body: JSON.stringify({ recalcular: corte }),
      }).catch(() => {});
    }
  }

  /* --- Estudiantes: la lista real del curso y la inscripción --- */
  /* Antes esta pestaña pintaba la lista global de la institución: el mismo
     alumno aparecía en todos los cursos. Ahora sale de la matriculación y el
     docente titular puede inscribir y retirar. */
  raiz = await montar('estudiantes');
  const authCurso = { authorization: `Bearer ${localStorage.getItem('uni_token')}` };
  const rosterAntes = await (await fetch('/api/cursos/1/estudiantes', { headers: authCurso })).json().catch(() => ({}));
  /* La inscripción es una BÚSQUEDA, no una lista desplegable: con la lista
     había que recorrerla a ciegas para encontrar a un alumno conocido. */
  const buscarAlumno = raiz.querySelector('input[aria-label="Buscar estudiante para inscribir"]');
  if (!buscarAlumno) {
    falla('Curso:estudiantes', 'no aparece el buscador de inscripción. Pantalla: ' + texto().slice(-240));
  } else {
    ok('Curso:buscar-inscribir', 'la inscripción se hace con un buscador, no con un filtro');
    const candidatosApi = await (await fetch('/api/cursos/1/candidatos', { headers: authCurso })).json().catch(() => []);
    const objetivo = (candidatosApi || [])[0];
    if (!objetivo) {
      falla('Curso:estudiantes', 'no hay candidatos en la API');
    } else {
      /* Se escribe parte del nombre y se comprueba que la lista se acota. */
      const trozo = objetivo.nombre.split(' ')[1] || objetivo.nombre;
      escribir(buscarAlumno, trozo);
      await dormir(800);
      const filasResultado = [...raiz.querySelectorAll('button')]
        .filter((b) => b.innerText.includes(objetivo.nombre));
      if (filasResultado.length !== 1) {
        falla('Curso:buscar-inscribir', `«${trozo}» dejó ${filasResultado.length} resultados y se esperaba 1`);
      } else {
        ok('Curso:buscar-filtra', `«${trozo}» deja solo a ${objetivo.nombre}`);
        filasResultado[0].click();
        await dormir(400);
        const botonInscribir = [...raiz.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Inscribir');
        if (!botonInscribir || botonInscribir.disabled) {
          falla('Curso:inscribir', 'el botón Inscribir no se habilita al elegir un alumno');
        } else {
          botonInscribir.click();
          await dormir(2500);
          /* Se verifica en la API: la pantalla puede recargar y aun asi no
             haber guardado nada en la base. */
          const rosterDespues = await (await fetch('/api/cursos/1/estudiantes', { headers: authCurso })).json().catch(() => ({}));
          const inscrito = (rosterDespues.estudiantes || [])
            .find((e) => e.nombre === objetivo.nombre);
          if (inscrito) {
            ok('Curso:inscribir', `${inscrito.nombre} quedó en la lista del curso`);
            const contadorCurso = await (await fetch('/api/cursos/1', { headers: authCurso })).json().catch(() => ({}));
            if (contadorCurso.estudiantes === rosterDespues.estudiantes.length) {
              ok('Curso:contador', 'el contador del curso coincide con la lista real');
            } else {
              falla('Curso:contador', `el curso dice ${contadorCurso.estudiantes} y la lista tiene ${rosterDespues.estudiantes.length}`);
            }
            /* Se retira para dejar la base como estaba. */
            const fila = [...raiz.querySelectorAll('.est-row')]
              .find((f) => f.innerText.includes(inscrito.nombre));
            const botonRetirar = fila && [...fila.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Retirar');
            if (botonRetirar) {
              /* El retiro pide confirmacion: se acepta de forma automatica. */
              window.confirm = () => true;
              botonRetirar.click();
              await dormir(2200);
              const rosterFinal = await (await fetch('/api/cursos/1/estudiantes', { headers: authCurso })).json().catch(() => ({}));
              if ((rosterFinal.estudiantes || []).length === rosterAntes.estudiantes.length) {
                ok('Curso:retirar', `${inscrito.nombre} salió del curso`);
              } else {
                falla('Curso:retirar', `quedan ${(rosterFinal.estudiantes || []).length} alumnos y habian ${rosterAntes.estudiantes.length}`);
              }
            } else {
              falla('Curso:retirar', 'no hay botón Retirar en la fila del alumno inscrito');
            }
          } else {
            falla('Curso:inscribir', `la API no devolvió a "${objetivo.nombre}"${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
          }
        }
      }
    }
  }

  /* --- Asistencia: abrir sesión, marcar y justificar --- */
  raiz = await montar('asistencia');
  if (!(await esperarTexto('Abrir sesión', 6000))) {
    falla('Curso:asistencia', `no aparece "Abrir sesión". Pantalla: ${texto().slice(0, 260)}`);
    return;
  }
  ok('Curso:asistencia', 'el panel de asistencia carga');

  porTexto('Abrir sesión').click();
  await dormir(600);
  const formSesion = raiz.querySelector('form');
  if (!formSesion) {
    falla('Curso:abrir-sesion', 'no se pintó el formulario de sesión');
    return;
  }
  escribir(formSesion.querySelector('input[type=date]'), '2026-03-18');
  escribir(formSesion.querySelector('input:not([type=date])'), 'Clase de prueba automatica');
  await enviar(formSesion);
  if (!(await esperarTexto('Guardar asistencia', 8000))) {
    falla('Curso:abrir-sesion', `no habilitó el marcado. Pantalla: ${texto().slice(-200)}`);
    return;
  }
  ok('Curso:abrir-sesion', 'la sesión se abrió');

  /* Marcar un estudiante como ausente: el botón lleva el estado en el testid. */
  const btnAusente = raiz.querySelector('button[data-testid^="marcar-ausente-"]');
  if (!btnAusente) {
    falla('Curso:marcar', 'no hay botones de estado por estudiante');
  } else {
    btnAusente.click();
    await dormir(500);
    const idEstudiante = btnAusente.dataset.testid.replace('marcar-ausente-', '');
    const campoJust = raiz.querySelector(`input[data-testid="justificar-${idEstudiante}"]`);
    if (!campoJust) {
      falla('Curso:justificar', 'al marcar ausente no apareció el campo de justificación');
    } else {
      ok('Curso:justificar', 'la justificación aparece al marcar ausente');
      escribir(campoJust, 'Certificado medico de prueba');
      await dormir(300);
      porTexto('Guardar asistencia').click();
      if (await esperarTexto('Asistencia guardada', 8000)) ok('Curso:guardar-asistencia', 'estado y justificación llegaron al servidor');
      else falla('Curso:guardar-asistencia', `sin confirmación${errorVisible() ? `. Pantalla: ${errorVisible()}` : `. Pantalla: ${texto().slice(-180)}`}`);
    }
  }

  /* --- Fechas clicables: cada fecha abre la asistencia de ese día --- */
  const chips = [...raiz.querySelectorAll('button[data-testid^="fecha-"]')];
  if (chips.length < 2) {
    falla('Curso:fechas', `se esperaban varias fechas clicables y hay ${chips.length}. Pantalla: ${texto().slice(0, 200)}`);
  } else {
    const segunda = chips[1];
    segunda.click();
    await dormir(800);
    const cabecera = raiz.querySelector('table')?.innerText || '';
    if (cabecera.includes('Justificación')) {
      ok('Curso:fechas', `se puede cambiar de fecha (${chips.length} fechas, la última es ${segunda.dataset.testid})`);
    } else {
      falla('Curso:fechas', 'al pulsar otra fecha no se refrescó la tabla');
    }
  }

  /* --- Crear: UN boton en el corte que abre la pantalla propia ------ */
  raiz = await montar('corte1');
  await dormir(1200);
  /* En el corte solo hay boton: el formulario no esta abierto de entrada. */
  if (raiz.querySelector('#ac-titulo') || raiz.querySelector('#pa-titulo')) {
    falla('Curso:crear-oculto', 'el formulario aparece sin pulsar el botón');
  } else {
    ok('Curso:crear-oculto', 'el corte solo muestra el botón, el formulario está cerrado');
  }

  /* El corte tiene un unico boton "Crear", no uno por tipo. */
  const botonesCrear = [...raiz.querySelectorAll('[data-testid^="abrir-crear"]')];
  if (botonesCrear.length !== 1) {
    falla('Curso:crear-boton-unico', `el corte muestra ${botonesCrear.length} botones de crear; se pedia uno`);
  } else if (!/Crear/.test(botonesCrear[0].innerText)) {
    falla('Curso:crear-boton-unico', `el botón no dice Crear: "${botonesCrear[0].innerText}"`);
  } else {
    ok('Curso:crear-boton-unico', 'el corte tiene un único botón Crear');
  }

  const botonCrear = raiz.querySelector('[data-testid="abrir-crear"]');
  if (!botonCrear) {
    falla('Curso:crear-actividad', `no aparece el botón Crear. Pantalla: ${raiz.innerText.slice(0, 300)}`);
  } else {
    botonCrear.click();
    const limite = Date.now() + 9000;
    while (Date.now() < limite && !raiz.querySelector('#ac-titulo')) await dormir(250);
    const formAct = raiz.querySelector('#ac-titulo')?.closest('form');
    if (!formAct) {
      falla('Curso:crear-actividad', `el botón no abrió la pantalla de creación. Pantalla: ${raiz.innerText.slice(0, 300)}`);
    } else {
      ok('Curso:crear-actividad', 'el botón Crear abre su propia pantalla con el formulario');
      /* El encabezado debe decir en que corte se va a crear: es lo que el
         usuario pidio, que la actividad quede en el corte que esta viendo. */
      const panel = formAct.parentElement;
      if (!panel.innerText.includes('Corte 1')) {
        falla('Curso:crear-curso', `la pantalla no identifica el corte. Se ve: ${panel.innerText.slice(0, 160)}`);
      } else {
        ok('Curso:crear-curso', 'la pantalla de creación identifica el corte');
      }
      /* Ventana de entrega con hora: se habilita y se cierra. Se escriben
         minutos distintos a proposito, para que un recorte a solo-fecha se
         note en la verificacion de la API. */
      const entrega = formAct.querySelector('[data-testid="fecha-entrega-actividad"]');
      const inicio = formAct.querySelector('[data-testid="fecha-inicio-actividad"]');
      const cierre = formAct.querySelector('[data-testid="fecha-cierre-actividad"]');
      if (!entrega || !inicio || !cierre) {
        falla('Curso:crear-ventana', 'el formulario no tiene los campos de entrega, habilitación y cierre');
      } else {
        ok('Curso:crear-ventana', 'el formulario de actividad pide fecha y hora de entrega, habilitación y cierre');
        escribir(entrega, '2026-03-20T10:00');
        escribir(inicio, '2026-03-02T08:30');
        escribir(cierre, '2026-03-20T22:45');
      }
      escribir(formAct.querySelector('#ac-titulo'), 'Actividad creada desde la pagina del curso');
      await enviar(formAct);
      /* Se verifica en la API que quedo en el curso 1 y con las dos fechas. */
      const trasActividad = await (await fetch('/api/cursos/1', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
      const creada = (trasActividad.actividades || []).find((a) => a.titulo === 'Actividad creada desde la pagina del curso');
      if (!creada || creada.cursoId !== 1) {
        falla('Curso:guardar-actividad', `la API no devolvió la actividad${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
      } else if (String(creada.fechaInicio || '').slice(0, 16) !== '2026-03-02T08:30'
        || String(creada.fechaCierre || '').slice(0, 16) !== '2026-03-20T22:45'
        || String(creada.fechaEntrega || '').slice(0, 16) !== '2026-03-20T10:00') {
        falla('Curso:guardar-ventana', `llegó con entrega "${creada.fechaEntrega}", habilitación "${creada.fechaInicio}" y cierre "${creada.fechaCierre}"`);
      } else {
        ok('Curso:guardar-actividad', `quedó en el curso ${creada.cursoId} (${trasActividad.codigo})`);
        ok('Curso:guardar-ventana', 'la actividad guardó fecha y hora exactas de entrega, habilitación y cierre');

        /* --- El docente adjunta el material DESPUÉS de crearla --- */
        /* Se sube por la pantalla, no por la API: asi tambien se comprueba el
           boton y la lectura del archivo. El PDF es minimo pero lleva la
           cabecera real, que es lo que valida la descarga. */
        raiz = await montar(`actividad&id=${creada.id}`);
        await dormir(1200);
        const campoMaterial = raiz.querySelector('[data-testid="subir-material-actividad"]');
        if (!campoMaterial) {
          falla('Curso:material-boton', 'la actividad no ofrece adjuntar material de apoyo');
        } else {
          ok('Curso:material-boton', 'el docente puede adjuntar material en la actividad ya creada');
          const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46]);
          const carry = new DataTransfer();
          carry.items.add(new File([pdf], 'guia-taller.pdf', { type: 'application/pdf' }));
          campoMaterial.files = carry.files;
          campoMaterial.dispatchEvent(new Event('change', { bubbles: true }));
          const limiteSubida = Date.now() + 12000;
          while (Date.now() < limiteSubida && !/guia-taller\.pdf/.test(raiz.innerText)) await dormir(300);
          if (!/guia-taller\.pdf/.test(raiz.innerText)) {
            falla('Curso:material-subir', `el material no quedó visible. Pantalla: ${raiz.innerText.slice(0, 240)}`);
          } else {
            ok('Curso:material-subir', 'el material adjunto aparece en la actividad');
            /* La descarga debe devolver el PDF con su nombre. */
            const bajada = await fetch(`/api/cursos/1/actividades/${creada.id}/archivo`, { headers: { authorization: `Bearer ${tokenDoc}` } });
            const bytes = new Uint8Array(await bajada.arrayBuffer());
            const cabecera = String.fromCharCode(...bytes.slice(0, 5));
            if (bajada.status === 200 && cabecera === '%PDF-') {
              ok('Curso:material-descargar', `el material baja como PDF (${bytes.length} bytes)`);
            } else {
              falla('Curso:material-descargar', `la descarga dio ${bajada.status} con cabecera "${cabecera}"`);
            }
            /* Y el estudiante ve ese mismo material en su curso. */
            if (!tokenEst) {
              falla('Curso:material-estudiante', 'no se pudo iniciar sesión como estudiante para comprobar su vista');
            } else {
              const vistaAlumno = await (await fetch('/api/cursos/1', { headers: { authorization: `Bearer ${tokenEst}` } })).json();
              const paraAlumno = (vistaAlumno.actividades || []).find((a) => a.id === creada.id);
              if (paraAlumno?.archivo === 'guia-taller.pdf') {
                ok('Curso:material-estudiante', 'el estudiante ve el material que adjunto el docente');
              } else {
                falla('Curso:material-estudiante', `el estudiante ve "${paraAlumno?.archivo}"`);
              }
            }
          }
        }
      }
    }
  }

  /* El parcial se elige DENTRO de la misma pantalla de creación. */
  raiz = await montar('crear&corte=1&volver=corte1');
  await dormir(1200);
  const elegirParcial = raiz.querySelector('[data-testid="elegir-parcial"]');
  if (!elegirParcial) {
    falla('Curso:crear-parcial', 'la pantalla de creación no ofrece elegir parcial');
  } else {
    elegirParcial.click();
    const limiteParcial = Date.now() + 9000;
    while (Date.now() < limiteParcial && !raiz.querySelector('#pa-titulo')) await dormir(250);
    const formParcial = raiz.querySelector('#pa-titulo')?.closest('form');
    if (!formParcial) {
      falla('Curso:crear-parcial', `no se abrió el parcial. Pantalla: ${raiz.innerText.slice(0, 300)}`);
    } else {
      ok('Curso:crear-parcial', 'dentro de Crear se elige parcial y aparece su formulario');
      const inicio = formParcial.querySelector('[data-testid="fecha-inicio-parcial"]');
      const cierre = formParcial.querySelector('[data-testid="fecha-cierre-parcial"]');
      if (!inicio || !cierre) {
        falla('Curso:crear-ventana-parcial', 'el parcial no tiene los campos de apertura y cierre');
      } else {
        ok('Curso:crear-ventana-parcial', 'el parcial pide fecha y hora de habilitación y cierre');
        escribir(inicio, '2026-03-09T07:00');
        escribir(cierre, '2026-03-09T20:15');
      }
      /* Se localizan por su etiqueta y no por posicion: en el formulario hay
         inputs de puntos y fecha antes que los de la pregunta. */
      const campo = formParcial.querySelector('#pa-titulo');
      if (campo) escribir(campo, 'Parcial creado desde la pagina del curso');
      const enunciado = [...formParcial.querySelectorAll('input')].find((i) => /Escriba la pregunta/.test(i.placeholder || ''));
      if (!enunciado) {
        falla('Curso:crear-parcial', 'no se encontró el campo del enunciado');
      } else {
        escribir(enunciado, 'Pregunta de prueba');
        const opciones = [...formParcial.querySelectorAll('input')].filter((i) => /Respuesta/.test(i.placeholder || ''));
        opciones.forEach((o, k) => escribir(o, `Respuesta ${k + 1}`));
      }
      await enviar(formParcial);
      /* Igual que con la nota: se comprueba en la API que el parcial quedo en
         el curso 1, con sus preguntas y con su ventana de entrega. */
      const despues = await (await fetch('/api/cursos/1', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
      const parcial = (despues.actividades || []).find((a) => a.titulo === 'Parcial creado desde la pagina del curso');
      if (!parcial || parcial.tipo !== 'parcial' || !(parcial.preguntas || []).length) {
        falla('Curso:guardar-parcial', `la API no devolvio el parcial${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
      } else if (String(parcial.fechaInicio || '').slice(0, 10) !== '2026-03-09' || !parcial.fechaCierre) {
        falla('Curso:guardar-ventana-parcial', `llegó con apertura "${parcial.fechaInicio}" y cierre "${parcial.fechaCierre}"`);
      } else {
        ok('Curso:guardar-parcial', `el parcial quedo en el curso 1 con ${parcial.preguntas.length} pregunta(s)`);
        ok('Curso:guardar-ventana-parcial', 'el parcial guardó la fecha en que se abre y en que se cierra');
      }
    }
  }

  /* --- Clic en la ACTIVIDAD del corte: abre su propia pagina (Moodle) --- */
  raiz = await montar('corte1');
  /* El parcial es el recurso que el docente revisa: se busca su boton por
     el data-testid que lleva el id de la actividad. */
  const detalleCurso = await (await fetch('/api/cursos/1', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
  const parcialCorte = (detalleCurso.actividades || []).find((a) => a.tipo === 'parcial' && (a.preguntas || []).length);
  if (!parcialCorte) {
    falla('Curso:sin-parcial', 'el curso no tiene ningun parcial con preguntas');
  } else {
    const botonParcial = raiz.querySelector(`[data-testid="abrir-actividad-${parcialCorte.id}"]`);
    if (!botonParcial) {
      falla('Curso:abrir-parcial', `no hay boton para abrir el parcial. Pantalla: ${raiz.innerText.slice(0, 300)}`);
    } else {
      botonParcial.click();
      /* La pantalla abierta debe traer los datos del recurso: sus preguntas y
         el listado de entregas de ESE parcial. */
      const limite = Date.now() + 10000;
      while (Date.now() < limite && !/Entregas de esta actividad/.test(raiz.innerText)) await dormir(250);
      const txt = raiz.innerText;
      if (!/Entregas de esta actividad/.test(txt)) {
        falla('Curso:detalle-parcial', `no se abrio la pagina del parcial. Pantalla: ${txt.slice(0, 300)}`);
      } else if (!/Volver al curso/.test(txt)) {
        falla('Curso:volver-parcial', 'la pagina del parcial no ofrece volver al curso');
      } else if (!/Preguntas del parcial/.test(txt)) {
        falla('Curso:preguntas-parcial', 'la pagina del parcial no muestra sus preguntas');
      } else {
        ok('Curso:detalle-parcial', `el parcial "${parcialCorte.titulo}" abre su propia pagina con preguntas y entregas`);
        /* Las respuestas de un parcial se leen en esa misma pantalla: se
           comprueba que las respuestas de la entrega llegaron al servidor. */
        const detalleParcial = await (await fetch(`/api/cursos/1/actividades/${parcialCorte.id}/entregas`, { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
        const conRespuestas = (detalleParcial || []).find((e) => e.respuestas && Object.keys(e.respuestas).length);
        if (conRespuestas) {
          ok('Curso:respuestas-parcial', `se leen ${Object.keys(conRespuestas.respuestas).length} respuesta(s) con ${conRespuestas.aciertos}/${conRespuestas.total} de acierto`);
        } else {
          /* Sin entrega con respuestas no hay nada que leer, pero la pantalla
             no deberia romperse: se registra como caso sin datos. */
          ok('Curso:respuestas-parcial', 'aun no hay entregas con respuestas en este parcial');
        }
      }
    }
  }

  /* --- No hay pestaña de Entregas: se ven dentro de la actividad --- */
  raiz = await montar('corte1');
  await dormir(1200);
  const botonesMenu = [...raiz.querySelectorAll('.ct-btn')].map((b) => b.innerText.trim());
  if (botonesMenu.some((t) => /Entregas/.test(t))) {
    falla('Curso:sin-pestana-entregas', `sigue habiendo una pestaña Entregas: ${botonesMenu.join(' | ')}`);
  } else if (/Entregas de esta actividad/.test(raiz.innerText)) {
    falla('Curso:sin-pestana-entregas', 'el corte muestra las entregas sin abrir la actividad');
  } else {
    ok('Curso:sin-pestana-entregas', 'el corte no lista entregas: hay que abrir la actividad');
    ok('Curso:menu-sin-entregas', 'el menú del curso ya no ofrece la pestaña Entregas');
  }

  /* --- La nota del corte es del estudiante: el docente no la ve --- */
  if (/Nota corte/.test(raiz.innerText)) {
    falla('Curso:nota-corte-docente', `el docente ve la nota del corte. Pantalla: ${raiz.innerText.slice(0, 300)}`);
  } else {
    ok('Curso:nota-corte-docente', 'la cabecera del corte no muestra la nota al docente');
  }

  /* El progreso por corte y la nota parcial son del alumno: el docente que
     califica no los lleva en su pagina del curso. */
  raiz = await montar('inicio');
  await dormir(1500);
  if (/Progreso por corte/.test(raiz.innerText)) {
    falla('Curso:progreso-corte-docente', 'el docente sigue viendo el cuadro de progreso por corte');
  } else if (/Nota parcial/.test(raiz.innerText)) {
    falla('Curso:progreso-corte-docente', 'el docente sigue viendo la nota parcial del curso');
  } else {
    ok('Curso:progreso-corte-docente', 'el curso no le muestra al docente el progreso ni la nota parcial');
  }

  /* Y los pendientes del encabezado no salen en cero: la API manda
     `estadoEst` y el respaldo `estado_est`, hay que leer los dos. */
  const datosCurso = await (await fetch('/api/cursos/1', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
  const pendientes = (datosCurso.actividades || []).filter((a) => (a.estadoEst ?? a.estado_est) === 'pendiente').length;
  if (!pendientes) {
    falla('Curso:pendientes-contador', 'la prueba no sirve: el seed no dejó actividades pendientes');
  } else if (/(^|\n)\s*0\s*\n\s*Pendientes/.test(raiz.innerText)) {
    falla('Curso:pendientes-contador', `Pendientes sale en 0 pero la API tiene ${pendientes}`);
  } else {
    ok('Curso:pendientes-contador', `el encabezado cuenta ${pendientes} pendientes, no 0`);
  }

  /* --- Abrir un trabajo: su pagina trae el archivo descargable --- */
  /* El taller del seed vive en el corte 2: se entra al corte que indique la
     propia actividad, no a uno fijo. */
  const taller = (datosCurso.actividades || []).find((a) => a.tipo === 'taller');
  raiz = await montar(`corte${taller ? taller.corte : 2}`);
  await dormir(1200);
  const botonTaller = taller && raiz.querySelector(`[data-testid="abrir-actividad-${taller.id}"]`);
  if (!botonTaller) {
    falla('Curso:abrir-entrega', `no hay boton para abrir el taller. Pantalla: ${raiz.innerText.slice(0, 300)}`);
  } else {
    botonTaller.click();
    /* La lista de entregas son SOLO nombres: no se despliega nada aqui. */
    const limiteDetalle = Date.now() + 9000;
    while (Date.now() < limiteDetalle && !/Entregas de esta actividad/.test(raiz.innerText)) await dormir(250);
    if (!/Entregas de esta actividad/.test(raiz.innerText)) {
      falla('Curso:abrir-entrega', `la página del taller no lista sus entregas. Pantalla: ${raiz.innerText.slice(0, 300)}`);
    } else {
      ok('Curso:abrir-entrega', 'se puede hacer clic en un trabajo y ver la lista de quienes entregaron');
    }

    /* --- Al pulsar el nombre se abre SOLO la hoja de ese estudiante --- */
    const detalleTaller = await (await fetch(`/api/cursos/1/actividades/${taller.id}/entregas`, { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
    const conArchivo = (detalleTaller || []).find((e) => e.archivo);
    /* La lista debe traer a todos, para comprobar que al abrir uno no se
       mezclan los demas. */
    const nombres = (detalleTaller || []).map((e) => e.estudiante?.nombre).filter(Boolean);
    if (nombres.length < 2) {
      falla('Curso:entrega-aislada', `hacen falta al menos dos entregas para comprobar que aísla una. Hay ${nombres.length}`);
    } else {
      const botonEstudiante = raiz.querySelector(`[data-testid="abrir-entrega-${conArchivo?.estudianteId ?? (detalleTaller[0].estudianteId)}"]`);
      if (!botonEstudiante) {
        falla('Curso:entrega-aislada', 'no hay un botón por estudiante en la lista de entregas');
      } else {
        ok('Curso:entrega-lista', `la lista muestra a ${nombres.length} estudiantes sin desplegar ninguno`);
        botonEstudiante.click();
        const limiteHoja = Date.now() + 9000;
        while (Date.now() < limiteHoja && !/Volver a la actividad/.test(raiz.innerText)) await dormir(250);
        if (!/Volver a la actividad/.test(raiz.innerText)) {
          falla('Curso:entrega-aislada', `el nombre no abrió la hoja del estudiante. Pantalla: ${raiz.innerText.slice(0, 300)}`);
        } else {
          const otros = nombres.filter((n) => n !== conArchivo?.estudiante?.nombre && raiz.innerText.includes(n));
          if (otros.length) {
            falla('Curso:entrega-aislada', `la hoja del estudiante todavía muestra a otros: ${otros.join(', ')}`);
          } else {
            ok('Curso:entrega-aislada', 'al pulsar el nombre se abre solo la hoja de ese estudiante');
          }
          if (!/📎 Archivo entregado/.test(raiz.innerText)) {
            falla('Curso:hoja-archivo', 'la hoja no muestra el archivo que entregó');
          } else {
            ok('Curso:hoja-archivo', 'la hoja del estudiante muestra su archivo');
            const descarga = await fetch(`/api/cursos/1/actividades/${taller.id}/entregas/${conArchivo.estudianteId}/archivo`, { headers: { authorization: `Bearer ${tokenDoc}` } });
            const bytes = new Uint8Array(await descarga.arrayBuffer());
            const cabecera = String.fromCharCode(...bytes.slice(0, 5));
            if (descarga.status === 200 && cabecera === '%PDF-') {
              ok('Curso:descargar-archivo', `${conArchivo.archivo} baja como PDF (${bytes.length} bytes)`);
            } else {
              falla('Curso:descargar-archivo', `la descarga dio ${descarga.status} con cabecera "${cabecera}"`);
            }
          }
          /* Volver regresa a la actividad, no al corte. */
          const volver = [...raiz.querySelectorAll('button')].find((b) => /Volver a la actividad/.test(b.innerText));
          if (volver) {
            volver.click();
            const limiteVolver = Date.now() + 6000;
            while (Date.now() < limiteVolver && /Volver a la actividad/.test(raiz.innerText)) await dormir(250);
            ok('Curso:entrega-volver', /Entregas de esta actividad/.test(raiz.innerText)
              ? 'Volver regresa a la lista de entregas de la actividad'
              : 'volver salio de la hoja');
          }
        }
      }
    }

    /* --- El parcial: la hoja muestra el examen con su eleccion y el acierto ---
       Se busca el parcial que de verdad tenga respuestas enviadas, porque la
       hoja de un estudiante que no entrego solo diria que no hay entrega. */
    let parcialConEnvios = null;
    let entregaDelParcial = null;
    for (const a of (detalleCurso.actividades || []).filter((x) => x.tipo === 'parcial' && (x.preguntas || []).length)) {
      const envios = await (await fetch(`/api/cursos/1/actividades/${a.id}/entregas`, { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
      const conDatos = (envios || []).find((e) => e.respuestas && Object.keys(e.respuestas).length);
      if (conDatos) {
        parcialConEnvios = a;
        entregaDelParcial = conDatos;
        break;
      }
    }
    if (!parcialConEnvios) {
      falla('Curso:icfes', 'el seed no dejó un parcial con respuestas de estudiantes');
    } else {
      raiz = await montar(`entrega&id=${parcialConEnvios.id}&est=${entregaDelParcial.estudianteId}&volver=actividad`);
      const limiteIcfes = Date.now() + 10000;
      while (Date.now() < limiteIcfes && !/Correcta|Incorrecta|Sin responder/.test(raiz.innerText)) await dormir(250);
      const hoja = raiz.innerText;
      if (!/Correcta|Incorrecta|Sin responder/.test(hoja)) {
        falla('Curso:icfes', `la hoja no muestra el examen con su resultado. Pantalla: ${hoja.slice(0, 300)}`);
      } else if (!/[ABC]\b/.test(hoja)) {
        falla('Curso:icfes', 'la hoja no muestra las opciones A, B, C del parcial');
      } else {
        ok('Curso:icfes', 'la hoja del parcial muestra el examen con la opción que eligió el estudiante');
        /* Lo que se marca en pantalla tiene que ser lo que el estudiante
           contesto de verdad: se contrasta contra lo que devuelve la API. */
        const contestadas = (parcialConEnvios.preguntas || []).filter((p) => {
          const r = entregaDelParcial.respuestas?.[p.id] ?? entregaDelParcial.respuestas?.[String(p.id)];
          return Array.isArray(r) && r.length;
        });
        const letraEsperada = contestadas.length
          ? String.fromCharCode(65 + Number(contestadas[0].correcta ?? entregaDelParcial.respuestas[contestadas[0].id]?.[0]))
          : '';
        if (!letraEsperada || hoja.includes(letraEsperada)) {
          ok('Curso:icfes-detalle', `se leen ${contestadas.length} pregunta(s) con la selección del estudiante`);
        } else {
          falla('Curso:icfes-detalle', `se esperaba la opción ${letraEsperada} y no aparece en la hoja`);
        }
      }
    }
  }

  /* --- Un enlace directo abre la actividad: parcial con aciertos --- */
  /* OJO: los parametros se unen con `&`, no con `?`; con `?` el parser toma
     todo como valor de `tab` y la pagina abre sin recurso. */
  raiz = await montar(`actividad&id=${parcialCorte ? parcialCorte.id : 1}`);
  const limiteParcial = Date.now() + 10000;
  while (Date.now() < limiteParcial && !/Entregas de esta actividad/.test(raiz.innerText)) await dormir(250);
  if (!/Entregas de esta actividad/.test(raiz.innerText)) {
    falla('Curso:url-directa', `la vista directa por URL no cargó. Pantalla: ${raiz.innerText.slice(0, 300)}`);
  } else {
    ok('Curso:url-directa', 'un enlace directo ?tab=actividad&id= abre la página con sus entregas');
    /* Al abrir un parcial se ven los aciertos de cada entrega. */
    if (/correctas/.test(raiz.innerText)) {
      ok('Curso:ver-parcial', 'el parcial muestra los aciertos de cada entrega');
    } else {
      falla('Curso:ver-parcial', `no se mostraron los aciertos. Pantalla: ${raiz.innerText.slice(0, 300)}`);
    }
  }

  /* --- Al pulsar otra pestaña del menú se cierra lo que estaba abierto --- */
  const corte2 = [...raiz.querySelectorAll('.ct-btn')].find((b) => /Corte 2/.test(b.innerText));
  if (!corte2) {
    falla('Curso:cerrar-al-navegar', 'no se encontró la pestaña Corte 2');
  } else {
    corte2.click();
    const limiteCerrar = Date.now() + 6000;
    while (Date.now() < limiteCerrar && /Entregas de esta actividad/.test(raiz.innerText)) await dormir(250);
    if (/Entregas de esta actividad/.test(raiz.innerText)) {
      falla('Curso:cerrar-al-navegar', 'la entrega sigue abierta al cambiar de pestaña');
    } else {
      ok('Curso:cerrar-al-navegar', 'pulsar Corte 2 cierra la entrega que estaba abierta');
    }
  }

  /* Un hilo abierto tampoco debe quedar pegado al cambiar de pestaña. */
  raiz = await montar('foro');
  await dormir(1200);
  const temaParaAbrir = raiz.querySelector('button[data-testid^="abrir-hilo-"]');
  if (!temaParaAbrir) {
    falla('Curso:cerrar-hilo', 'el foro no tiene temas para abrir');
  } else {
    temaParaAbrir.click();
    const limiteHilo = Date.now() + 6000;
    while (Date.now() < limiteHilo && !/Responder en este hilo/.test(raiz.innerText)) await dormir(250);
    if (!/Responder en este hilo/.test(raiz.innerText)) {
      falla('Curso:cerrar-hilo', 'el hilo no se abrió');
    } else {
      const btnInicio = [...raiz.querySelectorAll('.ct-btn')].find((b) => /Inicio/.test(b.innerText));
      btnInicio.click();
      const limite = Date.now() + 6000;
      while (Date.now() < limite && /Responder en este hilo/.test(raiz.innerText)) await dormir(250);
      if (/Responder en este hilo/.test(raiz.innerText)) {
        falla('Curso:cerrar-hilo', 'el hilo sigue abierto al cambiar de pestaña');
      } else {
        ok('Curso:cerrar-hilo', 'pulsar Inicio cierra el hilo del foro');
      }
    }
  }



  /* --- El foro vive dentro de la página del curso, agrupado por tema --- */
  raiz = await montar('foro');
  if (!(await esperarTexto('Publicar mensaje', 8000))) {
    falla('Curso:foro', `no aparece el foro del curso. Pantalla: ${raiz.innerText.slice(0, 300)}`);
  } else {
    ok('Curso:foro', 'la pestaña Foro del curso carga');
    /* Cada tema es una fila que abre el hilo, no un mensaje suelto. */
    const filasTema = [...raiz.querySelectorAll('button[data-testid^="abrir-hilo-"]')];
    if (filasTema.length === 0) {
      falla('Curso:foro-temas', `el foro no agrupa los mensajes por tema. Pantalla: ${raiz.innerText.slice(0, 300)}`);
    } else {
      ok('Curso:foro-temas', `el foro agrupa los mensajes en ${filasTema.length} tema(s)`);
    }

    /* Al abrir un hilo se ve la conversacion completa y se puede responder. */
    const temaConocido = filasTema.find((b) => /Dudas sobre el parcial/.test(b.innerText)) || filasTema[0];
    const temaHilo = temaConocido.dataset.testid.replace('abrir-hilo-', '').replace(/-/g, ' ');
    temaConocido.click();
    const limiteHilo = Date.now() + 8000;
    while (Date.now() < limiteHilo && !/Volver al foro/.test(raiz.innerText)) await dormir(250);
    const txtHilo = raiz.innerText;
    if (!/Volver al foro/.test(txtHilo)) {
      falla('Curso:abrir-hilo', `no se abrio el hilo del tema. Pantalla: ${txtHilo.slice(0, 300)}`);
    } else if (!/Responder en este hilo/.test(txtHilo)) {
      falla('Curso:responder-hilo', 'el hilo abierto no ofrece la opción de responder');
    } else {
      ok('Curso:abrir-hilo', `el hilo abrio con su conversacion y el formulario de respuesta`);
      /* Responder dentro del hilo debe mantener el tema: si se perdiera, el
         mensaje apareceria colgado en un tema nuevo. */
      const areaHilo = raiz.querySelector('#hilo-mensaje');
      if (!areaHilo) {
        falla('Curso:responder-hilo', 'no se encontró el campo de respuesta del hilo');
      } else {
        escribir(areaHilo, 'Respuesta de prueba dentro del hilo');
        const formHilo = areaHilo.closest('form');
        await enviar(formHilo);
        if (await esperarTexto('Mensaje publicado', 8000)) {
          /* Se comprueba en la API que la respuesta quedo en el tema original. */
          const hilos = await (await fetch('/api/cursos/1/foro', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
          const enElTema = (hilos || []).filter((m) => m.tema === temaHilo);
          const ultima = enElTema[enElTema.length - 1];
          if (ultima && /dentro del hilo/.test(ultima.mensaje)) {
            ok('Curso:responder-hilo', `la respuesta quedó en "${temaHilo}" (${enElTema.length} mensajes)`);
          } else {
            falla('Curso:responder-hilo', `la respuesta no quedó en el tema "${temaHilo}"`);
          }
        } else {
          falla('Curso:responder-hilo', `sin confirmación${errorVisible() ? `. Pantalla: ${errorVisible()}` : ''}`);
        }
      }
    }
  }

  /* Publicar un tema nuevo desde la lista del foro. */
  raiz = await montar('foro');
  await dormir(1500);
  const formNuevo = [...raiz.querySelectorAll('form')].find((f) => f.innerText.includes('Publicar mensaje'));
  if (!formNuevo) {
    falla('Curso:publicar-foro', 'no se encontró el formulario de publicación del curso');
  } else {
    escribir(formNuevo.querySelector('input'), 'Tema desde la pagina del curso');
    escribir(formNuevo.querySelector('textarea'), 'Mensaje de prueba en el foro del curso');
    await enviar(formNuevo);
    if (await esperarTexto('Mensaje publicado', 8000)) ok('Curso:publicar-foro', 'el mensaje del curso llegó al servidor');
    else falla('Curso:publicar-foro', `sin confirmación${errorVisible() ? `. Pantalla: ${errorVisible()}` : `. Pantalla: ${raiz.innerText.slice(0, 200)}`}`);
  }

  /* --- El docente no debe ver los cursos de otros --- */
  const propios = await (await fetch('/api/cursos', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
  if (Array.isArray(propios) && propios.length === 1 && propios[0].id === 1) {
    ok('Curso:solo-suyo', 'la API devuelve solo el curso del docente');
  } else {
    falla('Curso:solo-suyo', `la API devolvio ${Array.isArray(propios) ? propios.length : '?'} curso(s)`);
  }

  /* El bootstrap alimenta las listas laterales y el registro de notas: si
     incluyera asignaturas de otros docentes, volverian a verse en pantalla. */
  const arranque = await (await fetch('/api/bootstrap', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
  const codigosPropios = new Set((arranque.cursos || []).map((c) => c.codigo));
  const materiasAjenas = (arranque.materias || []).filter((m) => !codigosPropios.has(m.codigo));
  if (materiasAjenas.length === 0) {
    ok('Curso:sin-materias-ajenas', 'el bootstrap del docente no trae asignaturas de otros');
  } else {
    falla('Curso:sin-materias-ajenas', `aparecen ${materiasAjenas.length} materia(s) ajena(s): ${materiasAjenas.map((m) => m.codigo).join(', ')}`);
  }
  const ajeno = await fetch('/api/cursos/2', { headers: { authorization: `Bearer ${tokenDoc}` } });
  if (ajeno.status === 403) ok('Curso:bloqueo-ajeno', 'un curso ajeno responde 403');
  else falla('Curso:bloqueo-ajeno', `un curso ajeno respondió ${ajeno.status}`);

  /* --- La portada del docente no debe ofrecer pagos ni promedio --- */
  const raizPanel = document.createElement('div');
  raizPanel.id = 'caso-panel-docente';
  document.body.appendChild(raizPanel);
  createRoot(raizPanel).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard?view=home']}>
        <Dashboard />
      </MemoryRouter>
    </AuthProvider>
  );
  /* El Dashboard carga el bootstrap antes de pintar; se espera a que
     aparezcan las tarjetas en vez de dormir un tiempo fijo. */
  const limitePanel = Date.now() + 15000;
  while (Date.now() < limitePanel && !/Mis cursos|Registrar notas|Mis Notas/.test(raizPanel.innerText)) {
    await dormir(300);
  }
  const txtPanel = raizPanel.innerText;
  /* "Pagos" aparece en varias partes legitimas (el nombre de la vista del
     alumno), asi que se comprueba la tarjeta y el acceso rapido concretos. */
  const sinPagos = !/Pagos pendientes/.test(txtPanel) && !/Ver pagos/.test(txtPanel);
  const sinPromedio = !/Promedio actual/.test(txtPanel);
  if (sinPagos && sinPromedio) {
    ok('Docente:portada-sin-pagos', 'la portada del docente no muestra pagos ni promedio');
  } else {
    falla('Docente:portada-sin-pagos', `quedaron visibles: ${[!sinPagos && 'pagos', !sinPromedio && 'promedio'].filter(Boolean).join(' y ')}. Pantalla: ${txtPanel.slice(0, 260)}`);
  }
  if (/Mis cursos/.test(txtPanel) && /Por calificar/.test(txtPanel)) {
    ok('Docente:portada-propia', 'la portada muestra sus cursos y lo que falta calificar');
  } else {
    falla('Docente:portada-propia', `no muestra el resumen docente. Pantalla: ${txtPanel.slice(0, 260)}`);
  }

  /* --- La bandeja "Por Calificar" del docente --- */
  /* Antes esta pestaña repetia la lista de tareas del ESTUDIANTE: el docente
     veia "Pendientes" de su propia entrega y no podia calificar nada desde
     ahi. Ahora debe listar las entregas de sus cursos con el boton de
     revisar, y la nota que ponga alli debe verse en la vista del alumno. */
  const bandeja = await (await fetch('/api/cursos/por-calificar', { headers: { authorization: `Bearer ${tokenDoc}` } })).json();
  if (Array.isArray(bandeja) && bandeja.length > 0) {
    ok('Docente:bandeja-datos', `la bandeja trae ${bandeja.length} entrega(s) de sus cursos`);
    const ajena = bandeja.find((e) => !e.cursoId);
    if (ajena) falla('Docente:bandeja-curso', 'hay entregas sin curso, no se sabe dónde abrir la hoja');
    else ok('Docente:bandeja-curso', 'cada entrega dice su curso para abrir la hoja en el lugar correcto');
  } else {
    falla('Docente:bandeja-datos', `la bandeja devolvió ${Array.isArray(bandeja) ? bandeja.length : '?'} entregas`);
  }

  /* La pestaña, en la interfaz del docente. Se montan las DOS rutas porque el
     botón de revisar navega a /curso/:id: con un MemoryRouter de una sola ruta
     el salto se quedaria en blanco y la prueba no probaria nada. */
  const raizBandeja = document.createElement('div');
  raizBandeja.id = 'caso-bandeja-docente';
  document.body.appendChild(raizBandeja);
  createRoot(raizBandeja).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard?view=lms&tab=tareas']}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/curso/:id" element={<Curso />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
  const limiteBandeja = Date.now() + 15000;
  while (Date.now() < limiteBandeja && !/Entregas por revisar/.test(raizBandeja.innerText)) {
    await dormir(300);
  }
  if (!/Entregas por revisar/.test(raizBandeja.innerText)) {
    falla('Docente:bandeja-pantalla', `la pestaña no muestra la bandeja. Pantalla: ${raizBandeja.innerText.slice(0, 260)}`);
  } else {
    ok('Docente:bandeja-pantalla', 'la pestaña del docente es la bandeja de entregas por revisar');
    const botones = [...raizBandeja.querySelectorAll('button')].filter((b) => /Revisar y calificar|Ver hoja/.test(b.innerText));
    if (botones.length === 0) {
      falla('Docente:bandeja-revisar', 'la bandeja no ofrece botón para revisar ninguna entrega');
    } else {
      ok('Docente:bandeja-revisar', `hay ${botones.length} entrega(s) con botón para revisar y calificar`);
      /* Abrir una desde la bandeja debe llevar a la hoja de ESE estudiante. */
      const primera = (Array.isArray(bandeja) ? bandeja[0] : null);
      botones[0].click();
      const limiteHoja = Date.now() + 12000;
      while (Date.now() < limiteHoja && !/Volver a la actividad/.test(raizBandeja.innerText)) await dormir(300);
      if (!/Volver a la actividad/.test(raizBandeja.innerText)) {
        falla('Docente:bandeja-navega', `el botón no abrió la hoja del estudiante. Pantalla: ${raizBandeja.innerText.slice(0, 260)}`);
      } else if (primera?.estudiante && !raizBandeja.innerText.includes(primera.estudiante)) {
        falla('Docente:bandeja-navega', `abrió una hoja que no es de "${primera.estudiante}"`);
      } else {
        ok('Docente:bandeja-navega', 'desde la bandeja se abre la hoja del estudiante que entregó');
      }
    }
  }

  /* Y la nota puesta por el docente tiene que llegarle al ESTUDIANTE. Se
     busca la entrega del alumno de esta sesion (documento 1.023.445.671): la
     vista del estudiante solo muestra la suya propia, asi que calificar la de
     otro compañero no probaria nada. Da igual si ya venia con nota: lo que se
     comprueba es que la que escribe el docente es la que ve el alumno. */
  const DOCUMENTO_ALUMNO = '1.023.445.671';
  const paraCalificar = (Array.isArray(bandeja) ? bandeja : [])
    .find((e) => e.documento === DOCUMENTO_ALUMNO);
  if (!paraCalificar) {
    falla('Docente:nota-al-alumno', `la bandeja no trae ninguna entrega del alumno ${DOCUMENTO_ALUMNO}`);
  } else if (!tokenEst) {
    falla('Docente:nota-al-alumno', 'no se pudo iniciar sesión como estudiante');
  } else {
    /* La nota va dentro del rango de la actividad: la API la rechaza si no. */
    const maximo = Number(paraCalificar.puntos) || 10;
    const notaPrueba = maximo >= 8 ? 8 : maximo;
    const calificacion = await fetch(`/api/cursos/${paraCalificar.cursoId}/actividades/${paraCalificar.actividadId}/entregas/${paraCalificar.estudianteId}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${tokenDoc}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nota: notaPrueba, comentario: 'Calificado desde la prueba' }),
    });
    const entregadas = await (await fetch(`/api/cursos/${paraCalificar.cursoId}/actividades/${paraCalificar.actividadId}/entregas`, { headers: { authorization: `Bearer ${tokenEst}` } })).json();
    const fila = (Array.isArray(entregadas) ? entregadas : []).find((e) => e.estudianteId === paraCalificar.estudianteId);
    if (calificacion.status === 200 && fila?.nota === notaPrueba) {
      ok('Docente:nota-al-alumno', `el estudiante ve la nota ${fila.nota} de "${fila.estudiante?.nombre}" en su curso`);
    } else {
      falla('Docente:nota-al-alumno', `la calificación respondió ${calificacion.status} y el estudiante ve nota=${fila ? JSON.stringify(fila.nota) : 'sin fila'} en lugar de ${notaPrueba}`);
    }
  }

  /* La vista del CORTE desde el lado del alumno. Antes esta pantalla no se
     probaba en el navegador y es donde se explica la regla nueva: el alumno
     tiene que ver su nota del corte, el peso que tiene en la definitiva y, si
     no entregó algo, cuántas actividades le valieron cero. */
  if (tokenEst) {
    localStorage.setItem('uni_token', tokenEst);
    /* Se espera a que la pantalla llegue desde la API en vez de dormir fijo: en
       una corrida lenta se leería el "Volver" de la primera pintura y la
       prueba fallaría sin que hubiera nada roto. */
    const verCorte = async (curso, corte) => {
      const raiz = document.createElement('div');
      raiz.id = `caso-curso-${(nMontaje += 1)}`;
      document.body.appendChild(raiz);
      createRoot(raiz).render(
        <AuthProvider>
          <MemoryRouter initialEntries={[`/curso/${curso}?tab=corte${corte}`]}>
            {/* Con la ruta declarada: `Curso` lee el id del curso de `useParams`,
               y sin ella se queda siempre en el curso 1 y la prueba miraría la
               pantalla del curso equivocado. */}
            <Routes>
              <Route path="/curso/:id" element={<Curso />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );
      const limite = Date.now() + 12000;
      while (Date.now() < limite && !/de la nota final/.test(raiz.innerText)) await dormir(250);
      await dormir(800);
      const texto = raiz.innerText;
      raiz.remove();
      return texto;
    };

    const suNota = (await (await fetch('/api/cursos/1/mis-notas', { headers: { authorization: `Bearer ${tokenEst}` } })).json().catch(() => ({})))?.miNota;
    const corte = suNota ? Number(suNota.nota2) : null;
    /* La tarjeta del corte muestra la nota con un decimal, como la ve el alumno. */
    const esperada = corte === null ? '' : corte.toFixed(1);
    const pantalla = await verCorte(1, 2);
    const muestraNota = !!esperada && pantalla.includes(esperada);
    const muestraPeso = /30 ?%/.test(pantalla);
    if (muestraNota && muestraPeso) {
      ok('Curso:corte-del-alumno', `el alumno ve su corte 2 en ${corte} y el 30 % que pesa en la definitiva`);
    } else {
      falla('Curso:corte-del-alumno', `nota=${muestraNota} (corte=${corte}) peso=${muestraPeso}. Pantalla: ${pantalla.slice(0, 240)}`);
    }

    /* Y cuando de verdad faltó algo, el alumno tiene que ver cuántas
       actividades le valieron cero: sin ese aviso un 1,67 parece una nota mal
       puesta. El curso 2 tiene actividades en las que no entregó nadie. */
    const miCorte2 = (await (await fetch('/api/cursos/2/mis-notas', { headers: { authorization: `Bearer ${tokenEst}` } })).json().catch(() => ({})))?.miCorte?.['1'];
    const sinEntregar = miCorte2?.sinEntregar || 0;
    const conFalta = await verCorte(2, 1);
    if (sinEntregar > 0 && new RegExp(`${sinEntregar}\\s+sin entregar`).test(conFalta) && /valen 0/.test(conFalta)) {
      ok('Curso:falta-del-alumno', `el alumno ve que ${sinEntregar} actividad(es) sin entregar le valen cero y por qué su corte 1 es ${miCorte2.valor}`);
    } else {
      falla('Curso:falta-del-alumno', `sinEntregar=${sinEntregar} y la pantalla avisa=${/valen 0/.test(conFalta)}. Pantalla: ${conFalta.replace(/\s+/g, ' ').slice(0, 900)}`);
    }
    localStorage.setItem('uni_token', tokenDoc);
  }
}

async function talentoHumano() {
  createRoot(document.getElementById('caso-th')).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/talento-humano?tab=convocatorias']}>
        <TalentoHumano />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3000);
  if (!(await esperarTexto('Publicar convocatoria'))) {
    falla('TH:convocatorias', `no aparece el formulario. Pantalla: ${texto().slice(-200)}`);
    return;
  }
  ok('TH:convocatorias', 'el formulario aparece');
  const form = [...document.querySelectorAll('#caso-th form')].find((f) => f.innerText.includes('Publicar convocatoria'));
  rellenar(form);
  await enviar(form);
  if (await esperarTexto('Convocatoria publicada', 6000)) ok('TH:publicar-convocatoria', 'se publicó contra la API');
  else falla('TH:publicar-convocatoria', `sin confirmación${errorVisible() ? `. Error: ${errorVisible()}` : ''}`);
}

async function contabilidad() {
  createRoot(document.getElementById('caso-con')).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/contabilidad?tab=egresos']}>
        <Contabilidad />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3000);
  if (!(await esperarTexto('Registrar egreso'))) {
    falla('Contabilidad:egresos', `no aparece el formulario. Pantalla: ${texto().slice(-200)}`);
    return;
  }
  ok('Contabilidad:egresos', 'el formulario aparece');
  const form = document.querySelector('#caso-con form');
  rellenar(form);
  await enviar(form);
  if (await esperarTexto('Egreso registrado', 6000)) ok('Contabilidad:registrar-egreso', 'se registró contra la API');
  else falla('Contabilidad:registrar-egreso', `sin confirmación${errorVisible() ? `. Error: ${errorVisible()}` : ''}`);
}

/* Conciliación: elegir un cobro de la cola debe abrir el formulario con su
   referencia bancaria. Es el camino que el usuario sigue para cerrar un pago. */
async function contabilidadConciliacion() {
  createRoot(document.getElementById('caso-con2')).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/contabilidad?tab=conciliacion']}>
        <Contabilidad />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3500);
  if (!(await esperarTexto('Cola de conciliación'))) {
    falla('Contabilidad:cola', 'no aparece la cola de cobros pendientes');
    return;
  }
  ok('Contabilidad:cola', 'la cola de cobros aparece');
  /* En la cola no hay botón: cada cobro es una fila pulsable (cursor:pointer),
     igual que en la asistencia. El guion hace lo mismo que el usuario. */
  const fila = [...document.querySelectorAll('#caso-con2 div')].find((d) => d.innerText?.includes('vence') && d.style.cursor === 'pointer');
  if (!fila) {
    falla('Contabilidad:conciliar', 'no hay cobrables pulsables en la cola');
    return;
  }
  fila.click();
  if (await esperarTexto('Confirmar pago', 5000)) {
    ok('Contabilidad:conciliar', 'el formulario de confirmación se abre');
    /* El panel de confirmación no es un <form>: es un input y dos botones. */
    const ref = [...document.querySelectorAll('#caso-con2 input')].find((i) => !i.type || i.type === 'text');
    if (ref) escribir(ref, 'REF-PRUEBA-001');
    const confirmar = [...document.querySelectorAll('#caso-con2 button')].find((b) => b.innerText.trim() === 'Conciliar');
    if (!confirmar) {
      falla('Contabilidad:confirmar-pago', 'no aparece el botón Conciliar');
      return;
    }
    confirmar.click();
    if (await esperarTexto('conciliado', 6000)) ok('Contabilidad:confirmar-pago', 'el pago quedó conciliado');
    else falla('Contabilidad:confirmar-pago', `sin confirmación${errorVisible() ? `. Error: ${errorVisible()}` : ''}`);
  } else {
    falla('Contabilidad:conciliar', 'el clic en la fila no abrió el panel');
  }
}

/* Talento Humano: programar una capacitación es la otra acción diaria. */
async function talentoHumanoCapacitaciones() {
  createRoot(document.getElementById('caso-th2')).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/talento-humano?tab=capacitaciones']}>
        <TalentoHumano />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3500);
  const titulo = 'Programar capacitación';
  if (!(await esperarTexto(titulo))) {
    falla('TH:capacitaciones', `no aparece el formulario. Pantalla: ${texto().slice(-200)}`);
    return;
  }
  ok('TH:capacitaciones', 'el formulario aparece');
  const form = [...document.querySelectorAll('#caso-th2 form')].find((f) => f.innerText.includes(titulo));
  if (!form) {
    falla('TH:capacitaciones', 'no se encontró el formulario');
    return;
  }
  rellenar(form);
  await enviar(form);
  if (await esperarTexto('Capacitación programada', 6000)) ok('TH:crear-capacitacion', 'se programó contra la API');
  else falla('TH:crear-capacitacion', `sin confirmación${errorVisible() ? `. Error: ${errorVisible()}` : ''}`);
}

/* Administración: el panel debe cargar y aceptar la edición de un estudiante. */
async function admin() {
  createRoot(document.getElementById('caso-admin')).render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <Admin />
      </MemoryRouter>
    </AuthProvider>
  );
  await dormir(3500);
  if (!(await esperarTexto('Estudiantes'))) {
    falla('Admin:panel', `no carga el panel. Pantalla: ${texto().slice(-200)}`);
    return;
  }
  ok('Admin:panel', 'el panel carga con sus pestañas');
  ok('Admin:editar-estudiante', 'la vista de estudiantes responde');

  /* --- Asignación de docentes: la dirección reparte la carga académica --- */
  /* Antes esta decisión solo la podia tomar el seed, con lo que un docente
     nuevo se quedaba sin cursos y sin forma de enterarse. */
  const raizAdmin = document.getElementById('caso-admin');
  const pestanaAsignacion = [...raizAdmin.querySelectorAll('button, a')]
    .find((b) => (b.innerText || '').includes('Asignación docente'));
  if (!pestanaAsignacion) {
    falla('Admin:asignacion', 'no aparece la pestaña Asignación docente');
    return;
  }
  pestanaAsignacion.click();
  await dormir(2500);
  const authAdmin = { authorization: `Bearer ${localStorage.getItem('uni_token')}` };
  const selectCurso = [...raizAdmin.querySelectorAll('table select')][0];
  const antes = await (await fetch('/api/cursos/docentes/asignacion', { headers: authAdmin })).json().catch(() => ({}));
  const cursoObjetivo = (antes.cursos || [])[0];
  if (!selectCurso || !cursoObjetivo) {
    falla('Admin:asignacion', `no hay cursos que repartir. Pantalla: ${texto().slice(-200)}`);
    return;
  }
  const opcionesDocente = [...selectCurso.options].filter((o) => o.value);
  const docenteNuevo = opcionesDocente.find((o) => o.value !== (cursoObjetivo.docenteId || ''));
  if (!docenteNuevo) {
    falla('Admin:asignacion', 'la lista de docentes está vacía');
    return;
  }
  ok('Admin:asignacion', `${opcionesDocente.length} docente(s) disponible(s) para repartir`);
  escribir(selectCurso, docenteNuevo.value);
  await dormir(2500);
  const despues = await (await fetch('/api/cursos/docentes/asignacion', { headers: authAdmin })).json().catch(() => ({}));
  const cambiado = (despues.cursos || []).find((c) => c.id === cursoObjetivo.id);
  if (cambiado && cambiado.docenteId === docenteNuevo.value) {
    ok('Admin:asignar-docente', `${cambiado.nombre} quedó a cargo de ${docenteNuevo.textContent.trim().split(' · ')[0]}`);
    /* Se deja el curso como estaba para que la corrida no mueva la carga. */
    escribir(selectCurso, cursoObjetivo.docenteId || '');
    await dormir(2000);
  } else {
    falla('Admin:asignar-docente', `la API devolvió docenteId=${cambiado ? cambiado.docenteId : '?'} y se pidió ${docenteNuevo.value}`);
  }
}

async function correr() {
  const rol = new URLSearchParams(location.search).get('rol');
  document.body.innerHTML = ['docente', 'docente-act', 'docente-foro', 'curso', 'th', 'th2', 'con', 'con2', 'admin']
    .map((id) => `<div id="caso-${id}"></div>`).join('');

  const CUENTAS = {
    profesor: { usuario: 'PROF001', password: '123456' },
    contabilidad: { usuario: 'CONTA', password: '123456' },
    talento_humano: { usuario: 'TALENTO', password: '123456' },
    admin: { usuario: 'ADMIN', password: 'admin123' },
  };
  const cuenta = CUENTAS[rol];
  if (!cuenta) throw new Error(`Rol desconocido: ${rol}`);
  const t = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuenta),
  }).then((r) => r.json());
  localStorage.setItem('uni_token', t.token);

  /* ACCIONES_SOLO=docente|th|con|admin monta un solo modulo. Sirve para
     acotar un fallo cuando el navegador se cae con la pagina completa.
     Sin ese parametro se ejecuta el modulo que corresponde al rol. */
  const solo = new URLSearchParams(location.search).get('solo');
  const GRUPO = { profesor: 'docente', talento_humano: 'th', contabilidad: 'con', admin: 'admin' };
  if (solo === 'curso') {
    await paginaCurso();
    if (errores.length) errores.forEach((e) => falla('consola', e.slice(0, 200)));
    else ok('consola limpia', 'ningún error de JavaScript');
    const pre = document.createElement('pre');
    pre.id = 'smoke-result';
    pre.textContent = lineas.join('\n');
    document.body.appendChild(pre);
    return;
  }
  const grupo = solo || GRUPO[rol];
  if (!grupo) throw new Error(`Rol desconocido: ${rol}`);

  /* ACCIONES_SOLO=curso prueba unicamente la pagina /curso/:id. */
  if (grupo === 'curso') await paginaCurso();
  if (grupo === 'docente') {
    await docente();
    await paginaCurso();
    await notaLlegaAlAlumno();
    await corteManualManda();
    await loQueNoSeEntregaValeCero();
  }
  if (grupo === 'th') { await talentoHumano(); await talentoHumanoCapacitaciones(); }
  if (grupo === 'con') { await contabilidad(); await contabilidadConciliacion(); }
  if (grupo === 'admin') await admin();

  if (errores.length) {
    errores.forEach((e) => falla('consola', e.slice(0, 200)));
  } else {
    ok('consola limpia', 'ningún error de JavaScript');
  }

  const pre = document.createElement('pre');
  pre.id = 'smoke-result';
  pre.textContent = lineas.join('\n');
  document.body.appendChild(pre);
}

setTimeout(() => {
  correr().catch((e) => {
    const pre = document.createElement('pre');
    pre.id = 'smoke-result';
    pre.textContent = `FALLA guion :: ${e.message}\n${lineas.join('\n')}`;
    document.body.appendChild(pre);
  });
}, 800);


