const user = requireRole('propietario');
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
  atencion: 'Atención', personal: 'Personal', caja: 'Finanzas / Caja', reportes: 'Reportes', config: 'Configuración'
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
  if (sec === 'personal') cargarPersonal();
  if (sec === 'caja') cargarCaja();
  if (sec === 'reportes') cargarReportes();
  if (sec === 'config') cargarConfiguracion();
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
  await asegurarVeterinariosCargados();
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
            ${h.medicamentos ? `<div><strong>Medicamentos:</strong> ${h.medicamentos}</div>` : ''}
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
  ['hc_fecha', 'hc_proximo', 'hc_motivo', 'hc_anamnesis', 'hc_peso', 'hc_temp', 'hc_fc', 'hc_fr', 'hc_diagnostico', 'hc_tratamiento', 'hc_medicamentos', 'hc_recomendaciones']
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
    medicamentos: document.getElementById('hc_medicamentos').value.trim(),
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
// INVENTARIO (catálogo + cargar/descargar stock + stock por almacén)
// ══════════════════════════════════════════════════════════════
let _productos = [];
let _almacenes = [];
const fmtFechaHora = f => f ? new Date(f).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const puedeBorrarProducto = () => user && user.rol === 'propietario';

function invTab(t) {
  document.querySelectorAll('.inv-tab').forEach(b => b.classList.toggle('active', b.dataset.inv === t));
  document.querySelectorAll('.inv-view').forEach(v => v.classList.toggle('active', v.id === 'inv-' + t));
  if (t === 'catalogo') cargarProductos();
  if (t === 'descargas') cargarStockDocs('descarga');
  if (t === 'cargas') cargarStockDocs('carga');
  if (t === 'almacen') cargarStockAlmacen();
}

