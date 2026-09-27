/* =============================================
   UniPlataforma — Dashboard (offline, sin CDN)
   ============================================= */
const session = AUTH.requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  buildSidebar();
  setupNotifications();
  showView('home');
  if (window.innerWidth < 768) document.getElementById('menu-btn').style.display = 'flex';
});

function setupUI() {
  const nav = document.getElementById('nav-avatar');
  nav.textContent = session.avatar;
  nav.className = 's-avatar ' + session.avatarClass;
  document.getElementById('nav-name').textContent = session.name;
  document.getElementById('nav-role').textContent = AUTH.roleLabels[session.role] || session.role;
  const ta = document.getElementById('topbar-avatar');
  ta.textContent = session.avatar;
  ta.className = 'tb-av ' + session.avatarClass;
  document.getElementById('topbar-name').textContent = session.name.split(' ')[0];
}

/* ── SIDEBAR CONFIG ── */
const navConfig = {
  estudiante: [
    { sec:'PRINCIPAL', items:[{id:'home',ic:'🏠',label:'Inicio'}] },
    { sec:'ACADÉMICO', items:[
      {id:'notas',ic:'⭐',label:'Mis Notas',view:'academico',tab:'notas'},
      {id:'certificados',ic:'📜',label:'Certificados',view:'academico',tab:'certificados'},
      {id:'pagos',ic:'💳',label:'Pagos / Volante',view:'academico',tab:'pagos'},
      {id:'horario',ic:'📅',label:'Mi Horario',view:'academico',tab:'horario'},
    ]},
    { sec:'CAMPUS VIRTUAL', items:[
      {id:'cursos',ic:'📚',label:'Mis Cursos',view:'lms',tab:'cursos'},
      {id:'tareas',ic:'✅',label:'Tareas',view:'lms',tab:'tareas',badge:'2'},
      {id:'recursos',ic:'📁',label:'Recursos',view:'lms',tab:'recursos'},
    ]},
    { sec:'MATRÍCULA', items:[
      {id:'matricula',ic:'📝',label:'Matricular Materias',view:'matricula'},
    ]},
    { sec:'PERSONAL', items:[{id:'perfil',ic:'👤',label:'Mi Perfil',view:'perfil'}] },
  ],
  profesor: [
    { sec:'PRINCIPAL', items:[{id:'home',ic:'🏠',label:'Inicio'}] },
    { sec:'DOCENCIA', items:[
      {id:'mis_cursos',ic:'📚',label:'Mis Cursos',view:'lms',tab:'cursos'},
      {id:'notas_prof',ic:'⭐',label:'Registro Notas',view:'academico',tab:'registro_notas'},
      {id:'actividades',ic:'✅',label:'Actividades',view:'lms',tab:'actividades_prof'},
      {id:'recursos_p',ic:'📁',label:'Material',view:'lms',tab:'recursos'},
    ]},
    { sec:'PERSONAL', items:[{id:'perfil',ic:'👤',label:'Mi Perfil',view:'perfil'}] },
  ],
  admin: [
    { sec:'PRINCIPAL', items:[{id:'home',ic:'🏠',label:'Inicio'}] },
    { sec:'GESTIÓN ACADÉMICA', items:[
      {id:'notas_adm',ic:'⭐',label:'Notas',view:'academico',tab:'notas'},
      {id:'certs_adm',ic:'📜',label:'Certificados',view:'academico',tab:'certificados'},
      {id:'pagos_adm',ic:'💳',label:'Pagos',view:'academico',tab:'pagos'},
      {id:'cursos_adm',ic:'📚',label:'Campus Virtual',view:'lms',tab:'cursos'},
      {id:'matricula_adm',ic:'📝',label:'Matrícula',view:'matricula'},
    ]},
    { sec:'ADMINISTRATIVO', items:[
      {id:'talento',ic:'👥',label:'Talento Humano',view:'admin',tab:'talento'},
      {id:'contabilidad',ic:'📊',label:'Contabilidad',view:'admin',tab:'contabilidad'},
      {id:'planeacion',ic:'🗂️',label:'Planeación',view:'admin',tab:'planeacion'},
      {id:'rectoria',ic:'👑',label:'Rectoría',view:'admin',tab:'rectoria'},
      {id:'bienestar',ic:'❤️',label:'Bienestar',view:'admin',tab:'bienestar'},
      {id:'registro',ic:'🪪',label:'Registro y Control',view:'admin',tab:'registro'},
    ]},
    { sec:'PERSONAL', items:[{id:'perfil',ic:'👤',label:'Mi Perfil',view:'perfil'}] },
  ],
};
['rectoria','talento_humano','contabilidad','planeacion','bienestar','registro'].forEach(r => { navConfig[r] = navConfig.admin; });

