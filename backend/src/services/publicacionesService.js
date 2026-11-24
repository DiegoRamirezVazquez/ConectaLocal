
const supabaseAdmin = require('../config/supabaseAdmin');

// Verificar que el usuario autenticado tenga permisos para participar en el foro.
const verificarUsuario = async (usuarioId) => {
    const { data, error } = await supabaseAdmin
        .from('perfiles')
        .select('id, rol')
        .eq('id', usuarioId)
        .single();

    if (error || !data) {
        throw new Error('No se pudo verificar el perfil del usuario.');
    }

    if (data.rol !== 'usuario') {
        throw new Error('No tienes permisos para realizar esta acción en el foro.');
    }

    return data;
};

// Consultar publicaciones, autores, fotografías, comentarios y reacciones.
const obtenerPublicaciones = async (usuarioId) => {
    await verificarUsuario(usuarioId);

    const { data: publicaciones, error } = await supabaseAdmin
        .from('publicaciones')
        .select(`
            id,
            autor_id,
            categoria_id,
            negocio_id,
            titulo,
            contenido,
            tipo,
            creado_en,
            actualizado_en
        `)
        .order('creado_en', { ascending: false });

    if (error) {
        throw new Error('No se pudieron consultar las publicaciones.');
    }

    const listaPublicaciones = publicaciones || [];

    if (listaPublicaciones.length === 0) {
        return [];
    }

    const publicacionIds = listaPublicaciones.map(p => p.id);
    const autorIds = [...new Set(listaPublicaciones.map(p => p.autor_id))];

    const { data: perfiles, error: errorPerfiles } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, avatar_url')
        .in('id', autorIds);

    if (errorPerfiles) {
        throw new Error('No se pudieron consultar los autores.');
    }

    const { data: fotos, error: errorFotos } = await supabaseAdmin
        .from('fotos_publicacion')
        .select('id, publicacion_id, url, creado_en')
        .in('publicacion_id', publicacionIds)
        .order('creado_en', { ascending: true });

    if (errorFotos) {
        throw new Error('No se pudieron consultar las fotografías.');
    }

    const { data: comentarios, error: errorComentarios } = await supabaseAdmin
        .from('comentarios')
        .select('id, publicacion_id, autor_id, contenido, creado_en')
        .in('publicacion_id', publicacionIds)
        .order('creado_en', { ascending: true });

    if (errorComentarios) {
        throw new Error('No se pudieron consultar los comentarios.');
    }

    const { data: reacciones, error: errorReacciones } = await supabaseAdmin
        .from('reacciones_publicacion')
        .select('id, publicacion_id, autor_id')
        .in('publicacion_id', publicacionIds);

    if (errorReacciones) {
        throw new Error('No se pudieron consultar las reacciones.');
    }

    const listaComentarios = comentarios || [];
    const listaReacciones = reacciones || [];

    const autorComentarioIds = [
        ...new Set(listaComentarios.map(c => c.autor_id))
    ];

    const autorReaccionIds = [
        ...new Set(listaReacciones.map(r => r.autor_id))
    ];

    let perfilesComentarios = [];
    let perfilesReacciones = [];

    if (autorComentarioIds.length > 0) {
        const { data, error: errorPerfilesComentarios } = await supabaseAdmin
            .from('perfiles')
            .select('id, nombre, avatar_url')
            .in('id', autorComentarioIds);

        if (errorPerfilesComentarios) {
            throw new Error('No se pudieron consultar los autores de los comentarios.');
        }

        perfilesComentarios = data || [];
    }

    if (autorReaccionIds.length > 0) {
        const { data, error: errorPerfilesReacciones } = await supabaseAdmin
            .from('perfiles')
            .select('id, nombre, avatar_url')
            .in('id', autorReaccionIds);

        if (errorPerfilesReacciones) {
            throw new Error('No se pudieron consultar los autores de las reacciones.');
        }

        perfilesReacciones = data || [];
    }

    const perfilesMap = new Map(
        (perfiles || []).map(p => [p.id, p])
    );

    const perfilesComentariosMap = new Map(
        perfilesComentarios.map(p => [p.id, p])
    );

    const perfilesReaccionesMap = new Map(
        perfilesReacciones.map(p => [p.id, p])
    );

    return listaPublicaciones.map(publicacion => {
        const comentariosPublicacion = listaComentarios
            .filter(c => c.publicacion_id === publicacion.id)
            .map(comentario => ({
                ...comentario,
                autor: perfilesComentariosMap.get(comentario.autor_id) || null,
                es_propio: comentario.autor_id === usuarioId
            }));

        const reaccionesPublicacion = listaReacciones
            .filter(r => r.publicacion_id === publicacion.id);

        return {
            ...publicacion,
            autor: perfilesMap.get(publicacion.autor_id) || null,
            es_propio: publicacion.autor_id === usuarioId,

            fotos: (fotos || []).filter(
                foto => foto.publicacion_id === publicacion.id
            ),

            comentarios: comentariosPublicacion,
            total_comentarios: comentariosPublicacion.length,

            total_reacciones: reaccionesPublicacion.length,

            reacciono: reaccionesPublicacion.some(
                reaccion => reaccion.autor_id === usuarioId
            ),

            // Personas que reaccionaron a la publicación.
            reacciones: reaccionesPublicacion.map(reaccion => ({
                autor_id: reaccion.autor_id,
                perfil: perfilesReaccionesMap.get(reaccion.autor_id) || null
            }))
        };
    });
};

