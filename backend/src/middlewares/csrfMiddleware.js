
const {
    validarTokenCSRF
} = require('../services/sessionService');

// VERIFICA LA PROTECCIÓN CSRF
const verificarCSRF = async (req, res, next) => {
    try {
        const tokenCSRF = req.get('X-CSRF-Token');
        const sesionId = req.sesionId;

        // La sesión debe haber sido validada previamente.
        if (!sesionId) {
            return res.status(401).json({
                success: false,
                codigo: 'SESION_NO_VALIDA',
                mensaje: 'No existe una sesión válida.'
            });
        }

        const tokenValido = await validarTokenCSRF({
            sesionId,
            tokenCSRF
        });

        if (!tokenValido) {
            return res.status(403).json({
                success: false,
                codigo: 'CSRF_TOKEN_INVALIDO',
                mensaje: 'La solicitud no superó la validación de seguridad.'
            });
        }

        next();

    } catch (error) {
        console.error('Error en protección CSRF:', error.message);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_CSRF',
            mensaje: 'No fue posible validar la solicitud.'
        });
    }
};

module.exports = {
    verificarCSRF
};
