
const supabaseAdmin = require('../config/supabaseAdmin');

// CONSULTAR TODAS LAS RESEÑAS DE UN NEGOCIO.
const obtenerResenasNegocio = async (negocioId) => {
    // Verificar que el negocio exista.
    const { data: negocio, error: errorNegocio } =
        await supabaseAdmin
            .from('negocios')
            .select('id')
            .eq('id', negocioId)
            .maybeSingle();

    if (errorNegocio) {
        console.error('Error al verificar negocio:', errorNegocio.message);
        throw new Error('No fue posible consultar el negocio.');
    }

    if (!negocio) {
        const error = new Error('El negocio no existe.');
        error.codigo = 'NEGOCIO_NO_ENCONTRADO';
        throw error;
    }

    const { data, error } = await supabaseAdmin
        .from('resenas')
        .select(`
            id,
            negocio_id,
            estrellas,
            comentario,
            creado_en,
            actualizado_en
        `)
        .eq('negocio_id', negocioId)
        .order('creado_en', { ascending: false });

    if (error) {
        console.error('Error al consultar reseñas:', error.message);
        throw new Error('No fue posible consultar las reseñas.');
    }

    return data || [];
};


 // CONSULTAR EL MURO GENERAL DE RESEÑAS DE TODOS LOS NEGOCIOS.
const obtenerMuroResenas = async () => {
    const { data, error } = await supabaseAdmin
        .from('resenas')
        .select(`
            id,
            negocio_id,
            estrellas,
            comentario,
            creado_en,
            actualizado_en,
            negocio:negocios (
                id,
                nombre,
                foto_principal_url,
                categoria:categorias (
                    id,
                    nombre,
                    icono
                )
            )
        `)
        .order('creado_en', { ascending: false });

    if (error) {
        console.error(
            'Error al consultar el muro de reseñas:',
            error.message
        );

        throw new Error(
            'No fue posible consultar las reseñas de la comunidad.'
        );
    }

    // Evitar mostrar reseñas cuyo negocio ya no esté disponible.
    return (data || []).filter(
        (resena) => resena.negocio !== null
    );
};


// CONSULTAR LAS TRES RESEÑAS DESTACADAS Y EL PROMEDIO.
const obtenerResenasDestacadas = async (negocioId) => {
    const resenas = await obtenerResenasNegocio(negocioId);

    const resenaCincoEstrellas =
        resenas.find(resena => resena.estrellas === 5) || null;

    const resenaIntermedia =
        resenas.find(resena =>
            resena.estrellas >= 2 && resena.estrellas <= 4
        ) || null;

    const resenaUnaEstrella =
        resenas.find(resena => resena.estrellas === 1) || null;

    const promedio = resenas.length
        ? Number((
            resenas.reduce(
                (total, resena) => total + resena.estrellas,
                0
            ) / resenas.length
        ).toFixed(1))
        : 0;

    return {
        total: resenas.length,
        promedio,
        destacadas: {
            cinco_estrellas: resenaCincoEstrellas,
            intermedia: resenaIntermedia,
            una_estrella: resenaUnaEstrella
        }
    };
};

// VERIFICAR QUE EL NEGOCIO EXISTA.
const verificarNegocio = async (negocioId) => {
    const { data, error } = await supabaseAdmin
        .from('negocios')
        .select('id, propietario_id')
        .eq('id', negocioId)
        .maybeSingle();

    if (error) {
        console.error('Error al verificar negocio:', error.message);
        throw new Error('No fue posible verificar el negocio.');
    }

    if (!data) {
        const errorNegocio = new Error('El negocio no existe.');
        errorNegocio.codigo = 'NEGOCIO_NO_ENCONTRADO';
        throw errorNegocio;
    }

    return data;
};

// VALIDAR QUE EL USUARIO PUEDA PUBLICAR RESEÑAS.
const verificarPermisoResena = async (negocioId, perfilId) => {
    const negocio = await verificarNegocio(negocioId);

    if (negocio.propietario_id === perfilId) {
        const error = new Error(
            'No puedes publicar una reseña en tu propio negocio.'
        );
        error.codigo = 'PROPIETARIO_NO_PUEDE_RESENAR';
        throw error;
    }

    const { data: perfil, error } = await supabaseAdmin
        .from('perfiles')
        .select('id, rol')
        .eq('id', perfilId)
        .maybeSingle();

    if (error) {
        console.error('Error al verificar perfil:', error.message);
        throw new Error('No fue posible verificar tu perfil.');
    }

    if (!perfil || perfil.rol !== 'usuario') {
        const errorRol = new Error(
            'Solo los usuarios pueden publicar reseñas.'
        );
        errorRol.codigo = 'ROL_NO_AUTORIZADO';
        throw errorRol;
    }

    return negocio;
};

