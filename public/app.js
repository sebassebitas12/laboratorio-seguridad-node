'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { user: null, csrf: '', notes: [], selected: null, draft: false, dirty: false, view: 'notes', resetToken: null };
const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function formatDate(value, time = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : (time ? dateTimeFormat : dateFormat).format(date);
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = state.csrf;
  let response;
  try {
    response = await fetch(path, { method, headers, credentials: 'same-origin', body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Intentá de nuevo.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'No pudimos completar la solicitud. Intentá de nuevo.');
  return data;
}

function alertIn(form, kind, message) {
  const element = $(`[data-${kind}]`, form);
  if (!element) return;
  element.textContent = message || '';
  element.hidden = !message;
}

function showMessage(element, message) {
  element.textContent = message || '';
  element.hidden = !message;
}

async function withButton(button, work) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Un momento…';
  try { return await work(); } finally { button.disabled = false; button.textContent = label; }
}

let toastTimer;
function toast(message) {
  const node = $('#toast');
  showMessage(node, message);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 3500);
}

function showAuth(view) {
  $('#app-loading').hidden = true;
  $('#workspace').hidden = true;
  $('#auth').hidden = false;
  $$('.auth-view').forEach((node) => { node.hidden = node.id !== `auth-${view}`; });
  const first = $(`#auth-${view} input`);
  if (first) first.focus();
}

function fillAccount() {
  const user = state.user;
  $('#sidebar-name').textContent = user.name;
  $('#user-initials').textContent = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  $('#greeting').textContent = `Hola, ${user.name.trim().split(/\s+/)[0]}.`;
  $('#admin-nav').hidden = user.role !== 'admin';
  $('#profile-form').elements.name.value = user.name;
  $('#profile-email').value = user.email;
  $('#profile-phone-masked').value = user.phoneMasked || 'Sin registrar';
}

async function refreshSession() {
  const data = await request('/api/session');
  state.user = data.user || null;
  state.csrf = data.csrfToken || '';
  return state.user;
}

async function start() {
  try {
    await refreshSession();
    if (state.resetToken) { showAuth('reset'); return; }
    if (state.user) { await enterWorkspace(); return; }
    showAuth('login');
  } catch { showAuth('unavailable'); }
}

async function enterWorkspace() {
  fillAccount();
  $('#auth').hidden = true;
  $('#app-loading').hidden = true;
  $('#workspace').hidden = false;
  await switchView('notes', true);
}

function canLeaveEditor() {
  return !state.dirty || window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?');
}

async function switchView(view, force = false) {
  if (!force && state.view === 'notes' && view !== 'notes' && !canLeaveEditor()) return;
  if (view === 'admin' && state.user.role !== 'admin') return;
  if (view !== 'notes') state.dirty = false;
  state.view = view;
  $$('.view').forEach((node) => { node.hidden = node.id !== `view-${view}`; });
  $$('.nav-item').forEach((node) => {
    const active = node.dataset.view === view;
    node.classList.toggle('active', active);
    if (active) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
  });
  if (view === 'notes') await loadNotes();
  if (view === 'profile') { fillAccount(); $('#profile-form').elements.phone.value = ''; }
  if (view === 'admin') await loadAdmin();
}

async function loadNotes() {
  showMessage($('#notes-status'), 'Cargando tus notas…');
  try {
    const data = await request('/api/notes');
    state.notes = data.notes || [];
    state.selected = null;
    state.draft = false;
    state.dirty = false;
    showMessage($('#notes-status'), '');
    renderNotes();
    showEditor(null);
  } catch (error) {
    state.notes = [];
    renderNotes();
    showEditor(null);
    showMessage($('#notes-status'), error.message);
  }
}

function renderNotes() {
  const list = $('#notes-list');
  list.replaceChildren();
  const term = $('#note-search').value.trim().toLocaleLowerCase('es');
  const filtered = state.notes.filter((note) => `${note.title} ${note.content}`.toLocaleLowerCase('es').includes(term));
  $('#notes-count').textContent = `${state.notes.length} ${state.notes.length === 1 ? 'nota' : 'notas'}`;
  for (const note of filtered) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-row';
    button.classList.toggle('selected', String(note.id) === String(state.selected));
    button.dataset.noteId = note.id;
    const top = document.createElement('span'); top.className = 'note-row-top';
    const title = document.createElement('strong'); title.textContent = note.title;
    const time = document.createElement('time'); time.dateTime = note.updatedAt; time.textContent = formatDate(note.updatedAt);
    const summary = document.createElement('p'); summary.textContent = note.content;
    top.append(title, time); button.append(top, summary); list.append(button);
  }
  const empty = $('#notes-empty');
  showMessage(empty, filtered.length ? '' : term ? 'No encontramos notas con esa búsqueda.' : 'Todavía no tenés notas. Creá la primera cuando quieras.');
}