// Crear una publicación.
const crearPublicacion = async (usuarioId, datos = {}) => {
    await verificarUsuario(usuarioId);

    const titulo = typeof datos.titulo === 'string'
        ? datos.titulo.trim()
        : '';

    const contenido = typeof datos.contenido === 'string'
        ? datos.contenido.trim()
        : '';

    const tipo = typeof datos.tipo === 'string'
        ? datos.tipo.trim()
        : '';

    const tiposPermitidos = [
        'pregunta',
        'experiencia',
        'recomendacion'
    ];

    if (!titulo) {
        throw new Error('El título de la publicación es obligatorio.');
    }

    if (!contenido) {
        throw new Error('El contenido de la publicación es obligatorio.');
    }

    if (!tiposPermitidos.includes(tipo)) {
        throw new Error('El tipo de publicación no es válido.');
    }

    const nuevaPublicacion = {
        autor_id: usuarioId,
        titulo,
        contenido,
        tipo,
        categoria_id: datos.categoria_id || null,
        negocio_id: datos.negocio_id || null
    };

    const { data, error } = await supabaseAdmin
        .from('publicaciones')
        .insert(nuevaPublicacion)
        .select(`
            id,
            autor_id,
            categoria_id,
            negocio_id,
            titulo,
            contenido,
            tipo,
            creado_en,
            actualizado_en
        `)
        .single();

    if (error) {
        throw new Error('No se pudo crear la publicación.');
    }

    const { data: perfil, error: errorPerfil } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, avatar_url')
        .eq('id', usuarioId)
        .single();

    if (errorPerfil) {
        throw new Error('La publicación se creó, pero no se pudo consultar el perfil del autor.');
    }

    return {
        ...data,
        autor: perfil,
        es_propio: true,
        fotos: [],
        comentarios: [],
        total_comentarios: 0,
        total_reacciones: 0,
        reacciono: false,
        reacciones: []
    };
};

// Verificar que una publicación pertenezca al usuario.
const obtenerPublicacionPropia = async (publicacionId, usuarioId) => {
    await verificarUsuario(usuarioId);

    const { data: publicacion, error } = await supabaseAdmin
        .from('publicaciones')
        .select('id, autor_id')
        .eq('id', publicacionId)
        .maybeSingle();

    if (error) {
        throw new Error('Error al consultar la publicación.');
    }

    if (!publicacion) {
        throw new Error('La publicación no existe.');
    }

    if (publicacion.autor_id !== usuarioId) {
        throw new Error('No tienes permiso para modificar esta publicación.');
    }

    return publicacion;
};

