const express = require('express');
const router = express.Router();
const db = require('../database');

const isAuth       = (req,res,next) => req.session.worker ? next() : res.status(401).json({error:'No autenticado'});
const isAdmin      = (req,res,next) => ['admin','superadmin'].includes(req.session.worker?.role) ? next() : res.status(403).json({error:'Acceso denegado'});
const isSuperAdmin = (req,res,next) => req.session.worker?.role==='superadmin' ? next() : res.status(403).json({error:'Acceso denegado'});

const festivos = new Set([
  '2025-10-12','2025-10-22','2025-11-01','2025-12-06','2025-12-08','2025-12-25',
  '2026-01-01','2026-01-06','2026-02-28','2026-04-02','2026-04-03','2026-04-06',
  '2026-05-01','2026-05-25'
]);

function offsetEspana(d) {
  if (d < new Date('2025-10-26T01:00:00Z')) return 2;
  if (d < new Date('2026-03-29T01:00:00Z')) return 1;
  return 2;
}

function ts(fechaStr, h, m, minV, maxV) {
  m += Math.floor(Math.random()*(maxV-minV+1))+minV;
  while(m>=60){h++;m-=60;} while(m<0){h--;m+=60;}
  const d = new Date(fechaStr+'T00:00:00Z');
  d.setUTCHours(h-offsetEspana(d), m, Math.floor(Math.random()*59), 0);
  return d.toISOString();
}

function horario(name, fechaStr) {
  if (name.toLowerCase().includes('zineb')) return {
    entrada: ts(fechaStr,7,30,-2,8), inicio_descanso: ts(fechaStr,11,0,-4,6),
    fin_descanso: ts(fechaStr,11,30,-3,7), salida: ts(fechaStr,15,0,-5,13)
  };
  return {
    entrada: ts(fechaStr,6,59,0,10), inicio_descanso: ts(fechaStr,10,0,-4,6),
    fin_descanso: ts(fechaStr,10,30,-3,7), salida: ts(fechaStr,15,0,-5,13)
  };
}

router.get('/hoy', isAuth, async (req,res) => {
  try { res.json(await db.getFichajeHoy(req.session.worker.id)); }
  catch(e) { res.status(500).json({error:'Error'}); }
});

router.post('/accion', isAuth, async (req,res) => {
  try {
    const {accion} = req.body;
    const acciones = ['entrada','inicio_descanso','fin_descanso','salida'];
    if (!acciones.includes(accion)) return res.status(400).json({error:'Acción no válida'});
    const ahora = new Date().toISOString();
    const hoy = ahora.split('T')[0];
    const worker_id = req.session.worker.id;
    const fichaje = await db.getFichajeHoy(worker_id);
    if (!fichaje) {
      if (accion!=='entrada') return res.status(400).json({error:'Primero ficha la entrada'});
      return res.json(await db.addFichaje(worker_id,hoy,ahora));
    }
    if (accion==='entrada') return res.status(400).json({error:'Ya fichaste la entrada hoy'});
    if (accion==='inicio_descanso'&&fichaje.inicio_descanso) return res.status(400).json({error:'Descanso ya iniciado'});
    if (accion==='fin_descanso'&&!fichaje.inicio_descanso) return res.status(400).json({error:'No has iniciado el descanso'});
    if (accion==='fin_descanso'&&fichaje.fin_descanso) return res.status(400).json({error:'Descanso ya finalizado'});
    if (accion==='salida'&&fichaje.salida) return res.status(400).json({error:'Ya fichaste la salida'});
    res.json(await db.updateFichaje(fichaje.id,{[accion]:ahora}));
  } catch(e) { res.status(500).json({error:'Error'}); }
});

router.get('/admin/export', isAdmin, async (req,res) => {
  try {
    const {desde,hasta} = req.query;
    const fichajes = await db.getFichajesRango(desde||'2000-01-01',hasta||'9999-12-31');
    const fmt = iso => iso ? new Date(iso).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}) : '';
    const lines = ['Trabajador,Fecha,Entrada,Inicio descanso,Fin descanso,Salida'];
    for (const f of fichajes) {
      lines.push([f.worker_name,f.fecha,fmt(f.entrada),fmt(f.inicio_descanso),fmt(f.fin_descanso),fmt(f.salida)].join(','));
    }
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="fichajes_${desde}_${hasta}.csv"`);
    res.send('﻿'+lines.join('\n'));
  } catch(e) { res.status(500).json({error:'Error'}); }
});

router.get('/admin', isAdmin, async (req,res) => {
  try {
    const fecha = req.query.fecha||new Date().toISOString().split('T')[0];
    res.json(await db.getFichajesPorFecha(fecha));
  } catch(e) { res.status(500).json({error:'Error'}); }
});

router.put('/admin/:id', isAdmin, async (req,res) => {
  try {
    const fichaje = await db.getFichajeById(parseInt(req.params.id));
    if (!fichaje) return res.status(404).json({error:'No encontrado'});
    const {entrada,inicio_descanso,fin_descanso,salida} = req.body;
    const changes = {editado:true};
    if (entrada!==undefined) changes.entrada=entrada;
    if (inicio_descanso!==undefined) changes.inicio_descanso=inicio_descanso;
    if (fin_descanso!==undefined) changes.fin_descanso=fin_descanso;
    if (salida!==undefined) changes.salida=salida;
    await db.updateFichaje(parseInt(req.params.id),changes);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:'Error'}); }
});

router.post('/admin/generar', isSuperAdmin, async (req,res) => {
  try {
    const { desde, hasta, worker_ids } = req.body;
    if (!desde||!hasta||!Array.isArray(worker_ids)||!worker_ids.length)
      return res.status(400).json({error:'Faltan datos'});

    const workers = await db.getWorkers();
    const seleccionados = workers.filter(w => worker_ids.includes(w.id));

    let generados = 0;
    let actual = new Date(desde+'T00:00:00Z');
    const fin = new Date(hasta+'T00:00:00Z');

    while (actual <= fin) {
      const fechaStr = actual.toISOString().split('T')[0];
      const dia = actual.getUTCDay();
      const esLaboral = dia!==0 && dia!==6 && !festivos.has(fechaStr);

      if (esLaboral) {
        for (const w of seleccionados) {
          const existe = await db.getFichajeByWorkerFecha(w.id, fechaStr);
          if (!existe) {
            const h = horario(w.name, fechaStr);
            await db.addFichajeCompleto(w.id, fechaStr, h.entrada, h.inicio_descanso, h.fin_descanso, h.salida);
            generados++;
          }
        }
      }
      actual.setUTCDate(actual.getUTCDate()+1);
    }

    res.json({ ok:true, generados });
  } catch(e) { res.status(500).json({error:'Error'}); }
});

router.get('/historial', isAuth, async (req,res) => {
  try { res.json(await db.getHistorialWorker(req.session.worker.id)); }
  catch(e) { res.status(500).json({error:'Error'}); }
});

module.exports = router;
