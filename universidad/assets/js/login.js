/* UniPlataforma — Login */
if (AUTH.isLoggedIn()) window.location.href = 'dashboard.html';

function setDemo(role, user, pass) {
  document.getElementById('role-select').value = role;
  document.getElementById('username').value = user;
  document.getElementById('password').value = pass;
}

document.getElementById('toggle-pass').addEventListener('click', function () {
  const inp = document.getElementById('password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  this.textContent = inp.type === 'password' ? '👁' : '🙈';
});

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errDiv = document.getElementById('login-error');
  const errMsg = document.getElementById('login-error-msg');

  if (!username || !password) {
    errMsg.textContent = 'Por favor completa todos los campos.';
    errDiv.classList.add('show'); return;
  }

  const result = AUTH.login(username, password);
  if (result.success) {
    errDiv.classList.remove('show');
    const btn = document.getElementById('btn-login');
    btn.classList.add('loading');
    btn.innerHTML = '✅ Verificando...';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
  } else {
    errMsg.textContent = result.error || 'Usuario o contraseña incorrectos.';
    errDiv.classList.add('show');
  }
});
