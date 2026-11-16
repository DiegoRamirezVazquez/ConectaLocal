
const supabaseAdmin = require('../config/supabaseAdmin');
const crypto = require('crypto');

// Campos que consultaremos de cada solicitud.
const CAMPOS_SOLICITUD = `
    id,
    perfil_id,
    estado,
    creado_en,
    actualizado_en,
    tipo_registro,
    nombre_comercial,
    categoria_id,
    descripcion,
    direccion,
    zona_cobertura,
    telefono_contacto,
    whatsapp,
    email_contacto,
    sitio_web,
    motivo_rechazo,
    revisado_por,
    revisado_en,
    datos_completos,
    enviada_en,
    lat,
    lng
`;

// Consultar solicitudes enviadas para revisión.
const obtenerSolicitudesAdmin = async (estado = null) => {
    let consulta = supabaseAdmin
        .from('solicitudes_trabajador')
        .select(CAMPOS_SOLICITUD)
        .eq('datos_completos', true)
        .not('enviada_en', 'is', null)
        .order('enviada_en', { ascending: false });

    if (estado) {
        const estadosValidos = [
            'pendiente',
            'aprobada',
            'rechazada'
        ];

        if (!estadosValidos.includes(estado)) {
            throw new Error('El estado solicitado no es válido.');
        }

        consulta = consulta.eq('estado', estado);
    }

    const { data: solicitudes, error } = await consulta;

    if (error) {
        console.error(
            'Error al consultar solicitudes administrativas:',
            error.message
        );

        throw new Error(
            'No fue posible consultar las solicitudes.'
        );
    }

    const registros = solicitudes || [];

    if (registros.length === 0) {
        return {
            solicitudes: [],
            resumen: {
                pendientes: 0,
                aprobadas: 0,
                rechazadas: 0,
                total: 0
            }
        };
    }

    const perfilesIds = [
        ...new Set(registros.map(item => item.perfil_id))
    ];

    const categoriasIds = [
        ...new Set(registros.map(item => item.categoria_id))
    ];

    const { data: perfiles, error: errorPerfiles } =
        await supabaseAdmin
            .from('perfiles')
            .select('id, nombre, email, telefono')
            .in('id', perfilesIds);

    if (errorPerfiles) {
        console.error(
            'Error al consultar perfiles de solicitudes:',
            errorPerfiles.message
        );

        throw new Error(
            'No fue posible consultar los datos de los solicitantes.'
        );
    }

    const { data: categorias, error: errorCategorias } =
        await supabaseAdmin
            .from('categorias')
            .select('id, nombre, icono')
            .in('id', categoriasIds);

    if (errorCategorias) {
        console.error(
            'Error al consultar categorías administrativas:',
            errorCategorias.message
        );

        throw new Error(
            'No fue posible consultar las categorías.'
        );
    }

    const solicitudesCompletas = registros.map(solicitud => {
        const perfil = (perfiles || []).find(
            item => item.id === solicitud.perfil_id
        );

        const categoria = (categorias || []).find(
            item => item.id === solicitud.categoria_id
        );

        return {
            ...solicitud,
            solicitante: perfil || null,
            categoria: categoria || null
        };
    });

    const resumen = {
        pendientes: registros.filter(
            item => item.estado === 'pendiente'
        ).length,

        aprobadas: registros.filter(
            item => item.estado === 'aprobada'
        ).length,

        rechazadas: registros.filter(
            item => item.estado === 'rechazada'
        ).length,

        total: registros.length
    };

    return {
        solicitudes: solicitudesCompletas,
        resumen
    };
};


