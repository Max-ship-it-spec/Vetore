const user = requireRole('cliente');
document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

if (user) {
  document.getElementById('userName').textContent = user.nombre_clinica || user.nombre || 'Mi clínica';
  document.getElementById('userPlan').textContent = (user.plan_nombre || 'Sin plan');
  document.getElementById('avatarLetter').textContent = iniciales(user.nombre_clinica || user.nombre || 'V');
  document.getElementById('clinicaTag').textContent = user.plan_nombre ? user.plan_nombre : 'Mi clínica';
}

// ══════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════════════════
const titles = {
  inicio: 'Inicio', clientes: 'Clientes', pacientes: 'Pacientes', agenda: 'Agenda',
  historia: 'Historia clínica', ventas: 'Ventas', inventario: 'Inventario',
  atencion: 'Atención', personal: 'Personal'
};
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => ir(btn.dataset.sec)));

function ir(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-sec="${sec}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = titles[sec];
  document.getElementById('sidebar').classList.remove('open');

  if (sec === 'inicio') cargarResumen();
  if (sec === 'clientes') cargarClientes();
  if (sec === 'pacientes') cargarPacientes();
  if (sec === 'agenda') cargarCitas();
  if (sec === 'historia') cargarSelectPacientesHistoria();
  if (sec === 'ventas') cargarVentas();
  if (sec === 'inventario') cargarProductos();
  if (sec === 'atencion') cargarAtenciones();
  if (sec === 'personal') cargarStaff();
}

// ══════════════════════════════════════════════════════════════
// RESUMEN
// ══════════════════════════════════════════════════════════════
async function cargarResumen() {
  const d = await api('/api/resumen', { headers: authHeaders() });
  if (!d.ok) return;
  document.getElementById('st-clientes').textContent = d.totalClientes;
  document.getElementById('st-pacientes').textContent = d.totalPacientes;
  document.getElementById('st-citasHoy').textContent = d.citasHoy;
  document.getElementById('st-ventasMes').textContent = fmtMoney(d.ventasMes);
  document.getElementById('st-stockBajo').textContent = d.stockBajo;
}

