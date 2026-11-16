
const express = require('express');
const router = express.Router();

// Controladores de solicitudes de trabajadores.
const {
    consultarSolicitud,
    enviarSolicitudController,
    consultarCategorias
} = require('../controllers/solicitudesTrabajadorController');

// Middleware de autenticación.
const {
    verificarToken
} = require('../middlewares/authMiddleware');

// Middleware de autenticación y protección CSRF.
const {
    protegerSesion
} = require('../middlewares/protegerSesion');

// Middleware para recibir fotografías.
const {
    subirFotosSolicitud
} = require('../middlewares/subirFotosSolicitud');

// CONSULTAR HISTORIAL DE SOLICITUDES.
router.get(
    '/mi-solicitud',
    verificarToken,
    consultarSolicitud
);

// CONSULTAR CATEGORÍAS.
router.get(
    '/categorias',
    verificarToken,
    consultarCategorias
);

// GUARDAR Y ENVIAR SOLICITUD CON FOTOGRAFÍAS.
router.post(
    '/enviar',
    protegerSesion,
    subirFotosSolicitud,
    enviarSolicitudController
);

module.exports = router;
