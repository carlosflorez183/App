/* =============================================
   UniPlataforma — Dashboard Principal
   ============================================= */
const session = AUTH.requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  buildSidebar();
  setupNotifications();
  showView('home');
});

function setupUI() {
  document.getElementById('nav-avatar').textContent = session.avatar;
  document.getElementById('nav-avatar').className = 'avatar ' + session.avatarClass;
  document.getElementById('nav-name').textContent = session.name;
  document.getElementById('nav-role').textContent = AUTH.roleLabels[session.role] || session.role;
  const ta = document.getElementById('topbar-avatar');
  ta.textContent = session.avatar;
  ta.className = 'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ' + session.avatarClass;
  document.getElementById('topbar-name').textContent = session.name.split(' ')[0];
  if (window.innerWidth < 768) document.getElementById('menu-btn').style.display = 'flex';
}

// ---- Sidebar config by role ----
const navConfig = {
  estudiante: [
    { section:'PRINCIPAL', items:[{id:'home',icon:'fa-home',label:'Inicio'}] },
    { section:'ACADÉMICO', items:[
      {id:'notas',icon:'fa-star',label:'Mis Notas',view:'academico',tab:'notas'},
      {id:'certificados',icon:'fa-certificate',label:'Certificados',view:'academico',tab:'certificados'},
      {id:'pagos',icon:'fa-file-invoice-dollar',label:'Pagos / Volante',view:'academico',tab:'pagos'},
      {id:'horario',icon:'fa-calendar-alt',label:'Mi Horario',view:'academico',tab:'horario'},
    ]},
    { section:'CAMPUS VIRTUAL', items:[
      {id:'cursos',icon:'fa-book-open',label:'Mis Cursos',view:'lms',tab:'cursos'},
      {id:'tareas',icon:'fa-tasks',label:'Tareas',view:'lms',tab:'tareas',badge:'2'},
      {id:'recursos',icon:'fa-folder-open',label:'Recursos',view:'lms',tab:'recursos'},
    ]},
    { section:'MATRÍCULA', items:[
      {id:'matricula',icon:'fa-pen-to-square',label:'Matricular Materias',view:'matricula'},
    ]},
    { section:'PERSONAL', items:[{id:'perfil',icon:'fa-user-circle',label:'Mi Perfil',view:'perfil'}] },
  ],
  profesor: [
    { section:'PRINCIPAL', items:[{id:'home',icon:'fa-home',label:'Inicio'}] },
    { section:'DOCENCIA', items:[
      {id:'mis_cursos',icon:'fa-book-open',label:'Mis Cursos',view:'lms',tab:'cursos'},
      {id:'notas_prof',icon:'fa-star',label:'Registro Notas',view:'academico',tab:'registro_notas'},
      {id:'actividades',icon:'fa-tasks',label:'Actividades',view:'lms',tab:'actividades_prof'},
      {id:'recursos_p',icon:'fa-folder-open',label:'Material',view:'lms',tab:'recursos'},
    ]},
    { section:'PERSONAL', items:[{id:'perfil',icon:'fa-user-circle',label:'Mi Perfil',view:'perfil'}] },
  ],
  admin: [
    { section:'PRINCIPAL', items:[{id:'home',icon:'fa-home',label:'Inicio'}] },
    { section:'GESTIÓN ACADÉMICA', items:[
      {id:'notas_adm',icon:'fa-star',label:'Notas',view:'academico',tab:'notas'},
      {id:'certs_adm',icon:'fa-certificate',label:'Certificados',view:'academico',tab:'certificados'},
      {id:'pagos_adm',icon:'fa-money-bill',label:'Pagos',view:'academico',tab:'pagos'},
      {id:'cursos_adm',icon:'fa-book-open',label:'Campus Virtual',view:'lms',tab:'cursos'},
      {id:'matricula_adm',icon:'fa-pen-to-square',label:'Matrícula',view:'matricula'},
    ]},
    { section:'ADMINISTRATIVO', items:[
      {id:'talento',icon:'fa-users',label:'Talento Humano',view:'admin',tab:'talento'},
      {id:'contabilidad',icon:'fa-chart-line',label:'Contabilidad',view:'admin',tab:'contabilidad'},
      {id:'planeacion',icon:'fa-sitemap',label:'Planeación',view:'admin',tab:'planeacion'},
      {id:'rectoria',icon:'fa-crown',label:'Rectoría',view:'admin',tab:'rectoria'},
      {id:'bienestar',icon:'fa-heart',label:'Bienestar',view:'admin',tab:'bienestar'},
      {id:'registro',icon:'fa-id-card',label:'Registro y Control',view:'admin',tab:'registro'},
    ]},
    { section:'PERSONAL', items:[{id:'perfil',icon:'fa-user-circle',label:'Mi Perfil',view:'perfil'}] },
  ],
};
['rectoria','talento_humano','contabilidad','planeacion','bienestar','registro'].forEach(r => { navConfig[r] = navConfig.admin; });

function buildSidebar() {
  const config = navConfig[session.role] || navConfig.admin;
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  config.forEach(section => {
    const t = document.createElement('div');
    t.className = 'nav-section-title';
    t.textContent = section.section;
    nav.appendChild(t);
    section.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.id = 'nav-' + item.id;
      el.innerHTML = `<span class="nav-icon"><i class="fas ${item.icon}"></i></span><span>${item.label}</span>${item.badge?`<span class="badge">${item.badge}</span>`:''}`;
      el.onclick = () => {
        if (item.view) showView(item.view, item.tab);
        else showView('home');
        if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
      };
      nav.appendChild(el);
    });
  });
}

function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav-' + id);
  if (el) el.classList.add('active');
}

