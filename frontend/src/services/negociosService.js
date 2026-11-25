import { enviarSolicitud } from './authService';
const API_URL = import.meta.env.VITE_API_URL;

// CONSULTAR EL DIRECTORIO PÚBLICO.
export const obtenerNegociosPublicos = async () => {
    const response = await fetch(
        `${API_URL}/negocios/publicos`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje ||
            'No fue posible consultar los negocios.'
        );
    }

    return data.negocios || [];
};

// CONSULTAR EL PERFIL PÚBLICO DE UN NEGOCIO.
export const obtenerNegocioPublico = async (negocioId) => {
    const response = await fetch(
        `${API_URL}/negocios/publico/${negocioId}`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje ||
            'No fue posible consultar el negocio.'
        );
    }

    return data.negocio;
};

// CONSULTAR GALERÍA PÚBLICA DE UN NEGOCIO.
export const obtenerFotosNegocioPublicas = async (negocioId) => {
    const response = await fetch(
        `${API_URL}/negocios/${negocioId}/fotografias/publicas`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje ||
            'No fue posible consultar las fotografías del negocio.'
        );
    }

    return data.fotografias || [];
};


// CONSULTAR RESEÑAS DESTACADAS DE UN NEGOCIO.
export const obtenerResenasDestacadas = async (negocioId) => {
    const response = await fetch(
        `${API_URL}/resenas/negocio/${negocioId}/destacadas`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje ||
            'No fue posible consultar las reseñas del negocio.'
        );
    }

    return {
        total: data.total || 0,
        promedio: data.promedio || 0,
        destacadas: data.destacadas || {
            cinco_estrellas: null,
            intermedia: null,
            una_estrella: null
        }
    };
};


// CONSULTAR TODAS LAS RESEÑAS PÚBLICAS DE UN NEGOCIO.
export const obtenerResenasNegocio = async (negocioId) => {
    const response = await fetch(
        `${API_URL}/resenas/negocio/${negocioId}`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje ||
            'No fue posible consultar todas las reseñas del negocio.'
        );
    }

    return data.resenas || [];
};

// CONSULTAR EL MURO GENERAL DE RESEÑAS.
export const obtenerMuroResenas = async () => {
    const response = await fetch(
        `${API_URL}/resenas/muro`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje ||
            'No fue posible consultar las reseñas de la comunidad.'
        );
    }

    return data.resenas || [];
};


// CONSULTAR LA RESEÑA PROPIA DEL USUARIO.
export const obtenerResenaPropia = async (negocioId) => {
    const data = await enviarSolicitud(
        `/resenas/negocio/${negocioId}/propia`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    return data.resena || null;
};

// PUBLICAR UNA RESEÑA.
export const publicarResena = async (
    negocioId,
    estrellas,
    comentario
) => {
    const data = await enviarSolicitud(
        `/resenas/negocio/${negocioId}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                estrellas,
                comentario
            })
        }
    );

    return data.resena;
};

// ACTUALIZAR UNA RESEÑA PROPIA.
export const actualizarResena = async (
    resenaId,
    estrellas,
    comentario
) => {
    const data = await enviarSolicitud(
        `/resenas/${resenaId}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                estrellas,
                comentario
            })
        }
    );

    return data.resena;
};

// ELIMINAR UNA RESEÑA PROPIA.
export const eliminarResena = async (resenaId) => {
    const data = await enviarSolicitud(
        `/resenas/${resenaId}`,
        {
            method: 'DELETE',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    return data;
};