// Editar una publicación propia.
const actualizarPublicacion = async (publicacionId, usuarioId, datos = {}) => {
    await obtenerPublicacionPropia(publicacionId, usuarioId);

    const actualizacion = {};

    if (datos.titulo !== undefined) {
        const titulo = typeof datos.titulo === 'string'
            ? datos.titulo.trim()
            : '';

        if (!titulo) {
            throw new Error('El título de la publicación no puede estar vacío.');
        }

        actualizacion.titulo = titulo;
    }

    if (datos.contenido !== undefined) {
        const contenido = typeof datos.contenido === 'string'
            ? datos.contenido.trim()
            : '';

        if (!contenido) {
            throw new Error('El contenido de la publicación no puede estar vacío.');
        }

        actualizacion.contenido = contenido;
    }

    if (datos.tipo !== undefined) {
        const tiposPermitidos = [
            'pregunta',
            'experiencia',
            'recomendacion'
        ];

        if (!tiposPermitidos.includes(datos.tipo)) {
            throw new Error('El tipo de publicación no es válido.');
        }

        actualizacion.tipo = datos.tipo;
    }

    if (Object.keys(actualizacion).length === 0) {
        throw new Error('No se proporcionaron datos para actualizar.');
    }

    actualizacion.actualizado_en = new Date().toISOString();

    const { data, error } = await supabaseAdmin
        .from('publicaciones')
        .update(actualizacion)
        .eq('id', publicacionId)
        .eq('autor_id', usuarioId)
        .select(`
            id,
            autor_id,
            categoria_id,
            negocio_id,
            titulo,
            contenido,
            tipo,
            creado_en,
            actualizado_en
        `)
        .single();

    if (error) {
        throw new Error('No se pudo actualizar la publicación.');
    }

    return data;
};

// Eliminar una publicación propia.
const eliminarPublicacion = async (publicacionId, usuarioId) => {
    await obtenerPublicacionPropia(publicacionId, usuarioId);

    const { error } = await supabaseAdmin
        .from('publicaciones')
        .delete()
        .eq('id', publicacionId)
        .eq('autor_id', usuarioId);

    if (error) {
        throw new Error('No se pudo eliminar la publicación.');
    }

    return {
        mensaje: 'La publicación se eliminó correctamente.'
    };
};

// Agregar un comentario a una publicación.
const agregarComentario = async (publicacionId, usuarioId, contenido) => {
    await verificarUsuario(usuarioId);

    const texto = typeof contenido === 'string'
        ? contenido.trim()
        : '';

    if (!texto) {
        throw new Error('El comentario no puede estar vacío.');
    }

    const { data: publicacion, error: errorPublicacion } = await supabaseAdmin
        .from('publicaciones')
        .select('id')
        .eq('id', publicacionId)
        .maybeSingle();

    if (errorPublicacion) {
        throw new Error('Error al consultar la publicación.');
    }

    if (!publicacion) {
        throw new Error('La publicación no existe.');
    }

    const { data: comentario, error } = await supabaseAdmin
        .from('comentarios')
        .insert({
            publicacion_id: publicacionId,
            autor_id: usuarioId,
            contenido: texto
        })
        .select('id, publicacion_id, autor_id, contenido, creado_en')
        .single();

    if (error) {
        throw new Error('No se pudo agregar el comentario.');
    }

    const { data: perfil, error: errorPerfil } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, avatar_url')
        .eq('id', usuarioId)
        .single();

    if (errorPerfil) {
        throw new Error('El comentario se agregó, pero no se pudo consultar el perfil del autor.');
    }

    return {
        ...comentario,
        autor: perfil,
        es_propio: true
    };
};

// Verificar que un comentario pertenezca al usuario.
const obtenerComentarioPropio = async (comentarioId, usuarioId) => {
    await verificarUsuario(usuarioId);

    const { data: comentario, error } = await supabaseAdmin
        .from('comentarios')
        .select('id, autor_id')
        .eq('id', comentarioId)
        .maybeSingle();

    if (error) {
        throw new Error('Error al consultar el comentario.');
    }

    if (!comentario) {
        throw new Error('El comentario no existe.');
    }

    if (comentario.autor_id !== usuarioId) {
        throw new Error('No tienes permiso para modificar este comentario.');
    }

    return comentario;
};

// Editar un comentario propio.
const actualizarComentario = async (comentarioId, usuarioId, contenido) => {
    await obtenerComentarioPropio(comentarioId, usuarioId);

    const texto = typeof contenido === 'string'
        ? contenido.trim()
        : '';

    if (!texto) {
        throw new Error('El comentario no puede estar vacío.');
    }

    const { data: comentario, error } = await supabaseAdmin
        .from('comentarios')
        .update({ contenido: texto })
        .eq('id', comentarioId)
        .eq('autor_id', usuarioId)
        .select('id, publicacion_id, autor_id, contenido, creado_en')
        .single();

    if (error) {
        throw new Error('No se pudo actualizar el comentario.');
    }

    const { data: perfil, error: errorPerfil } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, avatar_url')
        .eq('id', usuarioId)
        .single();

    if (errorPerfil) {
        throw new Error('El comentario se actualizó, pero no se pudo consultar el perfil del autor.');
    }

    return {
        ...comentario,
        autor: perfil,
        es_propio: true
    };
};

