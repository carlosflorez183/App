/* =============================================
   UniPlataforma — Página de Curso (offline)
   ============================================= */
const session = AUTH.requireAuth();

const params  = new URLSearchParams(window.location.search);
const cursoId = parseInt(params.get('id')) || 1;
const curso   = DATA.cursos.find(c => c.id === cursoId) || DATA.cursos[0];
const isProf  = session.role === 'profesor' || session.role === 'admin';

const asistenciaData = {};

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
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
});

function setupHeader() {
  const av = document.getElementById('hdr-avatar');
  av.textContent  = session.avatar;
  av.className    = `hdr-av ${session.avatarClass}`;
  document.getElementById('hdr-name').textContent = session.name.split(' ')[0];
}

function renderHero() {
  document.getElementById('curso-hero').style.background = curso.color;
  document.getElementById('curso-icon').textContent      = curso.icon;
  document.getElementById('curso-nombre').textContent    = curso.nombre;
  document.getElementById('curso-codigo').textContent    = curso.codigo;
  document.getElementById('curso-profesor').textContent  = curso.profesor;
  document.getElementById('curso-estudiantes').textContent = `${curso.estudiantes} estudiantes`;
  document.getElementById('curso-grupo-badge').textContent = `Grupo ${curso.grupo}`;
  document.getElementById('bc-curso').textContent        = curso.nombre;
  document.getElementById('stat-estudiantes').textContent = curso.estudiantes;
  document.getElementById('stat-progreso').textContent   = curso.progreso + '%';
  const acts = DATA.actividades.filter(a => a.cursoId === cursoId);
  document.getElementById('stat-actividades').textContent = acts.length;
  document.getElementById('stat-pendientes').textContent  = acts.filter(a => a.estado_est === 'pendiente').length;
  const info = (DATA.cursos_info || {})[cursoId] || {};
  if (info.programa) document.getElementById('curso-programa-badge').textContent = info.programa;
  if (info.semestre) document.getElementById('curso-semestre-badge').textContent  = `${info.semestre}° Semestre`;
}

// ─────────────────────────────────────────────
//  HELPERS: showTab / Modal / Toast
// ─────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.cv').forEach(v  => v.classList.remove('active'));
  document.querySelectorAll('.ct-btn').forEach(b => b.classList.remove('active'));
  const view = document.getElementById('tab-' + name);
  const btn  = document.querySelector(`[data-tab="${name}"]`);
  if (view) view.classList.add('active');
  if (btn)  btn.classList.add('active');
}

function openCursoModal(title, body, footer) {
  document.getElementById('c-modal-title').textContent  = title;
  document.getElementById('c-modal-body').innerHTML     = body;
  document.getElementById('c-modal-footer').innerHTML   = footer || '<button class="btn b-secondary" onclick="closeCModal()">Cerrar</button>';
  document.getElementById('c-modal').classList.add('open');
}
function closeCursoModal() { closeCModal(); }
function closeCModal() { document.getElementById('c-modal').classList.remove('open'); }
document.getElementById('c-modal').addEventListener('click', e => { if (e.target === document.getElementById('c-modal')) closeCModal(); });

function showCToast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const t = document.getElementById('c-toast');
  t.className = 'toast ' + type;
  document.getElementById('c-toast-ic').textContent  = icons[type] || '✅';
  document.getElementById('c-toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function colorNota(input) {
  const v = parseFloat(input.value);
  input.classList.remove('ok', 'fail');
  if (!isNaN(v)) input.classList.add(v >= 3 ? 'ok' : 'fail');
}

