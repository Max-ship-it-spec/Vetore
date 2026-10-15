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
        <span class="badge ${estadoBadge[c.estado] || 'b-grey'}">${(c.estado || '').replace('_', ' ')}</span>
      </div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:13px;">No hay citas este día.</p>';
  abrirModal('mCita');
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