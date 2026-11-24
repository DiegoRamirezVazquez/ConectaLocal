const { createClient } = require('@supabase/supabase-js');
const { crearSesion, crearTokenCSRF} = require('../services/sessionService');
const supabaseAdmin = require('../config/supabaseAdmin');
const { revocarSesion } = require('../services/sessionService');

const crearClienteAuth = () => {
    const supabaseUrl = process.env.SUPABASE_URL;

    const supabaseKey =
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuración de Supabase incompleta.');
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
};

// REGISTRO
const register = async (req, res) => {
    try {
        const {
            nombre,
            email,
            password,
            rol,
            telefono
        } = req.body;

        // Validar campos obligatorios
        if (
            typeof nombre !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof rol !== 'string'
        ) {
            return res.status(400).json({
                codigo: 'DATOS_INVALIDOS',
                mensaje: 'Debes proporcionar nombre, correo, contraseña y rol.'
            });
        }

        const nombreLimpio = nombre.trim();
        const emailLimpio = email.trim().toLowerCase();

        if (nombreLimpio.length < 2 || nombreLimpio.length > 100) {
            return res.status(400).json({
                codigo: 'NOMBRE_INVALIDO',
                mensaje: 'El nombre debe tener entre 2 y 100 caracteres.'
            });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio);

        if (!emailValido) {
            return res.status(400).json({
                codigo: 'EMAIL_INVALIDO',
                mensaje: 'El correo electrónico no tiene un formato válido.'
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                codigo: 'PASSWORD_INVALIDO',
                mensaje: 'La contraseña debe tener entre 8 y 72 caracteres.'
            });
        }

        // El registro público nunca puede crear administradores
        if (!['usuario', 'trabajador'].includes(rol)) {
            return res.status(400).json({
                codigo: 'ROL_INVALIDO',
                mensaje: 'El rol debe ser usuario o trabajador.'
            });
        }

        let telefonoLimpio = null;

        if (telefono !== undefined && telefono !== null && telefono !== '') {
            if (
                typeof telefono !== 'string' ||
                !/^[0-9+\-\s]{7,20}$/.test(telefono.trim())
            ) {
                return res.status(400).json({
                    codigo: 'TELEFONO_INVALIDO',
                    mensaje: 'El teléfono no tiene un formato válido.'
                });
            }

            telefonoLimpio = telefono.trim();
        }

        const authClient = crearClienteAuth();

        // Crear cuenta en Supabase Auth
        const { data, error } = await authClient.auth.signUp({
            email: emailLimpio,
            password,
            options: {
                data: {
                    nombre: nombreLimpio,
                    telefono: telefonoLimpio,
                    tipo_cuenta: rol
                },
                emailRedirectTo: `${
                    process.env.FRONTEND_URL || 'http://localhost:9090'
                }/login`
            }
        });

        if (error) {
            const errorCode = error.code;
            const errorMessage = error.message?.toLowerCase() || '';

            if (
                errorCode === 'user_already_exists' ||
                errorMessage.includes('already registered') ||
                errorMessage.includes('already been registered')
            ) {
                return res.status(409).json({
                    codigo: 'EMAIL_REGISTRADO',
                    mensaje: 'Este correo electrónico ya está registrado.'
                });
            }

            if (
                error.status === 429 ||
                errorCode === 'over_request_rate_limit'
            ) {
                return res.status(429).json({
                    codigo: 'DEMASIADAS_SOLICITUDES',
                    mensaje: 'Demasiados intentos. Intenta más tarde.'
                });
            }

            console.error('Error de registro en Supabase:', error.message);

            return res.status(400).json({
                codigo: 'ERROR_REGISTRO',
                mensaje: 'No fue posible crear la cuenta.'
            });
        }

        if (!data.user) {
            return res.status(500).json({
                codigo: 'ERROR_REGISTRO',
                mensaje: 'Supabase no devolvió los datos de la cuenta creada.'
            });
        }

        // El trigger crea el perfil con rol efectivo usuario.
        // Si solicitó trabajador, también crea la solicitud pendiente.
        return res.status(201).json({
            mensaje: 'Cuenta creada. Confirma tu correo electrónico para iniciar sesión.',
            confirmacionCorreoRequerida: true,
            solicitudTrabajador: rol === 'trabajador'
                ? 'pendiente'
                : 'no_solicitada',
            perfil: {
                id: data.user.id,
                nombre: nombreLimpio,
                email: emailLimpio,
                rol: 'usuario',
                telefono: telefonoLimpio,
                avatarUrl: null,
                biografia: null,
                creadoEn: data.user.created_at
            }
        });

    } catch (error) {
        console.error('Error interno en registro:', error.message);

        return res.status(500).json({
            codigo: 'ERROR_INTERNO',
            mensaje: 'Error interno del servidor.'
        });
    }
};

// INICIO DE SESIÓN

