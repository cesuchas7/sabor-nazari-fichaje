const express = require('express');
const router = express.Router();
const db = require('../database');

const isAuth  = (req,res,next) => req.session.worker ? next() : res.status(401).json({error:'No autenticado'});
const isAdmin = (req,res,next) => req.session.worker?.role==='admin' ? next() : res.status(403).json({error:'Acceso denegado'});

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
    const fmt = iso => iso ? new Date(iso).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) : '';
    const lines = ['Trabajador,Fecha,Entrada,Inicio descanso,Fin descanso,Salida,Editado'];
    for (const f of fichajes) {
      lines.push([f.worker_name,f.fecha,fmt(f.entrada),fmt(f.inicio_descanso),fmt(f.fin_descanso),fmt(f.salida),f.editado?'Sí':'No'].join(','));
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

router.get('/historial', isAuth, async (req,res) => {
  try { res.json(await db.getHistorialWorker(req.session.worker.id)); }
  catch(e) { res.status(500).json({error:'Error'}); }
});

module.exports = router;
