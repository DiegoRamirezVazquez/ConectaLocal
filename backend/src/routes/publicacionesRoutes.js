
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');

const {
    consultarPublicaciones,
    publicar,
    editarPublicacion,
    eliminarPublicacionPropia,
    comentar,
    editarComentarioPropio,
    eliminarComentarioPropio,
    reaccionar,
    reportar
} = require('../controllers/publicacionesController');

const {
    agregarFotosPublicacion
} = require('../controllers/fotosPublicacionController');

const {
    subirFotosPublicacion
} = require('../middlewares/subirFotosPublicacion');

// Todas las rutas requieren autenticación.
router.use(verificarToken);

// Consultar publicaciones, comentarios y reacciones.
router.get('/', consultarPublicaciones);

// Crear una publicación.
router.post('/', publicar);

// Editar una publicación propia.
router.patch('/:publicacionId', editarPublicacion);

// Eliminar una publicación propia.
router.delete('/:publicacionId', eliminarPublicacionPropia);

// Agregar un comentario.
router.post('/:publicacionId/comentarios', comentar);

// Editar un comentario propio.
router.patch('/comentarios/:comentarioId', editarComentarioPropio);

// Eliminar un comentario propio.
router.delete('/comentarios/:comentarioId', eliminarComentarioPropio);

// Reportar una publicación.
router.post('/:publicacionId/reportar', reportar);

// Dar o quitar Me gusta.
router.post('/:publicacionId/reaccion', reaccionar);

// Agregar fotografías a una publicación.
router.post(
    '/:publicacionId/fotografias',
    subirFotosPublicacion,
    agregarFotosPublicacion
);

module.exports = router;
