const cron = require('node-cron');
const https = require('https');

function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const body = JSON.stringify({ chat_id: chatId, text });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, res => res.resume());
  req.on('error', () => {});
  req.write(body);
  req.end();
}

function initScheduler() {
  const cesarId = process.env.TELEGRAM_CHAT_CESAR;
  if (!cesarId) return;

  const opts = { timezone: 'Europe/Madrid' };

  // Lunes a viernes solamente (1-5)
  cron.schedule('55 6 * * 1-5',  () => sendTelegram(cesarId, '⏰ César, hora de fichar la ENTRADA'), opts);
  cron.schedule('55 9 * * 1-5',  () => sendTelegram(cesarId, '☕ César, hora de fichar el INICIO DEL DESCANSO'), opts);
  cron.schedule('28 10 * * 1-5', () => sendTelegram(cesarId, '✅ César, hora de fichar el FIN DEL DESCANSO'), opts);
  cron.schedule('55 14 * * 1-5', () => sendTelegram(cesarId, '🏠 César, hora de fichar la SALIDA'), opts);

  console.log('Scheduler Telegram iniciado (zona horaria: Europe/Madrid)');
}

module.exports = { initScheduler };
