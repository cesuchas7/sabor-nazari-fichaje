import { useState, useEffect } from 'react';
import { api } from '../api';

function fmtHora(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function toInputTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function combinarFechaHora(fecha, hora) {
  if (!hora) return null;
  return new Date(`${fecha}T${hora}:00`).toISOString();
}

export default function Admin({ onVolver }) {
  const [tab, setTab] = useState('fichajes');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [fichajes, setFichajes] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [editando, setEditando] = useState(null);
  const [nuevoWorker, setNuevoWorker] = useState({ name: '', pin: '', role: 'worker' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'fichajes') cargarFichajes();
    if (tab === 'trabajadores') cargarWorkers();
  }, [tab, fecha]);

  async function cargarFichajes() {
    try { setFichajes(await api.adminFichajes(fecha)); } catch {}
  }

  async function cargarWorkers() {
    try { setWorkers(await api.adminWorkers()); } catch {}
  }

  async function guardarEdicion() {
    try {
      await api.adminEditar(editando.id, {
        entrada: combinarFechaHora(editando.fecha, editando._entrada),
        inicio_descanso: combinarFechaHora(editando.fecha, editando._inicio_descanso),
        fin_descanso: combinarFechaHora(editando.fecha, editando._fin_descanso),
        salida: combinarFechaHora(editando.fecha, editando._salida)
      });
      setEditando(null);
      setMsg('Guardado correctamente');
      setTimeout(() => setMsg(''), 3000);
      cargarFichajes();
    } catch (e) {
      setError(e.message);
    }
  }

  async function guardarWorker(w) {
    try {
      await api.adminEditWorker(w.id, { active: w.active ? 0 : 1 });
      cargarWorkers();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addWorker() {
    setError('');
    try {
      await api.adminAddWorker(nuevoWorker);
      setNuevoWorker({ name: '', pin: '', role: 'worker' });
      setMsg('Trabajador añadido');
      setTimeout(() => setMsg(''), 3000);
      cargarWorkers();
    } catch (e) {
      setError(e.message);
    }
  }

  function abrirEdicion(f) {
    setEditando({
      ...f,
      _entrada: toInputTime(f.entrada),
      _inicio_descanso: toInputTime(f.inicio_descanso),
      _fin_descanso: toInputTime(f.fin_descanso),
      _salida: toInputTime(f.salida)
    });
  }

  const exportUrl = `/api/fichajes/admin/export?desde=${fecha}&hasta=${fecha}`;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onVolver}>← Volver</button>
        <h2 style={styles.titulo}>Panel Admin</h2>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(tab === 'fichajes' ? styles.tabActive : {}) }} onClick={() => setTab('fichajes')}>Fichajes</button>
        <button style={{ ...styles.tab, ...(tab === 'trabajadores' ? styles.tabActive : {}) }} onClick={() => setTab('trabajadores')}>Trabajadores</button>
      </div>

      {msg && <div style={styles.success}>{msg}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {tab === 'fichajes' && (
        <div>
          <div style={styles.toolbar}>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={styles.dateInput} />
            <a href={exportUrl} style={styles.exportBtn} download>Exportar CSV</a>
          </div>

          {fichajes.length === 0 ? (
            <p style={styles.empty}>No hay fichajes para esta fecha</p>
          ) : (
            fichajes.map(f => (
              <div key={f.id} style={styles.fichajeCard}>
                <div style={styles.fichajeHeader}>
                  <strong style={styles.workerName}>{f.worker_name}</strong>
                  {f.editado ? <span style={styles.editadoBadge}>Editado</span> : null}
                  <button style={styles.editBtn} onClick={() => abrirEdicion(f)}>Editar</button>
                </div>
                <div style={styles.fichajeHoras}>
                  <Hora label="Entrada" hora={fmtHora(f.entrada)} />
                  <Hora label="Ini. desc." hora={fmtHora(f.inicio_descanso)} />
                  <Hora label="Fin desc." hora={fmtHora(f.fin_descanso)} />
                  <Hora label="Salida" hora={fmtHora(f.salida)} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'trabajadores' && (
        <div>
          <div style={styles.addCard}>
            <h3 style={styles.addTitle}>Añadir trabajador</h3>
            <input
              style={styles.input} placeholder="Nombre"
              value={nuevoWorker.name} onChange={e => setNuevoWorker(p => ({ ...p, name: e.target.value }))}
            />
            <input
              style={styles.input} placeholder="PIN (4 dígitos)" maxLength={4} type="tel"
              value={nuevoWorker.pin} onChange={e => setNuevoWorker(p => ({ ...p, pin: e.target.value }))}
            />
            <select
              style={styles.input} value={nuevoWorker.role}
              onChange={e => setNuevoWorker(p => ({ ...p, role: e.target.value }))}
            >
              <option value="worker">Trabajador</option>
              <option value="admin">Admin</option>
            </select>
            <button style={styles.addBtn} onClick={addWorker}>Añadir</button>
          </div>

          {workers.map(w => (
            <div key={w.id} style={{ ...styles.workerCard, opacity: w.active ? 1 : 0.5 }}>
              <div>
                <strong>{w.name}</strong>
                <span style={styles.roleBadge}>{w.role === 'admin' ? 'Admin' : 'Trabajador'}</span>
              </div>
              <button
                style={{ ...styles.toggleBtn, background: w.active ? '#c0392b' : '#1a472a' }}
                onClick={() => guardarWorker(w)}
              >
                {w.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Editar fichaje — {editando.worker_name}</h3>
            <p style={styles.modalFecha}>{editando.fecha}</p>
            {['entrada', 'inicio_descanso', 'fin_descanso', 'salida'].map(campo => (
              <div key={campo} style={styles.modalField}>
                <label style={styles.modalLabel}>
                  {campo === 'entrada' ? 'Entrada' : campo === 'inicio_descanso' ? 'Inicio descanso' : campo === 'fin_descanso' ? 'Fin descanso' : 'Salida'}
                </label>
                <input
                  type="time" style={styles.timeInput}
                  value={editando[`_${campo}`]}
                  onChange={e => setEditando(p => ({ ...p, [`_${campo}`]: e.target.value }))}
                />
              </div>
            ))}
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setEditando(null)}>Cancelar</button>
              <button style={styles.saveBtn} onClick={guardarEdicion}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Hora({ label, hora }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.72rem', color: '#7f8c8d', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: hora ? 'var(--texto)' : '#bdc3c7' }}>{hora || '--:--'}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100dvh', padding: '20px', maxWidth: '480px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  backBtn: { padding: '8px 14px', background: 'var(--fondo)', border: '2px solid var(--borde)', borderRadius: '8px', color: 'var(--texto)', fontSize: '0.9rem' },
  titulo: { fontSize: '1.2rem', fontWeight: '700' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: { flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--fondo)', border: '2px solid var(--borde)', color: 'var(--gris)', fontWeight: '600' },
  tabActive: { background: 'var(--verde)', color: 'white', border: '2px solid var(--verde)' },
  toolbar: { display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' },
  dateInput: { flex: 1, padding: '10px 12px', borderRadius: '8px', border: '2px solid var(--borde)', background: 'var(--blanco)' },
  exportBtn: { padding: '10px 14px', background: 'var(--azul)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600' },
  empty: { textAlign: 'center', color: 'var(--gris)', padding: '40px 0' },
  fichajeCard: { background: 'var(--blanco)', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  fichajeHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  workerName: { flex: 1, fontSize: '1rem' },
  editadoBadge: { fontSize: '0.75rem', background: '#ffeaa7', color: '#e67e22', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' },
  editBtn: { padding: '6px 14px', background: 'var(--verde)', color: 'white', borderRadius: '8px', fontSize: '0.85rem' },
  fichajeHoras: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  addCard: { background: 'var(--blanco)', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  addTitle: { fontSize: '1rem', marginBottom: '14px', color: 'var(--verde)' },
  input: { display: 'block', width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid var(--borde)', marginBottom: '10px', background: 'var(--fondo)' },
  addBtn: { width: '100%', padding: '14px', background: 'var(--verde)', color: 'white', borderRadius: '10px', fontSize: '1rem', fontWeight: '700' },
  workerCard: { background: 'var(--blanco)', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  roleBadge: { fontSize: '0.75rem', background: 'var(--fondo)', color: 'var(--gris)', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' },
  toggleBtn: { padding: '8px 14px', color: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 },
  modalCard: { background: 'var(--blanco)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '340px' },
  modalTitle: { fontSize: '1rem', fontWeight: '700', marginBottom: '4px' },
  modalFecha: { color: 'var(--gris)', fontSize: '0.85rem', marginBottom: '16px' },
  modalField: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  modalLabel: { fontSize: '0.9rem', color: 'var(--gris)' },
  timeInput: { padding: '8px 12px', borderRadius: '8px', border: '2px solid var(--borde)', fontSize: '1rem', fontVariantNumeric: 'tabular-nums' },
  modalBtns: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '14px', background: 'var(--fondo)', border: '2px solid var(--borde)', borderRadius: '10px', fontWeight: '600' },
  saveBtn: { flex: 1, padding: '14px', background: 'var(--verde)', color: 'white', borderRadius: '10px', fontWeight: '600' },
  success: { background: '#d5f5e3', color: '#1a472a', padding: '12px', borderRadius: '10px', marginBottom: '12px', fontWeight: '600', textAlign: 'center' },
  error: { background: '#fde8e8', color: 'var(--rojo)', padding: '12px', borderRadius: '10px', marginBottom: '12px', fontWeight: '600', textAlign: 'center' }
};