// Eliminar un comentario propio.
const eliminarComentario = async (comentarioId, usuarioId) => {
    await obtenerComentarioPropio(comentarioId, usuarioId);

    const { error } = await supabaseAdmin
        .from('comentarios')
        .delete()
        .eq('id', comentarioId)
        .eq('autor_id', usuarioId);

    if (error) {
        throw new Error('No se pudo eliminar el comentario.');
    }

    return {
        mensaje: 'El comentario se eliminó correctamente.'
    };
};

// Alternar la reacción de Me gusta en una publicación.
const alternarReaccion = async (publicacionId, usuarioId) => {
    await verificarUsuario(usuarioId);

    const { data: publicacion, error: errorPublicacion } = await supabaseAdmin
        .from('publicaciones')
        .select('id')
        .eq('id', publicacionId)
        .maybeSingle();

    if (errorPublicacion) {
        throw new Error('Error al consultar la publicación.');
    }

    if (!publicacion) {
        throw new Error('La publicación no existe.');
    }

    const { data: reaccionExistente, error: errorReaccion } = await supabaseAdmin
        .from('reacciones_publicacion')
        .select('id')
        .eq('publicacion_id', publicacionId)
        .eq('autor_id', usuarioId)
        .maybeSingle();

    if (errorReaccion) {
        throw new Error('No se pudo consultar la reacción.');
    }

    if (reaccionExistente) {
        const { error } = await supabaseAdmin
            .from('reacciones_publicacion')
            .delete()
            .eq('id', reaccionExistente.id)
            .eq('autor_id', usuarioId);

        if (error) {
            throw new Error('No se pudo quitar la reacción.');
        }

        return { reacciono: false };
    }

    const { error } = await supabaseAdmin
        .from('reacciones_publicacion')
        .insert({
            publicacion_id: publicacionId,
            autor_id: usuarioId
        });

    if (error) {
        throw new Error('No se pudo registrar la reacción.');
    }

    return { reacciono: true };
};

// Reportar una publicación.
const reportarPublicacion = async (publicacionId, usuarioId, datos = {}) => {
    await verificarUsuario(usuarioId);

    const motivosPermitidos = [
        'contenido_inapropiado',
        'spam',
        'informacion_falsa',
        'acoso',
        'otro'
    ];

    const motivo = typeof datos.motivo === 'string'
        ? datos.motivo.trim()
        : '';

    const descripcion = typeof datos.descripcion === 'string'
        ? datos.descripcion.trim()
        : '';

    if (!motivosPermitidos.includes(motivo)) {
        throw new Error('El motivo del reporte no es válido.');
    }

    if (descripcion.length > 500) {
        throw new Error('La descripción no puede superar los 500 caracteres.');
    }

    const { data: publicacion, error: errorPublicacion } = await supabaseAdmin
        .from('publicaciones')
        .select('id, autor_id')
        .eq('id', publicacionId)
        .maybeSingle();

    if (errorPublicacion) {
        throw new Error('Error al consultar la publicación.');
    }

    if (!publicacion) {
        throw new Error('La publicación no existe.');
    }

    if (publicacion.autor_id === usuarioId) {
        throw new Error('No puedes reportar tu propia publicación.');
    }

    const { data: reporte, error } = await supabaseAdmin
        .from('reportes_publicaciones')
        .insert({
            publicacion_id: publicacionId,
            reportante_id: usuarioId,
            motivo,
            descripcion: descripcion || null
        })
        .select(`
            id,
            publicacion_id,
            reportante_id,
            motivo,
            descripcion,
            estado,
            creado_en
        `)
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error('Ya has reportado esta publicación.');
        }

        throw new Error('No se pudo registrar el reporte.');
    }

    return reporte;
};

module.exports = {
    obtenerPublicaciones,
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion,
    agregarComentario,
    actualizarComentario,
    eliminarComentario,
    alternarReaccion,
    reportarPublicacion
};
