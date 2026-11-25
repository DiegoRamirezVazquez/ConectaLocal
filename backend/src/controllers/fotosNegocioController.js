
const {
    obtenerFotosNegocio,
    subirFotosNegocio,
    eliminarFotoNegocio,
    obtenerFotosNegocioPublicas
} = require('../services/fotosNegocioService');

// CONSULTAR GALERÍA DE UN NEGOCIO.
const consultarFotosNegocio = async (req, res) => {
    try {
        const perfilId = req.usuario.id;
        const { negocioId } = req.params;

        const fotografias = await obtenerFotosNegocio(
            negocioId,
            perfilId
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Fotografías recuperadas correctamente.',
            total: fotografias.length,
            fotografias
        });

    } catch (error) {
        console.error('Error al consultar galería:', error);

        if (error.codigo === 'NEGOCIO_NO_ENCONTRADO') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_GALERIA',
            mensaje: 'No fue posible consultar la galería.'
        });
    }
};

// CONSULTAR GALERÍA PÚBLICA DE UN NEGOCIO.
const consultarFotosNegocioPublicas = async (req, res) => {
    try {
        const { negocioId } = req.params;

        const fotografias = await obtenerFotosNegocioPublicas(
            negocioId
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Galería pública recuperada correctamente.',
            total: fotografias.length,
            fotografias
        });

    } catch (error) {
        console.error(
            'Error al consultar galería pública:',
            error
        );

        if (error.codigo === 'NEGOCIO_NO_ENCONTRADO') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_GALERIA_PUBLICA',
            mensaje: 'No fue posible consultar la galería.'
        });
    }
};

// SUBIR FOTOGRAFÍAS A LA GALERÍA.
const agregarFotosNegocio = async (req, res) => {
    try {
        const perfilId = req.usuario.id;
        const { negocioId } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                codigo: 'FOTOGRAFIAS_REQUERIDAS',
                mensaje: 'Debes seleccionar al menos una fotografía.'
            });
        }

        let descripciones = [];

        if (req.body.descripciones) {
            try {
                descripciones = JSON.parse(req.body.descripciones);

                if (!Array.isArray(descripciones)) {
                    throw new Error();
                }
            } catch {
                return res.status(400).json({
                    success: false,
                    codigo: 'DESCRIPCIONES_INVALIDAS',
                    mensaje: 'Las descripciones proporcionadas no son válidas.'
                });
            }
        }

        const fotografias = await subirFotosNegocio(
            negocioId,
            perfilId,
            req.files,
            descripciones
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Fotografías agregadas correctamente.',
            total: fotografias.length,
            fotografias
        });

    } catch (error) {
        console.error('Error al agregar fotografías:', error);

        if (error.codigo === 'NEGOCIO_NO_ENCONTRADO') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(400).json({
            success: false,
            codigo: 'ERROR_AGREGAR_FOTOGRAFIAS',
            mensaje: error.message ||
                'No fue posible agregar las fotografías.'
        });
    }
};

// ELIMINAR UNA FOTOGRAFÍA DE LA GALERÍA.
const quitarFotoNegocio = async (req, res) => {
    try {
        const perfilId = req.usuario.id;
        const { negocioId, fotoId } = req.params;

        const resultado = await eliminarFotoNegocio(
            negocioId,
            perfilId,
            fotoId
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Fotografía eliminada correctamente.',
            fotografia: resultado
        });

    } catch (error) {
        console.error('Error al eliminar fotografía:', error);

        if (
            error.codigo === 'NEGOCIO_NO_ENCONTRADO' ||
            error.codigo === 'FOTOGRAFIA_NO_ENCONTRADA'
        ) {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(400).json({
            success: false,
            codigo: 'ERROR_ELIMINAR_FOTOGRAFIA',
            mensaje: error.message ||
                'No fue posible eliminar la fotografía.'
        });
    }
};

module.exports = {
    consultarFotosNegocio,
    agregarFotosNegocio,
    quitarFotoNegocio,
    consultarFotosNegocioPublicas
};
