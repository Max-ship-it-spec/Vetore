// ══════════════════════════════════════════════════════════════
// VETCORE — helpers compartidos (API, sesión, utilidades)
// ══════════════════════════════════════════════════════════════

const API = 'https://vetcore-backend-4ntt.onrender.com';

function getToken() { return localStorage.getItem('vc_token'); }
function getUser() { return JSON.parse(localStorage.getItem('vc_user') || 'null'); }
function setSesion(token, usuario) {
  localStorage.setItem('vc_token', token);
  localStorage.setItem('vc_user', JSON.stringify(usuario));
}
function logout() {
  localStorage.removeItem('vc_token');
  localStorage.removeItem('vc_user');
  window.location.href = 'index.html';
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

async function api(path, opts = {}) {
  try {
    const res = await fetch(API + path, opts);
    const data = await res.json();
    return data;
  } catch (e) {
    return { ok: false, error: 'No se pudo conectar con el servidor' };
  }
}

function destinoPorRol(rol) {
  if (rol === 'admin') return 'admin.html';
  if (rol === 'veterinario') return 'dashboard-veterinario.html';
  if (rol === 'recepcion') return 'dashboard-recepcion.html';
  return 'dashboard.html'; // propietario
}

function requireRole(...rolesEsperados) {
  const token = getToken();
  const user = getUser();
  if (!token || !user) { window.location.href = 'login.html'; return null; }
  if (!rolesEsperados.includes(user.rol)) {
    window.location.href = destinoPorRol(user.rol);
    return null;
  }
  return user;
}

function toast(msg, tipo = '') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast ' + tipo + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', (e) => {
  document.querySelectorAll('.modal-overlay').forEach(o => {
    if (e.target === o) o.classList.remove('open');
  });
});

function fmtMoney(n) { return '$' + Number(n || 0).toFixed(2); }
function fmtFecha(f) {
  if (!f) return '—';
  const d = new Date(f + (String(f).length <= 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return f;
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
function iniciales(nombre) {
  return (nombre || 'U').trim().split(' ').slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

function logoSVG() {
  return `<svg width="30" height="30" viewBox="0 0 30 30" fill="none">
    <circle cx="15" cy="15" r="14" stroke="currentColor" stroke-width="1.6" opacity="0.25"/>
    <path d="M4 15 h5 l2.2 -6 3 11 2.6 -8 1.8 3 H26" stroke="var(--primary,#0E6E55)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}