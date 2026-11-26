const express = require('express');
const router = express.Router();

const {
    consultarResenasNegocio,
    consultarMuroResenas,
    consultarResenasDestacadas,
    consultarResenaPropia,
    publicarResena,
    modificarResena,
    quitarResena,
    reportarResena
} = require('../controllers/resenasController');

const {
    verificarToken
} = require('../middlewares/authMiddleware');

// CONSULTAR RESEÑAS DESTACADAS DE UN NEGOCIO.
router.get(
    '/negocio/:negocioId/destacadas',
    consultarResenasDestacadas
);

// CONSULTAR TODAS LAS RESEÑAS DE UN NEGOCIO.
router.get(
    '/negocio/:negocioId',
    consultarResenasNegocio
);

// CONSULTAR LA RESEÑA DEL USUARIO AUTENTICADO.
router.get(
    '/negocio/:negocioId/propia',
    verificarToken,
    consultarResenaPropia
);

// CONSULTAR EL MURO GENERAL DE RESEÑAS.
router.get('/muro', consultarMuroResenas);

// PUBLICAR UNA RESEÑA.
router.post(
    '/negocio/:negocioId',
    verificarToken,
    publicarResena
);

// REPORTAR UNA RESEÑA.
router.post(
    '/:resenaId/reportar',
    verificarToken,
    reportarResena
);

// ACTUALIZAR UNA RESEÑA PROPIA.
router.put(
    '/:resenaId',
    verificarToken,
    modificarResena
);

// ELIMINAR UNA RESEÑA PROPIA.
router.delete(
    '/:resenaId',
    verificarToken,
    quitarResena
);

module.exports = router;
