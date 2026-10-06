document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

// destinoPorRol() ya viene definida en common.js
// Si ya hay sesión activa, redirige directo
(function () {
  const user = getUser();
  if (getToken() && user) {
    window.location.href = destinoPorRol(user.rol);
  }
})();

const form = document.getElementById('loginForm');
const errBox = document.getElementById('loginError');
const btn = document.getElementById('btnLogin');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.remove('show');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Ingresando...';

  const data = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  btn.disabled = false;
  btn.textContent = 'Iniciar sesión';

  if (!data.ok) {
    errBox.textContent = data.error || 'No se pudo iniciar sesión';
    errBox.classList.add('show');
    return;
  }

  setSesion(data.token, data.usuario);
  window.location.href = destinoPorRol(data.usuario.rol);
});