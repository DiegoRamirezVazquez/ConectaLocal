
const express = require('express');

const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');

const {
  iniciarSuscripcionForo,
  agregarCliente,
  eliminarCliente
} = require('../services/tiempoRealService');

// Iniciar una única suscripción compartida a Supabase Realtime.
iniciarSuscripcionForo();

// Todas las conexiones requieren una sesión autenticada.
router.use(verificarToken);

/**
 * Conexión SSE para recibir notificaciones del foro.
 * El cliente recibe avisos y después consulta nuevamente
 * las publicaciones mediante la API autenticada.
 */
router.get('/foro', (req, res) => {
  res.status(200);

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.flushHeaders();

  // Indicar al navegador cuánto esperar antes de reconectar.
  res.write('retry: 5000\n\n');

  // Mensaje inicial para confirmar que la conexión está activa.
  res.write(': conexión establecida\n\n');

  agregarCliente(res);

  // Mantener activa la conexión y evitar que intermediarios la cierren.
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 25000);

  // Limpiar recursos cuando el usuario cierra la conexión.
  req.on('close', () => {
    clearInterval(heartbeat);
    eliminarCliente(res);
  });
});

module.exports = router;