function buildSidebar() {
  const config = navConfig[session.role] || navConfig.admin;
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  config.forEach(section => {
    const t = document.createElement('div');
    t.className = 'nav-sec'; t.textContent = section.sec; nav.appendChild(t);
    section.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'nav-item'; el.id = 'nav-' + item.id;
      el.innerHTML = `<span class="ni">${item.ic}</span><span>${item.label}</span>${item.badge ? `<span class="nb">${item.badge}</span>` : ''}`;
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
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (!el) { if (view === 'matricula') { window.location.href = 'matricula.html'; } return; }
  el.classList.add('active');
  const titles = {
    home: ['Dashboard', `Bienvenido, ${session.name.split(' ')[0]}`],
    academico: ['Gestión Académica', 'Notas, certificados y pagos'],
    lms: ['Campus Virtual', 'Cursos, tareas y recursos'],
    admin: ['Módulo Administrativo', 'Dependencias universitarias'],
    perfil: ['Mi Perfil', 'Información personal'],
  };
  const [title, subtitle] = titles[view] || ['UniPlataforma', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;
  if (view === 'home') renderHome();
  else if (view === 'academico') renderAcademico(tab);
  else if (view === 'lms') renderLMS(tab);
  else if (view === 'admin') renderAdmin(tab);
  else if (view === 'perfil') renderPerfil();
}

/* ── TOAST ── */
function showToast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const t = document.getElementById('toast');
  t.className = 'toast ' + type;
  document.getElementById('toast-icon').textContent = icons[type] || '✅';
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ── MODAL ── */
function openModal(title, body, footer) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer || '<button class="btn b-secondary" onclick="closeModal()">Cerrar</button>';
  document.getElementById('global-modal').classList.add('open');
}
function closeModal() { document.getElementById('global-modal').classList.remove('open'); }
document.getElementById('global-modal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

/* ── NOTIFICACIONES ── */
function setupNotifications() {
  const icons = { success:'✅', warning:'⚠️', info:'ℹ️' };
  document.getElementById('notif-list').innerHTML = DATA.notificaciones.map(n => `
    <div class="notif-item">
      <div class="notif-ic" style="background:${n.tipo==='success'?'#dcfce7':n.tipo==='warning'?'#fef9c3':'#dbeafe'}">${icons[n.tipo]||'ℹ️'}</div>
      <div class="notif-txt flex-1">
        <p>${n.titulo}</p>
        <span>${n.msg}</span>
        <small>${n.tiempo}</small>
      </div>
      ${!n.leida ? '<div class="notif-dot"></div>' : ''}
    </div>`).join('');
}
function toggleNotif() { document.getElementById('notif-panel').classList.toggle('open'); }
document.addEventListener('click', e => {
  const p = document.getElementById('notif-panel');
  if (!p.classList.contains('open')) return;
  if (!e.target.closest('#notif-panel') && !e.target.closest('.ic-btn')) p.classList.remove('open');
});

/* ══════════════════════════════════════════════
   HOME
══════════════════════════════════════════════ */
function renderHome() {
  setActiveNav('home');
  const isEst = session.role === 'estudiante';
  const isProf = session.role === 'profesor';

  const statsEst = `<div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">⭐</div><div><div class="stat-v">4.2</div><div class="stat-l">Promedio actual</div><div class="stat-ch up">▲ 0.1 vs anterior</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">📚</div><div><div class="stat-v">4</div><div class="stat-l">Materias activas</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">✅</div><div><div class="stat-v">3</div><div class="stat-l">Tareas pendientes</div><div class="stat-ch dn">1 próxima a vencer</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fef9c3">💳</div><div><div class="stat-v">1</div><div class="stat-l">Pago pendiente</div></div></div>
  </div>`;
  const statsProf = `<div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">📚</div><div><div class="stat-v">3</div><div class="stat-l">Cursos activos</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">👥</div><div><div class="stat-v">90</div><div class="stat-l">Estudiantes</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ffedd5">✅</div><div><div class="stat-v">5</div><div class="stat-l">Actividades abiertas</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">📥</div><div><div class="stat-v">12</div><div class="stat-l">Entregas por calificar</div></div></div>
  </div>`;
  const statsAdm = `<div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">🎓</div><div><div class="stat-v">1,248</div><div class="stat-l">Estudiantes activos</div><div class="stat-ch up">▲ 3.2%</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">👨‍🏫</div><div><div class="stat-v">87</div><div class="stat-l">Docentes</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fef9c3">💰</div><div><div class="stat-v">$823M</div><div class="stat-l">Ingresos 2026</div><div class="stat-ch up">▲ 8.2%</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">🗂️</div><div><div class="stat-v">4</div><div class="stat-l">Proyectos activos</div></div></div>
  </div>`;

  document.getElementById('view-home').innerHTML = `
  <div>
    <div class="hero">
      <div>
        <div class="hero-period">📅 Viernes, 26 de Septiembre de 2026</div>
        <div class="hero-title">Hola, ${session.name.split(' ')[0]} 👋</div>
        <div class="hero-sub">${AUTH.roleLabels[session.role]||session.role} · ${session.code||''}</div>
      </div>
      <div class="hero-badge"><div class="hero-badge-v">2026‑1</div><div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:2px">Período académico</div></div>
    </div>
    ${isEst ? statsEst : isProf ? statsProf : statsAdm}
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div class="card">
        <div class="card-hd"><span class="card-ttl">⚡ Accesos Rápidos</span></div>
        <div class="card-bd"><div class="qa-grid">${buildQA()}</div></div>
      </div>
      <div class="card">
        <div class="card-hd"><span class="card-ttl">📅 Próximos eventos</span></div>
        <div>
          ${DATA.eventos.map(ev=>`
          <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #f1f5f9">
            <div style="width:40px;height:40px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;${ev.tipo==='tarea'?'background:#ffedd5;color:#c2410c':'background:#dbeafe;color:#1d4ed8'}">
              <span style="font-size:17px;line-height:1">${ev.fecha}</span><span>ago</span></div>
            <div style="flex:1;min-width:0"><p style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.titulo}</p>
              <p style="font-size:11px;color:#94a3b8">${ev.tipo==='tarea'?'Entrega':'Clase'}</p></div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function buildQA() {
  const items = session.role === 'estudiante' ? [
    {ic:'⭐',lbl:'Mis Notas',bg:'#3b82f6',act:"showView('academico','notas')"},
    {ic:'💳',lbl:'Pagos',bg:'#059669',act:"showView('academico','pagos')"},
    {ic:'📜',lbl:'Certificados',bg:'#d97706',act:"showView('academico','certificados')"},
    {ic:'📚',lbl:'Mis Cursos',bg:'#7c3aed',act:"showView('lms','cursos')"},
    {ic:'✅',lbl:'Tareas',bg:'#ea580c',act:"showView('lms','tareas')"},
    {ic:'📝',lbl:'Matrícula',bg:'#4338ca',act:"showView('matricula')"},
  ] : session.role === 'profesor' ? [
    {ic:'📚',lbl:'Cursos',bg:'#7c3aed',act:"showView('lms','cursos')"},
    {ic:'⭐',lbl:'Notas',bg:'#3b82f6',act:"showView('academico','registro_notas')"},
    {ic:'✅',lbl:'Actividades',bg:'#ea580c',act:"showView('lms','actividades_prof')"},
    {ic:'📁',lbl:'Material',bg:'#059669',act:"showView('lms','recursos')"},
    {ic:'👤',lbl:'Mi Perfil',bg:'#475569',act:"showView('perfil')"},
  ] : [
    {ic:'👥',lbl:'Talento Humano',bg:'#d97706',act:"showView('admin','talento')"},
    {ic:'📊',lbl:'Contabilidad',bg:'#059669',act:"showView('admin','contabilidad')"},
    {ic:'🗂️',lbl:'Planeación',bg:'#0d9488',act:"showView('admin','planeacion')"},
    {ic:'👑',lbl:'Rectoría',bg:'#dc2626',act:"showView('admin','rectoria')"},
    {ic:'⭐',lbl:'Notas',bg:'#3b82f6',act:"showView('academico','notas')"},
    {ic:'📚',lbl:'Campus Virtual',bg:'#7c3aed',act:"showView('lms','cursos')"},
  ];
  return items.map(i=>`
    <button onclick="${i.act}" class="qa-btn">
      <div class="qa-ic" style="background:${i.bg}">${i.ic}</div>
      <span class="qa-lbl">${i.lbl}</span>
    </button>`).join('');
}

/* ══════════════════════════════════════════════
   ACADÉMICO
══════════════════════════════════════════════ */
function renderAcademico(tab='notas') {
  const isProf = session.role === 'profesor';
  const tabs = isProf
    ? [['registro_notas','Registrar Notas','⭐'],['notas','Ver Notas','📋'],['certificados','Certificados','📜']]
    : [['notas','Mis Notas','⭐'],['certificados','Certificados','📜'],['pagos','Pagos','💳'],['horario','Horario','📅']];

  document.getElementById('view-academico').innerHTML = `
  <div class="tabs-bar mb-4">
    ${tabs.map(([id,lbl,ic])=>`<button class="t-btn ${tab===id?'active':''}" onclick="renderAcademico('${id}')">${ic} ${lbl}</button>`).join('')}
  </div>
  <div id="acad-content"></div>`;

  if (tab==='notas') renderNotas();
  else if (tab==='registro_notas') renderRegistroNotas();
  else if (tab==='certificados') renderCertificados();
  else if (tab==='pagos') renderPagos();
  else if (tab==='horario') renderHorario();
}

function nc(n) { if(!n) return 'color:#94a3b8'; return n>=3?'color:#059669':'color:#dc2626'; }

function renderNotas() {
  const act = DATA.materias.filter(m=>m.periodo==='2026-1');
  const ant = DATA.materias.filter(m=>m.periodo!=='2026-1');
  document.getElementById('acad-content').innerHTML = `
  <div class="grid-3 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">⭐</div><div><div class="stat-v">4.2</div><div class="stat-l">Promedio 2026-1</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">📚</div><div><div class="stat-v">${act.length}</div><div class="stat-l">Materias activas</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">🎓</div><div><div class="stat-v">82</div><div class="stat-l">Créditos acumulados</div></div></div>
  </div>
  <div class="card mb-4">
    <div class="card-hd">
      <span class="card-ttl">⭐ Materias — Semestre 2026-1</span>
      <button class="btn b-secondary b-sm" onclick="showHistorial()">📋 Historial</button>
    </div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Código</th><th>Materia</th><th>Cred.</th><th>Nota 1</th><th>Nota 2</th><th>Nota 3</th><th>Definitiva</th><th>Estado</th></tr></thead>
        <tbody>${act.map(m=>`<tr>
          <td><code style="font-size:11px;color:#64748b">${m.codigo}</code></td>
          <td><strong>${m.nombre}</strong><br><span style="font-size:11px;color:#94a3b8">${m.profesor}</span></td>
          <td style="text-align:center">${m.creditos}</td>
          <td style="text-align:center;font-weight:700;${nc(m.nota1)}">${m.nota1||'—'}</td>
          <td style="text-align:center;font-weight:700;${nc(m.nota2)}">${m.nota2||'—'}</td>
          <td style="text-align:center;font-weight:700;${nc(m.nota3)}">${m.nota3||'—'}</td>
          <td style="text-align:center"><div class="nc ${m.definitiva?(m.definitiva>=3?'nc-ok':'nc-fail'):'nc-pend'}" style="margin:auto">${m.definitiva||'—'}</div></td>
          <td><span class="bs ${m.estado==='aprobado'?'bg-g':m.estado==='reprobado'?'bg-r':'bg-b'}">${m.estado==='en_curso'?'En Curso':m.estado==='aprobado'?'Aprobado':'Reprobado'}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-ttl">📋 Períodos Anteriores</span></div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Código</th><th>Materia</th><th>Créditos</th><th>Definitiva</th><th>Estado</th><th>Período</th></tr></thead>
        <tbody>${ant.map(m=>`<tr>
          <td><code style="font-size:11px;color:#64748b">${m.codigo}</code></td>
          <td style="font-weight:600">${m.nombre}</td>
          <td style="text-align:center">${m.creditos}</td>
          <td style="text-align:center;font-weight:800;font-size:16px;${nc(m.definitiva)}">${m.definitiva}</td>
          <td><span class="bs ${m.estado==='aprobado'?'bg-g':'bg-r'}">${m.estado==='aprobado'?'Aprobado':'Reprobado'}</span></td>
          <td><span class="bs bg-s">${m.periodo}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function showHistorial() {
  const h=[{s:'2024-1',p:3.8,c:18},{s:'2024-2',p:3.9,c:16},{s:'2025-1',p:4.1,c:20},{s:'2025-2',p:4.3,c:18},{s:'2026-1',p:null,c:16}];
  openModal('Historial Académico',`<table class="tbl"><thead><tr><th>Semestre</th><th>Créditos</th><th>Promedio</th></tr></thead>
  <tbody>${h.map(x=>`<tr><td style="font-weight:600">${x.s}</td><td style="text-align:center">${x.c}</td>
    <td style="text-align:center;font-weight:800;font-size:16px;${x.p?(x.p>=3?'color:#059669':'color:#dc2626'):'color:#94a3b8'}">${x.p||'En curso'}</td></tr>`).join('')}
  </tbody></table>`);
}

function renderRegistroNotas() {
  document.getElementById('acad-content').innerHTML = `
  <div class="card">
    <div class="card-hd">
      <span class="card-ttl">✏️ Registro de Notas — Bases de Datos II (IS-305) Grupo A</span>
      <button class="btn b-success b-sm" onclick="showToast('Notas guardadas','success')">💾 Guardar</button>
    </div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Código</th><th>Estudiante</th><th>Nota 1 (30%)</th><th>Nota 2 (30%)</th><th>Nota 3 (40%)</th><th>Definitiva</th></tr></thead>
        <tbody>${DATA.listaEstudiantes.map(e=>{
          const def=e.nota1&&e.nota2?((e.nota1*.3)+(e.nota2*.3)).toFixed(1):null;
          return`<tr>
            <td><code style="font-size:11px;color:#64748b">${e.codigo}</code></td>
            <td style="font-weight:600">${e.nombre}</td>
            <td><input type="number" min="0" max="5" step=".1" value="${e.nota1||''}" placeholder="0.0" style="width:70px;padding:4px 8px;border:1.5px solid #d1d5db;border-radius:6px;text-align:center;font-weight:700"/></td>
            <td><input type="number" min="0" max="5" step=".1" value="${e.nota2||''}" placeholder="0.0" style="width:70px;padding:4px 8px;border:1.5px solid #d1d5db;border-radius:6px;text-align:center;font-weight:700"/></td>
            <td><input type="number" min="0" max="5" step=".1" value="" placeholder="0.0" style="width:70px;padding:4px 8px;border:1.5px solid #d1d5db;border-radius:6px;text-align:center;font-weight:700"/></td>
            <td><span style="font-weight:800;font-size:16px;${def?(parseFloat(def)>=3?'color:#059669':'color:#dc2626'):'color:#cbd5e1'}">${def||'—'}</span></td>
          </tr>`;}).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 16px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b">
      ℹ️ Período 2026-1 · Fecha límite de registro: 30 de septiembre de 2026
    </div>
  </div>`;
}

function renderCertificados() {
  document.getElementById('acad-content').innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px">
    ${[['📄','Certificado de Estudios','#dbeafe'],['⭐','Constancia de Notas','#dcfce7'],['✅','Paz y Salvo Financiero','#fef9c3'],['🪪','Certificado de Matrícula','#ede9fe'],['🎓','Constancia de Egresado','#e0e7ff'],['✉️','Carta de Presentación','#fce7f3']].map(([ic,t,bg])=>`
    <button onclick="solicitarCert('${t}')" style="display:flex;align-items:center;gap:14px;padding:16px;background:white;border-radius:12px;border:2px solid #e2e8f0;cursor:pointer;transition:all .18s;text-align:left;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,.06)"
      onmouseover="this.style.borderColor='#93c5fd';this.style.boxShadow='0 4px 12px rgba(0,0,0,.1)'"
      onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 1px 3px rgba(0,0,0,.06)'">
      <div style="width:46px;height:46px;background:${bg};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${ic}</div>
      <div><p style="font-weight:700;font-size:14px;color:#1e293b">${t}</p><p style="font-size:12px;color:#64748b;margin-top:2px">Click para solicitar</p></div>
      <span style="margin-left:auto;color:#cbd5e1;font-size:12px">›</span>
    </button>`).join('')}
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-ttl">🕐 Mis Solicitudes</span></div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Tipo</th><th>Solicitado</th><th>Fecha emisión</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${DATA.certificados.map(c=>`<tr>
          <td style="font-weight:600">${c.tipo}</td>
          <td>${DATA.formatDate(c.solicitado)}</td>
          <td>${DATA.formatDate(c.fecha)}</td>
          <td><span class="bs ${c.estado==='disponible'?'bg-g':'bg-y'}">${c.estado==='disponible'?'✅ Disponible':'⏳ En proceso'}</span></td>
          <td>${c.estado==='disponible'
            ?`<button onclick="showToast('Descargando PDF...','info')" class="btn b-primary b-sm">⬇️ Descargar</button>`
            :`<span style="font-size:12px;color:#94a3b8">En proceso...</span>`}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function solicitarCert(tipo) {
  openModal(`📄 Solicitar: ${tipo}`,`
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:12px;font-size:13px;color:#1d4ed8;margin-bottom:16px">
    ℹ️ Disponible en <strong>2 a 5 días hábiles</strong> después de la solicitud.
  </div>
  <div class="f-group"><label class="f-label">Destino</label>
    <select class="f-ctrl"><option>Uso personal</option><option>Entidad financiera</option><option>Empresa / Empleador</option><option>Otro</option></select></div>
  <div class="f-group"><label class="f-label">Número de copias</label><input type="number" min="1" max="5" value="1" class="f-ctrl"/></div>
  <div class="f-group"><label class="f-label">Observaciones</label><textarea class="f-ctrl" rows="2" placeholder="Indicaciones adicionales..."></textarea></div>`,
  `<button class="btn b-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn b-primary" onclick="closeModal();showToast('Solicitud enviada correctamente','success')">📤 Enviar Solicitud</button>`);
}

function renderPagos() {
  const pagado=DATA.pagos.filter(p=>p.estado==='pagado').reduce((a,p)=>a+p.valor,0);
  const pend=DATA.pagos.filter(p=>p.estado==='pendiente').reduce((a,p)=>a+p.valor,0);
  document.getElementById('acad-content').innerHTML = `
  <div class="grid-3 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">✅</div><div><div class="stat-v" style="font-size:18px;color:#059669">${DATA.formatCurrency(pagado)}</div><div class="stat-l">Total pagado 2026</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fee2e2">🕐</div><div><div class="stat-v" style="font-size:18px;color:#dc2626">${DATA.formatCurrency(pend)}</div><div class="stat-l">Pendiente</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">🧾</div><div><div class="stat-v">${DATA.pagos.length}</div><div class="stat-l">Total recibos</div></div></div>
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-ttl">💳 Estado de Cuenta</span></div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Concepto</th><th>Valor</th><th>Fecha límite</th><th>Fecha pago</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${DATA.pagos.map(p=>`<tr>
          <td style="font-weight:600">${p.concepto}</td>
          <td style="font-weight:700">${DATA.formatCurrency(p.valor)}</td>
          <td>${DATA.formatDate(p.fecha_limite)}</td>
          <td>${DATA.formatDate(p.fecha_pago)}</td>
          <td><span class="bs ${p.estado==='pagado'?'bg-g':'bg-r'}">${p.estado==='pagado'?'✅ Pagado':'❌ Pendiente'}</span></td>
          <td>${p.estado==='pagado'
            ?`<button onclick="showToast('Descargando comprobante...','info')" class="btn b-secondary b-sm">🧾 Comprobante</button>`
            :`<button onclick="generarVolante('${p.concepto}',${p.valor})" class="btn b-primary b-sm">📄 Volante</button>`}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function generarVolante(concepto,valor) {
  openModal('📄 Volante de Pago',`
  <div style="border:2px dashed #cbd5e1;border-radius:14px;padding:24px;text-align:center">
    <div style="font-size:36px;margin-bottom:8px">🏛️</div>
    <h3 style="font-weight:800;font-size:17px">UniPlataforma — Universidad</h3>
    <p style="color:#64748b;font-size:13px;margin-bottom:16px">NIT: 900.123.456-7</p>
    <div style="background:#f8fafc;border-radius:10px;padding:16px;text-align:left">
      ${[['Estudiante',session.name],['Código',session.code],['Concepto',concepto],['Valor',DATA.formatCurrency(valor)],['Vence','25 de julio de 2026'],['Referencia',`REF-2026-${session.code}`]].map(([k,v])=>
        `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:13px"><span style="color:#64748b">${k}:</span><span style="font-weight:600">${v}</span></div>`).join('')}
    </div>
    <p style="font-size:11px;color:#94a3b8;margin-top:14px">Puedes pagar en: Banco Agrario, Bancolombia, PSE o caja de tesorería.</p>
  </div>`,
  `<button class="btn b-secondary" onclick="closeModal()">Cerrar</button>
   <button class="btn b-primary" onclick="showToast('Volante descargado','success');closeModal()">⬇️ Descargar PDF</button>`);
}

function renderHorario() {
  const h=[
    {dia:'Lunes',hora:'07:00–09:00',mat:'Bases de Datos II',salon:'Lab B-205',prof:'Dra. Sánchez',bg:'#ede9fe',c:'#6d28d9'},
    {dia:'Lunes',hora:'09:00–11:00',mat:'Ing. de Software',salon:'Sal 301',prof:'Mg. Torres',bg:'#dbeafe',c:'#1d4ed8'},
    {dia:'Martes',hora:'08:00–10:00',mat:'Estructuras de Datos',salon:'Lab A-102',prof:'Dr. Ramírez',bg:'#dcfce7',c:'#15803d'},
    {dia:'Miércoles',hora:'07:00–09:00',mat:'Bases de Datos II',salon:'Lab B-205',prof:'Dra. Sánchez',bg:'#ede9fe',c:'#6d28d9'},
    {dia:'Jueves',hora:'14:00–16:00',mat:'Ing. de Software',salon:'Sal 301',prof:'Mg. Torres',bg:'#dbeafe',c:'#1d4ed8'},
    {dia:'Viernes',hora:'08:00–10:00',mat:'Estructuras de Datos',salon:'Lab A-102',prof:'Dr. Ramírez',bg:'#dcfce7',c:'#15803d'},
  ];
  document.getElementById('acad-content').innerHTML = `
  <div class="card">
    <div class="card-hd"><span class="card-ttl">📅 Mi Horario — Semestre 2026-1</span><button class="btn b-secondary b-sm" onclick="showToast('Exportando horario...','info')">⬇️ Exportar</button></div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Día</th><th>Horario</th><th>Materia</th><th>Salón</th><th>Docente</th></tr></thead>
        <tbody>${h.map(x=>`<tr>
          <td style="font-weight:700">${x.dia}</td>
          <td><code style="background:#f1f5f9;padding:3px 8px;border-radius:5px;font-size:12px">${x.hora}</code></td>
          <td><span style="background:${x.bg};color:${x.c};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">${x.mat}</span></td>
          <td>📍 ${x.salon}</td>
          <td>${x.prof}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════
   LMS
══════════════════════════════════════════════ */
function renderLMS(tab='cursos') {
  const isProf = session.role === 'profesor';
  const tabs = isProf
    ? [['cursos','Mis Cursos','📚'],['actividades_prof','Actividades','✅'],['recursos','Material','📁']]
    : [['cursos','Mis Cursos','📚'],['tareas','Tareas','✅'],['recursos','Recursos','📁']];
  document.getElementById('view-lms').innerHTML = `
  <div class="tabs-bar mb-4">
    ${tabs.map(([id,lbl,ic])=>`<button class="t-btn ${tab===id?'active':''}" onclick="renderLMS('${id}')">${ic} ${lbl}</button>`).join('')}
  </div>
  <div id="lms-content"></div>`;
  if (tab==='cursos') renderCursos();
  else if (tab==='tareas') renderTareas();
  else if (tab==='actividades_prof') renderActProf();
  else if (tab==='recursos') renderRecursos();
}

function renderCursos() {
  const isProf = session.role === 'profesor';
  document.getElementById('lms-content').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <strong style="color:#334155">${DATA.cursos.length} cursos activos — 2026-1</strong>
    <div style="display:flex;gap:8px">
      ${isProf?`<button onclick="crearCursoModal()" class="btn b-primary b-sm">➕ Nuevo Curso</button>`:''}
      ${!isProf?`<a href="matricula.html" class="btn b-outline b-sm">📝 Ir a Matrícula</a>`:''}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
    ${DATA.cursos.map(c=>`
    <div class="course-card" onclick="verCurso(${c.id})">
      <div class="cc-img" style="background:${c.color}">${c.icon}</div>
      <div class="cc-body">
        <div class="cc-title">${c.nombre}</div>
        <div class="cc-meta">📌 ${c.codigo} · Grupo ${c.grupo}</div>
        <div class="cc-meta">👤 ${c.profesor}</div>
        <div class="cc-meta" style="margin-bottom:10px">👥 ${c.estudiantes} estudiantes</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#64748b">Progreso</span><span style="font-weight:700">${c.progreso}%</span></div>
        <div class="prog-bar"><div class="prog-fill" style="width:${c.progreso}%;background:${c.progreso===100?'#22c55e':c.progreso>60?'#3b82f6':'#eab308'}"></div></div>
      </div>
    </div>`).join('')}
  </div>`;
}

function verCurso(id) { window.location.href = `curso.html?id=${id}`; }

function renderTareas() {
  const pend = DATA.actividades.filter(a=>a.estado_est==='pendiente');
  document.getElementById('lms-content').innerHTML = `
  <div class="grid-3 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#ffedd5">⏰</div><div><div class="stat-v" style="color:#ea580c">${pend.length}</div><div class="stat-l">Pendientes</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">✅</div><div><div class="stat-v" style="color:#059669">${DATA.actividades.filter(a=>a.estado_est!=='pendiente').length}</div><div class="stat-l">Entregadas</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">📊</div><div><div class="stat-v" style="color:#2563eb">87%</div><div class="stat-l">Tasa de entrega</div></div></div>
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-ttl">✅ Todas las actividades</span></div>
    <div class="divide-y">
      ${DATA.actividades.map(a=>{
        const c=DATA.cursos.find(x=>x.id===a.cursoId);
        const tcol={taller:'#dbeafe;color:#1d4ed8',quiz:'#fef9c3;color:#854d0e',proyecto:'#ede9fe;color:#6d28d9',informe:'#dcfce7;color:#15803d'}[a.tipo]||'#f1f5f9;color:#475569';
        return `<div style="padding:16px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                <span style="background:${tcol};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600">${a.tipo}</span>
                <span style="font-size:12px;color:#94a3b8">${c?.nombre||''}</span>
              </div>
              <p style="font-weight:700;color:#1e293b">${a.titulo}</p>
              <p style="font-size:13px;color:#64748b;margin-top:2px">${a.descripcion}</p>
              <p style="font-size:11px;color:#94a3b8;margin-top:6px">📅 ${DATA.formatDate(a.fechaEntrega)} · ⭐ ${a.puntos} pts · Corte ${a.corte||'?'}</p>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
              <span class="bs ${a.estado_est==='calificado'?'bg-g':a.estado_est==='entregado'?'bg-b':'bg-r'}">${a.estado_est==='calificado'?`✓ ${a.nota}/${a.puntos}`:a.estado_est==='entregado'?'Entregado':'Pendiente'}</span>
              ${a.estado_est==='pendiente'?`<button onclick="entregarTarea(${a.id})" class="btn b-primary b-sm">⬆️ Entregar</button>`:''}
            </div>
          </div>
        </div>`;}).join('')}
    </div>
  </div>`;
}

function entregarTarea(id) {
  const a=DATA.actividades.find(x=>x.id===id);
  openModal(`📤 Entregar: ${a.titulo}`,`
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:12px;margin-bottom:14px;font-size:13px">
    <strong style="color:#1d4ed8">${a.titulo}</strong><br>
    <span style="color:#3b82f6">Corte ${a.corte} · Fecha: ${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</span>
  </div>
  <div class="upload-area" onclick="document.getElementById('fup-${id}').click()">
    <div style="font-size:40px;margin-bottom:8px">☁️</div>
    <p style="font-weight:600;color:#475569">Arrastra tu archivo aquí</p>
    <p style="font-size:12px;color:#94a3b8;margin-top:4px">PDF, DOCX, ZIP — máx. 20MB</p>
    <input type="file" id="fup-${id}" class="hidden" accept=".pdf,.docx,.zip" onchange="document.getElementById('fn-${id}').style.display='flex';document.getElementById('fn-${id}').querySelector('span').textContent=this.files[0].name"/>
  </div>
  <div id="fn-${id}" style="display:none;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin-top:8px;font-size:13px;color:#15803d">✅ <span></span></div>
  <div class="f-group" style="margin-top:14px"><label class="f-label">Comentario (opcional)</label><textarea class="f-ctrl" rows="2" placeholder="Escribe un comentario..."></textarea></div>`,
  `<button class="btn b-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn b-success" onclick="DATA.actividades.find(x=>x.id===${id}).estado_est='entregado';closeModal();showToast('¡Tarea entregada! 🎉','success');renderTareas()">📤 Enviar entrega</button>`);
}

function renderActProf() {
  document.getElementById('lms-content').innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <strong style="color:#334155">Gestión de Actividades</strong>
    <button onclick="crearActModal()" class="btn b-primary b-sm">➕ Nueva Actividad</button>
  </div>
  <div class="card">
    <div class="divide-y">
      ${DATA.actividades.map(a=>{
        const c=DATA.cursos.find(x=>x.id===a.cursoId);
        const n=Math.floor(Math.random()*20+3);
        return `<div style="padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div><p style="font-weight:700;color:#1e293b">${a.titulo}</p>
            <p style="font-size:12px;color:#64748b">${c?.nombre||''} · Corte ${a.corte} · ${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</p></div>
          <div style="display:flex;gap:8px">
            <button onclick="verEntregasModal(${a.id})" class="btn b-secondary b-sm">📥 ${n} entregas</button>
            <button onclick="showToast('Editando...','info')" class="btn b-outline b-sm">✏️</button>
          </div>
        </div>`;}).join('')}
    </div>
  </div>`;
}

function verEntregasModal(id) {
  const a=DATA.actividades.find(x=>x.id===id);
  openModal(`📥 Entregas: ${a.titulo}`,`
  <table class="tbl"><thead><tr><th>Estudiante</th><th>Estado</th><th>Calificación</th><th></th></tr></thead>
  <tbody>${DATA.listaEstudiantes.map(e=>`<tr>
    <td style="font-weight:600">${e.nombre}</td>
    <td><span class="bs bg-b">Entregado</span></td>
    <td><input type="number" min="0" max="${a.puntos}" style="width:65px;padding:4px 8px;border:1.5px solid #d1d5db;border-radius:6px;text-align:center;font-weight:700" placeholder="—"/>
      <span style="font-size:11px;color:#94a3b8">/${a.puntos}</span></td>
    <td><button onclick="showToast('Nota guardada','success')" class="btn b-success b-sm">✅</button></td>
  </tr>`).join('')}</tbody></table>`);
}

function crearActModal() {
  openModal('➕ Nueva Actividad',`
  <div class="f-group"><label class="f-label">Curso</label><select class="f-ctrl">${DATA.cursos.map(c=>`<option>${c.nombre}</option>`).join('')}</select></div>
  <div class="f-group"><label class="f-label">Título</label><input type="text" class="f-ctrl" placeholder="Ej: Taller 3 — SQL Avanzado"/></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="f-group"><label class="f-label">Tipo</label><select class="f-ctrl"><option>Taller</option><option>Quiz</option><option>Proyecto</option><option>Informe</option><option>Parcial</option></select></div>
    <div class="f-group"><label class="f-label">Corte</label><select class="f-ctrl"><option>1</option><option>2</option><option>3</option></select></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="f-group"><label class="f-label">Fecha límite</label><input type="date" class="f-ctrl"/></div>
    <div class="f-group"><label class="f-label">Puntos</label><input type="number" class="f-ctrl" value="50"/></div>
  </div>
  <div class="f-group"><label class="f-label">Descripción</label><textarea class="f-ctrl" rows="3" placeholder="Descripción..."></textarea></div>`,
  `<button class="btn b-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn b-primary" onclick="closeModal();showToast('Actividad publicada','success')">✅ Publicar</button>`);
}

function crearCursoModal() {
  openModal('📚 Nuevo Curso',`
  <div class="f-group"><label class="f-label">Nombre del curso</label><input type="text" class="f-ctrl"/></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="f-group"><label class="f-label">Código</label><input type="text" class="f-ctrl" placeholder="IS-XXX"/></div>
    <div class="f-group"><label class="f-label">Grupo</label><input type="text" class="f-ctrl" placeholder="A"/></div>
  </div>
  <div class="f-group"><label class="f-label">Período</label><select class="f-ctrl"><option>2026-1</option><option>2026-2</option></select></div>`,
  `<button class="btn b-secondary" onclick="closeModal()">Cancelar</button>
   <button class="btn b-primary" onclick="closeModal();showToast('Curso creado','success')">✅ Crear</button>`);
}

function renderRecursos() {
  const rs=[
    {n:'Guía_Normalización_3FN.pdf',t:'pdf',s:'2.3 MB',f:'2026-08-15',c:'Bases de Datos II'},
    {n:'Diapositivas_Semana1-5.pptx',t:'ppt',s:'8.4 MB',f:'2026-07-30',c:'BD II'},
    {n:'Ejercicios_SQL_Avanzado.zip',t:'zip',s:'1.1 MB',f:'2026-08-10',c:'BD II'},
    {n:'Videoclase_Sem8.mp4',t:'video',s:'380 MB',f:'2026-08-20',c:'Estructuras'},
    {n:'Enunciado_Proyecto_Final.pdf',t:'pdf',s:'540 KB',f:'2026-08-25',c:'BD II'},
  ];
  const ics={pdf:'📄',ppt:'📊',zip:'🗜️',video:'🎬',doc:'📝'};
  const isProf=session.role==='profesor';
  document.getElementById('lms-content').innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <strong>Material del curso</strong>
    ${isProf?`<button onclick="showToast('Subiendo material...','info')" class="btn b-primary b-sm">⬆️ Subir Material</button>`:''}
  </div>
  <div class="card">
    <div class="divide-y">
      ${rs.map(r=>`<div style="display:flex;align-items:center;gap:14px;padding:14px 18px">
        <div style="width:44px;height:44px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${ics[r.t]||'📄'}</div>
        <div style="flex:1;min-width:0">
          <p style="font-weight:600;font-size:14px;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.n}</p>
          <p style="font-size:12px;color:#94a3b8">${r.c} · ${r.s} · ${DATA.formatDate(r.f)}</p>
        </div>
        <button onclick="showToast('Descargando ${r.n}','info')" class="btn b-primary b-sm">⬇️</button>
      </div>`).join('')}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════
   ADMINISTRATIVO
══════════════════════════════════════════════ */
function renderAdmin(tab='talento') {
  const allTabs=[['talento','Talento Humano','👥'],['contabilidad','Contabilidad','📊'],['planeacion','Planeación','🗂️'],['rectoria','Rectoría','👑'],['bienestar','Bienestar','❤️'],['registro','Registro y Control','🪪']];
  const limited={talento_humano:[allTabs[0]],contabilidad:[allTabs[1]],planeacion:[allTabs[2]],rectoria:allTabs.slice(0,4)};
  const tabs=limited[session.role]||allTabs;
  document.getElementById('view-admin').innerHTML = `
  <div class="tabs-bar mb-4">
    ${tabs.map(([id,lbl,ic])=>`<button class="t-btn ${tab===id?'active':''}" onclick="renderAdmin('${id}')">${ic} ${lbl}</button>`).join('')}
  </div>
  <div id="admin-content"></div>`;
  if(tab==='talento') renderTalento();
  else if(tab==='contabilidad') renderContabilidad();
  else if(tab==='planeacion') renderPlaneacion();
  else if(tab==='rectoria') renderRectoria();
  else if(tab==='bienestar') renderBienestar();
  else if(tab==='registro') renderRegistro();
}

function renderTalento() {
  const nom=DATA.empleados.reduce((a,e)=>a+e.salario,0);
  document.getElementById('admin-content').innerHTML=`
  <div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">👥</div><div><div class="stat-v">${DATA.empleados.length}</div><div class="stat-l">Total empleados</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">✅</div><div><div class="stat-v">${DATA.empleados.filter(e=>e.estado==='activo').length}</div><div class="stat-l">Activos</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">👨‍🏫</div><div><div class="stat-v">${DATA.empleados.filter(e=>e.tipo==='planta'||e.tipo==='hora_catedra').length}</div><div class="stat-l">Docentes</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fef9c3">💰</div><div><div class="stat-v" style="font-size:16px">${DATA.formatCurrency(nom)}</div><div class="stat-l">Nómina mensual</div></div></div>
  </div>
  <div class="card">
    <div class="card-hd">
      <span class="card-ttl">👥 Planta de Personal</span>
      <div style="display:flex;gap:8px">
        <button onclick="showToast('Formulario de nuevo empleado...','info')" class="btn b-primary b-sm">➕ Agregar</button>
        <button onclick="showToast('Exportando nómina...','info')" class="btn b-secondary b-sm">⬇️ Exportar</button>
      </div>
    </div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Nombre</th><th>Cargo</th><th>Dependencia</th><th>Tipo</th><th>Salario</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${DATA.empleados.map(e=>`<tr>
          <td><strong>${e.nombre}</strong><br><code style="font-size:10px;color:#94a3b8">${e.doc}</code></td>
          <td style="font-size:13px">${e.cargo}</td>
          <td><span class="bs bg-b">${e.dependencia}</span></td>
          <td><span class="bs ${e.tipo==='planta'?'bg-g':e.tipo==='administrativo'?'bg-p':'bg-y'}">${e.tipo==='hora_catedra'?'Hora Cátedra':e.tipo==='planta'?'Planta':'Admin'}</span></td>
          <td style="font-weight:600">${DATA.formatCurrency(e.salario)}</td>
          <td><span class="bs ${e.estado==='activo'?'bg-g':'bg-y'}">${e.estado==='activo'?'Activo':'Licencia'}</span></td>
          <td style="display:flex;gap:4px">
            <button onclick="showToast('Abriendo hoja de vida...','info')" class="btn b-secondary b-sm">👁️</button>
            <button onclick="showToast('Editando...','info')" class="btn b-outline b-sm">✏️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function renderContabilidad() {
  const ing=DATA.movimientos.filter(m=>m.tipo==='ingreso').reduce((a,m)=>a+m.valor,0);
  const egr=DATA.movimientos.filter(m=>m.tipo==='egreso').reduce((a,m)=>a+m.valor,0);
  document.getElementById('admin-content').innerHTML=`
  <div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">⬆️</div><div><div class="stat-v" style="font-size:16px;color:#059669">${DATA.formatCurrency(ing)}</div><div class="stat-l">Ingresos</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fee2e2">⬇️</div><div><div class="stat-v" style="font-size:16px;color:#dc2626">${DATA.formatCurrency(egr)}</div><div class="stat-l">Egresos</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">⚖️</div><div><div class="stat-v" style="font-size:16px;${ing-egr>0?'color:#059669':'color:#dc2626'}">${DATA.formatCurrency(ing-egr)}</div><div class="stat-l">Balance</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">🧾</div><div><div class="stat-v">${DATA.movimientos.length}</div><div class="stat-l">Movimientos</div></div></div>
  </div>
  <div class="card">
    <div class="card-hd">
      <span class="card-ttl">📊 Libro de Movimientos</span>
      <div style="display:flex;gap:8px">
        <button onclick="showToast('Nuevo movimiento...','info')" class="btn b-primary b-sm">➕ Nuevo</button>
        <button onclick="showToast('Exportando...','info')" class="btn b-secondary b-sm">⬇️ Exportar</button>
      </div>
    </div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr><th>Concepto</th><th>Tipo</th><th>Valor</th><th>Fecha</th><th>Cuenta</th></tr></thead>
        <tbody>${DATA.movimientos.map(m=>`<tr>
          <td style="font-weight:600">${m.concepto}</td>
          <td><span class="bs ${m.tipo==='ingreso'?'bg-g':'bg-r'}">${m.tipo==='ingreso'?'⬆️ Ingreso':'⬇️ Egreso'}</span></td>
          <td style="font-weight:700;${m.tipo==='ingreso'?'color:#059669':'color:#dc2626'}">${DATA.formatCurrency(m.valor)}</td>
          <td>${DATA.formatDate(m.fecha)}</td>
          <td style="font-size:12px;color:#64748b">${m.cuenta}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function renderPlaneacion() {
  document.getElementById('admin-content').innerHTML=`
  <div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#ccfbf1">🗂️</div><div><div class="stat-v">${DATA.proyectos.length}</div><div class="stat-l">Total proyectos</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">🔄</div><div><div class="stat-v">${DATA.proyectos.filter(p=>p.estado==='en_ejecucion').length}</div><div class="stat-l">En ejecución</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">✅</div><div><div class="stat-v">${DATA.proyectos.filter(p=>p.estado==='completado').length}</div><div class="stat-l">Completados</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fef9c3">💰</div><div><div class="stat-v" style="font-size:15px">${DATA.formatCurrency(DATA.proyectos.reduce((a,p)=>a+p.presupuesto,0))}</div><div class="stat-l">Presupuesto total</div></div></div>
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-ttl">🗂️ Proyectos y Planes</span><button onclick="showToast('Nuevo proyecto...','info')" class="btn b-primary b-sm">➕ Nuevo</button></div>
    <div class="divide-y">
      ${DATA.proyectos.map(p=>`<div style="padding:20px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap">
          <div>
            <p style="font-weight:700;color:#1e293b;font-size:15px">${p.nombre}</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:5px">
              <span class="bs bg-b">${p.area}</span>
              <span style="font-size:12px;color:#64748b">👤 ${p.responsable}</span>
              <span style="font-size:12px;color:#64748b">📅 ${DATA.formatDate(p.inicio)} — ${DATA.formatDate(p.fin)}</span>
            </div>
          </div>
          <span class="bs ${p.estado==='completado'?'bg-g':'bg-b'}">${p.estado==='completado'?'✅ Completado':'🔄 En Ejecución'}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:13px;margin-bottom:10px">
          <div><span style="color:#94a3b8">Presupuesto:</span><br><strong>${DATA.formatCurrency(p.presupuesto)}</strong></div>
          <div><span style="color:#94a3b8">Ejecutado:</span><br><strong>${DATA.formatCurrency(p.ejecutado)}</strong></div>
          <div><span style="color:#94a3b8">Saldo:</span><br><strong style="${p.presupuesto-p.ejecutado>0?'color:#059669':'color:#dc2626'}">${DATA.formatCurrency(p.presupuesto-p.ejecutado)}</strong></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#64748b">Avance</span><span style="font-weight:700">${p.avance}%</span></div>
        <div class="prog-bar"><div class="prog-fill" style="width:${p.avance}%;background:${p.avance===100?'#22c55e':p.avance>60?'#3b82f6':'#eab308'}"></div></div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderRectoria() {
  document.getElementById('admin-content').innerHTML=`
  <div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">🎓</div><div><div class="stat-v">1,248</div><div class="stat-l">Estudiantes activos</div><div class="stat-ch up">▲ 3.2%</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">🏛️</div><div><div class="stat-v">8</div><div class="stat-l">Programas activos</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">⭐</div><div><div class="stat-v">3.9</div><div class="stat-l">Promedio institucional</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fef9c3">🏆</div><div><div class="stat-v">2</div><div class="stat-l">Programas acreditados</div></div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="card">
      <div class="card-hd"><span class="card-ttl">📈 Indicadores Institucionales</span></div>
      <div class="card-bd">
        ${[['Tasa de deserción','8.4%','#ef4444',8],['Tasa de graduación','72%','#22c55e',72],['Satisfacción estudiantil','87%','#3b82f6',87],['Cumplimiento Plan','68%','#a855f7',68]].map(([l,v,c,p])=>`
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="color:#475569">${l}</span><span style="font-weight:700">${v}</span></div>
          <div class="prog-bar"><div class="prog-fill" style="width:${p}%;background:${c}"></div></div>
        </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-ttl">🏗️ Dependencias</span></div>
      <div class="divide-y">
        ${[['Vicerrectoría Académica','🎓','👤 Dr. García'],['Vicerrectoría Administrativa','⚙️','👤 Mg. Herrera'],['Facultad de Ingeniería','💻','👤 Dr. Ramírez'],['Fac. Ciencias Sociales','👥','👤 Dra. Castro'],['Bienestar Universitario','❤️','👤 Lic. Molina'],['Dirección de Sistemas','🖥️','👤 Mg. Herrera']].map(([dep,ic,jefe])=>`
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px">
          <span style="font-size:20px">${ic}</span>
          <div style="flex:1"><p style="font-size:13px;font-weight:600;color:#1e293b">${dep}</p><p style="font-size:12px;color:#94a3b8">${jefe}</p></div>
          <span style="color:#cbd5e1">›</span>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderBienestar() {
  document.getElementById('admin-content').innerHTML=`
  <div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#fce7f3">❤️</div><div><div class="stat-v">320</div><div class="stat-l">Beneficiarios</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">🍽️</div><div><div class="stat-v">85</div><div class="stat-l">Apoyos alimentarios</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">🏃</div><div><div class="stat-v">12</div><div class="stat-l">Grupos deportivos</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">🎵</div><div><div class="stat-v">8</div><div class="stat-l">Grupos culturales</div></div></div>
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-ttl">❤️ Servicios de Bienestar Universitario</span></div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:16px">
      ${[['🧠','Apoyo Psicosocial','Atención psicológica individual y grupal','48 casos activos','#e0e7ff'],['💵','Apoyo Socioeconómico','Becas, subsidios y descuentos','62 beneficiarios','#dcfce7'],['🏃','Deporte y Recreación','Torneos y grupos deportivos','280 participantes','#dbeafe'],['🎨','Cultura y Arte','Danza, música y teatro','150 integrantes','#ede9fe']].map(([ic,t,d,n,bg])=>`
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;border:1.5px solid #e2e8f0;border-radius:12px">
        <div style="width:46px;height:46px;background:${bg};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${ic}</div>
        <div><p style="font-weight:700;font-size:14px;color:#1e293b">${t}</p><p style="font-size:12px;color:#64748b;margin-top:2px">${d}</p><span class="bs bg-b" style="margin-top:6px;display:inline-block">${n}</span></div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderRegistro() {
  document.getElementById('admin-content').innerHTML=`
  <div class="grid-4 gap-4 mb-4" style="display:grid">
    <div class="stat-card"><div class="stat-ic" style="background:#dbeafe">🎓</div><div><div class="stat-v">1,248</div><div class="stat-l">Matriculados</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#dcfce7">🏛️</div><div><div class="stat-v">186</div><div class="stat-l">Grados 2026</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#fef9c3">📜</div><div><div class="stat-v">43</div><div class="stat-l">Certificados pendientes</div></div></div>
    <div class="stat-card"><div class="stat-ic" style="background:#ede9fe">📚</div><div><div class="stat-v">142</div><div class="stat-l">Cursos activos</div></div></div>
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-ttl">🪪 Consulta de Estudiantes</span></div>
    <div class="card-bd">
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <input type="text" placeholder="Buscar por nombre, código o documento..." class="f-ctrl"/>
        <button onclick="showToast('Buscando...','info')" class="btn b-primary">🔍 Buscar</button>
      </div>
      <table class="tbl">
        <thead><tr><th>Código</th><th>Estudiante</th><th>Programa</th><th>Semestre</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>
          <tr><td><code style="font-size:11px">20231001</code></td><td style="font-weight:600">Carlos A. Martínez</td><td>Ing. de Sistemas</td><td style="text-align:center">6</td><td><span class="bs bg-g">Activo</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn b-secondary b-sm">👁️ Ver</button></td></tr>
          <tr><td><code style="font-size:11px">20231002</code></td><td style="font-weight:600">Ana L. Ospina</td><td>Ing. de Sistemas</td><td style="text-align:center">6</td><td><span class="bs bg-g">Activo</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn b-secondary b-sm">👁️ Ver</button></td></tr>
          <tr><td><code style="font-size:11px">20220045</code></td><td style="font-weight:600">Roberto Pérez</td><td>Adm. de Empresas</td><td style="text-align:center">8</td><td><span class="bs bg-g">Activo</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn b-secondary b-sm">👁️ Ver</button></td></tr>
          <tr><td><code style="font-size:11px">20200088</code></td><td style="font-weight:600">Luisa M. Vargas</td><td>Ing. Civil</td><td style="text-align:center">10</td><td><span class="bs bg-y">Grado pendiente</span></td><td><button onclick="showToast('Abriendo expediente...','info')" class="btn b-secondary b-sm">👁️ Ver</button></td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════
   PERFIL
══════════════════════════════════════════════ */
function renderPerfil() {
  setActiveNav('perfil');
  document.getElementById('view-perfil').innerHTML=`
  <div style="max-width:600px;margin:0 auto">
    <div class="card mb-4">
      <div style="height:110px;background:linear-gradient(135deg,#1e3a8a,#6d28d9);border-radius:12px 12px 0 0"></div>
      <div style="padding:0 24px 24px">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:-44px;margin-bottom:14px">
          <div style="width:88px;height:88px;border-radius:18px;border:4px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:900;box-shadow:0 4px 14px rgba(0,0,0,.15)" class="${session.avatarClass}">${session.avatar}</div>
          <button onclick="showToast('Editando perfil...','info')" class="btn b-secondary b-sm">✏️ Editar</button>
        </div>
        <h2 style="font-size:20px;font-weight:800">${session.name}</h2>
        <p style="color:#64748b;font-size:13px">${AUTH.roleLabels[session.role]||session.role} · ${session.code||''}</p>
        <p style="color:#64748b;font-size:13px;margin-top:3px">✉️ ${session.email||''}</p>
        ${session.program?`<p style="color:#64748b;font-size:13px;margin-top:3px">🎓 ${session.program} — Semestre ${session.semester}</p>`:''}
        ${session.department?`<p style="color:#64748b;font-size:13px;margin-top:3px">🏛️ ${session.department}</p>`:''}
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-ttl">🔒 Cambiar Contraseña</span></div>
      <div class="card-bd">
        <div class="f-group"><label class="f-label">Contraseña actual</label><input type="password" class="f-ctrl" placeholder="••••••••"/></div>
        <div class="f-group"><label class="f-label">Nueva contraseña</label><input type="password" class="f-ctrl" placeholder="••••••••"/></div>
        <div class="f-group"><label class="f-label">Confirmar contraseña</label><input type="password" class="f-ctrl" placeholder="••••••••"/></div>
        <button onclick="showToast('Contraseña actualizada correctamente','success')" class="btn b-primary">💾 Guardar cambios</button>
      </div>
    </div>
  </div>`;
}
