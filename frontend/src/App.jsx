import { useState, useEffect } from 'react';
import Login from './components/Login';
import Fichaje from './components/Fichaje';
import Admin from './components/Admin';
import { api } from './api';

export default function App() {
  const [worker, setWorker] = useState(null);
  const [view, setView] = useState('fichaje');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.me()
      .then(w => { setWorker(w); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  function handleLogin(w) {
    setWorker(w);
    setView('fichaje');
  }

  async function handleLogout() {
    await api.logout().catch(() => {});
    setWorker(null);
    setView('fichaje');
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)' }}>
        <div style={{ color: 'white', fontSize: '1.2rem' }}>Cargando...</div>
      </div>
    );
  }

  if (!worker) return <Login onLogin={handleLogin} />;

  if (view === 'admin' && worker.role === 'admin') {
    return <Admin onVolver={() => setView('fichaje')} />;
  }

  return (
    <Fichaje
      worker={worker}
      onLogout={handleLogout}
      onAdmin={() => setView('admin')}
    />
  );
}
