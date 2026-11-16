
const API_URL = import.meta.env.VITE_API_URL;

// Token CSRF conservado únicamente en memoria.
let csrfToken = null;

// Promesa compartida para evitar generar varios tokens simultáneamente.
let solicitudTokenCSRF = null;

// Obtiene un token CSRF asociado a la sesión actual.
const obtenerTokenCSRF = async (forzarRenovacion = false) => {
    if (forzarRenovacion) {
        csrfToken = null;
    }

    if (csrfToken && !forzarRenovacion) {
        return csrfToken;
    }

    if (!solicitudTokenCSRF) {
        solicitudTokenCSRF = (async () => {
            const response = await fetch(`${API_URL}/auth/csrf-token`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok || !data.csrfToken) {
                throw new Error(
                    data.mensaje || 'No fue posible obtener el token CSRF.'
                );
            }

            csrfToken = data.csrfToken;
            return csrfToken;
        })();
    }

    try {
        return await solicitudTokenCSRF;
    } finally {
        solicitudTokenCSRF = null;
    }
};

// Ejecuta una petición HTTP.
const ejecutarSolicitud = async (endpoint, opciones, csrfActual) => {
    const metodo = (opciones.method || 'GET').toUpperCase();
    const metodosSeguros = ['GET', 'HEAD', 'OPTIONS'];
    const esFormData = opciones.body instanceof FormData;

    const headers = {
        ...opciones.headers
    };

    if (!esFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (!metodosSeguros.includes(metodo)) {
        headers['X-CSRF-Token'] = csrfActual;
    }

    return fetch(`${API_URL}${endpoint}`, {
        ...opciones,
        method: metodo,
        credentials: 'include',
        headers
    });
};

// Procesa la respuesta HTTP.
const procesarRespuesta = async (response) => {
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.mensaje ||
            data.message ||
            'No fue posible completar la solicitud.'
        );

        error.status = response.status;
        error.codigo = data.codigo;

        throw error;
    }

    return data;
};

// FUNCIÓN PRINCIPAL PARA ENVIAR SOLICITUDES.
export const enviarSolicitud = async (endpoint, opciones = {}) => {
    const metodo = (opciones.method || 'GET').toUpperCase();

    const metodosSeguros = ['GET', 'HEAD', 'OPTIONS'];

    const rutasPublicas = [
        '/auth/login',
        '/auth/register'
    ];

    const esRutaPublica = rutasPublicas.includes(endpoint);
    const necesitaCSRF =
        !metodosSeguros.includes(metodo) && !esRutaPublica;

    try {
        let tokenActual = null;

        if (necesitaCSRF) {
            tokenActual = await obtenerTokenCSRF();
        }

        let response = await ejecutarSolicitud(
            endpoint,
            opciones,
            tokenActual
        );

        // Si el token expiró o fue reemplazado, renovarlo y reintentar una vez.
        if (
            necesitaCSRF &&
            response.status === 403
        ) {
            const respuestaTexto = await response.clone().json();

            if (respuestaTexto.codigo === 'CSRF_TOKEN_INVALIDO') {
                tokenActual = await obtenerTokenCSRF(true);

                response = await ejecutarSolicitud(
                    endpoint,
                    opciones,
                    tokenActual
                );
            }
        }

        return await procesarRespuesta(response);

    } catch (error) {
        if (error.status) {
            throw error;
        }

        throw new Error(
            error.message ||
            'No se pudo conectar con el servidor. Verifica tu conexión.'
        );
    }
};

// INICIAR SESIÓN.
export const loginRequest = async (email, password) => {
    csrfToken = null;

    return enviarSolicitud('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
};

// REGISTRAR USUARIO.
export const registerRequest = async ({
    nombre, email, password, rol, telefono
}) =>
    enviarSolicitud('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            nombre,
            email,
            password,
            rol,
            ...(telefono?.trim() ? { telefono: telefono.trim() } : {})
        })
    });

// OBTENER USUARIO ACTUAL.
export const getCurrentUserRequest = async () =>
    enviarSolicitud('/auth/me', {
        method: 'GET'
    });

// CERRAR SESIÓN.
export const logoutRequest = async () => {
    try {
        return await enviarSolicitud('/auth/logout', {
            method: 'POST'
        });
    } finally {
        csrfToken = null;
    }
};

// ENVIAR FORMULARIOS.
export const enviarFormularioRequest = (endpoint, formData) =>
    enviarSolicitud(endpoint, {
        method: 'POST',
        body: formData
    });