// INICIO DE SESIÓN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Debes proporcionar un correo y una contraseña válidos.'
            });
        }

        const authClient = crearClienteAuth();

        // 1. Validar credenciales con Supabase Auth.
        const { data: authData, error: authError } =
            await authClient.auth.signInWithPassword({
                email: email.trim(),
                password
            });

        if (authError) {
            const errorCode = authError.code;
            const errorMessage = authError.message?.toLowerCase() || '';

            if (
                errorCode === 'email_not_confirmed' ||
                errorMessage.includes('email not confirmed')
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Debes confirmar tu correo electrónico antes de iniciar sesión.'
                });
            }

            if (
                authError.status === 429 ||
                errorCode === 'over_request_rate_limit'
            ) {
                return res.status(429).json({
                    success: false,
                    message: 'Demasiados intentos. Intenta nuevamente más tarde.'
                });
            }

            if (
                errorCode === 'invalid_credentials' ||
                errorMessage.includes('invalid login credentials')
            ) {
                return res.status(401).json({
                    success: false,
                    message: 'El correo electrónico o la contraseña son incorrectos.'
                });
            }

            console.error('Error de autenticación:', authError.message);

            return res.status(500).json({
                success: false,
                message: 'No fue posible iniciar sesión.'
            });
        }

        const { user, session } = authData;

        if (!user || !session) {
            return res.status(401).json({
                success: false,
                message: 'No se pudo establecer la sesión.'
            });
        }

        // 2. Recuperar el perfil del usuario.

        // 2. Recuperar el perfil del usuario mediante el cliente administrativo.
        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select(`
                id,
                nombre,
                email,
                rol,
                telefono,
                avatar_url,
                biografia,
                creado_en
            `)
            .eq('id', user.id)
            .single();


        if (perfilError || !perfil) {
            console.error(
                'Error al consultar el perfil:',
                perfilError?.message
            );

            return res.status(500).json({
                success: false,
                message: 'No se pudo recuperar el perfil del usuario.'
            });
        }

        // 3. Guardar los tokens cifrados en el servidor.
        const accessTokenExpiraEn =
            session.expires_at ||
            Math.floor(Date.now() / 1000) + session.expires_in;

        const nuevaSesion = await crearSesion({
            perfilId: perfil.id,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            accessTokenExpiraEn
        });

        // 4. Entregar únicamente el identificador opaco en una cookie.
        const esProduccion = process.env.NODE_ENV === 'production';

        const tiempoRestante = Math.max(
            0,
            new Date(nuevaSesion.expiraEn).getTime() - Date.now()
        );

        res.cookie('app_session', nuevaSesion.identificador, {
            httpOnly: true,
            secure: esProduccion,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: tiempoRestante
        });

        // 5. Devolver el perfil, nunca los tokens de Supabase.
        return res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso.',
            perfil: {
                id: perfil.id,
                nombre: perfil.nombre,
                email: perfil.email,
                rol: perfil.rol,
                telefono: perfil.telefono,
                avatarUrl: perfil.avatar_url,
                biografia: perfil.biografia,
                creadoEn: perfil.creado_en
            }
        });

    } catch (error) {
        console.error('Error interno en login:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.'
        });
    }
};


// RECUPERAR PERFIL DE LA SESIÓN ACTUAL
const me = async (req, res) => {
    try {
        const { data: perfil, error } = await supabaseAdmin
            .from('perfiles')
            .select(`
                id,
                nombre,
                email,
                rol,
                telefono,
                avatar_url,
                biografia,
                creado_en
            `)
            .eq('id', req.usuario.id)
            .single();

        if (error || !perfil) {
            return res.status(404).json({
                success: false,
                codigo: 'PERFIL_NO_ENCONTRADO',
                mensaje: 'No fue posible recuperar tu perfil.'
            });
        }

        return res.status(200).json({
            success: true,
            perfil: {
                id: perfil.id,
                nombre: perfil.nombre,
                email: perfil.email,
                rol: perfil.rol,
                telefono: perfil.telefono,
                avatarUrl: perfil.avatar_url,
                biografia: perfil.biografia,
                creadoEn: perfil.creado_en
            }
        });

    } catch (error) {
        console.error('Error al recuperar perfil:', error.message);

        return res.status(500).json({
            success: false,
            mensaje: 'Error interno del servidor.'
        });
    }
};


 // GENERAR TOKEN CSRF PARA LA SESIÓN ACTUAL
const obtenerTokenCSRF = async (req, res) => {
    try {
        // req.sesionId es proporcionado por verificarToken.
        if (!req.sesionId) {
            return res.status(401).json({
                success: false,
                codigo: 'SESION_NO_VALIDA',
                mensaje: 'Debes iniciar sesión para obtener el token de seguridad.'
            });
        }

        const tokenCSRF = await crearTokenCSRF(req.sesionId);

        return res.status(200).json({
            success: true,
            csrfToken: tokenCSRF
        });

    } catch (error) {
        console.error('Error al generar token CSRF:', error.message);

        return res.status(500).json({
            success: false,
            codigo: 'ERROR_GENERAR_CSRF',
            mensaje: 'No fue posible generar el token de seguridad.'
        });
    }
};


// CERRAR SESIÓN
const logout = async (req, res) => {
    try {
        const identificador = req.cookies?.app_session;

        if (identificador) {
            await revocarSesion(identificador);
        }

        res.clearCookie('app_session', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });

        return res.status(200).json({
            success: true,
            mensaje: 'Sesión cerrada correctamente.'
        });

    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);

        return res.status(500).json({
            success: false,
            mensaje: 'No fue posible cerrar la sesión.'
        });
    }
};



module.exports = {
    register,
    login,
    me,
    logout,
    obtenerTokenCSRF
};
