const user = requireRole('veterinario');
document.getElementById('logoBox').innerHTML = logoSVG() + '<span class="vc-logo-text">Vet<span>core</span></span>';

if (user) {
  document.getElementById('userName').textContent = user.nombre || 'Veterinario';
  document.getElementById('avatarLetter').textContent = iniciales(user.nombre || 'V');
}

// ══════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════════════════
const titles = { inicio: 'Dashboard', atencion: 'Atenciones', pacientes: 'Pacientes', historia: 'Historia clínica', hospitalizacion: 'Hospitalización', agenda: 'Agenda del día', ventas: 'Ventas / Recetas', inventario: 'Inventario', reportes: 'Reportes' };
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
  if (sec === 'hospitalizacion') cargarHospitalizaciones();
  if (sec === 'agenda') cargarCitas();
  if (sec === 'ventas') cargarVentas();
  if (sec === 'inventario') cargarProductos();
  if (sec === 'reportes') rpTab(_rpTab);
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
        <span class="badge ${estadoBadge[c.estado] || 'b-grey'}">${(c.estado||'').replace('_',' ')}</span>
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
       <td><div style="display:flex;gap:6px;">
  <button class="btn btn-ghost btn-sm" onclick="abrirFichaPaciente(${p.id})">Ver ficha</button>
  <button class="btn btn-primary btn-sm" onclick="abrirNuevaCitaPaciente(${p.id})">+ Cita</button>
