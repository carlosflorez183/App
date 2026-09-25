/* =============================================
   UniPlataforma — Lógica de Página de Curso
   ============================================= */
const session = AUTH.requireAuth();

// Leer el id del curso desde la URL: curso.html?id=1
const params = new URLSearchParams(window.location.search);
const cursoId = parseInt(params.get('id')) || 1;
const curso = DATA.cursos.find(c => c.id === cursoId) || DATA.cursos[0];
const isProf = session.role === 'profesor' || session.role === 'admin';

// ---- Estado de asistencia (simulado) ----
const asistenciaData = {};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  setupHeader();
  renderHero();
  renderTabInicio();
  renderTabCorte(1);
  renderTabCorte(2);
  renderTabCorte(3);
  renderTabNotas();
  renderTabAsistencia();
  renderTabEstudiantes();
  renderTabRecursos();
  if (isProf) document.getElementById('btn-nuevo-anuncio').classList.remove('hidden');
});

function setupHeader() {
  const ta = document.getElementById('hdr-avatar');
  ta.textContent = session.avatar;
  ta.className = `w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${session.avatarClass}`;
  document.getElementById('hdr-name').textContent = session.name.split(' ')[0];
}

function renderHero() {
  document.getElementById('curso-hero').style.background = curso.color;
  document.getElementById('curso-icon').textContent = curso.icon;
  document.getElementById('curso-nombre').textContent = curso.nombre;
  document.getElementById('curso-codigo').textContent = curso.codigo;
  document.getElementById('curso-profesor').textContent = curso.profesor;
  document.getElementById('curso-estudiantes').textContent = `${curso.estudiantes} estudiantes`;
  document.getElementById('curso-grupo-badge').textContent = `Grupo ${curso.grupo}`;
  document.getElementById('bc-curso').textContent = curso.nombre;
  document.getElementById('stat-estudiantes').textContent = curso.estudiantes;
  document.getElementById('stat-progreso').textContent = curso.progreso + '%';
  const acts = DATA.actividades.filter(a => a.cursoId === cursoId);
  document.getElementById('stat-actividades').textContent = acts.length;
  document.getElementById('stat-pendientes').textContent = acts.filter(a => a.estado_est === 'pendiente').length;
  // Programa según curso
  const prog = DATA.cursos_info[cursoId] || {};
  if (prog.programa) document.getElementById('curso-programa-badge').textContent = prog.programa;
  if (prog.semestre) document.getElementById('curso-semestre-badge').textContent = `${prog.semestre}° Semestre`;
}

// ============================================================
//  TAB: INICIO
// ============================================================
function renderTabInicio() {
  // Anuncios
  const anuncios = DATA.anuncios.filter(a => a.cursoId === cursoId);
  const al = document.getElementById('anuncios-list');
  al.innerHTML = anuncios.length ? anuncios.map(a => `
    <div class="flex gap-3 px-4 py-4 hover:bg-slate-50 transition">
      <div class="w-9 h-9 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fas fa-bullhorn text-sm"></i></div>
      <div class="flex-1">
        <p class="font-semibold text-slate-800 text-sm">${a.titulo}</p>
        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${a.contenido}</p>
        <p class="text-xs text-slate-400 mt-1">${DATA.formatDate(a.fecha)} · ${a.autor}</p>
      </div>
    </div>`).join('') : `<div class="p-6 text-center text-slate-400 text-sm"><i class="fas fa-bullhorn text-2xl mb-2 block opacity-30"></i>Sin anuncios recientes</div>`;

  // Actividades recientes
  const acts = DATA.actividades.filter(a => a.cursoId === cursoId).slice(0, 4);
  const ar = document.getElementById('actividades-recientes');
  ar.innerHTML = acts.map(a => actividadHTML(a, true)).join('');

  // Próximas entregas
  const proximas = DATA.actividades.filter(a => a.cursoId === cursoId && a.estado_est === 'pendiente');
  const pe = document.getElementById('proximas-entregas');
  pe.innerHTML = proximas.length ? proximas.map(a => `
    <div class="flex items-center gap-3 px-4 py-3">
      <div class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-700 truncate">${a.titulo}</p>
        <p class="text-xs text-slate-400">${DATA.formatDate(a.fechaEntrega)}</p>
      </div>
      <span class="text-xs font-bold text-slate-500">${a.puntos}pts</span>
    </div>`).join('')
    : `<div class="p-4 text-center text-xs text-slate-400">¡Sin entregas pendientes!</div>`;
}

// ============================================================
//  TAB: CORTES 1, 2, 3
// ============================================================
const corteConfig = {
  1: { label:'Corte 1', peso:'30%', colorClass:'c1', color:'#10b981', range:'Sem. 1–5', nota:3.8 },
  2: { label:'Corte 2', peso:'30%', colorClass:'c2', color:'#3b82f6', range:'Sem. 6–10', nota:4.0 },
  3: { label:'Corte 3', peso:'40%', colorClass:'c3', color:'#8b5cf6', range:'Sem. 11–16', nota:null },
};

