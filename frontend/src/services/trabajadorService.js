
const API_URL = import.meta.env.VITE_API_URL;

// Consultar el historial de solicitudes del trabajador autenticado.
export const obtenerMisSolicitudes = async () => {
    const response = await fetch(
        `${API_URL}/solicitudes-trabajador/mi-solicitud`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.mensaje ||
            data.message ||
            'No fue posible consultar tus solicitudes.'
        );

        error.status = response.status;
        error.codigo = data.codigo;

        throw error;
    }

    return data;
};


export const obtenerCategorias = async () => {
    const response = await fetch(
        `${API_URL}/solicitudes-trabajador/categorias`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje ||
            'No fue posible consultar las categorías.'
        );
    }

    return data.categorias || [];
};


// CONSULTAR LOS NEGOCIOS DEL TRABAJADOR AUTENTICADO.
export const obtenerMisNegocios = async () => {
    const response = await fetch(
        `${API_URL}/negocios/mis-negocios`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.mensaje ||
            data.message ||
            'No fue posible consultar tus negocios.'
        );

        error.status = response.status;
        error.codigo = data.codigo;

        throw error;
    }

    return data;
};


// ACTUALIZAR LA FOTOGRAFÍA PRINCIPAL DE UN NEGOCIO.
export const actualizarFotoPrincipalNegocio = async (
    negocioId,
    fotografia
) => {
    const formulario = new FormData();

    formulario.append('fotografia', fotografia);

    const response = await fetch(
        `${API_URL}/negocios/${negocioId}/foto-principal`,
        {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            },
            body: formulario
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.mensaje ||
            data.message ||
            'No fue posible actualizar la fotografía.'
        );

        error.status = response.status;
        error.codigo = data.codigo;

        throw error;
    }

    return data;
};


// CONSULTAR LAS FOTOGRAFÍAS DE UN NEGOCIO.
export const obtenerFotosNegocio = async (negocioId) => {
    const response = await fetch(
        `${API_URL}/negocios/${negocioId}/fotografias`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.mensaje ||
            'No fue posible consultar las fotografías.'
        );

        error.status = response.status;
        error.codigo = data.codigo;

        throw error;
    }

    return data;
};


// AGREGAR FOTOGRAFÍAS A LA GALERÍA DE UN NEGOCIO.
export const agregarFotosNegocio = async (
    negocioId,
    fotografias,
    descripciones = []
) => {
    const formulario = new FormData();

    fotografias.forEach((fotografia) => {
        formulario.append('fotografias', fotografia);
    });

    formulario.append(
        'descripciones',
        JSON.stringify(descripciones)
    );

    const response = await fetch(
        `${API_URL}/negocios/${negocioId}/fotografias`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            },
            body: formulario
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.mensaje ||
            'No fue posible agregar las fotografías.'
        );

        error.status = response.status;
        error.codigo = data.codigo;

        throw error;
    }

    return data;
};


// ELIMINAR UNA FOTOGRAFÍA DE LA GALERÍA.
export const eliminarFotoNegocio = async (
    negocioId,
    fotoId
) => {
    const response = await fetch(
        `${API_URL}/negocios/${negocioId}/fotografias/${fotoId}`,
        {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.mensaje ||
            'No fue posible eliminar la fotografía.'
        );

        error.status = response.status;
        error.codigo = data.codigo;

        throw error;
    }

    return data;
};