</div></td>
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
// AGENDA (calendario + lista, solo mías)
// ══════════════════════════════════════════════════════════════
const estadoBadge = { pendiente: 'b-grey', confirmada: 'b-primary', en_espera: 'b-accent', atendiendo: 'b-accent', atendida: 'b-primary', cancelada: 'b-danger', no_asistio: 'b-danger' };
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
let _citas = [];
let _agMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const fechaCita = (c) => {
  const f = String(c.fecha || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
  const d = new Date(f);
  return isNaN(d) ? f.slice(0, 10) : ymd(d);
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function cargarCitas() {
  const [d] = await Promise.all([
    api('/api/citas', { headers: authHeaders() }),
    asegurarClientesCargados(),
  ]);
  _citas = d.ok ? d.citas : [];
  renderCalendario();
  renderListaCitas();
}

function agVista(v) {
  document.getElementById('ag_cal_wrap').style.display = v === 'cal' ? '' : 'none';
  document.getElementById('ag_lista_wrap').style.display = v === 'lista' ? '' : 'none';
  document.getElementById('ag_btn_cal').className = 'btn btn-sm ' + (v === 'cal' ? 'btn-primary' : 'btn-ghost');
  document.getElementById('ag_btn_lista').className = 'btn btn-sm ' + (v === 'lista' ? 'btn-primary' : 'btn-ghost');
}
function agMes(delta) {
  _agMes = new Date(_agMes.getFullYear(), _agMes.getMonth() + delta, 1);
  renderCalendario();
}
function agHoy() {
  const h = new Date();
  _agMes = new Date(h.getFullYear(), h.getMonth(), 1);
  renderCalendario();
}

function renderCalendario() {
  const y = _agMes.getFullYear(), m = _agMes.getMonth();
  document.getElementById('cal_titulo').textContent = `${MESES[m]} ${y}`;
  const grid = document.getElementById('cal_grid');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:14px;';

  const porDia = {};
  _citas.forEach(c => { const f = fechaCita(c); (porDia[f] = porDia[f] || []).push(c); });

  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // semana empieza en lunes
  const diasMes = new Date(y, m + 1, 0).getDate();
  const hoy = ymd(new Date());

  let html = DIAS.map(d => `<div style="text-align:center;font-size:12px;font-weight:700;color:var(--ink-soft);padding:4px 0;">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) html += '<div></div>';
  for (let d = 1; d <= diasMes; d++) {
    const f = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const n = (porDia[f] || []).length;
    const esHoy = f === hoy;
    html += `<div onclick="abrirDiaAgenda('${f}')" style="cursor:pointer;min-height:70px;padding:6px 8px;border:1px solid ${esHoy ? 'var(--primary,#0f6b4f)' : 'var(--border)'};border-radius:10px;background:${n ? 'rgba(15,107,79,.08)' : '#fff'};">
      <div style="font-size:13px;font-weight:${esHoy ? 800 : 600};">${d}</div>
      ${n ? `<span class="badge b-primary" style="margin-top:6px;display:inline-block;">${n} cita${n > 1 ? 's' : ''}</span>` : ''}
    </div>`;
  }
  grid.innerHTML = html;
}

function abrirDiaAgenda(f) {
  const citas = _citas.filter(c => fechaCita(c) === f).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  document.getElementById('mCitaTitulo').textContent = 'Citas del ' + fmtFecha(f);
  document.getElementById('mCitaSub').textContent = citas.length ? `${citas.length} cita(s)` : '';
  document.getElementById('mCitaCont').innerHTML = citas.length
    ? citas.map(c => `
      <div class="inicio-list-item">
        <span class="inicio-hora">${c.hora ? c.hora.slice(0, 5) : '—'}</span>
        <span style="flex:1;">${c.paciente_nombre || '—'} (${c.cliente_nombre || '—'}) — ${c.motivo || 'Consulta'}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge ${estadoBadge[c.estado] || 'b-grey'}">${(c.estado || '').replace('_', ' ')}</span>
          <button class="btn btn-primary btn-sm" ${c.paciente_id ? '' : 'disabled'} onclick="abrirConsultaDeCita(${c.id})">Abrir consulta</button>
        </div>
      </div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:13px;">No hay citas este día.</p>';
  abrirModal('mCita');
}

function abrirConsultaDeCita(id) {
  const c = _citas.find(x => x.id === id);
  if (!c || !c.paciente_id) { toast('Esta cita no tiene paciente', 'rojo'); return; }
  cerrarModal('mCita');
  irAHistoriaNueva(c.paciente_id, c.motivo);
}
const ESTADOS_CITA = ['pendiente', 'confirmada', 'en_espera', 'atendiendo', 'atendida', 'no_asistio', 'cancelada'];

function renderListaCitas() {
  const lista = [..._citas].sort((a, b) => (fechaCita(a) + String(a.hora)).localeCompare(fechaCita(b) + String(b.hora)));
  document.getElementById('tbCitas').innerHTML = lista.length
    ? lista.map(c => `<tr>
        <td>${fmtFecha(c.fecha)}</td>
        <td>${c.hora ? c.hora.slice(0, 5) : '—'}</td>
        <td>${c.cliente_nombre || '—'}</td>
        <td>${c.paciente_nombre || '—'}</td>
        <td>${c.veterinario_nombre || '—'}</td>
        <td>${c.motivo || '—'}</td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;">
            <select onchange="cambiarEstadoCita(${c.id}, this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);font-size:12px;">
              ${ESTADOS_CITA.map(e => `<option value="${e}" ${e === c.estado ? 'selected' : ''}>${e.replace('_', ' ')}</option>`).join('')}
            </select>
            <button class="btn btn-ghost btn-sm" title="Enviar recordatorio por WhatsApp" onclick="whatsappCita(${c.id})" style="color:#25D366;font-weight:700;">WhatsApp</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">No hay citas agendadas</td></tr>';
}

function telefonoWhatsApp(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (!n) return '';
  if (n.startsWith('593')) return n;
  if (n.startsWith('0')) n = n.slice(1);
  return '593' + n; // Ecuador
}

function whatsappCita(id) {
  const c = _citas.find(x => x.id === id); if (!c) return;
  const cli = _clientes.find(x => String(x.id) === String(c.cliente_id)) || _clientes.find(x => x.nombre === c.cliente_nombre);
  const tel = telefonoWhatsApp(c.cliente_telefono || cli?.telefono);
  if (!tel) { toast('Este cliente no tiene teléfono registrado', 'rojo'); return; }

  const clinica = (user && user.nombre_clinica) || 'la clínica veterinaria';
  const cliente = c.cliente_nombre || '';
  const mascota = c.paciente_nombre || 'su mascota';
  const fecha = fmtFecha(c.fecha);
  const hora = c.hora ? c.hora.slice(0, 5) : '';
  const cuando = hora ? `el ${fecha} a las ${hora}` : `el ${fecha}`;

  const mensajes = {
    pendiente:  `Hola ${cliente} 👋, le recordamos la cita de *${mascota}* ${cuando} en ${clinica}. ¿Nos confirma su asistencia? 🐾`,
    confirmada: `Hola ${cliente} 👋, su cita para *${mascota}* está confirmada para ${cuando} en ${clinica}. ¡Los esperamos! 🐾`,
    en_espera:  `Hola ${cliente}, *${mascota}* está en lista de espera en ${clinica}. En breve será atendido. 🐾`,
    atendiendo: `Hola ${cliente}, *${mascota}* está siendo atendido en este momento en ${clinica}. Le avisaremos cuando termine. 🐾`,
    atendida:   `Hola ${cliente} 👋, la atención de *${mascota}* del ${fecha} ya está completa ✅. Gracias por confiar en ${clinica}. Cualquier duda, escríbanos. 🐾`,
    cancelada:  `Hola ${cliente}, la cita de *${mascota}* (${cuando}) fue cancelada. Si desea reagendar, escríbanos y con gusto le ayudamos. 🐾`,
    no_asistio: `Hola ${cliente}, notamos que no pudo asistir a la cita de *${mascota}* (${cuando}). ¿Desea reagendarla? 🐾`,
  };

  const texto = mensajes[c.estado] || mensajes.pendiente;
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank');
}

// ══════════════════════════════════════════════════════════════
// NUEVA CITA (modal)
// ══════════════════════════════════════════════════════════════
let _ncModo = 'reg';
let _guardandoCita = false;

function ncTab(m) {
  _ncModo = m;
  document.getElementById('nc_tab_reg').classList.toggle('active', m === 'reg');
  document.getElementById('nc_tab_nuevo').classList.toggle('active', m === 'nuevo');
  document.getElementById('nc_reg').style.display = m === 'reg' ? '' : 'none';
  document.getElementById('nc_nuevo').style.display = m === 'nuevo' ? '' : 'none';
  document.getElementById('nc_telefono').value = '';
  if (m === 'reg') ncClienteChange(document.getElementById('nc_cliente_id').value);
}

async function ncClienteChange(id) {
  await poblarPacientesDeCliente('nc_paciente_id', id);
  const c = _clientes.find(x => String(x.id) === String(id));
  document.getElementById('nc_telefono').value = c?.telefono || '';
}

async function abrirNuevaCitaPaciente(pid) {
  const p = _pacientes.find(x => x.id === pid); if (!p) return;
  await abrirNuevaCita();
  document.getElementById('nc_cliente_id').value = p.cliente_id;
  await ncClienteChange(p.cliente_id);
  document.getElementById('nc_paciente_id').value = p.id;
}

let _ncFotoFile = null;
function ncPreviewFoto(e) {
  const file = e.target.files[0]; if (!file) return;
  _ncFotoFile = file;
  const r = new FileReader();
  r.onload = ev => document.getElementById('nc_foto_box').innerHTML = `<img src="${ev.target.result}" class="pac-foto-preview">`;
  r.readAsDataURL(file);
}

async function abrirNuevaCita(fecha) {
  await Promise.all([asegurarClientesCargados(), asegurarPacientesCargados()]);
  poblarSelectClientes('nc_cliente_id');
  document.getElementById('nc_paciente_id').innerHTML = '<option value="">— Selecciona un propietario primero —</option>';
['nc_telefono', 'nc_hora', 'nc_hora_fin', 'nc_notas', 'nc_n_cliente', 'nc_n_mascota', 'nc_n_especie', 'nc_n_raza', 'nc_n_peso', 'nc_n_sexo']
    .forEach(id => document.getElementById(id).value = '');
      _ncFotoFile = null;
  document.getElementById('nc_foto_input').value = '';
  document.getElementById('nc_foto_box').innerHTML = '<div class="pac-foto-placeholder">🐾</div>';
  document.getElementById('nc_servicio').selectedIndex = 0;
  document.getElementById('nc_fecha').value = typeof fecha === 'string' ? fecha : new Date().toISOString().slice(0, 10);
  document.getElementById('nc_vet').innerHTML = `<option>${user.nombre || 'Yo'} (asignada a mí)</option>`;
  document.getElementById('nc_wa').checked = false;
  ncTab('reg');
  abrirModal('mNuevaCita');
}

async function guardarNuevaCita() {
  if (_guardandoCita) return;
  const v = id => document.getElementById(id).value.trim();
  const fecha = v('nc_fecha'), hora = v('nc_hora'), horaFin = v('nc_hora_fin'), tel = v('nc_telefono');
  if (!fecha || !hora) { toast('Fecha y hora de inicio son obligatorias', 'rojo'); return; }
  if (!tel) { toast('El teléfono es obligatorio', 'rojo'); return; }

  let cliente_id, paciente_id;
  if (_ncModo === 'reg') {
    cliente_id = v('nc_cliente_id'); paciente_id = v('nc_paciente_id');
    if (!cliente_id || !paciente_id) { toast('Selecciona propietario y mascota', 'rojo'); return; }
  } else if (!v('nc_n_cliente') || !v('nc_n_mascota')) {
    toast('Escribe el nombre del propietario y de la mascota', 'rojo'); return;
  }

  _guardandoCita = true;
  const btn = document.getElementById('nc_btn');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    if (_ncModo === 'nuevo') {
      const c = await api('/api/clientes', { method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ nombre: v('nc_n_cliente'), telefono: tel }) });
      if (!c.ok) { toast(c.error || 'Error creando propietario', 'rojo'); return; }
      cliente_id = c.id;
      const p = await api('/api/pacientes', { method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ cliente_id, nombre: v('nc_n_mascota'), especie: v('nc_n_especie'), raza: v('nc_n_raza'), sexo: v('nc_n_sexo'), peso: v('nc_n_peso') || null }) });
      if (!p.ok) { toast(p.error || 'Error creando mascota', 'rojo'); return; }
      paciente_id = p.id;
      if (_ncFotoFile) {
        const fd = new FormData(); fd.append('foto', _ncFotoFile);
        await fetch(API + `/api/pacientes/${p.id}/foto`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd });
        _ncFotoFile = null;
      }
      _clientes = []; _pacientes = []; // forzar recarga
    } else {
      // si cambió el teléfono, actualizar el cliente
      const cli = _clientes.find(x => String(x.id) === String(cliente_id));
      if (cli && (cli.telefono || '') !== tel) {
        await api(`/api/clientes/${cli.id}`, { method: 'PUT', headers: authHeaders(),
          body: JSON.stringify({ nombre: cli.nombre, telefono: tel, email: cli.email, direccion: cli.direccion, documento: cli.documento }) });
        cli.telefono = tel;
      }
    }

    const body = {
      cliente_id, paciente_id, fecha, hora,
      motivo: v('nc_servicio'),
      notas: (horaFin ? `Hasta ${horaFin}. ` : '') + v('nc_notas'),
    };
    const d = await api('/api/citas', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }

    toast('Cita agendada', 'verde');
    cerrarModal('mNuevaCita');
    await cargarCitas();
    if (document.getElementById('nc_wa').checked) whatsappCita(d.id);
    irAHistoriaNueva(paciente_id, v('nc_servicio'));
  } finally {
    _guardandoCita = false;
    btn.disabled = false; btn.textContent = '✓ Guardar y Agendar Cita';
  }
}

async function cambiarEstadoCita(id, estado) {
  const d = await api(`/api/citas/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ estado }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Estado actualizado', 'verde');
  cargarCitas();
}

// ══════════════════════════════════════════════════════════════
// HISTORIA CLÍNICA
// ══════════════════════════════════════════════════════════════
let _pacienteHistoriaActivo = null;
async function cargarSelectPacientesHistoria() {
  await asegurarPacientesCargados();
  const sel = document.getElementById('hc_paciente_select');
  const actual = sel.value || window._hcForzado || '';
  sel.innerHTML = '<option value="">— Elige una mascota —</option>' +
    _pacientes.map(p => `<option value="${p.id}">${p.nombre} — ${p.cliente_nombre}</option>`).join('');
  sel.value = actual;
}
let _historias = [];
async function cargarHistoriaPaciente() {
  const id = document.getElementById('hc_paciente_select').value;
  _pacienteHistoriaActivo = id || null;
  const wrap = document.getElementById('hc_wrap');
  if (!id) { wrap.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">Elige un paciente para ver o registrar su historia clínica.</p>'; return; }
  wrap.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">Cargando...</p>';
  const d = await api(`/api/historias/${id}`, { headers: authHeaders() });
  _historias = d.ok ? d.historias : [];
  const paciente = _pacientes.find(p => String(p.id) === String(id));
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div><strong>${paciente?.nombre || ''}</strong> <span style="color:var(--ink-soft);font-size:13px;">— ${paciente?.especie || ''} ${paciente?.raza ? '· ' + paciente.raza : ''}</span></div>
      <button class="btn btn-primary btn-sm" onclick="abrirNuevaConsulta()">+ Nueva consulta</button>
    </div>
    ${_historias.length ? _historias.map(h => {
      let dj = {}; try { dj = JSON.parse(h.datos_json || '{}'); } catch (e) {}
      const fh = dj.hx_fecha ? dj.hx_fecha.replace('T', ' ') : String(h.fecha).slice(0, 10);
      return `<div class="hx-item">
        <div>
          <div class="hx-item-t">#${h.id} · ${fh}<span class="hx-ok">Finalizada</span></div>
          <div class="hx-item-s">${h.motivo || '—'}</div>
          <div class="hx-item-s">Atendió: ${h.atendio || '—'}</div>
        </div>
        <div class="hx-item-b">
          <button class="hx-b ver" onclick="hxReabrir(${h.id})">👁 Ver / reabrir</button>
          <button class="hx-b pdf" onclick="hxPdf(${h.id})">⬇ PDF</button>
          <button class="hx-b del" onclick="eliminarConsulta(${h.id})">✕</button>
        </div>
      </div>`;
    }).join('') : '<p style="color:var(--ink-soft);font-size:13.5px;">Sin consultas registradas aún.</p>'}`;
}

function hxReabrir(id) {
  const h = _historias.find(x => x.id === id); if (!h) return;
  abrirNuevaConsulta(null, h);
}

function hxPdf(id) {
  const h = _historias.find(x => x.id === id); if (!h) return;
  const p = _pacientes.find(x => String(x.id) === String(h.paciente_id)) || {};
  const f = (l, v) => v ? `<h4>${l}</h4><p style="white-space:pre-line">${v}</p>` : '';
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Consulta #${h.id}</title><style>body{font-family:Arial;padding:30px;max-width:800px;margin:auto}h4{margin:16px 0 4px;color:#1456b8}</style></head><body>
    <h2>Historia clínica · Consulta #${h.id}</h2>
    <p><b>Paciente:</b> ${p.nombre || ''} (${p.especie || ''}) · <b>Propietario:</b> ${p.cliente_nombre || ''}<br>
    <b>Fecha:</b> ${String(h.fecha).slice(0, 10)} · <b>Atendió:</b> ${h.atendio || ''}</p>
    ${f('Motivo', h.motivo)}
    ${f('Constantes', [h.peso && 'Peso: ' + h.peso + ' kg', h.temperatura && 'Temp: ' + h.temperatura + ' °C', h.fc && 'FC: ' + h.fc, h.fr && 'FR: ' + h.fr].filter(Boolean).join(' · '))}
    ${f('Anamnesis y examen', h.anamnesis)}${f('Diagnóstico', h.diagnostico)}${f('Plan', h.tratamiento)}
    ${f('Tratamiento', h.medicamentos)}${f('Recomendaciones', h.recomendaciones)}
    ${h.proximo_control ? f('Próximo control', String(h.proximo_control).slice(0, 10)) : ''}
    <script>window.print()<\/script></body></html>`);
  w.document.close();
}


// PEGA TODO ESTE BLOQUE en su lugar. (hxBorrador, hxReabrir, hxPdf, irAHistoriaNueva… se quedan igual)
// ══════════════════════════════════════════════════════════════
const HX_IDS = ['hx_fecha','hx_motivo','hx_sint','hx_exam','hx_diag','hx_trat','hx_plandx',
  'hx_peso','hx_temp','hx_fc','hx_fr','hx_spo2','hx_pa','hx_cc','hx_tllc','hx_refl','hx_pulso','hx_muc',
  'hx_proximo','hx_hora','hx_tipo_cita','hx_motivo_ctrl','hx_h_ingreso','hx_h_area','hx_h_motivo'];
const hxV = id => (document.getElementById(id)?.value || '').trim();
const hxEl = id => document.getElementById(id);
 
let _hxEditId = null;
let _hxRx = [];       // receta: [{producto_id, nombre, precio, stock, cantidad, dosis, frecuencia}]
let _hxPend = [];     // PDFs de laboratorio pendientes de subir (File)
let _hxExist = [];    // PDFs ya guardados de esta consulta
let _hxHosp = false;  // ¿se hospitaliza?
 
async function asegurarProductos(forzar = false) {
  if (forzar || !_productos.length) {
    const d = await api('/api/productos', { headers: authHeaders() });
    _productos = d.ok ? d.productos : [];
    window._prodErr = d.ok ? '' : (d.error || 'Error desconocido');
  }
}
function hxSet(id, val) {
  const el = hxEl(id); if (!el || val == null || val === '') return;
  if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === val)) el.add(new Option(val, val));
  el.value = val;
}
 
// ── VENTA INTEGRADA EN LA CONSULTA ──────────────────────────
let _hxExtra = [];
let _hxPrecios = {};
let _hxpSel = null;

async function hxPreciosCargar() {
  const d = await api('/api/servicios', { headers: authHeaders() });
  _hxPrecios = {};
  if (d.ok) d.servicios.forEach(s => _hxPrecios[s.nombre] = Number(s.precio));
}

const HX_VENTA_CARD = `
<div class="hx-card">
  <h4>🧾 Venta <span class="hx-tag">Ventas</span></h4>
  <div id="hx_venta_items"></div>
  <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="hxpAbrir()">+ Agregar producto</button>
  <div class="hx-rx-total">Total: <b id="hx_venta_total">$0.00</b></div>
  <div class="hx-stock" id="hx_cobro_est"></div>
  <button type="button" class="btn btn-primary btn-block" style="margin-top:10px;" onclick="cbAbrir()">Finalizar venta</button>
</div>`;

function hxVentaItems() {
  const items = [];
  const motivo = hxV('hx_motivo'), pc = _hxPrecios[motivo];
  if (pc > 0) items.push({ nombre: 'Consulta: ' + motivo, precio: pc, cantidad: 1, origen: 'consulta' });
  _hxRx.forEach(x => items.push({ producto_id: x.producto_id, nombre: x.nombre, precio: x.precio, cantidad: x.cantidad, stock: x.stock, origen: 'rx' }));
  _hxExtra.forEach((x, i) => items.push({ ...x, origen: 'extra', idx: i }));
  return items;
}
const hxVentaTotal = () => hxVentaItems().reduce((a, x) => a + x.precio * x.cantidad, 0);

let _hxCobro = null;   // cobro confirmado en la ventana "Cobrar venta"
let _cbMetodo = 'efectivo';

function hxVentaRender() {
  const box = hxEl('hx_venta_items'); if (!box) return;
  const items = hxVentaItems(), total = hxVentaTotal();
  if (_hxCobro && Math.abs(_hxCobro.total - total) > 0.005) _hxCobro = null; // cambió el total: hay que cobrar de nuevo
  const sinPrecio = !(_hxPrecios[hxV('hx_motivo')] > 0)
    ? '<div class="hx-stock low">No hay precio configurado para este motivo de consulta.</div>' : '';
  box.innerHTML = (items.length ? items.map(x => `
    <div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13.5px;">
      <span>${x.nombre}${x.cantidad > 1 ? ' × ' + x.cantidad : ''}</span>
      <span>${fmtMoney(x.precio * x.cantidad)}
        ${x.origen === 'extra' ? `<button type="button" onclick="hxExtraDel(${x.idx})" aria-label="Quitar">×</button>` : ''}</span>
    </div>`).join('') : '<div class="hx-empty">Sin ítems en la venta</div>') + sinPrecio;
  hxEl('hx_venta_total').textContent = fmtMoney(total);
  const est = hxEl('hx_cobro_est');
  est.className = 'hx-stock' + (_hxCobro ? '' : ' low');
  est.textContent = _hxCobro ? 'Cobro: ' + _hxCobro.resumen : 'Cobro sin registrar: quedará pendiente';
}

// ── Ventana "Cobrar venta" ───────────────────────────────────
function cbAbrir() {
  const total = hxVentaTotal();
  if (!total) { toast('La venta no tiene ítems con valor', 'rojo'); return; }
  const p = _pacientes.find(x => String(x.id) === String(_pacienteHistoriaActivo)) || {};
  hxEl('cb_sub').textContent = 'Paciente: ' + (p.nombre || '');
  hxEl('cb_total').textContent = fmtMoney(total);
  hxEl('cb_ref').value = ''; hxEl('cb_recibido').value = ''; hxEl('cb_comp').value = '';
  hxEl('cb_conf_t').checked = false; hxEl('cb_conf_k').checked = false;
  cbMetodo('efectivo');
  abrirModal('mCobro');
}
function cbMetodo(m) {
  _cbMetodo = m;
  ['transferencia', 'efectivo', 'tarjeta'].forEach(x => {
    hxEl('cb_t_' + x).classList.toggle('active', x === m);
    hxEl('cb_' + x).style.display = x === m ? '' : 'none';
  });
  cbCambio();
}
function cbCambio() {
  const total = hxVentaTotal(), r = parseFloat(hxEl('cb_recibido').value) || 0, c = hxEl('cb_cambio');
  c.style.color = r < total ? '#c0392b' : '#0b6b3f';
  c.textContent = r >= total ? 'Cambio: ' + fmtMoney(r - total) : 'Falta: ' + fmtMoney(total - r);
}
function cbConfirmar() {
  const total = hxVentaTotal(), m = _cbMetodo;
  let pago, resumen, file = null;
  if (m === 'efectivo') {
    const r = parseFloat(hxEl('cb_recibido').value) || 0;
    if (r < total) { toast('El dinero recibido es insuficiente', 'rojo'); return; }
    pago = { metodo_pago: 'efectivo', estado_pago: 'pagado', recibido: r, cambio: +(r - total).toFixed(2) };
    resumen = `Efectivo · recibido ${fmtMoney(r)} · cambio ${fmtMoney(r - total)}`;
  } else if (m === 'transferencia') {
    const ref = hxEl('cb_ref').value.trim(); file = hxEl('cb_comp').files[0] || null;
    if (!ref && !file) { toast('Ingresa la referencia o adjunta el comprobante', 'rojo'); return; }
    const ok = hxEl('cb_conf_t').checked;
    pago = { metodo_pago: 'transferencia', estado_pago: ok ? 'pagado' : 'pendiente', referencia: ref };
    resumen = `Transferencia${ref ? ' · ref. ' + ref : ''} · ${ok ? 'verificada' : 'por verificar'}`;
  } else {
    const ok = hxEl('cb_conf_k').checked, tipo = hxEl('cb_tarjeta_tipo').value;
    pago = { metodo_pago: 'tarjeta', estado_pago: ok ? 'pagado' : 'pendiente', tipo_tarjeta: tipo };
    resumen = `Tarjeta ${tipo.toLowerCase()} · ${ok ? 'cobro confirmado' : 'por confirmar'}`;
  }
  _hxCobro = { total, pago, file, resumen };
  cerrarModal('mCobro'); hxVentaRender();
}
function cbPendiente() {
  _hxCobro = { total: hxVentaTotal(), pago: { metodo_pago: 'efectivo', estado_pago: 'pendiente' }, file: null, resumen: 'Pendiente de cobro' };
  cerrarModal('mCobro'); hxVentaRender();
}

// Modal "Agregar producto"
function hxpAbrir() {
  _hxpSel = null; hxEl('hxp_q').value = ''; hxEl('hxp_cant').value = 1;
  hxpBuscar(''); abrirModal('mHxProd');
}
function hxpBuscar(t) {
  const q = _norm(String(t).trim());
  const r = _productos.filter(p => p.activo != 0 && Number(p.stock) > 0 && (!q || _norm(p.nombre).includes(q) || _norm(p.marca).includes(q))).slice(0, 8);
  hxEl('hxp_res').innerHTML = r.length ? r.map(p => `
    <div onclick="_hxpSel=${p.id};hxpBuscar(hxEl('hxp_q').value)"
      style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;font-size:13.5px;${_hxpSel === p.id ? 'background:#e1f1ea;border-color:#0f6b4f;' : ''}">
      <span>${p.nombre}${p.marca ? ' · ' + p.marca : ''}</span>
      <small>${fmtMoney(p.precio_venta)} · stock ${p.stock}</small>
    </div>`).join('') : '<div class="hx-empty">Sin resultados</div>';
}
function hxpConfirmar() {
  const p = _productos.find(x => x.id === _hxpSel);
  if (!p) { toast('Selecciona un producto', 'rojo'); return; }
  const cant = Math.max(1, parseInt(hxEl('hxp_cant').value) || 1);
  const ya = _hxExtra.find(x => x.producto_id === p.id);
  if (ya) ya.cantidad += cant;
  else _hxExtra.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio_venta), cantidad: cant, stock: Number(p.stock) });
  cerrarModal('mHxProd'); hxVentaRender();
}



