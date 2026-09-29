const user = requireRole('admin');
document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

if (user) {
  document.getElementById('userName').textContent = user.nombre || 'Admin';
  document.getElementById('avatarLetter').textContent = iniciales(user.nombre || 'Admin');
}

// ── Navegación ──────────────────────────────────────────────
const titles = { resumen: 'Resumen', empresas: 'Clínicas registradas' };
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
  if (sec === 'empresas') cargarEmpresas();
}

// ── Planes (para el <select>) ───────────────────────────────
let _planes = [];
async function cargarPlanes() {
  const d = await api('/api/planes');
  _planes = d.ok ? d.planes : [];
  const sel = document.getElementById('em_plan');
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
    : '<tr class="empty-row"><td colspan="3">Aún no hay clínicas activas</td></tr>';
}

// ══════════════════════════════════════════════════════════════
// EMPRESAS (clínicas) — cada una con hasta 3 cuentas de rol
// ══════════════════════════════════════════════════════════════
let _empresas = [];
const rolLabel = { propietario: 'Propietario', veterinario: 'Veterinario', recepcion: 'Recepción' };
const rolIcono = { propietario: '👑', veterinario: '🩺', recepcion: '🧑‍💼' };

async function cargarEmpresas() {
  const box = document.getElementById('listaEmpresas');
  box.innerHTML = 'Cargando...';
  const d = await api('/api/admin/empresas', { headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  _empresas = d.empresas;
  renderEmpresas();
}

function renderEmpresas() {
  const box = document.getElementById('listaEmpresas');
  box.innerHTML = _empresas.length ? _empresas.map(e => `
    <div style="border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
        <div>
          <strong style="font-size:15px;">${e.nombre_clinica}</strong>
          <span class="badge b-primary" style="margin-left:8px;">${e.plan_nombre || 'Sin plan'}</span>
          ${e.activo ? '<span class="badge b-primary">Activa</span>' : '<span class="badge b-danger">Desactivada</span>'}
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="toggleEmpresaActivo(${e.id}, ${e.activo ? 0 : 1})">${e.activo ? 'Desactivar' : 'Activar'}</button>
          <button class="btn btn-primary btn-sm" onclick="abrirAgregarCuenta(${e.id})">+ Agregar cuenta</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarEmpresa(${e.id})">Eliminar clínica</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Rol</th><th>Nombre</th><th>Email</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${e.cuentas.length ? e.cuentas.map(c => `<tr>
            <td>${rolIcono[c.rol] || ''} ${rolLabel[c.rol] || c.rol}</td>
            <td>${c.nombre || '—'}</td>
            <td>${c.email}</td>
            <td>${c.activo ? '<span class="badge b-primary">Activa</span>' : '<span class="badge b-danger">Desactivada</span>'}</td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-ghost btn-sm" onclick='abrirEditarCuenta(${JSON.stringify(c)})'>Editar</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarCuenta(${c.id})">Eliminar</button>
              </div>
            </td>
          </tr>`).join('') : '<tr class="empty-row"><td colspan="5">Sin cuentas todavía</td></tr>'}
        </tbody>
      </table></div>
    </div>
  `).join('') : '<p style="color:var(--ink-soft);font-size:13.5px;">Aún no has creado ninguna clínica</p>';
}

// ── Crear empresa + cuentas ─────────────────────────────────
function abrirCrearEmpresa() {
  document.getElementById('em_nombre').value = '';
  ['pr_nombre_c','pr_email_c','pr_password_c','ve_nombre_c','ve_email_c','ve_password_c','re_nombre_c','re_email_c','re_password_c']
    .forEach(id => document.getElementById(id).value = '');
  if (!_planes.length) cargarPlanes();
  abrirModal('mEmpresa');
}

async function guardarEmpresa() {
  const nombre_clinica = document.getElementById('em_nombre').value.trim();
  const plan_id = document.getElementById('em_plan').value;
  const propietario = {
    nombre: document.getElementById('pr_nombre_c').value.trim(),
    email: document.getElementById('pr_email_c').value.trim(),
    password: document.getElementById('pr_password_c').value,
  };
  if (!nombre_clinica || !plan_id || !propietario.email || !propietario.password) {
    toast('Nombre de clínica, plan, email y contraseña del propietario son obligatorios', 'rojo');
    return;
  }
  const body = { nombre_clinica, plan_id, propietario };

  const veEmail = document.getElementById('ve_email_c').value.trim();
  if (veEmail) {
    body.veterinario = {
      nombre: document.getElementById('ve_nombre_c').value.trim(),
      email: veEmail,
      password: document.getElementById('ve_password_c').value,
    };
  }
  const reEmail = document.getElementById('re_email_c').value.trim();
  if (reEmail) {
    body.recepcion = {
      nombre: document.getElementById('re_nombre_c').value.trim(),
      email: reEmail,
      password: document.getElementById('re_password_c').value,
    };
  }

  const d = await api('/api/admin/empresas', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error al crear la clínica', 'rojo'); return; }
  toast('Clínica creada correctamente', 'verde');
  cerrarModal('mEmpresa');
  cargarEmpresas();
  cargarResumen();
}

// ── Agregar una cuenta suelta a una empresa existente ────────
function abrirAgregarCuenta(empresaId) {
  const e = _empresas.find(x => x.id === empresaId);
  document.getElementById('cn_empresa_id').value = empresaId;
  document.getElementById('mCuentaNuevaSub').textContent = e ? `Para: ${e.nombre_clinica}` : '';
  document.getElementById('cn_nombre').value = '';
  document.getElementById('cn_email').value = '';
  document.getElementById('cn_password').value = '';
  document.getElementById('cn_rol').value = 'veterinario';
  abrirModal('mCuentaNueva');
}

async function guardarCuentaNueva() {
  const empresaId = document.getElementById('cn_empresa_id').value;
  const body = {
    rol: document.getElementById('cn_rol').value,
    nombre: document.getElementById('cn_nombre').value.trim(),
    email: document.getElementById('cn_email').value.trim(),
    password: document.getElementById('cn_password').value,
  };
  if (!body.email || !body.password) { toast('Email y contraseña son obligatorios', 'rojo'); return; }
  const d = await api(`/api/admin/empresas/${empresaId}/cuentas`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error al crear la cuenta', 'rojo'); return; }
  toast('Cuenta creada correctamente', 'verde');
  cerrarModal('mCuentaNueva');
  cargarEmpresas();
}

// ── Editar / eliminar una cuenta existente ───────────────────
function abrirEditarCuenta(cuenta) {
  document.getElementById('ce_id').value = cuenta.id;
  document.getElementById('mCuentaEditarSub').textContent = `${rolLabel[cuenta.rol] || cuenta.rol} — ${cuenta.email}`;
  document.getElementById('ce_nombre').value = cuenta.nombre || '';
  document.getElementById('ce_password').value = '';
  document.getElementById('ce_activo').value = cuenta.activo ? '1' : '0';
  abrirModal('mCuentaEditar');
}

async function guardarCuentaEditar() {
  const id = document.getElementById('ce_id').value;
  const body = {
    nombre: document.getElementById('ce_nombre').value.trim(),
    activo: document.getElementById('ce_activo').value,
    password: document.getElementById('ce_password').value || undefined,
  };
  const d = await api(`/api/admin/cuentas/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error al guardar', 'rojo'); return; }
  toast('Cuenta actualizada', 'verde');
  cerrarModal('mCuentaEditar');
  cargarEmpresas();
}

async function eliminarCuenta(id) {
  if (!confirm('¿Eliminar esta cuenta de acceso?')) return;
  const d = await api(`/api/admin/cuentas/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Cuenta eliminada', 'verde');
  cargarEmpresas();
}

// ── Activar / desactivar / eliminar una empresa ──────────────
async function toggleEmpresaActivo(id, activo) {
  const d = await api(`/api/admin/empresas/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ activo }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast(activo ? 'Clínica activada' : 'Clínica desactivada', 'verde');
  cargarEmpresas();
  cargarResumen();
}

async function eliminarEmpresa(id) {
  if (!confirm('¿Eliminar esta clínica? Se borrarán también sus 3 cuentas de acceso.')) return;
  const d = await api(`/api/admin/empresas/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Clínica eliminada', 'verde');
  cargarEmpresas();
  cargarResumen();
}

// ── Init ──────────────────────────────────────────────────────
cargarPlanes();
cargarResumen();