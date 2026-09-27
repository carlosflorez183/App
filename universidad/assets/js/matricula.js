/* =============================================
   UniPlataforma — Lógica de Matrícula
   ============================================= */
const session = AUTH.requireAuth();

// ---- Estado global ----
let estado = {
  paso: 0,
  modalidad: null,
  programa: null,
  semestre: null,
  seleccionadas: [],   // ids de materias
};

document.addEventListener('DOMContentLoaded', () => {
  setupHeader();
  renderPaso0();
});

function setupHeader() {
  const ta = document.getElementById('hdr-avatar');
  ta.textContent = session.avatar;
  ta.className = `w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${session.avatarClass}`;
  document.getElementById('hdr-name').textContent = session.name.split(' ')[0];
}

// ============================================================
//  NAVEGACIÓN DE PASOS
// ============================================================
function irPaso(n) {
  document.querySelectorAll('.paso').forEach(p => p.classList.remove('active'));
  document.getElementById(`paso-${n}`).classList.add('active');

  // Actualizar stepper
  for (let i = 0; i <= 4; i++) {
    const s = document.getElementById(`step-${i}`);
    s.classList.remove('active','done');
    if (i < n) s.classList.add('done');
    else if (i === n) s.classList.add('active');
  }

  // Marcar done con ✓
  document.querySelectorAll('.step-item.done .step-circle').forEach(c => {
    if (!c.innerHTML.includes('fa-check')) c.innerHTML = '<i class="fas fa-check text-xs"></i>';
  });
  document.querySelectorAll('.step-item:not(.done) .step-circle').forEach((c,i) => {
    if (!c.querySelector('i')) c.textContent = i+1;
  });

  estado.paso = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
//  PASO 0: MODALIDAD
// ============================================================
function renderPaso0() {
  const grid = document.getElementById('modalidad-grid');
  grid.innerHTML = DATA.matricula.modalidades.map(m => `
    <div class="modalidad-card ${estado.modalidad?.id===m.id?'selected':''}" onclick="seleccionarModalidad(${m.id})">
      <div class="modalidad-icon ${m.bgClass}">${m.icon}</div>
      <h3 class="font-bold text-slate-800 text-sm">${m.nombre}</h3>
      <p class="text-xs text-slate-500 mt-1">${m.descripcion}</p>
      <p class="text-xs font-semibold text-indigo-600 mt-2">${m.programas} programas</p>
    </div>`).join('');
}

function seleccionarModalidad(id) {
  estado.modalidad = DATA.matricula.modalidades.find(m => m.id === id);
  renderPaso0();
  renderPaso1();
  irPaso(1);
}

// ============================================================
//  PASO 1: PROGRAMA
// ============================================================
function renderPaso1() {
  const m = estado.modalidad;
  document.getElementById('breadcrumb-modalidad').innerHTML = `<i class="fas fa-layer-group mr-1 text-indigo-400"></i>${m.nombre}`;
  const programas = DATA.matricula.programas.filter(p => p.modalidadId === m.id);
  renderListaProgramas(programas);
}

function renderListaProgramas(lista) {
  const grid = document.getElementById('programas-grid');
  grid.innerHTML = lista.map(p => `
    <div class="programa-item ${estado.programa?.id===p.id?'selected':''}" onclick="seleccionarPrograma(${p.id})">
      <div class="programa-dot ${p.bgClass}">${p.icon}</div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-slate-800 text-sm">${p.nombre}</p>
        <p class="text-xs text-slate-500 mt-0.5">${p.facultad} · ${p.semestres} semestres · <span class="font-semibold">${p.creditos} créditos</span></p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold">${p.snies}</span>
          <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">${p.jornada}</span>
        </div>
      </div>
      ${estado.programa?.id===p.id ? `<i class="fas fa-check-circle text-blue-600 flex-shrink-0"></i>` : `<i class="fas fa-chevron-right text-slate-300 flex-shrink-0"></i>`}
    </div>`).join('');
}

window.filtrarProgramas = (q) => {
  const lista = DATA.matricula.programas.filter(p =>
    p.modalidadId === estado.modalidad?.id &&
    p.nombre.toLowerCase().includes(q.toLowerCase())
  );
  renderListaProgramas(lista);
};

function seleccionarPrograma(id) {
  estado.programa = DATA.matricula.programas.find(p => p.id === id);
  renderPaso1();
  renderPaso2();
  irPaso(2);
}

// ============================================================
//  PASO 2: SEMESTRE
// ============================================================
function renderPaso2() {
  const p = estado.programa;
  document.getElementById('breadcrumb-sem').innerHTML = `
    <span class="flex items-center gap-1"><i class="fas fa-layer-group text-indigo-400"></i>${estado.modalidad.nombre}</span>
    <span class="text-slate-300">›</span>
    <span class="flex items-center gap-1"><i class="fas fa-graduation-cap text-blue-400"></i>${p.nombre}</span>`;

  const grid = document.getElementById('semestres-grid');
  grid.innerHTML = Array.from({length: p.semestres}, (_,i) => {
    const n = i+1;
    const matCount = DATA.matricula.materias.filter(m => m.programaId===p.id && m.semestre===n).length;
    return `
    <div class="semestre-card ${estado.semestre===n?'selected':''}" onclick="seleccionarSemestre(${n})">
      <div class="sem-num">${n}°</div>
      <div class="sem-label">Semestre</div>
      <div class="text-xs text-slate-400 mt-2">${matCount} materias</div>
    </div>`;
  }).join('');
}

function seleccionarSemestre(n) {
  estado.semestre = n;
  renderPaso2();
  renderPaso3();
  irPaso(3);
}

// ============================================================
//  PASO 3: MATERIAS
// ============================================================
function renderPaso3() {
  const p = estado.programa;
  document.getElementById('breadcrumb-mat').innerHTML = `
    <span class="flex items-center gap-1 font-semibold text-slate-600"><i class="fas fa-graduation-cap text-blue-400 mr-1"></i>${p.nombre}</span>
    <span class="text-slate-300 mx-1">›</span>
    <span class="font-semibold text-slate-600">${estado.semestre}° Semestre</span>`;
  filtrarMaterias();
}

window.filtrarMaterias = () => {
  const area = document.getElementById('filter-area')?.value || '';
  const est = document.getElementById('filter-estado')?.value || '';
  let mats = DATA.matricula.materias.filter(m =>
    m.programaId === estado.programa?.id && m.semestre === estado.semestre
  );
  if (area) mats = mats.filter(m => m.area === area);
  if (est) mats = mats.filter(m => m.estado === est);
  renderMaterias(mats);
};

function renderMaterias(lista) {
  const cont = document.getElementById('materias-list');
  if (!lista.length) {
    cont.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fas fa-book text-3xl mb-2 block opacity-30"></i>No hay materias para este filtro</div>`;
    return;
  }
  cont.innerHTML = lista.map(m => {
    const sel = estado.seleccionadas.includes(m.id);
    const areaClass = { Básica:'mat-basica', Profesional:'mat-profesional', Electiva:'mat-electiva', Humanidades:'mat-humanidades' };
    const estadoClass = { disponible:'mat-disponible', cursada:'mat-cursada', habilitada:'mat-habilitada', bloqueada:'mat-bloqueada' };
    const bloqueada = m.estado === 'bloqueada' || m.estado === 'cursada';
    return `
    <div class="materia-row ${sel?'selected':''} ${bloqueada?'blocked':''}" id="mrow-${m.id}">
      <div class="mat-check ${sel?'checked':''}" onclick="${bloqueada?'':''} toggleMateria(${m.id})">
        ${sel?'<i class="fas fa-check"></i>':''}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-0.5">
          <span class="font-bold text-slate-800 text-sm">${m.nombre}</span>
          <span class="mat-tipo ${areaClass[m.area]||'mat-basica'}">${m.area}</span>
          <span class="mat-estado-badge ${estadoClass[m.estado]||'mat-disponible'}">${m.estado==='disponible'?'Disponible':m.estado==='cursada'?'✓ Cursada':m.estado==='habilitada'?'⚠ Habilitada':'🔒 Prerrequisito'}</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span><i class="fas fa-code text-slate-400 mr-1"></i><span class="font-mono">${m.codigo}</span></span>
          <span><i class="fas fa-star text-slate-400 mr-1"></i>${m.creditos} crédito${m.creditos!==1?'s':''}</span>
          <span><i class="fas fa-user text-slate-400 mr-1"></i>${m.profesor}</span>
          <span><i class="fas fa-clock text-slate-400 mr-1"></i>${m.horas}h/semana</span>
          ${m.prerrequisito?`<span class="text-orange-500"><i class="fas fa-exclamation-triangle mr-1"></i>Req: ${m.prerrequisito}</span>`:''}
        </div>
        <div class="flex flex-wrap gap-1 mt-1">
          ${m.horarios.map(h=>`<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">${h}</span>`).join('')}
        </div>
      </div>
      <div class="flex flex-col items-end gap-1 flex-shrink-0">
        <span class="font-bold text-slate-700">${m.creditos} cr.</span>
        ${!bloqueada ? `<button onclick="toggleMateria(${m.id})" class="btn ${sel?'btn-danger':'btn-primary'} btn-sm">
          ${sel?'<i class="fas fa-minus mr-1"></i>Quitar':'<i class="fas fa-plus mr-1"></i>Agregar'}
        </button>` : `<span class="text-xs text-slate-400">${m.estado==='cursada'?'Ya cursada':'Bloqueada'}</span>`}
      </div>
    </div>`;
  }).join('');
}

window.toggleMateria = (id) => {
  const mat = DATA.matricula.materias.find(m => m.id === id);
  const idx = estado.seleccionadas.indexOf(id);
  const totalCred = estado.seleccionadas.reduce((a,sid) => {
    const sm = DATA.matricula.materias.find(m=>m.id===sid);
    return a + (sm?.creditos||0);
  }, 0);

  if (idx === -1) {
    if (totalCred + mat.creditos > 20) {
      showMToast('Máximo 20 créditos por semestre', 'warning'); return;
    }
    estado.seleccionadas.push(id);
    showMToast(`${mat.nombre} agregada`, 'success');
  } else {
    estado.seleccionadas.splice(idx, 1);
    showMToast(`${mat.nombre} removida`, 'info');
  }

  actualizarCarrito();
  filtrarMaterias();
};

function actualizarCarrito() {
  const mats = estado.seleccionadas.map(id => DATA.matricula.materias.find(m=>m.id===id)).filter(Boolean);
  const total = mats.reduce((a,m)=>a+m.creditos,0);
  const pct = Math.min((total/20)*100,100);

  document.getElementById('cart-count').textContent = `${mats.length} materia${mats.length!==1?'s':''}`;
  document.getElementById('cart-creditos').textContent = `${total} / 20`;
  document.getElementById('hdr-creditos').textContent = total;
  document.getElementById('hdr-materias').textContent = mats.length;
  document.getElementById('creditos-bar').style.width = pct+'%';
  document.getElementById('creditos-bar').className = `progress-fill ${total>18?'bg-red-500':total>14?'bg-yellow-500':'bg-indigo-500'}`;
  document.getElementById('cred-pct').textContent = `${total} créditos (${Math.round(pct)}%)`;

  const btnConf = document.getElementById('btn-confirmar');
  if (mats.length > 0) {
    btnConf.disabled = false;
    btnConf.classList.remove('opacity-50','cursor-not-allowed');
  } else {
    btnConf.disabled = true;
    btnConf.classList.add('opacity-50','cursor-not-allowed');
  }

  const cartList = document.getElementById('cart-list');
  if (!mats.length) {
    cartList.innerHTML = `<div class="p-6 text-center text-slate-400 text-sm"><i class="fas fa-book text-3xl mb-2 block opacity-30"></i>Sin materias seleccionadas</div>`;
    return;
  }
  cartList.innerHTML = mats.map(m => `
    <div class="cart-item">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-800 truncate">${m.nombre}</p>
        <p class="text-xs text-slate-400"><span class="font-mono">${m.codigo}</span> · ${m.creditos} cr.</p>
      </div>
      <button class="cart-remove" onclick="toggleMateria(${m.id})"><i class="fas fa-times"></i></button>
    </div>`).join('');
}

// ============================================================
//  PASO 4 / CONFIRMACIÓN
// ============================================================
window.confirmarMatricula = () => {
  if (!estado.seleccionadas.length) { showMToast('Selecciona al menos una materia','warning'); return; }
  irPaso(4);
  renderResumen();
};

function renderResumen() {
  const mats = estado.seleccionadas.map(id => DATA.matricula.materias.find(m=>m.id===id)).filter(Boolean);
  const total = mats.reduce((a,m)=>a+m.creditos,0);
  const p = estado.programa;

  document.getElementById('resumen-matricula').innerHTML = `
  <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-start gap-3">
    <i class="fas fa-check-circle text-green-500 text-xl mt-0.5"></i>
    <div>
      <p class="font-bold text-green-800">¡Todo listo para confirmar!</p>
      <p class="text-sm text-green-700 mt-0.5">Revisa tu selección antes de confirmar. Una vez confirmada no podrás editar sin pasar por secretaría.</p>
    </div>
  </div>

  <div class="confirm-section">
    <h3 class="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><i class="fas fa-user text-blue-500"></i> Datos del Estudiante</h3>
    <div class="confirm-row"><span class="text-slate-500">Nombre</span><span class="font-semibold">${session.name}</span></div>
    <div class="confirm-row"><span class="text-slate-500">Código</span><span class="font-mono font-semibold">${session.code}</span></div>
    <div class="confirm-row"><span class="text-slate-500">Programa</span><span class="font-semibold">${p?.nombre||'—'}</span></div>
    <div class="confirm-row"><span class="text-slate-500">Semestre</span><span class="font-semibold">${estado.semestre}°</span></div>
    <div class="confirm-row"><span class="text-slate-500">Período</span><span class="font-semibold badge-status badge-blue">2026-2</span></div>
  </div>

  <div class="confirm-section">
    <h3 class="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><i class="fas fa-book text-orange-500"></i> Materias Seleccionadas (${mats.length})</h3>
    ${mats.map((m,i) => `
    <div class="confirm-row">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold flex items-center justify-center">${i+1}</span>
        <div>
          <p class="font-semibold text-sm">${m.nombre}</p>
          <p class="text-xs text-slate-400 font-mono">${m.codigo} · ${m.profesor}</p>
          <div class="flex gap-1 mt-0.5">${m.horarios.map(h=>`<span class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">${h}</span>`).join('')}</div>
        </div>
      </div>
      <span class="font-bold text-slate-600 flex-shrink-0">${m.creditos} cr.</span>
    </div>`).join('')}
    <div class="flex justify-between pt-3 font-bold">
      <span>Total créditos</span>
      <span class="text-indigo-700 text-lg">${total}</span>
    </div>
  </div>

  <div class="flex gap-3">
    <button onclick="irPaso(3)" class="btn btn-secondary btn-lg flex-1 justify-center" style="justify-content:center">
      <i class="fas fa-edit mr-2"></i>Editar selección
    </button>
    <button onclick="finalizarMatricula()" class="btn btn-primary btn-lg flex-1 justify-center" style="justify-content:center">
      <i class="fas fa-check-circle mr-2"></i>Confirmar Matrícula
    </button>
  </div>`;
}

window.finalizarMatricula = () => {
  const mats = estado.seleccionadas.map(id => DATA.matricula.materias.find(m=>m.id===id)).filter(Boolean);
  const total = mats.reduce((a,m)=>a+m.creditos,0);

  openMatModal('✅ Matrícula Confirmada', `
  <div class="text-center py-4 space-y-4">
    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
      <i class="fas fa-check-circle text-green-500 text-4xl"></i>
    </div>
    <div>
      <h3 class="font-black text-xl text-slate-800">¡Matrícula exitosa!</h3>
      <p class="text-slate-500 text-sm mt-1">${mats.length} materias · ${total} créditos · Período 2026-2</p>
    </div>
    <div class="bg-slate-50 rounded-xl p-4 text-left space-y-1">
      ${mats.map(m=>`<div class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-500 text-xs"></i><span class="font-semibold">${m.nombre}</span><span class="text-slate-400 ml-auto">${m.creditos}cr</span></div>`).join('')}
    </div>
    <p class="text-xs text-slate-400">Número de confirmación: <span class="font-mono font-bold">MAT-${Date.now().toString().slice(-8)}</span></p>
  </div>`,
  `<button class="btn btn-secondary" onclick="window.location.href='dashboard.html'"><i class="fas fa-home mr-1"></i>Volver al inicio</button>
   <button class="btn btn-primary" onclick="closeMatModal();showMToast('Comprobante generado','success')"><i class="fas fa-download mr-1"></i>Descargar comprobante</button>`);
};

// ============================================================
//  Helpers
// ============================================================
function openMatModal(title, body, footer) {
  document.getElementById('mat-modal-title').textContent = title;
  document.getElementById('mat-modal-body').innerHTML = body;
  document.getElementById('mat-modal-footer').innerHTML = footer || '<button class="btn b-secondary" onclick="closeMatModal()">Cerrar</button>';
  document.getElementById('mat-modal').classList.add('open');
}
function closeMatModal() { document.getElementById('mat-modal').classList.remove('open'); }
document.getElementById('mat-modal').addEventListener('click', function(e){ if(e.target===this) closeMatModal(); });

function showMToast(msg, type='success') {
  const icons = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const t = document.getElementById('m-toast');
  t.className = 'toast ' + type;
  document.getElementById('m-toast-icon').textContent = icons[type]||'✅';
  document.getElementById('m-toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