async function abrirNuevaConsulta(motivo, h) {
  if (!_pacienteHistoriaActivo) return;
  await Promise.all([asegurarProductos(true), hxPreciosCargar()]);
   _hxEditId = h ? h.id : null; _hxRx = []; _hxExtra = []; _hxCobro = null; _hxPend = []; _hxExist = []; _hxHosp = false;
  const p = _pacientes.find(x => String(x.id) === String(_pacienteHistoriaActivo)) || {};
  const ahora = new Date(); ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  const ahoraStr = ahora.toISOString().slice(0, 16);
  const ta = (id, l, ph = '', r = 2, req = false) => `<div class="hx-f"><label>${l}${req ? ' <i>*</i>' : ''}</label><textarea id="${id}" rows="${r}" placeholder="${ph}"></textarea></div>`;
  const inp = (id, l, t = 'text') => `<div class="hx-f"><label>${l}</label><input type="${t}" ${t === 'number' ? 'step="0.01"' : ''} id="${id}"></div>`;
  const opts = a => a.map(o => `<option>${o}</option>`).join('');
 
  hxEl('hc_wrap').innerHTML = `
    <div class="hx-head">
      <h3>Historia clínica · ${h ? 'Consulta #' + h.id : 'Nueva consulta'}</h3>
      <div class="hx-head-row">
        <div class="hx-pill">Paciente<b>${p.nombre || ''}</b></div>
        <div class="hx-pill">Propietario<b>${p.cliente_nombre || ''}</b></div>
      </div>
    </div>
 
    <div class="hx-layout hx-layout2">
      <!-- ═════════ IZQUIERDA ═════════ -->
      <div class="hx-col">
        <div class="hx-card">
          <h4>Detalles clínicos</h4>
          <div class="hx-g3">
            <div class="hx-f"><label>Fecha y hora <i>*</i></label><input type="datetime-local" id="hx_fecha" value="${ahoraStr}"></div>
            <div class="hx-f"><label>Médico veterinario</label><input type="text" value="${user.nombre || ''}" disabled></div>
            <div class="hx-f"><label>Motivo de consulta <i>*</i></label><select id="hx_motivo" onchange="hxVentaRender()">${opts(['Consulta General','Vacunación','Control','Desparasitación','Cirugía','Emergencia','Otro'])}</select></div>
          </div>
          ${ta('hx_sint', 'Síntomas', 'Ej. No come', 3, true)}
          ${ta('hx_exam', 'Examen físico clínico')}
          ${ta('hx_diag', 'Diagnóstico', '', 2, true)}
          ${ta('hx_plandx', 'Plan diagnóstico (opcional)')}
        </div>
 
        <div class="hx-card">
          <h4>❤️ Constantes vitales</h4>
          <div class="hx-g3">
            ${inp('hx_peso', 'Peso (kg)', 'number')}${inp('hx_temp', 'Temp (°C)', 'number')}${inp('hx_fc', 'F. Card. (lpm)')}
            ${inp('hx_fr', 'F. Resp. (rpm)')}${inp('hx_spo2', 'Sat. O₂ (%)')}${inp('hx_pa', 'Presión art.')}
          </div>
          <div class="hx-g3">
            <div class="hx-f"><label>Cond. corporal (ICC)</label><select id="hx_cc"><option value="">Selecciona...</option>${[1,2,3,4,5,6,7,8,9].map(n => `<option>${n}</option>`).join('')}</select></div>
            ${inp('hx_tllc', 'TLLC')}${inp('hx_refl', 'Reflejos')}
            ${inp('hx_pulso', 'Pulso')}${inp('hx_muc', 'Mucosas')}
          </div>
        </div>
 
        <div class="hx-card">
          <h4>📅 Próxima visita <span class="hx-tag">Agenda</span></h4>
          <div class="hx-g2">
            ${inp('hx_proximo', 'Fecha', 'date')}
            <div class="hx-f"><label>Hora</label><input type="time" id="hx_hora" value="09:00"></div>
            <div class="hx-f"><label>Tipo de cita</label><select id="hx_tipo_cita">${opts(['Control / Revisión','Vacunación','Cirugía','Otro'])}</select></div>
            ${inp('hx_motivo_ctrl', 'Motivo')}
          </div>
          <p class="hx-note">Si pones fecha, la cita se agenda automáticamente al guardar.</p>
        </div>
 
           <button type="button" class="hx-hosp-btn" id="hx_hosp_btn" onclick="abrirHosp()">🏥 Hospitalizar paciente</button>
      </div>
 
      <!-- ═════════ DERECHA ═════════ -->
      <div class="hx-col">
        <div class="hx-card">
          <h4>Receta médica <span class="hx-tag">Inventario</span></h4>
          <div class="hx-f" style="position:relative;">
            <label>Buscar medicamento en inventario</label>
            <input type="text" id="hx_rx_q" placeholder="Escribe el nombre..." autocomplete="off" oninput="hxRxBuscar(this.value)" onfocus="hxRxBuscar(this.value)" onblur="setTimeout(()=>{const b=hxEl('hx_rx_sug'); if(b) b.innerHTML='';},150)">
            <div id="hx_rx_sug" class="hx-sug-box"></div>
          </div>

          <div id="hx_rx_lista"></div>
          ${ta('hx_trat', 'Plan terapéutico / indicaciones', 'Dieta, cuidados en casa, observaciones...', 3, true)}
          <div class="hx-rx-actions">
            <button type="button" class="btn btn-ghost" id="hx_rx_save" onclick="hxGuardarReceta(false)">💾 Guardar receta</button>
            <button type="button" class="btn" id="hx_rx_wa" style="background:#25D366;color:#fff;" onclick="hxGuardarReceta(true)">Guardar y enviar por WhatsApp</button>
          </div>
          <div id="hx_recetas"></div>
        </div>

        ${h ? '' : HX_VENTA_CARD}

        <div class="hx-card">
          <h4>🧪 Laboratorio</h4>
          <div class="hx-drop" id="hx_drop" onclick="hxEl('hx_file').click()">Arrastra PDFs aquí o haz clic para subirlos</div>
          <input type="file" id="hx_file" accept="application/pdf" multiple style="display:none;" onchange="hxAddFiles(this.files);this.value=''">
          <div id="hx_files"></div>
        </div>
      </div>
    </div>
 
    <div class="hx-actions">
      <button class="btn btn-ghost" onclick="cargarHistoriaPaciente()">Cancelar</button>
      <button class="btn btn-ghost" onclick="hxBorrador()">💾 Guardar borrador</button>
      <button class="btn-final" id="hx_btn" onclick="guardarConsulta()">${h ? '✓ Guardar cambios' : '✓ Registrar consulta'}</button>
    </div>`;
 
  // drag & drop de PDFs
  const dz = hxEl('hx_drop');
  ['dragover', 'dragenter'].forEach(n => dz.addEventListener(n, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(n => dz.addEventListener(n, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => hxAddFiles(e.dataTransfer.files));
 
  // precargar
  if (h) {
    let dj = null; try { dj = JSON.parse(h.datos_json || 'null'); } catch (e) {}
    if (dj) {
      // compatibilidad con consultas guardadas con el formato anterior
      const m = { hx_sint: dj.hx_sint ?? dj.hx_anam, hx_diag: dj.hx_diag ?? (dj.hx_def || dj.hx_pres),
                  hx_trat: dj.hx_trat ?? dj.hx_reco, hx_plandx: dj.hx_plandx ?? dj.hx_examcomp };
      HX_IDS.forEach(id => hxSet(id, m[id] ?? dj[id]));
      _hxRx = Array.isArray(dj._rx) ? dj._rx : [];
    } else {
      hxSet('hx_motivo', h.motivo); hxSet('hx_sint', h.anamnesis); hxSet('hx_peso', h.peso); hxSet('hx_temp', h.temperatura);
      hxSet('hx_fc', h.fc); hxSet('hx_fr', h.fr); hxSet('hx_diag', h.diagnostico); hxSet('hx_trat', h.recomendaciones);
      hxSet('hx_fecha', String(h.fecha).slice(0, 10) + 'T08:00');
    }
  
    const f = await api('/api/historia-archivos/' + h.id, { headers: authHeaders() });
    _hxExist = f.ok ? f.archivos : [];
  } else {
    try {
      const d = JSON.parse(localStorage.getItem('hx_draft_' + _pacienteHistoriaActivo) || 'null');
      if (d) HX_IDS.forEach(id => hxSet(id, d[id]));
    } catch (e) {}
    if (!hxV('hx_peso') && p.peso) hxEl('hx_peso').value = p.peso;
    if (motivo) hxSet('hx_motivo', motivo);
  }
  hxRxRender(); hxFilesRender(); hxRecetasCargar();
  hxEl('hc_wrap').scrollIntoView({ behavior: 'smooth' });
}
 
// ── Hospitalización ─────────────────────────────────────────
function hxToggleHosp() {
  _hxHosp = !_hxHosp;
  hxEl('hx_hosp_panel').style.display = _hxHosp ? '' : 'none';
  const b = hxEl('hx_hosp_btn');
  b.classList.toggle('on', _hxHosp);
  b.textContent = _hxHosp ? '✔ Paciente a hospitalizar (quitar)' : '🏥 Hospitalizar paciente';
}
 
// ── Receta conectada a inventario ───────────────────────────
const _norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 
function hxRxBuscar(t) {
  const box = hxEl('hx_rx_sug'), q = _norm(String(t).trim());
  if (window._prodErr) {
    box.innerHTML = `<div class="hx-sug"><small>No se pudo cargar el inventario: ${window._prodErr}</small></div>`;
    return;
  }
  const r = _productos
    .filter(p => p.activo != 0 && (!q || _norm(p.nombre).includes(q) || _norm(p.marca).includes(q)))
    .slice(0, 8);
  box.innerHTML = r.length
    ? r.map(p => {
        const agot = Number(p.stock) <= 0;
        const accion = agot ? '' : `hxRxAdd(${p.id})`;
        return `<div class="hx-sug${agot ? ' off' : ''}" onmousedown="event.preventDefault();${accion}">
          <span>${p.nombre}${p.marca ? ' · ' + p.marca : ''}</span>
          <small>${fmtMoney(p.precio_venta)} · ${agot ? 'Agotado' : 'stock ' + p.stock}</small></div>`;
      }).join('')
    : '<div class="hx-sug"><small>Sin resultados en el inventario</small></div>';
}
function hxRxAdd(id) {
  const p = _productos.find(x => x.id === id); if (!p) return;
  if (!_hxRx.some(x => x.producto_id === id))
    _hxRx.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio_venta), stock: Number(p.stock), cantidad: 1, dosis: '', frecuencia: '' });
  hxEl('hx_rx_q').value = ''; hxEl('hx_rx_sug').innerHTML = '';
  hxRxRender();
}
function hxRxSet(i, k, v) {
  _hxRx[i][k] = k === 'cantidad' ? Math.max(1, parseInt(v) || 1) : v;
  if (k === 'cantidad') hxRxRender();
}
function hxRxDel(i) { _hxRx.splice(i, 1); hxRxRender(); }
function hxRxRender() {
  setTimeout(hxVentaRender, 0);
  const box = hxEl('hx_rx_lista');
  if (!_hxRx.length) { box.innerHTML = '<div class="hx-empty">Aún no hay medicamentos en la receta</div>'; return; }
  const total = _hxRx.reduce((a, x) => a + x.precio * x.cantidad, 0);
  box.innerHTML = _hxRx.map((x, i) => {
    const sobre = x.cantidad > x.stock;
    return `<div class="hx-rx">
      <div class="hx-rx-top"><b>${x.nombre}</b><button type="button" onclick="hxRxDel(${i})" aria-label="Quitar">×</button></div>
      <div class="hx-g3">
        <div class="hx-f"><label>Cantidad</label><input type="number" min="1" value="${x.cantidad}" onchange="hxRxSet(${i},'cantidad',this.value)"></div>
        <div class="hx-f"><label>Dosis</label><input type="text" value="${x.dosis}" placeholder="1 tab" oninput="hxRxSet(${i},'dosis',this.value)"></div>
        <div class="hx-f"><label>Frecuencia / días</label><input type="text" value="${x.frecuencia}" placeholder="c/12h x 7d" oninput="hxRxSet(${i},'frecuencia',this.value)"></div>
      </div>
      <div class="hx-stock ${sobre || x.stock <= 5 ? 'low' : ''}">${sobre ? 'Cantidad mayor al stock disponible (' + x.stock + ')' : 'Stock disponible: ' + x.stock} · ${fmtMoney(x.precio * x.cantidad)}</div>
    </div>`;
  }).join('') + `<div class="hx-rx-total">Total receta: <b>${fmtMoney(total)}</b></div>`;
}
 
// ── Laboratorio (PDF) ───────────────────────────────────────
function hxAddFiles(list) {
  [...list].forEach(f => {
    if (f.type !== 'application/pdf') { toast(`${f.name}: solo PDF`, 'rojo'); return; }
    if (f.size > 10 * 1024 * 1024) { toast(`${f.name}: máximo 10 MB`, 'rojo'); return; }
    _hxPend.push(f);
  });
  hxFilesRender();
}
function hxFilesRender() {
  hxEl('hx_files').innerHTML =
    _hxExist.map(a => `<div class="hx-file"><a href="${a.url}" target="_blank" rel="noopener">📄 ${a.nombre}</a><button type="button" onclick="hxDelExist(${a.id})" aria-label="Eliminar">×</button></div>`).join('') +
    _hxPend.map((f, i) => `<div class="hx-file"><span>📄 ${f.name} <small>(${Math.round(f.size / 1024)} KB · se sube al guardar)</small></span><button type="button" onclick="_hxPend.splice(${i},1);hxFilesRender()" aria-label="Quitar">×</button></div>`).join('');
}
async function hxDelExist(id) {
  if (!confirm('¿Eliminar este PDF?')) return;
  const d = await api('/api/historia-archivos/' + id, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  _hxExist = _hxExist.filter(a => a.id !== id); hxFilesRender();
}
async function hxSubirPdfs(historiaId) {
  let fallos = 0;
  for (const f of _hxPend) {
    const fd = new FormData(); fd.append('archivo', f);
    try {
      const r = await fetch(API + `/api/historia-archivos/${historiaId}`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd });
      const d = await r.json(); if (!d.ok) fallos++;
    } catch (e) { fallos++; }
  }
  _hxPend = [];
  if (fallos) toast(`${fallos} PDF no se pudieron subir`, 'rojo');
}


const RX_CLINICA = {
  nombre: '',      // vacío = usa el nombre de la clínica de tu cuenta
  logo: '',        // opcional: URL de tu logo (por ejemplo, subido a Cloudinary)
  registro: '',    // ej. '1018-12-1185645'  (Reg. Senecyt)
  direccion: '',   // ej. 'FERTIZA C. 54 S-O - Don San Juan Bosco'
  telefono: '',    // ej. '0 98 458 6114'
};
 
let _hxRecetas = [];
let _guardandoRx = false;
 