// Consultar el detalle completo de una solicitud.
const obtenerDetalleSolicitudAdmin = async (solicitudId) => {
    if (
        typeof solicitudId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(solicitudId)
    ) {
        throw new Error('El identificador de la solicitud no es válido.');
    }

    const { data: solicitud, error } = await supabaseAdmin
        .from('solicitudes_trabajador')
        .select(CAMPOS_SOLICITUD)
        .eq('id', solicitudId)
        .eq('datos_completos', true)
        .not('enviada_en', 'is', null)
        .maybeSingle();

    if (error) {
        console.error(
            'Error al consultar detalle de solicitud:',
            error.message
        );

        throw new Error('No fue posible consultar la solicitud.');
    }

    if (!solicitud) {
        throw new Error('La solicitud no existe.');
    }

    const { data: solicitante, error: errorPerfil } =
        await supabaseAdmin
            .from('perfiles')
            .select('id, nombre, email, telefono')
            .eq('id', solicitud.perfil_id)
            .maybeSingle();

    if (errorPerfil) {
        console.error(
            'Error al consultar solicitante:',
            errorPerfil.message
        );

        throw new Error('No fue posible consultar al solicitante.');
    }

    const { data: categoria, error: errorCategoria } =
        await supabaseAdmin
            .from('categorias')
            .select('id, nombre, icono')
            .eq('id', solicitud.categoria_id)
            .maybeSingle();

    if (errorCategoria) {
        console.error(
            'Error al consultar categoría:',
            errorCategoria.message
        );

        throw new Error('No fue posible consultar la categoría.');
    }

    const { data: fotografias, error: errorFotos } =
        await supabaseAdmin
            .from('fotos_solicitud_trabajador')
            .select('id, ruta_archivo, nombre_archivo, creado_en')
            .eq('solicitud_id', solicitudId)
            .order('creado_en', { ascending: true });

    if (errorFotos) {
        console.error(
            'Error al consultar fotografías:',
            errorFotos.message
        );

        throw new Error('No fue posible consultar las fotografías.');
    }

    const fotografiasFirmadas = await Promise.all(
        (fotografias || []).map(async (foto) => {
            const { data, error: errorUrl } =
                await supabaseAdmin.storage
                    .from('solicitudes-trabajador')
                    .createSignedUrl(foto.ruta_archivo, 300);

            if (errorUrl || !data?.signedUrl) {
                console.error(
                    'Error al generar enlace de fotografía:',
                    errorUrl?.message
                );

                throw new Error(
                    'No fue posible generar el acceso a una fotografía.'
                );
            }

            return {
                id: foto.id,
                nombre_archivo: foto.nombre_archivo,
                url: data.signedUrl,
                creado_en: foto.creado_en
            };
        })
    );

    return {
        solicitud,
        solicitante: solicitante || null,
        categoria: categoria || null,
        fotografias: fotografiasFirmadas
    };
};


// Aprobar una solicitud y crear el negocio correspondiente.
const aprobarSolicitudAdmin = async (solicitudId, adminId) => {
    const { data, error } = await supabaseAdmin.rpc(
        'aprobar_solicitud_trabajador',
        {
            p_solicitud_id: solicitudId,
            p_admin_id: adminId
        }
    );

    if (error) {
        console.error('Error al aprobar solicitud:', error);

        const nuevoError = new Error(
            error.message || 'No fue posible aprobar la solicitud.'
        );

        nuevoError.code = error.code;
        throw nuevoError;
    }

    let transferencia = {
        success: false,
        total: 0,
        mensaje: 'No se realizó la transferencia de fotografías.'
    };

    try {
        const resultadoFotos = await transferirFotosSolicitudNegocio(
            solicitudId,
            data.negocio_id
        );

        transferencia = {
            success: true,
            ...resultadoFotos
        };

    } catch (errorFotos) {
        console.error(
            'La solicitud fue aprobada, pero falló la transferencia:',
            errorFotos.message
        );

        transferencia = {
            success: false,
            total: 0,
            mensaje: errorFotos.message
        };
    }

    return {
        ...data,
        transferencia_fotografias: transferencia
    };
};


// Rechazar una solicitud registrando el motivo.
const rechazarSolicitudAdmin = async (
    solicitudId,
    adminId,
    motivo
) => {
    const { data, error } = await supabaseAdmin.rpc(
        'rechazar_solicitud_trabajador',
        {
            p_solicitud_id: solicitudId,
            p_admin_id: adminId,
            p_motivo: motivo
        }
    );

    if (error) {
        console.error('Error al rechazar solicitud:', error);

        const nuevoError = new Error(
            error.message || 'No fue posible rechazar la solicitud.'
        );

        nuevoError.code = error.code;
        throw nuevoError;
    }

    return data;
};


