
const { createClient } = require('@supabase/supabase-js');

const {
    obtenerSesion,
    actualizarTokensSesion,
    revocarSesion
} = require('../services/sessionService');

// Margen de 60 segundos para renovar antes de que expire el token.
const MARGEN_RENOVACION_SEGUNDOS = 60;

// Verifica la sesión mediante la cookie HttpOnly.
const verificarToken = async (req, res, next) => {
    try {
        // 1. Recuperar el identificador de la cookie.
        const identificador = req.cookies?.app_session;

        if (!identificador) {
            return res.status(401).json({
                success: false,
                codigo: 'SESION_REQUERIDA',
                mensaje: 'Debes iniciar sesión para realizar esta operación.'
            });
        }

        // 2. Buscar la sesión en nuestra base de datos.
        const sesion = await obtenerSesion(identificador);

        if (!sesion) {
            res.clearCookie('app_session', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
            });

            return res.status(401).json({
                success: false,
                codigo: 'SESION_INVALIDA',
                mensaje: 'Tu sesión no es válida o ha expirado.'
            });
        }

        let accessToken = sesion.accessToken;
        let refreshToken = sesion.refreshToken;

        const fechaExpiracion = Date.parse(
            sesion.accessTokenExpiraEn
        );

        const tokenNecesitaRenovacion =
            !Number.isFinite(fechaExpiracion) ||
            fechaExpiracion <=
                Date.now() +
                MARGEN_RENOVACION_SEGUNDOS * 1000;

        // 3. Renovar el token si está próximo a expirar.
        if (tokenNecesitaRenovacion) {
            const supabaseAuth = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_PUBLISHABLE_KEY ||
                process.env.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data, error } =
                await supabaseAuth.auth.refreshSession({
                    refresh_token: refreshToken
                });

            if (error || !data.session) {
                console.error(
                    'No fue posible renovar la sesión:',
                    error?.message
                );

                await revocarSesion(identificador);

                res.clearCookie('app_session', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/'
                });

                return res.status(401).json({
                    success: false,
                    codigo: 'SESION_EXPIRADA',
                    mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.'
                });
            }

            const nuevaSesion = data.session;

            accessToken = nuevaSesion.access_token;
            refreshToken = nuevaSesion.refresh_token;

            const accessTokenExpiraEn =
                nuevaSesion.expires_at ||
                Math.floor(Date.now() / 1000) +
                nuevaSesion.expires_in;

            // 4. Guardar los nuevos tokens cifrados.
            await actualizarTokensSesion({
                sesionId: sesion.id,
                accessToken,
                refreshToken,
                accessTokenExpiraEn
            });
        }

        // 5. Verificar la identidad con Supabase.
        const supabaseAuth = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        const { data, error } =
            await supabaseAuth.auth.getUser(accessToken);

        if (error || !data.user) {
            await revocarSesion(identificador);

            res.clearCookie('app_session', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
            });

            return res.status(401).json({
                success: false,
                codigo: 'SESION_INVALIDA',
                mensaje: 'Tu sesión no es válida. Inicia sesión nuevamente.'
            });
        }

        // 6. Entregar la identidad verificada a los controladores.
        req.usuario = {
            id: data.user.id,
            email: data.user.email
        };

        // Disponible únicamente dentro del backend.
        req.accessToken = accessToken;
        req.sesionId = sesion.id;

        next();

    } catch (error) {
        console.error(
            'Error al verificar autenticación:',
            error.message
        );

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_AUTENTICACION',
            mensaje: 'No fue posible verificar tu sesión.'
        });
    }
};

module.exports = {
    verificarToken
};