function renderTabCorte(n) {
  const cfg = corteConfig[n];
  const acts = DATA.actividades.filter(a => a.cursoId === cursoId && a.corte === n);
  const container = document.getElementById(`tab-corte${n}`);

  container.innerHTML = `
  <div>
    <div class="corte-header ${cfg.colorClass}">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="corte-badge ${cfg.colorClass}">${cfg.label}</span>
          <span class="text-xs text-slate-500">Peso: <strong>${cfg.peso}</strong> de la nota final</span>
          <span class="text-xs text-slate-400">· ${cfg.range}</span>
        </div>
        <h2 class="text-lg font-bold text-slate-800">${cfg.label} — ${curso.nombre}</h2>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-center">
          <div class="text-2xl font-black ${cfg.nota?(cfg.nota>=3?'text-green-600':'text-red-600'):'text-slate-300'}">${cfg.nota || '—'}</div>
          <div class="text-xs text-slate-500">Nota corte</div>
        </div>
        ${isProf ? `<button onclick="nuevaActividadModal(${n})" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i>Actividad</button>` : ''}
      </div>
    </div>

    ${acts.length === 0 ? `
    <div class="card p-10 text-center text-slate-400">
      <i class="fas fa-tasks text-4xl mb-3 block opacity-30"></i>
      <p class="font-semibold">No hay actividades en este corte</p>
      ${isProf ? `<button onclick="nuevaActividadModal(${n})" class="btn btn-primary btn-sm mt-4"><i class="fas fa-plus mr-1"></i>Agregar primera actividad</button>` : ''}
    </div>` : `
    <div class="space-y-3">${acts.map(a => actividadHTML(a)).join('')}</div>`}

    ${isProf ? `
    <div class="card mt-4">
      <div class="card-header"><span class="card-title"><i class="fas fa-star text-yellow-500"></i> Notas del ${cfg.label}</span>
        <button onclick="showToast('Guardando notas...','success')" class="btn btn-success btn-sm"><i class="fas fa-save mr-1"></i>Guardar notas</button>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Estudiante</th><th>Código</th>${acts.map(a=>`<th class="text-center text-xs">${a.titulo.split(' ').slice(0,3).join(' ')} (${a.puntos}pts)</th>`).join('')}<th class="text-center">Nota Corte</th></tr></thead>
          <tbody>${DATA.listaEstudiantes.map((e,i) => {
            const bg = ['av-blue','av-green','av-purple','av-red','av-yellow'];
            const notaCorte = (3.5 + Math.random()*1.4).toFixed(1);
            return `<tr>
              <td><div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full ${bg[i%bg.length]} flex items-center justify-center text-white text-xs font-bold">${e.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                <span class="font-semibold text-sm">${e.nombre}</span></div></td>
              <td class="font-mono text-xs text-slate-400">${e.codigo}</td>
              ${acts.map(()=>`<td class="text-center"><input type="number" min="0" max="5" step="0.1" class="nota-input" placeholder="—" oninput="colorNota(this)"/></td>`).join('')}
              <td class="text-center"><span class="font-black text-lg ${parseFloat(notaCorte)>=3?'text-green-600':'text-red-600'}">${notaCorte}</span></td>
            </tr>`;}).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `
    <div class="card mt-4">
      <div class="card-header"><span class="card-title"><i class="fas fa-star text-yellow-500"></i> Mis notas — ${cfg.label}</span></div>
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Actividad</th><th class="text-center">Puntos obtenidos</th><th class="text-center">Total</th><th class="text-center">Nota</th></tr></thead>
            <tbody>${acts.map(a => `<tr>
              <td class="font-semibold">${a.titulo}</td>
              <td class="text-center font-bold ${a.nota?(a.nota/a.puntos*5>=3?'text-green-600':'text-red-600'):'text-slate-300'}">${a.nota || '—'}</td>
              <td class="text-center text-slate-500">${a.puntos}</td>
              <td class="text-center"><span class="font-black text-lg ${a.nota?(a.nota/a.puntos*5>=3?'text-green-600':'text-red-600'):'text-slate-400'}">${a.nota ? (a.nota/a.puntos*5).toFixed(1) : '—'}</span></td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`}
  </div>`;
}

function actividadHTML(a, compact=false) {
  const iconMap = {taller:'fa-tools',quiz:'fa-question-circle',proyecto:'fa-project-diagram',informe:'fa-file-alt',examen:'fa-pen-alt',parcial:'fa-pen-square'};
  const colorMap = {taller:'act-taller',quiz:'act-quiz',proyecto:'act-proyecto',informe:'act-informe',examen:'act-examen',parcial:'act-parcial'};
  const estadoBadge = a.estado_est==='calificado'
    ? `<span class="badge-status badge-green">✓ ${a.nota}/${a.puntos}</span>`
    : a.estado_est==='entregado'
    ? `<span class="badge-status badge-blue">Entregado</span>`
    : `<span class="badge-status badge-yellow">Pendiente</span>`;

  if (compact) return `
    <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
      <div class="act-icon ${colorMap[a.tipo]||'act-taller'} w-9 h-9 rounded-lg"><i class="fas ${iconMap[a.tipo]||'fa-tasks'} text-sm"></i></div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm text-slate-800 truncate">${a.titulo}</p>
        <p class="text-xs text-slate-400">Corte ${a.corte||'?'} · ${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</p>
      </div>
      ${estadoBadge}
    </div>`;

  return `
    <div class="actividad-item">
      <div class="act-icon ${colorMap[a.tipo]||'act-taller'}"><i class="fas ${iconMap[a.tipo]||'fa-tasks'}"></i></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5 flex-wrap">
          <span class="font-bold text-slate-800">${a.titulo}</span>
          <span class="text-xs font-semibold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">${a.tipo}</span>
        </div>
        <p class="text-sm text-slate-500 leading-relaxed">${a.descripcion}</p>
        <div class="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
          <span><i class="fas fa-calendar mr-1"></i>${DATA.formatDate(a.fechaEntrega)}</span>
          <span><i class="fas fa-star mr-1"></i>${a.puntos} puntos</span>
          ${a.corte ? `<span><i class="fas fa-layer-group mr-1"></i>Corte ${a.corte}</span>` : ''}
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        ${estadoBadge}
        ${!isProf && a.estado_est==='pendiente' ? `<button onclick="entregarModal(${a.id})" class="btn btn-primary btn-sm"><i class="fas fa-upload mr-1"></i>Entregar</button>` : ''}
        ${isProf ? `<button onclick="verEntregasModal(${a.id})" class="btn btn-secondary btn-sm"><i class="fas fa-inbox mr-1"></i>Entregas</button>` : ''}
      </div>
    </div>`;
}

// ============================================================
//  TAB: NOTAS (consolidado)
// ============================================================
function renderTabNotas() {
  const c = document.getElementById('tab-notas');
  const acts = DATA.actividades.filter(a => a.cursoId === cursoId);
  const cortes = [1,2,3];

  if (isProf) {
    c.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-star text-yellow-500"></i> Consolidado de Notas — ${curso.nombre}</span>
        <div class="flex gap-2">
          <button onclick="showToast('Guardando todas las notas...','success')" class="btn btn-success btn-sm"><i class="fas fa-save mr-1"></i>Guardar todo</button>
          <button onclick="showToast('Exportando a Excel...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-file-excel mr-1"></i>Exportar</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th rowspan="2">Estudiante</th>
              <th colspan="${acts.filter(a=>a.corte===1).length+1}" class="text-center border-l-2 border-green-300" style="background:#f0fdf4;color:#15803d">Corte 1 (30%)</th>
              <th colspan="${acts.filter(a=>a.corte===2).length+1}" class="text-center border-l-2 border-blue-300" style="background:#eff6ff;color:#1d4ed8">Corte 2 (30%)</th>
              <th colspan="${acts.filter(a=>a.corte===3).length+1}" class="text-center border-l-2 border-purple-300" style="background:#f5f3ff;color:#6d28d9">Corte 3 (40%)</th>
              <th rowspan="2" class="text-center">Definitiva</th>
            </tr>
            <tr>
              ${cortes.map(cn => {
                const ca = acts.filter(a=>a.corte===cn);
                return ca.map(a=>`<th class="text-center text-xs font-semibold" style="min-width:80px">${a.titulo.split(' ')[0]}</th>`).join('') + '<th class="text-center text-xs font-bold">NC</th>';
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${DATA.listaEstudiantes.map((e,i) => {
              const bg=['av-blue','av-green','av-purple','av-red','av-yellow'];
              let notaFinal = 0;
              let cortesHTML = cortes.map(cn => {
                const ca = acts.filter(a=>a.corte===cn);
                const pesos = {1:0.3,2:0.3,3:0.4};
                const nc = (3.2 + Math.random()*1.6).toFixed(1);
                notaFinal += parseFloat(nc) * pesos[cn];
                return ca.map(()=>`<td class="text-center"><input type="number" min="0" max="5" step="0.1" class="nota-input" style="width:60px" placeholder="—" oninput="colorNota(this)"/></td>`).join('')
                  + `<td class="text-center font-black text-base ${parseFloat(nc)>=3?'text-green-600':'text-red-600'}">${nc}</td>`;
              }).join('');
              notaFinal = notaFinal.toFixed(1);
              return `<tr>
                <td><div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full ${bg[i%bg.length]} flex items-center justify-center text-white text-xs font-bold">${e.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                  <div><p class="font-semibold text-sm">${e.nombre}</p><p class="text-xs text-slate-400">${e.codigo}</p></div>
                </div></td>
                ${cortesHTML}
                <td class="text-center"><div class="nota-circle ${parseFloat(notaFinal)>=3?'aprobado':'reprobado'} mx-auto">${notaFinal}</div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  } else {
    // Vista estudiante
    c.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-4">
      ${cortes.map(cn => {
        const cfg = corteConfig[cn];
        const ca = acts.filter(a=>a.corte===cn);
        const nota = cfg.nota;
        return `
        <div class="card">
          <div class="card-header">
            <span class="card-title"><span class="corte-badge ${cfg.colorClass} mr-2">${cfg.label}</span> ${cfg.peso} nota final</span>
            <span class="font-black text-xl ${nota?(nota>=3?'text-green-600':'text-red-600'):'text-slate-300'}">${nota||'—'}</span>
          </div>
          ${ca.length ? `<div class="divide-y divide-slate-100">
            ${ca.map(a=>`<div class="flex items-center justify-between px-4 py-3">
              <div><p class="font-semibold text-sm">${a.titulo}</p><p class="text-xs text-slate-400">${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</p></div>
              <span class="font-black text-lg ${a.nota?(a.nota/a.puntos*5>=3?'text-green-600':'text-red-600'):'text-slate-300'}">${a.nota ? (a.nota/a.puntos*5).toFixed(1) : '—'}</span>
            </div>`).join('')}
          </div>` : `<div class="p-4 text-center text-xs text-slate-400">Sin actividades en este corte</div>`}
        </div>`;
      }).join('')}
      <div class="card">
        <div class="card-body flex items-center justify-between">
          <span class="font-bold text-slate-700 text-lg">Nota definitiva estimada</span>
          <span class="font-black text-3xl text-indigo-600">3.9</span>
        </div>
      </div>
    </div>`;
  }
}

// ============================================================
//  TAB: ASISTENCIA
// ============================================================
function renderTabAsistencia() {
  const cont = document.getElementById('tab-asistencia');
  // Fechas de clases simuladas
  const fechas = [
    '2026-07-28','2026-08-04','2026-08-11','2026-08-18','2026-08-25',
    '2026-09-01','2026-09-08','2026-09-15','2026-09-22'
  ];
  let fechaActiva = fechas[fechas.length - 1];

  function buildAsistencia(fecha) {
    if (!asistenciaData[fecha]) {
      asistenciaData[fecha] = DATA.listaEstudiantes.map(e => ({
        id: e.id, estado: ['P','P','P','A','P','T'][Math.floor(Math.random()*6)]
      }));
    }
    return asistenciaData[fecha];
  }

  function render(fecha) {
    const lista = buildAsistencia(fecha);
    const presentes = lista.filter(x=>x.estado==='P').length;
    const ausentes = lista.filter(x=>x.estado==='A').length;
    const tardanzas = lista.filter(x=>x.estado==='T').length;

    cont.innerHTML = `
    <div class="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div>
        <h2 class="font-bold text-slate-800 text-lg flex items-center gap-2">
          <i class="fas fa-clipboard-list text-blue-600"></i> Control de Asistencia
        </h2>
        <p class="text-sm text-slate-500 mt-0.5">${curso.nombre} · ${curso.estudiantes} estudiantes matriculados</p>
      </div>
      ${isProf ? `<div class="flex gap-2">
        <button onclick="guardarAsistencia('${fecha}')" class="btn btn-success btn-sm"><i class="fas fa-save mr-1"></i>Guardar</button>
        <button onclick="showToast('Exportando asistencia...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-download mr-1"></i>Exportar</button>
      </div>` : ''}
    </div>

    <!-- Selector de fechas -->
    <div class="flex gap-2 overflow-x-auto pb-2 mb-4">
      ${fechas.map(f => `<button class="fecha-chip ${f===fecha?'active':''}" onclick="cambiarFechaAsist('${f}')">${DATA.formatDate(f)}</button>`).join('')}
      ${isProf ? `<button onclick="nuevaFechaModal()" class="fecha-chip border-dashed text-blue-600 border-blue-300"><i class="fas fa-plus mr-1"></i>Nueva fecha</button>` : ''}
    </div>

    <!-- Resumen -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
        <div class="text-2xl font-black text-green-600">${presentes}</div>
        <div class="text-xs font-semibold text-green-700 mt-0.5">Presentes</div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
        <div class="text-2xl font-black text-red-600">${ausentes}</div>
        <div class="text-xs font-semibold text-red-700 mt-0.5">Ausentes</div>
      </div>
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
        <div class="text-2xl font-black text-yellow-600">${tardanzas}</div>
        <div class="text-xs font-semibold text-yellow-700 mt-0.5">Tardanzas</div>
      </div>
    </div>

    <!-- Leyenda -->
    <div class="flex gap-3 mb-3 text-xs font-semibold">
      <span class="flex items-center gap-1"><span class="w-5 h-5 bg-green-200 text-green-700 rounded flex items-center justify-center font-bold">P</span> Presente</span>
      <span class="flex items-center gap-1"><span class="w-5 h-5 bg-red-200 text-red-700 rounded flex items-center justify-center font-bold">A</span> Ausente</span>
      <span class="flex items-center gap-1"><span class="w-5 h-5 bg-yellow-200 text-yellow-700 rounded flex items-center justify-center font-bold">T</span> Tardanza</span>
    </div>

    <!-- Lista de estudiantes -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-users text-slate-500"></i> Listado — ${DATA.formatDate(fecha)}</span>
        ${isProf ? `<div class="flex gap-2 text-xs">
          <button onclick="marcarTodos('${fecha}','P')" class="bg-green-100 text-green-700 px-2 py-1 rounded font-semibold hover:bg-green-200 transition">Todos presentes</button>
          <button onclick="marcarTodos('${fecha}','A')" class="bg-red-100 text-red-700 px-2 py-1 rounded font-semibold hover:bg-red-200 transition">Todos ausentes</button>
        </div>` : ''}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full asist-table">
          <thead><tr><th>#</th><th>Estudiante</th><th>Código</th><th class="text-center">Estado</th>${isProf?'<th class="text-center">Observación</th>':''}</tr></thead>
          <tbody>
            ${lista.map((item,i) => {
              const est = DATA.listaEstudiantes.find(e=>e.id===item.id);
              const bgs = ['av-blue','av-green','av-purple','av-red','av-yellow'];
              const bg = bgs[i % bgs.length];
              const estadoMap = {P:{cls:'present',label:'P',full:'Presente'},A:{cls:'absent',label:'A',full:'Ausente'},T:{cls:'late',label:'T',full:'Tardanza'}};
              const st = estadoMap[item.estado] || estadoMap['P'];
              return `<tr>
                <td class="text-slate-400 text-xs">${i+1}</td>
                <td><div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full ${bg} flex items-center justify-center text-white text-xs font-bold">
                    ${est.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                  <span class="font-semibold text-sm">${est.nombre}</span></div></td>
                <td class="font-mono text-xs text-slate-400">${est.codigo}</td>
                <td class="text-center">
                  ${isProf ? `
                  <div class="flex items-center justify-center gap-1" id="asist-btns-${item.id}">
                    <button class="asist-btn ${item.estado==='P'?'present':'none'}" onclick="setAsistencia('${fecha}',${item.id},'P')" title="Presente">P</button>
                    <button class="asist-btn ${item.estado==='A'?'absent':'none'}" onclick="setAsistencia('${fecha}',${item.id},'A')" title="Ausente">A</button>
                    <button class="asist-btn ${item.estado==='T'?'late':'none'}" onclick="setAsistencia('${fecha}',${item.id},'T')" title="Tardanza">T</button>
                  </div>` : `<span class="badge-status ${item.estado==='P'?'badge-green':item.estado==='A'?'badge-red':'badge-yellow'}">${st.full}</span>`}
                </td>
                ${isProf ? `<td><input type="text" placeholder="Observación..." class="form-control text-xs" style="padding:4px 8px;min-width:140px"/></td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <!-- Resumen de asistencia por estudiante -->
      <div class="p-4 bg-slate-50 border-t">
        <p class="text-xs font-semibold text-slate-500 mb-2">RESUMEN GLOBAL DE ASISTENCIA</p>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          ${DATA.listaEstudiantes.map((e,i) => {
            const pct = Math.floor(65 + Math.random()*35);
            const color = pct >= 80 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : 'text-red-600';
            return `<div class="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200">
              <span class="text-xs font-medium text-slate-600 flex-1 truncate">${e.nombre.split(' ')[0]} ${e.nombre.split(' ')[2]||''}</span>
              <span class="font-bold text-sm ${color}">${pct}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  window.cambiarFechaAsist = (f) => { fechaActiva = f; render(f); };
  window.setAsistencia = (fecha, id, estado) => {
    const reg = asistenciaData[fecha];
    if (reg) { const item = reg.find(x=>x.id===id); if(item) item.estado = estado; }
    render(fecha);
  };
  window.marcarTodos = (fecha, estado) => {
    buildAsistencia(fecha).forEach(x=>x.estado=estado);
    render(fecha);
    showCToast(`Todos marcados como ${estado==='P'?'presentes':'ausentes'}`, 'success');
  };
  window.guardarAsistencia = (fecha) => {
    showCToast(`Asistencia del ${DATA.formatDate(fecha)} guardada`, 'success');
  };
  window.nuevaFechaModal = () => {
    openCursoModal('Nueva sesión', `<div class="form-group"><label class="form-label">Fecha de la clase</label><input type="date" class="form-control" id="nueva-fecha-inp"/></div>
      <div class="form-group"><label class="form-label">Tema de la sesión</label><input type="text" class="form-control" placeholder="Ej: Introducción a la normalización"/></div>`,
      `<button class="btn btn-secondary" onclick="closeCursoModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="closeCursoModal();showCToast('Sesión agregada','success')"><i class="fas fa-check mr-1"></i>Agregar</button>`);
  };

  render(fechaActiva);
}

// ============================================================
//  TAB: ESTUDIANTES
// ============================================================
function renderTabEstudiantes() {
  const bgs = ['av-blue','av-green','av-purple','av-red','av-yellow'];
  document.getElementById('tab-estudiantes').innerHTML = `
  <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
    <h2 class="font-bold text-slate-800 text-lg flex items-center gap-2">
      <i class="fas fa-users text-blue-600"></i> Estudiantes Matriculados — ${curso.nombre}
    </h2>
    <div class="flex gap-2">
      <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
        <i class="fas fa-search text-slate-400 text-xs"></i>
        <input type="text" id="search-est" placeholder="Buscar estudiante..." class="outline-none text-slate-700 text-sm w-40" oninput="filtrarEstudiantes(this.value)"/>
      </div>
      ${isProf ? `<button onclick="showCToast('Exportando lista...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-download mr-1"></i>Exportar</button>` : ''}
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-list text-slate-500"></i> ${DATA.listaEstudiantes.length} estudiantes</span>
      <span class="badge-status badge-green">${DATA.listaEstudiantes.length} activos</span>
    </div>
    <div id="estudiantes-lista">
      ${DATA.listaEstudiantes.map((e,i) => {
        const notaFinal = (3.5 + Math.random()*1.4).toFixed(1);
        const asist = Math.floor(70 + Math.random()*30);
        return `
        <div class="estudiante-row est-item" data-nombre="${e.nombre.toLowerCase()}">
          <div class="text-xs text-slate-400 w-5">${i+1}</div>
          <div class="est-avatar ${bgs[i%bgs.length]}">${e.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 text-sm">${e.nombre}</p>
            <p class="text-xs text-slate-400"><span class="font-mono">${e.codigo}</span></p>
          </div>
          <div class="hidden md:flex items-center gap-4 text-sm">
            <div class="text-center">
              <div class="font-black ${parseFloat(notaFinal)>=3?'text-green-600':'text-red-600'}">${notaFinal}</div>
              <div class="text-xs text-slate-400">Nota</div>
            </div>
            <div class="text-center">
              <div class="font-black ${asist>=80?'text-green-600':asist>=70?'text-yellow-600':'text-red-600'}">${asist}%</div>
              <div class="text-xs text-slate-400">Asistencia</div>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="verEstudianteModal('${e.nombre}','${e.codigo}',${notaFinal},${asist})" class="btn btn-secondary btn-sm"><i class="fas fa-eye text-xs"></i></button>
            ${isProf ? `<button onclick="showCToast('Enviando mensaje a ${e.nombre.split(' ')[0]}...','info')" class="btn btn-outline btn-sm"><i class="fas fa-envelope text-xs"></i></button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

window.filtrarEstudiantes = (q) => {
  document.querySelectorAll('.est-item').forEach(el => {
    el.style.display = el.dataset.nombre.includes(q.toLowerCase()) ? '' : 'none';
  });
};

window.verEstudianteModal = (nombre, codigo, nota, asist) => {
  openCursoModal(`👤 ${nombre}`, `
  <div class="space-y-4">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 av-blue rounded-2xl flex items-center justify-center text-white text-2xl font-black">${nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
      <div><p class="font-bold text-lg">${nombre}</p><p class="text-sm text-slate-500 font-mono">${codigo}</p></div>
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-slate-50 rounded-xl p-3 text-center">
        <div class="font-black text-2xl ${nota>=3?'text-green-600':'text-red-600'}">${nota}</div>
        <div class="text-xs text-slate-500">Nota actual</div>
      </div>
      <div class="bg-slate-50 rounded-xl p-3 text-center">
        <div class="font-black text-2xl ${asist>=80?'text-green-600':asist>=70?'text-yellow-600':'text-red-600'}">${asist}%</div>
        <div class="text-xs text-slate-500">Asistencia</div>
      </div>
      <div class="bg-slate-50 rounded-xl p-3 text-center">
        <div class="font-black text-2xl text-blue-600">${DATA.actividades.filter(a=>a.cursoId===cursoId&&a.estado_est!=='pendiente').length}</div>
        <div class="text-xs text-slate-500">Entregas</div>
      </div>
    </div>
    <div>
      <p class="font-semibold text-sm text-slate-700 mb-2">Notas por corte:</p>
      ${[1,2,3].map(n => {
        const nc = (3.2+Math.random()*1.6).toFixed(1);
        return `<div class="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
          <span class="text-sm text-slate-600">Corte ${n} <span class="text-xs text-slate-400">(${n===3?40:30}%)</span></span>
          <span class="font-bold ${parseFloat(nc)>=3?'text-green-600':'text-red-600'}">${nc}</span>
        </div>`;
      }).join('')}
      <div class="flex items-center justify-between py-2">
        <span class="font-bold text-slate-700">Definitiva estimada</span>
        <span class="font-black text-xl text-indigo-600">${nota}</span>
      </div>
    </div>
  </div>`);
};

// ============================================================
//  TAB: RECURSOS
// ============================================================
function renderTabRecursos() {
  const recursos = [
    {nombre:'Guía_Normalización_3FN.pdf',tipo:'pdf',tamaño:'2.3 MB',fecha:'2026-08-15',descripcion:'Guía de normalización hasta tercera forma normal'},
    {nombre:'Diapositivas_Semana1-5.pptx',tipo:'ppt',tamaño:'8.4 MB',fecha:'2026-07-30',descripcion:'Presentaciones del primer bloque temático'},
    {nombre:'Ejercicios_SQL_Avanzado.zip',tipo:'zip',tamaño:'1.1 MB',fecha:'2026-08-10',descripcion:'Conjunto de ejercicios prácticos SQL'},
    {nombre:'Videoclase_Sem8_JOIN_Avanzado.mp4',tipo:'video',tamaño:'380 MB',fecha:'2026-08-20',descripcion:'Grabación de clase — JOINs complejos'},
    {nombre:'Enunciado_Proyecto_Final.pdf',tipo:'pdf',tamaño:'540 KB',fecha:'2026-08-25',descripcion:'Descripción completa del proyecto final'},
  ];
  const iconMap = {pdf:'fa-file-pdf text-red-500',ppt:'fa-file-powerpoint text-orange-500',zip:'fa-file-archive text-yellow-600',video:'fa-file-video text-purple-500',doc:'fa-file-word text-blue-500'};

  document.getElementById('tab-recursos').innerHTML = `
  <div class="flex justify-between items-center mb-4">
    <h2 class="font-bold text-slate-800 text-lg flex items-center gap-2"><i class="fas fa-folder-open text-yellow-500"></i> Recursos del Curso</h2>
    ${isProf ? `<button onclick="subirRecursoModal()" class="btn btn-primary btn-sm"><i class="fas fa-upload mr-1"></i>Subir Material</button>` : ''}
  </div>
  <div class="card">
    <div class="divide-y divide-slate-100">
      ${recursos.map(r=>`
      <div class="recurso-item">
        <div class="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          <i class="fas ${iconMap[r.tipo]||'fa-file text-slate-400'}"></i></div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-slate-800">${r.nombre}</p>
          <p class="text-xs text-slate-500 mt-0.5">${r.descripcion}</p>
          <p class="text-xs text-slate-400 mt-0.5">${r.tamaño} · Subido ${DATA.formatDate(r.fecha)}</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button onclick="showCToast('Descargando ${r.nombre}','info')" class="btn btn-primary btn-sm"><i class="fas fa-download mr-1"></i>Descargar</button>
          ${isProf ? `<button onclick="showCToast('Eliminando...','error')" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ============================================================
//  Helpers: Modal, Toast, Actividades
// ============================================================
function openCursoModal(title, body, footer) {
  document.getElementById('curso-modal-title').textContent = title;
  document.getElementById('curso-modal-body').innerHTML = body;
  document.getElementById('curso-modal-footer').innerHTML = footer || '<button class="btn btn-secondary" onclick="closeCursoModal()">Cerrar</button>';
  document.getElementById('curso-modal').classList.add('open');
}
function closeCursoModal() { document.getElementById('curso-modal').classList.remove('open'); }
document.getElementById('curso-modal').addEventListener('click', function(e){ if(e.target===this) closeCursoModal(); });

function showCToast(msg, type='success') {
  const t = document.getElementById('c-toast');
  const icons = {success:'fa-check-circle',error:'fa-times-circle',info:'fa-info-circle',warning:'fa-exclamation-triangle'};
  t.className = 'toast ' + type;
  document.getElementById('c-toast-icon').className = 'fas ' + (icons[type]||'fa-info-circle');
  document.getElementById('c-toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function showTab(name) {
  document.querySelectorAll('.curso-view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.curso-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+name)?.classList.add('active');
  document.querySelector(`[data-tab="${name}"]`)?.classList.add('active');
}

function colorNota(input) {
  const v = parseFloat(input.value);
  input.classList.remove('aprobado','reprobado');
  if (!isNaN(v)) input.classList.add(v>=3?'aprobado':'reprobado');
}

window.entregarModal = (id) => {
  const a = DATA.actividades.find(x=>x.id===id);
  openCursoModal(`Entregar: ${a.titulo}`, `
  <div class="space-y-4">
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
      <p class="font-semibold text-blue-800">${a.titulo}</p>
      <p class="text-blue-600 text-xs mt-1">Corte ${a.corte} · Fecha límite: ${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} puntos</p>
    </div>
    <div class="upload-zona" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" onclick="document.getElementById('f-inp-${id}').click()">
      <i class="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3 block"></i>
      <p class="font-semibold text-slate-600">Arrastra tu archivo aquí</p>
      <p class="text-xs text-slate-400 mt-1">PDF, DOCX, ZIP — máx. 20MB</p>
      <input type="file" id="f-inp-${id}" class="hidden" accept=".pdf,.docx,.zip" onchange="this.nextElementSibling.classList.remove('hidden');this.nextElementSibling.querySelector('span').textContent=this.files[0].name"/>
      <div class="hidden mt-3 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-700 flex items-center gap-2"><i class="fas fa-check"></i><span></span></div>
    </div>
    <div class="form-group"><label class="form-label">Comentario para el docente</label><textarea class="form-control" rows="2" placeholder="Opcional..."></textarea></div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeCursoModal()">Cancelar</button>
   <button class="btn btn-success" onclick="DATA.actividades.find(x=>x.id===${id}).estado_est='entregado';closeCursoModal();showCToast('¡Entrega exitosa! 🎉','success');renderTabCorte(${a.corte});renderTabNotas()"><i class="fas fa-paper-plane mr-1"></i>Enviar</button>`);
};

window.verEntregasModal = (id) => {
  const a = DATA.actividades.find(x=>x.id===id);
  const rows = DATA.listaEstudiantes.map((e,i) => `
    <tr>
      <td class="font-semibold text-sm">${e.nombre}</td>
      <td><span class="badge-status badge-blue">Entregado</span></td>
      <td><input type="number" min="0" max="${a.puntos}" class="nota-input" style="width:65px" placeholder="—" oninput="colorNota(this)"/><span class="text-xs text-slate-400">/${a.puntos}</span></td>
      <td><button onclick="showCToast('Nota guardada','success')" class="btn btn-success btn-sm"><i class="fas fa-check"></i></button></td>
    </tr>`).join('');
  openCursoModal(`Entregas: ${a.titulo}`,
    `<table class="data-table"><thead><tr><th>Estudiante</th><th>Estado</th><th>Calificación</th><th></th></tr></thead><tbody>${rows}</tbody></table>`);
};

window.nuevaActividadModal = (corteNum) => {
  openCursoModal(`Nueva Actividad — Corte ${corteNum}`, `
  <div class="space-y-3">
    <div class="form-group"><label class="form-label">Título</label><input type="text" class="form-control" placeholder="Ej: Taller 3 — Subconsultas SQL"/></div>
    <div class="grid grid-cols-2 gap-3">
      <div class="form-group"><label class="form-label">Tipo</label>
        <select class="form-control"><option>Taller</option><option>Quiz</option><option>Proyecto</option><option>Informe</option><option>Parcial</option><option>Examen Final</option></select></div>
      <div class="form-group"><label class="form-label">Puntos</label><input type="number" class="form-control" value="50"/></div>
    </div>
    <div class="form-group"><label class="form-label">Fecha de entrega</label><input type="date" class="form-control"/></div>
    <div class="form-group"><label class="form-label">Descripción</label><textarea class="form-control" rows="3" placeholder="Descripción detallada..."></textarea></div>
    <div class="upload-zona" onclick="showCToast('Adjuntar enunciado...','info')">
      <i class="fas fa-paperclip text-xl text-slate-400 mb-1 block"></i>
      <p class="text-sm text-slate-500">Adjuntar enunciado o guía (opcional)</p>
    </div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeCursoModal()">Cancelar</button>
   <button class="btn btn-primary" onclick="closeCursoModal();showCToast('Actividad publicada en Corte ${corteNum}','success')"><i class="fas fa-check mr-1"></i>Publicar</button>`);
};

window.nuevoAnuncioModal = () => {
  openCursoModal('Nuevo Anuncio', `
  <div class="space-y-3">
    <div class="form-group"><label class="form-label">Título</label><input type="text" class="form-control" placeholder="Título del anuncio"/></div>
    <div class="form-group"><label class="form-label">Mensaje</label><textarea class="form-control" rows="4" placeholder="Escribe el anuncio para tus estudiantes..."></textarea></div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeCursoModal()">Cancelar</button>
   <button class="btn btn-primary" onclick="closeCursoModal();showCToast('Anuncio publicado','success')"><i class="fas fa-check mr-1"></i>Publicar</button>`);
};

window.subirRecursoModal = () => {
  openCursoModal('Subir Material', `
  <div class="space-y-3">
    <div class="upload-zona" onclick="document.getElementById('res-inp').click()">
      <i class="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3 block"></i>
      <p class="font-semibold text-slate-600">Seleccionar archivo</p>
      <p class="text-xs text-slate-400 mt-1">PDF, PPT, DOCX, ZIP, MP4 — máx. 500MB</p>
      <input type="file" id="res-inp" class="hidden"/>
    </div>
    <div class="form-group"><label class="form-label">Descripción</label><input type="text" class="form-control" placeholder="Descripción breve del archivo"/></div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeCursoModal()">Cancelar</button>
   <button class="btn btn-primary" onclick="closeCursoModal();showCToast('Recurso subido correctamente','success')"><i class="fas fa-upload mr-1"></i>Subir</button>`);
};
