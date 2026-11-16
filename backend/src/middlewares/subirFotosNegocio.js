const multer = require('multer');

// Formatos de imagen permitidos.
const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp'
];

// Almacenamiento temporal en memoria.
const almacenamiento = multer.memoryStorage();

const upload = multer({
    storage: almacenamiento,

    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB.
        files: 1                    // Una fotografía principal.
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

// Recibir una sola fotografía en el campo "fotografia".
const procesarFoto = upload.single('fotografia');

const subirFotoNegocio = (req, res, next) => {
    procesarFoto(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    codigo: 'FOTOGRAFIA_DEMASIADO_GRANDE',
                    mensaje: 'La fotografía debe pesar máximo 5 MB.'
                });
            }

            if (
                error.code === 'LIMIT_FILE_COUNT' ||
                error.code === 'LIMIT_UNEXPECTED_FILE'
            ) {
                return res.status(400).json({
                    success: false,
                    codigo: 'LIMITE_FOTOGRAFIAS',
                    mensaje: 'Solo puedes subir una fotografía principal.'
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

        console.error('Error al recibir fotografía del negocio:', error);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_RECIBIR_FOTOGRAFIA',
            mensaje: 'No fue posible procesar la fotografía.'
        });
    });
};

module.exports = {
    subirFotoNegocio
};
