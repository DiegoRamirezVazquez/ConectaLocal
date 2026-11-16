
const express = require('express');
const router = express.Router();

// Controladores de fotografías.
const {
    consultarFotosNegocio,
    agregarFotosNegocio,
    quitarFotoNegocio
} = require('../controllers/fotosNegocioController');

// Middleware de autenticación.
const {
    verificarToken
} = require('../middlewares/authMiddleware');

// Middleware para recibir fotografías adicionales.
const {
    subirGaleriaNegocio
} = require('../middlewares/subirGaleriaNegocio');

// CONSULTAR GALERÍA DE UN NEGOCIO.
router.get(
    '/:negocioId/fotografias',
    verificarToken,
    consultarFotosNegocio
);

// AGREGAR FOTOGRAFÍAS A LA GALERÍA.
router.post(
    '/:negocioId/fotografias',
    verificarToken,
    subirGaleriaNegocio,
    agregarFotosNegocio
);

// ELIMINAR UNA FOTOGRAFÍA DE LA GALERÍA.
router.delete(
    '/:negocioId/fotografias/:fotoId',
    verificarToken,
    quitarFotoNegocio
);

module.exports = router;
