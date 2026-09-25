/* =============================================
   UniPlataforma — Login Logic
   ============================================= */
if (AUTH.isLoggedIn()) window.location.href = 'dashboard.html';

function setDemo(role, user, pass) {
  document.getElementById('role-select').value = role;
  document.getElementById('username').value = user;
  document.getElementById('password').value = pass;
}

document.getElementById('toggle-pass').addEventListener('click', function () {
  const input = document.getElementById('password');
  const icon = this.querySelector('i');
  if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash text-sm'; }
  else { input.type = 'password'; icon.className = 'fas fa-eye text-sm'; }
});

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('login-error');
  const errorMsg = document.getElementById('login-error-msg');
  if (!username || !password) { errorMsg.textContent = 'Por favor completa todos los campos.'; errorDiv.classList.remove('hidden'); return; }
  const result = AUTH.login(username, password);
  if (result.success) {
    errorDiv.classList.add('hidden');
    const btn = this.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Verificando...';
    btn.classList.add('bg-green-600'); btn.disabled = true;
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } else {
    errorMsg.textContent = result.error || 'Usuario o contraseña incorrectos.';
    errorDiv.classList.remove('hidden');
  }
});

const style = document.createElement('style');
style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`;
document.head.appendChild(style);