function showEditor(note, draft = false) {
  state.selected = note ? note.id : null;
  state.draft = draft;
  state.dirty = false;
  $('#editor-empty').hidden = Boolean(note || draft);
  $('#note-form').hidden = !note && !draft;
  $('#delete-note').hidden = !note;
  if (note || draft) {
    $('#note-title').value = note?.title || '';
    $('#note-content').value = note?.content || '';
    $('#editor-meta').textContent = note ? `Última edición: ${formatDate(note.updatedAt, true)}` : 'Nueva nota';
    alertIn($('#note-form'), 'error', '');
    updateCounter();
  }
  renderNotes();
}

function newNote() {
  if (!canLeaveEditor()) return;
  showEditor(null, true);
  $('#note-title').focus();
}

function updateCounter() {
  const count = $('#note-content').value.length;
  $('#note-counter').textContent = `${count.toLocaleString('es-CR')} caracteres`;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text || '—';
  return td;
}

async function loadAdmin() {
  showMessage($('#admin-status'), 'Cargando información…');
  try {
    const [accounts, audit] = await Promise.all([request('/api/admin/users'), request('/api/admin/events')]);
    const users = accounts.users || [];
    const events = audit.events || [];
    const usersBody = $('#admin-users'); usersBody.replaceChildren();
    const eventsBody = $('#admin-events'); eventsBody.replaceChildren();
    $('#admin-user-count').textContent = `${users.length} ${users.length === 1 ? 'cuenta' : 'cuentas'}`;
    for (const user of users) {
      const tr = document.createElement('tr');
      const action = document.createElement('td');
      const change = document.createElement('button'); change.type = 'button'; change.className = 'table-action';
      change.textContent = user.role === 'admin' ? 'Hacer usuario' : 'Hacer admin';
      change.dataset.id = user.id; change.dataset.role = user.role === 'admin' ? 'user' : 'admin';
      change.dataset.name = user.name; action.append(change);
      tr.append(cell(user.name), cell(user.email), cell(user.role === 'admin' ? 'Administrador' : 'Usuario'), action);
      usersBody.append(tr);
    }
    for (const event of events) {
      const tr = document.createElement('tr');
      tr.append(cell(event.event), cell(event.actorName || 'No disponible'), cell(formatDate(event.createdAt, true)));
      eventsBody.append(tr);
    }
    $('#admin-users-empty').hidden = users.length > 0;
    $('#admin-events-empty').hidden = events.length > 0;
    showMessage($('#admin-status'), '');
  } catch (error) { showMessage($('#admin-status'), error.message); }
}

