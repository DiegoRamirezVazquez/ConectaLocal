
const API_URL = import.meta.env.VITE_API_URL;

// Procesar las respuestas del backend.
const procesarRespuesta = async (response) => {
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.mensaje || 'Ocurrió un error al procesar la solicitud.'
        );
    }

    return data;
};

// CONSULTAR PUBLICACIONES, COMENTARIOS Y REACCIONES.
export const obtenerPublicaciones = async () => {
    const response = await fetch(
        `${API_URL}/publicaciones`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await procesarRespuesta(response);

    return data.publicaciones || [];
};

// CREAR UNA PUBLICACIÓN.
export const crearPublicacion = async (publicacion) => {
    const response = await fetch(
        `${API_URL}/publicaciones`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(publicacion)
        }
    );

    const data = await procesarRespuesta(response);

    return data.publicacion;
};

// EDITAR UNA PUBLICACIÓN PROPIA.
export const actualizarPublicacion = async (
    publicacionId,
    datos
) => {
    const response = await fetch(
        `${API_URL}/publicaciones/${publicacionId}`,
        {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        }
    );

    const data = await procesarRespuesta(response);

    return data.publicacion;
};

// ELIMINAR UNA PUBLICACIÓN PROPIA.
export const eliminarPublicacion = async (publicacionId) => {
    const response = await fetch(
        `${API_URL}/publicaciones/${publicacionId}`,
        {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    return procesarRespuesta(response);
};

// AGREGAR UN COMENTARIO.
export const agregarComentario = async (
    publicacionId,
    contenido
) => {
    const response = await fetch(
        `${API_URL}/publicaciones/${publicacionId}/comentarios`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contenido })
        }
    );

    const data = await procesarRespuesta(response);

    return data.comentario;
};

// EDITAR UN COMENTARIO PROPIO.
export const actualizarComentario = async (
    comentarioId,
    contenido
) => {
    const response = await fetch(
        `${API_URL}/publicaciones/comentarios/${comentarioId}`,
        {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contenido })
        }
    );

    const data = await procesarRespuesta(response);

    return data.comentario;
};

// ELIMINAR UN COMENTARIO PROPIO.
export const eliminarComentario = async (comentarioId) => {
    const response = await fetch(
        `${API_URL}/publicaciones/comentarios/${comentarioId}`,
        {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    return procesarRespuesta(response);
};

// DAR O QUITAR ME GUSTA.
export const alternarReaccion = async (publicacionId) => {
    const response = await fetch(
        `${API_URL}/publicaciones/${publicacionId}/reaccion`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            }
        }
    );

    const data = await procesarRespuesta(response);

    return data.data;
};

// REPORTAR UNA PUBLICACIÓN.
export const reportarPublicacion = async (
    publicacionId,
    motivo,
    descripcion = ''
) => {
    const response = await fetch(
        `${API_URL}/publicaciones/${publicacionId}/reportar`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                motivo,
                descripcion
            })
        }
    );

    const data = await procesarRespuesta(response);

    return data.reporte;
};

// AGREGAR FOTOGRAFÍAS A UNA PUBLICACIÓN.
export const agregarFotosPublicacion = async (
    publicacionId,
    archivos
) => {
    const formData = new FormData();

    archivos.forEach((archivo) => {
        formData.append('fotografias', archivo);
    });

    const response = await fetch(
        `${API_URL}/publicaciones/${publicacionId}/fotografias`,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            },
            body: formData
        }
    );

    const data = await procesarRespuesta(response);

    return data.fotografias || [];
};
