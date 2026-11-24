
const supabaseAdmin = require('../config/supabaseAdmin');

// Verificar que el usuario autenticado sea trabajador.
const verificarTrabajador = async (trabajadorId) => {
    const { data, error } = await supabaseAdmin
        .from('perfiles')
        .select('id, rol')
        .eq('id', trabajadorId)
        .single();

    if (error || !data) {
        throw new Error('No se pudo verificar el perfil del trabajador.');
    }

    if (data.rol !== 'trabajador') {
        throw new Error('No tienes permisos para acceder a la mensajería.');
    }

    return data;
};

// Verificar que la conversación pertenezca a un negocio del trabajador.
const obtenerConversacionPropia = async (conversacionId, trabajadorId) => {
    await verificarTrabajador(trabajadorId);

    const { data: conversacion, error } = await supabaseAdmin
        .from('conversaciones')
        .select('id, negocio_id, usuario_id, actualizado_en')
        .eq('id', conversacionId)
        .maybeSingle();

    if (error) {
        throw new Error('Error al consultar la conversación.');
    }

    if (!conversacion) {
        throw new Error('La conversación no existe.');
    }

    const { data: negocio, error: errorNegocio } = await supabaseAdmin
        .from('negocios')
        .select('id, nombre')
        .eq('id', conversacion.negocio_id)
        .eq('propietario_id', trabajadorId)
        .maybeSingle();

    if (errorNegocio) {
        throw new Error('Error al verificar el negocio.');
    }

    if (!negocio) {
        throw new Error('No tienes acceso a esta conversación.');
    }

    return { conversacion, negocio };
};

// Obtener las conversaciones organizadas por negocio.
const obtenerConversacionesTrabajador = async (trabajadorId) => {
    await verificarTrabajador(trabajadorId);

    const { data: negocios, error: errorNegocios } = await supabaseAdmin
        .from('negocios')
        .select('id, nombre')
        .eq('propietario_id', trabajadorId)
        .order('creado_en', { ascending: false });

    if (errorNegocios) {
        throw new Error('No se pudieron consultar tus negocios.');
    }

    if (!negocios || negocios.length === 0) {
        return [];
    }

    const negocioIds = negocios.map(negocio => negocio.id);

    const { data: conversaciones, error: errorConversaciones } =
        await supabaseAdmin
            .from('conversaciones')
            .select('id, negocio_id, usuario_id, actualizado_en')
            .in('negocio_id', negocioIds)
            .order('actualizado_en', { ascending: false });

    if (errorConversaciones) {
        throw new Error('No se pudieron consultar las conversaciones.');
    }

    const listaConversaciones = conversaciones || [];

    if (listaConversaciones.length === 0) {
        return negocios.map(negocio => ({
            ...negocio,
            conversaciones: []
        }));
    }

    const usuarioIds = [
        ...new Set(listaConversaciones.map(c => c.usuario_id))
    ];

    const conversacionIds = listaConversaciones.map(c => c.id);

    const { data: perfiles, error: errorPerfiles } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, avatar_url')
        .in('id', usuarioIds);

    if (errorPerfiles) {
        throw new Error('No se pudieron consultar los perfiles.');
    }

    const { data: mensajes, error: errorMensajes } = await supabaseAdmin
        .from('mensajes')
        .select('id, conversacion_id, remitente_id, contenido, leido, creado_en')
        .in('conversacion_id', conversacionIds)
        .order('creado_en', { ascending: false });

    if (errorMensajes) {
        throw new Error('No se pudieron consultar los mensajes.');
    }

    const perfilesMap = new Map(
        (perfiles || []).map(perfil => [perfil.id, perfil])
    );

    const ultimoMensajeMap = new Map();
    const mensajesNoLeidosMap = new Map();

    (mensajes || []).forEach(mensaje => {
        if (!ultimoMensajeMap.has(mensaje.conversacion_id)) {
            ultimoMensajeMap.set(mensaje.conversacion_id, mensaje);
        }

        if (
            mensaje.remitente_id !== trabajadorId &&
            !mensaje.leido
        ) {
            const cantidad =
                mensajesNoLeidosMap.get(mensaje.conversacion_id) || 0;

            mensajesNoLeidosMap.set(
                mensaje.conversacion_id,
                cantidad + 1
            );
        }
    });

    return negocios.map(negocio => ({
        ...negocio,
        conversaciones: listaConversaciones
            .filter(c => c.negocio_id === negocio.id)
            .map(conversacion => ({
                id: conversacion.id,
                usuario: perfilesMap.get(conversacion.usuario_id) || null,
                actualizado_en: conversacion.actualizado_en,
                ultimo_mensaje:
                    ultimoMensajeMap.get(conversacion.id) || null,
                mensajes_no_leidos:
                    mensajesNoLeidosMap.get(conversacion.id) || 0
            }))
    }));
};

