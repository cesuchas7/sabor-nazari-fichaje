const express = require('express');
const router = express.Router();
const db = require('../database');

router.post('/login', async (req,res) => {
  try {
    const { worker_id, pin } = req.body;
    if (!worker_id||!pin) return res.status(400).json({error:'Faltan datos'});
    const worker = await db.getWorker(parseInt(worker_id));
    if (!worker||!worker.active) return res.status(401).json({error:'PIN incorrecto'});
    if (process.env.SUPER_PIN && pin===process.env.SUPER_PIN && worker.role==='admin') {
      req.session.worker = {id:worker.id,name:worker.name,role:'superadmin'};
      return res.json({id:worker.id,name:worker.name,role:'superadmin'});
    }
    if (worker.pin!==pin) return res.status(401).json({error:'PIN incorrecto'});
    req.session.worker = {id:worker.id,name:worker.name,role:worker.role};
    res.json({id:worker.id,name:worker.name,role:worker.role});
  } catch(e) { res.status(500).json({error:'Error del servidor'}); }
});

router.post('/logout', (req,res) => { req.session.destroy(); res.json({ok:true}); });

router.get('/me', (req,res) => {
  if (!req.session.worker) return res.status(401).json({error:'No autenticado'});
  res.json(req.session.worker);
});

module.exports = router;
