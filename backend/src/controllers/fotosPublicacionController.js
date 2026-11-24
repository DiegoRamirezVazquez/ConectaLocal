
const {
    subirFotosPublicacion
} = require('../services/fotosPublicacionService');

// AGREGAR FOTOGRAFÍAS A UNA PUBLICACIÓN.
const agregarFotosPublicacion = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { publicacionId } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                codigo: 'FOTOGRAFIAS_REQUERIDAS',
                mensaje: 'Debes seleccionar al menos una fotografía.'
            });
        }

        const fotografias = await subirFotosPublicacion(
            publicacionId,
            usuarioId,
            req.files
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Fotografías agregadas correctamente.',
            total: fotografias.length,
            fotografias
        });

    } catch (error) {
        console.error(
            'Error al agregar fotografías a la publicación:',
            error
        );

        if (error.codigo === 'PUBLICACION_NO_ENCONTRADA') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        if (error.codigo === 'PUBLICACION_NO_AUTORIZADA') {
            return res.status(403).json({
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

module.exports = {
    agregarFotosPublicacion
};
