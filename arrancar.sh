#!/bin/bash
cd "$(dirname "$0")"

echo "Arrancando Sabor Nazarí Fichaje..."

# Backend
cd backend && node server.js &
BACKEND_PID=$!

# Frontend
cd ../frontend && npm run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "✓ App disponible en:"
echo "  → Desde este Mac:    http://localhost:5173"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
if [ -n "$IP" ]; then
  echo "  → Desde móvil (WiFi): http://$IP:5173"
fi
echo ""
echo "Pulsa Ctrl+C para parar."

wait