// Obtener el historial de mensajes de una conversación.
const obtenerMensajesConversacion = async (
    conversacionId,
    trabajadorId
) => {
    const { conversacion, negocio } = await obtenerConversacionPropia(
        conversacionId,
        trabajadorId
    );

    const { data: mensajes, error } = await supabaseAdmin
        .from('mensajes')
        .select('id, conversacion_id, remitente_id, contenido, leido, creado_en')
        .eq('conversacion_id', conversacion.id)
        .order('creado_en', { ascending: true });

    if (error) {
        throw new Error('No se pudo consultar el historial de mensajes.');
    }

    const remitenteIds = [
        ...new Set((mensajes || []).map(m => m.remitente_id))
    ];

    let perfiles = [];

    if (remitenteIds.length > 0) {
        const { data, error: errorPerfiles } = await supabaseAdmin
            .from('perfiles')
            .select('id, nombre, avatar_url')
            .in('id', remitenteIds);

        if (errorPerfiles) {
            throw new Error('No se pudieron consultar los remitentes.');
        }

        perfiles = data || [];
    }

    const perfilesMap = new Map(
        perfiles.map(perfil => [perfil.id, perfil])
    );

    return {
        conversacion: {
            id: conversacion.id,
            usuario_id: conversacion.usuario_id,
            negocio
        },
        mensajes: (mensajes || []).map(mensaje => ({
            ...mensaje,
            remitente: perfilesMap.get(mensaje.remitente_id) || null,
            es_propio: mensaje.remitente_id === trabajadorId
        }))
    };
};

// Enviar un mensaje como trabajador.
const enviarMensajeTrabajador = async (
    conversacionId,
    trabajadorId,
    contenido
) => {
    const texto = typeof contenido === 'string'
        ? contenido.trim()
        : '';

    if (!texto) {
        throw new Error('El mensaje no puede estar vacío.');
    }

    if (texto.length > 2000) {
        throw new Error('El mensaje no puede superar los 2000 caracteres.');
    }

    const { conversacion } = await obtenerConversacionPropia(
        conversacionId,
        trabajadorId
    );

    const { data: mensaje, error } = await supabaseAdmin
        .from('mensajes')
        .insert({
            conversacion_id: conversacion.id,
            remitente_id: trabajadorId,
            contenido: texto
        })
        .select('id, conversacion_id, remitente_id, contenido, leido, creado_en')
        .single();

    if (error) {
        throw new Error('No se pudo enviar el mensaje.');
    }

    const { error: errorActualizacion } = await supabaseAdmin
        .from('conversaciones')
        .update({
            actualizado_en: new Date().toISOString()
        })
        .eq('id', conversacion.id);

    if (errorActualizacion) {
        throw new Error(
            'El mensaje se envió, pero no se pudo actualizar la conversación.'
        );
    }

    return {
        ...mensaje,
        es_propio: true
    };
};

// Marcar como leídos los mensajes recibidos por el trabajador.
const marcarMensajesComoLeidos = async (
    conversacionId,
    trabajadorId
) => {
    const { conversacion } = await obtenerConversacionPropia(
        conversacionId,
        trabajadorId
    );

    const { data, error } = await supabaseAdmin
        .from('mensajes')
        .update({ leido: true })
        .eq('conversacion_id', conversacion.id)
        .neq('remitente_id', trabajadorId)
        .eq('leido', false)
        .select('id');

    if (error) {
        throw new Error('No se pudieron marcar los mensajes como leídos.');
    }

    return {
        actualizados: data.length
    };
};

module.exports = {
    obtenerConversacionesTrabajador,
    obtenerMensajesConversacion,
    enviarMensajeTrabajador,
    marcarMensajesComoLeidos
};
