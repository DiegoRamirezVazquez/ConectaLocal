
const supabaseAdmin = require('../config/supabaseAdmin');

// Verifica que el usuario autenticado tenga el rol de administrador.
const verificarAdministrador = async (req, res, next) => {
    try {
        // El ID proviene de la sesión validada por verificarToken.
        const usuarioId = req.usuario?.id;

        if (!usuarioId) {
            return res.status(401).json({
                success: false,
                codigo: 'SESION_REQUERIDA',
                mensaje: 'Debes iniciar sesión para realizar esta operación.'
            });
        }

        // Consultar el rol directamente en la base de datos.
        const { data: perfil, error } = await supabaseAdmin
            .from('perfiles')
            .select('id, rol')
            .eq('id', usuarioId)
            .maybeSingle();

        if (error) {
            console.error(
                'Error al verificar el rol del administrador:',
                error.message
            );

            return res.status(500).json({
                success: false,
                codigo: 'ERROR_VERIFICAR_ROL',
                mensaje: 'No fue posible verificar tus permisos.'
            });
        }

        // Denegar el acceso si no existe el perfil o no es administrador.
        if (!perfil || perfil.rol !== 'administrador') {
            return res.status(403).json({
                success: false,
                codigo: 'ACCESO_DENEGADO',
                mensaje: 'No tienes permisos para acceder a esta sección.'
            });
        }

        // Guardar el rol verificado para los siguientes controladores.
        req.usuario.rol = perfil.rol;

        return next();

    } catch (error) {
        console.error(
            'Error en middleware de administrador:',
            error.message
        );

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_INTERNO',
            mensaje: 'Ocurrió un error al verificar los permisos.'
        });
    }
};

module.exports = {
    verificarAdministrador
};