// CREAR UNA RESEÑA.
const crearResena = async (
    negocioId,
    perfilId,
    estrellas,
    comentario
) => {
    await verificarPermisoResena(negocioId, perfilId);

    const { data: existente, error: errorExistente } =
        await supabaseAdmin
            .from('resenas')
            .select('id')
            .eq('negocio_id', negocioId)
            .eq('autor_id', perfilId)
            .maybeSingle();

    if (errorExistente) {
        console.error('Error al verificar reseña:', errorExistente.message);
        throw new Error('No fue posible verificar tu reseña.');
    }

    if (existente) {
        const error = new Error(
            'Ya has publicado una reseña para este negocio.'
        );
        error.codigo = 'RESENA_DUPLICADA';
        throw error;
    }

    const { data, error } = await supabaseAdmin
        .from('resenas')
        .insert({
            negocio_id: negocioId,
            autor_id: perfilId,
            estrellas,
            comentario
        })
        .select(`
            id,
            negocio_id,
            estrellas,
            comentario,
            creado_en,
            actualizado_en
        `)
        .single();

    if (error) {
        console.error('Error al crear reseña:', error.message);

        if (error.code === '23505') {
            const duplicada = new Error(
                'Ya has publicado una reseña para este negocio.'
            );
            duplicada.codigo = 'RESENA_DUPLICADA';
            throw duplicada;
        }

        throw new Error('No fue posible publicar la reseña.');
    }

    return data;
};

// ACTUALIZAR UNA RESEÑA PROPIA.
const actualizarResena = async (
    resenaId,
    perfilId,
    estrellas,
    comentario
) => {
    const { data, error } = await supabaseAdmin
        .from('resenas')
        .update({
            estrellas,
            comentario,
            actualizado_en: new Date().toISOString()
        })
        .eq('id', resenaId)
        .eq('autor_id', perfilId)
        .select(`
            id,
            negocio_id,
            estrellas,
            comentario,
            creado_en,
            actualizado_en
        `)
        .maybeSingle();

    if (error) {
        console.error('Error al actualizar reseña:', error.message);
        throw new Error('No fue posible actualizar la reseña.');
    }

    if (!data) {
        const errorResena = new Error(
            'La reseña no existe o no te pertenece.'
        );
        errorResena.codigo = 'RESENA_NO_ENCONTRADA';
        throw errorResena;
    }

    return data;
};

// ELIMINAR UNA RESEÑA PROPIA.
const eliminarResena = async (resenaId, perfilId) => {
    const { data, error } = await supabaseAdmin
        .from('resenas')
        .delete()
        .eq('id', resenaId)
        .eq('autor_id', perfilId)
        .select('id, negocio_id')
        .maybeSingle();

    if (error) {
        console.error('Error al eliminar reseña:', error.message);
        throw new Error('No fue posible eliminar la reseña.');
    }

    if (!data) {
        const errorResena = new Error(
            'La reseña no existe o no te pertenece.'
        );
        errorResena.codigo = 'RESENA_NO_ENCONTRADA';
        throw errorResena;
    }

    return data;
};

// CONSULTAR LA RESEÑA DEL USUARIO EN UN NEGOCIO.
const obtenerResenaPropia = async (negocioId, perfilId) => {
    const { data, error } = await supabaseAdmin
        .from('resenas')
        .select(`
            id,
            negocio_id,
            estrellas,
            comentario,
            creado_en,
            actualizado_en
        `)
        .eq('negocio_id', negocioId)
        .eq('autor_id', perfilId)
        .maybeSingle();

    if (error) {
        console.error('Error al consultar reseña propia:', error.message);
        throw new Error('No fue posible consultar tu reseña.');
    }

    return data;
};


module.exports = {
    obtenerResenasNegocio,
    obtenerMuroResenas,
    obtenerResenasDestacadas,
    crearResena,
    actualizarResena,
    eliminarResena,
    obtenerResenaPropia
};
