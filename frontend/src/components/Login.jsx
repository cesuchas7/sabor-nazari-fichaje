import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
  const [workers, setWorkers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getWorkers().then(setWorkers).catch(() => {});
  }, []);

  function pressDigit(d) {
    if (pin.length < 4) setPin(p => p + d);
  }

  function borrar() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  async function submit() {
    if (!selectedId) { setError('Selecciona tu nombre'); return; }
    if (pin.length !== 4) { setError('Introduce los 4 dígitos del PIN'); return; }
    setLoading(true);
    setError('');
    try {
      const worker = await api.login(parseInt(selectedId), pin);
      onLogin(worker);
    } catch (e) {
      setError(e.message);
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🥩</div>
          <h1 style={styles.title}>Sabor Nazarí</h1>
          <p style={styles.subtitle}>Control de presencia</p>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>¿Quién eres?</label>
          <select
            style={styles.select}
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setPin(''); setError(''); }}
          >
            <option value="">— Selecciona tu nombre —</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {selectedId && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>PIN</label>
              <div style={styles.pinDisplay}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{...styles.pinDot, background: pin.length > i ? 'var(--verde)' : 'var(--borde)'}} />
                ))}
              </div>
            </div>

            <div style={styles.keypad}>
              {digits.map((d, i) => (
                <button
                  key={i}
                  style={{
                    ...styles.key,
                    ...(d === '' ? styles.keyEmpty : {}),
                    ...(d === '⌫' ? styles.keyDelete : {})
                  }}
                  onClick={() => d === '⌫' ? borrar() : d !== '' ? pressDigit(d) : null}
                  disabled={d === ''}
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {selectedId && (
          <button
            style={{...styles.btn, opacity: loading ? 0.7 : 1}}
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)'
  },
  card: {
    background: 'var(--blanco)',
    borderRadius: '20px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  logo: { textAlign: 'center', marginBottom: '28px' },
  logoIcon: { fontSize: '48px', marginBottom: '8px' },
  title: { fontSize: '1.5rem', color: 'var(--verde)', fontWeight: '700' },
  subtitle: { fontSize: '0.9rem', color: 'var(--gris)', marginTop: '4px' },
  field: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--gris)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  select: {
    width: '100%', padding: '14px 16px', borderRadius: '10px',
    border: '2px solid var(--borde)', background: 'var(--fondo)',
    color: 'var(--texto)', appearance: 'auto'
  },
  pinDisplay: {
    display: 'flex', gap: '16px', justifyContent: 'center', padding: '8px 0'
  },
  pinDot: {
    width: '18px', height: '18px', borderRadius: '50%',
    border: '2px solid var(--borde)', transition: 'background 0.2s'
  },
  keypad: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px', marginBottom: '20px'
  },
  key: {
    padding: '18px', fontSize: '1.4rem', fontWeight: '600',
    background: 'var(--fondo)', color: 'var(--texto)',
    borderRadius: '12px', border: '2px solid var(--borde)'
  },
  keyEmpty: { background: 'transparent', border: 'none', cursor: 'default' },
  keyDelete: { color: 'var(--rojo)' },
  btn: {
    width: '100%', padding: '16px', fontSize: '1.05rem',
    background: 'var(--verde)', color: 'white', borderRadius: '12px',
    fontWeight: '700', letterSpacing: '0.03em'
  },
  error: {
    color: 'var(--rojo)', fontSize: '0.9rem', textAlign: 'center',
    marginBottom: '12px', fontWeight: '600'
  }
};