for (const button of $$('[data-auth]')) button.addEventListener('click', () => showAuth(button.dataset.auth));
$('#retry-session').addEventListener('click', start);
for (const button of $$('.nav-item')) button.addEventListener('click', () => switchView(button.dataset.view));

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; alertIn(form, 'error', '');
  await withButton($('button[type="submit"]', form), async () => {
    try { await request('/api/auth/login', { method: 'POST', body: { email: form.elements.email.value.trim(), password: form.elements.password.value } }); form.reset(); await refreshSession(); await enterWorkspace(); }
    catch (error) { alertIn(form, 'error', error.message); }
  });
});
$('#register-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; alertIn(form, 'error', '');
  await withButton($('button[type="submit"]', form), async () => {
    try { await request('/api/auth/register', { method: 'POST', body: { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), password: form.elements.password.value } }); form.reset(); await refreshSession(); if (state.user) await enterWorkspace(); else { showAuth('login'); toast('Cuenta creada. Ya podés ingresar.'); } }
    catch (error) { alertIn(form, 'error', error.message); }
  });
});
$('#forgot-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; alertIn(form, 'error', ''); alertIn(form, 'success', '');
  await withButton($('button[type="submit"]', form), async () => {
    try { const result = await request('/api/auth/forgot-password', { method: 'POST', body: { email: form.elements.email.value.trim() } }); alertIn(form, 'success', result.message || 'Si la cuenta existe, recibirás las instrucciones de recuperación.'); }
    catch (error) { alertIn(form, 'error', error.message); }
  });
});
$('#reset-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; alertIn(form, 'error', ''); alertIn(form, 'success', '');
  await withButton($('button[type="submit"]', form), async () => {
    try { const result = await request('/api/auth/reset-password', { method: 'POST', body: { token: state.resetToken, password: form.elements.password.value } }); state.resetToken = null; form.reset(); alertIn(form, 'success', result.message || 'Contraseña actualizada. Ya podés ingresar.'); }
    catch (error) { alertIn(form, 'error', error.message); }
  });
});
$('#logout-button').addEventListener('click', async () => {
  if (!canLeaveEditor()) return;
  try { await request('/api/auth/logout', { method: 'POST', body: {} }); state.notes = []; state.selected = null; state.dirty = false; await refreshSession(); showAuth('login'); }
  catch (error) { toast(error.message); }
});
$('#new-note').addEventListener('click', newNote);
$('#empty-new-note').addEventListener('click', newNote);
$('#note-search').addEventListener('input', renderNotes);
$('#notes-list').addEventListener('click', (event) => {
  const row = event.target.closest('[data-note-id]');
  if (!row || String(row.dataset.noteId) === String(state.selected) || !canLeaveEditor()) return;
  const note = state.notes.find((item) => String(item.id) === row.dataset.noteId);
  if (note) showEditor(note);
});
$('#note-form').addEventListener('input', () => { state.dirty = true; updateCounter(); });
$('#note-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; alertIn(form, 'error', '');
  await withButton($('button[type="submit"]', form), async () => {
    try {
      const body = { title: form.elements.title.value.trim(), content: form.elements.content.value };
      const result = await request(state.draft ? '/api/notes' : `/api/notes/${encodeURIComponent(state.selected)}`, { method: state.draft ? 'POST' : 'PATCH', body });
      const saved = result.note;
      const index = state.notes.findIndex((note) => String(note.id) === String(saved.id));
      if (index === -1) state.notes.unshift(saved); else { state.notes.splice(index, 1); state.notes.unshift(saved); }
      showEditor(saved); toast('Nota guardada.');
    } catch (error) { alertIn(form, 'error', error.message); }
  });
});
$('#delete-note').addEventListener('click', async () => {
  if (!state.selected || !window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
  try { await request(`/api/notes/${encodeURIComponent(state.selected)}`, { method: 'DELETE' }); state.notes = state.notes.filter((note) => String(note.id) !== String(state.selected)); showEditor(null); toast('Nota eliminada.'); }
  catch (error) { alertIn($('#note-form'), 'error', error.message); }
});
$('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; alertIn(form, 'error', ''); alertIn(form, 'success', '');
  await withButton($('button[type="submit"]', form), async () => {
    try { const body = { name: form.elements.name.value.trim() }; if (form.elements.phone.value.trim()) body.phone = form.elements.phone.value.trim(); const result = await request('/api/profile', { method: 'PATCH', body }); state.user = result.user; form.elements.phone.value = ''; fillAccount(); alertIn(form, 'success', 'Datos actualizados.'); }
    catch (error) { alertIn(form, 'error', error.message); }
  });
});
$('#admin-users').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-id]'); if (!button) return;
  const label = button.dataset.role === 'admin' ? 'administrador' : 'usuario';
  if (!window.confirm(`¿Cambiar el rol de ${button.dataset.name} a ${label}?`)) return;
  await withButton(button, async () => {
    try { await request(`/api/admin/users/${encodeURIComponent(button.dataset.id)}/role`, { method: 'PATCH', body: { role: button.dataset.role } }); await refreshSession(); if (state.user?.role !== 'admin') { fillAccount(); await switchView('notes', true); } else await loadAdmin(); toast('Rol actualizado.'); }
    catch (error) { showMessage($('#admin-status'), error.message); }
  });
});

const query = new URLSearchParams(window.location.search);
if (query.has('token')) {
  state.resetToken = query.get('token');
  window.history.replaceState(null, '', window.location.pathname);
}
start();
