const user = requireRole('veterinario');
document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

if (user) {
  document.getElementById('userName').textContent = user.nombre || 'Veterinario';
  document.getElementById('avatarLetter').textContent = iniciales(user.nombre || 'V');
}

// ══════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════════════════
const titles = { inicio: 'Dashboard', atencion: 'Atenciones', pacientes: 'Pacientes', historia: 'Historia clínica', agenda: 'Agenda del día', ventas: 'Ventas / Recetas', inventario: 'Inventario', reportes: 'Reportes' };
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
  if (sec === 'pacientes') cargarPacientes();
  if (sec === 'historia') cargarSelectPacientesHistoria();
  if (sec === 'agenda') cargarCitas();
  if (sec === 'ventas') cargarVentas();
  if (sec === 'inventario') cargarProductos();
  if (sec === 'reportes') cargarReportes();
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD (inicio)
// ══════════════════════════════════════════════════════════════
async function cargarInicio() {
  const [citasD, atD] = await Promise.all([
    api('/api/citas?hoy=1', { headers: authHeaders() }),
    api('/api/atenciones', { headers: authHeaders() }),
  ]);
  const citasHoy = citasD.ok ? citasD.citas : [];
  const atenciones = atD.ok ? atD.atenciones : [];

  document.getElementById('st-citasHoy').textContent = citasHoy.length;
  document.getElementById('st-pacientesAsignados').textContent = atenciones.length;
  document.getElementById('st-alertas').textContent = atenciones.filter(a => ['urgente','emergencia'].includes(a.prioridad)).length;

  document.getElementById('inicioAgendaDia').innerHTML = citasHoy.length
    ? citasHoy.map(c => `
      <div class="inicio-list-item">
        <span class="inicio-hora">${c.hora ? c.hora.slice(0,5) : '—'}</span>
        <span style="flex:1;">${c.paciente_nombre || '—'} — ${c.motivo || 'Consulta'}</span>
        <span class="badge ${AG_BADGE[c.estado] || 'b-grey'}">${AG_LABEL[c.estado] || c.estado}</span>
      </div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:13px;">No tienes citas asignadas hoy.</p>';

  const recientesD = await api('/api/atenciones?recientes=1', { headers: authHeaders() });
  const recientes = recientesD.ok ? recientesD.atenciones : [];
  document.getElementById('inicioAtencionesRecientes').innerHTML = recientes.length
    ? recientes.map(a => `
      <div class="inicio-list-item">
        <span style="flex:1;">${a.paciente_nombre} — ${a.cliente_nombre}</span>
        <span class="badge b-grey">${estadoAtencionLabel[a.estado] || a.estado}</span>
      </div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:13px;">Sin atenciones recientes.</p>';
}

// ══════════════════════════════════════════════════════════════
// PACIENTES (crea y edita; borrar no)
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
        <td><button class="btn btn-ghost btn-sm" onclick="abrirFichaPaciente(${p.id})">Ver ficha</button></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">No hay pacientes registrados</td></tr>';
}
async function asegurarPacientesCargados() {
  if (!_pacientes.length) {
    const d = await api('/api/pacientes', { headers: authHeaders() });
    _pacientes = d.ok ? d.pacientes : [];
  }
}

// ══════════════════════════════════════════════════════════════
// CLIENTES (solo para poblar selects — no hay sección propia)
// ══════════════════════════════════════════════════════════════
let _clientes = [];
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
async function poblarPacientesDeCliente(selectId, clienteId) {
  await Promise.all([asegurarClientesCargados(), asegurarPacientesCargados()]);
  const sel = document.getElementById(selectId);
  const lista = clienteId ? _pacientes.filter(p => String(p.cliente_id) === String(clienteId)) : [];
  sel.innerHTML = '<option value="">— Sin mascota —</option>' +
    lista.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}
// ══════════════════════════════════════════════════════════════
// AGENDA: calendario + lista + modal + flujo de estados + WhatsApp
// ══════════════════════════════════════════════════════════════
const AG_BADGE = { pendiente: 'b-grey', confirmada: 'b-primary', en_espera: 'b-accent', atendiendo: 'b-accent', atendida: 'b-primary', cancelada: 'b-danger', no_asistio: 'b-danger' };
const AG_LABEL = { pendiente: 'Pendiente', confirmada: 'Confirmada', en_espera: 'En espera', atendiendo: 'En proceso', atendida: 'Finalizado', cancelada: 'Cancelada', no_asistio: 'No asistió' };
let _citasAg = [];
let _agMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let _agDiaAbierto = null;
let _citaEnConsulta = null; // cita que se está atendiendo desde Historia clínica

const pad2 = n => String(n).padStart(2, '0');
const keyFecha = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fechaCita = c => String(c.fecha).slice(0, 10);
const capitalizar = s => s.charAt(0).toUpperCase() + s.slice(1);
const horaCita = c => c.hora ? c.hora.slice(0, 5) : '—';
const badgeEstado = c => `<span class="badge ${AG_BADGE[c.estado] || 'b-grey'}">${AG_LABEL[c.estado] || c.estado || ''}</span>`;

async function cargarCitas() {
  const d = await api('/api/citas', { headers: authHeaders() });
  _citasAg = d.ok ? d.citas : [];
  agRenderCal();
  agRenderLista();
}

