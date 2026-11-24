
const {
    obtenerNegociosPropios,
    obtenerNegocioPublico,
    actualizarFotoPrincipalNegocio,
    obtenerNegociosPublicos
} = require('../services/negociosService');

// CONSULTAR NEGOCIOS DEL TRABAJADOR AUTENTICADO.
const consultarMisNegocios = async (req, res) => {
    try {
        const perfilId = req.usuario.id;

        const negocios = await obtenerNegociosPropios(perfilId);

        return res.status(200).json({
            success: true,
            mensaje: negocios.length > 0
                ? 'Tus negocios fueron recuperados correctamente.'
                : 'Todavía no tienes negocios registrados.',
            total: negocios.length,
            negocios
        });

    } catch (error) {
        console.error('Error al consultar mis negocios:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_NEGOCIOS',
            mensaje: 'No fue posible consultar tus negocios.'
        });
    }
};

// ACTUALIZAR FOTOGRAFÍA PRINCIPAL DEL NEGOCIO.
const actualizarFotoPrincipal = async (req, res) => {
    try {
        const perfilId = req.usuario.id;
        const { negocioId } = req.params;
        const archivo = req.file;

        if (!archivo) {
            return res.status(400).json({
                success: false,
                codigo: 'FOTOGRAFIA_REQUERIDA',
                mensaje: 'Debes seleccionar una fotografía.'
            });
        }

        const negocio = await actualizarFotoPrincipalNegocio(
            negocioId,
            perfilId,
            archivo
        );

        return res.status(200).json({
            success: true,
            mensaje: 'La fotografía del negocio se actualizó correctamente.',
            negocio
        });

    } catch (error) {
        console.error('Error al actualizar fotografía:', error);

        if (error.codigo === 'NEGOCIO_NO_ENCONTRADO') {
            return res.status(404).json({
                success: false,
                codigo: error.codigo,
                mensaje: error.message
            });
        }

        return res.status(400).json({
            success: false,
            codigo: 'ERROR_ACTUALIZAR_FOTOGRAFIA',
            mensaje: error.message ||
                'No fue posible actualizar la fotografía.'
        });
    }
};



// CONSULTAR EL PERFIL PÚBLICO DE UN NEGOCIO.
const consultarNegocioPublico = async (req, res) => {
    try {
        const { negocioId } = req.params;

        const negocio = await obtenerNegocioPublico(negocioId);

        if (!negocio) {
            return res.status(404).json({
                success: false,
                codigo: 'NEGOCIO_NO_ENCONTRADO',
                mensaje: 'No se encontró el negocio solicitado.'
            });
        }

        return res.status(200).json({
            success: true,
            mensaje: 'Perfil del negocio consultado correctamente.',
            negocio
        });

    } catch (error) {
        console.error('Error al consultar perfil público:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_NEGOCIO',
            mensaje: 'No fue posible consultar el perfil del negocio.'
        });
    }
};


// CONSULTAR EL DIRECTORIO PÚBLICO DE NEGOCIOS.
const consultarDirectorioPublico = async (req, res) => {
    try {
        const negocios = await obtenerNegociosPublicos();

        return res.status(200).json({
            success: true,
            mensaje: 'Directorio consultado correctamente.',
            total: negocios.length,
            negocios
        });

    } catch (error) {
        console.error(
            'Error al consultar directorio público:',
            error
        );

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_DIRECTORIO_PUBLICO',
            mensaje: 'No fue posible consultar los negocios.'
        });
    }
};


module.exports = {
    consultarMisNegocios,
    actualizarFotoPrincipal,
    consultarNegocioPublico,
    consultarDirectorioPublico
};
