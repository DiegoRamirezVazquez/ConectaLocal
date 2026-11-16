
const {
    obtenerSolicitudesAdmin,
    obtenerDetalleSolicitudAdmin,
    aprobarSolicitudAdmin,
    rechazarSolicitudAdmin
} = require('../services/administradorService');


// Consultar solicitudes para el panel administrativo.
const consultarSolicitudesAdmin = async (req, res) => {
    try {
        const estado = req.query.estado || null;

        const resultado = await obtenerSolicitudesAdmin(estado);

        return res.status(200).json({
            success: true,
            mensaje: 'Solicitudes administrativas consultadas correctamente.',
            ...resultado
        });

    } catch (error) {
        console.error('Error al consultar solicitudes:', error.message);

        const estadoInvalido =
            error.message === 'El estado solicitado no es válido.';

        return res.status(estadoInvalido ? 400 : 500).json({
            success: false,
            codigo: estadoInvalido
                ? 'ESTADO_INVALIDO'
                : 'ERROR_CONSULTAR_SOLICITUDES',
            mensaje: estadoInvalido
                ? error.message
                : 'No fue posible consultar las solicitudes.'
        });
    }
};


// Consultar detalle de una solicitud.
const consultarDetalleSolicitudAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await obtenerDetalleSolicitudAdmin(id);

        return res.status(200).json({
            success: true,
            mensaje: 'Detalle de solicitud consultado correctamente.',
            ...resultado
        });

    } catch (error) {
        console.error('Error al consultar detalle:', error.message);

        const noEncontrada =
            error.message === 'La solicitud no existe.';

        const idInvalido =
            error.message === 'El identificador de la solicitud no es válido.';

        return res.status(
            noEncontrada ? 404 : idInvalido ? 400 : 500
        ).json({
            success: false,
            codigo: noEncontrada
                ? 'SOLICITUD_NO_ENCONTRADA'
                : idInvalido
                    ? 'ID_INVALIDO'
                    : 'ERROR_CONSULTAR_DETALLE',
            mensaje: noEncontrada || idInvalido
                ? error.message
                : 'No fue posible consultar el detalle.'
        });
    }
};


// Aprobar una solicitud y crear su negocio.
const aprobarSolicitudAdminController = async (req, res) => {
    try {
        const { id } = req.params;

        // El identificador del administrador proviene de la sesión.
        const adminId = req.usuario.id;

        const resultado = await aprobarSolicitudAdmin(id, adminId);

        return res.status(200).json({
            success: true,
            mensaje: 'Solicitud aprobada correctamente.',
            data: resultado
        });

    } catch (error) {
        console.error('Error al aprobar solicitud:', error.message);

        const noEncontrada =
            error.message === 'La solicitud no existe';

        const noPendiente =
            error.message === 'La solicitud ya fue revisada';

        const datosInvalidos = [
            'La solicitud no está completa o no fue enviada',
            'Faltan datos obligatorios para crear el negocio',
            'El negocio requiere al menos un medio de contacto'
        ].includes(error.message);

        const noAutorizado =
            error.code === '42501' ||
            error.message === 'Administrador no autorizado';

        const codigo = noEncontrada
            ? 'SOLICITUD_NO_ENCONTRADA'
            : noPendiente
                ? 'SOLICITUD_YA_REVISADA'
                : datosInvalidos
                    ? 'DATOS_SOLICITUD_INVALIDOS'
                    : noAutorizado
                        ? 'ADMINISTRADOR_NO_AUTORIZADO'
                        : 'ERROR_APROBAR_SOLICITUD';

        const status = noEncontrada
            ? 404
            : noPendiente
                ? 409
                : datosInvalidos
                    ? 400
                    : noAutorizado
                        ? 403
                        : 500;

        return res.status(status).json({
            success: false,
            codigo,
            mensaje: status === 500
                ? 'No fue posible aprobar la solicitud.'
                : error.message
        });
    }
};


// Rechazar una solicitud con motivo obligatorio.
const rechazarSolicitudAdminController = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body || {};

        // El administrador se obtiene de la sesión.
        const adminId = req.usuario.id;

        if (
            typeof motivo !== 'string' ||
            motivo.trim().length === 0
        ) {
            return res.status(400).json({
                success: false,
                codigo: 'MOTIVO_RECHAZO_REQUERIDO',
                mensaje: 'Debes proporcionar un motivo de rechazo.'
            });
        }

        if (motivo.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                codigo: 'MOTIVO_RECHAZO_LARGO',
                mensaje: 'El motivo no puede superar los 1000 caracteres.'
            });
        }

        const resultado = await rechazarSolicitudAdmin(
            id,
            adminId,
            motivo.trim()
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Solicitud rechazada correctamente.',
            data: resultado
        });

    } catch (error) {
        console.error('Error al rechazar solicitud:', error.message);

        const noEncontrada =
            error.message === 'La solicitud no existe';

        const noPendiente =
            error.message === 'La solicitud ya fue revisada';

        const noAutorizado =
            error.code === '42501' ||
            error.message === 'Administrador no autorizado';

        const codigo = noEncontrada
            ? 'SOLICITUD_NO_ENCONTRADA'
            : noPendiente
                ? 'SOLICITUD_YA_REVISADA'
                : noAutorizado
                    ? 'ADMINISTRADOR_NO_AUTORIZADO'
                    : 'ERROR_RECHAZAR_SOLICITUD';

        const status = noEncontrada
            ? 404
            : noPendiente
                ? 409
                : noAutorizado
                    ? 403
                    : 500;

        return res.status(status).json({
            success: false,
            codigo,
            mensaje: status === 500
                ? 'No fue posible rechazar la solicitud.'
                : error.message
        });
    }
};


module.exports = {
    consultarSolicitudesAdmin,
    consultarDetalleSolicitudAdmin,
    aprobarSolicitudAdminController,
    rechazarSolicitudAdminController
};
