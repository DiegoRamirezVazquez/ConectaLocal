
const {
    obtenerSolicitudesPropias,
    enviarSolicitud,
    obtenerCategorias
} = require('../services/solicitudesTrabajadorService');

// CONSULTAR HISTORIAL DE SOLICITUDES.
const consultarSolicitud = async (req, res) => {
    try {
        const perfilId = req.usuario.id;

        const solicitudes = await obtenerSolicitudesPropias(perfilId);

        const solicitudPendiente = solicitudes.find(
            solicitud => solicitud.estado === 'pendiente'
        ) || null;

        return res.status(200).json({
            success: true,
            mensaje: solicitudes.length > 0
                ? 'Historial de solicitudes recuperado correctamente.'
                : 'No tienes solicitudes registradas.',
            solicitudes,
            solicitudPendiente
        });

    } catch (error) {
        console.error('Error al consultar solicitudes:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_SOLICITUDES',
            mensaje: 'No fue posible consultar tu historial de solicitudes.'
        });
    }
};

// GUARDAR Y ENVIAR SOLICITUD CON FOTOGRAFÍAS.
const enviarSolicitudController = async (req, res) => {
    try {
        const perfilId = req.usuario.id;
        const datos = req.body;
        const fotografias = req.files || [];

        if (
            !datos ||
            typeof datos !== 'object' ||
            Array.isArray(datos)
        ) {
            return res.status(400).json({
                success: false,
                codigo: 'DATOS_INVALIDOS',
                mensaje: 'Los datos proporcionados no son válidos.'
            });
        }

        if (fotografias.length > 5) {
            return res.status(400).json({
                success: false,
                codigo: 'LIMITE_FOTOGRAFIAS',
                mensaje: 'Puedes enviar máximo 5 fotografías.'
            });
        }

        const resultado = await enviarSolicitud(
            perfilId,
            datos,
            fotografias
        );

        return res.status(200).json({
            success: true,
            codigo: 'SOLICITUD_ENVIADA',
            mensaje: 'Tu solicitud fue enviada correctamente y está pendiente de revisión.',
            solicitud: resultado.solicitud,
            fotografias: resultado.fotografias
        });

    } catch (error) {
        console.error('Error al enviar solicitud:', error);

        // Los errores de validación y reglas de negocio
        // se identifican mediante sus mensajes conocidos.
        const erroresValidacion = [
            'Los datos de la solicitud no son válidos.',
            'Selecciona si deseas registrar un negocio o una actividad independiente.',
            'El nombre comercial es obligatorio.',
            'Debes seleccionar una categoría.',
            'No fue posible validar la categoría.',
            'La categoría seleccionada no existe.',
            'La descripción es obligatoria.',
            'La dirección del negocio es obligatoria.',
            'La zona de cobertura es obligatoria.',
            'Debes proporcionar al menos un medio de contacto.',
            'El correo de contacto no es válido.',
            'La coordenada latitud es obligatoria.',
            'La coordenada longitud es obligatoria.',
            'La coordenada latitud no es válida.',
            'La coordenada longitud no es válida.',
            'Puedes enviar máximo 5 fotografías por solicitud.',
            'Ya tienes una solicitud pendiente.',
            'Tu solicitud ya fue enviada y está pendiente de revisión.',
            'La solicitud cambió de estado y ya no puede enviarse.',
            'Tu tipo de cuenta no permite registrar solicitudes.',
            'No se encontró tu perfil.',
            'No fue posible validar tu perfil.',
            'Se requiere el identificador de la solicitud.',
            'Se recibió un archivo inválido.',
            'Cada fotografía debe pesar máximo 5 MB.',
            'Solo se permiten fotografías JPG, PNG y WEBP.',
            'No fue posible subir una de las fotografías.',
            'No fue posible registrar las fotografías de la solicitud.'
        ];

        const esValidacion = erroresValidacion.includes(error.message);

        return res.status(esValidacion ? 400 : 500).json({
            success: false,
            codigo: esValidacion
                ? 'ERROR_VALIDACION_SOLICITUD'
                : 'ERROR_INTERNO_SOLICITUD',
            mensaje: esValidacion
                ? error.message
                : 'Ocurrió un error interno al procesar tu solicitud. Inténtalo nuevamente.'
        });
    }
};

// CONSULTAR CATEGORÍAS DISPONIBLES.
const consultarCategorias = async (req, res) => {
    try {
        const categorias = await obtenerCategorias();

        return res.status(200).json({
            success: true,
            mensaje: 'Categorías recuperadas correctamente.',
            categorias
        });

    } catch (error) {
        console.error('Error al consultar categorías:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CONSULTAR_CATEGORIAS',
            mensaje: 'No fue posible consultar las categorías.'
        });
    }
};

module.exports = {
    consultarSolicitud,
    enviarSolicitudController,
    consultarCategorias
};