function agVista(v) {
  document.getElementById('ag_cal_wrap').style.display = v === 'cal' ? '' : 'none';
  document.getElementById('ag_lista_wrap').style.display = v === 'lista' ? '' : 'none';
  document.getElementById('ag_btn_cal').className = 'btn btn-sm ' + (v === 'cal' ? 'btn-primary' : 'btn-ghost');
  document.getElementById('ag_btn_lista').className = 'btn btn-sm ' + (v === 'lista' ? 'btn-primary' : 'btn-ghost');
}
function agMes(delta) { _agMes = new Date(_agMes.getFullYear(), _agMes.getMonth() + delta, 1); agRenderCal(); }
function agHoy() {
  const h = new Date();
  _agMes = new Date(h.getFullYear(), h.getMonth(), 1);
  agRenderCal();
}

function agRenderCal() {
  const y = _agMes.getFullYear(), m = _agMes.getMonth();
  document.getElementById('cal_titulo').textContent =
    capitalizar(_agMes.toLocaleDateString('es', { month: 'long', year: 'numeric' }));

  const porDia = {};
  _citasAg.forEach(c => { (porDia[fechaCita(c)] = porDia[fechaCita(c)] || []).push(c); });
  Object.values(porDia).forEach(l => l.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')));

  const hoy = keyFecha(new Date());
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // la semana empieza en lunes
  const diasMes = new Date(y, m + 1, 0).getDate();

  let html = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) html += '<div class="cal-cell vacio"></div>';
  for (let d = 1; d <= diasMes; d++) {
    const k = `${y}-${pad2(m + 1)}-${pad2(d)}`;
    const citas = porDia[k] || [];
    html += `<div class="cal-cell ${k === hoy ? 'hoy' : ''}" onclick="agAbrirDia('${k}')">
      <div class="cal-num">${d}</div>
      ${citas.slice(0, 2).map(c => `<div class="cal-chip ${c.estado}">${c.hora ? c.hora.slice(0, 5) : ''} ${c.paciente_nombre || ''}</div>`).join('')}
      ${citas.length > 2 ? `<div class="cal-mas">+${citas.length - 2} más</div>` : ''}
    </div>`;
  }
  document.getElementById('cal_grid').innerHTML = html;
}

