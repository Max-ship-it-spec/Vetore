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
const roleBox = document.getElementById('roleBox');

// ── Selector de rol (recuerda la última elección) ──
let rolElegido = localStorage.getItem('vc_rol_login') || '';
function pintarRol() {
  roleBox.querySelectorAll('.role-opt').forEach(b => b.classList.toggle('active', b.dataset.rol === rolElegido));
}
roleBox.addEventListener('click', (e) => {
  const b = e.target.closest('.role-opt'); if (!b) return;
  rolElegido = b.dataset.rol;
  localStorage.setItem('vc_rol_login', rolElegido);
  errBox.classList.remove('show');
  pintarRol();
});
pintarRol();

function mostrarError(msg) {
  errBox.textContent = msg;
  errBox.classList.add('show');
}

const nombreRol = { propietario: 'Propietario', veterinario: 'Veterinario', recepcion: 'Recepción' };

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
    mostrarError(data.error || 'No se pudo iniciar sesión');
    return;
  }

  // El admin no necesita elegir rol; las cuentas de clínica sí, y debe coincidir
  const rolReal = data.usuario.rol;
  if (rolReal !== 'admin') {
    if (!rolElegido) { mostrarError('Selecciona cómo vas a ingresar'); return; }
    if (rolElegido !== rolReal) {
      mostrarError(`Esta cuenta no es de ${nombreRol[rolElegido]}. Elige el rol correcto.`);
      return;
    }
  }

  setSesion(data.token, data.usuario);
  window.location.href = destinoPorRol(rolReal);
});