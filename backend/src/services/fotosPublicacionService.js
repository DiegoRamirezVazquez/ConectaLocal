
const crypto = require('crypto');
const supabaseAdmin = require('../config/supabaseAdmin');

const BUCKET = 'fotos-publicaciones';
const MAX_FOTOGRAFIAS = 4;
const MAX_TAMANO = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

// VERIFICAR QUE EL USUARIO TENGA PERMISOS PARA PUBLICAR.
const verificarUsuario = async (usuarioId) => {
    const { data, error } = await supabaseAdmin
        .from('perfiles')
        .select('id, rol')
        .eq('id', usuarioId)
        .maybeSingle();

    if (error || !data) {
        throw new Error('No se pudo verificar el perfil del usuario.');
    }

    if (data.rol !== 'usuario') {
        throw new Error('No tienes permisos para subir fotografías.');
    }

    return data;
};

// VERIFICAR QUE LA PUBLICACIÓN PERTENEZCA AL USUARIO.
const verificarPublicacionPropia = async (
    publicacionId,
    usuarioId
) => {
    await verificarUsuario(usuarioId);

    const { data, error } = await supabaseAdmin
        .from('publicaciones')
        .select('id, autor_id')
        .eq('id', publicacionId)
        .maybeSingle();

    if (error) {
        throw new Error('No fue posible consultar la publicación.');
    }

    if (!data) {
        const errorPublicacion = new Error(
            'La publicación no existe.'
        );

        errorPublicacion.codigo = 'PUBLICACION_NO_ENCONTRADA';

        throw errorPublicacion;
    }

    if (data.autor_id !== usuarioId) {
        const errorPermiso = new Error(
            'No tienes permiso para agregar fotografías a esta publicación.'
        );

        errorPermiso.codigo = 'PUBLICACION_NO_AUTORIZADA';

        throw errorPermiso;
    }

    return data;
};

// VALIDAR EL CONTENIDO REAL DE LAS FOTOGRAFÍAS.
const validarFotografias = async (archivos) => {
    if (!Array.isArray(archivos) || archivos.length === 0) {
        throw new Error('Debes seleccionar al menos una fotografía.');
    }

    if (archivos.length > MAX_FOTOGRAFIAS) {
        throw new Error('Puedes subir máximo 5 fotografías por publicación.');
    }

    const { fileTypeFromBuffer } = await import('file-type');

    const archivosValidados = [];

    for (const archivo of archivos) {
        if (!archivo.buffer || !Buffer.isBuffer(archivo.buffer)) {
            throw new Error('Se recibió una fotografía inválida.');
        }

        if (archivo.size > MAX_TAMANO) {
            throw new Error('Cada fotografía debe pesar máximo 5 MB.');
        }

        const tipoReal = await fileTypeFromBuffer(archivo.buffer);

        if (!tipoReal || !TIPOS_PERMITIDOS[tipoReal.mime]) {
            throw new Error(
                'Solo se permiten fotografías JPG, PNG y WEBP.'
            );
        }

        archivosValidados.push({
            buffer: archivo.buffer,
            mime: tipoReal.mime,
            extension: TIPOS_PERMITIDOS[tipoReal.mime]
        });
    }

    return archivosValidados;
};

// SUBIR FOTOGRAFÍAS DE UNA PUBLICACIÓN.
const subirFotosPublicacion = async (
    publicacionId,
    usuarioId,
    archivos
) => {
    await verificarPublicacionPropia(publicacionId, usuarioId);

    const archivosValidados = await validarFotografias(archivos);

    // Consultar cuántas fotografías tiene actualmente la publicación.
    const { count, error: errorConteo } = await supabaseAdmin
        .from('fotos_publicacion')
        .select('id', { count: 'exact', head: true })
        .eq('publicacion_id', publicacionId);

    if (errorConteo) {
        throw new Error(
            'No fue posible verificar las fotografías existentes.'
        );
    }

    const totalActual = count || 0;

    if (totalActual + archivosValidados.length > MAX_FOTOGRAFIAS) {
        throw new Error(
            `Cada publicación permite máximo ${MAX_FOTOGRAFIAS} fotografías. Actualmente tiene ${totalActual}.`
        );
    }

    const rutasSubidas = [];

    try {
        // SUBIR LOS ARCHIVOS A SUPABASE STORAGE.
        for (const archivo of archivosValidados) {
            const nombreUnico = crypto.randomUUID();

            const ruta =
                `${usuarioId}/${publicacionId}/${nombreUnico}.${archivo.extension}`;

            const { error } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(ruta, archivo.buffer, {
                    contentType: archivo.mime,
                    upsert: false
                });

            if (error) {
                console.error(
                    'Error al subir fotografía de publicación:',
                    error.message
                );

                throw new Error(
                    'No fue posible subir una de las fotografías.'
                );
            }

            rutasSubidas.push(ruta);
        }

        // PREPARAR LOS REGISTROS DE LA BASE DE DATOS.
        const registros = rutasSubidas.map((ruta) => {
            const { data } = supabaseAdmin.storage
                .from(BUCKET)
                .getPublicUrl(ruta);

            return {
                publicacion_id: publicacionId,
                url: data.publicUrl
            };
        });

        // INSERTAR LAS FOTOGRAFÍAS.
        const { data, error } = await supabaseAdmin
            .from('fotos_publicacion')
            .insert(registros)
            .select('id, publicacion_id, url, creado_en');

        if (error) {
            console.error(
                'Error al registrar fotografías de publicación:',
                error.message
            );

            throw new Error(
                'No fue posible registrar las fotografías de la publicación.'
            );
        }

        return data || [];

    } catch (error) {
        // REVERTIR LOS ARCHIVOS SI FALLA EL PROCESO.
        if (rutasSubidas.length > 0) {
            const { error: errorEliminacion } =
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove(rutasSubidas);

            if (errorEliminacion) {
                console.error(
                    'Error al revertir fotografías:',
                    errorEliminacion.message
                );
            }
        }

        throw error;
    }
};

module.exports = {
    subirFotosPublicacion
};
