const {
    obtenerResenasNegocio,
    obtenerResenasDestacadas,
    crearResena,
    actualizarResena,
    eliminarResena,
    obtenerResenaPropia,
    obtenerMuroResenas
} = require('../services/resenasService');

// CONSULTAR TODAS LAS RESEÑAS DE UN NEGOCIO.
const consultarResenasNegocio = async (req, res) => {
    try {
        const { negocioId } = req.params;

        const resenas = await obtenerResenasNegocio(negocioId);

        return res.status(200).json({
            success: true,
            mensaje: 'Reseñas recuperadas correctamente.',
            total: resenas.length,
            resenas
        });

    } catch (error) {
        console.error('Error al consultar reseñas:', error);

        if (error.codigo === 'NEGOCIO_NO_ENCONTRADO') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_RESENAS',
            mensaje: 'No fue posible consultar las reseñas.'
        });
    }
};


 // CONSULTAR EL MURO GENERAL DE RESEÑAS.
const consultarMuroResenas = async (req, res) => {
    try {
        const resenas = await obtenerMuroResenas();

        return res.status(200).json({
            success: true,
            mensaje: 'Muro de reseñas recuperado correctamente.',
            total: resenas.length,
            resenas
        });

    } catch (error) {
        console.error('Error al consultar el muro de reseñas:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_MURO_RESENAS',
            mensaje: 'No fue posible consultar las reseñas de la comunidad.'
        });
    }
};


// CONSULTAR RESEÑAS DESTACADAS Y PROMEDIO.
const consultarResenasDestacadas = async (req, res) => {
    try {
        const { negocioId } = req.params;

        const resultado = await obtenerResenasDestacadas(negocioId);

        return res.status(200).json({
            success: true,
            mensaje: 'Reseñas destacadas recuperadas correctamente.',
            ...resultado
        });

    } catch (error) {
        console.error('Error al consultar reseñas destacadas:', error);

        if (error.codigo === 'NEGOCIO_NO_ENCONTRADO') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_RESENAS_DESTACADAS',
            mensaje: 'No fue posible consultar las reseñas destacadas.'
        });
    }
};

// CONSULTAR LA RESEÑA DEL USUARIO AUTENTICADO.
const consultarResenaPropia = async (req, res) => {
    try {
        const { negocioId } = req.params;
        const perfilId = req.usuario.id;

        const resena = await obtenerResenaPropia(
            negocioId,
            perfilId
        );

        return res.status(200).json({
            success: true,
            mensaje: resena
                ? 'Tu reseña fue recuperada correctamente.'
                : 'Todavía no has publicado una reseña para este negocio.',
            resena
        });

    } catch (error) {
        console.error('Error al consultar reseña propia:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_RESENA_PROPIA',
            mensaje: 'No fue posible consultar tu reseña.'
        });
    }
};

// PUBLICAR UNA RESEÑA.
const publicarResena = async (req, res) => {
    try {
        const { negocioId } = req.params;
        const perfilId = req.usuario.id;

        const { estrellas, comentario } = req.body;

        if (
            !Number.isInteger(estrellas) ||
            estrellas < 1 ||
            estrellas > 5
        ) {
            return res.status(400).json({
                success: false,
                codigo: 'CALIFICACION_INVALIDA',
                mensaje: 'La calificación debe ser un número entero entre 1 y 5.'
            });
        }

        if (
            comentario !== undefined &&
            comentario !== null &&
            typeof comentario !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                codigo: 'COMENTARIO_INVALIDO',
                mensaje: 'El comentario debe ser texto.'
            });
        }

        const comentarioLimpio = comentario?.trim() || null;

        if (comentarioLimpio && comentarioLimpio.length > 500) {
            return res.status(400).json({
                success: false,
                codigo: 'COMENTARIO_DEMASIADO_LARGO',
                mensaje: 'El comentario no puede superar los 500 caracteres.'
            });
        }

        const resena = await crearResena(
            negocioId,
            perfilId,
            estrellas,
            comentarioLimpio
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Reseña publicada correctamente.',
            resena
        });

    } catch (error) {
        console.error('Error al publicar reseña:', error);

        const erroresValidacion = [
            'NEGOCIO_NO_ENCONTRADO',
            'PROPIETARIO_NO_PUEDE_RESENAR',
            'ROL_NO_AUTORIZADO',
            'RESENA_DUPLICADA'
        ];

        if (erroresValidacion.includes(error.codigo)) {
            return res.status(
                error.codigo === 'NEGOCIO_NO_ENCONTRADO' ? 404 : 403
            ).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_PUBLICAR_RESENA',
            mensaje: 'No fue posible publicar la reseña.'
        });
    }
};

// ACTUALIZAR UNA RESEÑA PROPIA.
const modificarResena = async (req, res) => {
    try {
        const { resenaId } = req.params;
        const perfilId = req.usuario.id;

        const { estrellas, comentario } = req.body;

        if (
            !Number.isInteger(estrellas) ||
            estrellas < 1 ||
            estrellas > 5
        ) {
            return res.status(400).json({
                success: false,
                codigo: 'CALIFICACION_INVALIDA',
                mensaje: 'La calificación debe ser un número entero entre 1 y 5.'
            });
        }

        if (
            comentario !== undefined &&
            comentario !== null &&
            typeof comentario !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                codigo: 'COMENTARIO_INVALIDO',
                mensaje: 'El comentario debe ser texto.'
            });
        }

        const comentarioLimpio = comentario?.trim() || null;

        if (comentarioLimpio && comentarioLimpio.length > 500) {
            return res.status(400).json({
                success: false,
                codigo: 'COMENTARIO_DEMASIADO_LARGO',
                mensaje: 'El comentario no puede superar los 500 caracteres.'
            });
        }

        const resena = await actualizarResena(
            resenaId,
            perfilId,
            estrellas,
            comentarioLimpio
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Reseña actualizada correctamente.',
            resena
        });

    } catch (error) {
        console.error('Error al actualizar reseña:', error);

        if (error.codigo === 'RESENA_NO_ENCONTRADA') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_ACTUALIZAR_RESENA',
            mensaje: 'No fue posible actualizar la reseña.'
        });
    }
};

// ELIMINAR UNA RESEÑA PROPIA.
const quitarResena = async (req, res) => {
    try {
        const { resenaId } = req.params;
        const perfilId = req.usuario.id;

        const resultado = await eliminarResena(resenaId, perfilId);

        return res.status(200).json({
            success: true,
            mensaje: 'Reseña eliminada correctamente.',
            resena: resultado
        });

    } catch (error) {
        console.error('Error al eliminar reseña:', error);

        if (error.codigo === 'RESENA_NO_ENCONTRADA') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_ELIMINAR_RESENA',
            mensaje: 'No fue posible eliminar la reseña.'
        });
    }
};


module.exports = {
    consultarResenasNegocio,
    consultarMuroResenas,
    consultarResenasDestacadas,
    consultarResenaPropia,
    publicarResena,
    modificarResena,
    quitarResena
};