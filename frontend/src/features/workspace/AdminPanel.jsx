import { useCallback, useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import { api } from '../../lib/api.js';

const dateTimeFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : dateTimeFormat.format(date);
}

export default function AdminPanel({ user, notify }) {
  const [accounts, setAccounts] = useState([]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [accountResult, eventResult] = await Promise.all([api('/api/admin/users'), api('/api/admin/events')]);
      setAccounts(accountResult.users || []);
      setEvents(eventResult.events || []);
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeRole(account) {
    if (account.id === user.id) return;
    const role = account.role === 'admin' ? 'user' : 'admin';
    const label = role === 'admin' ? 'administrador' : 'usuario';
    if (!window.confirm(`¿Cambiar el rol de ${account.name} a ${label}?`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(account.id)}/role`, { method: 'PATCH', body: { role } });
      notify('El rol quedó actualizado.');
      await load();
    } catch (caught) { setError(caught.message); }
  }

  return (
    <section className="settings-page admin-page" aria-labelledby="admin-title">
      <header className="page-heading">
        <div><p className="page-reference">CUENTA / ADMINISTRACIÓN</p><h1 id="admin-title">Administración.</h1></div>
        <p>Administrá los roles y revisá la bitácora de seguridad.</p>
      </header>
      {error && <p className="form-message form-message-error admin-error" role="alert">{error}</p>}
      <section className="admin-section" aria-labelledby="users-heading">
        <div className="section-heading"><div><p className="page-reference">DIRECTORIO</p><h2 id="users-heading">Cuentas</h2></div><span>{busy ? 'Cargando…' : `${accounts.length} cuentas`}</span></div>
        <div className="table-scroll"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th><span className="sr-only">Acción</span></th></tr></thead>
          <tbody>{accounts.map((account) => <tr key={account.id}><td>{account.name}</td><td>{account.email}</td><td>{account.role === 'admin' ? 'Administrador' : 'Usuario'}</td><td><Button variant="text" disabled={account.id === user.id} onClick={() => changeRole(account)}>{account.role === 'admin' ? 'Quitar acceso admin' : 'Hacer administrador'}</Button></td></tr>)}</tbody>
        </table></div>
        {!busy && !accounts.length && <p className="table-empty">No hay cuentas para mostrar.</p>}
      </section>
      <section className="admin-section" aria-labelledby="events-heading">
        <div className="section-heading"><div><p className="page-reference">REGISTRO</p><h2 id="events-heading">Bitácora de seguridad</h2></div><span>{events.length} eventos</span></div>
        <div className="table-scroll"><table><thead><tr><th>Evento</th><th>Cuenta</th><th>Fecha</th></tr></thead>
          <tbody>{events.map((event) => <tr key={event.id}><td>{event.event}</td><td>{event.actorName || 'No disponible'}</td><td>{formatDate(event.createdAt)}</td></tr>)}</tbody>
        </table></div>
        {!busy && !events.length && <p className="table-empty">Todavía no hay eventos registrados.</p>}
      </section>
    </section>
  );
}
