import { useEffect, useState } from 'react';
import Brand from '../../components/Brand.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import { api, refreshSession } from '../../lib/api.js';

const viewCopy = {
  login: { title: 'Volvé a tu espacio.', intro: 'Ingresá con los datos de tu cuenta para continuar.' },
  register: { title: 'Empezá por acá.', intro: 'Creá una cuenta para guardar y administrar tus notas.' },
  forgot: { title: 'Recuperá el acceso.', intro: 'Te enviaremos un enlace para cambiar tu contraseña.' },
  reset: { title: 'Elegí otra contraseña.', intro: 'Usá una clave distinta a las que ya tenés.' },
  unavailable: { title: 'No pudimos conectar.', intro: 'El servidor no respondió. Revisá la conexión e intentá otra vez.' },
};

function PaperStudy() {
  return (
    <div className="paper-study" aria-hidden="true">
      <div className="study-page study-page-back"><span /><span /><span /></div>
      <div className="study-page study-page-front">
        <div className="study-margin" />
        <span className="study-date">IDEA · 01</span>
        <i className="study-line study-line-long" />
        <i className="study-line study-line-mid" />
        <i className="study-line study-line-short" />
        <i className="study-line study-line-long" />
        <i className="study-line study-line-mid" />
        <div className="study-corner" />
      </div>
      <span className="study-index">01 / 03</span>
    </div>
  );
}

export default function AuthScreen({ initialView = 'login', onAuthenticated, onRetry }) {
  const [view, setView] = useState(initialView);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const copy = viewCopy[view] || viewCopy.login;

  useEffect(() => {
    if (resetToken) {
      setView('reset');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [resetToken]);

  function changeView(next) {
    setError('');
    setSuccess('');
    setView(next);
  }

  async function submit(event, work) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try { await work(event.currentTarget); }
    catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }

  async function authenticate(action, body) {
    await api(`/api/auth/${action}`, { method: 'POST', body });
    const session = await refreshSession();
    onAuthenticated(session.user || null);
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Brand />
        <div className="auth-header-note"><span className="header-rule" />Un lugar para tus ideas</div>
      </header>

      <div className="auth-body">
        <section className="auth-story" aria-labelledby="story-title">
          <div className="story-rail" aria-hidden="true"><span>R</span><i /></div>
          <div className="story-copy">
            <h1 id="story-title">Un lugar<br />para <em>tus ideas.</em></h1>
            <p>Guardá tus notas, volvé a ellas cuando las necesités y conservá cada idea en su lugar.</p>
            <PaperStudy />
          </div>
        </section>

        <section className="auth-form-region" aria-labelledby="auth-title">
          <div className="form-index"><span>{view === 'login' ? '01' : view === 'register' ? '02' : '03'}</span><i /></div>
          <div className="auth-form-inner">
            <h2 id="auth-title">{copy.title}</h2>
            <p className="auth-intro">{copy.intro}</p>

            {view === 'login' && (
              <form className="form-stack" onSubmit={(event) => submit(event, (form) => authenticate('login', { email: form.elements.email.value.trim(), password: form.elements.password.value }))}>
                <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" />
                <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="Tu contraseña" />
                <div className="form-utility"><button type="button" className="link-button" onClick={() => changeView('forgot')}>¿Olvidaste tu contraseña?</button></div>
                {error && <p className="form-message form-message-error" role="alert">{error}</p>}
                <Button type="submit" disabled={busy} className="auth-submit">{busy ? 'Ingresando…' : 'Ingresar'}</Button>
                <p className="auth-switch">¿Todavía no tenés cuenta? <button type="button" className="link-button link-strong" onClick={() => changeView('register')}>Crear cuenta</button></p>
              </form>
            )}

            {view === 'register' && (
              <form className="form-stack" onSubmit={(event) => submit(event, (form) => authenticate('register', { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), password: form.elements.password.value }))}>
                <Field label="Nombre" name="name" autoComplete="name" required maxLength={80} placeholder="Cómo querés que te llamemos" />
                <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" />
                <Field label="Contraseña" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} placeholder="Creá una contraseña" hint="Al menos 12 caracteres, con mayúsculas, minúsculas y un número." />
                {error && <p className="form-message form-message-error" role="alert">{error}</p>}
                <Button type="submit" disabled={busy} className="auth-submit">{busy ? 'Creando cuenta…' : 'Crear mi cuenta'}</Button>
                <p className="auth-switch">¿Ya tenés cuenta? <button type="button" className="link-button link-strong" onClick={() => changeView('login')}>Ingresar</button></p>
              </form>
            )}

            {view === 'forgot' && (
              <form className="form-stack" onSubmit={(event) => submit(event, async (form) => { const result = await api('/api/auth/forgot-password', { method: 'POST', body: { email: form.elements.email.value.trim() } }); setSuccess(result.message || 'Si la cuenta existe, recibirás las instrucciones de recuperación.'); })}>
                <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" />
                {error && <p className="form-message form-message-error" role="alert">{error}</p>}
                {success && <p className="form-message form-message-success" role="status">{success}</p>}
                <Button type="submit" disabled={busy} className="auth-submit">{busy ? 'Enviando…' : 'Solicitar enlace'}</Button>
                <p className="auth-switch"><button type="button" className="link-button link-strong" onClick={() => changeView('login')}>Volver al ingreso</button></p>
              </form>
            )}

            {view === 'reset' && (
              <form className="form-stack" onSubmit={(event) => submit(event, async (form) => { const result = await api('/api/auth/reset-password', { method: 'POST', body: { token: resetToken, password: form.elements.password.value } }); setResetToken(''); setSuccess(result.message || 'Contraseña actualizada. Iniciá sesión de nuevo.'); })}>
                <Field label="Nueva contraseña" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} placeholder="Elegí una contraseña" hint="Al menos 12 caracteres, con mayúsculas, minúsculas y un número." />
                {error && <p className="form-message form-message-error" role="alert">{error}</p>}
                {success && <p className="form-message form-message-success" role="status">{success}</p>}
                <Button type="submit" disabled={busy || !resetToken} className="auth-submit">{busy ? 'Actualizando…' : 'Cambiar contraseña'}</Button>
                <p className="auth-switch"><button type="button" className="link-button link-strong" onClick={() => changeView('login')}>Volver al ingreso</button></p>
              </form>
            )}

            {view === 'unavailable' && (
              <div className="form-stack">
                {error && <p className="form-message form-message-error" role="alert">{error}</p>}
                <Button type="button" onClick={async () => { const recovered = await onRetry(); if (recovered) changeView('login'); else setError('No se pudo conectar. Revisá tu conexión e intentá de nuevo.'); }}>Reintentar conexión</Button>
              </div>
            )}
          </div>
          <div className="auth-form-foot"><span>RESGUARDO</span><i />Notas privadas</div>
        </section>
      </div>
    </main>
  );
}
