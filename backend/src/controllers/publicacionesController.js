
const {
    obtenerPublicaciones,
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion,
    agregarComentario,
    actualizarComentario,
    eliminarComentario,
    alternarReaccion,
    reportarPublicacion
} = require('../services/publicacionesService');

// Determinar el código HTTP según el error recibido.
const obtenerStatusError = (error) => {
    const mensaje = error.message.toLowerCase();

    if (
        mensaje.includes('no tienes permisos') ||
        mensaje.includes('no tienes permiso')
    ) {
        return 403;
    }

    if (mensaje.includes('no existe')) {
        return 404;
    }

    if (mensaje.includes('ya has reportado')) {
        return 409;
    }

    if (
        mensaje.includes('obligatorio') ||
        mensaje.includes('vacío') ||
        mensaje.includes('valido') ||
        mensaje.includes('válido') ||
        mensaje.includes('proporcionaron') ||
        mensaje.includes('no puede superar')
    ) {
        return 400;
    }

    return 500;
};

// Consultar todas las publicaciones del foro.
const consultarPublicaciones = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const publicaciones = await obtenerPublicaciones(usuarioId);

        return res.status(200).json({
            success: true,
            mensaje: 'Publicaciones consultadas correctamente.',
            publicaciones
        });

    } catch (error) {
        console.error('Error al consultar publicaciones:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudieron consultar las publicaciones.'
        });
    }
};

// Crear una publicación.
const publicar = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const publicacion = await crearPublicacion(
            usuarioId,
            req.body
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Publicación creada correctamente.',
            publicacion
        });

    } catch (error) {
        console.error('Error al crear publicación:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo crear la publicación.'
        });
    }
};

// Editar una publicación propia.
const editarPublicacion = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { publicacionId } = req.params;

        const publicacion = await actualizarPublicacion(
            publicacionId,
            usuarioId,
            req.body
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Publicación actualizada correctamente.',
            publicacion
        });

    } catch (error) {
        console.error('Error al actualizar publicación:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo actualizar la publicación.'
        });
    }
};

// Eliminar una publicación propia.
const eliminarPublicacionPropia = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { publicacionId } = req.params;

        const resultado = await eliminarPublicacion(
            publicacionId,
            usuarioId
        );

        return res.status(200).json({
            success: true,
            mensaje: resultado.mensaje
        });

    } catch (error) {
        console.error('Error al eliminar publicación:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo eliminar la publicación.'
        });
    }
};

// Agregar un comentario.
const comentar = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { publicacionId } = req.params;
        const { contenido } = req.body;

        const comentario = await agregarComentario(
            publicacionId,
            usuarioId,
            contenido
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Comentario agregado correctamente.',
            comentario
        });

    } catch (error) {
        console.error('Error al agregar comentario:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo agregar el comentario.'
        });
    }
};

// Editar un comentario propio.
const editarComentarioPropio = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { comentarioId } = req.params;
        const { contenido } = req.body;

        const comentario = await actualizarComentario(
            comentarioId,
            usuarioId,
            contenido
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Comentario actualizado correctamente.',
            comentario
        });

    } catch (error) {
        console.error('Error al actualizar comentario:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo actualizar el comentario.'
        });
    }
};

// Eliminar un comentario propio.
const eliminarComentarioPropio = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { comentarioId } = req.params;

        const resultado = await eliminarComentario(
            comentarioId,
            usuarioId
        );

        return res.status(200).json({
            success: true,
            mensaje: resultado.mensaje
        });

    } catch (error) {
        console.error('Error al eliminar comentario:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo eliminar el comentario.'
        });
    }
};

// Dar o quitar Me gusta.
const reaccionar = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { publicacionId } = req.params;

        const resultado = await alternarReaccion(
            publicacionId,
            usuarioId
        );

        return res.status(200).json({
            success: true,
            mensaje: resultado.reacciono
                ? 'Reacción agregada correctamente.'
                : 'Reacción eliminada correctamente.',
            data: resultado
        });

    } catch (error) {
        console.error('Error al reaccionar:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo registrar la reacción.'
        });
    }
};

// Reportar una publicación.
const reportar = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { publicacionId } = req.params;

        const reporte = await reportarPublicacion(
            publicacionId,
            usuarioId,
            req.body
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Reporte enviado correctamente.',
            reporte
        });

    } catch (error) {
        console.error('Error al reportar publicación:', error.message);

        return res.status(obtenerStatusError(error)).json({
            success: false,
            mensaje: error.message || 'No se pudo registrar el reporte.'
        });
    }
};

module.exports = {
    consultarPublicaciones,
    publicar,
    editarPublicacion,
    eliminarPublicacionPropia,
    comentar,
    editarComentarioPropio,
    eliminarComentarioPropio,
    reaccionar,
    reportar
};
