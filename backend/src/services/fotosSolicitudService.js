
const crypto = require('crypto');
const path = require('path');

const supabaseAdmin = require('../config/supabaseAdmin');

const BUCKET = 'solicitudes-trabajador';

const TIPOS_PERMITIDOS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

// Validar el contenido real de cada fotografía.
const validarFotografias = async (archivos) => {
    if (!Array.isArray(archivos)) {
        throw new Error('Los archivos proporcionados no son válidos.');
    }

    if (archivos.length > 5) {
        throw new Error('Puedes subir máximo 5 fotografías.');
    }

    const { fileTypeFromBuffer } = await import('file-type');

    const archivosValidados = [];

    for (const archivo of archivos) {
        if (!archivo.buffer || !Buffer.isBuffer(archivo.buffer)) {
            throw new Error('Se recibió un archivo inválido.');
        }

        if (archivo.size > 5 * 1024 * 1024) {
            throw new Error('Cada fotografía debe pesar máximo 5 MB.');
        }

        const tipoReal = await fileTypeFromBuffer(archivo.buffer);

        if (!tipoReal || !TIPOS_PERMITIDOS[tipoReal.mime]) {
            throw new Error(
                'Solo se permiten fotografías JPG, PNG y WEBP.'
            );
        }

        const extension = TIPOS_PERMITIDOS[tipoReal.mime];

        archivosValidados.push({
            buffer: archivo.buffer,
            mime: tipoReal.mime,
            extension,
            nombreOriginal: path.basename(
                archivo.originalname || `fotografia.${extension}`
            )
        });
    }

    return archivosValidados;
};

// Eliminar archivos de Storage y sus registros de base de datos.
const eliminarFotosSolicitud = async (rutas, ids = []) => {
    if (rutas.length > 0) {
        const { error } = await supabaseAdmin.storage
            .from(BUCKET)
            .remove(rutas);

        if (error) {
            console.error(
                'Error al eliminar fotografías de Storage:',
                error.message
            );
        }
    }

    if (ids.length > 0) {
        const { error } = await supabaseAdmin
            .from('fotos_solicitud_trabajador')
            .delete()
            .in('id', ids);

        if (error) {
            console.error(
                'Error al eliminar registros de fotografías:',
                error.message
            );
        }
    }
};

// Subir fotografías y registrar sus rutas.
const subirFotosSolicitud = async (solicitudId, archivos) => {
    if (!solicitudId) {
        throw new Error('Se requiere el identificador de la solicitud.');
    }

    const archivosValidados = await validarFotografias(archivos);

    if (archivosValidados.length === 0) {
        return [];
    }

    const rutasSubidas = [];
    let registrosInsertados = [];

    try {
        // Subir cada fotografía al bucket privado.
        for (const archivo of archivosValidados) {
            const nombreUnico = crypto.randomUUID();

            const ruta = `${solicitudId}/${nombreUnico}.${archivo.extension}`;

            const { error } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(ruta, archivo.buffer, {
                    contentType: archivo.mime,
                    upsert: false
                });

            if (error) {
                throw new Error(
                    'No fue posible subir una de las fotografías.'
                );
            }

            rutasSubidas.push(ruta);
        }

        // Preparar los registros relacionados con la solicitud.
        const registros = rutasSubidas.map((ruta, indice) => ({
            solicitud_id: solicitudId,
            ruta_archivo: ruta,
            nombre_archivo: archivosValidados[indice].nombreOriginal
        }));

        const { data, error } = await supabaseAdmin
            .from('fotos_solicitud_trabajador')
            .insert(registros)
            .select('id, solicitud_id, ruta_archivo, nombre_archivo');

        if (error) {
            throw new Error(
                'No fue posible registrar las fotografías de la solicitud.'
            );
        }

        registrosInsertados = data || [];

        return registrosInsertados;

    } catch (error) {
        // Revertir los registros y archivos si ocurre un error.
        await eliminarFotosSolicitud(
            rutasSubidas,
            registrosInsertados.map(foto => foto.id)
        );

        console.error(
            'Error al procesar fotografías:',
            error.message
        );

        throw error;
    }
};

module.exports = {
    subirFotosSolicitud,
    eliminarFotosSolicitud
};