// ── Imagen de la receta (se dibuja en el navegador) ─────────
function rxCargarLogo() {
  return new Promise(res => {
    if (!RX_CLINICA.logo) return res(null);
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = RX_CLINICA.logo;
  });
}
function rxWrap(ctx, text, maxW) {
  const out = [];
  String(text || '').split('\n').forEach(par => {
    let line = '';
    par.split(' ').forEach(w => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    out.push(line);
  });
  return out;
}
// Dibuja la receta; devuelve la altura final necesaria
function rxPintar(ctx, W, H, d) {
  const M = 60, MW = W - M * 2;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = '#111';
 
  // Encabezado
  if (d.logo) {
    const h = Math.min(120, d.logo.height), w = d.logo.width * h / d.logo.height, k = Math.min(1, 380 / w);
    ctx.drawImage(d.logo, M, 50, w * k, h * k);
  } else {
    ctx.font = 'bold 40px Arial'; ctx.fillStyle = '#0f6b4f';
    ctx.fillText(d.clinica, M, 110); ctx.fillStyle = '#111';
  }
  ctx.font = '22px Arial'; ctx.textAlign = 'center';
  let hy = 95;
  d.cabecera.forEach(t => rxWrap(ctx, t, 640).forEach(l => { ctx.fillText(l, 810, hy); hy += 30; }));
  ctx.textAlign = 'left';
 
  // Datos del paciente
  const par = (l, v, x, y, derecha) => {
    ctx.font = 'bold 26px Arial'; const wl = ctx.measureText(l).width;
    ctx.font = '26px Arial'; const wv = ctx.measureText(' ' + v).width;
    const x0 = derecha ? x - wl - wv : x;
    ctx.font = 'bold 26px Arial'; ctx.fillText(l, x0, y);
    ctx.font = '26px Arial'; ctx.fillText(' ' + v, x0 + wl, y);
  };
  par('Fecha:', d.fecha, M, 270); par('Receta Nº:', d.numero, M, 306);
  par('Paciente:', d.paciente, M, 342); par('ID Mascota:', d.idMascota, M, 378);
  par('Edad:', d.edad, W - M, 330, true); par('Peso:', d.peso, W - M, 366, true);
 
  ctx.strokeStyle = '#0f3a5f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(M, 420); ctx.lineTo(W - M, 420); ctx.stroke();
 
  // Prescripción (izquierda) e indicaciones (derecha)
  const GAP = 60, CW = (MW - GAP) / 2, X2 = M + CW + GAP;
  const bloque = (titulo, texto, x) => {
    let y = 470;
    ctx.font = 'bold 28px Arial'; ctx.fillStyle = '#111'; ctx.fillText(titulo, x, y); y += 38;
    ctx.font = '26px Arial';
    rxWrap(ctx, texto || '—', CW).forEach(l => { ctx.fillText(l, x, y); y += 36; });
    return y;
  };
  const y1 = bloque('PRESCRIPCIÓN:', d.prescripcion, M);
  const y2 = bloque('INDICACIONES (Posología):', d.indicaciones, X2);
  const y = Math.max(y1, y2) + 22;
 
  ctx.strokeStyle = '#d0d7de'; ctx.lineWidth = 2;               // separador entre columnas
  ctx.beginPath(); ctx.moveTo(M + CW + GAP / 2, 450); ctx.lineTo(M + CW + GAP / 2, y - 10); ctx.stroke();
 
  // Pie: médico abajo a la izquierda, firma a la derecha
  const fy = Math.max(y + 60, 700);
  ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.setLineDash([2, 6]);
  ctx.beginPath(); ctx.moveTo(W - M - 420, fy); ctx.lineTo(W - M, fy); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#333';
  ctx.fillText('[ Firma y Sello del Médico ]', W - M - 210, fy + 34);
 
  ctx.textAlign = 'left'; ctx.fillStyle = '#111';
  d.medico.forEach((t, i) => { ctx.font = (i === 0 ? 'bold ' : '') + '24px Arial'; ctx.fillText(t, M, fy + 34 + i * 30); });
  return fy + 40 + d.medico.length * 30;
}
async function rxDibujar(d) {
  d.logo = await rxCargarLogo();
  const W = 1200, c = document.createElement('canvas');
  c.width = W; c.height = 4000;
  const alto = rxPintar(c.getContext('2d'), W, 4000, d);   // 1.ª pasada: mide
  c.height = alto;
  rxPintar(c.getContext('2d'), W, alto, d);                // 2.ª pasada: dibuja
  return new Promise(res => c.toBlob(res, 'image/png'));
}
 
// ── Guardar receta ──────────────────────────────────────────
async function hxGuardarReceta(enviarWA) {
  if (_guardandoRx) return;
  const p = _pacientes.find(x => String(x.id) === String(_pacienteHistoriaActivo)) || {};
  if (!_hxRx.length && !hxV('hx_trat')) { toast('Agrega medicamentos o indicaciones a la receta', 'rojo'); return; }
 
  const fechaIso = hxV('hx_fecha').slice(0, 10) || ymd(new Date());
  const presc = _hxRx.map((x, i) => `${i + 1}. ${x.nombre}\nCantidad: ${x.cantidad}`).join('\n');
  const indic = [
    ..._hxRx.filter(x => x.dosis || x.frecuencia).map(x => `- ${x.nombre}: ${[x.dosis, x.frecuencia].filter(Boolean).join(' ')}`),
    hxV('hx_trat'),
  ].filter(Boolean).join('\n');
 
  const w = enviarWA ? window.open('', '_blank') : null; // se abre ya para que el navegador no lo bloquee
  _guardandoRx = true;
  const b1 = hxEl('hx_rx_save'), b2 = hxEl('hx_rx_wa');
  [b1, b2].forEach(b => b && (b.disabled = true));
  let recetaId = null;
  try {
    const r = await api('/api/recetas', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
      paciente_id: _pacienteHistoriaActivo, historia_id: _hxEditId, fecha: fechaIso, prescripcion: presc, indicaciones: indic }) });
    if (!r.ok) throw new Error(r.error || 'No se pudo crear la receta');
    recetaId = r.id;
 
    const anio = fechaIso.slice(0, 4);
    const blob = await rxDibujar({
      clinica: RX_CLINICA.nombre || user.nombre_clinica || 'Clínica veterinaria',
      cabecera: [[RX_CLINICA.direccion && 'Dirección: ' + RX_CLINICA.direccion, RX_CLINICA.telefono && 'Telf: ' + RX_CLINICA.telefono].filter(Boolean).join(' - ')].filter(Boolean),
      medico: [`MVZ: ${user.nombre || ''}`, RX_CLINICA.registro && `Reg. Senecyt Nº: ${RX_CLINICA.registro}`].filter(Boolean),
      fecha: fechaIso.split('-').reverse().join('/'),
      numero: String(r.numero).padStart(5, '0'),
      paciente: p.nombre || '',
      idMascota: `VC-${anio}-${String(p.id || 0).padStart(5, '0')}`,
      edad: edadPaciente(p.fecha_nacimiento).replace('—', '-'),
      peso: (hxV('hx_peso') || p.peso) ? (hxV('hx_peso') || p.peso) + ' kg' : '-',
      prescripcion: presc, indicaciones: indic,
    });
 
    const fd = new FormData(); fd.append('imagen', blob, `receta-${r.numero}.png`);
    const res = await fetch(API + `/api/recetas/${r.id}/imagen`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd });
    const up = await res.json();
    if (!up.ok) throw new Error(up.error || 'No se pudo subir la imagen');
 
    toast('Receta guardada', 'verde');
    await hxRecetasCargar();
 
    if (enviarWA) {
      const tel = telefonoWhatsApp(p.cliente_telefono);
      if (!tel) { toast('El propietario no tiene teléfono registrado', 'rojo'); w && w.close(); }
      else {
        const msg = `Hola ${p.cliente_nombre || ''} 👋, le enviamos la receta de *${p.nombre || 'su mascota'}*: ${up.imagen_url} 🐾`;
        w.location = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
      }
    }
  } catch (e) {
    if (recetaId) api('/api/recetas/' + recetaId, { method: 'DELETE', headers: authHeaders() }); // no dejar recetas sin imagen
    toast(e.message || 'Error guardando la receta', 'rojo');
    w && w.close();
  } finally {
    _guardandoRx = false;
    [b1, b2].forEach(b => b && (b.disabled = false));
  }
}
 
