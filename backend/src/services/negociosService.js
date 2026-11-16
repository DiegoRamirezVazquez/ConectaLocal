
const crypto = require('crypto');

const supabaseAdmin = require('../config/supabaseAdmin');

const BUCKET = 'fotos-negocios';

const TIPOS_PERMITIDOS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

// CAMPOS QUE SE DEVOLVERÁN AL TRABAJADOR.
const CAMPOS_NEGOCIO = `
    id,
    propietario_id,
    categoria_id,
    nombre,
    descripcion,
    lat,
    lng,
    direccion,
    telefono,
    whatsapp,
    email,
    sitio_web,
    horario,
    foto_principal_url,
    creado_en,
    solicitud_id,
    categoria:categorias (
        id,
        nombre,
        icono
    )
`;

// CONSULTAR LOS NEGOCIOS DEL TRABAJADOR AUTENTICADO.
const obtenerNegociosPropios = async (perfilId) => {
    const { data, error } = await supabaseAdmin
        .from('negocios')
        .select(CAMPOS_NEGOCIO)
        .eq('propietario_id', perfilId)
        .order('creado_en', { ascending: false });

    if (error) {
        console.error(
            'Error al consultar negocios del trabajador:',
            error.message
        );

        throw new Error(
            'No fue posible consultar tus negocios.'
        );
    }

    return data || [];
};

// OBTENER LA RUTA DE UNA FOTOGRAFÍA PÚBLICA DEL BUCKET.
const obtenerRutaFotoAnterior = (urlFoto) => {
    if (!urlFoto) return null;

    try {
        const url = new URL(urlFoto);

        const marcador = `/storage/v1/object/public/${BUCKET}/`;

        const posicion = url.pathname.indexOf(marcador);

        if (posicion === -1) return null;

        return decodeURIComponent(
            url.pathname.substring(posicion + marcador.length)
        );

    } catch (error) {
        return null;
    }
};

// ELIMINAR UNA FOTOGRAFÍA ANTERIOR.
const eliminarFotoAnterior = async (ruta) => {
    if (!ruta) return;

    const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([ruta]);

    if (error) {
        console.error(
            'No fue posible eliminar la fotografía anterior:',
            error.message
        );
    }
};

// ACTUALIZAR LA FOTOGRAFÍA PRINCIPAL DE UN NEGOCIO.
const actualizarFotoPrincipalNegocio = async (
    negocioId,
    perfilId,
    archivo
) => {
    if (!negocioId || !perfilId) {
        throw new Error('Faltan datos para actualizar la fotografía.');
    }

    if (!archivo || !archivo.buffer || !Buffer.isBuffer(archivo.buffer)) {
        throw new Error('No se recibió una fotografía válida.');
    }

    if (archivo.size > 5 * 1024 * 1024) {
        throw new Error('La fotografía debe pesar máximo 5 MB.');
    }

    // Validar el contenido real de la imagen.
    const { fileTypeFromBuffer } = await import('file-type');

    const tipoReal = await fileTypeFromBuffer(archivo.buffer);

    if (!tipoReal || !TIPOS_PERMITIDOS[tipoReal.mime]) {
        throw new Error(
            'Solo se permiten fotografías JPG, PNG y WEBP.'
        );
    }

    const extension = TIPOS_PERMITIDOS[tipoReal.mime];

    // Verificar que el negocio pertenezca al trabajador.
    const { data: negocio, error: errorConsulta } = await supabaseAdmin
        .from('negocios')
        .select('id, foto_principal_url')
        .eq('id', negocioId)
        .eq('propietario_id', perfilId)
        .maybeSingle();

    if (errorConsulta) {
        console.error(
            'Error al verificar el negocio:',
            errorConsulta.message
        );

        throw new Error(
            'No fue posible verificar el negocio.'
        );
    }

    if (!negocio) {
        const error = new Error(
            'El negocio no existe o no te pertenece.'
        );

        error.codigo = 'NEGOCIO_NO_ENCONTRADO';

        throw error;
    }

    const rutaAnterior = obtenerRutaFotoAnterior(
        negocio.foto_principal_url
    );

    // Generar una ruta única para la nueva fotografía.
    const nombreUnico = crypto.randomUUID();

    const rutaNueva = `${negocioId}/${nombreUnico}.${extension}`;

    // Subir la fotografía a Supabase Storage.
    const { error: errorSubida } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(rutaNueva, archivo.buffer, {
            contentType: tipoReal.mime,
            upsert: false
        });

    if (errorSubida) {
        console.error(
            'Error al subir fotografía del negocio:',
            errorSubida.message
        );

        throw new Error(
            'No fue posible subir la fotografía.'
        );
    }

    // Obtener la URL pública.
    const { data: urlPublica } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(rutaNueva);

    const fotoPrincipalUrl = urlPublica.publicUrl;

    // Guardar la URL en la tabla negocios.
    const { data: negocioActualizado, error: errorActualizacion } =
        await supabaseAdmin
            .from('negocios')
            .update({
                foto_principal_url: fotoPrincipalUrl
            })
            .eq('id', negocioId)
            .eq('propietario_id', perfilId)
            .select('id, foto_principal_url')
            .maybeSingle();

    if (errorActualizacion || !negocioActualizado) {
        // Si falla la actualización, eliminar la nueva fotografía.
        await supabaseAdmin.storage
            .from(BUCKET)
            .remove([rutaNueva]);

        console.error(
            'Error al actualizar fotografía en negocios:',
            errorActualizacion?.message
        );

        throw new Error(
            'No fue posible guardar la fotografía del negocio.'
        );
    }

    // Eliminar la fotografía anterior después de actualizar la nueva.
    if (rutaAnterior && rutaAnterior !== rutaNueva) {
        await eliminarFotoAnterior(rutaAnterior);
    }

    return negocioActualizado;
};

module.exports = {
    obtenerNegociosPropios,
    actualizarFotoPrincipalNegocio
};
