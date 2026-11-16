
const crypto = require('crypto');
const supabaseAdmin = require('../config/supabaseAdmin');

const BUCKET = 'fotos-negocios';
const MAX_FOTOGRAFIAS = 5;
const MAX_TAMANO = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

// VERIFICAR QUE EL NEGOCIO PERTENEZCA AL TRABAJADOR.
const verificarPropietarioNegocio = async (negocioId, perfilId) => {
    const { data, error } = await supabaseAdmin
        .from('negocios')
        .select('id')
        .eq('id', negocioId)
        .eq('propietario_id', perfilId)
        .maybeSingle();

    if (error) {
        console.error('Error al verificar propietario:', error.message);
        throw new Error('No fue posible verificar el negocio.');
    }

    if (!data) {
        const errorNegocio = new Error(
            'El negocio no existe o no te pertenece.'
        );

        errorNegocio.codigo = 'NEGOCIO_NO_ENCONTRADO';

        throw errorNegocio;
    }

    return data;
};

// VALIDAR EL CONTENIDO REAL DE LAS FOTOGRAFÍAS.
const validarFotografias = async (archivos) => {
    if (!Array.isArray(archivos) || archivos.length === 0) {
        throw new Error('Debes seleccionar al menos una fotografía.');
    }

    if (archivos.length > MAX_FOTOGRAFIAS) {
        throw new Error(
            'Puedes subir máximo 5 fotografías adicionales.'
        );
    }

    const { fileTypeFromBuffer } = await import('file-type');

    const archivosValidados = [];

    for (const archivo of archivos) {
        if (!archivo.buffer || !Buffer.isBuffer(archivo.buffer)) {
            throw new Error('Se recibió una fotografía inválida.');
        }

        if (archivo.size > MAX_TAMANO) {
            throw new Error(
                'Cada fotografía debe pesar máximo 5 MB.'
            );
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

// OBTENER LA RUTA DE UNA URL PÚBLICA DEL BUCKET.
const obtenerRutaStorage = (urlFoto) => {
    if (!urlFoto) return null;

    try {
        const url = new URL(urlFoto);

        const marcador =
            `/storage/v1/object/public/${BUCKET}/`;

        const posicion = url.pathname.indexOf(marcador);

        if (posicion === -1) return null;

        return decodeURIComponent(
            url.pathname.substring(posicion + marcador.length)
        );

    } catch {
        return null;
    }
};

// CONSULTAR LAS FOTOGRAFÍAS DE UN NEGOCIO.
const obtenerFotosNegocio = async (negocioId, perfilId) => {
    await verificarPropietarioNegocio(negocioId, perfilId);

    const { data, error } = await supabaseAdmin
        .from('fotos_negocio')
        .select('id, negocio_id, url, descripcion')
        .eq('negocio_id', negocioId)
        .order('id', { ascending: false });

    if (error) {
        console.error(
            'Error al consultar fotografías:',
            error.message
        );

        throw new Error(
            'No fue posible consultar la galería del negocio.'
        );
    }

    return data || [];
};

// SUBIR FOTOGRAFÍAS ADICIONALES.
const subirFotosNegocio = async (
    negocioId,
    perfilId,
    archivos,
    descripciones = []
) => {
    await verificarPropietarioNegocio(negocioId, perfilId);

    const archivosValidados = await validarFotografias(archivos);

    // Consultar cuántas fotografías adicionales existen.
    const { count, error: errorConteo } = await supabaseAdmin
        .from('fotos_negocio')
        .select('id', { count: 'exact', head: true })
        .eq('negocio_id', negocioId);

    if (errorConteo) {
        console.error(
            'Error al contar fotografías:',
            errorConteo.message
        );

        throw new Error(
            'No fue posible verificar el límite de fotografías.'
        );
    }

    if (count + archivosValidados.length > MAX_FOTOGRAFIAS) {
        throw new Error(
            `Este negocio permite máximo ${MAX_FOTOGRAFIAS} fotografías adicionales. Actualmente tienes ${count}.`
        );
    }

    const rutasSubidas = [];

    try {
        // SUBIR CADA ARCHIVO A STORAGE.
        for (const archivo of archivosValidados) {
            const nombreUnico = crypto.randomUUID();

            const ruta =
                `${negocioId}/galeria/${nombreUnico}.${archivo.extension}`;

            const { error } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(ruta, archivo.buffer, {
                    contentType: archivo.mime,
                    upsert: false
                });

            if (error) {
                console.error(
                    'Error al subir fotografía:',
                    error.message
                );

                throw new Error(
                    'No fue posible subir una de las fotografías.'
                );
            }

            rutasSubidas.push(ruta);
        }

        // PREPARAR LOS REGISTROS DE LA GALERÍA.
        const registros = rutasSubidas.map((ruta, indice) => {
            const { data } = supabaseAdmin.storage
                .from(BUCKET)
                .getPublicUrl(ruta);

            const descripcion = descripciones[indice] || null;

            return {
                negocio_id: negocioId,
                url: data.publicUrl,
                descripcion: descripcion
                    ? String(descripcion).trim().slice(0, 200)
                    : null
            };
        });

        // INSERTAR LOS REGISTROS EN LA BASE DE DATOS.
        const { data, error } = await supabaseAdmin
            .from('fotos_negocio')
            .insert(registros)
            .select('id, negocio_id, url, descripcion');

        if (error) {
            console.error(
                'Error al registrar fotografías:',
                error.message
            );

            throw new Error(
                'No fue posible registrar las fotografías de la galería.'
            );
        }

        return data || [];

    } catch (error) {
        // ELIMINAR LOS ARCHIVOS SI FALLA EL PROCESO.
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

// ELIMINAR UNA FOTOGRAFÍA DE LA GALERÍA.
const eliminarFotoNegocio = async (
    negocioId,
    perfilId,
    fotoId
) => {
    await verificarPropietarioNegocio(negocioId, perfilId);

    // Verificar que la fotografía pertenezca al negocio.
    const { data: foto, error: errorConsulta } = await supabaseAdmin
        .from('fotos_negocio')
        .select('id, negocio_id, url')
        .eq('id', fotoId)
        .eq('negocio_id', negocioId)
        .maybeSingle();

    if (errorConsulta) {
        console.error(
            'Error al consultar fotografía:',
            errorConsulta.message
        );

        throw new Error(
            'No fue posible consultar la fotografía.'
        );
    }

    if (!foto) {
        const errorFoto = new Error(
            'La fotografía no existe o no pertenece a este negocio.'
        );

        errorFoto.codigo = 'FOTOGRAFIA_NO_ENCONTRADA';

        throw errorFoto;
    }

    const ruta = obtenerRutaStorage(foto.url);

    if (!ruta) {
        throw new Error(
            'No fue posible identificar la ubicación de la fotografía.'
        );
    }

    // ELIMINAR EL ARCHIVO DE STORAGE.
    const { error: errorStorage } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([ruta]);

    if (errorStorage) {
        console.error(
            'Error al eliminar fotografía de Storage:',
            errorStorage.message
        );

        throw new Error(
            'No fue posible eliminar el archivo de fotografía.'
        );
    }

    // ELIMINAR EL REGISTRO DE LA BASE DE DATOS.
    const { error: errorBD } = await supabaseAdmin
        .from('fotos_negocio')
        .delete()
        .eq('id', fotoId)
        .eq('negocio_id', negocioId);

    if (errorBD) {
        console.error(
            'Error al eliminar registro de fotografía:',
            errorBD.message
        );

        throw new Error(
            'El archivo fue eliminado, pero no se pudo eliminar su registro.'
        );
    }

    return {
        id: fotoId,
        negocio_id: negocioId
    };
};

module.exports = {
    obtenerFotosNegocio,
    subirFotosNegocio,
    eliminarFotoNegocio
};
