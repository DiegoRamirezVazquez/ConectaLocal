
const {
    verificarToken
} = require('./authMiddleware');

const {
    verificarCSRF
} = require('./csrfMiddleware');

// PROTECCIÓN COMPLETA DE SESIONES
const protegerSesion = [
    verificarToken,
    verificarCSRF
];

module.exports = {
    protegerSesion
};
