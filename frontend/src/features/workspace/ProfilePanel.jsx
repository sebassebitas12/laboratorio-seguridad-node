import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import { api } from '../../lib/api.js';

export default function ProfilePanel({ user, onUserChange }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { setName(user.name); }, [user.name]);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    const body = { name: name.trim() };
    if (phone.trim()) body.phone = phone.trim();
    try {
      const result = await api('/api/profile', { method: 'PATCH', body });
      onUserChange(result.user);
      setPhone('');
      setSuccess('Los cambios quedaron guardados.');
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="settings-page" aria-labelledby="profile-title">
      <header className="page-heading">
        <div><p className="page-reference">CUENTA / PERFIL</p><h1 id="profile-title">Tus datos.</h1></div>
        <p>Actualizá la información asociada a tu cuenta.</p>
      </header>
      <div className="profile-content">
        <div className="profile-note">
          <h2>Información personal</h2>
          <p>Tu teléfono se guarda cifrado y solo mostramos sus últimos cuatro dígitos.</p>
        </div>
        <form className="settings-form" onSubmit={save}>
          <Field label="Nombre" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={80} />
          <Field label="Correo electrónico" type="email" value={user.email} disabled />
          <Field label="Teléfono guardado" value={user.phoneMasked || 'Sin registrar'} disabled />
          <Field label="Nuevo teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" maxLength={30} placeholder="Dejá vacío para conservar el actual" />
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          {success && <p className="form-message form-message-success" role="status">{success}</p>}
          <div className="settings-submit"><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
        </form>
      </div>
    </section>
  );
}
