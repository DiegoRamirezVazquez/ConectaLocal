require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const solicitudesTrabajadorRoutes = require('./routes/solicitudesTrabajadorRoutes');
const { verificarToken } = require('./middlewares/authMiddleware');
const administradorRoutes = require('./routes/administradorRoutes');
const negociosRoutes = require('./routes/negociosRoutes');
const fotosNegocioRoutes = require('./routes/fotosNegocioRoutes');

const app = express();

// Verificar el origen de las peticiones que modifican información.
const verificarOrigen = (req, res, next) => {
    const metodosSeguros = ['GET', 'HEAD', 'OPTIONS'];

    // Las peticiones que no modifican información continúan.
    if (metodosSeguros.includes(req.method)) {
        return next();
    }

    const origenPermitido =
        process.env.FRONTEND_URL || 'http://localhost:9090';

    const origenRecibido = req.get('origin');

    // Rechazar peticiones sin un origen válido.
    if (!origenRecibido || origenRecibido !== origenPermitido) {
        return res.status(403).json({
            success: false,
            codigo: 'ORIGEN_NO_PERMITIDO',
            mensaje: 'La solicitud proviene de un origen no autorizado.'
        });
    }

    next();
};

// 1. Configuración de CORS.
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:9090',
    credentials: true
}));

// 2. Middlewares generales.
app.use(express.json());
app.use(cookieParser());
app.use(verificarOrigen);

// 3. Rutas de autenticación.
app.use('/api/v1/auth', authRoutes);

// 4. Rutas de solicitudes de trabajadores.
app.use('/api/v1/solicitudes-trabajador', solicitudesTrabajadorRoutes);
// 5. Rutas administrativas.
app.use('/api/v1/administrador', administradorRoutes);
// 6. Rutas de negocios del trabajador.
app.use('/api/v1/negocios', negociosRoutes);
// 7. Rutas de fotos del negocio.
app.use('/api/v1/negocios', fotosNegocioRoutes);

// Ruta inicial.
app.get('/api/v1/', (req, res) => {
    res.json({
        success: true,
        message: 'API de ConectaLocal funcionando correctamente'
    });
});

// 6. Ruta para probar la autenticación mediante cookie.
app.get('/api/v1/test-auth', verificarToken, (req, res) => {
    return res.status(200).json({
        success: true,
        mensaje: 'Sesión válida. Acceso autorizado.',
        usuario: req.usuario
    });
});

// 7. Iniciar servidor.
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ConectaLocal activo en el puerto ${PORT}`);
});