function agRenderLista() {
  document.getElementById('tbCitas').innerHTML = _citasAg.length
    ? _citasAg.map(c => `<tr>
        <td>${fmtFecha(c.fecha)}</td>
        <td>${horaCita(c)}</td>
        <td>${c.cliente_nombre || '—'}</td>
        <td>${c.paciente_nombre || '—'}</td>
        <td>${c.motivo || '—'}</td>
        <td>${badgeEstado(c)}</td>
        <td><div class="ag-acciones">${agBotones(c, false)}</div></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">No tienes citas asignadas</td></tr>';
}

// ── Botones según el estado de la cita ──────────────────────
function agBotones(c, enModal) {
  const e = c.estado;
  if (['cancelada', 'no_asistio'].includes(e)) return '';
  let h = '';
  if (['pendiente', 'confirmada', 'en_espera'].includes(e)) {
    h += btnWhatsApp(c);
    h += `<button class="btn btn-primary btn-sm" onclick="agCambiarEstado(${c.id},'atendiendo',${enModal})">▶ Iniciar</button>`;
  }
  if (e === 'atendiendo') {
    h += `<button class="btn btn-primary btn-sm" onclick="agCambiarEstado(${c.id},'atendida',${enModal})">✔ Finalizar</button>`;
  }
  if (c.paciente_id) {
    h += `<button class="btn btn-ghost btn-sm" onclick="agIrHistoria(${c.id})">📋 Historia clínica</button>`;
  }
  return h;
}

async function agCambiarEstado(id, estado, enModal, silencioso) {
  if (estado === 'atendida' && !silencioso && !confirm('¿Marcar esta cita como finalizada?')) return false;
  const d = await api(`/api/citas/${id}/estado`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ estado }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return false; }
  if (!silencioso) toast(estado === 'atendiendo' ? 'Cita en proceso' : 'Cita finalizada', 'verde');
  await cargarCitas();
  if (enModal && _agDiaAbierto) agAbrirDia(_agDiaAbierto);
  return true;
}

// Va a Historia clínica de la mascota de la cita
async function agIrHistoria(id) {
  const c = _citasAg.find(x => x.id === id);
  if (!c || !c.paciente_id) { toast('Esta cita no tiene mascota asignada', 'rojo'); return; }
  cerrarModal('mCita');
  ir('historia');
  await cargarSelectPacientesHistoria();
  document.getElementById('hc_paciente_select').value = c.paciente_id;
  await cargarHistoriaPaciente();
  if (c.estado === 'atendiendo') {
    _citaEnConsulta = c.id;       // al guardar la consulta, la cita pasa a Finalizado
    await abrirNuevaConsulta();
    document.getElementById('hc_motivo').value = c.motivo || '';
  } else {
    _citaEnConsulta = null;
  }
}

// ── Modal con la información del día ────────────────────────
function agFila(label, valor) {
  return valor
    ? `<div style="display:flex;gap:8px;font-size:13px;padding:3px 0;"><span style="width:92px;color:var(--ink-soft);font-weight:700;">${label}</span><span style="flex:1;">${valor}</span></div>`
    : '';
}

function agCardCita(c) {
  return `<div style="border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong style="font-size:16px;">${horaCita(c)}</strong>
      ${badgeEstado(c)}
    </div>
    ${agFila('Mascota', c.paciente_nombre)}
    ${agFila('Cliente', c.cliente_nombre)}
    ${agFila('Teléfono', c.cliente_telefono)}
    ${agFila('Veterinario', c.veterinario_nombre)}
    ${agFila('Motivo', c.motivo)}
    ${agFila('Notas', c.notas)}
    <div class="ag-acciones" style="margin-top:10px;">
      ${agBotones(c, true)}
      ${c.paciente_id ? `<button class="btn btn-ghost btn-sm" onclick="cerrarModal('mCita');abrirFichaPaciente(${c.paciente_id})">Ver ficha</button>` : ''}
    </div>
  </div>`;
}

function agAbrirDia(k) {
  _agDiaAbierto = k;
  const citas = _citasAg.filter(c => fechaCita(c) === k)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  document.getElementById('mCitaTitulo').textContent =
    capitalizar(new Date(k + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  document.getElementById('mCitaSub').textContent =
    citas.length ? (citas.length === 1 ? '1 cita' : citas.length + ' citas') : '';
  document.getElementById('mCitaCont').innerHTML = citas.length
    ? citas.map(agCardCita).join('')
    : '<p style="color:var(--ink-soft);font-size:13.5px;">No hay citas este día.</p>';
  abrirModal('mCita');
}

// ── WhatsApp ────────────────────────────────────────────────
const WA_PREFIJO_PAIS = '593'; // Ecuador; cámbialo si tu clínica está en otro país

function waNumero(t) {
  let n = String(t || '').replace(/\D/g, '');
  if (!n) return '';
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = WA_PREFIJO_PAIS + n.slice(1);
  else if (n.length <= 10) n = WA_PREFIJO_PAIS + n;
  return n;
}

function btnWhatsApp(c) {
  if (['cancelada', 'atendida', 'atendiendo'].includes(c.estado)) return '';
  return `<button class="btn-wa" onclick="enviarRecordatorio(${c.id})">WhatsApp</button>`;
}

function enviarRecordatorio(id) {
  const c = _citasAg.find(x => x.id === id);
  if (!c) return;
  const num = waNumero(c.cliente_telefono);
  if (!num) { toast('Este cliente no tiene teléfono registrado', 'rojo'); return; }
  const fecha = new Date(fechaCita(c) + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const hora = c.hora ? ' a las ' + c.hora.slice(0, 5) : '';
  const clinica = (user && user.nombre_clinica) || 'la clínica';
  const msg = `Hola ${c.cliente_nombre || ''} 👋, le recordamos la cita de ${c.paciente_nombre || 'su mascota'} en ${clinica} el ${fecha}${hora}.` +
    (c.motivo ? ` Motivo: ${c.motivo}.` : '') +
    ` Si no puede asistir, por favor avísenos. ¡Gracias! 🐾`;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
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


// ── NUEVA CONSULTA (inventario + agenda + seguimiento) ───────
let _hcItems = [];

function hcEdad(f) {
  if (!f) return '—';
  const n = new Date(f), h = new Date();
  const m = (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth();
  return m < 12 ? m + ' meses' : Math.floor(m / 12) + ' años';
}

async function abrirNuevaConsulta() {
  if (!_pacienteHistoriaActivo) return;
  await asegurarPacientesCargados();
  const dp = await api('/api/productos', { headers: authHeaders() });
  _productos = dp.ok ? dp.productos : [];
  _hcItems = [];

  const p = _pacientes.find(x => String(x.id) === String(_pacienteHistoriaActivo)) || {};
  document.getElementById('hc_paciente_info').innerHTML = `
    <div><b>Nombre:</b> ${p.nombre || '—'}</div>
    <div><b>Propietario:</b> ${p.cliente_nombre || '—'}</div>
    <div><b>Especie / Raza:</b> ${p.especie || '—'} · ${p.raza || '—'}</div>
    <div><b>Edad:</b> ${hcEdad(p.fecha_nacimiento)} · <b>Peso:</b> ${p.peso ? p.peso + ' kg' : '—'}</div>
    ${p.alergias ? `<div style="grid-column:1/-1;color:#c0392b;"><b>⚠ Alergias:</b> ${p.alergias}</div>` : ''}`;

  document.getElementById('hc_med_select').innerHTML =
    '<option value="">— Producto del inventario —</option>' +
    _productos.map(x => `<option value="${x.id}" ${x.stock <= 0 ? 'disabled' : ''}>${x.nombre} (stock: ${x.stock}) — ${fmtMoney(x.precio_venta)}</option>`).join('');

  ['hc_proximo', 'hc_hora', 'hc_motivo', 'hc_anamnesis', 'hc_peso', 'hc_temp', 'hc_fc', 'hc_fr',
   'hc_diagnostico', 'hc_tratamiento', 'hc_recomendaciones', 'hc_med_dosis', 'hc_libre_nombre', 'hc_libre_precio']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('hc_fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('hc_peso').value = p.peso || '';
  document.getElementById('hc_med_cant').value = 1;
  document.getElementById('mConsultaSub').textContent = 'Registro de historia clínica';
  hcRenderItems();
  hcCargarSeguimiento(_pacienteHistoriaActivo);
  abrirModal('mConsulta');
}

function hcAgregarProducto() {
  const id = document.getElementById('hc_med_select').value;
  const prod = _productos.find(x => String(x.id) === String(id));
  if (!prod) { toast('Elige un producto del inventario', 'rojo'); return; }
  const cant = Math.max(1, Number(document.getElementById('hc_med_cant').value) || 1);
  if (cant > prod.stock) { toast('Stock insuficiente (' + prod.stock + ')', 'rojo'); return; }
  _hcItems.push({
    producto_id: prod.id, nombre: prod.nombre, precio: Number(prod.precio_venta), cantidad: cant,
    indicacion: document.getElementById('hc_med_dosis').value.trim()
  });
  document.getElementById('hc_med_select').value = '';
  document.getElementById('hc_med_dosis').value = '';
  document.getElementById('hc_med_cant').value = 1;
  hcRenderItems();
}

function hcAgregarLibre() {
  const nombre = document.getElementById('hc_libre_nombre').value.trim();
  if (!nombre) { toast('Escribe el servicio', 'rojo'); return; }
  _hcItems.push({ nombre, precio: Number(document.getElementById('hc_libre_precio').value) || 0, cantidad: 1, indicacion: '' });
  document.getElementById('hc_libre_nombre').value = '';
  document.getElementById('hc_libre_precio').value = '';
  hcRenderItems();
}

function hcQuitarItem(i) { _hcItems.splice(i, 1); hcRenderItems(); }

function hcRenderItems() {
  document.getElementById('hc_med_lista').innerHTML = _hcItems.length
    ? _hcItems.map((it, i) => `
      <div class="hc-item">
        <div><b>${it.nombre}</b> × ${it.cantidad}${it.indicacion ? `<small>${it.indicacion}</small>` : ''}</div>
        <div>${fmtMoney(it.precio * it.cantidad)}
          <button type="button" class="btn btn-danger btn-sm" onclick="hcQuitarItem(${i})">✕</button></div>
      </div>`).join('')
    : '<p style="font-size:13px;color:var(--ink-soft);">Sin medicamentos ni servicios agregados.</p>';
}

async function hcCargarSeguimiento(pacienteId) {
  const box = document.getElementById('hc_seguimiento');
  box.textContent = 'Cargando...';
  const [h, c] = await Promise.all([
    api(`/api/historias/${pacienteId}`, { headers: authHeaders() }),
    api('/api/citas?pendientes=1', { headers: authHeaders() })
  ]);
  const citas = (c.ok ? c.citas : []).filter(x => String(x.paciente_id) === String(pacienteId));
  const ult = (h.ok ? h.historias : []).slice(0, 3);
  box.innerHTML =
    '<b>Citas pendientes</b>' +
    (citas.length
      ? citas.map(x => `<div class="hc-seg-row"><span>${fmtFecha(x.fecha)} ${x.hora ? x.hora.slice(0, 5) : ''}</span><span>${x.motivo || ''} · ${x.estado}</span></div>`).join('')
      : '<div class="hc-seg-row">Sin citas pendientes</div>') +
    '<div style="margin-top:10px;"><b>Últimas consultas</b></div>' +
    (ult.length
      ? ult.map(x => `<div class="hc-seg-row"><span>${fmtFecha(x.fecha)}</span><span>${x.motivo || x.diagnostico || '—'}</span></div>`).join('')
      : '<div class="hc-seg-row">Primera consulta</div>');
}

async function guardarConsulta() {
  const v = id => document.getElementById(id).value;
  const p = _pacientes.find(x => String(x.id) === String(_pacienteHistoriaActivo));
  if (!p) { toast('Selecciona un paciente', 'rojo'); return; }
  if (!v('hc_fecha')) { toast('La fecha es obligatoria', 'rojo'); return; }

  const medicamentos = _hcItems
    .map(i => `${i.nombre} x${i.cantidad}${i.indicacion ? ' — ' + i.indicacion : ''}`).join('\n');

  const d = await api('/api/historias', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({
      paciente_id: p.id, fecha: v('hc_fecha'), proximo_control: v('hc_proximo') || null,
      motivo: v('hc_motivo').trim(), anamnesis: v('hc_anamnesis').trim(),
      peso: v('hc_peso') || null, temperatura: v('hc_temp') || null,
      fc: v('hc_fc').trim(), fr: v('hc_fr').trim(),
      diagnostico: v('hc_diagnostico').trim(), tratamiento: v('hc_tratamiento').trim(),
      medicamentos, recomendaciones: v('hc_recomendaciones').trim()
    })
  });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }

  // Venta pendiente + descuento de stock
  if (_hcItems.length && document.getElementById('hc_venta').checked) {
    const dv = await api('/api/ventas', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        cliente_id: p.cliente_id, paciente_id: p.id, estado_pago: 'pendiente', metodo_pago: 'efectivo', descuento: 0,
        items: _hcItems.map(i => ({ producto_id: i.producto_id || null, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad }))
      })
    });
    if (!dv.ok) toast('Consulta guardada, pero la venta falló: ' + (dv.error || ''), 'rojo');
  }

  // Cita en agenda
  if (v('hc_proximo') && document.getElementById('hc_agendar').checked) {
    const dc = await api('/api/citas', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        cliente_id: p.cliente_id, paciente_id: p.id, fecha: v('hc_proximo'),
        hora: v('hc_hora') || null, motivo: 'Control: ' + (v('hc_motivo').trim() || 'seguimiento')
      })
    });
    if (!dc.ok) toast('Consulta guardada, pero la cita falló: ' + (dc.error || ''), 'rojo');
  }

  toast('Consulta registrada', 'verde');
  if (_citaEnConsulta) {
    const cita = _citasAg.find(x => x.id === _citaEnConsulta);
    if (cita && String(cita.paciente_id) === String(p.id)) {
      await agCambiarEstado(cita.id, 'atendida', false, true);
      toast('Consulta registrada y cita finalizada', 'verde');
    }
    _citaEnConsulta = null;
  }
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
let _stockAlm = [];

function invTab(tab) {
  document.querySelectorAll('.inv-tab').forEach(b => b.classList.toggle('active', b.dataset.inv === tab));
  document.querySelectorAll('.inv-view').forEach(v => v.classList.toggle('active', v.id === 'inv-' + tab));
  if (tab === 'catalogo') cargarProductos();
  if (tab === 'descargas') cargarDocsStock('descarga');
  if (tab === 'cargas') cargarDocsStock('carga');
  if (tab === 'almacen') cargarStockAlmacen();
}

function llenarFiltro(selectId, campo, etiqueta) {
  const sel = document.getElementById(selectId);
  const actual = sel.value;
  const valores = [...new Set(_productos.map(p => p[campo]).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">${etiqueta}</option>` + valores.map(v => `<option value="${v}">${v}</option>`).join('');
  sel.value = actual;
}
function llenarDatalist(id, campo) {
  const valores = [...new Set(_productos.map(p => p[campo]).filter(Boolean))].sort();
  document.getElementById(id).innerHTML = valores.map(v => `<option value="${v}">`).join('');
}

async function cargarProductos() {
  const d = await api('/api/productos', { headers: authHeaders() });
  _productos = d.ok ? d.productos : [];
  llenarFiltro('inv_f_proveedor', 'proveedor', 'Proveedor...');
  llenarFiltro('inv_f_linea', 'linea', 'Línea...');
  llenarFiltro('inv_f_categoria', 'categoria', 'Categorías...');
  llenarDatalist('dl_proveedor', 'proveedor');
  llenarDatalist('dl_linea', 'linea');
  llenarDatalist('dl_categoria', 'categoria');
  renderProductos();
}

function limpiarFiltrosInv() {
  ['inv_buscar', 'inv_f_proveedor', 'inv_f_linea', 'inv_f_stock', 'inv_f_categoria']
    .forEach(id => document.getElementById(id).value = '');
  renderProductos();
}

function estadoStock(p) {
  if (p.stock <= 0) return 'agotado';
  if (p.stock <= p.stock_minimo) return 'bajo';
  return 'ok';
}

function renderProductos() {
  const q = document.getElementById('inv_buscar').value.trim().toLowerCase();
  const fp = document.getElementById('inv_f_proveedor').value;
  const fl = document.getElementById('inv_f_linea').value;
  const fs = document.getElementById('inv_f_stock').value;
  const fc = document.getElementById('inv_f_categoria').value;

  const lista = _productos.filter(p =>
    (!q || (p.nombre || '').toLowerCase().includes(q) || (p.codigo_barras || '').includes(q) || (p.marca || '').toLowerCase().includes(q)) &&
    (!fp || p.proveedor === fp) && (!fl || p.linea === fl) &&
    (!fc || p.categoria === fc) && (!fs || estadoStock(p) === fs));

  document.getElementById('tbProductos').innerHTML = lista.length
    ? lista.map(p => {
        const es = estadoStock(p);
        const badge = es === 'agotado' ? 'b-danger' : es === 'bajo' ? 'b-accent' : 'b-primary';
        const txt = es === 'agotado' ? 'Agotado' : es === 'bajo' ? 'Stock bajo' : 'Disponible';
        return `<tr>
          <td>${p.id}</td>
          <td>${p.codigo_barras || '—'}</td>
          <td><strong>${p.nombre}</strong></td>
          <td>${p.marca || '—'}</td>
          <td>${p.proveedor || '—'}</td>
          <td>${p.linea || '—'}</td>
          <td>${fmtMoney(p.precio_venta)}</td>
          <td>${p.stock}</td>
          <td><span class="badge ${badge}">${txt}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn btn-ghost btn-sm" onclick="editarProducto(${p.id})">Editar</button>
            <button class="btn btn-ghost btn-sm" onclick="editarProducto(${p.id},'kardex')">Kardex</button>
          </td>
        </tr>`;
      }).join('')
    : '<tr class="empty-row"><td colspan="10">Sin productos en el inventario</td></tr>';
}

// ── Crear / editar producto ──────────────────────────────────
const PR_CAMPOS = {
  pr_nombre: 'nombre', pr_marca: 'marca', pr_barras: 'codigo_barras', pr_presentacion: 'presentacion',
  pr_contenido: 'contenido', pr_unidad: 'unidad_medida', pr_proveedor: 'proveedor', pr_linea: 'linea',
  pr_categoria: 'categoria', pr_subcategoria: 'subcategoria', pr_precio_compra: 'precio_compra',
  pr_precio_venta: 'precio_venta', pr_stock_minimo: 'stock_minimo', pr_stock_maximo: 'stock_maximo',
  pr_frecuencia: 'frecuencia_dias'
};

function prTab(tab) {
  document.getElementById('pr_tab_editar').classList.toggle('active', tab === 'editar');
  document.getElementById('pr_tab_kardex').classList.toggle('active', tab === 'kardex');
  document.getElementById('pr_panel_editar').style.display = tab === 'editar' ? '' : 'none';
  document.getElementById('pr_panel_kardex').style.display = tab === 'kardex' ? '' : 'none';
  if (tab === 'kardex') cargarKardex();
}

function abrirCrearProducto() {
  document.getElementById('mProductoTitulo').textContent = 'Nuevo producto';
  document.getElementById('pr_id').value = '';
  Object.keys(PR_CAMPOS).forEach(id => document.getElementById(id).value = '');
  document.getElementById('pr_unidad').value = 'UND';
  document.getElementById('pr_codigo_sis').value = 'Automático';
  document.getElementById('pr_stock_inicial').value = 0;
  document.getElementById('pr_disponible').value = '1';
  document.getElementById('pr_activo').value = '1';
  document.getElementById('pr_grp_actual').style.display = 'none';
  document.getElementById('pr_grp_inicial').style.display = '';
  document.getElementById('pr_tab_kardex').style.display = 'none';
  prTab('editar');
  abrirModal('mProducto');
}

function editarProducto(id, tab) {
  const p = _productos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('mProductoTitulo').textContent = 'Editar producto';
  document.getElementById('pr_id').value = p.id;
  Object.entries(PR_CAMPOS).forEach(([el, campo]) => document.getElementById(el).value = p[campo] ?? '');
  document.getElementById('pr_unidad').value = p.unidad_medida || 'UND';
  document.getElementById('pr_codigo_sis').value = p.id;
  document.getElementById('pr_stock_actual').value = p.stock;
  document.getElementById('pr_disponible').value = p.disponible_venta === 0 ? '0' : '1';
  document.getElementById('pr_activo').value = p.activo === 0 ? '0' : '1';
  document.getElementById('pr_grp_actual').style.display = '';
  document.getElementById('pr_grp_inicial').style.display = 'none';
  document.getElementById('pr_tab_kardex').style.display = '';
  prTab(tab || 'editar');
  abrirModal('mProducto');
}

async function guardarProducto() {
  const v = id => document.getElementById(id).value.trim();
  const id = v('pr_id');
  if (!v('pr_nombre')) { toast('El nombre es obligatorio', 'rojo'); return; }
  if (!v('pr_linea')) { toast('La línea es obligatoria', 'rojo'); return; }
  if (!v('pr_categoria')) { toast('La categoría es obligatoria', 'rojo'); return; }
  if (v('pr_stock_minimo') === '' || v('pr_stock_maximo') === '') { toast('Stock mínimo y máximo son obligatorios', 'rojo'); return; }

  const body = {};
  Object.entries(PR_CAMPOS).forEach(([el, campo]) => body[campo] = v(el));
  body.disponible_venta = v('pr_disponible');
  body.activo = v('pr_activo');
  if (!id) body.stock_inicial = v('pr_stock_inicial') || 0;

  const d = await api(id ? `/api/productos/${id}` : '/api/productos', {
    method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body)
  });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast(id ? 'Producto actualizado' : 'Producto creado', 'verde');
  cerrarModal('mProducto');
  cargarProductos();
}

