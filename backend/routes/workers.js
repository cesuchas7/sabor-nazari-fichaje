const express = require('express');
const router = express.Router();
const db = require('../database');

function requireAdmin(req, res, next) {
  if (!req.session.worker || req.session.worker.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

router.get('/public', async (req, res) => {
  try {
    const workers = await db.getWorkers(true);
    res.json(workers.map(w => ({ id: w.id, name: w.name })));
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const workers = await db.getWorkers();
    res.json(workers.map(w => ({ id: w.id, name: w.name, role: w.role, active: w.active })));
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, pin, role } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Nombre y PIN obligatorios' });
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'El PIN debe ser 4 dígitos' });
    const worker = await db.addWorker(name, pin, role || 'worker');
    res.json(worker);
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, pin, active } = req.body;
    const changes = {};
    if (name !== undefined) changes.name = name;
    if (pin !== undefined) changes.pin = pin;
    if (active !== undefined) changes.active = active;
    const updated = await db.updateWorker(parseInt(req.params.id), changes);
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
