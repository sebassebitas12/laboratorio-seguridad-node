import { useEffect, useState } from 'react';
import AuthScreen from './features/auth/AuthScreen.jsx';
import Workspace from './features/workspace/Workspace.jsx';
import Brand from './components/Brand.jsx';
import { api, refreshSession } from './lib/api.js';

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast" role="status" aria-live="polite">{message}</div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session) => { if (active) setUser(session.user || null); })
      .catch(() => { if (active) setSessionError(true); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} });
      await refreshSession();
      setUser(null);
    } catch (error) {
      setToast(error.message);
    }
  }

  if (!ready) {
    return <main className="boot-screen"><Brand /><p>Abriendo tu espacio</p></main>;
  }

  return (
    <>
      {user ? (
        <Workspace user={user} onLogout={signOut} notify={setToast} />
      ) : (
        <AuthScreen
          initialView={sessionError ? 'unavailable' : 'login'}
          onAuthenticated={setUser}
          onRetry={async () => {
            setSessionError(false);
            try {
              const session = await refreshSession();
              setUser(session.user || null);
              return true;
            } catch {
              setSessionError(true);
              return false;
            }
          }}
        />
      )}
      <Toast message={toast} />
    </>
  );
}
