const express = require('express');
const router = express.Router();

// Controladores de autenticación.
const {
    register,
    login,
    me,
    logout,
    obtenerTokenCSRF
} = require('../controllers/authController');

// Middleware de autenticación.
const {
    verificarToken
} = require('../middlewares/authMiddleware');

// Middleware de autenticación y protección CSRF.
const {
    protegerSesion
} = require('../middlewares/protegerSesion');

// REGISTRO.
router.post('/register', register);

// INICIO DE SESIÓN.
router.post('/login', login);

// CONSULTAR USUARIO AUTENTICADO.
router.get('/me', verificarToken, me);

// OBTENER TOKEN CSRF.
router.get('/csrf-token', verificarToken, obtenerTokenCSRF);

// CERRAR SESIÓN.
router.post('/logout', protegerSesion, logout);

module.exports = router;