// Transferir fotografías de una solicitud al negocio.
const transferirFotosSolicitudNegocio = async (
    solicitudId,
    negocioId
) => {
    if (!solicitudId || !negocioId) {
        throw new Error(
            'Se requieren los identificadores de la solicitud y del negocio.'
        );
    }

    const BUCKET_ORIGEN = 'solicitudes-trabajador';
    const BUCKET_DESTINO = 'fotos-negocios';

    const LIMITE_FOTOS = 5;
    const TAMANO_MAXIMO = 5 * 1024 * 1024;

    const TIPOS_PERMITIDOS = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
    };

    const archivosSubidos = [];
    const registrosInsertados = [];

    try {
        // 1. Consultar fotografías originales.
        const { data: fotografias, error: errorFotos } =
            await supabaseAdmin
                .from('fotos_solicitud_trabajador')
                .select('id, ruta_archivo, nombre_archivo')
                .eq('solicitud_id', solicitudId)
                .order('creado_en', { ascending: true });

        if (errorFotos) {
            throw new Error(
                'No fue posible consultar las fotografías originales.'
            );
        }

        if (!fotografias || fotografias.length === 0) {
            return {
                total: 0,
                mensaje: 'La solicitud no contiene fotografías.'
            };
        }

        // 2. Consultar fotografías ya transferidas.
        const { data: existentes, error: errorExistentes } =
            await supabaseAdmin
                .from('fotos_negocio')
                .select('foto_solicitud_id')
                .eq('negocio_id', negocioId);

        if (errorExistentes) {
            throw new Error(
                'No fue posible consultar la galería del negocio.'
            );
        }

        const idsTransferidos = new Set(
            (existentes || [])
                .map(foto => foto.foto_solicitud_id)
                .filter(Boolean)
        );

        const pendientes = fotografias.filter(
            foto => !idsTransferidos.has(foto.id)
        );

        if (pendientes.length === 0) {
            return {
                total: 0,
                mensaje: 'Todas las fotografías ya fueron transferidas.'
            };
        }

        // 3. Comprobar el límite de cinco fotografías.
        const totalActual = (existentes || []).length;

        if (totalActual + pendientes.length > LIMITE_FOTOS) {
            throw new Error(
                `El negocio no puede superar las ${LIMITE_FOTOS} fotografías adicionales.`
            );
        }

        const { fileTypeFromBuffer } = await import('file-type');

        // 4. Descargar, validar y copiar cada fotografía.
        for (const foto of pendientes) {
            const { data: archivo, error: errorDescarga } =
                await supabaseAdmin.storage
                    .from(BUCKET_ORIGEN)
                    .download(foto.ruta_archivo);

            if (errorDescarga || !archivo) {
                throw new Error(
                    'No fue posible descargar una fotografía original.'
                );
            }

            const buffer = Buffer.from(
                await archivo.arrayBuffer()
            );

            if (buffer.length > TAMANO_MAXIMO) {
                throw new Error(
                    'Una fotografía supera el límite de 5 MB.'
                );
            }

            const tipoReal = await fileTypeFromBuffer(buffer);

            if (!tipoReal || !TIPOS_PERMITIDOS[tipoReal.mime]) {
                throw new Error(
                    'Una fotografía tiene un formato no permitido.'
                );
            }

            const extension = TIPOS_PERMITIDOS[tipoReal.mime];

            const rutaDestino =
                `${negocioId}/galeria/solicitud-${foto.id}.${extension}`;

            const { error: errorSubida } =
                await supabaseAdmin.storage
                    .from(BUCKET_DESTINO)
                    .upload(rutaDestino, buffer, {
                        contentType: tipoReal.mime,
                        upsert: true
                    });

            if (errorSubida) {
                throw new Error(
                    'No fue posible copiar una fotografía al negocio.'
                );
            }

            archivosSubidos.push(rutaDestino);

            const { data: urlPublica } =
                supabaseAdmin.storage
                    .from(BUCKET_DESTINO)
                    .getPublicUrl(rutaDestino);

            registrosInsertados.push({
                negocio_id: negocioId,
                foto_solicitud_id: foto.id,
                url: urlPublica.publicUrl,
                descripcion: null
            });
        }

        // 5. Registrar las fotografías en la galería.
        const { data: registros, error: errorInsertar } =
            await supabaseAdmin
                .from('fotos_negocio')
                .insert(registrosInsertados)
                .select('id, negocio_id, foto_solicitud_id, url');

        if (errorInsertar) {
            throw new Error(
                'No fue posible registrar las fotografías en la galería.'
            );
        }

        return {
            total: registros.length,
            fotografias: registros,
            mensaje: 'Fotografías transferidas correctamente.'
        };

    } catch (error) {
        // 6. Limpiar los archivos nuevos si falla la operación.
        if (archivosSubidos.length > 0) {
            const { error: errorLimpieza } =
                await supabaseAdmin.storage
                    .from(BUCKET_DESTINO)
                    .remove(archivosSubidos);

            if (errorLimpieza) {
                console.error(
                    'Error al limpiar fotografías:',
                    errorLimpieza.message
                );
            }
        }

        console.error(
            'Error al transferir fotografías:',
            error.message
        );

        throw error;
    }
};


// Exportar funciones del servicio.
module.exports = {
    obtenerSolicitudesAdmin,
    obtenerDetalleSolicitudAdmin,
    aprobarSolicitudAdmin,
    transferirFotosSolicitudNegocio,
    rechazarSolicitudAdmin
};
