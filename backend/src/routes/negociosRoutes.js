
const express = require('express');
const router = express.Router();

// Controladores de negocios.
const {
    consultarMisNegocios,
    consultarNegocioPublico,
    actualizarFotoPrincipal,
    consultarDirectorioPublico
} = require('../controllers/negociosController');

// Middleware de autenticación.
const {
    verificarToken
} = require('../middlewares/authMiddleware');

// Middleware para recibir fotografías.
const {
    subirFotoNegocio
} = require('../middlewares/subirFotosNegocio');


// CONSULTAR NEGOCIOS DEL TRABAJADOR.
router.get(
    '/mis-negocios',
    verificarToken,
    consultarMisNegocios
);

// ACTUALIZAR FOTOGRAFÍA PRINCIPAL DE UN NEGOCIO.
router.patch(
    '/:negocioId/foto-principal',
    verificarToken,
    subirFotoNegocio,
    actualizarFotoPrincipal
);

router.get(
    '/publico/:negocioId',
    consultarNegocioPublico
);

router.get(
    '/publicos',
    consultarDirectorioPublico
);

module.exports = router;
