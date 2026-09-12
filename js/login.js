document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

(function () {
  const user = getUser();
  if (getToken() && user) {
    window.location.href = user.rol === 'admin' ? 'admin.html' : 'dashboard.html';
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

  let data = await api('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (data.ok) {
    setSesion(data.token, data.usuario);
    btn.disabled = false; btn.textContent = 'Iniciar sesión';
    window.location.href = data.usuario.rol === 'admin' ? 'admin.html' : 'dashboard.html';
    return;
  }

  // Si falla como cuenta principal, intenta como personal (staff)
  const staffData = await api('/api/staff/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  btn.disabled = false; btn.textContent = 'Iniciar sesión';

  if (!staffData.ok) {
    errBox.textContent = data.error || 'No se pudo iniciar sesión';
    errBox.classList.add('show');
    return;
  }

  const s = staffData.staff;
  setSesion(staffData.token, {
    rol: 'cliente', rol_staff: s.rol, nombre: s.nombre,
    nombre_clinica: s.nombre_clinica, plan_nombre: null
  });
  window.location.href = 'dashboard.html';
});