function showView(view, tab) {
  document.querySelectorAll('.module-view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (!el) return;
  el.classList.add('active');
  const titles = {
    home:['Dashboard', `Bienvenido, ${session.name.split(' ')[0]}`],
    academico:['Gestión Académica','Notas, certificados y pagos'],
    lms:['Campus Virtual','Cursos, tareas y recursos'],
    admin:['Módulo Administrativo','Dependencias universitarias'],
    perfil:['Mi Perfil','Información personal'],
    matricula:['Matrícula Académica','Inscripción de materias por programa y semestre'],
  };
  const [title, subtitle] = titles[view] || ['UniPlataforma',''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;
  if (view==='home') renderHome();
  else if (view==='academico') renderAcademico(tab);
  else if (view==='lms') renderLMS(tab);
  else if (view==='admin') renderAdmin(tab);
  else if (view==='perfil') renderPerfil();
  else if (view==='matricula') window.location.href = 'matricula.html';
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ---- TOAST ----
function showToast(msg, type='success') {
  const toast = document.getElementById('toast');
  const icons = {success:'fa-check-circle',error:'fa-times-circle',info:'fa-info-circle',warning:'fa-exclamation-triangle'};
  toast.className = 'toast ' + type;
  document.getElementById('toast-icon').className = 'fas ' + (icons[type]||'fa-info-circle');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---- MODAL ----
function openModal(title, body, footer) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer || '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>';
  document.getElementById('global-modal').classList.add('open');
}
function closeModal() { document.getElementById('global-modal').classList.remove('open'); }
document.getElementById('global-modal').addEventListener('click', function(e){ if(e.target===this) closeModal(); });

// ---- NOTIFICACIONES ----
function setupNotifications() {
  const list = document.getElementById('notif-list');
  list.innerHTML = DATA.notificaciones.map(n => `
    <div class="flex gap-3 px-4 py-3 border-b border-slate-50 ${n.leida?'opacity-60':''}">
      <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${n.tipo==='success'?'bg-green-100 text-green-600':n.tipo==='warning'?'bg-yellow-100 text-yellow-600':'bg-blue-100 text-blue-600'}">
        <i class="fas ${n.tipo==='success'?'fa-check':n.tipo==='warning'?'fa-exclamation':'fa-info'}"></i></div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-slate-700">${n.titulo}</p>
        <p class="text-xs text-slate-500 mt-0.5">${n.msg}</p>
        <p class="text-xs text-slate-400 mt-1">${n.tiempo}</p>
      </div>
      ${!n.leida?'<div class="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>':''}
    </div>`).join('');
}
function toggleNotif() { document.getElementById('notif-panel').classList.toggle('hidden'); }
document.addEventListener('click', e => {
  const p = document.getElementById('notif-panel');
  if (!p.classList.contains('hidden') && !e.target.closest('#notif-panel') && !e.target.closest('.icon-btn')) p.classList.add('hidden');
});

// ============================================================
//  HOME DASHBOARD
// ============================================================
function renderHome() {
  setActiveNav('home');
  const el = document.getElementById('view-home');
  const isEst = session.role === 'estudiante';
  const isProf = session.role === 'profesor';

  const statsEst = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-star"></i></div><div><div class="stat-value">4.2</div><div class="stat-label">Promedio actual</div><div class="stat-change up">▲ 0.1 vs anterior</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-book"></i></div><div><div class="stat-value">4</div><div class="stat-label">Materias activas</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-tasks"></i></div><div><div class="stat-value">3</div><div class="stat-label">Tareas pendientes</div><div class="stat-change down">1 próxima a vencer</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-yellow-100 text-yellow-600"><i class="fas fa-coins"></i></div><div><div class="stat-value">1</div><div class="stat-label">Pago pendiente</div></div></div>
    </div>`;

  const statsProf = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-book-open"></i></div><div><div class="stat-value">3</div><div class="stat-label">Cursos activos</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-users"></i></div><div><div class="stat-value">90</div><div class="stat-label">Estudiantes</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-orange-100 text-orange-600"><i class="fas fa-tasks"></i></div><div><div class="stat-value">5</div><div class="stat-label">Actividades abiertas</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-inbox"></i></div><div><div class="stat-value">12</div><div class="stat-label">Entregas por calificar</div></div></div>
    </div>`;

  const statsAdmin = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-user-graduate"></i></div><div><div class="stat-value">1,248</div><div class="stat-label">Estudiantes activos</div><div class="stat-change up">▲ 3.2%</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-chalkboard-teacher"></i></div><div><div class="stat-value">87</div><div class="stat-label">Docentes</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-yellow-100 text-yellow-600"><i class="fas fa-dollar-sign"></i></div><div><div class="stat-value">$823M</div><div class="stat-label">Ingresos 2026</div><div class="stat-change up">▲ 8.2%</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-project-diagram"></i></div><div><div class="stat-value">4</div><div class="stat-label">Proyectos activos</div></div></div>
    </div>`;

  const stats = isEst ? statsEst : isProf ? statsProf : statsAdmin;

  el.innerHTML = `
  <div class="fade-in">
    <div class="bg-gradient-to-r from-blue-800 to-indigo-700 rounded-2xl p-6 mb-6 text-white flex items-center justify-between">
      <div>
        <p class="text-blue-200 text-sm mb-1">Jueves, 24 de Septiembre de 2026</p>
        <h2 class="text-2xl font-bold">Hola, ${session.name.split(' ')[0]} 👋</h2>
        <p class="text-blue-200 mt-1 text-sm">${AUTH.roleLabels[session.role]||session.role} · ${session.code||''}</p>
      </div>
      <div class="hidden md:block text-center opacity-80">
        <div class="text-3xl font-black">2026-1</div>
        <div class="text-sm text-blue-200">Período académico</div>
      </div>
    </div>
    ${stats}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card col-span-1 md:col-span-2">
        <div class="card-header"><span class="card-title"><i class="fas fa-th text-blue-600"></i> Accesos Rápidos</span></div>
        <div class="card-body"><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${buildQuickAccess()}</div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-calendar text-indigo-600"></i> Próximos eventos</span></div>
        <div class="p-0">
          ${DATA.eventos.map(ev=>`
          <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
            <div class="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 ${ev.tipo==='tarea'?'bg-orange-100 text-orange-700':'bg-blue-100 text-blue-700'}">
              <span class="text-base leading-none font-black">${ev.fecha}</span><span>ago</span></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">${ev.titulo}</p>
              <p class="text-xs text-slate-400">${ev.tipo==='tarea'?'Entrega':'Clase'}</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function buildQuickAccess() {
  const items = session.role === 'estudiante' ? [
    {icon:'fa-star',label:'Mis Notas',color:'bg-blue-500',action:"showView('academico','notas')"},
    {icon:'fa-file-invoice-dollar',label:'Pagos',color:'bg-green-500',action:"showView('academico','pagos')"},
    {icon:'fa-certificate',label:'Certificados',color:'bg-yellow-500',action:"showView('academico','certificados')"},
    {icon:'fa-book-open',label:'Mis Cursos',color:'bg-purple-500',action:"showView('lms','cursos')"},
    {icon:'fa-tasks',label:'Tareas',color:'bg-orange-500',action:"showView('lms','tareas')"},
    {icon:'fa-pen-to-square',label:'Matrícula',color:'bg-indigo-500',action:"showView('matricula')"},
  ] : session.role === 'profesor' ? [
    {icon:'fa-book-open',label:'Cursos',color:'bg-purple-500',action:"showView('lms','cursos')"},
    {icon:'fa-star',label:'Notas',color:'bg-blue-500',action:"showView('academico','registro_notas')"},
    {icon:'fa-tasks',label:'Actividades',color:'bg-orange-500',action:"showView('lms','actividades_prof')"},
    {icon:'fa-folder-open',label:'Material',color:'bg-green-500',action:"showView('lms','recursos')"},
    {icon:'fa-user-circle',label:'Mi Perfil',color:'bg-slate-500',action:"showView('perfil')"},
  ] : [
    {icon:'fa-users',label:'Talento Humano',color:'bg-yellow-500',action:"showView('admin','talento')"},
    {icon:'fa-chart-line',label:'Contabilidad',color:'bg-green-600',action:"showView('admin','contabilidad')"},
    {icon:'fa-sitemap',label:'Planeación',color:'bg-teal-500',action:"showView('admin','planeacion')"},
    {icon:'fa-crown',label:'Rectoría',color:'bg-red-600',action:"showView('admin','rectoria')"},
    {icon:'fa-star',label:'Notas',color:'bg-blue-500',action:"showView('academico','notas')"},
    {icon:'fa-book-open',label:'Campus Virtual',color:'bg-purple-500',action:"showView('lms','cursos')"},
  ];
  return items.map(i=>`
    <button onclick="${i.action}" class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition group text-center">
      <div class="w-12 h-12 ${i.color} rounded-xl flex items-center justify-center text-white text-xl shadow-sm group-hover:scale-110 transition-transform">
        <i class="fas ${i.icon}"></i></div>
      <span class="text-xs font-semibold text-slate-600">${i.label}</span>
    </button>`).join('');
}

// ============================================================
//  MÓDULO ACADÉMICO
// ============================================================
function renderAcademico(tab='notas') {
  const el = document.getElementById('view-academico');
  const isProf = session.role === 'profesor';
  const tabs = isProf
    ? [['registro_notas','Registrar Notas','fa-edit'],['notas','Ver Notas','fa-star'],['certificados','Certificados','fa-certificate']]
    : [['notas','Mis Notas','fa-star'],['certificados','Certificados','fa-certificate'],['pagos','Pagos','fa-file-invoice-dollar'],['horario','Horario','fa-calendar-alt']];

  el.innerHTML = `
  <div class="fade-in">
    <div class="tabs mb-6 bg-white rounded-xl px-2 shadow-sm overflow-x-auto">
      ${tabs.map(([id,label,icon])=>`<button class="tab-btn ${tab===id?'active':''}" onclick="renderAcademico('${id}')"><i class="fas ${icon} mr-1.5"></i>${label}</button>`).join('')}
    </div>
    <div id="acad-content"></div>
  </div>`;

  if (tab==='notas') renderNotas();
  else if (tab==='registro_notas') renderRegistroNotas();
  else if (tab==='certificados') renderCertificados();
  else if (tab==='pagos') renderPagos();
  else if (tab==='horario') renderHorario();
}

function notaColor(n) { if (!n) return 'text-slate-400'; return n>=3 ? 'text-green-600' : 'text-red-600'; }

function renderNotas() {
  const activas = DATA.materias.filter(m=>m.periodo==='2026-1');
  const anteriores = DATA.materias.filter(m=>m.periodo!=='2026-1');
  document.getElementById('acad-content').innerHTML = `
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-star"></i></div><div><div class="stat-value">4.2</div><div class="stat-label">Promedio 2026-1</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-check-circle"></i></div><div><div class="stat-value">${activas.length}</div><div class="stat-label">Materias activas</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-graduation-cap"></i></div><div><div class="stat-value">82</div><div class="stat-label">Créditos acumulados</div></div></div>
  </div>
  <div class="card mb-4">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-star text-blue-600"></i> Materias — Semestre 2026-1</span>
      <button class="btn btn-secondary btn-sm" onclick="showHistorial()"><i class="fas fa-history mr-1"></i>Historial completo</button>
    </div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Código</th><th>Materia</th><th>Cred.</th><th>Nota 1</th><th>Nota 2</th><th>Nota 3</th><th>Definitiva</th><th>Estado</th></tr></thead>
        <tbody>${activas.map(m=>`<tr>
          <td><span class="font-mono text-xs text-slate-500">${m.codigo}</span></td>
          <td><span class="font-semibold">${m.nombre}</span><br><span class="text-xs text-slate-400">${m.profesor}</span></td>
          <td class="text-center">${m.creditos}</td>
          <td class="text-center font-semibold ${notaColor(m.nota1)}">${m.nota1||'—'}</td>
          <td class="text-center font-semibold ${notaColor(m.nota2)}">${m.nota2||'—'}</td>
          <td class="text-center font-semibold ${notaColor(m.nota3)}">${m.nota3||'—'}</td>
          <td class="text-center"><div class="nota-circle ${m.definitiva?(m.definitiva>=3?'aprobado':'reprobado'):'pendiente'} mx-auto">${m.definitiva||'—'}</div></td>
          <td><span class="badge-status ${m.estado==='aprobado'?'badge-green':m.estado==='reprobado'?'badge-red':'badge-blue'}">${m.estado==='en_curso'?'En Curso':m.estado==='aprobado'?'Aprobado':'Reprobado'}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-history text-slate-500"></i> Períodos Anteriores</span></div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Código</th><th>Materia</th><th>Créditos</th><th>Definitiva</th><th>Estado</th><th>Período</th></tr></thead>
        <tbody>${anteriores.map(m=>`<tr>
          <td><span class="font-mono text-xs text-slate-500">${m.codigo}</span></td>
          <td class="font-semibold">${m.nombre}</td>
          <td class="text-center">${m.creditos}</td>
          <td class="text-center font-bold text-lg ${notaColor(m.definitiva)}">${m.definitiva}</td>
          <td><span class="badge-status ${m.estado==='aprobado'?'badge-green':'badge-red'}">${m.estado==='aprobado'?'Aprobado':'Reprobado'}</span></td>
          <td><span class="badge-status badge-gray">${m.periodo}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function showHistorial() {
  const hist = [{semestre:'2024-1',prom:3.8,cred:18},{semestre:'2024-2',prom:3.9,cred:16},{semestre:'2025-1',prom:4.1,cred:20},{semestre:'2025-2',prom:4.3,cred:18},{semestre:'2026-1',prom:null,cred:16}];
  openModal('Historial Académico — Carlos Martínez', `
    <table class="data-table"><thead><tr><th>Semestre</th><th>Créditos</th><th>Promedio</th></tr></thead>
    <tbody>${hist.map(h=>`<tr><td class="font-semibold">${h.semestre}</td><td class="text-center">${h.cred}</td>
      <td class="text-center font-bold text-lg ${h.prom?(h.prom>=3?'text-green-600':'text-red-600'):'text-slate-400'}">${h.prom||'En curso'}</td></tr>`).join('')}
    </tbody></table>`);
}

function renderRegistroNotas() {
  document.getElementById('acad-content').innerHTML = `
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-edit text-blue-600"></i> Registro de Notas — Bases de Datos II (IS-305) Grupo A</span>
      <button class="btn btn-success btn-sm" onclick="showToast('Notas guardadas correctamente','success')"><i class="fas fa-save mr-1"></i>Guardar</button>
    </div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Código</th><th>Estudiante</th><th>Nota 1 (30%)</th><th>Nota 2 (30%)</th><th>Nota 3 (40%)</th><th>Definitiva</th></tr></thead>
        <tbody>${DATA.listaEstudiantes.map(e=>{
          const def = e.nota1&&e.nota2 ? ((e.nota1*0.3)+(e.nota2*0.3)).toFixed(1) : null;
          return `<tr>
            <td class="font-mono text-xs text-slate-500">${e.codigo}</td>
            <td class="font-semibold">${e.nombre}</td>
            <td><input type="number" min="0" max="5" step="0.1" value="${e.nota1||''}" placeholder="0.0" class="form-control w-20 text-center" style="padding:4px 8px"/></td>
            <td><input type="number" min="0" max="5" step="0.1" value="${e.nota2||''}" placeholder="0.0" class="form-control w-20 text-center" style="padding:4px 8px"/></td>
            <td><input type="number" min="0" max="5" step="0.1" value="" placeholder="0.0" class="form-control w-20 text-center" style="padding:4px 8px"/></td>
            <td><span class="font-bold text-lg ${def?(parseFloat(def)>=3?'text-green-600':'text-red-600'):'text-slate-300'}">${def||'—'}</span></td>
          </tr>`;}).join('')}
        </tbody>
      </table>
    </div>
    <div class="p-4 bg-slate-50 border-t text-xs text-slate-500">
      <i class="fas fa-info-circle text-blue-400 mr-1"></i>Período: 2026-1 · Fecha límite de registro: 30 de septiembre de 2026
    </div>
  </div>`;
}

function renderCertificados() {
  document.getElementById('acad-content').innerHTML = `
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
    ${[['Certificado de Estudios','fa-file-alt','bg-blue-100 text-blue-600'],['Constancia de Notas','fa-star','bg-green-100 text-green-600'],
       ['Paz y Salvo Financiero','fa-check-double','bg-yellow-100 text-yellow-600'],['Certificado de Matrícula','fa-id-card','bg-purple-100 text-purple-600'],
       ['Constancia de Egresado','fa-graduation-cap','bg-indigo-100 text-indigo-600'],['Carta de Presentación','fa-envelope','bg-pink-100 text-pink-600'],
    ].map(([t,i,c])=>`
    <button onclick="solicitarCertificado('${t}')" class="flex items-center gap-4 p-5 bg-white rounded-xl border-2 border-transparent hover:border-blue-300 shadow-sm hover:shadow-md transition text-left group">
      <div class="w-12 h-12 ${c} rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform"><i class="fas ${i}"></i></div>
      <div><p class="font-semibold text-slate-800">${t}</p><p class="text-xs text-slate-500 mt-0.5">Click para solicitar</p></div>
      <i class="fas fa-chevron-right text-slate-300 ml-auto group-hover:text-blue-400 transition"></i>
    </button>`).join('')}
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-clock text-slate-500"></i> Mis Solicitudes</span></div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Tipo</th><th>Solicitado</th><th>Fecha emisión</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${DATA.certificados.map(c=>`<tr>
          <td class="font-semibold">${c.tipo}</td>
          <td>${DATA.formatDate(c.solicitado)}</td>
          <td>${DATA.formatDate(c.fecha)}</td>
          <td><span class="badge-status ${c.estado==='disponible'?'badge-green':'badge-yellow'}">${c.estado==='disponible'?'Disponible':'En proceso'}</span></td>
          <td>${c.estado==='disponible'
            ?`<button onclick="showToast('Descargando PDF...','info')" class="btn btn-primary btn-sm"><i class="fas fa-download mr-1"></i>Descargar</button>`
            :`<span class="text-xs text-slate-400">En proceso...</span>`}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function solicitarCertificado(tipo) {
  openModal(`Solicitar: ${tipo}`, `
  <div class="space-y-4">
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
      <i class="fas fa-info-circle mr-2"></i>Disponible en <strong>2 a 5 días hábiles</strong> después de la solicitud.
    </div>
    <div class="form-group"><label class="form-label">Destino</label>
      <select class="form-control"><option>Uso personal</option><option>Entidad financiera</option><option>Empresa / Empleador</option><option>Otro</option></select></div>
    <div class="form-group"><label class="form-label">Número de copias</label><input type="number" min="1" max="5" value="1" class="form-control"/></div>
    <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-control" rows="2" placeholder="Indicaciones adicionales..."></textarea></div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-primary" onclick="closeModal();showToast('Solicitud enviada correctamente','success')"><i class="fas fa-paper-plane mr-1"></i>Enviar</button>`);
}

function renderPagos() {
  const pagado = DATA.pagos.filter(p=>p.estado==='pagado').reduce((a,p)=>a+p.valor,0);
  const pendiente = DATA.pagos.filter(p=>p.estado==='pendiente').reduce((a,p)=>a+p.valor,0);
  document.getElementById('acad-content').innerHTML = `
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-check-circle"></i></div><div><div class="stat-value text-green-600 text-xl">${DATA.formatCurrency(pagado)}</div><div class="stat-label">Total pagado 2026</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-red-100 text-red-600"><i class="fas fa-clock"></i></div><div><div class="stat-value text-red-600 text-xl">${DATA.formatCurrency(pendiente)}</div><div class="stat-label">Pendiente por pagar</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-receipt"></i></div><div><div class="stat-value">${DATA.pagos.length}</div><div class="stat-label">Total recibos</div></div></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-file-invoice-dollar text-green-600"></i> Estado de Cuenta</span></div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Concepto</th><th>Valor</th><th>Fecha límite</th><th>Fecha pago</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${DATA.pagos.map(p=>`<tr>
          <td class="font-semibold">${p.concepto}</td>
          <td class="font-bold">${DATA.formatCurrency(p.valor)}</td>
          <td>${DATA.formatDate(p.fecha_limite)}</td>
          <td>${DATA.formatDate(p.fecha_pago)}</td>
          <td><span class="badge-status ${p.estado==='pagado'?'badge-green':'badge-red'}">${p.estado==='pagado'?'Pagado':'Pendiente'}</span></td>
          <td>${p.estado==='pagado'
            ?`<button onclick="showToast('Descargando comprobante...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-download mr-1"></i>Comprobante</button>`
            :`<button onclick="generarVolante('${p.concepto}',${p.valor})" class="btn btn-primary btn-sm"><i class="fas fa-file-alt mr-1"></i>Volante de Pago</button>`}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function generarVolante(concepto, valor) {
  openModal('Volante de Pago', `
  <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
    <i class="fas fa-university text-blue-700 text-4xl mb-3 block"></i>
    <h3 class="font-bold text-lg">UniPlataforma — Universidad</h3>
    <p class="text-slate-500 text-sm mb-4">NIT: 900.123.456-7</p>
    <div class="bg-slate-50 rounded-lg p-4 text-left space-y-2 text-sm">
      <div class="flex justify-between"><span class="text-slate-500">Estudiante:</span><span class="font-semibold">${session.name}</span></div>
      <div class="flex justify-between"><span class="text-slate-500">Código:</span><span class="font-semibold">${session.code}</span></div>
      <div class="flex justify-between"><span class="text-slate-500">Concepto:</span><span class="font-semibold">${concepto}</span></div>
      <div class="flex justify-between"><span class="text-slate-500">Valor:</span><span class="font-bold text-blue-700 text-lg">${DATA.formatCurrency(valor)}</span></div>
      <div class="flex justify-between"><span class="text-slate-500">Vence:</span><span class="font-semibold text-red-600">25 de julio de 2026</span></div>
      <div class="flex justify-between"><span class="text-slate-500">Referencia:</span><span class="font-mono text-xs bg-slate-200 px-2 py-1 rounded">REF-2026-${session.code}</span></div>
    </div>
    <p class="text-xs text-slate-400 mt-4">Puedes pagar en: Banco Agrario, Bancolombia, PSE o caja de tesorería.</p>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
   <button class="btn btn-primary" onclick="showToast('Volante descargado','success');closeModal()"><i class="fas fa-download mr-1"></i>Descargar PDF</button>`);
}

function renderHorario() {
  const horario = [
    {dia:'Lunes',hora:'07:00 - 09:00',materia:'Bases de Datos II',salon:'Lab B-205',prof:'Dra. Sánchez',color:'badge-purple'},
    {dia:'Lunes',hora:'09:00 - 11:00',materia:'Ingeniería de Software',salon:'Sal 301',prof:'Mg. Torres',color:'badge-blue'},
    {dia:'Martes',hora:'08:00 - 10:00',materia:'Estructuras de Datos',salon:'Lab A-102',prof:'Dr. Ramírez',color:'badge-green'},
    {dia:'Miércoles',hora:'07:00 - 09:00',materia:'Bases de Datos II',salon:'Lab B-205',prof:'Dra. Sánchez',color:'badge-purple'},
    {dia:'Jueves',hora:'14:00 - 16:00',materia:'Ingeniería de Software',salon:'Sal 301',prof:'Mg. Torres',color:'badge-blue'},
    {dia:'Viernes',hora:'08:00 - 10:00',materia:'Estructuras de Datos',salon:'Lab A-102',prof:'Dr. Ramírez',color:'badge-green'},
  ];
  document.getElementById('acad-content').innerHTML = `
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-calendar-alt text-indigo-600"></i> Mi Horario — Semestre 2026-1</span>
      <button class="btn btn-secondary btn-sm" onclick="showToast('Exportando horario...','info')"><i class="fas fa-download mr-1"></i>Exportar</button>
    </div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Día</th><th>Horario</th><th>Materia</th><th>Salón</th><th>Docente</th></tr></thead>
        <tbody>${horario.map(h=>`<tr>
          <td class="font-bold">${h.dia}</td>
          <td><span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded">${h.hora}</span></td>
          <td><span class="badge-status ${h.color}">${h.materia}</span></td>
          <td><i class="fas fa-map-marker-alt text-slate-400 mr-1"></i>${h.salon}</td>
          <td>${h.prof}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

// ============================================================
//  MÓDULO LMS
// ============================================================
function renderLMS(tab='cursos') {
  const el = document.getElementById('view-lms');
  const isProf = session.role === 'profesor';
  const tabs = isProf
    ? [['cursos','Mis Cursos','fa-book-open'],['actividades_prof','Actividades','fa-tasks'],['recursos','Material','fa-folder-open']]
    : [['cursos','Mis Cursos','fa-book-open'],['tareas','Tareas','fa-tasks'],['recursos','Recursos','fa-folder-open']];

  el.innerHTML = `
  <div class="fade-in">
    <div class="tabs mb-6 bg-white rounded-xl px-2 shadow-sm overflow-x-auto">
      ${tabs.map(([id,label,icon])=>`<button class="tab-btn ${tab===id?'active':''}" onclick="renderLMS('${id}')"><i class="fas ${icon} mr-1.5"></i>${label}</button>`).join('')}
    </div>
    <div id="lms-content"></div>
  </div>`;

  if (tab==='cursos') renderCursos();
  else if (tab==='tareas') renderTareas();
  else if (tab==='actividades_prof') renderActividadesProf();
  else if (tab==='recursos') renderRecursos();
}

function renderCursos() {
  const isProf = session.role === 'profesor';
  document.getElementById('lms-content').innerHTML = `
  <div class="flex items-center justify-between mb-4">
    <h3 class="font-bold text-slate-700">${DATA.cursos.length} cursos activos — Semestre 2026-1</h3>
    <div class="flex gap-2">
      ${isProf?`<button onclick="crearCursoModal()" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i>Nuevo Curso</button>`:''}
      ${!isProf?`<a href="matricula.html" class="btn btn-outline btn-sm"><i class="fas fa-pen-to-square mr-1"></i>Ir a Matrícula</a>`:''}
    </div>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    ${DATA.cursos.map(c=>`
    <div class="course-card" onclick="verCurso(${c.id})">
      <div class="course-img" style="background:${c.color}">${c.icon}</div>
      <div class="course-info">
        <div class="course-title">${c.nombre}</div>
        <div class="course-meta mb-1"><i class="fas fa-code text-slate-400 mr-1"></i>${c.codigo} · Grupo ${c.grupo}</div>
        <div class="course-meta mb-1"><i class="fas fa-user text-slate-400 mr-1"></i>${c.profesor}</div>
        <div class="course-meta mb-3"><i class="fas fa-users text-slate-400 mr-1"></i>${c.estudiantes} estudiantes</div>
        <div class="flex justify-between text-xs mb-1"><span class="text-slate-500">Progreso</span><span class="font-semibold">${c.progreso}%</span></div>
        <div class="progress-bar"><div class="progress-fill ${c.progreso===100?'bg-green-500':c.progreso>60?'bg-blue-500':'bg-yellow-500'}" style="width:${c.progreso}%"></div></div>
      </div>
    </div>`).join('')}
  </div>`;
}

function verCurso(id) {
  // Abrir la página dedicada del curso
  window.location.href = `curso.html?id=${id}`;
}

function renderTareas() {
  const pendientes = DATA.actividades.filter(a=>a.estado_est==='pendiente');
  document.getElementById('lms-content').innerHTML = `
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
    <div class="stat-card"><div class="stat-icon bg-orange-100 text-orange-600"><i class="fas fa-clock"></i></div><div><div class="stat-value text-orange-600">${pendientes.length}</div><div class="stat-label">Pendientes</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-check-circle"></i></div><div><div class="stat-value text-green-600">${DATA.actividades.filter(a=>a.estado_est!=='pendiente').length}</div><div class="stat-label">Entregadas / Calificadas</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-star"></i></div><div><div class="stat-value text-blue-600">87%</div><div class="stat-label">Tasa de entrega</div></div></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-tasks text-orange-500"></i> Todas las actividades</span></div>
    <div class="divide-y divide-slate-100">
      ${DATA.actividades.map(a=>{
        const curso = DATA.cursos.find(c=>c.id===a.cursoId);
        const tipos = {taller:'badge-blue',proyecto:'badge-purple',informe:'badge-indigo',quiz:'badge-yellow'};
        return `<div class="p-4 hover:bg-slate-50 transition">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="badge-status ${tipos[a.tipo]||'badge-gray'} capitalize">${a.tipo}</span>
                <span class="text-xs text-slate-400">${curso?.nombre||''}</span>
              </div>
              <p class="font-semibold text-slate-800">${a.titulo}</p>
              <p class="text-sm text-slate-500 mt-0.5">${a.descripcion}</p>
              <p class="text-xs text-slate-400 mt-2"><i class="fas fa-calendar mr-1"></i>${DATA.formatDate(a.fechaEntrega)} · <i class="fas fa-star mr-1"></i>${a.puntos} pts</p>
            </div>
            <div class="flex flex-col items-end gap-2 flex-shrink-0">
              <span class="badge-status ${a.estado_est==='calificado'?'badge-green':a.estado_est==='entregado'?'badge-blue':'badge-red'}">
                ${a.estado_est==='calificado'?`✓ ${a.nota}/${a.puntos}`:a.estado_est==='entregado'?'Entregado':'Pendiente'}</span>
              ${a.estado_est==='pendiente'?`<button onclick="entregarTarea(${a.id})" class="btn btn-primary btn-sm"><i class="fas fa-upload mr-1"></i>Entregar</button>`:''}
            </div>
          </div>
        </div>`;}).join('')}
    </div>
  </div>`;
}

function entregarTarea(id) {
  const act = DATA.actividades.find(a=>a.id===id);
  openModal(`Entregar: ${act.titulo}`, `
  <div class="space-y-4">
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
      <p class="font-semibold text-blue-800">${act.titulo}</p>
      <p class="text-blue-600 text-xs mt-1">Fecha límite: ${DATA.formatDate(act.fechaEntrega)} · ${act.puntos} puntos</p>
    </div>
    <div class="upload-area" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" onclick="document.getElementById('file-inp-${id}').click()">
      <i class="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3 block"></i>
      <p class="font-semibold text-slate-600">Arrastra tu archivo aquí</p>
      <p class="text-xs text-slate-400 mt-1">o haz click para seleccionar (PDF, DOCX, ZIP — máx. 20MB)</p>
      <input type="file" id="file-inp-${id}" class="hidden" accept=".pdf,.docx,.zip" onchange="mostrarArchivo(this,'fnm-${id}')"/>
    </div>
    <div id="fnm-${id}" class="hidden bg-green-50 border border-green-200 rounded-lg p-2 text-sm text-green-700 flex items-center gap-2">
      <i class="fas fa-file-check"></i><span class="file-name-text"></span>
    </div>
    <div class="form-group"><label class="form-label">Comentario para el docente (opcional)</label>
      <textarea class="form-control" rows="3" placeholder="Escribe un comentario..."></textarea></div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-success" onclick="confirmarEntrega(${id})"><i class="fas fa-paper-plane mr-1"></i>Enviar entrega</button>`);
}

function mostrarArchivo(input, divId) {
  if (input.files[0]) {
    const d = document.getElementById(divId);
    d.classList.remove('hidden');
    d.querySelector('.file-name-text').textContent = input.files[0].name;
  }
}

function confirmarEntrega(id) {
  const act = DATA.actividades.find(a=>a.id===id);
  if (act) { act.estado_est = 'entregado'; }
  closeModal();
  showToast('¡Tarea entregada exitosamente! 🎉', 'success');
  renderTareas();
}

function renderActividadesProf() {
  document.getElementById('lms-content').innerHTML = `
  <div class="flex justify-between items-center mb-4">
    <h3 class="font-bold text-slate-700">Gestión de Actividades</h3>
    <button onclick="crearActividadModal()" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i>Nueva Actividad</button>
  </div>
  <div class="card">
    <div class="divide-y divide-slate-100">
      ${DATA.actividades.map(a=>{
        const curso = DATA.cursos.find(c=>c.id===a.cursoId);
        const entregas = Math.floor(Math.random()*25+3);
        return `<div class="p-4 hover:bg-slate-50 transition">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-slate-800">${a.titulo}</p>
              <p class="text-xs text-slate-500 mt-0.5">${curso?.nombre||''} · Entrega: ${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</p>
            </div>
            <div class="flex gap-2">
              <button onclick="verEntregas('${a.titulo}',${entregas})" class="btn btn-secondary btn-sm"><i class="fas fa-inbox mr-1"></i>${entregas} entregas</button>
              <button onclick="showToast('Editando actividad...','info')" class="btn btn-outline btn-sm"><i class="fas fa-edit"></i></button>
            </div>
          </div>
        </div>`;}).join('')}
    </div>
  </div>`;
}

function verEntregas(titulo, n) {
  const rows = DATA.listaEstudiantes.slice(0,n>6?6:n).map(e=>
    `<tr><td class="font-semibold">${e.nombre}</td><td class="font-mono text-xs text-slate-500">${e.codigo}</td>
     <td><span class="badge-status badge-blue">Entregado</span></td>
     <td><input type="number" min="0" max="100" placeholder="Nota" class="form-control w-20 text-center" style="padding:4px 8px"/></td>
     <td><button onclick="showToast('Nota guardada','success')" class="btn btn-success btn-sm"><i class="fas fa-check"></i></button></td>
    </tr>`).join('');
  openModal(`Entregas: ${titulo}`, `
    <table class="data-table"><thead><tr><th>Estudiante</th><th>Código</th><th>Estado</th><th>Nota</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>`);
}

function crearActividadModal() {
  openModal('Nueva Actividad', `
  <div class="space-y-3">
    <div class="form-group"><label class="form-label">Curso</label>
      <select class="form-control">${DATA.cursos.map(c=>`<option>${c.nombre}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Título</label><input type="text" class="form-control" placeholder="Ej: Taller 3 — Consultas SQL"/></div>
    <div class="form-group"><label class="form-label">Tipo</label>
      <select class="form-control"><option>Taller</option><option>Proyecto</option><option>Quiz</option><option>Informe</option><option>Examen parcial</option></select></div>
    <div class="grid grid-cols-2 gap-3">
      <div class="form-group"><label class="form-label">Fecha de entrega</label><input type="date" class="form-control"/></div>
      <div class="form-group"><label class="form-label">Puntos</label><input type="number" class="form-control" value="50"/></div>
    </div>
    <div class="form-group"><label class="form-label">Descripción</label><textarea class="form-control" rows="3" placeholder="Descripción de la actividad..."></textarea></div>
    <div class="upload-area" onclick="showToast('Seleccionar archivo adjunto','info')">
      <i class="fas fa-paperclip text-2xl text-slate-400 mb-1 block"></i>
      <p class="text-sm text-slate-500">Adjuntar guía o enunciado (opcional)</p>
    </div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-primary" onclick="closeModal();showToast('Actividad publicada exitosamente','success')"><i class="fas fa-check mr-1"></i>Publicar</button>`);
}

function crearCursoModal() {
  openModal('Crear Nuevo Curso', `
  <div class="space-y-3">
    <div class="form-group"><label class="form-label">Nombre del curso</label><input type="text" class="form-control"/></div>
    <div class="grid grid-cols-2 gap-3">
      <div class="form-group"><label class="form-label">Código</label><input type="text" class="form-control" placeholder="IS-XXX"/></div>
      <div class="form-group"><label class="form-label">Grupo</label><input type="text" class="form-control" placeholder="A"/></div>
    </div>
    <div class="form-group"><label class="form-label">Período</label>
      <select class="form-control"><option>2026-1</option><option>2026-2</option></select></div>
  </div>`,
  `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-primary" onclick="closeModal();showToast('Curso creado','success')"><i class="fas fa-check mr-1"></i>Crear</button>`);
}

function renderRecursos() {
  const recursos = [
    {nombre:'Guía_Normalización.pdf',tipo:'pdf',tamaño:'2.3 MB',fecha:'2026-08-15',curso:'Bases de Datos II'},
    {nombre:'Diapositivas_UML.pptx',tipo:'ppt',tamaño:'5.8 MB',fecha:'2026-08-18',curso:'Ing. Software'},
    {nombre:'Ejercicios_SQL.zip',tipo:'zip',tamaño:'1.1 MB',fecha:'2026-08-10',curso:'Bases de Datos II'},
    {nombre:'Referencia_IEEE.pdf',tipo:'pdf',tamaño:'890 KB',fecha:'2026-08-05',curso:'Ing. Software'},
    {nombre:'Video_Clase_Semana8.mp4',tipo:'video',tamaño:'450 MB',fecha:'2026-08-20',curso:'Estructuras de Datos'},
  ];
  const icons = {pdf:'fa-file-pdf text-red-500',ppt:'fa-file-powerpoint text-orange-500',zip:'fa-file-archive text-yellow-600',video:'fa-file-video text-purple-500'};
  const isProf = session.role === 'profesor';
  document.getElementById('lms-content').innerHTML = `
  <div class="flex justify-between items-center mb-4">
    <h3 class="font-bold text-slate-700">Material del curso</h3>
    ${isProf?`<button onclick="showToast('Subiendo material...','info')" class="btn btn-primary btn-sm"><i class="fas fa-upload mr-1"></i>Subir Material</button>`:''}
  </div>
  <div class="card">
    <div class="divide-y divide-slate-100">
      ${recursos.map(r=>`
      <div class="flex items-center gap-4 p-4 hover:bg-slate-50 transition">
        <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          <i class="fas ${icons[r.tipo]||'fa-file text-slate-400'}"></i></div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm">${r.nombre}</p>
          <p class="text-xs text-slate-500">${r.curso} · ${r.tamaño} · ${DATA.formatDate(r.fecha)}</p>
        </div>
        <button onclick="showToast('Descargando ${r.nombre}','info')" class="btn btn-secondary btn-sm flex-shrink-0"><i class="fas fa-download mr-1"></i>Descargar</button>
      </div>`).join('')}
    </div>
  </div>`;
}

// ============================================================
//  MÓDULO ADMINISTRATIVO
// ============================================================
function renderAdmin(tab='talento') {
  const el = document.getElementById('view-admin');
  const allTabs = [
    ['talento','Talento Humano','fa-users'],
    ['contabilidad','Contabilidad','fa-chart-line'],
    ['planeacion','Planeación','fa-sitemap'],
    ['rectoria','Rectoría','fa-crown'],
    ['bienestar','Bienestar','fa-heart'],
    ['registro','Registro y Control','fa-id-card'],
  ];
  const limitedTabs = {
    talento_humano:[['talento','Talento Humano','fa-users']],
    contabilidad:[['contabilidad','Contabilidad','fa-chart-line']],
    planeacion:[['planeacion','Planeación','fa-sitemap']],
    rectoria:[['rectoria','Rectoría','fa-crown'],['talento','Talento Humano','fa-users'],['contabilidad','Contabilidad','fa-chart-line'],['planeacion','Planeación','fa-sitemap']],
  };
  const tabs = limitedTabs[session.role] || allTabs;

  el.innerHTML = `
  <div class="fade-in">
    <div class="tabs mb-6 bg-white rounded-xl px-2 shadow-sm overflow-x-auto">
      ${tabs.map(([id,label,icon])=>`<button class="tab-btn ${tab===id?'active':''}" onclick="renderAdmin('${id}')"><i class="fas ${icon} mr-1.5"></i>${label}</button>`).join('')}
    </div>
    <div id="admin-content"></div>
  </div>`;

  if (tab==='talento') renderTalento();
  else if (tab==='contabilidad') renderContabilidad();
  else if (tab==='planeacion') renderPlaneacion();
  else if (tab==='rectoria') renderRectoria();
  else if (tab==='bienestar') renderBienestar();
  else if (tab==='registro') renderRegistro();
}

// ---- TALENTO HUMANO ----
function renderTalento() {
  const nomina = DATA.empleados.reduce((a,e)=>a+e.salario,0);
  document.getElementById('admin-content').innerHTML = `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-users"></i></div><div><div class="stat-value">${DATA.empleados.length}</div><div class="stat-label">Total empleados</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-user-check"></i></div><div><div class="stat-value">${DATA.empleados.filter(e=>e.estado==='activo').length}</div><div class="stat-label">Activos</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-chalkboard-teacher"></i></div><div><div class="stat-value">${DATA.empleados.filter(e=>e.tipo==='planta'||e.tipo==='hora_catedra').length}</div><div class="stat-label">Docentes</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-yellow-100 text-yellow-600"><i class="fas fa-dollar-sign"></i></div><div><div class="stat-value text-base font-bold text-yellow-700">${DATA.formatCurrency(nomina)}</div><div class="stat-label">Nómina mensual</div></div></div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-users text-blue-600"></i> Planta de Personal</span>
      <div class="flex gap-2">
        <button onclick="openModal('Nuevo Empleado',nuevoEmpleadoForm(),'<button class=\\'btn btn-secondary\\' onclick=\\'closeModal()\\'>Cancelar</button><button class=\\'btn btn-primary\\' onclick=\\'closeModal();showToast(\\'Empleado registrado\\',\\'success\\')\\'>Guardar</button>')" class="btn btn-primary btn-sm"><i class="fas fa-user-plus mr-1"></i>Agregar</button>
        <button onclick="showToast('Exportando nómina...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-download mr-1"></i>Exportar</button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Nombre</th><th>Cargo</th><th>Dependencia</th><th>Tipo</th><th>Salario</th><th>Ingreso</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${DATA.empleados.map(e=>`<tr>
          <td><span class="font-semibold">${e.nombre}</span><br><span class="text-xs text-slate-400">${e.doc}</span></td>
          <td>${e.cargo}</td>
          <td><span class="badge-status badge-blue">${e.dependencia}</span></td>
          <td><span class="badge-status ${e.tipo==='planta'?'badge-green':e.tipo==='administrativo'?'badge-purple':'badge-yellow'}">${e.tipo==='hora_catedra'?'Hora Cátedra':e.tipo==='planta'?'Planta':'Administrativo'}</span></td>
          <td class="font-semibold">${DATA.formatCurrency(e.salario)}</td>
          <td>${DATA.formatDate(e.ingreso)}</td>
          <td><span class="badge-status ${e.estado==='activo'?'badge-green':'badge-yellow'}">${e.estado==='activo'?'Activo':'Licencia'}</span></td>
          <td><div class="flex gap-1">
            <button onclick="showToast('Abriendo hoja de vida...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-eye"></i></button>
            <button onclick="showToast('Editando...','info')" class="btn btn-outline btn-sm"><i class="fas fa-edit"></i></button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function nuevoEmpleadoForm() {
  return `<div class="grid grid-cols-2 gap-3">
    <div class="form-group col-span-2"><label class="form-label">Nombre completo</label><input type="text" class="form-control"/></div>
    <div class="form-group"><label class="form-label">Documento</label><input type="text" class="form-control"/></div>
    <div class="form-group"><label class="form-label">Cargo</label><input type="text" class="form-control"/></div>
    <div class="form-group"><label class="form-label">Dependencia</label>
      <select class="form-control"><option>Fac. Ingeniería</option><option>Talento Humano</option><option>Contabilidad</option><option>Rectoría</option><option>Planeación</option></select></div>
    <div class="form-group"><label class="form-label">Tipo vinculación</label>
      <select class="form-control"><option>Planta</option><option>Administrativo</option><option>Hora Cátedra</option></select></div>
    <div class="form-group"><label class="form-label">Salario</label><input type="number" class="form-control"/></div>
    <div class="form-group"><label class="form-label">Fecha de ingreso</label><input type="date" class="form-control"/></div>
  </div>`;
}

// ---- CONTABILIDAD ----
function renderContabilidad() {
  const ingresos = DATA.movimientos.filter(m=>m.tipo==='ingreso').reduce((a,m)=>a+m.valor,0);
  const egresos = DATA.movimientos.filter(m=>m.tipo==='egreso').reduce((a,m)=>a+m.valor,0);
  document.getElementById('admin-content').innerHTML = `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-arrow-up"></i></div><div><div class="stat-value text-green-600 text-lg">${DATA.formatCurrency(ingresos)}</div><div class="stat-label">Ingresos</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-red-100 text-red-600"><i class="fas fa-arrow-down"></i></div><div><div class="stat-value text-red-600 text-lg">${DATA.formatCurrency(egresos)}</div><div class="stat-label">Egresos</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-balance-scale"></i></div><div><div class="stat-value ${ingresos-egresos>0?'text-green-600':'text-red-600'} text-lg">${DATA.formatCurrency(ingresos-egresos)}</div><div class="stat-label">Balance</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-receipt"></i></div><div><div class="stat-value">${DATA.movimientos.length}</div><div class="stat-label">Movimientos</div></div></div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-chart-line text-green-600"></i> Libro de Movimientos</span>
      <div class="flex gap-2">
        <button onclick="showToast('Creando movimiento...','info')" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i>Nuevo</button>
        <button onclick="showToast('Generando informe contable...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-file-excel mr-1"></i>Exportar</button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Concepto</th><th>Tipo</th><th>Valor</th><th>Fecha</th><th>Cuenta</th></tr></thead>
        <tbody>${DATA.movimientos.map(m=>`<tr>
          <td class="font-semibold">${m.concepto}</td>
          <td><span class="badge-status ${m.tipo==='ingreso'?'badge-green':'badge-red'}">${m.tipo==='ingreso'?'↑ Ingreso':'↓ Egreso'}</span></td>
          <td class="font-bold ${m.tipo==='ingreso'?'text-green-700':'text-red-700'}">${DATA.formatCurrency(m.valor)}</td>
          <td>${DATA.formatDate(m.fecha)}</td>
          <td class="text-sm text-slate-500">${m.cuenta}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

// ---- PLANEACIÓN ----
function renderPlaneacion() {
  document.getElementById('admin-content').innerHTML = `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-teal-100 text-teal-600"><i class="fas fa-project-diagram"></i></div><div><div class="stat-value">${DATA.proyectos.length}</div><div class="stat-label">Total proyectos</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-spinner"></i></div><div><div class="stat-value">${DATA.proyectos.filter(p=>p.estado==='en_ejecucion').length}</div><div class="stat-label">En ejecución</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-check"></i></div><div><div class="stat-value">${DATA.proyectos.filter(p=>p.estado==='completado').length}</div><div class="stat-label">Completados</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-yellow-100 text-yellow-600"><i class="fas fa-coins"></i></div><div><div class="stat-value text-sm font-bold text-yellow-700">${DATA.formatCurrency(DATA.proyectos.reduce((a,p)=>a+p.presupuesto,0))}</div><div class="stat-label">Presupuesto total</div></div></div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-sitemap text-teal-600"></i> Proyectos y Planes de Mejoramiento</span>
      <button onclick="showToast('Creando proyecto...','info')" class="btn btn-primary btn-sm"><i class="fas fa-plus mr-1"></i>Nuevo Proyecto</button>
    </div>
    <div class="divide-y divide-slate-100">
      ${DATA.proyectos.map(p=>`<div class="p-5">
        <div class="flex items-start justify-between gap-4 mb-3">
          <div>
            <p class="font-bold text-slate-800">${p.nombre}</p>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="badge-status badge-blue">${p.area}</span>
              <span class="text-xs text-slate-500"><i class="fas fa-user mr-1"></i>${p.responsable}</span>
              <span class="text-xs text-slate-500"><i class="fas fa-calendar mr-1"></i>${DATA.formatDate(p.inicio)} — ${DATA.formatDate(p.fin)}</span>
            </div>
          </div>
          <span class="badge-status ${p.estado==='completado'?'badge-green':'badge-blue'} flex-shrink-0">${p.estado==='completado'?'Completado':'En Ejecución'}</span>
        </div>
        <div class="grid grid-cols-3 gap-4 text-sm mb-3">
          <div><span class="text-slate-400">Presupuesto:</span><br><span class="font-semibold">${DATA.formatCurrency(p.presupuesto)}</span></div>
          <div><span class="text-slate-400">Ejecutado:</span><br><span class="font-semibold">${DATA.formatCurrency(p.ejecutado)}</span></div>
          <div><span class="text-slate-400">Saldo:</span><br><span class="font-semibold ${p.presupuesto-p.ejecutado>0?'text-green-600':'text-red-600'}">${DATA.formatCurrency(p.presupuesto-p.ejecutado)}</span></div>
        </div>
        <div class="flex justify-between text-xs mb-1"><span class="text-slate-500">Avance del proyecto</span><span class="font-semibold">${p.avance}%</span></div>
        <div class="progress-bar"><div class="progress-fill ${p.avance===100?'bg-green-500':p.avance>60?'bg-blue-500':'bg-yellow-500'}" style="width:${p.avance}%"></div></div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ---- RECTORÍA ----
function renderRectoria() {
  document.getElementById('admin-content').innerHTML = `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-user-graduate"></i></div><div><div class="stat-value">1,248</div><div class="stat-label">Estudiantes activos</div><div class="stat-change up">▲ 3.2%</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-university"></i></div><div><div class="stat-value">8</div><div class="stat-label">Programas activos</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-star"></i></div><div><div class="stat-value">3.9</div><div class="stat-label">Promedio institucional</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-yellow-100 text-yellow-600"><i class="fas fa-award"></i></div><div><div class="stat-value">2</div><div class="stat-label">Programas acreditados</div></div></div>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-chart-bar text-red-600"></i> Indicadores Institucionales</span></div>
      <div class="card-body space-y-4">
        ${[['Tasa de deserción','8.4%','bg-red-500',8],['Tasa de graduación','72%','bg-green-500',72],['Satisfacción estudiantil','87%','bg-blue-500',87],['Cumplimiento Plan Desarrollo','68%','bg-purple-500',68]].map(([l,v,c,p])=>`
        <div>
          <div class="flex justify-between text-sm mb-1"><span class="text-slate-600">${l}</span><span class="font-bold">${v}</span></div>
          <div class="progress-bar"><div class="progress-fill ${c}" style="width:${p}%"></div></div>
        </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-sitemap text-blue-600"></i> Dependencias</span></div>
      <div class="divide-y divide-slate-100">
        ${[['Vicerrectoría Académica','fa-graduation-cap','bg-blue-100 text-blue-600','Dr. García'],['Vicerrectoría Administrativa','fa-cogs','bg-green-100 text-green-600','Mg. Herrera'],['Facultad de Ingeniería','fa-microchip','bg-purple-100 text-purple-600','Dr. Ramírez'],['Facultad Ciencias Sociales','fa-users','bg-yellow-100 text-yellow-600','Dra. Castro'],['Bienestar Universitario','fa-heart','bg-red-100 text-red-600','Lic. Molina'],['Dirección de Sistemas','fa-server','bg-teal-100 text-teal-600','Mg. Herrera']].map(([dep,icon,cls,jefe])=>`
        <div class="flex items-center gap-3 px-4 py-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center ${cls} flex-shrink-0"><i class="fas ${icon} text-sm"></i></div>
          <div class="flex-1"><p class="text-sm font-semibold text-slate-700">${dep}</p><p class="text-xs text-slate-400">${jefe}</p></div>
          <button onclick="showToast('Abriendo ${dep}...','info')" class="text-slate-300 hover:text-blue-500 transition"><i class="fas fa-chevron-right text-xs"></i></button>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ---- BIENESTAR ----
function renderBienestar() {
  document.getElementById('admin-content').innerHTML = `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-pink-100 text-pink-600"><i class="fas fa-heart"></i></div><div><div class="stat-value">320</div><div class="stat-label">Beneficiarios activos</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-utensils"></i></div><div><div class="stat-value">85</div><div class="stat-label">Apoyos alimentarios</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-running"></i></div><div><div class="stat-value">12</div><div class="stat-label">Grupos deportivos</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-music"></i></div><div><div class="stat-value">8</div><div class="stat-label">Grupos culturales</div></div></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-heart text-pink-500"></i> Servicios de Bienestar Universitario</span></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      ${[['Apoyo Psicosocial','fa-brain','bg-indigo-100 text-indigo-600','Atención psicológica individual y grupal','48 casos activos'],
         ['Apoyo Socioeconómico','fa-hand-holding-usd','bg-green-100 text-green-600','Becas, subsidios y descuentos','62 beneficiarios'],
         ['Deporte y Recreación','fa-running','bg-blue-100 text-blue-600','Torneos y grupos deportivos','280 participantes'],
         ['Cultura y Arte','fa-palette','bg-purple-100 text-purple-600','Danza, música y teatro','150 integrantes'],
      ].map(([t,i,c,desc,n])=>`
      <div class="flex items-start gap-3 p-4 border border-slate-200 rounded-xl">
        <div class="w-12 h-12 ${c} rounded-xl flex items-center justify-center flex-shrink-0"><i class="fas ${i} text-lg"></i></div>
        <div><p class="font-bold text-slate-800">${t}</p><p class="text-xs text-slate-500 mt-0.5">${desc}</p><span class="badge-status badge-blue mt-2 inline-block">${n}</span></div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ---- REGISTRO Y CONTROL ----
function renderRegistro() {
  document.getElementById('admin-content').innerHTML = `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="fas fa-user-graduate"></i></div><div><div class="stat-value">1,248</div><div class="stat-label">Matriculados</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="fas fa-graduation-cap"></i></div><div><div class="stat-value">186</div><div class="stat-label">Grados 2026</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-yellow-100 text-yellow-600"><i class="fas fa-certificate"></i></div><div><div class="stat-value">43</div><div class="stat-label">Certificados pendientes</div></div></div>
    <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="fas fa-book-open"></i></div><div><div class="stat-value">142</div><div class="stat-label">Cursos activos</div></div></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-id-card text-blue-600"></i> Consulta de Estudiantes</span></div>
    <div class="card-body">
      <div class="flex gap-3 mb-4">
        <input type="text" placeholder="Buscar por nombre, código o documento..." class="form-control"/>
        <button onclick="showToast('Buscando estudiante...','info')" class="btn btn-primary">Buscar</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Código</th><th>Estudiante</th><th>Programa</th><th>Semestre</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>
          <tr><td class="font-mono text-xs">20231001</td><td class="font-semibold">Carlos A. Martínez</td><td>Ing. de Sistemas</td><td class="text-center">6</td><td><span class="badge-status badge-green">Activo</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-eye mr-1"></i>Ver</button></td></tr>
          <tr><td class="font-mono text-xs">20231002</td><td class="font-semibold">Ana L. Ospina</td><td>Ing. de Sistemas</td><td class="text-center">6</td><td><span class="badge-status badge-green">Activo</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-eye mr-1"></i>Ver</button></td></tr>
          <tr><td class="font-mono text-xs">20220045</td><td class="font-semibold">Roberto Pérez</td><td>Adm. de Empresas</td><td class="text-center">8</td><td><span class="badge-status badge-green">Activo</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-eye mr-1"></i>Ver</button></td></tr>
          <tr><td class="font-mono text-xs">20200088</td><td class="font-semibold">Luisa M. Vargas</td><td>Ing. Civil</td><td class="text-center">10</td><td><span class="badge-status badge-yellow">Grado pendiente</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-eye mr-1"></i>Ver</button></td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

// ============================================================
//  PERFIL
// ============================================================
function renderPerfil() {
  setActiveNav('perfil');
  document.getElementById('view-perfil').innerHTML = `
  <div class="fade-in max-w-2xl mx-auto">
    <div class="card mb-4">
      <div class="h-32 rounded-t-xl" style="background:linear-gradient(135deg,#1e3a8a,#6d28d9)"></div>
      <div class="px-6 pb-6">
        <div class="-mt-12 mb-4 flex items-end justify-between">
          <div class="w-24 h-24 rounded-2xl ${session.avatarClass} flex items-center justify-center text-white text-3xl font-black border-4 border-white shadow-lg">${session.avatar}</div>
          <button onclick="showToast('Editando perfil...','info')" class="btn btn-secondary btn-sm"><i class="fas fa-edit mr-1"></i>Editar</button>
        </div>
        <h2 class="text-xl font-bold">${session.name}</h2>
        <p class="text-slate-500 text-sm">${AUTH.roleLabels[session.role]||session.role} · ${session.code||''}</p>
        <p class="text-slate-500 text-sm mt-0.5"><i class="fas fa-envelope mr-1 text-slate-400"></i>${session.email||''}</p>
        ${session.program?`<p class="text-slate-500 text-sm mt-0.5"><i class="fas fa-graduation-cap mr-1 text-slate-400"></i>${session.program} — Semestre ${session.semester}</p>`:''}
        ${session.department?`<p class="text-slate-500 text-sm mt-0.5"><i class="fas fa-building mr-1 text-slate-400"></i>${session.department}</p>`:''}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-lock text-slate-500"></i> Cambiar Contraseña</span></div>
      <div class="card-body space-y-3">
        <div class="form-group"><label class="form-label">Contraseña actual</label><input type="password" class="form-control" placeholder="••••••••"/></div>
        <div class="form-group"><label class="form-label">Nueva contraseña</label><input type="password" class="form-control" placeholder="••••••••"/></div>
        <div class="form-group"><label class="form-label">Confirmar contraseña</label><input type="password" class="form-control" placeholder="••••••••"/></div>
        <button onclick="showToast('Contraseña actualizada correctamente','success')" class="btn btn-primary"><i class="fas fa-save mr-1"></i>Guardar cambios</button>
      </div>
    </div>
  </div>`;
}
