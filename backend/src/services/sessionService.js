
const crypto = require('crypto');

const supabaseAdmin = require('../config/supabaseAdmin');

const {
    cifrarToken,
    descifrarToken
} = require('../utils/tokenCrypto');

// Duración máxima de una sesión de ConectaLocal: 7 días.
const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;

// Genera un identificador aleatorio para la cookie.
const generarIdentificadorSesion = () => {
    return crypto.randomBytes(32).toString('base64url');
};

// Calcula el SHA-256 del identificador.
const calcularHashSesion = (identificador) => {
    return crypto
        .createHash('sha256')
        .update(identificador)
        .digest('hex');
};

// CREA UNA SESIÓN
const crearSesion = async ({
    perfilId,
    accessToken,
    refreshToken,
    accessTokenExpiraEn
}) => {
    const identificador = generarIdentificadorSesion();
    const tokenHash = calcularHashSesion(identificador);

    const accessTokenCifrado = cifrarToken(accessToken);
    const refreshTokenCifrado = cifrarToken(refreshToken);

    const ahora = Date.now();

    // Expiración propia de la sesión de ConectaLocal.
    const expiraEn = new Date(
        ahora + DURACION_SESION_MS
    ).toISOString();

    // Expiración independiente del token de Supabase.
    const accessTokenExpira = new Date(
        accessTokenExpiraEn * 1000
    ).toISOString();

    const { error } = await supabaseAdmin
        .from('sesiones')
        .insert({
            perfil_id: perfilId,
            token_hash: tokenHash,
            access_token_cifrado: accessTokenCifrado,
            refresh_token_cifrado: refreshTokenCifrado,
            expira_en: expiraEn,
            access_token_expira_en: accessTokenExpira
        });

    if (error) {
        console.error('Error al crear sesión:', error.message);
        throw new Error('No fue posible crear la sesión.');
    }

    return {
        identificador,
        expiraEn
    };
};

// CONSULTA UNA SESIÓN
const obtenerSesion = async (identificador) => {
    if (
        typeof identificador !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(identificador)
    ) {
        return null;
    }

    const tokenHash = calcularHashSesion(identificador);

    const { data, error } = await supabaseAdmin
        .from('sesiones')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('revocada_en', null)
        .gt('expira_en', new Date().toISOString())
        .maybeSingle();

    if (error) {
        console.error('Error al consultar sesión:', error.message);
        throw new Error('No fue posible consultar la sesión.');
    }

    if (!data) {
        return null;
    }

    try {
        const accessToken = descifrarToken(
            data.access_token_cifrado
        );

        const refreshToken = descifrarToken(
            data.refresh_token_cifrado
        );

        const { error: updateError } = await supabaseAdmin
            .from('sesiones')
            .update({
                ultimo_acceso: new Date().toISOString()
            })
            .eq('id', data.id);

        if (updateError) {
            throw updateError;
        }

        return {
            id: data.id,
            perfilId: data.perfil_id,
            accessToken,
            refreshToken,
            expiraEn: data.expira_en,
            accessTokenExpiraEn: data.access_token_expira_en
        };

    } catch (error) {
        console.error('Error al recuperar sesión:', error.message);
        throw new Error('No fue posible recuperar la sesión.');
    }
};


// GENERA UN TOKEN CSRF
const generarTokenCSRF = () => {
    return crypto.randomBytes(32).toString('base64url');
};

// CALCULA EL HASH DEL TOKEN CSRF
const calcularHashCSRF = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

// CREA Y ALMACENA UN TOKEN CSRF PARA UNA SESIÓN
const crearTokenCSRF = async (sesionId) => {
    const tokenCSRF = generarTokenCSRF();
    const tokenHash = calcularHashCSRF(tokenCSRF);

    const { data, error } = await supabaseAdmin
        .from('sesiones')
        .update({
            csrf_token_hash: tokenHash
        })
        .eq('id', sesionId)
        .is('revocada_en', null)
        .gt('expira_en', new Date().toISOString())
        .select('id')
        .maybeSingle();

    if (error || !data) {
        console.error(
            'Error al guardar token CSRF:',
            error?.message || 'Sesión no válida.'
        );

        throw new Error('No fue posible generar el token CSRF.');
    }

    // El token original se entrega al frontend.
    // En la base de datos únicamente se conserva su hash.
    return tokenCSRF;
};

// VALIDA UN TOKEN CSRF
const validarTokenCSRF = async ({ sesionId, tokenCSRF }) => {
    if (
        typeof tokenCSRF !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(tokenCSRF)
    ) {
        return false;
    }

    const { data, error } = await supabaseAdmin
        .from('sesiones')
        .select('csrf_token_hash')
        .eq('id', sesionId)
        .is('revocada_en', null)
        .gt('expira_en', new Date().toISOString())
        .maybeSingle();

    if (error) {
        console.error(
            'Error al consultar token CSRF:',
            error.message
        );

        throw new Error('No fue posible validar el token CSRF.');
    }

    if (!data?.csrf_token_hash) {
        return false;
    }

    const hashRecibido = calcularHashCSRF(tokenCSRF);

    const hashGuardado = Buffer.from(
        data.csrf_token_hash,
        'hex'
    );

    const hashComparar = Buffer.from(
        hashRecibido,
        'hex'
    );

    if (
        hashGuardado.length !== hashComparar.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        hashGuardado,
        hashComparar
    );
};


// REVOCA UNA SESIÓN
const revocarSesion = async (identificador) => {
    if (
        typeof identificador !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(identificador)
    ) {
        return;
    }

    const tokenHash = calcularHashSesion(identificador);

    const { error } = await supabaseAdmin
        .from('sesiones')
        .update({
            revocada_en: new Date().toISOString()
        })
        .eq('token_hash', tokenHash)
        .is('revocada_en', null);

    if (error) {
        console.error('Error al revocar sesión:', error.message);
        throw new Error('No fue posible cerrar la sesión.');
    }
};

// ACTUALIZA LOS TOKENS DE UNA SESIÓN
const actualizarTokensSesion = async ({
    sesionId,
    accessToken,
    refreshToken,
    accessTokenExpiraEn
}) => {
    const accessTokenCifrado = cifrarToken(accessToken);
    const refreshTokenCifrado = cifrarToken(refreshToken);

    const { error } = await supabaseAdmin
        .from('sesiones')
        .update({
            access_token_cifrado: accessTokenCifrado,
            refresh_token_cifrado: refreshTokenCifrado,
            access_token_expira_en: new Date(
                accessTokenExpiraEn * 1000
            ).toISOString()
        })
        .eq('id', sesionId)
        .is('revocada_en', null);

    if (error) {
        console.error('Error al actualizar tokens:', error.message);
        throw new Error('No fue posible actualizar los tokens de sesión.');
    }
};

module.exports = {
    crearSesion,
    obtenerSesion,
    actualizarTokensSesion,
    revocarSesion,
    crearTokenCSRF,
    validarTokenCSRF
};