// ── Catálogo ─────────────────────────────────────────────────
async function cargarProductos() {
  const d = await api('/api/productos', { headers: authHeaders() });
  _productos = d.ok ? d.productos : [];
  poblarFiltrosInv();
  renderProductos();
}
function poblarFiltrosInv() {
  const uniq = k => [...new Set(_productos.map(p => p[k]).filter(Boolean))].sort();
  const llenar = (id, rotulo, vals) => {
    const s = document.getElementById(id), v = s.value;
    s.innerHTML = `<option value="">${rotulo}</option>` + vals.map(x => `<option>${x}</option>`).join('');
    s.value = v;
  };
  llenar('inv_f_proveedor', 'Proveedor...', uniq('proveedor'));
  llenar('inv_f_linea', 'Línea...', uniq('linea'));
  llenar('inv_f_categoria', 'Categorías...', uniq('categoria'));
  const dl = (id, vals) => document.getElementById(id).innerHTML = vals.map(x => `<option value="${x}">`).join('');
  dl('dl_proveedor', uniq('proveedor'));
  dl('dl_linea', [...new Set(['Farmacia', 'Clínica', 'Pet shop', 'Hospedaje', 'Peluquería', ...uniq('linea')])]);
  dl('dl_categoria', uniq('categoria'));
}
function limpiarFiltrosInv() {
  ['inv_buscar', 'inv_f_proveedor', 'inv_f_linea', 'inv_f_stock', 'inv_f_categoria'].forEach(id => document.getElementById(id).value = '');
  renderProductos();
}
function badgeStock(p) {
  const s = Number(p.stock), cls = s <= 0 ? 'stk-zero' : s <= Number(p.stock_minimo) ? 'stk-low' : 'stk-ok';
  return `<span class="stk ${cls}">${s}</span>`;
}
function renderProductos() {
  const q = (document.getElementById('inv_buscar').value || '').toLowerCase();
  const fp = document.getElementById('inv_f_proveedor').value, fl = document.getElementById('inv_f_linea').value;
  const fc = document.getElementById('inv_f_categoria').value, fs = document.getElementById('inv_f_stock').value;
  const lista = _productos.filter(p => {
    if (q && !`${p.nombre} ${p.codigo_barras || ''} ${p.marca || ''}`.toLowerCase().includes(q)) return false;
    if (fp && p.proveedor !== fp) return false;
    if (fl && p.linea !== fl) return false;
    if (fc && p.categoria !== fc) return false;
    const s = Number(p.stock), min = Number(p.stock_minimo);
    if (fs === 'agotado' && s > 0) return false;
    if (fs === 'bajo' && !(s > 0 && s <= min)) return false;
    if (fs === 'ok' && s <= min) return false;
    return true;
  });
  document.getElementById('tbProductos').innerHTML = lista.length
    ? lista.map(p => `<tr>
        <td>${p.id}</td>
        <td>${p.codigo_barras || '—'}</td>
        <td><a href="#" onclick="abrirEditarProducto(${p.id});return false;" style="color:var(--primary-dark);font-weight:700;text-decoration:none;">${p.nombre}</a></td>
        <td>${p.marca || ''}</td>
        <td>${p.proveedor || ''}</td>
        <td>${(p.linea || '').toUpperCase()}</td>
        <td>${fmtMoney(p.precio_venta)}</td>
        <td>${badgeStock(p)}</td>
        <td><span class="dot ${p.activo === 0 ? 'dot-off' : 'dot-on'}"></span></td>
        <td>
          <button class="lnk" title="Editar" onclick="abrirEditarProducto(${p.id})">🔍</button>
          ${puedeBorrarProducto() ? `<button class="lnk" title="Eliminar" style="color:#e74c3c;" onclick="eliminarProducto(${p.id})">🗑</button>` : ''}
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="10">No hay productos</td></tr>';
}

// ── Crear / editar producto ──────────────────────────────────
function prTab(t) {
  document.getElementById('pr_tab_editar').classList.toggle('active', t === 'editar');
  document.getElementById('pr_tab_kardex').classList.toggle('active', t === 'kardex');
  document.getElementById('pr_panel_editar').style.display = t === 'editar' ? 'block' : 'none';
  document.getElementById('pr_panel_kardex').style.display = t === 'kardex' ? 'block' : 'none';
  if (t === 'kardex') cargarKardex();
}
function abrirCrearProducto() {
  document.getElementById('mProductoTitulo').textContent = 'Nuevo producto';
  document.getElementById('pr_id').value = '';
  ['pr_nombre', 'pr_marca', 'pr_codigo_sis', 'pr_barras', 'pr_contenido', 'pr_proveedor', 'pr_linea', 'pr_categoria', 'pr_subcategoria',
   'pr_precio_compra', 'pr_precio_venta', 'pr_stock_minimo', 'pr_stock_maximo', 'pr_frecuencia'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pr_presentacion').value = '';
  document.getElementById('pr_unidad').value = 'UND';
  document.getElementById('pr_stock_inicial').value = 0;
  document.getElementById('pr_disponible').value = '1';
  document.getElementById('pr_activo').value = '1';
  document.getElementById('pr_grp_actual').style.display = 'none';
  document.getElementById('pr_grp_inicial').style.display = 'block';
  document.getElementById('pr_tab_kardex').style.display = 'none';
  prTab('editar');
  abrirModal('mProducto');
}
function abrirEditarProducto(id) {
  const p = _productos.find(x => x.id === id); if (!p) return;
  document.getElementById('mProductoTitulo').textContent = p.nombre;
  const set = (k, v) => document.getElementById(k).value = v ?? '';
  set('pr_id', p.id); set('pr_nombre', p.nombre); set('pr_marca', p.marca); set('pr_codigo_sis', p.id);
  set('pr_barras', p.codigo_barras); set('pr_presentacion', p.presentacion); set('pr_contenido', p.contenido);
  set('pr_unidad', p.unidad_medida || 'UND'); set('pr_proveedor', p.proveedor); set('pr_linea', p.linea);
  set('pr_categoria', p.categoria); set('pr_subcategoria', p.subcategoria);
  set('pr_precio_compra', p.precio_compra); set('pr_precio_venta', p.precio_venta);
  set('pr_stock_actual', p.stock); set('pr_stock_minimo', p.stock_minimo); set('pr_stock_maximo', p.stock_maximo);
  set('pr_frecuencia', p.frecuencia_dias);
  set('pr_disponible', p.disponible_venta === 0 ? '0' : '1'); set('pr_activo', p.activo === 0 ? '0' : '1');
  document.getElementById('pr_grp_actual').style.display = 'block';
  document.getElementById('pr_grp_inicial').style.display = 'none';
  document.getElementById('pr_tab_kardex').style.display = 'inline-block';
  prTab('editar');
  abrirModal('mProducto');
}
async function guardarProducto() {
  const g = id => document.getElementById(id).value;
  const id = g('pr_id');
  const body = {
    nombre: g('pr_nombre').trim(), marca: g('pr_marca').trim(), codigo_barras: g('pr_barras').trim(),
    presentacion: g('pr_presentacion'), contenido: g('pr_contenido').trim(), unidad_medida: g('pr_unidad'),
    proveedor: g('pr_proveedor').trim(), linea: g('pr_linea').trim(), categoria: g('pr_categoria').trim(),
    subcategoria: g('pr_subcategoria').trim(), precio_compra: g('pr_precio_compra') || 0, precio_venta: g('pr_precio_venta') || 0,
    stock_minimo: g('pr_stock_minimo') || 0, stock_maximo: g('pr_stock_maximo') || 0,
    frecuencia_dias: g('pr_frecuencia') || null, disponible_venta: g('pr_disponible'), activo: g('pr_activo'),
    stock_inicial: g('pr_stock_inicial') || 0,
  };
  if (!body.nombre) { toast('El nombre es obligatorio', 'rojo'); return; }
  if (!body.linea || !body.categoria) { toast('Línea y categoría son obligatorias', 'rojo'); return; }
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
async function cargarKardex() {
  const id = document.getElementById('pr_id').value;
  const tb = document.getElementById('tbKardex');
  tb.innerHTML = '<tr class="empty-row"><td colspan="7">Cargando...</td></tr>';
  const d = await api(`/api/productos/${id}/kardex`, { headers: authHeaders() });
  const mv = d.ok ? d.movimientos : [];
  tb.innerHTML = mv.length ? mv.map(m => `<tr>
      <td>${fmtFechaHora(m.created_at)}</td><td>${m.tipo}</td><td>${m.almacen_nombre || '—'}</td>
      <td style="font-weight:700;color:${m.cantidad < 0 ? '#e74c3c' : '#27ae60'};">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</td>
      <td>${m.saldo}</td><td>${m.motivo || ''}</td><td>${m.usuario_nombre || '—'}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">Sin movimientos</td></tr>';
}

// ── Listados de cargas / descargas ───────────────────────────
async function cargarStockDocs(tipo) {
  const d = await api(`/api/stock-documentos?tipo=${tipo}`, { headers: authHeaders() });
  const docs = d.ok ? d.documentos : [];
  const esCarga = tipo === 'carga';
  document.getElementById(esCarga ? 'tbCargas' : 'tbDescargas').innerHTML = docs.length
    ? docs.map(x => `<tr>
        <td>${x.numero}</td><td>${fmtFechaHora(x.created_at)}</td><td>${x.motivo}</td><td>${x.almacen_nombre || '—'}</td>
        <td>${x.responsable || '—'}</td>
        <td>${esCarga ? fmtMoney(x.total) : (x.registrado_por || '—')}</td>
        <td><button class="lnk" onclick="verStockDoc(${x.id})">🔍</button></td></tr>`).join('')
    : `<tr class="empty-row"><td colspan="7">Aún no hay ${esCarga ? 'cargas' : 'descargas'} de stock</td></tr>`;
}
async function verStockDoc(id) {
  document.getElementById('sdd_contenido').textContent = 'Cargando...';
  abrirModal('mStockDetalle');
  const d = await api(`/api/stock-documentos/${id}`, { headers: authHeaders() });
  if (!d.ok) { document.getElementById('sdd_contenido').textContent = d.error || 'Error'; return; }
  const x = d.documento, esCarga = x.tipo === 'carga';
  document.getElementById('sdd_contenido').innerHTML = `
    <h2>${esCarga ? 'Carga' : 'Descarga'} de stock #${x.numero}</h2>
    <div class="inv-grid" style="grid-template-columns:1fr 1fr;margin:12px 0;font-size:13.5px;line-height:1.8;">
      <div><b>Fecha de registro:</b> ${fmtFechaHora(x.created_at)}<br><b>Motivo:</b> ${x.motivo}<br><b>Operación:</b> ${x.tipo_operacion || '—'}<br><b>Almacén:</b> ${x.almacen_nombre || '—'}</div>
      <div><b>Responsable:</b> ${x.responsable || '—'}<br><b>Registrado por:</b> ${x.registrado_por || '—'}</div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Código de barras</th><th>Descripción</th><th>P. compra</th><th>P. venta</th><th>Cantidad</th><th>Total compra</th></tr></thead>
      <tbody>${x.items.map(i => `<tr><td>${i.codigo_barras || '—'}</td><td>${i.nombre}</td><td>${fmtMoney(i.precio_compra)}</td><td>${fmtMoney(i.precio_venta)}</td><td>${i.cantidad}</td><td>${fmtMoney(i.precio_compra * i.cantidad)}</td></tr>`).join('')}</tbody>
    </table></div>
    <div style="text-align:right;font-size:18px;font-weight:800;margin-top:12px;">TOTAL ${fmtMoney(x.total)}</div>`;
}

// ── Crear carga / descarga ───────────────────────────────────
let _sd = { tipo: 'carga', items: [] };
const opsCarga = ['Compra a proveedor', 'Registros de inventario', 'Devolución', 'Ajuste de inventario', 'Donación'];
const opsDescarga = ['Retiro', 'Corrección', 'Merma', 'Vencimiento', 'Uso interno'];

async function abrirStockDoc(tipo) {
  _sd = { tipo, items: [] };
  const [dp, da] = await Promise.all([api('/api/productos', { headers: authHeaders() }), api('/api/almacenes', { headers: authHeaders() })]);
  _productos = dp.ok ? dp.productos : [];
  _almacenes = da.ok ? da.almacenes : [];
  const esCarga = tipo === 'carga';
  const t = document.getElementById('sd_titulo');
  t.textContent = esCarga ? '⇤ Cargar stock' : '⇥ Descargar stock';
  t.style.color = esCarga ? '#1e90d6' : '#e74c3c';
  document.getElementById('sd_lbl_almacen').textContent = esCarga ? 'Almacén de destino' : 'Almacén desde donde se descargarán los productos';
  document.getElementById('sd_almacen').innerHTML = _almacenes.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
  document.getElementById('sd_operacion').innerHTML = (esCarga ? opsCarga : opsDescarga).map(o => `<option>${o}</option>`).join('');
  document.getElementById('sd_responsable').value = (user && (user.nombre || user.nombre_clinica)) || '';
  document.getElementById('sd_motivo').value = '';
  document.getElementById('sd_buscar').value = '';
  document.getElementById('sd_resultados').style.display = 'none';
  document.getElementById('sd_btn').textContent = esCarga ? '+ Cargar productos' : '+ Descargar productos';
  sdRender();
  abrirModal('mStockDoc');
}
function sdBuscar(q) {
  const box = document.getElementById('sd_resultados');
  q = q.trim().toLowerCase();
  if (!q) { box.style.display = 'none'; return; }
  const r = _productos.filter(p => p.activo !== 0 && `${p.nombre} ${p.codigo_barras || ''}`.toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = r.length
    ? r.map(p => `<div class="sd-res" onclick="sdAgregar(${p.id})"><span>${p.nombre}</span><span style="color:var(--ink-soft);">stock: ${p.stock}</span></div>`).join('')
    : '<div class="sd-res">Sin resultados</div>';
  box.style.display = 'block';
}
function sdAgregar(id) {
  const p = _productos.find(x => x.id === id); if (!p) return;
  const ya = _sd.items.find(i => i.producto_id === id);
  if (ya) ya.cantidad++;
  else _sd.items.push({ producto_id: p.id, nombre: p.nombre, codigo_barras: p.codigo_barras, stock: p.stock,
    precio_compra: Number(p.precio_compra), precio_venta: Number(p.precio_venta), cantidad: 1 });
  document.getElementById('sd_buscar').value = '';
  document.getElementById('sd_resultados').style.display = 'none';
  sdRender();
}
function sdCant(i, delta) { _sd.items[i].cantidad = Math.max(1, _sd.items[i].cantidad + delta); sdRender(); }
function sdSetCant(i, v) { _sd.items[i].cantidad = Math.max(1, parseInt(v) || 1); sdRender(); }
function sdSetPrecio(i, campo, v) { _sd.items[i][campo] = Number(v) || 0; sdRender(); }
function sdQuitar(i) { _sd.items.splice(i, 1); sdRender(); }
function sdRender() {
  const esCarga = _sd.tipo === 'carga';
  const inp = (i, campo, val) => `<input type="number" step="0.01" min="0" value="${val}" style="width:90px;" onchange="sdSetPrecio(${i},'${campo}',this.value)">`;
  document.getElementById('sd_items').innerHTML = _sd.items.length
    ? _sd.items.map((it, i) => `<tr>
        <td>${it.codigo_barras || '—'}</td>
        <td><strong>${it.nombre}</strong><div style="font-size:11.5px;color:var(--ink-soft);">Stock total: ${it.stock}</div></td>
        <td>${esCarga ? inp(i, 'precio_compra', it.precio_compra) : fmtMoney(it.precio_compra)}</td>
        <td>${esCarga ? inp(i, 'precio_venta', it.precio_venta) : fmtMoney(it.precio_venta)}</td>
        <td><div style="display:flex;align-items:center;gap:6px;justify-content:center;">
          <button type="button" class="btn btn-danger btn-sm" onclick="sdCant(${i},-1)">−</button>
          <input type="number" min="1" value="${it.cantidad}" style="width:60px;text-align:center;" onchange="sdSetCant(${i},this.value)">
          <button type="button" class="btn btn-primary btn-sm" onclick="sdCant(${i},1)">+</button></div></td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="sdQuitar(${i})">✕</button></td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Busca y agrega productos a la lista</td></tr>';
  const tot = _sd.items.reduce((a, i) => a + i.precio_compra * i.cantidad, 0);
  document.getElementById('sd_total').textContent = esCarga && _sd.items.length ? 'Total compra: ' + fmtMoney(tot) : '';
}
async function sdGuardar() {
  const motivo = document.getElementById('sd_motivo').value.trim();
  if (!motivo) { toast('El motivo es obligatorio', 'rojo'); return; }
  if (!_sd.items.length) { toast('Agrega al menos un producto', 'rojo'); return; }
  const d = await api('/api/stock-documentos', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({
      tipo: _sd.tipo, motivo,
      almacen_id: document.getElementById('sd_almacen').value,
      tipo_operacion: document.getElementById('sd_operacion').value,
      responsable: document.getElementById('sd_responsable').value.trim(),
      items: _sd.items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_compra: i.precio_compra, precio_venta: i.precio_venta }))
    })
  });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast(_sd.tipo === 'carga' ? 'Stock cargado' : 'Stock descargado', 'verde');
  cerrarModal('mStockDoc');
  invTab(_sd.tipo === 'carga' ? 'cargas' : 'descargas');
}

// ── Stock por almacén ────────────────────────────────────────
let _stockAlm = [];
async function cargarStockAlmacen() {
  const [d, da] = await Promise.all([api('/api/stock-almacen', { headers: authHeaders() }), api('/api/almacenes', { headers: authHeaders() })]);
  _stockAlm = d.ok ? d.filas : [];
  _almacenes = da.ok ? da.almacenes : [];
  const sel = document.getElementById('sa_almacen'), v = sel.value;
  sel.innerHTML = '<option value="">Almacén...</option>' + _almacenes.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
  sel.value = v;
  renderStockAlmacen();
}
function renderStockAlmacen() {
  const q = document.getElementById('sa_buscar').value.trim().toLowerCase();
  const alm = document.getElementById('sa_almacen').value;
  const lista = _stockAlm.filter(f => (!q || f.nombre.toLowerCase().includes(q)) && (!alm || String(f.almacen_id) === alm));
  document.getElementById('tbStockAlmacen').innerHTML = lista.length
    ? lista.map(f => `<tr><td>${f.nombre}</td><td>${fmtMoney(f.precio_compra)}</td><td>${fmtMoney(f.precio_venta)}</td><td>${f.almacen}</td><td>${f.stock}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Sin resultados</td></tr>';
}
async function crearAlmacen() {
  const nombre = (prompt('Nombre del nuevo almacén:') || '').trim();
  if (!nombre) return;
  const d = await api('/api/almacenes', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ nombre }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Almacén creado', 'verde');
  cargarStockAlmacen();
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
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="verComprobante(${v.id})">Ver</button>
            ${v.estado_pago !== 'pagado' ? `<button class="btn btn-primary btn-sm" onclick="registrarPago(${v.id})">Registrar pago</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="eliminarVenta(${v.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Aún no tienes ventas registradas</td></tr>';
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

  let alertHtml = '';
  if (d.stockBajo > 0) alertHtml += `<div class="alert-item">📦 ${d.stockBajo} producto(s) con stock bajo</div>`;
  if (d.enEspera > 0) alertHtml += `<div class="alert-item">⏳ ${d.enEspera} paciente(s) en espera</div>`;
  document.getElementById('inicioAlertas').innerHTML = alertHtml || '<p style="color:var(--ink-soft);font-size:13px;">Sin alertas por ahora.</p>';
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
  document.getElementById('fp_tab_resumen').classList.toggle('active', tab === 'resumen');
  document.getElementById('fp_tab_historia').classList.toggle('active', tab === 'historia');
  if (tab === 'resumen') renderFichaResumen(); else renderFichaHistoria();
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
// ATENCIÓN — sala de espera (flujo central)
// ══════════════════════════════════════════════════════════════
let _atenciones = [];
const prioridadLabel = { emergencia: 'Emergencia', urgente: 'Urgente', prioritario: 'Prioritario', normal: 'Normal' };
const estadoAtencionLabel = { llegada: 'Llegada', triaje: 'Triaje', espera: 'En espera', consulta: 'Consulta', diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', venta: 'Venta/Pago', seguimiento: 'Seguimiento', cerrada: 'Cerrada' };
const flujoEstados = ['llegada','triaje','espera','consulta','diagnostico','tratamiento','venta','seguimiento','cerrada'];

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
    const idx = flujoEstados.indexOf(a.estado);
    const siguiente = flujoEstados[idx + 1];
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
        ${siguiente && siguiente !== 'cerrada' ? `<button class="btn btn-primary btn-sm" onclick="avanzarAtencion(${a.id},'${siguiente}')">Avanzar → ${estadoAtencionLabel[siguiente]}</button>` : ''}
        ${siguiente === 'cerrada' ? `<button class="btn btn-primary btn-sm" onclick="avanzarAtencion(${a.id},'cerrada')">Cerrar atención</button>` : ''}
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
  toast('Atención registrada', 'verde');
  cerrarModal('mAtencion');
  cargarAtenciones();
}

// ══════════════════════════════════════════════════════════════
// PERSONAL — el propietario administra a su equipo
// ══════════════════════════════════════════════════════════════
let _personal = [];
const rolPersonalLabel = { propietario: 'Propietario', veterinario: 'Veterinario', recepcion: 'Recepción' };
async function cargarPersonal() {
  const d = await api('/api/personal', { headers: authHeaders() });
  _personal = d.ok ? d.personal : [];
  document.getElementById('tbStaff').innerHTML = _personal.length
    ? _personal.map(s => `<tr>
        <td><strong>${s.nombre || '—'}</strong></td>
        <td>${s.email}</td>
        <td><span class="badge b-primary">${rolPersonalLabel[s.rol] || s.rol}</span></td>
        <td>${s.activo ? '<span class="badge b-primary">Activa</span>' : '<span class="badge b-danger">Desactivada</span>'}</td>
        <td>${s.rol === 'propietario' ? '' : `<button class="btn btn-ghost btn-sm" onclick="abrirEditarPersonal(${s.id})">Editar</button>`}</td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Sin personal registrado</td></tr>';
}
function abrirEditarPersonal(id) {
  const s = _personal.find(x => x.id === id); if (!s) return;
  document.getElementById('st_id').value = s.id;
  document.getElementById('mStaffSub').textContent = `${rolPersonalLabel[s.rol]} — ${s.email}`;
  document.getElementById('st_nombre').value = s.nombre || '';
  document.getElementById('st_password').value = '';
  document.getElementById('st_activo').value = s.activo ? '1' : '0';
  abrirModal('mStaff');
}
async function guardarPersonal() {
  const id = document.getElementById('st_id').value;
  const body = {
    nombre: document.getElementById('st_nombre').value.trim(),
    activo: document.getElementById('st_activo').value,
    password: document.getElementById('st_password').value || undefined,
  };
  const d = await api(`/api/personal/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Personal actualizado', 'verde');
  cerrarModal('mStaff');
  cargarPersonal();
}

// ══════════════════════════════════════════════════════════════
// CAJA
// ══════════════════════════════════════════════════════════════
async function cargarCaja() {
  const desde = document.getElementById('cj_desde').value;
  const hasta = document.getElementById('cj_hasta').value;
  const qs = desde && hasta ? `?desde=${desde}&hasta=${hasta}` : '';
  const d = await api('/api/caja' + qs, { headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  if (!desde) document.getElementById('cj_desde').value = d.desde;
  if (!hasta) document.getElementById('cj_hasta').value = d.hasta;
  document.getElementById('cj-total').textContent = fmtMoney(d.total);
  document.getElementById('cj-cantidad').textContent = d.cantidad;
  document.getElementById('cj-pendiente').textContent = fmtMoney(d.pendiente?.total || 0);
  document.getElementById('tbCajaMetodo').innerHTML = d.porMetodo.length
    ? d.porMetodo.map(m => `<tr><td>${m.metodo}</td><td>${m.cantidad}</td><td>${fmtMoney(m.total)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Sin movimientos en este rango</td></tr>';
  document.getElementById('tbCajaDia').innerHTML = (d.porDia || []).length
    ? d.porDia.map(x => `<tr><td>${fmtFecha(x.dia)}</td><td>${x.cantidad}</td><td>${fmtMoney(x.total)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Sin datos</td></tr>';
}

// ══════════════════════════════════════════════════════════════
// REPORTES
// ══════════════════════════════════════════════════════════════
async function cargarReportes() {
  const desde = document.getElementById('rp_desde').value;
  const hasta = document.getElementById('rp_hasta').value;
  const qs = desde && hasta ? `?desde=${desde}&hasta=${hasta}` : '';
  const d = await api('/api/reportes' + qs, { headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  if (!desde) document.getElementById('rp_desde').value = d.desde;
  if (!hasta) document.getElementById('rp_hasta').value = d.hasta;
  document.getElementById('rp-consultas').textContent = d.consultas ?? '—';
  document.getElementById('tbRepCitas').innerHTML = d.citasPorEstado.length
    ? d.citasPorEstado.map(c => `<tr><td>${c.estado}</td><td>${c.total}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="2">Sin datos</td></tr>';
  document.getElementById('tbRepVet').innerHTML = (d.porVeterinario || []).length
    ? d.porVeterinario.map(v => `<tr><td>${v.veterinario}</td><td>${v.total}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="2">Sin datos</td></tr>';
  document.getElementById('tbRepProductos').innerHTML = (d.topProductos || []).length
    ? d.topProductos.map(p => `<tr><td>${p.nombre}</td><td>${p.cantidad}</td><td>${fmtMoney(p.total)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Sin datos</td></tr>';
}

// ══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════
async function cargarConfiguracion() {
  const d = await api('/api/configuracion', { headers: authHeaders() });
  if (!d.ok) return;
  document.getElementById('cf_nombre').value = d.configuracion.nombre_clinica || '';
  document.getElementById('cf_plan').value = d.configuracion.plan_nombre || 'Sin plan';
  document.getElementById('cf_pass_actual').value = '';
  document.getElementById('cf_pass_nueva').value = '';
}
async function guardarConfiguracion() {
  const nombre_clinica = document.getElementById('cf_nombre').value.trim();
  if (!nombre_clinica) { toast('El nombre de la clínica es obligatorio', 'rojo'); return; }
  const d = await api('/api/configuracion', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ nombre_clinica }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Clínica actualizada', 'verde');
  document.getElementById('clinicaTag').textContent = user.plan_nombre || nombre_clinica;
}
async function cambiarPassword() {
  const actual = document.getElementById('cf_pass_actual').value;
  const nueva = document.getElementById('cf_pass_nueva').value;
  if (!actual || !nueva) { toast('Completa ambos campos', 'rojo'); return; }
  const d = await api('/api/auth/password', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ actual, nueva }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Contraseña actualizada', 'verde');
  document.getElementById('cf_pass_actual').value = '';
  document.getElementById('cf_pass_nueva').value = '';
}
async function descargarRespaldo() {
  try {
    const res = await fetch(API + '/api/respaldo', { headers: authHeaders() });
    const data = await res.json();
    if (!data.ok) { toast(data.error || 'Error generando el respaldo', 'rojo'); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `respaldo-vetcore-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast('Error de red generando el respaldo', 'rojo');
  }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
cargarResumen();