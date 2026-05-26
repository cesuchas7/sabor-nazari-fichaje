const express = require('express');
const router = express.Router();
const db = require('../database');

const isAdmin = (req,res,next) => req.session.worker?.role==='admin' ? next() : res.status(403).json({error:'Acceso denegado'});

router.get('/public', async (req,res) => {
  try { res.json((await db.getWorkers(true)).map(w=>({id:w.id,name:w.name}))); }
  catch(e) { res.status(500).json({error:'Error'}); }
});

router.get('/', isAdmin, async (req,res) => {
  try { res.json(await db.getWorkers()); }
  catch(e) { res.status(500).json({error:'Error'}); }
});

router.post('/', isAdmin, async (req,res) => {
  try {
    const {name,pin,role} = req.body;
    if (!name||!pin) return res.status(400).json({error:'Nombre y PIN obligatorios'});
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({error:'PIN debe ser 4 dígitos'});
    res.json(await db.addWorker(name,pin,role||'worker'));
  } catch(e) { res.status(500).json({error:'Error'}); }
});

router.put('/:id', isAdmin, async (req,res) => {
  try {
    const {name,pin,active} = req.body;
    const changes = {};
    if (name!==undefined) changes.name=name;
    if (pin!==undefined) changes.pin=pin;
    if (active!==undefined) changes.active=active;
    const updated = await db.updateWorker(parseInt(req.params.id),changes);
    if (!updated) return res.status(404).json({error:'No encontrado'});
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:'Error'}); }
});

module.exports = router;
