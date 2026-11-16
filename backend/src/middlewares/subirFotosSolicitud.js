
const multer = require('multer');

// Formatos de imagen permitidos.
const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp'
];

// Configuración de Multer.
const almacenamiento = multer.memoryStorage();

const upload = multer({
    storage: almacenamiento,

    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB por fotografía.
        files: 5                   // Máximo 5 fotografías.
    },

    fileFilter: (req, file, callback) => {
        if (!tiposPermitidos.includes(file.mimetype)) {
            return callback(
                new Error('FORMATO_FOTOGRAFIA_NO_PERMITIDO')
            );
        }

        callback(null, true);
    }
});

// Middleware para recibir las fotografías.
const procesarFotos = upload.array('fotografias', 5);

const subirFotosSolicitud = (req, res, next) => {
    procesarFotos(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    codigo: 'FOTOGRAFIA_DEMASIADO_GRANDE',
                    mensaje: 'Cada fotografía debe pesar máximo 5 MB.'
                });
            }

            if (error.code === 'LIMIT_FILE_COUNT' ||
                error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    codigo: 'LIMITE_FOTOGRAFIAS',
                    mensaje: 'Puedes subir máximo 5 fotografías por solicitud.'
                });
            }
        }

        if (error.message === 'FORMATO_FOTOGRAFIA_NO_PERMITIDO') {
            return res.status(400).json({
                success: false,
                codigo: 'FORMATO_NO_PERMITIDO',
                mensaje: 'Solo se permiten fotografías JPG, PNG y WEBP.'
            });
        }

        console.error('Error al recibir fotografías:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_RECIBIR_FOTOGRAFIAS',
            mensaje: 'No fue posible procesar las fotografías.'
        });
    });
};

module.exports = {
    subirFotosSolicitud
};
