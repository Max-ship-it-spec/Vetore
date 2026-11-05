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

// ══════════════════════════════════════════════════════════════
// Utilidades de ventas, notificaciones y refresco automático
// ══════════════════════════════════════════════════════════════
const vcEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vcNum = v => v && v.numero ? 'V-' + String(v.numero).padStart(4, '0') : '#' + (v?.id ?? '');

function vcImprimirVenta(v) {
  if (!v) return;
  let items = []; try { items = typeof v.items_json === 'string' ? JSON.parse(v.items_json) : (v.items_json || []); } catch (e) {}
  const u = getUser() || {}, saldo = Math.max(0, Number(v.total) - Number(v.pagado || 0));
  const w = window.open('', '_blank');
  if (!w) { toast('Permite las ventanas emergentes para imprimir', 'rojo'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${vcNum(v)}</title>
  <style>@page{size:80mm auto;margin:4mm}body{font-family:Arial,sans-serif;font-size:12px;width:72mm;margin:0 auto;color:#000}
  h2{text-align:center;margin:4px 0}.c{text-align:center}.r{display:flex;justify-content:space-between;gap:8px;margin:2px 0}
  hr{border:0;border-top:1px dashed #000;margin:6px 0}</style></head><body>
  <h2>${vcEsc(u.nombre_clinica || 'Clínica veterinaria')}</h2>
  <div class="c">Comprobante ${vcNum(v)}<br>${fmtFecha(v.created_at)}</div><hr>
  <div>Cliente: ${vcEsc(v.cliente_nombre || 'Consumidor final')}${v.paciente_nombre ? '<br>Mascota: ' + vcEsc(v.paciente_nombre) : ''}</div><hr>
  ${items.map(i => `<div class="r"><span>${vcEsc(i.nombre)}${i.cantidad > 1 ? ' × ' + i.cantidad : ''}</span><span>${fmtMoney(i.precio * (i.cantidad || 1))}</span></div>`).join('')}<hr>
  <div class="r"><span>Subtotal</span><span>${fmtMoney(v.subtotal)}</span></div>
  ${Number(v.descuento) ? `<div class="r"><span>Descuento</span><span>-${fmtMoney(v.descuento)}</span></div>` : ''}
  ${Number(v.impuesto) ? `<div class="r"><span>IVA</span><span>${fmtMoney(v.impuesto)}</span></div>` : ''}
  <div class="r"><b>TOTAL</b><b>${fmtMoney(v.total)}</b></div>
  <div class="r"><span>Pagado</span><span>${fmtMoney(v.pagado)}</span></div>
  ${saldo > 0.001 ? `<div class="r"><b>Saldo pendiente</b><b>${fmtMoney(saldo)}</b></div>` : ''}<hr>
  <div class="c">Estado: ${vcEsc(v.estado_pago)}<br>¡Gracias por confiar en nosotros! 🐾</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
  w.document.close();
}

(function vcNotificaciones() {
  const u = getUser();
  if (!u || !getToken() || !u.empresa_id) return;
  const RUTA = { stock_bajo: 'inventario', solicitud_producto: 'inventario', paciente_espera: 'atencion',
                 paciente_llamado: 'atencion', consulta_finalizada: 'ventas', receta_pendiente: 'ventas' };
  let ultimo = null, lista = [];

  function pintar(sinLeer) {
    const c = document.getElementById('nt_count'), p = document.getElementById('nt_list');
    if (!c || !p) return;
    c.textContent = sinLeer; c.style.display = sinLeer ? 'block' : 'none';
    p.innerHTML = `<div class="nt-h"><span>Notificaciones</span><button onclick="vcNotifLeerTodas()">Marcar leídas</button></div>` +
      (lista.length ? lista.map(n => `<div class="nt-i ${n.leida ? '' : 'nl'}" onclick="vcNotifClick(${n.id})">
        <b>${vcEsc(n.titulo)}</b><small>${vcEsc(n.detalle)}</small></div>`).join('')
        : '<div class="nt-i">Sin notificaciones</div>');
  }
  async function tick() {
    const d = await api('/api/notificaciones', { headers: authHeaders() });
    if (!d.ok) return;
    lista = d.notificaciones;
    const maxId = lista.reduce((a, n) => Math.max(a, n.id), 0);
    if (ultimo !== null) lista.filter(n => n.id > ultimo && !n.leida).slice(0, 3).forEach(n => toast(n.titulo + (n.detalle ? ': ' + n.detalle : '')));
    ultimo = Math.max(ultimo || 0, maxId);
    pintar(d.sin_leer);
    // Refresco automático de la sala de espera y de ventas
    const act = id => document.getElementById(id)?.classList.contains('active');
    const ocupado = document.querySelector('.modal-overlay.open') || document.activeElement?.tagName === 'SELECT';
    if (!ocupado) {
      if (act('sec-atencion') && typeof cargarAtenciones === 'function') cargarAtenciones();
      if (act('sec-ventas') && typeof cargarVentas === 'function') cargarVentas();
    }
  }
  window.vcNotifClick = async (id) => {
    const n = lista.find(x => x.id === id); if (!n) return;
    await api('/api/notificaciones/leer', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id }) });
    document.getElementById('nt_panel')?.classList.remove('open');
    const sec = RUTA[n.tipo];
    if (sec && document.getElementById('sec-' + sec) && typeof ir === 'function') ir(sec);
    tick();
  };
  window.vcNotifLeerTodas = async () => {
    await api('/api/notificaciones/leer', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ todas: true }) });
    tick();
  };
  function init() {
    const bar = document.querySelector('.topbar'); if (!bar) return;
    const st = document.createElement('style');
    st.textContent = `.nt-w{position:relative;margin-left:12px}.nt-b{background:#fff;border:1px solid var(--border,#ddd);border-radius:10px;padding:6px 10px;cursor:pointer;font-size:16px}
    .nt-c{position:absolute;top:-6px;right:-6px;background:#c0392b;color:#fff;border-radius:10px;font-size:10.5px;font-weight:700;padding:1px 6px;display:none}
    .nt-p{display:none;position:absolute;right:0;top:44px;width:320px;max-height:380px;overflow:auto;background:#fff;border:1px solid var(--border,#ddd);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.15);z-index:60}
    .nt-p.open{display:block}.nt-i{padding:10px 14px;border-bottom:1px solid var(--border,#eee);font-size:13px;cursor:pointer}.nt-i.nl{background:#eef7f2}
    .nt-i small{display:block;color:var(--ink-soft,#777);margin-top:2px}.nt-h{display:flex;justify-content:space-between;padding:10px 14px;font-weight:700;font-size:13px}
    .nt-h button{border:0;background:none;color:var(--primary,#0f6b4f);cursor:pointer;font-size:12px}`;
    document.head.appendChild(st);
    const w = document.createElement('div'); w.className = 'nt-w';
    w.innerHTML = `<button class="nt-b" onclick="document.getElementById('nt_panel').classList.toggle('open')" aria-label="Notificaciones"><svg class="ico" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></button>
      <span class="nt-c" id="nt_count">0</span><div class="nt-p" id="nt_panel"><div id="nt_list"></div></div>`;
    bar.appendChild(w);
    document.addEventListener('click', e => { if (!w.contains(e.target)) document.getElementById('nt_panel')?.classList.remove('open'); });
    tick(); setInterval(tick, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();