// ── Recetas guardadas (salen debajo de la receta) ───────────
async function hxRecetasCargar() {
  if (!_pacienteHistoriaActivo) return;
  const d = await api('/api/recetas?paciente_id=' + _pacienteHistoriaActivo, { headers: authHeaders() });
  _hxRecetas = d.ok ? d.recetas : [];
  hxRecetasRender();
}
function hxRecetasRender() {
  const box = hxEl('hx_recetas'); if (!box) return;
  box.innerHTML = _hxRecetas.length
    ? '<div class="hx-rec-titulo">Recetas guardadas</div>' + _hxRecetas.map(r => `
      <div class="hx-rec">
        <div class="hx-rec-top">
          <b>Receta Nº ${String(r.numero).padStart(5, '0')}</b>
          <span>${fmtFecha(r.fecha)} <button type="button" onclick="hxRecetaDel(${r.id})" aria-label="Eliminar receta">×</button></span>
        </div>
        <a href="${r.imagen_url}" target="_blank" rel="noopener"><img src="${r.imagen_url}" alt="Receta ${r.numero}" loading="lazy"></a>
      </div>`).join('')
    : '';
}
async function hxRecetaDel(id) {
  if (!confirm('¿Eliminar esta receta?')) return;
  const d = await api('/api/recetas/' + id, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  await hxRecetasCargar();
}
 
// ── Guardar ─────────────────────────────────────────────────
let _guardandoHx = false;
async function guardarConsulta() {
  if (_guardandoHx) return;
  const v = hxV;
  const fecha = v('hx_fecha').slice(0, 10);
  if (!fecha || !v('hx_motivo')) { toast('Fecha y motivo de consulta son obligatorios', 'rojo'); return; }
  if (!v('hx_sint') || !v('hx_diag') || !v('hx_trat')) { toast('Completa síntomas, diagnóstico y plan terapéutico', 'rojo'); return; }
  const editando = !!_hxEditId;
    const itemsV = hxVentaItems();
  const totalV = itemsV.reduce((a, x) => a + x.precio * x.cantidad, 0);
  const sobre = itemsV.find(x => x.producto_id && x.cantidad > x.stock);
  if (!editando && sobre) { toast(`Stock insuficiente de ${sobre.nombre}`, 'rojo'); return; }
  const cobro = _hxCobro && Math.abs(_hxCobro.total - totalV) < 0.005 ? _hxCobro : null;
  const pago = cobro ? cobro.pago : { metodo_pago: 'efectivo', estado_pago: 'pendiente' };
 
  const j = pares => pares.filter(([, x]) => x).map(([l, x]) => `${l}: ${x}`).join('\n');
  const p = _pacientes.find(x => String(x.id) === String(_pacienteHistoriaActivo)) || {};
  const rxTxt = _hxRx.map(x => `${x.nombre} x${x.cantidad}${x.dosis ? ' — ' + x.dosis : ''}${x.frecuencia ? ' — ' + x.frecuencia : ''}`).join('\n');
  const datos = Object.fromEntries(HX_IDS.map(id => [id, hxEl(id)?.value || '']));
  datos._rx = _hxRx;
 
  const body = {
    paciente_id: _pacienteHistoriaActivo, fecha,
    proximo_control: v('hx_proximo') || null,
    motivo: v('hx_motivo'),
    anamnesis: j([['Síntomas', v('hx_sint')], ['Examen físico', v('hx_exam')],
      ['Sat. O₂', v('hx_spo2')], ['Presión arterial', v('hx_pa')], ['Condición corporal', v('hx_cc')],
      ['TLLC', v('hx_tllc')], ['Reflejos', v('hx_refl')], ['Pulso', v('hx_pulso')], ['Mucosas', v('hx_muc')]]),
    peso: v('hx_peso') || null, temperatura: v('hx_temp') || null, fc: v('hx_fc'), fr: v('hx_fr'),
    diagnostico: v('hx_diag'),
    tratamiento: j([['Plan diagnóstico', v('hx_plandx')]]),
    medicamentos: rxTxt,
    recomendaciones: v('hx_trat'),
    datos_json: JSON.stringify(datos),
  };
 
  _guardandoHx = true;
  const btn = hxEl('hx_btn');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    const d = editando
      ? await api(`/api/historias/${_hxEditId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      : await api('/api/historias', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
    const historiaId = editando ? _hxEditId : d.id;
 
    // PDFs de laboratorio
    if (_hxPend.length) await hxSubirPdfs(historiaId);
 
    // Venta integrada: guarda en Ventas, descuenta inventario una sola vez
    if (!editando && itemsV.length) {
      const ve = await api('/api/ventas', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
        cliente_id: p.cliente_id || null, paciente_id: _pacienteHistoriaActivo, historia_id: historiaId,
        items: itemsV.map(x => ({ producto_id: x.producto_id || null, nombre: x.nombre, precio: x.precio, cantidad: x.cantidad })),
        descuento: 0, ...pago }) });
      if (!ve.ok) toast('Consulta guardada, pero la venta falló: ' + (ve.error || ''), 'rojo');
      else {
        const f = cobro?.file;
        if (f) {
          const fd = new FormData(); fd.append('comprobante', f);
          await fetch(API + `/api/ventas/${ve.id}/comprobante`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd });
        }
      }
    }
 
    // Hospitalización
    if (_hxHosp) {
      await api('/api/hospitalizaciones', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
        paciente_id: _pacienteHistoriaActivo, historia_id: historiaId,
        ingreso: v('hx_h_ingreso'), area: v('hx_h_area'), motivo: v('hx_h_motivo') }) });
    }
 
    // Próxima cita en agenda (solo consulta nueva)
    if (!editando && v('hx_proximo')) {
      await api('/api/citas', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
        cliente_id: p.cliente_id || null, paciente_id: _pacienteHistoriaActivo,
        fecha: v('hx_proximo'), hora: v('hx_hora') || null,
        motivo: v('hx_motivo_ctrl') || v('hx_tipo_cita') || 'Control', notas: '' }) });
    }
 
    localStorage.removeItem('hx_draft_' + _pacienteHistoriaActivo);
    toast(editando ? 'Consulta actualizada' : 'Consulta registrada', 'verde');
    _hxEditId = null;
    cargarHistoriaPaciente();
  } finally {
    _guardandoHx = false;
    btn.disabled = false; btn.textContent = _hxEditId ? '✓ Guardar cambios' : '✓ Registrar consulta';
  }
}





function hxBorrador() {
  const d = {}; HX_IDS.forEach(id => d[id] = document.getElementById(id)?.value || '');
  localStorage.setItem('hx_draft_' + _pacienteHistoriaActivo, JSON.stringify(d));
  toast('Borrador guardado', 'verde');
}

async function irAHistoriaNueva(pid, motivo) {
  window._hcForzado = String(pid);
  await asegurarPacientesCargados();
  ir('historia');
  await cargarSelectPacientesHistoria();
  document.getElementById('hc_paciente_select').value = pid;
  await cargarHistoriaPaciente();
  window._hcForzado = '';
  abrirNuevaConsulta(motivo);
}

async function eliminarConsulta(id) {
  if (!confirm('¿Eliminar esta consulta del historial?')) return;
  const d = await api(`/api/historias/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Consulta eliminada', 'verde');
  cargarHistoriaPaciente();
}
// ══════════════════════════════════════════════════════════════
// INVENTARIO (solo lectura, mismo diseño del propietario)
// ══════════════════════════════════════════════════════════════
let _productos = [];

function llenarFiltro(selId, label, valores) {
  const sel = document.getElementById(selId);
  const actual = sel.value;
  sel.innerHTML = `<option value="">${label}</option>` + valores.map(v => `<option value="${v}">${v}</option>`).join('');
  sel.value = valores.includes(actual) ? actual : '';
}
const unicos = (k) => [...new Set(_productos.map(p => p[k]).filter(Boolean))].sort();
function codigoSis(p) { return 'P' + String(p.id).padStart(5, '0'); }
// Pide a Cloudinary una versión pequeña y optimizada
function thumb(url, size) {
  return url && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`)
    : url;
}
function estadoStock(p) {
  if (Number(p.stock) <= 0) return 'agotado';
  if (Number(p.stock) <= Number(p.stock_minimo)) return 'bajo';
  return 'ok';
}

async function cargarProductos() {
  const d = await api('/api/productos', { headers: authHeaders() });
  _productos = d.ok ? d.productos : [];
  llenarFiltro('inv_f_proveedor', 'Proveedor...', unicos('proveedor'));
  llenarFiltro('inv_f_linea', 'Línea...', unicos('linea'));
  llenarFiltro('inv_f_categoria', 'Categorías...', unicos('categoria'));
  renderProductos();
}

function renderProductos() {
  const q = document.getElementById('inv_buscar').value.trim().toLowerCase();
  const fp = document.getElementById('inv_f_proveedor').value;
  const fl = document.getElementById('inv_f_linea').value;
  const fs = document.getElementById('inv_f_stock').value;
  const fc = document.getElementById('inv_f_categoria').value;
  const lista = _productos.filter(p =>
    (!q || [p.nombre, p.codigo_barras, p.marca].some(x => String(x || '').toLowerCase().includes(q))) &&
    (!fp || p.proveedor === fp) && (!fl || p.linea === fl) && (!fc || p.categoria === fc) &&
    (!fs || estadoStock(p) === fs));
  document.getElementById('tbProductos').innerHTML = lista.length
    ? lista.map(p => {
        const es = estadoStock(p);
        const stockHtml = `<span class="badge ${es === 'ok' ? 'b-primary' : es === 'bajo' ? 'b-accent' : 'b-danger'}">${p.stock}</span>`;
        const estado = !p.activo ? '<span class="badge b-grey">Inactivo</span>'
          : es === 'agotado' ? '<span class="badge b-danger">Agotado</span>'
          : es === 'bajo' ? '<span class="badge b-accent">Stock bajo</span>'
          : '<span class="badge b-primary">Disponible</span>';
                return `<tr>
          <td>${codigoSis(p)}</td>
          <td>
            <div class="prod-cell">
              ${p.foto_url
                ? `<a href="${p.foto_url}" target="_blank" title="Ver foto completa"><img src="${thumb(p.foto_url, 104)}" class="prod-foto" loading="lazy"></a>`
                : `<span class="prod-foto-ph">📦</span>`}
              <span class="prod-nombre">${p.nombre}</span>
            </div>
          </td>
          <td>${p.marca || '—'}</td>
          <td>${p.proveedor || '—'}</td>
          <td>${p.linea || '—'}</td>
          <td>${fmtMoney(p.precio_venta)}</td>
          <td>${stockHtml}</td>
          <td>${estado}</td>
        </tr>`;
      }).join('')
       : '<tr class="empty-row"><td colspan="8" style="text-align:center;">Sin productos en el inventario</td></tr>';
}

function limpiarFiltrosInv() {
  ['inv_buscar', 'inv_f_proveedor', 'inv_f_linea', 'inv_f_stock', 'inv_f_categoria'].forEach(id => document.getElementById(id).value = '');
  renderProductos();
}

async function cargarProductosParaVenta() {
  const d = await api('/api/productos', { headers: authHeaders() });
  _productos = d.ok ? d.productos : [];
  const sel = document.getElementById('ve_producto_select');
  sel.innerHTML = _productos.map(p => `<option value="${p.id}">${p.nombre} — ${fmtMoney(p.precio_venta)} (stock: ${p.stock})</option>`).join('')
    || '<option value="">Sin productos en inventario</option>';
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
        <td>${v.numero ? 'V-' + String(v.numero).padStart(4, '0') : '#' + v.id}</td>
        <td>${fmtFecha(v.created_at)}</td>
        <td>${v.cliente_nombre || '—'}</td>
        <td>${v.paciente_nombre || '—'}</td>
        <td><strong>${fmtMoney(v.total)}</strong></td>
        <td><span class="badge ${v.estado_pago === 'pagado' ? 'b-primary' : 'b-accent'}">${v.estado_pago}</span></td>
        <td><div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="verComprobante(${v.id})">Ver</button>
          ${v.estado_pago !== 'pagado' ? `<button class="btn btn-primary btn-sm" onclick="cobrarVenta(${v.id})">Cobrar</button>` : ''}
        </div></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">Aún no has registrado ventas</td></tr>';
}
async function cobrarVenta(id) {
  const m = (prompt('Método de pago (efectivo, tarjeta o transferencia):', 'efectivo') || '').trim().toLowerCase();
  if (!m) return;
  if (!['efectivo', 'tarjeta', 'transferencia'].includes(m)) { toast('Método no válido', 'rojo'); return; }
  const d = await api(`/api/ventas/${id}/pago`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ metodo_pago: m }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Cobro registrado', 'verde');
  cargarVentas();
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
       <p style="margin-top:10px;color:var(--ink-soft);font-size:12.5px;">
      ${v.numero ? 'V-' + String(v.numero).padStart(4, '0') + ' · ' : ''}Método: ${v.metodo_pago}${v.tipo_tarjeta ? ' (' + v.tipo_tarjeta + ')' : ''} — Estado: ${v.estado_pago}
      ${v.veterinario_nombre ? '<br>Veterinario: ' + v.veterinario_nombre : ''}
      ${v.referencia ? '<br>Referencia: ' + v.referencia : ''}
      ${v.recibido != null ? '<br>Recibido: ' + fmtMoney(v.recibido) + ' · Cambio: ' + fmtMoney(v.cambio || 0) : ''}
      ${v.comprobante_url ? `<br><a href="${v.comprobante_url}" target="_blank" rel="noopener">Ver comprobante</a>` : ''}
    </p>
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



// ── REPORTES: pestañas ───────────────────────────────────────
let _rpTab = 'resumen', _rpDocs = [];
function rpTab(t) {
  _rpTab = t;
  ['resumen', 'docs', 'ventas', 'inv'].forEach(x => {
    document.getElementById('rp_tab_' + x).classList.toggle('active', x === t);
    document.getElementById('rp_' + x).style.display = x === t ? '' : 'none';
  });
  if (t === 'resumen') cargarReportes();
  if (t === 'docs') rpDocsCargar();
  if (t === 'ventas') rpVentasCargar();
  if (t === 'inv') rpInvCargar();
}

// ── Repositorio documental ───────────────────────────────────
const RP_TIPO = { receta: 'Receta médica', laboratorio: 'Laboratorio y diagnóstico' };
async function rpDocsCargar() {
  const d = await api('/api/documentos', { headers: authHeaders() });
  _rpDocs = d.ok ? d.documentos : [];
  rpDocsRender();
}
function rpDocsRender() {
  const q = _norm(document.getElementById('rpd_q').value.trim());
  const tipo = document.getElementById('rpd_tipo').value;
  const desde = document.getElementById('rpd_desde').value, hasta = document.getElementById('rpd_hasta').value;
  const lista = _rpDocs.filter(x =>
    (!tipo || x.tipo === tipo) &&
    (!desde || x.fecha >= desde) && (!hasta || x.fecha <= hasta) &&
    (!q || _norm([x.nombre, x.paciente_nombre, x.cliente_nombre, x.veterinario].join(' ')).includes(q)));
  document.getElementById('rpd_tb').innerHTML = lista.length
    ? lista.map(x => `<tr>
        <td>${fmtFecha(x.fecha)}</td>
        <td><span class="badge ${x.tipo === 'receta' ? 'b-primary' : 'b-accent'}">${RP_TIPO[x.tipo] || x.tipo}</span></td>
        <td>${hE(x.nombre)}</td>
        <td>${hE(x.paciente_nombre)}</td>
        <td>${hE(x.cliente_nombre)}</td>
        <td>${hE(x.veterinario) || '—'}</td>
        <td><div style="display:flex;gap:6px;">
          <a class="btn btn-ghost btn-sm" href="${x.url}" target="_blank" rel="noopener">Abrir</a>
          <button class="btn btn-primary btn-sm" onclick="rpVerHistoria(${x.paciente_id})">Historia clínica</button>
        </div></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">No hay documentos con esos filtros</td></tr>';
}
async function rpVerHistoria(pid) {
  window._hcForzado = String(pid);
  await asegurarPacientesCargados();
  ir('historia');
  await cargarSelectPacientesHistoria();
  document.getElementById('hc_paciente_select').value = pid;
  await cargarHistoriaPaciente();
  window._hcForzado = '';
}

// ── Informe de ventas ────────────────────────────────────────
async function rpVentasCargar() {
  const $ = id => document.getElementById(id);
  const h = new Date();
  if (!$('rpv_desde').value) $('rpv_desde').value = ymd(new Date(h.getFullYear(), h.getMonth(), 1));
  if (!$('rpv_hasta').value) $('rpv_hasta').value = ymd(h);
  const d = await api(`/api/reportes/ventas?desde=${$('rpv_desde').value}&hasta=${$('rpv_hasta').value}`, { headers: authHeaders() });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  $('rpv_cobrado').textContent = fmtMoney(d.porMetodo.reduce((a, m) => a + Number(m.total), 0));
  $('rpv_pend').textContent = fmtMoney(d.pendiente.total);
  $('rpv_pend_l').textContent = `Pendiente de cobro (${d.pendiente.cantidad})`;
  $('rpv_metodo').innerHTML = d.porMetodo.length
    ? d.porMetodo.map(m => `<tr><td style="text-transform:capitalize;">${hE(m.metodo)}</td><td>${m.cantidad}</td><td>${fmtMoney(m.total)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Sin cobros en este período</td></tr>';
  $('rpv_dia').innerHTML = d.porDia.length
    ? d.porDia.map(m => `<tr><td>${fmtFecha(m.dia)}</td><td>${m.cantidad}</td><td>${fmtMoney(m.total)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Sin ventas en este período</td></tr>';
}

// ── Informe de inventario ────────────────────────────────────
async function rpInvCargar() {
  const $ = id => document.getElementById(id);
  await asegurarProductos(true);
  const alerta = _productos.filter(p => p.activo != 0 && estadoStock(p) !== 'ok')
    .sort((a, b) => Number(a.stock) - Number(b.stock));
  const agot = alerta.filter(p => estadoStock(p) === 'agotado').length;
  $('rpi_bajo').textContent = alerta.length - agot;
  $('rpi_agot').textContent = agot;
  $('rpi_alertas').innerHTML = alerta.length
    ? alerta.map(p => `<tr><td>${hE(p.nombre)}</td><td>${p.stock}</td><td>${p.stock_minimo}</td>
        <td><span class="badge ${estadoStock(p) === 'agotado' ? 'b-danger' : 'b-accent'}">${estadoStock(p) === 'agotado' ? 'Agotado' : 'Stock bajo'}</span></td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="4">Sin alertas de stock</td></tr>';
  const d = await api('/api/reportes/movimientos', { headers: authHeaders() });
  const mv = d.ok ? d.movimientos : [];
  $('rpi_mov').innerHTML = mv.length
    ? mv.map(m => `<tr><td>${fmtFecha(m.created_at)}</td><td>${hE(m.producto)}</td><td style="text-transform:capitalize;">${hE(m.tipo)}</td>
        <td><strong style="color:${m.cantidad > 0 ? '#0b6b3f' : '#c0392b'};">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</strong></td>
        <td>${m.saldo}</td><td>${hE(m.motivo) || '—'}</td><td>${hE(m.usuario_nombre) || '—'}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">Sin movimientos</td></tr>';
}

// ══════════════════════════════════════════════════════════════
// FICHA DEL PACIENTE
// ══════════════════════════════════════════════════════════════
let _fpPacienteActivo = null;
function fpPintarAvatar() {
  const p = _fpPacienteActivo;
  document.getElementById('fp_avatar').innerHTML = p.foto_url
    ? `<img src="${p.foto_url}" style="width:100%;height:100%;object-fit:cover;">`
    : (p.especie?.toLowerCase().includes('gat') ? '🐱' : '🐶');
}
function cambiarTabFicha(tab) {
  document.getElementById('fp_tab_resumen').classList.toggle('active', tab === 'resumen');
  document.getElementById('fp_tab_historia').classList.toggle('active', tab === 'historia');
  if (tab === 'resumen') renderFichaResumen(); else renderFichaHistoria();
}

async function abrirFichaPaciente(id) {
  await asegurarPacientesCargados();
  _fpPacienteActivo = _pacientes.find(p => p.id === id);
  if (!_fpPacienteActivo) return;
  document.getElementById('fp_nombre').textContent = _fpPacienteActivo.nombre;
  document.getElementById('fp_sub').textContent = `${_fpPacienteActivo.especie || ''} ${_fpPacienteActivo.raza ? '· ' + _fpPacienteActivo.raza : ''} — Tutor: ${_fpPacienteActivo.cliente_nombre}`;
  fpPintarAvatar();
  cambiarTabFicha('resumen');
  abrirModal('mFichaPaciente');
}
function edadPaciente(f) {
  if (!f) return '—';
  const n = new Date(f); if (isNaN(n)) return '—';
  const h = new Date();
  let meses = (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth();
  if (h.getDate() < n.getDate()) meses--;
  if (meses < 1) return 'Menos de 1 mes';
  return meses < 12 ? `${meses} ${meses === 1 ? 'mes' : 'meses'}` : `${Math.floor(meses / 12)} ${Math.floor(meses / 12) === 1 ? 'año' : 'años'}`;
}
function renderFichaResumen() {
  const p = _fpPacienteActivo;
  const it = (l, v) => `<div class="fp-item"><span>${l}</span><strong>${v || '—'}</strong></div>`;
  document.getElementById('fp_contenido').innerHTML = `
    <div class="fp-grid">
      ${it('Sexo', p.sexo)}
      ${it('Peso', p.peso ? p.peso + ' kg' : '')}
      ${it('Edad', edadPaciente(p.fecha_nacimiento))}
      ${it('Color', p.color)}
      ${it('Microchip', p.microchip)}
      ${it('Tel. tutor', p.cliente_telefono)}
    </div>
    ${p.alergias ? `<div class="ficha-dr-box"><div class="ficha-dr-label">⚠️ Alergias</div><div class="ficha-dr-txt">${p.alergias}</div></div>` : ''}
    ${p.observaciones ? `<div class="ficha-dr-box"><div class="ficha-dr-label">📋 Observaciones</div><div class="ficha-dr-txt">${p.observaciones}</div></div>` : ''}
  `;
}
async function fpCambiarFoto(e) {
  const file = e.target.files[0]; if (!file || !_fpPacienteActivo) return;
  const fd = new FormData(); fd.append('foto', file);
  try {
    const res = await fetch(API + `/api/pacientes/${_fpPacienteActivo.id}/foto`, {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd });
    const d = await res.json();
    if (!d.ok) { toast(d.error || 'Error subiendo foto', 'rojo'); return; }
    _fpPacienteActivo.foto_url = d.foto_url;
    fpPintarAvatar();
    cargarPacientes();
    toast('Foto actualizada', 'verde');
  } catch (err) { toast('Error de red subiendo la foto', 'rojo'); }
  e.target.value = '';
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
async function fpNuevaConsulta() {
  cerrarModal('mFichaPaciente');
  await irAHistoriaNueva(_fpPacienteActivo.id);
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

function abrirEditarPacienteVet() {
  const p = _fpPacienteActivo; if (!p) return;
  document.getElementById('ep_id').value = p.id;
  document.getElementById('ep_sub').textContent = `Tutor: ${p.cliente_nombre}`;
  document.getElementById('ep_nombre').value = p.nombre || '';
  document.getElementById('ep_especie').value = p.especie || '';
  document.getElementById('ep_raza').value = p.raza || '';
  document.getElementById('ep_sexo').value = p.sexo || '';
  document.getElementById('ep_fnac').value = p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : '';
  document.getElementById('ep_peso').value = p.peso || '';
  document.getElementById('ep_color').value = p.color || '';
  document.getElementById('ep_microchip').value = p.microchip || '';
  document.getElementById('ep_alergias').value = p.alergias || '';
  document.getElementById('ep_observaciones').value = p.observaciones || '';
  abrirModal('mEditarPaciente');
}

let _guardandoEp = false;
async function guardarEditarPacienteVet() {
  if (_guardandoEp) return;
  const v = id => document.getElementById(id).value.trim();
  const id = v('ep_id');
  if (!v('ep_nombre')) { toast('El nombre es obligatorio', 'rojo'); return; }
  const body = {
    nombre: v('ep_nombre'), especie: v('ep_especie'), raza: v('ep_raza'),
    sexo: document.getElementById('ep_sexo').value,
    fecha_nacimiento: v('ep_fnac') || null, peso: v('ep_peso') || null,
    color: v('ep_color'), microchip: v('ep_microchip'),
    alergias: v('ep_alergias'), observaciones: v('ep_observaciones'),
  };
  _guardandoEp = true;
  const btn = document.getElementById('ep_btn');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    const d = await api(`/api/pacientes/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
    await cargarPacientes();
    _fpPacienteActivo = _pacientes.find(p => String(p.id) === String(id));
    if (_fpPacienteActivo) {
      document.getElementById('fp_nombre').textContent = _fpPacienteActivo.nombre;
      document.getElementById('fp_sub').textContent = `${_fpPacienteActivo.especie || ''} ${_fpPacienteActivo.raza ? '· ' + _fpPacienteActivo.raza : ''} — Tutor: ${_fpPacienteActivo.cliente_nombre}`;
      fpPintarAvatar();
      cambiarTabFicha('resumen');
    }
    cerrarModal('mEditarPaciente');
    toast('Datos actualizados', 'verde');
  } finally {
    _guardandoEp = false;
    btn.disabled = false; btn.textContent = 'Guardar cambios';
  }
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

async function abrirHosp() {
  const pid = _pacienteHistoriaActivo;
  if (!pid) return toast('Selecciona un paciente primero', 'rojo');
  const p = _pacientes.find(x => String(x.id) === String(pid)) || {};
  const $ = id => document.getElementById(id);

  $('hospPaciente').textContent = `Paciente: ${p.nombre || ''} · Propietario: ${p.cliente_nombre || ''}`;
  const f = new Date(); f.setMinutes(f.getMinutes() - f.getTimezoneOffset());
  $('h_fecha').value = f.toISOString().slice(0, 16);
  $('h_vet').value = user.nombre || '';
  $('h_peso').value = hxV('hx_peso') || p.peso || '';
  $('h_ant').value = hxV('hx_sint');
  $('h_diag').value = hxV('hx_diag');
  $('h_plan').value = hxV('hx_trat');
  $('h_motivo').value = ''; $('h_jaula').value = '';
  $('h_autor').value = p.cliente_nombre || '';
  $('h_consent').checked = false;

  const aviso = $('hospAviso'); aviso.style.display = 'none';
  const btn = $('btnHospGuardar'); btn.disabled = false;
  const d = await api(`/api/pacientes/${pid}/hospitalizacion-activa`, { headers: authHeaders() });
  if (d.ok && d.hospitalizacion) {
    aviso.innerHTML = `⚠️ Este paciente ya tiene una hospitalización activa (<b>${d.hospitalizacion.codigo}</b>).`;
    aviso.style.display = 'block'; btn.disabled = true;
  }
  $('modalHosp').style.display = 'flex';
}

function cerrarHosp() { document.getElementById('modalHosp').style.display = 'none'; }

async function guardarHosp() {
  const v = id => document.getElementById(id).value.trim();
  const btn = document.getElementById('btnHospGuardar');
  if (!v('h_motivo')) return toast('Falta el motivo de hospitalización', 'rojo');
  if (!v('h_autor') || !document.getElementById('h_consent').checked) return toast('Falta el consentimiento del propietario', 'rojo');
  btn.disabled = true;
  try {
    const d = await api('/api/hospitalizaciones', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
      paciente_id: _pacienteHistoriaActivo, historia_id: _hxEditId || null,
      fecha_ingreso: v('h_fecha').replace('T', ' ') + ':00',
      procedencia: v('h_proc'), veterinario: v('h_vet'), estado_inicial: v('h_estado'),
      area: v('h_area'), jaula: v('h_jaula'), peso_kg: v('h_peso'),
      motivo: v('h_motivo'), antecedentes: v('h_ant'), diagnostico: v('h_diag'), plan_inicial: v('h_plan'),
      consentimiento: true, autorizante: v('h_autor') }) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
    toast('Ingreso confirmado: ' + d.codigo, 'verde');
    cerrarHosp();
    ir('hospitalizacion');
    abrirHospDetalle(d.id, 'resumen');
  } finally { btn.disabled = false; }
}
// ══════════════════════════════════════════════════════════════
// MÓDULO HOSPITALIZACIÓN
// ══════════════════════════════════════════════════════════════
let _hosps = [], _hospFiltro = 'activa', _hospDet = null, _hospTabActual = 'resumen';
const hE = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hD = s => s ? new Date(String(s).replace(' ', 'T')) : null;
const hF = s => { const d = hD(s); return d && !isNaN(d) ? d.toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; };
const hNow = () => { const f = new Date(); f.setMinutes(f.getMinutes() - f.getTimezoneOffset()); return f.toISOString().slice(0, 16); };
const hClase = e => e === 'Crítico' ? 'crit' : e === 'Requiere vigilancia' ? 'warn' : 'ok';
function hDur(ini, fin) {
  const a = hD(ini), b = fin ? hD(fin) : new Date(); if (!a || isNaN(a)) return '—';
  const h = Math.max(0, Math.floor((b - a) / 36e5)), d = Math.floor(h / 24);
  return d ? `${d} d ${h % 24} h` : `${h} h`;
}
const hOpts = (arr, sel) => arr.map(o => `<option ${o === sel ? 'selected' : ''}>${o}</option>`).join('');

async function cargarHospitalizaciones() {
  await asegurarPacientesCargados();
  const d = await api('/api/hospitalizaciones?estado=todas', { headers: authHeaders() });
  _hosps = d.ok ? d.hospitalizaciones : [];
  const act = _hosps.filter(h => h.estado === 'activa');
  document.getElementById('hp-st-activas').textContent = act.length;
  document.getElementById('hp-st-vigilancia').textContent = act.filter(h => h.estado_inicial !== 'Estable').length;
  document.getElementById('hp-st-altas').textContent = _hosps.length - act.length;
  hospRender();
}
function hospFiltro(f) {
  _hospFiltro = f;
  ['activa', 'alta', 'todas'].forEach(x => document.getElementById('hp_f_' + x).classList.toggle('active', x === f));
  hospRender();
}
function hospRender() {
  const q = _norm(document.getElementById('hosp_buscar').value);
  const lista = _hosps.filter(h =>
    (_hospFiltro === 'todas' || h.estado === _hospFiltro) &&
    (!q || _norm([h.paciente_nombre, h.cliente_nombre, h.codigo].join(' ')).includes(q)));
  document.getElementById('hospGrid').innerHTML = lista.length ? lista.map(h => {
    const act = h.estado === 'activa';
    return `<div class="hp-card ${act ? hClase(h.estado_inicial) : 'done'}" onclick="abrirHospDetalle(${h.id})">
      <div class="hp-card-top">
        <div class="hp-av">${h.foto_url ? `<img src="${h.foto_url}" alt="">` : (String(h.especie || '').toLowerCase().includes('gat') ? '🐱' : '🐶')}</div>
        <div class="hp-card-id">
          <b>${hE(h.paciente_nombre)}</b>
          <span>${hE(h.especie || '')}${h.raza ? ' · ' + hE(h.raza) : ''}</span>
          <span>Tutor: ${hE(h.cliente_nombre)}</span>
        </div>
        <span class="hp-cod">${hE(h.codigo || '')}</span>
      </div>
      <div class="hp-chips">
        ${act ? `<span class="hp-chip ${hClase(h.estado_inicial)}">${hE(h.estado_inicial)}</span>` : `<span class="hp-chip done">Alta · ${hE(h.condicion_alta || '')}</span>`}
        <span class="hp-chip neutro">📍 ${hE(h.jaula ? h.jaula + ' · ' : '')}${hE(h.area || 'Sin área')}</span>
      </div>
      <p class="hp-motivo">${hE(h.motivo)}</p>
      <div class="hp-card-foot">
        <span>Ingreso ${hF(h.ingreso_txt)}</span>
        <span><b>${hDur(h.ingreso_txt, act ? null : h.alta_txt)}</b> ${act ? 'hospitalizado' : 'de estancia'}</span>
      </div>
    </div>`;
  }).join('') : `<p class="hp-vacio">${_hospFiltro === 'activa' ? 'No hay pacientes hospitalizados en este momento.' : 'Sin resultados.'}</p>`;
}

let _hospMeds = [];
async function hospCargarMeds() {
  const d = await api('/api/hosp-medicamentos', { headers: authHeaders() });
  _hospMeds = d.ok ? d.medicamentos : [];
}
async function abrirHospDetalle(id, tab) {
  const [d] = await Promise.all([api(`/api/hospitalizaciones/${id}`, { headers: authHeaders() }), hospCargarMeds()]);
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  _hospDet = d;
  hospTab(tab || _hospTabActual || 'resumen');
  abrirModal('mHospDetalle');
}

// Al elegir un medicamento ya usado, rellena lo que esté vacío
function hdAutoMed(nombre) {
  const m = _hospMeds.find(x => _norm(x.producto) === _norm(nombre)); if (!m) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val && !el.value.trim()) el.value = val; };
  set('ht_dosis', m.dosis); set('ht_instr', m.instrucciones);
  const via = document.getElementById('ht_via');
  if (m.via && [...via.options].some(o => o.value === m.via)) via.value = m.via;
  toast('Datos de la última vez cargados', 'verde');
}


async function hospRefrescar(tab) {
  await abrirHospDetalle(_hospDet.hospitalizacion.id, tab);
  cargarHospitalizaciones();
}

function hospTab(t) {
  _hospTabActual = t;
  ['resumen', 'monitoreo', 'tratamientos', 'evolucion', 'alta'].forEach(x => document.getElementById('hd_tab_' + x).classList.toggle('active', x === t));
  const h = _hospDet.hospitalizacion, act = h.estado === 'activa';
  document.getElementById('hd_head').innerHTML = `
    <div class="hp-dh">
      <div class="hp-av lg">${h.foto_url ? `<img src="${h.foto_url}" alt="">` : (String(h.especie || '').toLowerCase().includes('gat') ? '🐱' : '🐶')}</div>
      <div style="flex:1;min-width:0;">
        <h2 style="margin:0;">${hE(h.paciente_nombre)} <span class="hp-cod">${hE(h.codigo || '')}</span></h2>
        <p class="modal-sub" style="margin:2px 0 8px;">${hE(h.especie || '')}${h.raza ? ' · ' + hE(h.raza) : ''} — Tutor: ${hE(h.cliente_nombre)}</p>
        <div class="hp-chips">
          ${act ? `<span class="hp-chip ${hClase(h.estado_inicial)}">${hE(h.estado_inicial)}</span>` : `<span class="hp-chip done">Alta · ${hE(h.condicion_alta || '')}</span>`}
          <span class="hp-chip neutro">📍 ${hE(h.jaula ? h.jaula + ' · ' : '')}${hE(h.area || '—')}</span>
          <span class="hp-chip neutro">⏱ ${hDur(h.ingreso_txt, act ? null : h.alta_txt)}</span>
        </div>
      </div>
    </div>`;
  const body = document.getElementById('hd_body');
 body.innerHTML = t === 'resumen' ? hdResumen() : t === 'monitoreo' ? hdMonitoreo() : t === 'tratamientos' ? hdTratamientos() : t === 'evolucion' ? hdEvolucion() : hdAlta();
}

function hdResumen() {
  const h = _hospDet.hospitalizacion;
  const pend = (_hospDet.tratamientos || []).filter(x => x.estado === 'programado').slice(0, 3);
  const it = (l, v) => `<div class="fp-item"><span>${l}</span><strong>${hE(v) || '—'}</strong></div>`;
  const bl = (l, v) => v ? `<div class="hp-bloque"><div class="hp-bl-t">${l}</div><div class="hp-bl-x">${hE(v)}</div></div>` : '';
  return `
    <div class="fp-grid">
      ${it('Ingreso', hF(h.ingreso_txt))}${it('Procedencia', h.procedencia)}${it('Veterinario', h.veterinario)}
      ${it('Peso', h.peso_kg ? h.peso_kg + ' kg' : '')}${it('Jaula', h.jaula)}${it('Tel. tutor', h.cliente_telefono)}
    </div>
    ${pend.length ? `<div class="hp-bloque"><div class="hp-bl-t">⏰ Próximos cuidados</div>${pend.map(x => `<div class="hp-bl-x">${hF(x.prog_txt)} — <b>${hE(x.producto)}</b> ${hE(x.dosis)} ${hE(x.via)}</div>`).join('')}</div>` : ''}
    ${bl('Motivo de hospitalización', h.motivo)}${bl('Antecedentes y resumen de consulta', h.antecedentes)}
    ${bl('Diagnóstico', h.diagnostico)}${bl('Plan inicial', h.plan_inicial)}
    <div class="hp-bloque ok"><div class="hp-bl-t">✔ Consentimiento</div>
      <div class="hp-bl-x">Autorizado por <b>${hE(h.autorizante || '—')}</b> · registrado por ${hE(h.creado_por || '—')}</div></div>`;
}

function hdMonitoreo() {
  const h = _hospDet.hospitalizacion, act = h.estado === 'activa', m = _hospDet.monitoreo;
  const sel = (id, arr) => `<select id="${id}"><option value="">—</option>${hOpts(arr)}</select>`;
  const form = act ? `
    <div class="hp-form">
      <div class="hp-form-t">Registrar medición</div>
      <div class="form-row">
        <div class="field"><label>Fecha y hora</label><input type="datetime-local" id="hm_fecha" value="${hNow()}"></div>
        <div class="field"><label>Temperatura (°C)</label><input type="number" step="0.1" id="hm_temp"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Frecuencia cardíaca (lpm)</label><input type="text" id="hm_fc"></div>
        <div class="field"><label>Frecuencia respiratoria (rpm)</label><input type="text" id="hm_fr"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Mucosas</label><input type="text" id="hm_muc" placeholder="Rosadas, pálidas..."></div>
        <div class="field"><label>TLLC (seg)</label><input type="text" id="hm_tllc" placeholder="Ej. 2"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>% de hidratación</label><input type="number" min="0" max="100" step="1" id="hm_hidpct" placeholder="Ej. 5"></div>
        <div class="field"><label>Dolor</label>${sel('hm_dolor', ['Sin dolor', 'Leve', 'Moderado', 'Severo'])}</div>
      </div>

      <div class="hp-form-t" style="margin-top:6px;">Informar si…</div>
      <div class="form-row">
        <div class="field"><label>Consumo de agua</label>${sel('hm_agua', ['Normal', 'Aumentado', 'Disminuido', 'No bebe'])}</div>
        <div class="field"><label>Consumo de alimento</label>${sel('hm_ali', ['Normal', 'Disminuido', 'No come'])}</div>
      </div>
      <div class="form-row">
        <div class="field"><label>Orina</label>${sel('hm_orina', ['Sí', 'No', 'Disminuida', 'Aumentada'])}</div>
        <div class="field"><label>Heces</label>${sel('hm_heces', ['Normales', 'Diarrea', 'Blandas', 'Con sangre', 'No hubo'])}</div>
      </div>

      <div class="form-row">
        <div class="field"><label>Vómito</label>${sel('hm_vomito', ['No', 'Sí (1 vez)', 'Sí (2-3 veces)', 'Sí (más de 3)'])}</div>
        <div class="field"><label>Observaciones</label><input type="text" id="hm_obs"></div>
      </div>
      <button class="btn btn-primary btn-sm" id="hm_btn" onclick="hdGuardarMonitoreo()">+ Guardar medición</button>
    </div>` : '';

  return form + (m.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Temp</th><th>FC</th><th>FR</th><th>Mucosas</th><th>TLLC</th><th>% Hidr.</th>
      <th>Agua</th><th>Alimento</th><th>Orina</th><th>Heces</th><th>Vómito</th><th>Dolor</th><th>Obs.</th><th>Por</th></tr></thead>
    <tbody>${m.map(r => `<tr>
      <td>${hF(r.fecha_txt)}</td><td>${r.temperatura ?? '—'}</td><td>${hE(r.fc) || '—'}</td><td>${hE(r.fr) || '—'}</td>
      <td>${hE(r.mucosas) || '—'}</td><td>${hE(r.tllc) || '—'}</td>
      <td>${r.hidratacion_pct ? hE(r.hidratacion_pct) + '%' : (hE(r.hidratacion) || '—')}</td>
      <td>${hE(r.consumo_agua) || '—'}</td><td>${hE(r.consumo_alimento) || '—'}</td><td>${hE(r.orina) || '—'}</td>
      <td>${hE(r.heces) || '—'}</td><td>${hE(r.vomito) || '—'}</td><td>${hE(r.dolor) || '—'}</td>
      <td>${hE(r.observaciones) || '—'}</td><td>${hE(r.usuario)}</td></tr>`).join('')}</tbody>
    </table></div>` : '<p class="hp-vacio">Aún no hay mediciones registradas.</p>');
}

async function hdGuardarMonitoreo() {
  const v = id => document.getElementById(id).value.trim(), btn = document.getElementById('hm_btn');
  btn.disabled = true;
  try {
    const d = await api(`/api/hospitalizaciones/${_hospDet.hospitalizacion.id}/monitoreo`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({
      fecha: v('hm_fecha').replace('T', ' ') + ':00', temperatura: v('hm_temp'), fc: v('hm_fc'), fr: v('hm_fr'),
      mucosas: v('hm_muc'), tllc: v('hm_tllc'), hidratacion_pct: v('hm_hidpct'), dolor: v('hm_dolor'),
      consumo_agua: v('hm_agua'), consumo_alimento: v('hm_ali'), orina: v('hm_orina'),
      heces: v('hm_heces'), vomito: v('hm_vomito'), observaciones: v('hm_obs') }) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
    toast('Medición guardada', 'verde');
    await hospRefrescar('monitoreo');

  } finally { btn.disabled = false; }
}

const HP_TIPO = { evolucion: 'Evolución', incidencia: 'Incidencia', relevo: 'Relevo de turno' };
function hdEvolucion() {
  const h = _hospDet.hospitalizacion, act = h.estado === 'activa', n = _hospDet.notas;
  const form = act ? `
    <div class="hp-form">
      <div class="hp-form-t">Nueva nota</div>
      <div class="form-row">
        <div class="field"><label>Fecha y hora</label><input type="datetime-local" id="hn_fecha" value="${hNow()}"></div>
        <div class="field"><label>Tipo</label><select id="hn_tipo">${Object.entries(HP_TIPO).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Nota</label><textarea id="hn_nota" rows="3" placeholder="Respuesta al tratamiento, incidencias, plan siguiente..."></textarea></div>
      <button class="btn btn-primary btn-sm" id="hn_btn" onclick="hdGuardarNota()">+ Agregar nota</button>
    </div>` : '';
  return form + (n.length ? `<div class="hp-timeline">${n.map(x => `
    <div class="hp-tl-item ${x.tipo}">
      <div class="hp-tl-top"><span class="hp-chip neutro">${HP_TIPO[x.tipo] || x.tipo}</span><small>${hF(x.fecha_txt)} · ${hE(x.usuario)}</small></div>
      <div class="hp-tl-txt">${hE(x.nota)}</div>
    </div>`).join('')}</div>` : '<p class="hp-vacio">Sin notas de evolución todavía.</p>');
}
async function hdGuardarNota() {
  const v = id => document.getElementById(id).value.trim(), btn = document.getElementById('hn_btn');
  if (!v('hn_nota')) { toast('Escribe la nota', 'rojo'); return; }
  btn.disabled = true;
  try {
    const d = await api(`/api/hospitalizaciones/${_hospDet.hospitalizacion.id}/notas`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({
      fecha: v('hn_fecha').replace('T', ' ') + ':00', tipo: v('hn_tipo'), nota: v('hn_nota') }) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
    toast('Nota agregada', 'verde');
    await hospRefrescar('evolucion');
  } finally { btn.disabled = false; }
}

function hdAlta() {
  const h = _hospDet.hospitalizacion;
  if (h.estado !== 'activa') {
    const bl = (l, v) => v ? `<div class="hp-bloque"><div class="hp-bl-t">${l}</div><div class="hp-bl-x">${hE(v)}</div></div>` : '';
    return `<div class="hp-informe">
      <div><b>📄 Informe de hospitalización</b><small>Monitoreo, tratamientos y evolución en un solo PDF</small></div>
      <button class="btn btn-primary" onclick="hospInforme()">⬇ Descargar informe PDF</button>
    </div>
    <div class="hp-bloque ok"><div class="hp-bl-t">✔ Alta registrada</div>
      <div class="hp-bl-x">${hF(h.alta_txt)} · Condición: <b>${hE(h.condicion_alta)}</b> · Autorizó: ${hE(h.alta_por || '—')} · Estancia: ${hDur(h.ingreso_txt, h.alta_txt)}</div></div>
      ${bl('Resumen de la estancia', h.resumen_alta)}${bl('Indicaciones al propietario', h.indicaciones_alta)}
      ${h.control_txt ? bl('Próximo control', fmtFecha(h.control_txt)) : ''}`;
  }
  return `<div class="hp-form">
    <div class="hp-form-t">Preparar alta hospitalaria</div>
    <div class="form-row">
      <div class="field"><label>Fecha y hora de alta *</label><input type="datetime-local" id="ha_fecha" value="${hNow()}"></div>
      <div class="field"><label>Condición al egreso *</label><select id="ha_cond">${hOpts(['Recuperado', 'Mejorado', 'Estable', 'Transferido', 'Alta voluntaria', 'Fallecido'], 'Mejorado')}</select></div>
    </div>
    <div class="field"><label>Resumen de la estancia *</label><textarea id="ha_res" rows="3"></textarea></div>
    <div class="field"><label>Indicaciones para el propietario (tratamiento en casa, signos de alarma)</label><textarea id="ha_ind" rows="3"></textarea></div>
    <div class="field"><label>Próximo control (agenda una cita automáticamente)</label><input type="date" id="ha_ctrl"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" id="ha_btn" onclick="hdConfirmarAlta()">✓ Confirmar alta</button>
      <button class="btn btn-ghost" type="button" onclick="hospInforme()">📄 Ver informe actual</button>
    </div>
  </div>`;
}
async function hdConfirmarAlta() {
  const v = id => document.getElementById(id).value.trim(), h = _hospDet.hospitalizacion;
  if (!v('ha_res')) { toast('Falta el resumen de la estancia', 'rojo'); return; }
  if (!confirm(`¿Confirmar el alta de ${h.paciente_nombre}? La estancia se cerrará.`)) return;
  const btn = document.getElementById('ha_btn'); btn.disabled = true;
  try {
    const d = await api(`/api/hospitalizaciones/${h.id}/alta`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({
      fecha_alta: v('ha_fecha').replace('T', ' ') + ':00', condicion_alta: v('ha_cond'),
      resumen_alta: v('ha_res'), indicaciones_alta: v('ha_ind'), proximo_control: v('ha_ctrl') || null }) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
    if (v('ha_ctrl')) {
      const p = _pacientes.find(x => String(x.id) === String(h.paciente_id));
      await api('/api/citas', { method: 'POST', headers: authHeaders(), body: JSON.stringify({
        cliente_id: p?.cliente_id || null, paciente_id: h.paciente_id, fecha: v('ha_ctrl'), hora: '09:00',
        motivo: 'Control post-hospitalización', notas: h.codigo || '' }) });
    }
    toast('Alta registrada', 'verde');
    await hospRefrescar('alta');
  } finally { btn.disabled = false; }
}

const HP_EST = { realizado: 'Administrado', no_administrado: 'No administrado', omitido: 'Omitido', cancelado: 'Cancelado' };
function hdTratamientos() {
  const h = _hospDet.hospitalizacion, act = h.estado === 'activa', t = _hospDet.tratamientos || [];
  const pend = t.filter(x => x.estado === 'programado');
  const hist = t.filter(x => x.estado !== 'programado').sort((a, b) => String(b.prog_txt).localeCompare(String(a.prog_txt)));
  const ahora = new Date();
const nombres = [...new Set([
  ..._hospMeds.map(m => m.producto),
  ...(typeof _productos !== 'undefined' ? _productos : []).map(p => p.nombre)
])];
const sug = nombres.map(n => `<option value="${hE(n)}">`).join('');
const form = act ? `
    <div class="hp-form">
      <div class="hp-form-t">Programar tratamiento</div>
      <div class="form-row">
        <div class="field"><label>Medicamento / procedimiento *</label><input type="text" id="ht_prod" list="ht_dl" autocomplete="off" onchange="hdAutoMed(this.value)"><datalist id="ht_dl">${sug}</datalist></div>
        <div class="field"><label>Dosis</label>
  <div style="display:flex;gap:6px;">
    <input type="text" id="ht_dosis" placeholder="Ej. 5 mg/kg · 2 ml" style="flex:1;min-width:0;">
    <button type="button" class="btn btn-ghost btn-sm" title="Calcular dosis" onclick="dcAbrir()">🧮</button>
  </div>
</div>
      </div>
      <div class="form-row">
        <div class="field"><label>Vía</label><select id="ht_via">${hOpts(['Oral', 'IV', 'IM', 'SC', 'Tópica', 'Otra'])}</select></div>
        <div class="field"><label>Primera dosis *</label><input type="datetime-local" id="ht_primera" value="${hNow()}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Repetir cada (horas)</label><input type="number" min="1" step="0.5" id="ht_horas" placeholder="Ej. 8"></div>
        <div class="field"><label>Número de dosis</label><input type="number" min="1" max="60" id="ht_n" value="1"></div>
      </div>
      <div class="field"><label>Instrucciones</label><input type="text" id="ht_instr" placeholder="Con alimento, diluir, etc."></div>
      <button class="btn btn-primary btn-sm" id="ht_btn" onclick="hdGuardarTratamiento()">+ Programar</button>
    </div>` : '';
  const pendHtml = pend.length ? pend.map(x => {
    const atras = hD(x.prog_txt) < ahora;
    return `<div class="hp-tr ${atras ? 'late' : ''}">
      <div class="hp-tr-i">
        <b>${hE(x.producto)}</b> <span>${hE(x.dosis)} ${x.via ? '· ' + hE(x.via) : ''}</span>
        <small>${hF(x.prog_txt)}${atras ? ' · <b class="hp-late">ATRASADO</b>' : ''}${x.instrucciones ? ' · ' + hE(x.instrucciones) : ''}</small>
      </div>
      ${act ? `<div class="hp-tr-b">
        <button class="btn btn-primary btn-sm" onclick="hdTrEstado(${x.id},'realizado')">✓ Administrado</button>
        <button class="btn btn-ghost btn-sm" onclick="hdTrEstado(${x.id},'no_administrado')">No administrado</button>
        <button class="btn btn-ghost btn-sm" onclick="hdTrEstado(${x.id},'cancelado')">✕</button>
      </div>` : ''}
    </div>`;
  }).join('') : '<p class="hp-vacio">No hay tratamientos pendientes.</p>';
  const histHtml = hist.length ? `<div class="hp-form-t" style="margin-top:18px;">Historial de administración</div>
    <div class="table-wrap"><table><thead><tr><th>Programado</th><th>Tratamiento</th><th>Estado</th><th>Real</th><th>Cantidad</th><th>Observaciones</th><th>Por</th></tr></thead>
    <tbody>${hist.map(x => `<tr><td>${hF(x.prog_txt)}</td><td>${hE(x.producto)} ${hE(x.dosis)}</td>
      <td><span class="hp-chip ${x.estado === 'realizado' ? 'ok' : x.estado === 'cancelado' ? 'done' : 'warn'}">${HP_EST[x.estado]}</span></td>
      <td>${x.real_txt ? hF(x.real_txt) : '—'}</td><td>${hE(x.cantidad_real) || '—'}</td><td>${hE(x.observaciones) || '—'}</td><td>${hE(x.confirmado_por)}</td></tr>`).join('')}</tbody></table></div>` : '';
  return form + `<div class="hp-form-t">Pendientes (${pend.length})</div>` + pendHtml + histHtml;
}

async function hdGuardarTratamiento() {
  const v = id => document.getElementById(id).value.trim(), btn = document.getElementById('ht_btn');
  if (!v('ht_prod')) { toast('Indica el medicamento o procedimiento', 'rojo'); return; }
  btn.disabled = true;
  try {
    const d = await api(`/api/hospitalizaciones/${_hospDet.hospitalizacion.id}/tratamientos`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({
      producto: v('ht_prod'), dosis: v('ht_dosis'), via: v('ht_via'), primera: v('ht_primera').replace('T', ' ') + ':00',
      cada_horas: v('ht_horas'), num_dosis: v('ht_n'), instrucciones: v('ht_instr') }) });
    if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
    toast(`${d.dosis} dosis programada(s)`, 'verde');
    await hospRefrescar('tratamientos');
  } finally { btn.disabled = false; }
}

// ── Calculadora de dosis ─────────────────────────────────────
let _dcRes = null;
const dcN = id => parseFloat(String(document.getElementById(id).value).replace(',', '.'));
const dcFmt = n => String(Number(n.toFixed(n < 1 ? 3 : 2)));

function dcAbrir() {
  const h = _hospDet && _hospDet.hospitalizacion;
  document.getElementById('dc_peso').value = (h && h.peso_kg) || '';
  document.getElementById('dc_dosis').value = '';
  document.getElementById('dc_conc').value = '';
  dcCalc();
  abrirModal('mCalcDosis');
}

function dcCalc() {
  const peso = dcN('dc_peso'), dosis = dcN('dc_dosis'), conc = dcN('dc_conc');
  const u = document.getElementById('dc_dosis_u').value, esVol = u === 'vol';
  const fc = parseFloat(document.getElementById('dc_conc_u').value);
  const box = document.getElementById('dc_res'), btn = document.getElementById('dc_usar');
  document.getElementById('dc_conc_lbl').textContent = esVol ? 'Concentración del fármaco (opcional)' : 'Concentración del fármaco';

  if (!(peso > 0 && dosis > 0 && (esVol || conc > 0))) {
    _dcRes = null; btn.disabled = true;
    box.innerHTML = esVol
      ? 'Introduce el peso y la dosis para calcular el resultado.'
      : 'Introduce el peso, la dosis y la concentración para calcular el resultado.';
    return;
  }

  let vol, totalMg = null;
  if (esVol) {                                   // dosis en ml/kg: el volumen sale directo
    vol = dosis * peso;
    if (conc > 0) totalMg = vol * conc * fc;
  } else {
    totalMg = dosis * parseFloat(u) * peso;      // cantidad total en mg
    vol = totalMg / (conc * fc);                 // volumen en mL
  }

  const fmtTotal = mg => mg >= 1000 ? dcFmt(mg / 1000) + ' g' : mg < 1 ? dcFmt(mg * 1000) + ' µg' : dcFmt(mg) + ' mg';
  const uDosis = document.getElementById('dc_dosis_u').selectedOptions[0].text;
  const totalTxt = totalMg != null ? fmtTotal(totalMg) : '';

  _dcRes = { texto: `${dcFmt(dosis)} ${uDosis} · ${dcFmt(vol)} ml${totalTxt ? ' (' + totalTxt + ')' : ''}` };
  btn.disabled = false;
  box.innerHTML =
    (totalTxt ? `Cantidad total de fármaco: <b>${totalTxt}</b><br>` : '') +

    `Volumen a administrar: <b>${dcFmt(vol)} mL</b>`;
}

function dcUsar() {
  if (!_dcRes) return;
  document.getElementById('ht_dosis').value = _dcRes.texto;
  cerrarModal('mCalcDosis');
}


// ── Informe PDF de la hospitalización ────────────────────────
function hospInforme() {
  const d = _hospDet; if (!d) return;
  const w = window.open('', '_blank');
  if (!w) { toast('Permite las ventanas emergentes para descargar el informe', 'rojo'); return; }

  const h = d.hospitalizacion, act = h.estado === 'activa';
  const clinica = hE(RX_CLINICA.nombre || user.nombre_clinica || 'Clínica veterinaria');
  const x = v => hE(v) || '—';
  const mon = [...d.monitoreo].reverse(), notas = [...d.notas].reverse(), trat = d.tratamientos || [];
  const hechas = trat.filter(t => t.estado === 'realizado').length;
  const vacio = '<p class="vacio">Sin registros.</p>';
  const bloque = (t, v) => v ? `<div class="txt"><b>${t}</b><p>${hE(v)}</p></div>` : '';
  const dato = (l, v) => `<div class="dato"><span>${l}</span><b>${x(v)}</b></div>`;
  const EST = { programado: 'Pendiente', realizado: 'Administrado', no_administrado: 'No administrado', omitido: 'Omitido', cancelado: 'Cancelado' };
  const CLS = { programado: 'gris', realizado: 'ok', no_administrado: 'warn', omitido: 'warn', cancelado: 'gris' };

  const tMon = mon.length ? `<table class="chico"><thead><tr>
      <th>Fecha</th><th>T°</th><th>FC</th><th>FR</th><th>Mucosas</th><th>TLLC</th><th>Hidr.</th><th>Agua</th><th>Alim.</th>
      <th>Orina</th><th>Heces</th><th>Vómito</th><th>Dolor</th><th>Obs.</th></tr></thead><tbody>
      ${mon.map(r => `<tr><td>${hF(r.fecha_txt)}</td><td>${r.temperatura ?? '—'}</td><td>${x(r.fc)}</td><td>${x(r.fr)}</td>
        <td>${x(r.mucosas)}</td><td>${x(r.tllc)}</td><td>${r.hidratacion_pct ? hE(r.hidratacion_pct) + '%' : x(r.hidratacion)}</td>
        <td>${x(r.consumo_agua)}</td><td>${x(r.consumo_alimento)}</td><td>${x(r.orina)}</td><td>${x(r.heces)}</td>
        <td>${x(r.vomito)}</td><td>${x(r.dolor)}</td><td>${x(r.observaciones)}</td></tr>`).join('')}
      </tbody></table>` : vacio;

  const tTrat = trat.length ? `<table><thead><tr><th>Programado</th><th>Medicamento</th><th>Dosis · Vía</th><th>Estado</th>
      <th>Realizado</th><th>Cantidad</th><th>Observaciones</th><th>Por</th></tr></thead><tbody>
      ${trat.map(t => `<tr><td>${hF(t.prog_txt)}</td><td><b>${x(t.producto)}</b></td>
        <td>${x([t.dosis, t.via].filter(Boolean).join(' · '))}</td>
        <td><span class="chip ${CLS[t.estado] || 'gris'}">${EST[t.estado] || hE(t.estado)}</span></td>
        <td>${t.real_txt ? hF(t.real_txt) : '—'}</td><td>${x(t.cantidad_real)}</td><td>${x(t.observaciones)}</td><td>${x(t.confirmado_por)}</td></tr>`).join('')}

      </tbody></table>` : vacio;

  const tEvo = notas.length ? notas.map(n => `<div class="nota ${hE(n.tipo)}">
      <div class="nota-t"><span class="chip gris">${HP_TIPO[n.tipo] || hE(n.tipo)}</span><small>${hF(n.fecha_txt)} · ${x(n.usuario)}</small></div>
      <p>${hE(n.nota)}</p></div>`).join('') : vacio;

  const alta = !act ? `<section><h2>Alta hospitalaria</h2>
      <div class="datos">${dato('Fecha de alta', hF(h.alta_txt))}${dato('Condición', h.condicion_alta)}${dato('Autorizó', h.alta_por)}</div>
      ${bloque('Resumen de la estancia', h.resumen_alta)}${bloque('Indicaciones al propietario', h.indicaciones_alta)}
      ${h.control_txt ? bloque('Próximo control', fmtFecha(h.control_txt)) : ''}</section>` : '';

  const titulo = `Informe ${h.codigo || ''} - ${h.paciente_nombre}`;
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${hE(titulo)}</title><style>
    @page{size:A4;margin:12mm}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1c2733;font-size:11px;line-height:1.45;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .hd{background:#0f6b4f;color:#fff;border-radius:12px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:16px}
    .hd h1{margin:0;font-size:20px}.hd small{opacity:.85;font-size:11px}
    .cod{background:rgba(255,255,255,.18);border-radius:20px;padding:5px 14px;font-weight:700;font-size:12px;white-space:nowrap}
    .pac{display:flex;gap:14px;align-items:center;border:1px solid #dbe5ee;background:#f6f9fd;border-radius:12px;padding:12px 16px;margin:14px 0}
    .pac .av{width:46px;height:46px;border-radius:50%;background:#e1f1ea;display:grid;place-items:center;font-size:24px;flex:none}
    .pac h3{margin:0;font-size:15px}.pac span{color:#5b6b7b}
    .kpis{display:flex;gap:10px;margin-bottom:6px}
    .kpi{flex:1;border:1px solid #dbe5ee;border-radius:10px;padding:8px 12px;text-align:center}
    .kpi b{display:block;font-size:17px;color:#0f6b4f}.kpi span{font-size:10px;color:#5b6b7b;text-transform:uppercase;letter-spacing:.04em}
    section{margin-top:16px}
    h2{font-size:12.5px;text-transform:uppercase;letter-spacing:.07em;color:#0f6b4f;margin:0 0 8px;padding-left:9px;border-left:4px solid #0f6b4f}
    .datos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}
    .dato{border:1px solid #e3eaf1;border-radius:8px;padding:6px 10px}
    .dato span{display:block;font-size:9.5px;color:#5b6b7b;text-transform:uppercase;letter-spacing:.04em}
    .txt{background:#f6f9fd;border-radius:8px;padding:8px 12px;margin-bottom:6px;page-break-inside:avoid}
    .txt b{font-size:10px;text-transform:uppercase;color:#5b6b7b;letter-spacing:.04em}.txt p{margin:3px 0 0;white-space:pre-line}

    table{width:100%;border-collapse:collapse}
    th{background:#0f6b4f;color:#fff;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.03em;padding:6px 7px}
    td{padding:5px 7px;border-bottom:1px solid #e3eaf1;vertical-align:top}
    tbody tr:nth-child(even) td{background:#f8fbfd}
    thead{display:table-header-group}tr{page-break-inside:avoid}
    table.chico{font-size:8.5px}table.chico th{font-size:8px;padding:5px 4px}table.chico td{padding:4px}
    .chip{display:inline-block;border-radius:20px;padding:2px 9px;font-size:9.5px;font-weight:700;white-space:nowrap}
    .chip.ok{background:#dff3e8;color:#0b6b3f}.chip.warn{background:#fff1d6;color:#8a5a00}.chip.gris{background:#e8eef4;color:#4a5b6b}
    .nota{border-left:3px solid #9fb3c8;background:#f8fbfd;border-radius:0 8px 8px 0;padding:7px 12px;margin-bottom:6px;page-break-inside:avoid}
    .nota.incidencia{border-color:#d9534f}.nota.relevo{border-color:#e0a100}.nota.evolucion{border-color:#0f6b4f}
    .nota-t{display:flex;justify-content:space-between;align-items:center;gap:8px}.nota-t small{color:#5b6b7b}
    .nota p{margin:4px 0 0;white-space:pre-line}
    .vacio{color:#7a8794;font-style:italic;margin:4px 0}
    .firma{margin-top:48px;display:flex;justify-content:flex-end}
    .firma div{width:230px;border-top:1.5px dashed #555;text-align:center;padding-top:5px;color:#444}
    .pie{margin-top:22px;border-top:1px solid #dbe5ee;padding-top:8px;color:#7a8794;font-size:9.5px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="hd">
      <div><h1>Informe de hospitalización</h1><small>${clinica}</small></div>
      <span class="cod">${x(h.codigo)}</span>
    </div>
    <div class="pac">
      <div class="av">${String(h.especie || '').toLowerCase().includes('gat') ? '🐱' : '🐶'}</div>
      <div><h3>${x(h.paciente_nombre)}</h3><span>${x(h.especie)}${h.raza ? ' · ' + hE(h.raza) : ''} — Tutor: ${x(h.cliente_nombre)} · Tel. ${x(h.cliente_telefono)}</span></div>
    </div>
    <div class="kpis">
      <div class="kpi"><b>${hDur(h.ingreso_txt, act ? null : h.alta_txt)}</b><span>Estancia</span></div>
      <div class="kpi"><b>${mon.length}</b><span>Mediciones</span></div>
      <div class="kpi"><b>${hechas}/${trat.length}</b><span>Tratamientos administrados</span></div>
      <div class="kpi"><b>${notas.length}</b><span>Notas de evolución</span></div>
    </div>


    <section><h2>Datos del ingreso</h2>
      <div class="datos">${dato('Ingreso', hF(h.ingreso_txt))}${dato('Procedencia', h.procedencia)}${dato('Veterinario', h.veterinario)}
        ${dato('Estado inicial', h.estado_inicial)}${dato('Área / jaula', [h.area, h.jaula].filter(Boolean).join(' · '))}${dato('Peso', h.peso_kg ? h.peso_kg + ' kg' : '')}</div>
      ${bloque('Motivo de hospitalización', h.motivo)}${bloque('Antecedentes', h.antecedentes)}
      ${bloque('Diagnóstico', h.diagnostico)}${bloque('Plan inicial', h.plan_inicial)}
    </section>
    ${alta}
    <section><h2>Monitoreo</h2>${tMon}</section>
    <section><h2>Tratamientos</h2>${tTrat}</section>
    <section><h2>Evolución</h2>${tEvo}</section>

    <div class="firma"><div>Firma y sello del veterinario<br><b>${hE(h.veterinario || user.nombre || '')}</b></div></div>
    <div class="pie"><span>${clinica}</span><span>Generado el ${new Date().toLocaleString('es-EC')} por ${hE(user.nombre || '')}</span></div>
    <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
  </body></html>`);
  w.document.close();
}

async function hdTrEstado(id, estado) {
  const x = _hospDet.tratamientos.find(t => t.id === id); if (!x) return;
  let cantidad = '', obs = '';
  if (estado === 'realizado') {
    cantidad = prompt(`Cantidad realmente administrada de ${x.producto}:`, x.dosis || '');
    if (cantidad === null) return;
    obs = prompt('Observaciones (opcional):', '') || '';
  } else {
    obs = prompt(estado === 'cancelado' ? 'Motivo de la cancelación:' : 'Motivo por el que no se administró:');
    if (obs === null) return;
    if (!obs.trim()) { toast('El motivo es obligatorio', 'rojo'); return; }
  }
  const d = await api(`/api/hosp-tratamientos/${id}/estado`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({
    estado, cantidad_real: cantidad, observaciones: obs, fecha_real: hNow().replace('T', ' ') + ':00' }) });
  if (!d.ok) { toast(d.error || 'Error', 'rojo'); return; }
  toast('Registrado', 'verde');
  await hospRefrescar('tratamientos');
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
cargarInicio();