const user = requireRole('admin');
document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

if (user) {
  document.getElementById('userName').textContent = user.nombre || 'Admin';
  document.getElementById('avatarLetter').textContent = iniciales(user.nombre || 'Admin');
}

// ── Navegación ──────────────────────────────────────────────
const titles = { resumen: 'Resumen', cuentas: 'Cuentas de clínicas' };
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => ir(btn.dataset.sec));
});

function ir(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-sec="${sec}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = titles[sec];
  document.getElementById('sidebar').classList.remove('open');
  if (sec === 'resumen') cargarResumen();
  if (sec === 'cuentas') cargarCuentas();
}

// ── Planes (para el <select>) ───────────────────────────────
let _planes = [];
async function cargarPlanes() {
  const d = await api('/api/planes');
  _planes = d.ok ? d.planes : [];
  const sel = document.getElementById('cu_plan');
  sel.innerHTML = _planes.map(p =>
    `<option value="${p.id}">${p.nombre} — $${Number(p.precio).toFixed(2)}/mes</option>`
  ).join('');
}

// ── Resumen ──────────────────────────────────────────────────
async function cargarResumen() {
  const d = await api('/api/admin/stats', { headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error cargando estadísticas', 'rojo'); return; }
  document.getElementById('st-total').textContent = d.total;
  document.getElementById('st-activas').textContent = d.activas;
  const ingreso = (d.porPlan || []).reduce((a, p) => a + Number(p.ingreso_mensual || 0), 0);
  document.getElementById('st-ingresos').textContent = fmtMoney(ingreso);

  document.getElementById('tbPorPlan').innerHTML = (d.porPlan || []).length
    ? d.porPlan.map(p => `<tr>
        <td><strong>${p.plan}</strong></td>
        <td>${p.total}</td>
        <td>${fmtMoney(p.ingreso_mensual)}</td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Aún no hay cuentas activas</td></tr>';
}

// ── Cuentas de clínicas ──────────────────────────────────────
let _cuentas = [];
async function cargarCuentas() {
  document.getElementById('tbCuentas').innerHTML = '<tr class="empty-row"><td colspan="6">Cargando...</td></tr>';
  const d = await api('/api/admin/cuentas', { headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  _cuentas = d.cuentas;
  renderCuentas();
}

function renderCuentas() {
  document.getElementById('tbCuentas').innerHTML = _cuentas.length
    ? _cuentas.map(c => `<tr>
        <td><strong>${c.nombre_clinica || '—'}</strong></td>
        <td>${c.nombre || '—'}<br><span style="font-size:12px;color:var(--ink-soft)">${c.email}</span></td>
        <td><span class="badge b-primary">${c.plan_nombre || 'Sin plan'}</span></td>
        <td>${c.activo ? '<span class="badge b-primary">Activa</span>' : '<span class="badge b-danger">Desactivada</span>'}</td>
        <td style="font-size:12.5px;color:var(--ink-soft)">${fmtFecha(c.created_at)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="abrirEditarCuenta(${c.id})">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarCuenta(${c.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Aún no has creado cuentas de clínicas</td></tr>';
}

function abrirCrearCuenta() {
  document.getElementById('mCuentaTitulo').textContent = 'Crear cuenta de clínica';
  document.getElementById('btnGuardarCuenta').textContent = 'Crear cuenta';
  document.getElementById('cu_id').value = '';
  ['cu_clinica', 'cu_nombre', 'cu_email', 'cu_telefono', 'cu_password'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cu_activo_wrap').style.display = 'none';
  document.querySelectorAll('#cu_email, #cu_password').forEach(el => el.disabled = false);
  abrirModal('mCuenta');
}

function abrirEditarCuenta(id) {
  const c = _cuentas.find(x => x.id === id);
  if (!c) return;
  document.getElementById('mCuentaTitulo').textContent = 'Editar cuenta de clínica';
  document.getElementById('btnGuardarCuenta').textContent = 'Guardar cambios';
  document.getElementById('cu_id').value = c.id;
  document.getElementById('cu_clinica').value = c.nombre_clinica || '';
  document.getElementById('cu_nombre').value = c.nombre || '';
  document.getElementById('cu_email').value = c.email || '';
  document.getElementById('cu_telefono').value = c.telefono || '';
  document.getElementById('cu_password').value = '';
  document.getElementById('cu_password').placeholder = 'Dejar vacío para no cambiarla';
  document.getElementById('cu_plan').value = c.plan_id || '';
  document.getElementById('cu_activo_wrap').style.display = 'block';
  document.getElementById('cu_activo').value = c.activo ? '1' : '0';
  document.getElementById('cu_email').disabled = true;
  abrirModal('mCuenta');
}

async function guardarCuenta() {
  const id = document.getElementById('cu_id').value;
  const nombre_clinica = document.getElementById('cu_clinica').value.trim();
  const nombre = document.getElementById('cu_nombre').value.trim();
  const email = document.getElementById('cu_email').value.trim();
  const telefono = document.getElementById('cu_telefono').value.trim();
  const password = document.getElementById('cu_password').value;
  const plan_id = document.getElementById('cu_plan').value;

  if (!nombre_clinica || !plan_id) { toast('Completa al menos el nombre de la clínica y el plan', 'rojo'); return; }

  if (!id) {
    if (!email || !password) { toast('Email y contraseña son obligatorios para crear la cuenta', 'rojo'); return; }
    const d = await api('/api/admin/cuentas', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ nombre_clinica, nombre, email, telefono, password, plan_id })
    });
    if (!d.ok) { toast(d.error || 'Error al crear la cuenta', 'rojo'); return; }
    toast(`Cuenta creada — acceso: ${email}`, 'verde');
  } else {
    const activo = document.getElementById('cu_activo').value;
    const d = await api(`/api/admin/cuentas/${id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ nombre_clinica, nombre, telefono, plan_id, activo, password: password || undefined })
    });
    if (!d.ok) { toast(d.error || 'Error al guardar', 'rojo'); return; }
    toast('Cuenta actualizada', 'verde');
  }

  cerrarModal('mCuenta');
  cargarCuentas();
  cargarResumen();
}

async function eliminarCuenta(id) {
  if (!confirm('¿Eliminar esta cuenta de clínica? Se perderán todos sus datos.')) return;
  const d = await api(`/api/admin/cuentas/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Cuenta eliminada', 'verde');
  cargarCuentas();
  cargarResumen();
}

// ── Init ──────────────────────────────────────────────────────
cargarPlanes();
cargarResumen();