// ══════════════════════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════════════════════
let _clientes = [];
async function cargarClientes() {
  const d = await api('/api/clientes', { headers: authHeaders() });
  _clientes = d.ok ? d.clientes : [];
  renderClientes();
}
function renderClientes() {
  document.getElementById('tbClientes').innerHTML = _clientes.length
    ? _clientes.map(c => `<tr>
        <td><strong>${c.nombre}</strong></td>
        <td>${c.telefono || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.documento || '—'}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="abrirEditarCliente(${c.id})">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarCliente(${c.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Aún no tienes clientes registrados</td></tr>';
}
function abrirCrearCliente() {
  document.getElementById('mClienteTitulo').textContent = 'Nuevo cliente';
  document.getElementById('cl_id').value = '';
  ['cl_nombre', 'cl_telefono', 'cl_email', 'cl_documento', 'cl_direccion'].forEach(id => document.getElementById(id).value = '');
  abrirModal('mCliente');
}
function abrirEditarCliente(id) {
  const c = _clientes.find(x => x.id === id); if (!c) return;
  document.getElementById('mClienteTitulo').textContent = 'Editar cliente';
  document.getElementById('cl_id').value = c.id;
  document.getElementById('cl_nombre').value = c.nombre || '';
  document.getElementById('cl_telefono').value = c.telefono || '';
  document.getElementById('cl_email').value = c.email || '';
  document.getElementById('cl_documento').value = c.documento || '';
  document.getElementById('cl_direccion').value = c.direccion || '';
  abrirModal('mCliente');
}
async function guardarCliente() {
  const id = document.getElementById('cl_id').value;
  const body = {
    nombre: document.getElementById('cl_nombre').value.trim(),
    telefono: document.getElementById('cl_telefono').value.trim(),
    email: document.getElementById('cl_email').value.trim(),
    documento: document.getElementById('cl_documento').value.trim(),
    direccion: document.getElementById('cl_direccion').value.trim(),
  };
  if (!body.nombre) { toast('El nombre es obligatorio', 'rojo'); return; }
  const d = await api(id ? `/api/clientes/${id}` : '/api/clientes', {
    method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body)
  });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Cliente guardado', 'verde');
  cerrarModal('mCliente');
  cargarClientes();
}
async function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente? También se eliminarán sus mascotas.')) return;
  const d = await api(`/api/clientes/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Cliente eliminado', 'verde');
  cargarClientes();
}

// ══════════════════════════════════════════════════════════════
// PACIENTES
// ══════════════════════════════════════════════════════════════
let _pacientes = [];
async function cargarPacientes() {
  const d = await api('/api/pacientes', { headers: authHeaders() });
  _pacientes = d.ok ? d.pacientes : [];
  renderPacientes();
}
function renderPacientes() {
  document.getElementById('tbPacientes').innerHTML = _pacientes.length
    ? _pacientes.map(p => `<tr>
        <td>
          ${p.foto_url ? `<img src="${p.foto_url}" class="avatar-mini">` : `<span class="avatar-mini-placeholder">🐾</span>`}
          <a href="#" onclick="abrirFichaPaciente(${p.id});return false;" style="color:var(--primary-dark);font-weight:700;text-decoration:none;">${p.nombre}</a>
        </td>
        <td>${p.cliente_nombre}</td>
        <td>${p.especie || '—'} ${p.raza ? '· ' + p.raza : ''}</td>
        <td>${p.peso ? p.peso + ' kg' : '—'}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="abrirEditarPaciente(${p.id})">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarPaciente(${p.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Aún no tienes pacientes registrados</td></tr>';
}

async function asegurarClientesCargados() {
  if (!_clientes.length) {
    const d = await api('/api/clientes', { headers: authHeaders() });
    _clientes = d.ok ? d.clientes : [];
  }
}
function poblarSelectClientes(selectId, valorSel) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">— Selecciona un cliente —</option>' +
    _clientes.map(c => `<option value="${c.id}" ${String(c.id) === String(valorSel) ? 'selected' : ''}>${c.nombre}</option>`).join('');
}
async function abrirCrearPaciente() {
  await asegurarClientesCargados();
  poblarSelectClientes('pa_cliente_id');
  document.getElementById('mPacienteTitulo').textContent = 'Nueva mascota';
  document.getElementById('pa_id').value = '';
  ['pa_nombre', 'pa_especie', 'pa_raza', 'pa_fnac', 'pa_peso', 'pa_color', 'pa_microchip', 'pa_alergias', 'pa_observaciones'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pa_sexo').value = '';
  document.getElementById('pa_foto_preview_box').innerHTML = '<div class="pac-foto-placeholder">🐾</div>';
  _pacienteFotoFile = null;
  abrirModal('mPaciente');
}
async function abrirEditarPaciente(id) {
  const p = _pacientes.find(x => x.id === id); if (!p) return;
  await asegurarClientesCargados();
  poblarSelectClientes('pa_cliente_id', p.cliente_id);
  document.getElementById('mPacienteTitulo').textContent = 'Editar mascota';
  document.getElementById('pa_id').value = p.id;
  document.getElementById('pa_nombre').value = p.nombre || '';
  document.getElementById('pa_especie').value = p.especie || '';
  document.getElementById('pa_raza').value = p.raza || '';
  document.getElementById('pa_sexo').value = p.sexo || '';
  document.getElementById('pa_fnac').value = p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : '';
  document.getElementById('pa_peso').value = p.peso || '';
  document.getElementById('pa_color').value = p.color || '';
  document.getElementById('pa_microchip').value = p.microchip || '';
  document.getElementById('pa_alergias').value = p.alergias || '';
  document.getElementById('pa_observaciones').value = p.observaciones || '';
  document.getElementById('pa_foto_preview_box').innerHTML = p.foto_url
    ? `<img src="${p.foto_url}" class="pac-foto-preview">`
    : '<div class="pac-foto-placeholder">🐾</div>';
  _pacienteFotoFile = null;
  abrirModal('mPaciente');
}
async function guardarPaciente() {
  const id = document.getElementById('pa_id').value;
  const cliente_id = document.getElementById('pa_cliente_id').value;
  const body = {
    cliente_id,
    nombre: document.getElementById('pa_nombre').value.trim(),
    especie: document.getElementById('pa_especie').value.trim(),
    raza: document.getElementById('pa_raza').value.trim(),
    sexo: document.getElementById('pa_sexo').value,
    fecha_nacimiento: document.getElementById('pa_fnac').value || null,
    peso: document.getElementById('pa_peso').value || null,
    color: document.getElementById('pa_color').value.trim(),
    microchip: document.getElementById('pa_microchip').value.trim(),
    alergias: document.getElementById('pa_alergias').value.trim(),
    observaciones: document.getElementById('pa_observaciones').value.trim(),
  };
  if (!id && !cliente_id) { toast('Selecciona el propietario', 'rojo'); return; }
  if (!body.nombre) { toast('El nombre de la mascota es obligatorio', 'rojo'); return; }
  const d = await api(id ? `/api/pacientes/${id}` : '/api/pacientes', {
    method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body)
  });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }

  const fotoOk = await subirFotoPacienteSiHay(id || d.id);

  cerrarModal('mPaciente');
  cargarPacientes();
  if (fotoOk === false) return; // el toast de error de foto ya se mostró y no lo pisamos
  toast('Mascota guardada', 'verde');
}
async function eliminarPaciente(id) {
  if (!confirm('¿Eliminar esta mascota? Se eliminará también su historia clínica.')) return;
  const d = await api(`/api/pacientes/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Mascota eliminada', 'verde');
  cargarPacientes();
}

// ══════════════════════════════════════════════════════════════
// AGENDA
// ══════════════════════════════════════════════════════════════
let _citas = [];
async function cargarCitas() {
  const d = await api('/api/citas', { headers: authHeaders() });
  _citas = d.ok ? d.citas : [];
  renderCitas();
}
const estadoBadge = { pendiente: 'b-grey', confirmada: 'b-primary', en_espera: 'b-accent', atendiendo: 'b-accent', atendida: 'b-primary', cancelada: 'b-danger', no_asistio: 'b-danger' };
function renderCitas() {
  document.getElementById('tbCitas').innerHTML = _citas.length
    ? _citas.map(c => `<tr>
        <td>${fmtFecha(c.fecha)}</td>
        <td>${c.hora ? c.hora.slice(0, 5) : '—'}</td>
        <td>${c.cliente_nombre || '—'}</td>
        <td>${c.paciente_nombre || '—'}</td>
        <td>${c.motivo || '—'}</td>
        <td>
          <select onchange="cambiarEstadoCita(${c.id}, this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);font-size:12px;">
            ${['pendiente', 'confirmada', 'en_espera', 'atendiendo', 'atendida', 'no_asistio', 'cancelada'].map(e => `<option value="${e}" ${e === c.estado ? 'selected' : ''}>${e.replace('_',' ')}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn btn-danger btn-sm" onclick="eliminarCita(${c.id})">Eliminar</button></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">No hay citas agendadas</td></tr>';
}
async function poblarPacientesDeCliente(selectId, clienteId) {
  await Promise.all([asegurarClientesCargados(), asegurarPacientesCargados()]);
  const sel = document.getElementById(selectId);
  const lista = clienteId ? _pacientes.filter(p => String(p.cliente_id) === String(clienteId)) : [];
  sel.innerHTML = '<option value="">— Sin mascota —</option>' +
    lista.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}
async function asegurarPacientesCargados() {
  if (!_pacientes.length) {
    const d = await api('/api/pacientes', { headers: authHeaders() });
    _pacientes = d.ok ? d.pacientes : [];
  }
}
async function abrirCrearCita() {
  await asegurarClientesCargados();
  poblarSelectClientes('ci_cliente_id');
  document.getElementById('ci_paciente_id').innerHTML = '<option value="">— Selecciona un cliente primero —</option>';
  ['ci_fecha', 'ci_hora', 'ci_motivo', 'ci_notas'].forEach(id => document.getElementById(id).value = '');
  abrirModal('mCita');
}
async function guardarCita() {
  const body = {
    cliente_id: document.getElementById('ci_cliente_id').value || null,
    paciente_id: document.getElementById('ci_paciente_id').value || null,
    fecha: document.getElementById('ci_fecha').value,
    hora: document.getElementById('ci_hora').value || null,
    motivo: document.getElementById('ci_motivo').value.trim(),
    notas: document.getElementById('ci_notas').value.trim(),
  };
  if (!body.fecha) { toast('La fecha es obligatoria', 'rojo'); return; }
  const d = await api('/api/citas', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Cita agendada', 'verde');
  cerrarModal('mCita');
  cargarCitas();
}
async function cambiarEstadoCita(id, estado) {
  const d = await api(`/api/citas/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ estado }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Estado actualizado', 'verde');
  cargarCitas();
}
async function eliminarCita(id) {
  if (!confirm('¿Eliminar esta cita?')) return;
  const d = await api(`/api/citas/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Cita eliminada', 'verde');
  cargarCitas();
}

// ══════════════════════════════════════════════════════════════
// HISTORIA CLÍNICA
// ══════════════════════════════════════════════════════════════
let _pacienteHistoriaActivo = null;
async function cargarSelectPacientesHistoria() {
  await asegurarPacientesCargados();
  const sel = document.getElementById('hc_paciente_select');
  sel.innerHTML = '<option value="">— Elige una mascota —</option>' +
    _pacientes.map(p => `<option value="${p.id}">${p.nombre} — ${p.cliente_nombre}</option>`).join('');
}
async function cargarHistoriaPaciente() {
  const id = document.getElementById('hc_paciente_select').value;
  _pacienteHistoriaActivo = id || null;
  const wrap = document.getElementById('hc_wrap');
  if (!id) { wrap.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">Elige un paciente para ver o registrar su historia clínica.</p>'; return; }

  wrap.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">Cargando...</p>';
  const d = await api(`/api/historias/${id}`, { headers: authHeaders() });
  const historias = d.ok ? d.historias : [];

  const paciente = _pacientes.find(p => String(p.id) === String(id));

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div><strong>${paciente?.nombre || ''}</strong> <span style="color:var(--ink-soft);font-size:13px;">— ${paciente?.especie || ''} ${paciente?.raza ? '· ' + paciente.raza : ''}</span></div>
      <button class="btn btn-primary btn-sm" onclick="abrirNuevaConsulta()">+ Nueva consulta</button>
    </div>
    <div id="hc_lista">
      ${historias.length ? historias.map(h => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="font-size:13.5px;">${fmtFecha(h.fecha)}${h.motivo ? ' — ' + h.motivo : ''}</strong>
            <button class="btn btn-danger btn-sm" onclick="eliminarConsulta(${h.id})">Eliminar</button>
          </div>
          <div style="font-size:13px;color:var(--ink-soft);line-height:1.7;">
            ${h.peso ? `<div><strong>Peso:</strong> ${h.peso} kg</div>` : ''}
            ${h.temperatura ? `<div><strong>Temp:</strong> ${h.temperatura} °C</div>` : ''}
            ${h.diagnostico ? `<div><strong>Diagnóstico:</strong> ${h.diagnostico}</div>` : ''}
            ${h.tratamiento ? `<div><strong>Tratamiento:</strong> ${h.tratamiento}</div>` : ''}
            ${h.recomendaciones ? `<div><strong>Recomendaciones:</strong> ${h.recomendaciones}</div>` : ''}
            ${h.proximo_control ? `<div><strong>Próximo control:</strong> ${fmtFecha(h.proximo_control)}</div>` : ''}
          </div>
        </div>
      `).join('') : '<p style="color:var(--ink-soft);font-size:13.5px;">Sin consultas registradas aún.</p>'}
    </div>
  `;
}
function abrirNuevaConsulta() {
  if (!_pacienteHistoriaActivo) return;
  document.getElementById('mConsultaSub').textContent = 'Registro de historia clínica';
  ['hc_fecha', 'hc_proximo', 'hc_motivo', 'hc_anamnesis', 'hc_peso', 'hc_temp', 'hc_fc', 'hc_fr', 'hc_diagnostico', 'hc_tratamiento', 'hc_recomendaciones']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('hc_fecha').value = new Date().toISOString().slice(0, 10);
  abrirModal('mConsulta');
}
async function guardarConsulta() {
  const body = {
    paciente_id: _pacienteHistoriaActivo,
    fecha: document.getElementById('hc_fecha').value,
    proximo_control: document.getElementById('hc_proximo').value || null,
    motivo: document.getElementById('hc_motivo').value.trim(),
    anamnesis: document.getElementById('hc_anamnesis').value.trim(),
    peso: document.getElementById('hc_peso').value || null,
    temperatura: document.getElementById('hc_temp').value || null,
    fc: document.getElementById('hc_fc').value.trim(),
    fr: document.getElementById('hc_fr').value.trim(),
    diagnostico: document.getElementById('hc_diagnostico').value.trim(),
    tratamiento: document.getElementById('hc_tratamiento').value.trim(),
    recomendaciones: document.getElementById('hc_recomendaciones').value.trim(),
  };
  if (!body.fecha) { toast('La fecha es obligatoria', 'rojo'); return; }
  const d = await api('/api/historias', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Consulta registrada', 'verde');
  cerrarModal('mConsulta');
  cargarHistoriaPaciente();
}
async function eliminarConsulta(id) {
  if (!confirm('¿Eliminar esta consulta del historial?')) return;
  const d = await api(`/api/historias/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Consulta eliminada', 'verde');
  cargarHistoriaPaciente();
}

// ══════════════════════════════════════════════════════════════
// INVENTARIO
// ══════════════════════════════════════════════════════════════
let _productos = [];
async function cargarProductos() {
  const d = await api('/api/productos', { headers: authHeaders() });
  _productos = d.ok ? d.productos : [];
  renderProductos();
}
function renderProductos() {
  document.getElementById('tbProductos').innerHTML = _productos.length
    ? _productos.map(p => `<tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.categoria || '—'}</td>
        <td>${fmtMoney(p.precio_venta)}</td>
        <td>${p.stock <= p.stock_minimo ? `<span class="badge b-danger">${p.stock}</span>` : p.stock}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="abrirEditarProducto(${p.id})">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${p.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Aún no tienes productos en el inventario</td></tr>';
}
function abrirCrearProducto() {
  document.getElementById('mProductoTitulo').textContent = 'Nuevo producto';
  document.getElementById('pr_id').value = '';
  ['pr_nombre', 'pr_categoria', 'pr_precio_venta', 'pr_precio_compra', 'pr_stock', 'pr_stock_minimo'].forEach(id => document.getElementById(id).value = '');
  abrirModal('mProducto');
}
function abrirEditarProducto(id) {
  const p = _productos.find(x => x.id === id); if (!p) return;
  document.getElementById('mProductoTitulo').textContent = 'Editar producto';
  document.getElementById('pr_id').value = p.id;
  document.getElementById('pr_nombre').value = p.nombre || '';
  document.getElementById('pr_categoria').value = p.categoria || '';
  document.getElementById('pr_precio_venta').value = p.precio_venta || '';
  document.getElementById('pr_precio_compra').value = p.precio_compra || '';
  document.getElementById('pr_stock').value = p.stock ?? '';
  document.getElementById('pr_stock_minimo').value = p.stock_minimo ?? '';
  abrirModal('mProducto');
}
async function guardarProducto() {
  const id = document.getElementById('pr_id').value;
  const body = {
    nombre: document.getElementById('pr_nombre').value.trim(),
    categoria: document.getElementById('pr_categoria').value.trim(),
    precio_venta: document.getElementById('pr_precio_venta').value || 0,
    precio_compra: document.getElementById('pr_precio_compra').value || 0,
    stock: document.getElementById('pr_stock').value || 0,
    stock_minimo: document.getElementById('pr_stock_minimo').value || 0,
  };
  if (!body.nombre) { toast('El nombre es obligatorio', 'rojo'); return; }
  const d = await api(id ? `/api/productos/${id}` : '/api/productos', {
    method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body)
  });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Producto guardado', 'verde');
  cerrarModal('mProducto');
  cargarProductos();
}
async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto del inventario?')) return;
  const d = await api(`/api/productos/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Producto eliminado', 'verde');
  cargarProductos();
}

// ══════════════════════════════════════════════════════════════
// VENTAS
// ══════════════════════════════════════════════════════════════
let _ventas = [];
let _itemsVenta = [];
async function cargarVentas() {
  const d = await api('/api/ventas', { headers: authHeaders() });
  _ventas = d.ok ? d.ventas : [];
  renderVentas();
}
function renderVentas() {
  document.getElementById('tbVentas').innerHTML = _ventas.length
    ? _ventas.map(v => `<tr>
        <td>${fmtFecha(v.created_at)}</td>
        <td>${v.cliente_nombre || '—'}</td>
        <td>${v.paciente_nombre || '—'}</td>
        <td><strong>${fmtMoney(v.total)}</strong></td>
        <td><span class="badge ${v.estado_pago === 'pagado' ? 'b-primary' : 'b-accent'}">${v.estado_pago}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="eliminarVenta(${v.id})">Eliminar</button></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Aún no tienes ventas registradas</td></tr>';
}
async function abrirCrearVenta() {
  await Promise.all([asegurarClientesCargados(), cargarProductosParaVenta()]);
  poblarSelectClientes('ve_cliente_id');
  document.getElementById('ve_paciente_id').innerHTML = '<option value="">—</option>';
  document.getElementById('ve_descuento').value = 0;
  document.getElementById('ve_item_nombre').value = '';
  document.getElementById('ve_item_precio').value = '';
  _itemsVenta = [];
  renderItemsVenta();
  abrirModal('mVenta');
}
async function cargarProductosParaVenta() {
  const d = await api('/api/productos', { headers: authHeaders() });
  _productos = d.ok ? d.productos : [];
  const sel = document.getElementById('ve_producto_select');
  sel.innerHTML = _productos.map(p => `<option value="${p.id}">${p.nombre} — ${fmtMoney(p.precio_venta)} (stock: ${p.stock})</option>`).join('')
    || '<option value="">Sin productos en inventario</option>';
}
function agregarItemDesdeInventario() {
  const sel = document.getElementById('ve_producto_select');
  const id = sel.value;
  const p = _productos.find(x => String(x.id) === String(id));
  if (!p) { toast('Agrega productos al inventario primero'); return; }
  _itemsVenta.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio_venta), cantidad: 1 });
  renderItemsVenta();
}
function agregarItemLibre() {
  const nombre = document.getElementById('ve_item_nombre').value.trim();
  const precio = Number(document.getElementById('ve_item_precio').value || 0);
  if (!nombre || !precio) { toast('Escribe un nombre y un precio válido', 'rojo'); return; }
  _itemsVenta.push({ nombre, precio, cantidad: 1 });
  document.getElementById('ve_item_nombre').value = '';
  document.getElementById('ve_item_precio').value = '';
  renderItemsVenta();
}
function cambiarCantidadItem(i, delta) {
  _itemsVenta[i].cantidad = Math.max(1, (_itemsVenta[i].cantidad || 1) + delta);
  renderItemsVenta();
}
function quitarItemVenta(i) {
  _itemsVenta.splice(i, 1);
  renderItemsVenta();
}
function renderItemsVenta() {
  const list = document.getElementById('ve_items_list');
  list.innerHTML = _itemsVenta.length
    ? _itemsVenta.map((it, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13.5px;">
        <div style="flex:1;">${it.nombre}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="cambiarCantidadItem(${i},-1)">−</button>
          <span>${it.cantidad}</span>
          <button type="button" class="btn btn-ghost btn-sm" onclick="cambiarCantidadItem(${i},1)">+</button>
        </div>
        <div style="width:70px;text-align:right;font-weight:700;">${fmtMoney(it.precio * it.cantidad)}</div>
        <button type="button" class="btn btn-danger btn-sm" onclick="quitarItemVenta(${i})">✕</button>
      </div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:13px;">Aún no has agregado productos o servicios</p>';

  const subtotal = _itemsVenta.reduce((a, it) => a + it.precio * it.cantidad, 0);
  const descuento = Number(document.getElementById('ve_descuento').value || 0);
  const total = Math.max(subtotal - descuento, 0);
  document.getElementById('ve_total_txt').textContent = fmtMoney(total);
}
async function guardarVenta() {
  if (!_itemsVenta.length) { toast('Agrega al menos un producto o servicio', 'rojo'); return; }
  const body = {
    cliente_id: document.getElementById('ve_cliente_id').value || null,
    paciente_id: document.getElementById('ve_paciente_id').value || null,
    items: _itemsVenta,
    descuento: document.getElementById('ve_descuento').value || 0,
    metodo_pago: document.getElementById('ve_metodo').value,
    estado_pago: 'pagado',
  };
  const d = await api('/api/ventas', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast(`Venta registrada por ${fmtMoney(d.total)}`, 'verde');
  cerrarModal('mVenta');
  cargarVentas();
}
async function eliminarVenta(id) {
  if (!confirm('¿Eliminar esta venta?')) return;
  const d = await api(`/api/ventas/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Venta eliminada', 'verde');
  cargarVentas();
}


// ══════════════════════════════════════════════════════════════
// DASHBOARD "INICIO" — resumen rediseñado
// ══════════════════════════════════════════════════════════════
async function cargarResumen() {
  const d = await api('/api/resumen', { headers: authHeaders() });
  if (!d.ok) return;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('greetingTitle').textContent = `${saludo}, ${(user.nombre || user.nombre_clinica || '').split(' ')[0] || ''}`;

  document.getElementById('st-citasHoy').textContent = d.citasHoy;
  document.getElementById('st-enEspera').textContent = d.enEspera;
  document.getElementById('st-ventasHoy').textContent = fmtMoney(d.ventasHoy);
  document.getElementById('st-alertas').textContent = d.alertas;

  const citasBox = document.getElementById('inicioProximasCitas');
  citasBox.innerHTML = (d.proximasCitas || []).length
    ? d.proximasCitas.map(c => `
      <div class="inicio-list-item">
        <span class="inicio-hora">${c.hora ? c.hora.slice(0,5) : '—'}</span>
        <span style="flex:1;">${c.paciente_nombre || '—'} — ${c.motivo || 'Consulta'}</span>
        <span class="badge ${estadoBadge[c.estado] || 'b-grey'}">${c.estado}</span>
      </div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:13px;">No hay más citas para hoy.</p>';

  const alertBox = document.getElementById('inicioAlertas');
  let alertHtml = '';
  if (d.stockBajo > 0) alertHtml += `<div class="alert-item">📦 ${d.stockBajo} producto(s) con stock bajo</div>`;
  if (d.enEspera > 0) alertHtml += `<div class="alert-item">⏳ ${d.enEspera} paciente(s) en espera</div>`;
  document.getElementById('inicioAlertas').innerHTML = alertHtml || '<p style="color:var(--ink-soft);font-size:13px;">Sin alertas por ahora.</p>';

  document.getElementById('st-clientes')?.remove();
}

// ══════════════════════════════════════════════════════════════
// BÚSQUEDA GLOBAL
// ══════════════════════════════════════════════════════════════
let _searchTimer = null;
function buscarGlobal(term) {
  clearTimeout(_searchTimer);
  const box = document.getElementById('searchResults');
  if (!term.trim()) { box.classList.remove('open'); return; }
  _searchTimer = setTimeout(async () => {
    const d = await api('/api/buscar?q=' + encodeURIComponent(term), { headers: authHeaders() });
    if (!d.ok) return;
    let html = '';
    if (d.pacientes.length) {
      html += '<div class="search-results-group">Pacientes</div>';
      html += d.pacientes.map(p => `<div class="search-result-item" onclick="cerrarBusqueda();abrirFichaPaciente(${p.id})"><span>🐾 ${p.nombre}</span><span style="color:var(--ink-soft);">${p.cliente_nombre}</span></div>`).join('');
    }
    if (d.clientes.length) {
      html += '<div class="search-results-group">Clientes</div>';
      html += d.clientes.map(c => `<div class="search-result-item" onclick="cerrarBusqueda();ir('clientes')"><span>👤 ${c.nombre}</span><span style="color:var(--ink-soft);">${c.telefono || ''}</span></div>`).join('');
    }
    if (!html) html = '<div class="search-empty">Sin resultados</div>';
    box.innerHTML = html;
    box.classList.add('open');
  }, 300);
}
function cerrarBusqueda() {
  document.getElementById('searchResults').classList.remove('open');
  document.getElementById('globalSearch').value = '';
}
document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.search-bar-wrap');
  if (wrap && !wrap.contains(e.target)) document.getElementById('searchResults')?.classList.remove('open');
});

// ══════════════════════════════════════════════════════════════
// FICHA DEL PACIENTE — centro conector
// ══════════════════════════════════════════════════════════════
let _fpPacienteActivo = null;
let _fpTabActual = 'resumen';

async function abrirFichaPaciente(id) {
  await asegurarPacientesCargados();
  _fpPacienteActivo = _pacientes.find(p => p.id === id);
  if (!_fpPacienteActivo) return;
  document.getElementById('fp_nombre').textContent = _fpPacienteActivo.nombre;
  document.getElementById('fp_sub').textContent = `${_fpPacienteActivo.especie || ''} ${_fpPacienteActivo.raza ? '· ' + _fpPacienteActivo.raza : ''} — Tutor: ${_fpPacienteActivo.cliente_nombre}`;
  document.getElementById('fp_avatar').innerHTML = _fpPacienteActivo.foto_url
  ? `<img src="${_fpPacienteActivo.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`
  : (_fpPacienteActivo.especie?.toLowerCase().includes('gat') ? '🐱' : '🐶');
  cambiarTabFicha('resumen');
  abrirModal('mFichaPaciente');
}

function cambiarTabFicha(tab) {
  _fpTabActual = tab;
  document.getElementById('fp_tab_resumen').classList.toggle('active', tab === 'resumen');
  document.getElementById('fp_tab_historia').classList.toggle('active', tab === 'historia');
  if (tab === 'resumen') renderFichaResumen();
  else renderFichaHistoria();
}

function renderFichaResumen() {
  const p = _fpPacienteActivo;
  document.getElementById('fp_contenido').innerHTML = `
    <div class="ficha-grid">
      <div class="ficha-item"><span class="ficha-label">Sexo</span><span class="ficha-val">${p.sexo || '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Peso</span><span class="ficha-val">${p.peso ? p.peso + ' kg' : '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Color</span><span class="ficha-val">${p.color || '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Microchip</span><span class="ficha-val">${p.microchip || '—'}</span></div>
    </div>
    ${p.alergias ? `<div class="ficha-dr-box"><div class="ficha-dr-label">⚠️ Alergias</div><div class="ficha-dr-txt">${p.alergias}</div></div>` : ''}
    ${p.observaciones ? `<div class="ficha-dr-box"><div class="ficha-dr-label">📋 Observaciones</div><div class="ficha-dr-txt">${p.observaciones}</div></div>` : ''}
  `;
}

async function renderFichaHistoria() {
  const box = document.getElementById('fp_contenido');
  box.innerHTML = 'Cargando...';
  const d = await api(`/api/historias/${_fpPacienteActivo.id}`, { headers: authHeaders() });
  const historias = d.ok ? d.historias : [];
  box.innerHTML = historias.length ? historias.map(h => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px;">
      <strong style="font-size:13px;">${fmtFecha(h.fecha)}${h.motivo ? ' — ' + h.motivo : ''}</strong>
      <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;line-height:1.6;">
        ${h.diagnostico ? `<div><strong>Diagnóstico:</strong> ${h.diagnostico}</div>` : ''}
        ${h.tratamiento ? `<div><strong>Tratamiento:</strong> ${h.tratamiento}</div>` : ''}
      </div>
    </div>`).join('') : '<p style="color:var(--ink-soft);font-size:13px;">Sin consultas registradas.</p>';
}

function fpNuevaConsulta() {
  cerrarModal('mFichaPaciente');
  ir('historia');
  document.getElementById('hc_paciente_select').value = _fpPacienteActivo.id;
  cargarHistoriaPaciente();
  abrirNuevaConsulta();
}

function fpNuevaVenta() {
  cerrarModal('mFichaPaciente');
  ir('ventas');
  abrirCrearVenta().then(() => {
    document.getElementById('ve_cliente_id').value = _fpPacienteActivo.cliente_id;
    poblarPacientesDeCliente('ve_paciente_id', _fpPacienteActivo.cliente_id).then(() => {
      document.getElementById('ve_paciente_id').value = _fpPacienteActivo.id;
    });
  });
}

// ══════════════════════════════════════════════════════════════
// FOTO DE MASCOTA (Cloudinary)
// ══════════════════════════════════════════════════════════════
let _pacienteFotoFile = null;

function previsualizarFotoPaciente(e) {
  const file = e.target.files[0];
  if (!file) return;
  _pacienteFotoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('pa_foto_preview_box').innerHTML =
      `<img src="${ev.target.result}" class="pac-foto-preview">`;
  };
  reader.readAsDataURL(file);
}

async function subirFotoPacienteSiHay(pacienteId) {
  if (!_pacienteFotoFile) return true;
  const fd = new FormData();
  fd.append('foto', _pacienteFotoFile);
  try {
    const res = await fetch(API + `/api/pacientes/${pacienteId}/foto`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() },
      body: fd
    });
    const data = await res.json();
    _pacienteFotoFile = null;
    if (!data.ok) {
      toast('Error subiendo foto: ' + (data.error || 'desconocido'), 'rojo');
      return false;
    }
    return true;
  } catch (e) {
    toast('Error de red subiendo la foto', 'rojo');
    _pacienteFotoFile = null;
    return false;
  }
}


// ══════════════════════════════════════════════════════════════
// ROLES — control de acceso por tipo de personal
// ══════════════════════════════════════════════════════════════
const rolStaff = user?.rol_staff || null;
const esPropietario = !rolStaff || rolStaff === 'propietario';
const esVeterinario = rolStaff === 'veterinario';
const esRecepcion = rolStaff === 'recepcion';

if (!esPropietario) {
  document.querySelector('.nav-item[data-sec="personal"]')?.remove();
}

// ══════════════════════════════════════════════════════════════
// ATENCIÓN — sala de espera (flujo central)
// ══════════════════════════════════════════════════════════════
let _atenciones = [];
const prioridadLabel = { emergencia: 'Emergencia', urgente: 'Urgente', prioritario: 'Prioritario', normal: 'Normal' };
const estadoAtencionLabel = { llegada: 'Llegada', triaje: 'Triaje', espera: 'En espera', consulta: 'Consulta', diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', venta: 'Venta/Pago', seguimiento: 'Seguimiento', cerrada: 'Cerrada' };
const flujoEstados = ['llegada','triaje','espera','consulta','diagnostico','tratamiento','venta','seguimiento','cerrada'];

async function cargarAtenciones() {
  const d = await api('/api/atenciones', { headers: authHeaders() });
  _atenciones = d.ok ? d.atenciones : [];
  renderAtenciones();
}

function renderAtenciones() {
  const box = document.getElementById('atencionLista');
  if (!_atenciones.length) {
    box.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">No hay pacientes en atención activa.</p>';
    return;
  }
  box.innerHTML = _atenciones.map(a => {
    const idx = flujoEstados.indexOf(a.estado);
    const siguiente = flujoEstados[idx + 1];
    return `
    <div class="atencion-card ${a.prioridad}">
      <div style="flex:1;">
        <strong>${a.paciente_nombre}</strong> <span style="color:var(--ink-soft);font-size:13px;">— ${a.cliente_nombre}</span>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
          <span class="badge b-${a.prioridad}">${prioridadLabel[a.prioridad]}</span>
          <span class="badge b-grey">${estadoAtencionLabel[a.estado]}</span>
          ${a.staff_nombre ? `<span class="badge b-primary">${a.staff_nombre}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost btn-sm" onclick="abrirFichaPaciente(${a.paciente_id})">Ver ficha</button>
        ${siguiente && siguiente !== 'cerrada' ? `<button class="btn btn-primary btn-sm" onclick="avanzarAtencion(${a.id},'${siguiente}')">Avanzar → ${estadoAtencionLabel[siguiente]}</button>` : ''}
        ${siguiente === 'cerrada' ? `<button class="btn btn-primary btn-sm" onclick="avanzarAtencion(${a.id},'cerrada')">Cerrar atención</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function avanzarAtencion(id, estado) {
  const d = await api(`/api/atenciones/${id}/estado`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ estado }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Atención actualizada', 'verde');
  cargarAtenciones();
}

async function abrirCrearAtencion() {
  await asegurarClientesCargados();
  poblarSelectClientes('at_cliente_id');
  document.getElementById('at_paciente_id').innerHTML = '<option value="">— Selecciona un cliente primero —</option>';
  document.getElementById('at_origen').value = 'sin_cita';
  document.getElementById('at_prioridad').value = 'normal';
  abrirModal('mAtencion');
}

async function guardarAtencion() {
  const cliente_id = document.getElementById('at_cliente_id').value;
  const paciente_id = document.getElementById('at_paciente_id').value;
  if (!cliente_id || !paciente_id) { toast('Selecciona cliente y mascota', 'rojo'); return; }
  const body = {
    cliente_id, paciente_id,
    origen: document.getElementById('at_origen').value,
    prioridad: document.getElementById('at_prioridad').value,
  };
  const d = await api('/api/atenciones', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Atención registrada', 'verde');
  cerrarModal('mAtencion');
  cargarAtenciones();
}

// ══════════════════════════════════════════════════════════════
// PERSONAL (staff)
// ══════════════════════════════════════════════════════════════
let _staffList = [];
const staffRolLabel = { propietario: 'Propietario', veterinario: 'Veterinario', recepcion: 'Recepción' };

async function cargarStaff() {
  const d = await api('/api/staff', { headers: authHeaders() });
  _staffList = d.ok ? d.staff : [];
  document.getElementById('tbStaff').innerHTML = _staffList.length
    ? _staffList.map(s => `<tr>
        <td><strong>${s.nombre}</strong></td>
        <td>${s.email}</td>
        <td><span class="badge b-primary">${staffRolLabel[s.rol] || s.rol}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="eliminarStaff(${s.id})">Eliminar</button></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="4">Aún no has agregado personal</td></tr>';
}

function abrirCrearStaff() {
  ['st_nombre','st_email','st_password'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('st_rol').value = 'veterinario';
  abrirModal('mStaff');
}

async function guardarStaff() {
  const body = {
    nombre: document.getElementById('st_nombre').value.trim(),
    email: document.getElementById('st_email').value.trim(),
    password: document.getElementById('st_password').value,
    rol: document.getElementById('st_rol').value,
  };
  if (!body.nombre || !body.email || !body.password) { toast('Completa todos los campos', 'rojo'); return; }
  const d = await api('/api/staff', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Personal agregado', 'verde');
  cerrarModal('mStaff');
  cargarStaff();
}

async function eliminarStaff(id) {
  if (!confirm('¿Eliminar este acceso de personal?')) return;
  const d = await api(`/api/staff/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Personal eliminado', 'verde');
  cargarStaff();
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
cargarResumen();