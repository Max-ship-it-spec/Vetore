const user = requireRole('recepcion');
document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

if (user) {
  document.getElementById('userName').textContent = user.nombre || 'Recepción';
  document.getElementById('avatarLetter').textContent = iniciales(user.nombre || 'R');
}

// ══════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════════════════
const titles = { inicio: 'Dashboard', atencion: 'Sala de espera', agenda: 'Agenda', clientes: 'Clientes', pacientes: 'Pacientes', ventas: 'Ventas / Cobros' };
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => ir(btn.dataset.sec)));

function ir(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-sec="${sec}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = titles[sec];
  document.getElementById('sidebar').classList.remove('open');

  if (sec === 'inicio') cargarInicio();
  if (sec === 'atencion') cargarAtenciones();
  if (sec === 'agenda') cargarCitas();
  if (sec === 'clientes') cargarClientes();
  if (sec === 'pacientes') cargarPacientes();
  if (sec === 'ventas') cargarVentas();
}

// ══════════════════════════════════════════════════════════════
// VETERINARIOS (para asignar citas y atenciones)
// ══════════════════════════════════════════════════════════════
let _veterinarios = [];
async function asegurarVeterinariosCargados() {
  const d = await api('/api/veterinarios', { headers: authHeaders() });
  _veterinarios = d.ok ? d.veterinarios : [];
}
function poblarSelectVeterinarios(selectId, valorSel) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">— Sin asignar —</option>' +
    _veterinarios.map(v => `<option value="${v.id}" ${String(v.id) === String(valorSel) ? 'selected' : ''}>${v.nombre}</option>`).join('');
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD (inicio)
// ══════════════════════════════════════════════════════════════
async function cargarInicio() {
  const [citasD, atD, ventasD] = await Promise.all([
    api('/api/citas?hoy=1', { headers: authHeaders() }),
    api('/api/atenciones', { headers: authHeaders() }),
    api('/api/ventas', { headers: authHeaders() }),
  ]);
  const citasHoy = citasD.ok ? citasD.citas : [];
  const atenciones = atD.ok ? atD.atenciones : [];
  const ventas = ventasD.ok ? ventasD.ventas : [];

  const pendD = await api('/api/citas?pendientes=1', { headers: authHeaders() });
  const pendientes = pendD.ok ? pendD.citas : [];

  const hoyStr = new Date().toISOString().slice(0, 10);
  const ventasHoy = ventas.filter(v => String(v.created_at).slice(0, 10) === hoyStr && v.estado_pago === 'pagado');
  const totalHoy = ventasHoy.reduce((a, v) => a + Number(v.total || 0), 0);

  document.getElementById('st-citasHoy').textContent = citasHoy.length;
  document.getElementById('st-pendientes').textContent = pendientes.length;
  document.getElementById('st-llegadas').textContent = atenciones.length;
  document.getElementById('st-cobrosHoy').textContent = fmtMoney(totalHoy);

  document.getElementById('inicioAgendaDia').innerHTML = citasHoy.length
    ? citasHoy.map(c => `
      <div class="inicio-list-item">
        <span class="inicio-hora">${c.hora ? c.hora.slice(0,5) : '—'}</span>
        <span style="flex:1;">${c.paciente_nombre || '—'} — ${c.motivo || 'Consulta'}</span>
        <span class="badge ${estadoBadge[c.estado] || 'b-grey'}">${(c.estado||'').replace('_',' ')}</span>
      </div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:13px;">No hay citas para hoy.</p>';
}

// ══════════════════════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════════════════════
let _clientes = [];
async function cargarClientes() {
  const d = await api('/api/clientes', { headers: authHeaders() });
  _clientes = d.ok ? d.clientes : [];
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
    : '<tr class="empty-row"><td colspan="5">Aún no hay clientes registrados</td></tr>';
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

// ══════════════════════════════════════════════════════════════
// PACIENTES
// ══════════════════════════════════════════════════════════════
let _pacientes = [];
async function cargarPacientes() {
  const d = await api('/api/pacientes', { headers: authHeaders() });
  _pacientes = d.ok ? d.pacientes : [];
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
    : '<tr class="empty-row"><td colspan="5">Aún no hay pacientes registrados</td></tr>';
}
async function asegurarPacientesCargados() {
  if (!_pacientes.length) {
    const d = await api('/api/pacientes', { headers: authHeaders() });
    _pacientes = d.ok ? d.pacientes : [];
  }
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
  if (fotoOk === false) return;
  toast('Mascota guardada', 'verde');
}
async function eliminarPaciente(id) {
  if (!confirm('¿Eliminar esta mascota?')) return;
  const d = await api(`/api/pacientes/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Mascota eliminada', 'verde');
  cargarPacientes();
}

// ══════════════════════════════════════════════════════════════
// FOTO DE MASCOTA
// ══════════════════════════════════════════════════════════════
let _pacienteFotoFile = null;
function previsualizarFotoPaciente(e) {
  const file = e.target.files[0];
  if (!file) return;
  _pacienteFotoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('pa_foto_preview_box').innerHTML = `<img src="${ev.target.result}" class="pac-foto-preview">`;
  };
  reader.readAsDataURL(file);
}
async function subirFotoPacienteSiHay(pacienteId) {
  if (!_pacienteFotoFile) return true;
  const fd = new FormData();
  fd.append('foto', _pacienteFotoFile);
  try {
    const res = await fetch(API + `/api/pacientes/${pacienteId}/foto`, {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd
    });
    const data = await res.json();
    _pacienteFotoFile = null;
    if (!data.ok) { toast('Error subiendo foto: ' + (data.error || 'desconocido'), 'rojo'); return false; }
    return true;
  } catch (e) {
    toast('Error de red subiendo la foto', 'rojo');
    _pacienteFotoFile = null;
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// AGENDA
// ══════════════════════════════════════════════════════════════
let _citas = [];
const estadoBadge = { pendiente: 'b-grey', confirmada: 'b-primary', en_espera: 'b-accent', atendiendo: 'b-accent', atendida: 'b-primary', cancelada: 'b-danger', no_asistio: 'b-danger' };
async function cargarCitas() {
  await asegurarVeterinariosCargados();
  const d = await api('/api/citas', { headers: authHeaders() });
  _citas = d.ok ? d.citas : [];
  document.getElementById('tbCitas').innerHTML = _citas.length
    ? _citas.map(c => `<tr>
        <td>${fmtFecha(c.fecha)}</td>
        <td>${c.hora ? c.hora.slice(0, 5) : '—'}</td>
        <td>${c.cliente_nombre || '—'}</td>
        <td>${c.paciente_nombre || '—'}</td>
        <td>${c.veterinario_nombre || '—'}</td>
        <td>${c.motivo || '—'}</td>
        <td>
          <select onchange="cambiarEstadoCita(${c.id}, this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);font-size:12px;">
            ${['pendiente', 'confirmada', 'en_espera', 'atendiendo', 'atendida', 'no_asistio', 'cancelada'].map(e => `<option value="${e}" ${e === c.estado ? 'selected' : ''}>${e.replace('_',' ')}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn btn-danger btn-sm" onclick="eliminarCita(${c.id})">Eliminar</button></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="8">No hay citas agendadas</td></tr>';
}
async function poblarPacientesDeCliente(selectId, clienteId) {
  await Promise.all([asegurarClientesCargados(), asegurarPacientesCargados()]);
  const sel = document.getElementById(selectId);
  const lista = clienteId ? _pacientes.filter(p => String(p.cliente_id) === String(clienteId)) : [];
  sel.innerHTML = '<option value="">— Sin mascota —</option>' +
    lista.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}
async function abrirCrearCita() {
  await Promise.all([asegurarClientesCargados(), asegurarVeterinariosCargados()]);
  poblarSelectClientes('ci_cliente_id');
  poblarSelectVeterinarios('ci_veterinario_id');
  document.getElementById('ci_paciente_id').innerHTML = '<option value="">— Selecciona un cliente primero —</option>';
  ['ci_fecha', 'ci_hora', 'ci_motivo', 'ci_notas'].forEach(id => document.getElementById(id).value = '');
  abrirModal('mCita');
}
async function guardarCita() {
  const body = {
    cliente_id: document.getElementById('ci_cliente_id').value || null,
    paciente_id: document.getElementById('ci_paciente_id').value || null,
    veterinario_id: document.getElementById('ci_veterinario_id').value || null,
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
// VENTAS / COBROS
// ══════════════════════════════════════════════════════════════
let _ventas = [];
let _itemsVenta = [];
let _productos = [];
async function cargarVentas() {
  const d = await api('/api/ventas', { headers: authHeaders() });
  _ventas = d.ok ? d.ventas : [];
  document.getElementById('tbVentas').innerHTML = _ventas.length
    ? _ventas.map(v => `<tr>
        <td>${fmtFecha(v.created_at)}</td>
        <td>${v.cliente_nombre || '—'}</td>
        <td>${v.paciente_nombre || '—'}</td>
        <td><strong>${fmtMoney(v.total)}</strong></td>
        <td><span class="badge ${v.estado_pago === 'pagado' ? 'b-primary' : 'b-accent'}">${v.estado_pago}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="verComprobante(${v.id})">Ver</button>
            ${v.estado_pago !== 'pagado' ? `<button class="btn btn-primary btn-sm" onclick="registrarPago(${v.id})">Registrar pago</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="eliminarVenta(${v.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Aún no hay ventas registradas</td></tr>';
}
async function abrirCrearVenta() {
  await Promise.all([asegurarClientesCargados(), cargarProductosParaVenta()]);
  poblarSelectClientes('ve_cliente_id');
  document.getElementById('ve_paciente_id').innerHTML = '<option value="">—</option>';
  document.getElementById('ve_descuento').value = 0;
  document.getElementById('ve_estado_pago').value = 'pagado';
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
  if (!p) { toast('No hay productos en inventario'); return; }
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
    estado_pago: document.getElementById('ve_estado_pago').value,
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
async function registrarPago(id) {
  const d = await api(`/api/ventas/${id}/pago`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({}) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Pago registrado', 'verde');
  cargarVentas();
}
function verComprobante(id) {
  const v = _ventas.find(x => x.id === id); if (!v) return;
  let items = [];
  try { items = typeof v.items_json === 'string' ? JSON.parse(v.items_json) : (v.items_json || []); } catch (e) { items = []; }
  document.getElementById('cp_contenido').innerHTML = `
    <p class="modal-sub">${fmtFecha(v.created_at)} — ${v.cliente_nombre || 'Sin cliente'}${v.paciente_nombre ? ' · ' + v.paciente_nombre : ''}</p>
    <div style="margin:14px 0;">
      ${items.map(it => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13.5px;">
        <span>${it.nombre} ${it.cantidad > 1 ? '× ' + it.cantidad : ''}</span><span>${fmtMoney(it.precio * (it.cantidad || 1))}</span>
      </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13.5px;"><span>Subtotal</span><span>${fmtMoney(v.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13.5px;"><span>Descuento</span><span>-${fmtMoney(v.descuento)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px;margin-top:6px;"><span>Total</span><span>${fmtMoney(v.total)}</span></div>
    <p style="margin-top:10px;color:var(--ink-soft);font-size:12.5px;">Método: ${v.metodo_pago} — Estado: ${v.estado_pago}</p>
  `;
  abrirModal('mComprobante');
}

// ══════════════════════════════════════════════════════════════
// FICHA DEL PACIENTE (solo resumen — sin historia clínica)
// ══════════════════════════════════════════════════════════════
let _fpPacienteActivo = null;
async function abrirFichaPaciente(id) {
  await asegurarPacientesCargados();
  _fpPacienteActivo = _pacientes.find(p => p.id === id);
  if (!_fpPacienteActivo) return;
  document.getElementById('fp_nombre').textContent = _fpPacienteActivo.nombre;
  document.getElementById('fp_sub').textContent = `${_fpPacienteActivo.especie || ''} ${_fpPacienteActivo.raza ? '· ' + _fpPacienteActivo.raza : ''} — Tutor: ${_fpPacienteActivo.cliente_nombre}`;
  document.getElementById('fp_avatar').innerHTML = _fpPacienteActivo.foto_url
    ? `<img src="${_fpPacienteActivo.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`
    : (_fpPacienteActivo.especie?.toLowerCase().includes('gat') ? '🐱' : '🐶');
  const p = _fpPacienteActivo;
  document.getElementById('fp_contenido').innerHTML = `
    <div class="ficha-grid">
      <div class="ficha-item"><span class="ficha-label">Sexo</span><span class="ficha-val">${p.sexo || '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Peso</span><span class="ficha-val">${p.peso ? p.peso + ' kg' : '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Color</span><span class="ficha-val">${p.color || '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Microchip</span><span class="ficha-val">${p.microchip || '—'}</span></div>
    </div>
    ${p.alergias ? `<div class="ficha-dr-box"><div class="ficha-dr-label">⚠️ Alergias</div><div class="ficha-dr-txt">${p.alergias}</div></div>` : ''}
  `;
  abrirModal('mFichaPaciente');
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
// ATENCIÓN — sala de espera / registrar llegada
// ══════════════════════════════════════════════════════════════
let _atenciones = [];
const prioridadLabel = { emergencia: 'Emergencia', urgente: 'Urgente', prioritario: 'Prioritario', normal: 'Normal' };
const estadoAtencionLabel = { llegada: 'Llegada', triaje: 'Triaje', espera: 'En espera', consulta: 'Consulta', diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', venta: 'Venta/Pago', seguimiento: 'Seguimiento', cerrada: 'Cerrada' };
// Recepción no puede avanzar a etapas clínicas (el backend también lo bloquea)
const flujoEstadosRecepcion = ['llegada','triaje','espera'];

async function cargarAtenciones() {
  await asegurarVeterinariosCargados();
  const d = await api('/api/atenciones', { headers: authHeaders() });
  _atenciones = d.ok ? d.atenciones : [];
  renderAtenciones();
}
function renderAtenciones() {
  const box = document.getElementById('atencionLista');
  if (!_atenciones.length) { box.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">No hay pacientes en atención activa.</p>'; return; }
  box.innerHTML = _atenciones.map(a => {
    const idx = flujoEstadosRecepcion.indexOf(a.estado);
    const siguiente = idx >= 0 ? flujoEstadosRecepcion[idx + 1] : null;
    return `
    <div class="atencion-card ${a.prioridad}">
      <div style="flex:1;">
        <strong>${a.paciente_nombre}</strong> <span style="color:var(--ink-soft);font-size:13px;">— ${a.cliente_nombre}</span>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
          <span class="badge b-${a.prioridad}">${prioridadLabel[a.prioridad]}</span>
          <span class="badge b-grey">${estadoAtencionLabel[a.estado]}</span>
          ${a.veterinario_nombre ? `<span class="badge b-primary">${a.veterinario_nombre}</span>` : `<select onchange="asignarVeterinario(${a.id}, this.value)" style="padding:2px 6px;border-radius:6px;border:1px solid var(--border);font-size:11.5px;">${['<option value="">Asignar vet.</option>'].concat(_veterinarios.map(v=>`<option value="${v.id}">${v.nombre}</option>`)).join('')}</select>`}
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost btn-sm" onclick="abrirFichaPaciente(${a.paciente_id})">Ver ficha</button>
        ${siguiente ? `<button class="btn btn-primary btn-sm" onclick="avanzarAtencion(${a.id},'${siguiente}')">Avanzar → ${estadoAtencionLabel[siguiente]}</button>` : ''}
      </div>
    </div>`;
  }).join('');
}
async function asignarVeterinario(id, veterinario_id) {
  if (!veterinario_id) return;
  const d = await api(`/api/atenciones/${id}/asignar`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ veterinario_id }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Veterinario asignado', 'verde');
  cargarAtenciones();
}
async function avanzarAtencion(id, estado) {
  const d = await api(`/api/atenciones/${id}/estado`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ estado }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Atención actualizada', 'verde');
  cargarAtenciones();
}
async function abrirCrearAtencion() {
  await Promise.all([asegurarClientesCargados(), asegurarVeterinariosCargados()]);
  poblarSelectClientes('at_cliente_id');
  poblarSelectVeterinarios('at_veterinario_id');
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
    veterinario_id: document.getElementById('at_veterinario_id').value || null,
    origen: document.getElementById('at_origen').value,
    prioridad: document.getElementById('at_prioridad').value,
  };
  const d = await api('/api/atenciones', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Llegada registrada', 'verde');
  cerrarModal('mAtencion');
  cargarAtenciones();
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
cargarInicio();