async function cargarKardex() {
  const id = document.getElementById('pr_id').value;
  const tb = document.getElementById('tbKardex');
  if (!id) { tb.innerHTML = ''; return; }
  tb.innerHTML = '<tr class="empty-row"><td colspan="7">Cargando...</td></tr>';
  const d = await api(`/api/productos/${id}/kardex`, { headers: authHeaders() });
  const mov = d.ok ? d.movimientos : [];
  tb.innerHTML = mov.length
    ? mov.map(m => `<tr>
        <td>${fmtFecha(m.created_at)}</td>
        <td>${m.tipo}</td>
        <td>${m.almacen_nombre || '—'}</td>
        <td style="color:${m.cantidad < 0 ? '#e74c3c' : '#1e90d6'};font-weight:700;">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</td>
        <td>${m.saldo}</td>
        <td>${m.motivo || '—'}</td>
        <td>${m.usuario_nombre || '—'}</td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">Sin movimientos</td></tr>';
}

// ── Cargas / descargas de stock ──────────────────────────────
let _sdTipo = 'carga';
let _sdItems = [];
let _almacenes = [];

const OPERACIONES = {
  carga: ['Compra a proveedor', 'Corrección de inventario', 'Devolución de cliente', 'Donación / muestra'],
  descarga: ['Consumo interno', 'Merma / vencimiento', 'Corrección de inventario', 'Devolución a proveedor']
};

async function cargarDocsStock(tipo) {
  const tb = document.getElementById(tipo === 'carga' ? 'tbCargas' : 'tbDescargas');
  tb.innerHTML = '<tr class="empty-row"><td colspan="7">Cargando...</td></tr>';
  const d = await api('/api/stock-documentos?tipo=' + tipo, { headers: authHeaders() });
  const docs = d.ok ? d.documentos : [];
  tb.innerHTML = docs.length
    ? docs.map(x => `<tr>
        <td>${x.numero}</td>
        <td>${fmtFecha(x.created_at)}</td>
        <td>${x.motivo || '—'}</td>
        <td>${x.almacen_nombre || '—'}</td>
        <td>${x.responsable || '—'}</td>
        <td>${tipo === 'carga' ? fmtMoney(x.total) : (x.registrado_por || '—')}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="verStockDoc(${x.id})">Ver</button></td>
      </tr>`).join('')
    : `<tr class="empty-row"><td colspan="7">Sin ${tipo === 'carga' ? 'cargas' : 'descargas'} registradas</td></tr>`;
}

async function verStockDoc(id) {
  const box = document.getElementById('sdd_contenido');
  box.innerHTML = 'Cargando...';
  abrirModal('mStockDetalle');
  const d = await api('/api/stock-documentos/' + id, { headers: authHeaders() });
  if (!d.ok) { box.innerHTML = '<p>' + (d.error || 'Error') + '</p>'; return; }
  const x = d.documento;
  box.innerHTML = `
    <h2>${x.tipo === 'carga' ? 'Carga' : 'Descarga'} #${x.numero}</h2>
    <p class="modal-sub">${fmtFecha(x.created_at)} — ${x.almacen_nombre || ''} — ${x.motivo || ''}</p>
    <p style="font-size:13px;color:var(--ink-soft);">Operación: ${x.tipo_operacion || '—'} · Responsable: ${x.responsable || '—'} · Registrado por: ${x.registrado_por || '—'}</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Cód. barras</th><th>Concepto</th><th>P. compra</th><th>P. venta</th><th>Cant.</th></tr></thead>
      <tbody>${x.items.map(i => `<tr>
        <td>${i.codigo_barras || '—'}</td><td>${i.nombre}</td>
        <td>${fmtMoney(i.precio_compra)}</td><td>${fmtMoney(i.precio_venta)}</td><td>${i.cantidad}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${x.tipo === 'carga' ? `<div style="text-align:right;font-weight:800;margin-top:10px;">Total compra: ${fmtMoney(x.total)}</div>` : ''}`;
}

async function abrirStockDoc(tipo) {
  _sdTipo = tipo;
  _sdItems = [];
  const [da, dp] = await Promise.all([
    api('/api/almacenes', { headers: authHeaders() }),
    api('/api/productos', { headers: authHeaders() })
  ]);
  _almacenes = da.ok ? da.almacenes : [];
  _productos = dp.ok ? dp.productos : _productos;

  document.getElementById('sd_titulo').textContent = tipo === 'carga' ? 'Cargar stock' : 'Descargar stock';
  document.getElementById('sd_lbl_almacen').textContent = tipo === 'carga' ? 'Almacén destino' : 'Almacén de origen';
  document.getElementById('sd_btn').textContent = tipo === 'carga' ? '+ Guardar carga' : '+ Guardar descarga';
  document.getElementById('sd_almacen').innerHTML = _almacenes.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
  document.getElementById('sd_operacion').innerHTML = OPERACIONES[tipo].map(o => `<option>${o}</option>`).join('');
  document.getElementById('sd_responsable').value = (user && user.nombre) || '';
  document.getElementById('sd_motivo').value = '';
  document.getElementById('sd_buscar').value = '';
  document.getElementById('sd_resultados').style.display = 'none';
  sdRender();
  abrirModal('mStockDoc');
}

function sdBuscar(q) {
  const box = document.getElementById('sd_resultados');
  q = q.trim().toLowerCase();
  if (!q) { box.style.display = 'none'; return; }
  const res = _productos.filter(p =>
    (p.nombre || '').toLowerCase().includes(q) || (p.codigo_barras || '').includes(q) || (p.marca || '').toLowerCase().includes(q)
  ).slice(0, 8);
  box.innerHTML = res.length
    ? res.map(p => `<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);" onclick="sdAgregar(${p.id})">
        <strong>${p.nombre}</strong> <small style="color:var(--ink-soft);">${p.marca || ''} · stock: ${p.stock}</small></div>`).join('')
    : '<div style="padding:8px 12px;color:var(--ink-soft);">Sin resultados</div>';
  box.style.display = 'block';
}

function sdAgregar(id) {
  const p = _productos.find(x => x.id === id);
  if (!p) return;
  const ya = _sdItems.find(i => i.producto_id === id);
  if (ya) ya.cantidad++;
  else _sdItems.push({
    producto_id: p.id, codigo_barras: p.codigo_barras, nombre: p.nombre,
    precio_compra: Number(p.precio_compra) || 0, precio_venta: Number(p.precio_venta) || 0, cantidad: 1
  });
  document.getElementById('sd_buscar').value = '';
  document.getElementById('sd_resultados').style.display = 'none';
  sdRender();
}

function sdSet(i, campo, valor) {
  _sdItems[i][campo] = valor === '' ? '' : Number(valor);
  sdTotal();
}
function sdQuitar(i) { _sdItems.splice(i, 1); sdRender(); }

function sdTotal() {
  const t = _sdItems.reduce((a, i) => a + (Number(i.precio_compra) || 0) * (Number(i.cantidad) || 0), 0);
  document.getElementById('sd_total').textContent = _sdTipo === 'carga' ? 'Total compra: ' + fmtMoney(t) : '';
}

function sdRender() {
  const esCarga = _sdTipo === 'carga';
  document.getElementById('sd_items').innerHTML = _sdItems.length
    ? _sdItems.map((it, i) => `<tr>
        <td>${it.codigo_barras || '—'}</td>
        <td>${it.nombre}</td>
        <td>${esCarga ? `<input type="number" step="0.01" min="0" value="${it.precio_compra}" style="width:90px;" oninput="sdSet(${i},'precio_compra',this.value)">` : fmtMoney(it.precio_compra)}</td>
        <td>${esCarga ? `<input type="number" step="0.01" min="0" value="${it.precio_venta}" style="width:90px;" oninput="sdSet(${i},'precio_venta',this.value)">` : fmtMoney(it.precio_venta)}</td>
        <td style="text-align:center;"><input type="number" min="1" value="${it.cantidad}" style="width:70px;" oninput="sdSet(${i},'cantidad',this.value)"></td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="sdQuitar(${i})">✕</button></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Busca y agrega productos</td></tr>';
  sdTotal();
}

async function sdGuardar() {
  const motivo = document.getElementById('sd_motivo').value.trim();
  const almacen_id = document.getElementById('sd_almacen').value;
  if (!motivo) { toast('El motivo es obligatorio', 'rojo'); return; }
  if (!almacen_id) { toast('Selecciona un almacén', 'rojo'); return; }
  if (!_sdItems.length) { toast('Agrega al menos un producto', 'rojo'); return; }
  if (_sdItems.some(i => !Number(i.cantidad) || Number(i.cantidad) < 1)) { toast('Hay cantidades inválidas', 'rojo'); return; }

  const d = await api('/api/stock-documentos', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({
      tipo: _sdTipo, almacen_id, motivo,
      tipo_operacion: document.getElementById('sd_operacion').value,
      responsable: document.getElementById('sd_responsable').value.trim(),
      items: _sdItems.map(i => ({
        producto_id: i.producto_id, cantidad: i.cantidad,
        precio_compra: i.precio_compra, precio_venta: i.precio_venta
      }))
    })
  });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast((_sdTipo === 'carga' ? 'Carga' : 'Descarga') + ' #' + d.numero + ' registrada', 'verde');
  cerrarModal('mStockDoc');
  cargarDocsStock(_sdTipo);
  cargarProductos();
}

// ── Stock por almacén ────────────────────────────────────────
async function cargarStockAlmacen() {
  const d = await api('/api/stock-almacen', { headers: authHeaders() });
  _stockAlm = d.ok ? d.filas : [];
  const sel = document.getElementById('sa_almacen');
  const actual = sel.value;
  const almacenes = [...new Map(_stockAlm.map(f => [f.almacen_id, f.almacen])).entries()];
  sel.innerHTML = '<option value="">Almacén...</option>' + almacenes.map(([id, n]) => `<option value="${id}">${n}</option>`).join('');
  sel.value = actual;
  renderStockAlmacen();
}

function renderStockAlmacen() {
  const q = document.getElementById('sa_buscar').value.trim().toLowerCase();
  const alm = document.getElementById('sa_almacen').value;
  const filas = _stockAlm.filter(f => (!q || f.nombre.toLowerCase().includes(q)) && (!alm || String(f.almacen_id) === alm));
  document.getElementById('tbStockAlmacen').innerHTML = filas.length
    ? filas.map(f => `<tr>
        <td><strong>${f.nombre}</strong></td>
        <td>${fmtMoney(f.precio_compra)}</td>
        <td>${fmtMoney(f.precio_venta)}</td>
        <td>${f.almacen}</td>
        <td>${f.stock}</td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Sin datos</td></tr>';
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
// VENTAS / RECETAS
// ══════════════════════════════════════════════════════════════
let _ventas = [];
let _itemsVenta = [];
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
        <td><button class="btn btn-ghost btn-sm" onclick="verComprobante(${v.id})">Ver</button></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Aún no has registrado ventas</td></tr>';
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
  toast(`Registrado por ${fmtMoney(d.total)}`, 'verde');
  cerrarModal('mVenta');
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
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px;margin-top:6px;"><span>Total</span><span>${fmtMoney(v.total)}</span></div>
    <p style="margin-top:10px;color:var(--ink-soft);font-size:12.5px;">Método: ${v.metodo_pago} — Estado: ${v.estado_pago}</p>
  `;
  abrirModal('mComprobante');
}

// ══════════════════════════════════════════════════════════════
// REPORTES (limitado a hoy y a lo mío)
// ══════════════════════════════════════════════════════════════
async function cargarReportes() {
  const d = await api('/api/reportes', { headers: authHeaders() });
  if (!d.ok) return;
  const totalCitas = d.citasPorEstado.reduce((a, c) => a + c.total, 0);
  const totalAt = d.atencionesPorEstado.reduce((a, c) => a + c.total, 0);
  document.getElementById('rp-citas').textContent = totalCitas;
  document.getElementById('rp-atenciones').textContent = totalAt;
  document.getElementById('tbRepCitas').innerHTML = d.citasPorEstado.length
    ? d.citasPorEstado.map(c => `<tr><td>${c.estado}</td><td>${c.total}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="2">Sin datos hoy</td></tr>';
}

// ══════════════════════════════════════════════════════════════
// FICHA DEL PACIENTE
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
// ATENCIONES — solo las mías (el backend ya filtra)
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
  if (!_atenciones.length) { box.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">No tienes atenciones activas.</p>'; return; }
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
async function abrirCrearAtencion(prioridadInicial) {
  await asegurarClientesCargados();
  poblarSelectClientes('at_cliente_id');
  document.getElementById('at_paciente_id').innerHTML = '<option value="">— Selecciona un cliente primero —</option>';
  document.getElementById('at_origen').value = prioridadInicial === 'emergencia' ? 'emergencia' : 'sin_cita';
  document.getElementById('at_prioridad').value = prioridadInicial === 'emergencia' ? 'emergencia' : 'normal';
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
// INIT
// ══════════════════════════════════════════════════════════════
cargarInicio();