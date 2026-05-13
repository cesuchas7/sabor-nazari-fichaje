import { useState, useEffect } from 'react';
import { api } from '../api';

function fmtHora(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtFecha() {
  return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Fichaje({ worker, onLogout, onAdmin }) {
  const [fichaje, setFichaje] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    api.fichajeHoy().then(setFichaje).catch(() => {});
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function accion(tipo) {
    setLoading(true);
    setError('');
    try {
      const updated = await api.accion(tipo);
      setFichaje(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function getEstado() {
    if (!fichaje) return 'sin_entrada';
    if (fichaje.salida) return 'terminado';
    if (fichaje.inicio_descanso && !fichaje.fin_descanso) return 'en_descanso';
    if (fichaje.entrada) return 'trabajando';
    return 'sin_entrada';
  }

  const estado = getEstado();

  const botones = {
    sin_entrada: [{ accion: 'entrada', label: 'Fichar entrada', color: '#1a472a', icon: '▶' }],
    trabajando: [
      { accion: 'inicio_descanso', label: 'Iniciar descanso', color: '#e67e22', icon: '⏸' },
      { accion: 'salida', label: 'Fichar salida', color: '#c0392b', icon: '⏹' }
    ],
    en_descanso: [{ accion: 'fin_descanso', label: 'Fin de descanso', color: '#2980b9', icon: '▶' }],
    terminado: []
  };

  const estadoTexto = {
    sin_entrada: { texto: 'Sin fichar', color: '#7f8c8d' },
    trabajando: { texto: 'Trabajando', color: '#1a472a' },
    en_descanso: { texto: 'En descanso', color: '#e67e22' },
    terminado: { texto: 'Jornada completada', color: '#2980b9' }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>Hola, <strong>{worker.name}</strong></p>
          <p style={styles.fecha}>{fmtFecha()}</p>
        </div>
        <div style={styles.headerBtns}>
          {worker.role === 'admin' && (
            <button style={styles.adminBtn} onClick={onAdmin}>Admin</button>
          )}
          <button style={styles.logoutBtn} onClick={onLogout}>Salir</button>
        </div>
      </div>

      <div style={styles.reloj}>
        {hora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>

      <div style={styles.estadoBadge}>
        <span style={{ ...styles.estadoPunto, background: estadoTexto[estado].color }} />
        <span style={{ color: estadoTexto[estado].color, fontWeight: '700' }}>{estadoTexto[estado].texto}</span>
      </div>

      <div style={styles.registros}>
        <Registro label="Entrada" hora={fmtHora(fichaje?.entrada)} />
        <Registro label="Ini. descanso" hora={fmtHora(fichaje?.inicio_descanso)} />
        <Registro label="Fin descanso" hora={fmtHora(fichaje?.fin_descanso)} />
        <Registro label="Salida" hora={fmtHora(fichaje?.salida)} />
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.botones}>
        {botones[estado].map(b => (
          <button
            key={b.accion}
            style={{ ...styles.boton, background: b.color, opacity: loading ? 0.7 : 1 }}
            onClick={() => accion(b.accion)}
            disabled={loading}
          >
            <span style={styles.botonIcon}>{b.icon}</span>
            {b.label}
          </button>
        ))}
        {estado === 'terminado' && (
          <div style={styles.completado}>
            ✅ Jornada registrada correctamente
          </div>
        )}
      </div>
    </div>
  );
}

function Registro({ label, hora }) {
  return (
    <div style={styles.registro}>
      <span style={styles.registroLabel}>{label}</span>
      <span style={{ ...styles.registroHora, color: hora === '--:--' ? '#bdc3c7' : 'var(--texto)' }}>{hora}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '20px', maxWidth: '420px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  greeting: { fontSize: '1.1rem', color: 'var(--texto)' },
  fecha: { fontSize: '0.85rem', color: 'var(--gris)', marginTop: '2px', textTransform: 'capitalize' },
  headerBtns: { display: 'flex', gap: '8px' },
  adminBtn: { padding: '8px 14px', background: 'var(--verde)', color: 'white', borderRadius: '8px', fontSize: '0.85rem' },
  logoutBtn: { padding: '8px 14px', background: 'var(--fondo)', color: 'var(--gris)', border: '2px solid var(--borde)', borderRadius: '8px', fontSize: '0.85rem' },
  reloj: { textAlign: 'center', fontSize: '3.5rem', fontWeight: '700', color: 'var(--texto)', letterSpacing: '-0.02em', margin: '8px 0' },
  estadoBadge: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '24px' },
  estadoPunto: { width: '10px', height: '10px', borderRadius: '50%' },
  registros: { background: 'var(--blanco)', borderRadius: '16px', padding: '4px 0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  registro: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--borde)' },
  registroLabel: { fontSize: '0.9rem', color: 'var(--gris)', fontWeight: '500' },
  registroHora: { fontSize: '1.1rem', fontWeight: '700', fontVariantNumeric: 'tabular-nums' },
  botones: { display: 'flex', flexDirection: 'column', gap: '12px' },
  boton: { padding: '20px', color: 'white', fontSize: '1.1rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '700' },
  botonIcon: { fontSize: '1.2rem' },
  completado: { textAlign: 'center', padding: '20px', background: 'var(--blanco)', borderRadius: '14px', color: 'var(--verde)', fontWeight: '600', fontSize: '1rem' },
  error: { color: 'var(--rojo)', textAlign: 'center', marginBottom: '12px', fontWeight: '600' }
};
