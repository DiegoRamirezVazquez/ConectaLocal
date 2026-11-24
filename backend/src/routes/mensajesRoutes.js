const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');

const {
    consultarConversaciones,
    consultarMensajes,
    enviarMensaje,
    marcarLeidos
} = require('../controllers/mensajesController');

router.use(verificarToken);

router.get('/conversaciones', consultarConversaciones);

router.get('/conversaciones/:conversacionId', consultarMensajes);

router.post('/conversaciones/:conversacionId', enviarMensaje);

router.patch('/conversaciones/:conversacionId/leidos', marcarLeidos);

module.exports = router;