// ─────────────────────────────────────────────
//  TAB: INICIO
// ─────────────────────────────────────────────
function renderTabInicio() {
  const anuncios = DATA.anuncios.filter(a => a.cursoId === cursoId);
  const acts     = DATA.actividades.filter(a => a.cursoId === cursoId);
  const proximas = acts.filter(a => a.estado_est === 'pendiente');

  document.getElementById('tab-inicio').innerHTML = `
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:18px">
    <!-- Columna principal -->
    <div>
      <!-- Anuncios -->
      <div class="card">
        <div class="card-hd">
          <span class="card-ttl">📢 Anuncios</span>
          ${isProf ? `<button class="btn b-primary b-sm" onclick="nuevoAnuncioModal()">➕ Nuevo</button>` : ''}
        </div>
        <div class="divide-y">
          ${anuncios.length ? anuncios.map(a => `
          <div style="display:flex;gap:12px;padding:14px 16px">
            <div style="width:36px;height:36px;background:#ffedd5;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📢</div>
            <div style="flex:1">
              <p style="font-weight:700;font-size:14px;color:#1e293b">${a.titulo}</p>
              <p style="font-size:13px;color:#64748b;margin-top:3px;line-height:1.5">${a.contenido}</p>
              <p style="font-size:11px;color:#94a3b8;margin-top:5px">${DATA.formatDate(a.fecha)} · ${a.autor}</p>
            </div>
          </div>`).join('')
          : `<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">Sin anuncios recientes</div>`}
        </div>
      </div>

      <!-- Actividades recientes -->
      <div class="card" style="margin-top:14px">
        <div class="card-hd">
          <span class="card-ttl">✅ Actividades recientes</span>
          <button onclick="showTab('corte1')" style="font-size:12px;color:#2563eb;background:none;border:none;cursor:pointer">Ver por corte →</button>
        </div>
        <div class="divide-y">
          ${acts.slice(0,4).map(a => actItem(a, true)).join('')}
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <div>
      <!-- Progreso por cortes -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-hd"><span class="card-ttl">📊 Progreso por corte</span></div>
        <div class="card-bd">
          ${[{n:'Corte 1',p:'30%',nota:3.8,pct:76,color:'#22c55e'},{n:'Corte 2',p:'30%',nota:4.0,pct:80,color:'#3b82f6'},{n:'Corte 3',p:'40%',nota:null,pct:0,color:'#cbd5e1'}].map(c => `
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span style="font-weight:600;color:#1e293b">${c.n} <span style="color:#94a3b8;font-size:11px">(${c.p})</span></span>
              <span style="font-weight:800;${c.nota ? (c.nota>=3 ? 'color:#059669' : 'color:#dc2626') : 'color:#94a3b8'}">${c.nota || '—'}</span>
            </div>
            <div class="prog-bar"><div class="prog-fill" style="width:${c.pct}%;background:${c.color}"></div></div>
            ${!c.nota ? `<p style="font-size:11px;color:#94a3b8;margin-top:3px">No iniciado</p>` : ''}
          </div>`).join('')}
          <div style="border-top:1px solid #f1f5f9;padding-top:10px;display:flex;justify-content:space-between">
            <span style="font-weight:700;color:#1e293b">Nota parcial</span>
            <span style="font-weight:900;font-size:22px;color:#4338ca">3.9</span>
          </div>
        </div>
      </div>

      <!-- Próximas entregas -->
      <div class="card">
        <div class="card-hd"><span class="card-ttl">⏰ Próximas entregas</span></div>
        <div class="divide-y">
          ${proximas.length ? proximas.map(a => `
          <div style="display:flex;align-items:center;gap:10px;padding:11px 14px">
            <div style="width:8px;height:8px;background:#ef4444;border-radius:50%;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <p style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.titulo}</p>
              <p style="font-size:11px;color:#94a3b8">${DATA.formatDate(a.fechaEntrega)}</p>
            </div>
            <span style="font-size:12px;font-weight:700;color:#64748b">${a.puntos}pts</span>
          </div>`).join('')
          : `<div style="padding:16px;text-align:center;font-size:12px;color:#94a3b8">¡Sin entregas pendientes!</div>`}
        </div>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
//  TAB: CORTES 1 / 2 / 3
// ─────────────────────────────────────────────
const cCfg = {
  1: { label:'Corte 1', peso:'30%', border:'#10b981', bg:'#f0fdf4', nota:3.8 },
  2: { label:'Corte 2', peso:'30%', border:'#3b82f6', bg:'#eff6ff', nota:4.0 },
  3: { label:'Corte 3', peso:'40%', border:'#8b5cf6', bg:'#faf5ff', nota:null },
};

function renderTabCorte(n) {
  const cfg  = cCfg[n];
  const acts = DATA.actividades.filter(a => a.cursoId === cursoId && a.corte === n);
  const el   = document.getElementById(`tab-corte${n}`);

  el.innerHTML = `
  <div style="background:#fff;border-radius:12px;border-left:5px solid ${cfg.border};padding:16px 20px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.07);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
        <span style="background:${cfg.bg};color:${cfg.border};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700">${cfg.label}</span>
        <span style="font-size:12px;color:#64748b">Peso: <strong>${cfg.peso}</strong> de la nota final</span>
      </div>
      <h2 style="font-size:16px;font-weight:800;color:#1e293b">${cfg.label} — ${curso.nombre}</h2>
    </div>
    <div style="display:flex;align-items:center;gap:14px">
      <div style="text-align:center">
        <div style="font-size:26px;font-weight:900;${cfg.nota ? (cfg.nota>=3?'color:#059669':'color:#dc2626') : 'color:#cbd5e1'}">${cfg.nota || '—'}</div>
        <div style="font-size:11px;color:#64748b">Nota corte</div>
      </div>
      ${isProf ? `<button onclick="nuevaActividadModal(${n})" class="btn b-primary b-sm">➕ Actividad</button>` : ''}
    </div>
  </div>

  ${acts.length === 0 ? `
  <div class="card" style="padding:40px;text-align:center;color:#94a3b8">
    <div style="font-size:40px;margin-bottom:10px;opacity:.3">✅</div>
    <p style="font-weight:600">No hay actividades en este corte</p>
    ${isProf ? `<button onclick="nuevaActividadModal(${n})" class="btn b-primary b-sm" style="margin-top:12px">➕ Agregar actividad</button>` : ''}
  </div>`
  : `<div>${acts.map(a => actItem(a)).join('')}</div>`}

  <!-- Tabla notas del corte -->
  <div class="card" style="margin-top:14px">
    <div class="card-hd">
      <span class="card-ttl">⭐ Notas — ${cfg.label}</span>
      ${isProf ? `<button onclick="showCToast('Notas guardadas','success')" class="btn b-success b-sm">💾 Guardar</button>` : ''}
    </div>
    ${isProf ? `
    <div class="overflow-x">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Estudiante</th>
            ${acts.map(a => `<th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;min-width:90px">${a.titulo.split(' ').slice(0,2).join(' ')}<br><span style="font-weight:500">${a.puntos}pts</span></th>`).join('')}
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Nota Corte</th>
          </tr>
        </thead>
        <tbody>
          ${DATA.listaEstudiantes.map((e,i) => {
            const bgs = ['#3b82f6','#059669','#7c3aed','#dc2626','#d97706'];
            const nc  = (3.2 + Math.random()*1.6).toFixed(1);
            return `<tr>
              <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:30px;height:30px;border-radius:50%;background:${bgs[i%bgs.length]};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0">${e.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                  <div>
                    <p style="font-size:13px;font-weight:600;color:#1e293b">${e.nombre}</p>
                    <p style="font-size:11px;color:#94a3b8">${e.codigo}</p>
                  </div>
                </div>
              </td>
              ${acts.map(() => `<td style="padding:11px 14px;text-align:center;border-bottom:1px solid #f1f5f9"><input type="number" min="0" max="5" step=".1" class="nota-in" placeholder="—" oninput="colorNota(this)"/></td>`).join('')}
              <td style="padding:11px 14px;text-align:center;border-bottom:1px solid #f1f5f9"><span style="font-weight:900;font-size:18px;${parseFloat(nc)>=3?'color:#059669':'color:#dc2626'}">${nc}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`
    : `
    <div class="overflow-x">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Actividad</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Obtenido</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Total</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Nota</th>
          </tr>
        </thead>
        <tbody>
          ${acts.map(a => `<tr>
            <td style="padding:11px 14px;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9">${a.titulo}</td>
            <td style="padding:11px 14px;text-align:center;font-weight:700;border-bottom:1px solid #f1f5f9;${a.nota?(a.nota/a.puntos*5>=3?'color:#059669':'color:#dc2626'):'color:#94a3b8'}">${a.nota || '—'}</td>
            <td style="padding:11px 14px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9">${a.puntos}</td>
            <td style="padding:11px 14px;text-align:center;font-weight:900;font-size:18px;border-bottom:1px solid #f1f5f9;${a.nota?(a.nota/a.puntos*5>=3?'color:#059669':'color:#dc2626'):'color:#94a3b8'}">${a.nota ? (a.nota/a.puntos*5).toFixed(1) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  </div>`;
}

// ─────────────────────────────────────────────
//  Actividad item HTML
// ─────────────────────────────────────────────
function actItem(a, compact = false) {
  const icons  = { taller:'🔧', quiz:'❓', proyecto:'📋', informe:'📝', examen:'✏️', parcial:'📄' };
  const colors = { taller:'#dbeafe', quiz:'#fef9c3', proyecto:'#ede9fe', informe:'#dcfce7', examen:'#fee2e2', parcial:'#ffedd5' };
  const estadoBadge = a.estado_est === 'calificado'
    ? `<span class="bs bg-g">✓ ${a.nota}/${a.puntos}</span>`
    : a.estado_est === 'entregado'
    ? `<span class="bs bg-b">Entregado</span>`
    : `<span class="bs bg-y">Pendiente</span>`;

  if (compact) return `
    <div style="display:flex;align-items:center;gap:10px;padding:11px 14px;transition:background .12s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
      <div style="width:34px;height:34px;border-radius:9px;background:${colors[a.tipo]||'#f1f5f9'};display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${icons[a.tipo]||'✅'}</div>
      <div style="flex:1;min-width:0">
        <p style="font-weight:600;font-size:13px;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.titulo}</p>
        <p style="font-size:11px;color:#94a3b8">Corte ${a.corte||'?'} · ${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</p>
      </div>
      ${estadoBadge}
    </div>`;

  return `
  <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;margin-bottom:10px;transition:box-shadow .18s,border-color .18s" onmouseover="this.style.borderColor='#cbd5e1';this.style.boxShadow='0 2px 8px rgba(0,0,0,.08)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow=''">
    <div style="width:42px;height:42px;border-radius:10px;background:${colors[a.tipo]||'#f1f5f9'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${icons[a.tipo]||'✅'}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;flex-wrap:wrap">
        <span style="font-weight:700;font-size:14px;color:#1e293b">${a.titulo}</span>
        <span style="background:#f1f5f9;color:#64748b;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;text-transform:capitalize">${a.tipo}</span>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.5">${a.descripcion}</p>
      <div style="display:flex;gap:12px;margin-top:6px;font-size:11px;color:#94a3b8;flex-wrap:wrap">
        <span>📅 ${DATA.formatDate(a.fechaEntrega)}</span>
        <span>⭐ ${a.puntos} puntos</span>
        ${a.corte ? `<span>📗 Corte ${a.corte}</span>` : ''}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex-shrink:0">
      ${estadoBadge}
      ${!isProf && a.estado_est === 'pendiente' ? `<button onclick="entregarModal(${a.id})" class="btn b-primary b-sm">⬆️ Entregar</button>` : ''}
      ${isProf ? `<button onclick="verEntregasModal(${a.id})" class="btn b-secondary b-sm">📥 Entregas</button>` : ''}
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
//  TAB: NOTAS (consolidado)
// ─────────────────────────────────────────────
function renderTabNotas() {
  const acts = DATA.actividades.filter(a => a.cursoId === cursoId);
  const el   = document.getElementById('tab-notas');

  if (isProf) {
    const c1 = acts.filter(a => a.corte === 1);
    const c2 = acts.filter(a => a.corte === 2);
    const c3 = acts.filter(a => a.corte === 3);

    el.innerHTML = `
    <div class="card">
      <div class="card-hd">
        <span class="card-ttl">⭐ Consolidado de Notas</span>
        <div style="display:flex;gap:8px">
          <button onclick="showCToast('Notas guardadas','success')" class="btn b-success b-sm">💾 Guardar todo</button>
          <button onclick="showCToast('Exportando a Excel...','info')" class="btn b-secondary b-sm">📊 Exportar</button>
        </div>
      </div>
      <div class="overflow-x">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th rowspan="2" style="padding:10px 14px;background:#f8fafc;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;border-right:2px solid #e2e8f0">Estudiante</th>
              <th colspan="${c1.length+1}" style="padding:8px;background:#f0fdf4;text-align:center;font-size:11px;font-weight:700;color:#15803d;border-bottom:1px solid #e2e8f0;border-left:2px solid #bbf7d0">Corte 1 (30%)</th>
              <th colspan="${c2.length+1}" style="padding:8px;background:#eff6ff;text-align:center;font-size:11px;font-weight:700;color:#1d4ed8;border-bottom:1px solid #e2e8f0;border-left:2px solid #bfdbfe">Corte 2 (30%)</th>
              <th colspan="${c3.length+1}" style="padding:8px;background:#faf5ff;text-align:center;font-size:11px;font-weight:700;color:#6d28d9;border-bottom:1px solid #e2e8f0;border-left:2px solid #ddd6fe">Corte 3 (40%)</th>
              <th rowspan="2" style="padding:10px 14px;background:#f8fafc;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Definitiva</th>
            </tr>
            <tr>
              ${[c1,c2,c3].map(ca => ca.map(a => `<th style="padding:8px 10px;background:#f8fafc;text-align:center;font-size:10px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;min-width:70px">${a.titulo.split(' ').slice(0,2).join(' ')}</th>`).join('') + '<th style="padding:8px 10px;background:#f8fafc;text-align:center;font-size:10px;font-weight:700;border-bottom:1px solid #e2e8f0">NC</th>').join('')}
            </tr>
          </thead>
          <tbody>
            ${DATA.listaEstudiantes.map((e,i) => {
              const bgs = ['#3b82f6','#059669','#7c3aed','#dc2626','#d97706'];
              let nota = 0;
              const pesos = {0:.3,1:.3,2:.4};
              const cortesCols = [c1,c2,c3].map((ca,ci) => {
                const nc = (3.2+Math.random()*1.6).toFixed(1);
                nota += parseFloat(nc)*pesos[ci];
                return ca.map(() => `<td style="padding:10px;text-align:center;border-bottom:1px solid #f1f5f9"><input type="number" min="0" max="5" step=".1" class="nota-in" placeholder="—" oninput="colorNota(this)"/></td>`).join('')
                  + `<td style="padding:10px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:900;font-size:16px;${parseFloat(nc)>=3?'color:#059669':'color:#dc2626'}">${nc}</td>`;
              }).join('');
              return `<tr>
                <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;border-right:2px solid #e2e8f0">
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:30px;height:30px;border-radius:50%;background:${bgs[i%bgs.length]};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">${e.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                    <div>
                      <p style="font-size:13px;font-weight:600;color:#1e293b">${e.nombre}</p>
                      <p style="font-size:11px;color:#94a3b8">${e.codigo}</p>
                    </div>
                  </div>
                </td>
                ${cortesCols}
                <td style="padding:10px;text-align:center;border-bottom:1px solid #f1f5f9">
                  <div style="width:50px;height:50px;border-radius:50%;border:3px solid ${nota>=3?'#059669':'#dc2626'};background:${nota>=3?'#dcfce7':'#fee2e2'};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;${nota>=3?'color:#059669':'color:#dc2626'};margin:auto">${nota.toFixed(1)}</div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  } else {
    el.innerHTML = `
    <div style="max-width:600px;margin:0 auto">
      ${[1,2,3].map(n => {
        const cfg  = cCfg[n];
        const acts = DATA.actividades.filter(a => a.cursoId===cursoId && a.corte===n);
        return `
        <div class="card" style="margin-bottom:14px">
          <div class="card-hd">
            <span class="card-ttl"><span style="background:${cfg.bg};color:${cfg.border};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;margin-right:6px">${cfg.label}</span>${cfg.peso} nota final</span>
            <span style="font-weight:900;font-size:22px;${cfg.nota?(cfg.nota>=3?'color:#059669':'color:#dc2626'):'color:#cbd5e1'}">${cfg.nota||'—'}</span>
          </div>
          ${acts.length ? `<div class="divide-y">
            ${acts.map(a => `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px">
              <div>
                <p style="font-weight:600;font-size:13px;color:#1e293b">${a.titulo}</p>
                <p style="font-size:11px;color:#94a3b8">${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</p>
              </div>
              <span style="font-weight:900;font-size:20px;${a.nota?(a.nota/a.puntos*5>=3?'color:#059669':'color:#dc2626'):'color:#94a3b8'}">${a.nota ? (a.nota/a.puntos*5).toFixed(1) : '—'}</span>
            </div>`).join('')}
          </div>` : `<div style="padding:16px;text-align:center;font-size:12px;color:#94a3b8">Sin actividades en este corte</div>`}
        </div>`;
      }).join('')}
      <div class="card">
        <div class="card-bd" style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:700;font-size:16px;color:#1e293b">Nota definitiva estimada</span>
          <span style="font-weight:900;font-size:32px;color:#4338ca">3.9</span>
        </div>
      </div>
    </div>`;
  }
}

// ─────────────────────────────────────────────
//  TAB: ASISTENCIA
// ─────────────────────────────────────────────
function renderTabAsistencia() {
  const fechas = ['2026-07-28','2026-08-04','2026-08-11','2026-08-18','2026-08-25','2026-09-01','2026-09-08'];
  let fechaActiva = fechas[fechas.length - 1];

  function buildData(f) {
    if (!asistenciaData[f]) {
      asistenciaData[f] = DATA.listaEstudiantes.map(e => ({
        id: e.id,
        estado: ['P','P','P','A','P','T'][Math.floor(Math.random()*6)]
      }));
    }
    return asistenciaData[f];
  }

  function render(fecha) {
    const lista    = buildData(fecha);
    const presentes = lista.filter(x => x.estado==='P').length;
    const ausentes  = lista.filter(x => x.estado==='A').length;
    const tardanzas = lista.filter(x => x.estado==='T').length;
    const bgs = ['#3b82f6','#059669','#7c3aed','#dc2626','#d97706','#0d9488'];

    document.getElementById('tab-asistencia').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div>
        <h2 style="font-size:18px;font-weight:800;color:#1e293b">📋 Control de Asistencia</h2>
        <p style="font-size:13px;color:#64748b;margin-top:2px">${curso.nombre} · ${curso.estudiantes} estudiantes</p>
      </div>
      ${isProf ? `<div style="display:flex;gap:8px">
        <button onclick="guardarAsistencia('${fecha}')" class="btn b-success b-sm">💾 Guardar</button>
        <button onclick="showCToast('Exportando asistencia...','info')" class="btn b-secondary b-sm">📊 Exportar</button>
      </div>` : ''}
    </div>

    <!-- Selector de fechas -->
    <div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px;scrollbar-width:none">
      ${fechas.map(f => `<button class="f-chip ${f===fecha?'active':''}" onclick="cambiarFecha('${f}')">${DATA.formatDate(f)}</button>`).join('')}
      ${isProf ? `<button class="f-chip" style="border-style:dashed;color:#2563eb;border-color:#93c5fd" onclick="nuevaFechaModal()">➕ Nueva</button>` : ''}
    </div>

    <!-- Resumen -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#059669">${presentes}</div>
        <div style="font-size:12px;font-weight:600;color:#15803d;margin-top:2px">Presentes</div>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#dc2626">${ausentes}</div>
        <div style="font-size:12px;font-weight:600;color:#b91c1c;margin-top:2px">Ausentes</div>
      </div>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#d97706">${tardanzas}</div>
        <div style="font-size:12px;font-weight:600;color:#92400e;margin-top:2px">Tardanzas</div>
      </div>
    </div>

    <!-- Leyenda -->
    <div style="display:flex;gap:14px;font-size:12px;font-weight:600;margin-bottom:10px;flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:5px"><span style="width:22px;height:22px;background:#dcfce7;color:#15803d;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-weight:800">P</span> Presente</span>
      <span style="display:flex;align-items:center;gap:5px"><span style="width:22px;height:22px;background:#fee2e2;color:#b91c1c;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-weight:800">A</span> Ausente</span>
      <span style="display:flex;align-items:center;gap:5px"><span style="width:22px;height:22px;background:#fef9c3;color:#854d0e;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-weight:800">T</span> Tardanza</span>
    </div>

    <!-- Tabla de asistencia -->
    <div class="card">
      <div class="card-hd">
        <span class="card-ttl">👥 Listado — ${DATA.formatDate(fecha)}</span>
        ${isProf ? `<div style="display:flex;gap:6px">
          <button onclick="marcarTodos('${fecha}','P')" style="background:#dcfce7;color:#15803d;border:none;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">✅ Todos presentes</button>
          <button onclick="marcarTodos('${fecha}','A')" style="background:#fee2e2;color:#b91c1c;border:none;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">❌ Todos ausentes</button>
        </div>` : ''}
      </div>
      <div class="overflow-x">
        <table class="asist-tbl">
          <thead>
            <tr>
              <th>#</th><th>Estudiante</th><th>Código</th>
              <th style="text-align:center">Estado</th>
              ${isProf ? '<th>Observación</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${lista.map((item,i) => {
              const est = DATA.listaEstudiantes.find(e=>e.id===item.id);
              const estadoFull = {P:'Presente',A:'Ausente',T:'Tardanza'}[item.estado]||'—';
              return `<tr>
                <td style="color:#94a3b8;font-size:12px">${i+1}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="est-av" style="background:${bgs[i%bgs.length]}">${est.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                    <span style="font-weight:600;font-size:13px">${est.nombre}</span>
                  </div>
                </td>
                <td style="font-family:monospace;font-size:12px;color:#94a3b8">${est.codigo}</td>
                <td style="text-align:center">
                  ${isProf ? `
                  <div style="display:flex;gap:4px;justify-content:center">
                    <button class="a-btn ${item.estado==='P'?'a-p':'a-n'}" onclick="setAsist('${fecha}',${item.id},'P')" title="Presente">P</button>
                    <button class="a-btn ${item.estado==='A'?'a-a':'a-n'}" onclick="setAsist('${fecha}',${item.id},'A')" title="Ausente">A</button>
                    <button class="a-btn ${item.estado==='T'?'a-t':'a-n'}" onclick="setAsist('${fecha}',${item.id},'T')" title="Tardanza">T</button>
                  </div>`
                  : `<span class="bs ${item.estado==='P'?'bg-g':item.estado==='A'?'bg-r':'bg-y'}">${estadoFull}</span>`}
                </td>
                ${isProf ? `<td><input type="text" placeholder="Observación..." style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;outline:none;min-width:130px;font-family:inherit"/></td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Resumen % asistencia global -->
      <div style="padding:14px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Resumen global de asistencia</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${DATA.listaEstudiantes.map(e => {
            const pct = Math.floor(65+Math.random()*35);
            const c   = pct>=80?'#059669':pct>=70?'#d97706':'#dc2626';
            return `<div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px">
              <span style="font-size:12px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${e.nombre.split(' ')[0]} ${e.nombre.split(' ')[2]||''}</span>
              <span style="font-weight:800;font-size:13px;color:${c};flex-shrink:0;margin-left:6px">${pct}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  window.cambiarFecha   = f => { fechaActiva = f; render(f); };
  window.setAsist       = (f,id,estado) => { const r=buildData(f); const i=r.find(x=>x.id===id); if(i) i.estado=estado; render(f); };
  window.marcarTodos    = (f,estado) => { buildData(f).forEach(x=>x.estado=estado); render(f); showCToast(`Todos marcados como ${estado==='P'?'presentes':'ausentes'}`,'success'); };
  window.guardarAsistencia = f => showCToast(`Asistencia del ${DATA.formatDate(f)} guardada`,'success');
  window.nuevaFechaModal   = () => openCursoModal('📅 Nueva sesión',
    `<div class="f-group"><label class="f-label">Fecha</label><input type="date" class="f-ctrl"/></div>
     <div class="f-group"><label class="f-label">Tema de la sesión</label><input type="text" class="f-ctrl" placeholder="Ej: Introducción a normalización"/></div>`,
    `<button class="btn b-secondary" onclick="closeCModal()">Cancelar</button>
     <button class="btn b-primary" onclick="closeCModal();showCToast('Sesión agregada','success')">✅ Agregar</button>`);

  render(fechaActiva);
}

// ─────────────────────────────────────────────
//  TAB: ESTUDIANTES
// ─────────────────────────────────────────────
function renderTabEstudiantes() {
  const bgs = ['#3b82f6','#059669','#7c3aed','#dc2626','#d97706','#0d9488'];

  document.getElementById('tab-estudiantes').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <h2 style="font-size:17px;font-weight:800;color:#1e293b">👥 Estudiantes — ${curso.nombre}</h2>
    <div style="display:flex;gap:8px">
      <div style="display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:7px 12px">
        🔍 <input type="text" id="s-est" placeholder="Buscar..." style="border:none;outline:none;font-size:13px;width:130px;font-family:inherit" oninput="filtrarEst(this.value)"/>
      </div>
      ${isProf ? `<button onclick="showCToast('Exportando lista...','info')" class="btn b-secondary b-sm">📊 Exportar</button>` : ''}
    </div>
  </div>
  <div class="card">
    <div class="card-hd">
      <span class="card-ttl">📋 ${DATA.listaEstudiantes.length} estudiantes</span>
      <span class="bs bg-g">${DATA.listaEstudiantes.length} activos</span>
    </div>
    <div id="est-lista">
      ${DATA.listaEstudiantes.map((e,i) => {
        const nota  = (3.5+Math.random()*1.4).toFixed(1);
        const asist = Math.floor(70+Math.random()*30);
        return `
        <div class="est-row est-item" data-nombre="${e.nombre.toLowerCase()}">
          <span style="font-size:12px;color:#94a3b8;width:20px">${i+1}</span>
          <div class="est-av" style="background:${bgs[i%bgs.length]}">${e.nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
          <div style="flex:1;min-width:0">
            <p style="font-weight:600;font-size:13px;color:#1e293b">${e.nombre}</p>
            <p style="font-size:11px;color:#94a3b8;font-family:monospace">${e.codigo}</p>
          </div>
          <div style="display:flex;gap:16px;margin-right:8px">
            <div style="text-align:center">
              <div style="font-weight:900;font-size:14px;${parseFloat(nota)>=3?'color:#059669':'color:#dc2626'}">${nota}</div>
              <div style="font-size:10px;color:#94a3b8">Nota</div>
            </div>
            <div style="text-align:center">
              <div style="font-weight:900;font-size:14px;${asist>=80?'color:#059669':asist>=70?'color:#d97706':'color:#dc2626'}">${asist}%</div>
              <div style="font-size:10px;color:#94a3b8">Asist.</div>
            </div>
          </div>
          <div style="display:flex;gap:5px">
            <button onclick="verEstModal('${e.nombre}','${e.codigo}',${nota},${asist})" class="btn b-secondary b-sm">👁️</button>
            ${isProf ? `<button onclick="showCToast('Mensaje enviado a ${e.nombre.split(' ')[0]}','info')" class="btn b-secondary b-sm">✉️</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

window.filtrarEst = q => {
  document.querySelectorAll('.est-item').forEach(el => {
    el.style.display = el.dataset.nombre.includes(q.toLowerCase()) ? '' : 'none';
  });
};

window.verEstModal = (nombre, codigo, nota, asist) => {
  openCursoModal(`👤 ${nombre}`, `
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
    <div style="width:60px;height:60px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900">${nombre.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
    <div><p style="font-weight:800;font-size:17px">${nombre}</p><p style="font-family:monospace;color:#64748b;font-size:12px">${codigo}</p></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
    <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center">
      <div style="font-weight:900;font-size:24px;${nota>=3?'color:#059669':'color:#dc2626'}">${nota}</div>
      <div style="font-size:11px;color:#64748b">Nota actual</div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center">
      <div style="font-weight:900;font-size:24px;${asist>=80?'color:#059669':asist>=70?'color:#d97706':'color:#dc2626'}">${asist}%</div>
      <div style="font-size:11px;color:#64748b">Asistencia</div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center">
      <div style="font-weight:900;font-size:24px;color:#3b82f6">${DATA.actividades.filter(a=>a.cursoId===cursoId&&a.estado_est!=='pendiente').length}</div>
      <div style="font-size:11px;color:#64748b">Entregas</div>
    </div>
  </div>
  <p style="font-weight:700;font-size:13px;color:#374151;margin-bottom:8px">Notas por corte:</p>
  ${[1,2,3].map(n => {
    const nc = (3.2+Math.random()*1.6).toFixed(1);
    return `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f1f5f9">
      <span style="font-size:13px;color:#475569">Corte ${n} <span style="color:#94a3b8;font-size:11px">(${n===3?40:30}%)</span></span>
      <span style="font-weight:800;${parseFloat(nc)>=3?'color:#059669':'color:#dc2626'}">${nc}</span>
    </div>`;
  }).join('')}
  <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700">
    <span style="font-size:14px;color:#1e293b">Definitiva estimada</span>
    <span style="font-size:24px;font-weight:900;color:#4338ca">${nota}</span>
  </div>`);
};

// ─────────────────────────────────────────────
//  TAB: RECURSOS
// ─────────────────────────────────────────────
function renderTabRecursos() {
  const recursos = [
    {n:'Guía_Normalización_3FN.pdf',t:'pdf',s:'2.3 MB',f:'2026-08-15',desc:'Guía de normalización hasta 3FN'},
    {n:'Diapositivas_Semana1-5.pptx',t:'ppt',s:'8.4 MB',f:'2026-07-30',desc:'Presentaciones del primer bloque'},
    {n:'Ejercicios_SQL_Avanzado.zip',t:'zip',s:'1.1 MB',f:'2026-08-10',desc:'Pack de ejercicios prácticos SQL'},
    {n:'Videoclase_Sem8_JOIN.mp4',t:'video',s:'380 MB',f:'2026-08-20',desc:'Grabación de clase — JOINs complejos'},
    {n:'Enunciado_Proyecto_Final.pdf',t:'pdf',s:'540 KB',f:'2026-08-25',desc:'Descripción del proyecto final'},
  ];
  const ics = {pdf:'📄',ppt:'📊',zip:'🗜️',video:'🎬'};

  document.getElementById('tab-recursos').innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <h2 style="font-size:17px;font-weight:800;color:#1e293b">📁 Material del Curso</h2>
    ${isProf ? `<button onclick="subirRecursoModal()" class="btn b-primary b-sm">⬆️ Subir Material</button>` : ''}
  </div>
  <div class="card">
    <div class="divide-y">
      ${recursos.map(r => `
      <div class="res-row">
        <div style="width:44px;height:44px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${ics[r.t]||'📄'}</div>
        <div style="flex:1;min-width:0">
          <p style="font-weight:600;font-size:14px;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.n}</p>
          <p style="font-size:12px;color:#94a3b8;margin-top:2px">${r.desc} · ${r.s} · ${DATA.formatDate(r.f)}</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="showCToast('Descargando ${r.n}','info')" class="btn b-primary b-sm">⬇️</button>
          ${isProf ? `<button onclick="showCToast('Eliminando...','error')" class="btn b-danger b-sm">🗑️</button>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
//  MODALES DE ACCIÓN
// ─────────────────────────────────────────────
window.entregarModal = id => {
  const a = DATA.actividades.find(x=>x.id===id);
  openCursoModal(`📤 Entregar: ${a.titulo}`,`
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:12px;margin-bottom:14px">
    <p style="font-weight:700;color:#1d4ed8">${a.titulo}</p>
    <p style="font-size:12px;color:#3b82f6">Corte ${a.corte} · ${DATA.formatDate(a.fechaEntrega)} · ${a.puntos} pts</p>
  </div>
  <div class="upload-zona" onclick="document.getElementById('fu-${id}').click()">
    <div style="font-size:36px;margin-bottom:8px">☁️</div>
    <p style="font-weight:600;color:#475569">Arrastra o haz click para seleccionar</p>
    <p style="font-size:12px;color:#94a3b8;margin-top:4px">PDF, DOCX, ZIP — máx. 20MB</p>
    <input type="file" id="fu-${id}" style="display:none" accept=".pdf,.docx,.zip"
      onchange="document.getElementById('fn-${id}').style.display='flex';document.getElementById('fn-${id}').querySelector('span').textContent=this.files[0].name"/>
  </div>
  <div id="fn-${id}" style="display:none;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin-top:8px;font-size:13px;color:#15803d">✅ <span></span></div>
  <div class="f-group" style="margin-top:12px"><label class="f-label">Comentario (opcional)</label>
    <textarea class="f-ctrl" rows="2" placeholder="Mensaje para el docente..."></textarea></div>`,
  `<button class="btn b-secondary" onclick="closeCModal()">Cancelar</button>
   <button class="btn b-success" onclick="DATA.actividades.find(x=>x.id===${id}).estado_est='entregado';closeCModal();showCToast('¡Entrega exitosa! 🎉','success');renderTabCorte(${a.corte});renderTabNotas()">📤 Enviar</button>`);
};

window.verEntregasModal = id => {
  const a = DATA.actividades.find(x=>x.id===id);
  openCursoModal(`📥 Entregas: ${a.titulo}`,`
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#f8fafc">
      <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Estudiante</th>
      <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Estado</th>
      <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Calificación</th>
      <th style="padding:9px 12px;border-bottom:1px solid #e2e8f0"></th>
    </tr></thead>
    <tbody>${DATA.listaEstudiantes.map(e=>`<tr>
      <td style="padding:10px 12px;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9">${e.nombre}</td>
      <td style="padding:10px 12px;text-align:center;border-bottom:1px solid #f1f5f9"><span class="bs bg-b">Entregado</span></td>
      <td style="padding:10px 12px;text-align:center;border-bottom:1px solid #f1f5f9">
        <input type="number" min="0" max="${a.puntos}" class="nota-in" style="width:64px" placeholder="—" oninput="colorNota(this)"/>
        <span style="font-size:11px;color:#94a3b8">/${a.puntos}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
        <button onclick="showCToast('Nota guardada','success')" class="btn b-success b-sm">✅</button>
      </td>
    </tr>`).join('')}</tbody>
  </table>`);
};

window.nuevaActividadModal = n => {
  openCursoModal(`➕ Nueva Actividad — Corte ${n}`,`
  <div class="f-group"><label class="f-label">Título</label><input type="text" class="f-ctrl" placeholder="Ej: Taller 3 — SQL Avanzado"/></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="f-group"><label class="f-label">Tipo</label>
      <select class="f-ctrl"><option>Taller</option><option>Quiz</option><option>Proyecto</option><option>Informe</option><option>Parcial</option></select></div>
    <div class="f-group"><label class="f-label">Puntos</label><input type="number" class="f-ctrl" value="50"/></div>
  </div>
  <div class="f-group"><label class="f-label">Fecha límite</label><input type="date" class="f-ctrl"/></div>
  <div class="f-group"><label class="f-label">Descripción</label><textarea class="f-ctrl" rows="3" placeholder="Descripción..."></textarea></div>
  <div class="upload-zona" onclick="showCToast('Adjuntar enunciado...','info')">
    📎 <span style="font-size:13px;color:#64748b">Adjuntar enunciado (opcional)</span>
  </div>`,
  `<button class="btn b-secondary" onclick="closeCModal()">Cancelar</button>
   <button class="btn b-primary" onclick="closeCModal();showCToast('Actividad publicada en Corte ${n}','success')">✅ Publicar</button>`);
};

window.nuevoAnuncioModal = () => {
  openCursoModal('📢 Nuevo Anuncio',`
  <div class="f-group"><label class="f-label">Título</label><input type="text" class="f-ctrl" placeholder="Título del anuncio"/></div>
  <div class="f-group"><label class="f-label">Mensaje</label><textarea class="f-ctrl" rows="4" placeholder="Escribe el anuncio..."></textarea></div>`,
  `<button class="btn b-secondary" onclick="closeCModal()">Cancelar</button>
   <button class="btn b-primary" onclick="closeCModal();showCToast('Anuncio publicado','success')">✅ Publicar</button>`);
};

window.subirRecursoModal = () => {
  openCursoModal('⬆️ Subir Material',`
  <div class="upload-zona" onclick="document.getElementById('res-file').click()">
    <div style="font-size:36px;margin-bottom:8px">☁️</div>
    <p style="font-weight:600;color:#475569">Seleccionar archivo</p>
    <p style="font-size:12px;color:#94a3b8;margin-top:4px">PDF, PPT, DOCX, ZIP, MP4 — máx. 500MB</p>
    <input type="file" id="res-file" style="display:none"/>
  </div>
  <div class="f-group" style="margin-top:12px"><label class="f-label">Descripción</label><input type="text" class="f-ctrl" placeholder="Descripción breve del archivo"/></div>`,
  `<button class="btn b-secondary" onclick="closeCModal()">Cancelar</button>
   <button class="btn b-primary" onclick="closeCModal();showCToast('Recurso subido correctamente','success')">⬆️ Subir</button>`);
};
