
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
