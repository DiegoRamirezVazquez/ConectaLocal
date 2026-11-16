
const express = require('express');
const router = express.Router();

const {
    consultarSolicitudesAdmin,
    consultarDetalleSolicitudAdmin,
    aprobarSolicitudAdminController,
    rechazarSolicitudAdminController
} = require('../controllers/administradorController');

const {
    verificarToken
} = require('../middlewares/authMiddleware');

const {
    verificarAdministrador
} = require('../middlewares/verificarAdministrador');

const {
    protegerSesion
} = require('../middlewares/protegerSesion');


// Consultar todas las solicitudes.
router.get(
    '/solicitudes',
    verificarToken,
    verificarAdministrador,
    consultarSolicitudesAdmin
);


// Consultar el detalle de una solicitud.
router.get(
    '/solicitudes/:id',
    verificarToken,
    verificarAdministrador,
    consultarDetalleSolicitudAdmin
);


// Aprobar una solicitud.
router.post(
    '/solicitudes/:id/aprobar',
    protegerSesion,
    verificarAdministrador,
    aprobarSolicitudAdminController
);


// Rechazar una solicitud.
router.post(
    '/solicitudes/:id/rechazar',
    protegerSesion,
    verificarAdministrador,
    rechazarSolicitudAdminController
);


module.exports = router;
