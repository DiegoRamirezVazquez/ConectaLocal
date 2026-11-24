
const {
    obtenerConversacionesTrabajador,
    obtenerMensajesConversacion,
    enviarMensajeTrabajador,
    marcarMensajesComoLeidos
} = require('../services/mensajesService');

// Consultar las conversaciones organizadas por negocio.
const consultarConversaciones = async (req, res) => {
    try {
        const trabajadorId = req.usuario.id;

        const negocios = await obtenerConversacionesTrabajador(
            trabajadorId
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Conversaciones consultadas correctamente.',
            negocios
        });

    } catch (error) {
        console.error('Error al consultar conversaciones:', error.message);

        return res.status(500).json({
            success: false,
            mensaje: error.message || 'Error al consultar las conversaciones.'
        });
    }
};

// Consultar los mensajes de una conversación.
const consultarMensajes = async (req, res) => {
    try {
        const trabajadorId = req.usuario.id;
        const { conversacionId } = req.params;

        const resultado = await obtenerMensajesConversacion(
            conversacionId,
            trabajadorId
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Mensajes consultados correctamente.',
            ...resultado
        });

    } catch (error) {
        console.error('Error al consultar mensajes:', error.message);

        const status = error.message.includes('No tienes acceso') ? 403
            : error.message.includes('no existe') ? 404
            : 500;

        return res.status(status).json({
            success: false,
            mensaje: error.message || 'Error al consultar los mensajes.'
        });
    }
};

// Enviar un mensaje.
const enviarMensaje = async (req, res) => {
    try {
        const trabajadorId = req.usuario.id;
        const { conversacionId } = req.params;
        const { contenido } = req.body;

        const mensaje = await enviarMensajeTrabajador(
            conversacionId,
            trabajadorId,
            contenido
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Mensaje enviado correctamente.',
            data: mensaje
        });

    } catch (error) {
        console.error('Error al enviar mensaje:', error.message);

        const status = error.message.includes('No tienes acceso') ? 403
            : error.message.includes('no existe') ? 404
            : error.message.includes('vacío') ||
              error.message.includes('2000 caracteres') ? 400
            : 500;

        return res.status(status).json({
            success: false,
            mensaje: error.message || 'No se pudo enviar el mensaje.'
        });
    }
};

// Marcar los mensajes recibidos como leídos.
const marcarLeidos = async (req, res) => {
    try {
        const trabajadorId = req.usuario.id;
        const { conversacionId } = req.params;

        const resultado = await marcarMensajesComoLeidos(
            conversacionId,
            trabajadorId
        );

        return res.status(200).json({
            success: true,
            mensaje: 'Mensajes marcados como leídos.',
            data: resultado
        });

    } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error.message);

        const status = error.message.includes('No tienes acceso') ? 403
            : error.message.includes('no existe') ? 404
            : 500;

        return res.status(status).json({
            success: false,
            mensaje: error.message || 'No se pudieron marcar los mensajes.'
        });
    }
};

module.exports = {
    consultarConversaciones,
    consultarMensajes,
    enviarMensaje,
    marcarLeidos
};
