
const supabaseAdmin = require('../config/supabaseAdmin');

const {
    subirFotosSolicitud,
    eliminarFotosSolicitud
} = require('./fotosSolicitudService');

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

// Normalizar texto recibido desde React.
const normalizarTexto = (valor) => {
    if (typeof valor !== 'string') {
        return null;
    }

    const texto = valor.trim();

    return texto === '' ? null : texto;
};

// Validar y convertir coordenadas.
const convertirCoordenada = (valor, minimo, maximo, nombre) => {
    if (
        valor === undefined ||
        valor === null ||
        valor === ''
    ) {
        throw new Error(`La coordenada ${nombre} es obligatoria.`);
    }

    const numero = Number(valor);

    if (
        !Number.isFinite(numero) ||
        numero < minimo ||
        numero > maximo
    ) {
        throw new Error(`La coordenada ${nombre} no es válida.`);
    }

    return numero;
};

// Validar los datos del formulario.
const validarDatosSolicitud = async (datos) => {
    if (
        !datos ||
        typeof datos !== 'object' ||
        Array.isArray(datos)
    ) {
        throw new Error('Los datos de la solicitud no son válidos.');
    }

    const tipoRegistro = normalizarTexto(datos.tipo_registro);

    if (!['negocio', 'independiente'].includes(tipoRegistro)) {
        throw new Error(
            'Selecciona si deseas registrar un negocio o una actividad independiente.'
        );
    }

    const nombreComercial = normalizarTexto(datos.nombre_comercial);

    if (!nombreComercial) {
        throw new Error('El nombre comercial es obligatorio.');
    }

    const categoriaId = normalizarTexto(datos.categoria_id);

    if (!categoriaId) {
        throw new Error('Debes seleccionar una categoría.');
    }

    // Comprobar que la categoría realmente exista.
    const { data: categoria, error: errorCategoria } = await supabaseAdmin
        .from('categorias')
        .select('id')
        .eq('id', categoriaId)
        .maybeSingle();

    if (errorCategoria) {
        console.error(
            'Error al validar categoría:',
            errorCategoria.message
        );

        throw new Error('No fue posible validar la categoría.');
    }

    if (!categoria) {
        throw new Error('La categoría seleccionada no existe.');
    }

    const descripcion = normalizarTexto(datos.descripcion);

    if (!descripcion) {
        throw new Error('La descripción es obligatoria.');
    }

    const direccion = normalizarTexto(datos.direccion);
    const zonaCobertura = normalizarTexto(datos.zona_cobertura);

    if (tipoRegistro === 'negocio' && !direccion) {
        throw new Error(
            'La dirección del negocio es obligatoria.'
        );
    }

    if (tipoRegistro === 'independiente' && !zonaCobertura) {
        throw new Error(
            'La zona de cobertura es obligatoria.'
        );
    }

    const telefonoContacto = normalizarTexto(
        datos.telefono_contacto
    );

    const whatsapp = normalizarTexto(datos.whatsapp);
    const emailContacto = normalizarTexto(datos.email_contacto);
    const sitioWeb = normalizarTexto(datos.sitio_web);

    // Debe existir al menos un medio de contacto.
    if (
        !telefonoContacto &&
        !whatsapp &&
        !emailContacto &&
        !sitioWeb
    ) {
        throw new Error(
            'Debes proporcionar al menos un medio de contacto.'
        );
    }

    if (
        emailContacto &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailContacto)
    ) {
        throw new Error('El correo de contacto no es válido.');
    }

    const lat = convertirCoordenada(
        datos.lat,
        -90,
        90,
        'latitud'
    );

    const lng = convertirCoordenada(
        datos.lng,
        -180,
        180,
        'longitud'
    );

    return {
        tipo_registro: tipoRegistro,
        nombre_comercial: nombreComercial,
        categoria_id: categoriaId,
        descripcion,
        direccion,
        zona_cobertura: zonaCobertura,
        telefono_contacto: telefonoContacto,
        whatsapp,
        email_contacto: emailContacto,
        sitio_web: sitioWeb,
        lat,
        lng
    };
};

// Consultar el perfil y comprobar que puede solicitar un registro.
const validarPerfilTrabajador = async (perfilId) => {
    const { data, error } = await supabaseAdmin
        .from('perfiles')
        .select('id, rol')
        .eq('id', perfilId)
        .maybeSingle();

    if (error) {
        console.error(
            'Error al consultar perfil:',
            error.message
        );

        throw new Error('No fue posible validar tu perfil.');
    }

    if (!data) {
        throw new Error('No se encontró tu perfil.');
    }

    if (!['usuario', 'trabajador'].includes(data.rol)) {
        throw new Error(
            'Tu tipo de cuenta no permite registrar solicitudes.'
        );
    }

    return data;
};

// Consultar todas las solicitudes del trabajador.
const obtenerSolicitudesPropias = async (perfilId) => {
    const { data, error } = await supabaseAdmin
        .from('solicitudes_trabajador')
        .select(CAMPOS_SOLICITUD)
        .eq('perfil_id', perfilId)
        .order('creado_en', { ascending: false });

    if (error) {
        console.error(
            'Error al consultar historial:',
            error.message
        );

        throw new Error(
            'No fue posible consultar el historial de solicitudes.'
        );
    }

    const solicitudes = data || [];

    if (solicitudes.length === 0) {
        return [];
    }

    const ids = solicitudes.map(solicitud => solicitud.id);

    const { data: fotografias, error: errorFotos } = await supabaseAdmin
        .from('fotos_solicitud_trabajador')
        .select('id, solicitud_id, ruta_archivo, nombre_archivo, creado_en')
        .in('solicitud_id', ids);

    if (errorFotos) {
        console.error(
            'Error al consultar fotografías:',
            errorFotos.message
        );

        throw new Error(
            'No fue posible consultar las fotografías de las solicitudes.'
        );
    }

    return solicitudes.map(solicitud => ({
        ...solicitud,
        fotografias: (fotografias || []).filter(
            foto => foto.solicitud_id === solicitud.id
        )
    }));
};

// Consultar la solicitud pendiente del trabajador.
const obtenerSolicitudPendiente = async (perfilId) => {
    const { data, error } = await supabaseAdmin
        .from('solicitudes_trabajador')
        .select(CAMPOS_SOLICITUD)
        .eq('perfil_id', perfilId)
        .eq('estado', 'pendiente')
        .maybeSingle();

    if (error) {
        console.error(
            'Error al consultar solicitud pendiente:',
            error.message
        );

        throw new Error(
            'No fue posible consultar la solicitud pendiente.'
        );
    }

    return data;
};

// Crear una nueva solicitud pendiente.
const crearSolicitudPendiente = async (perfilId) => {
    await validarPerfilTrabajador(perfilId);

    const solicitudExistente = await obtenerSolicitudPendiente(
        perfilId
    );

    if (solicitudExistente) {
        throw new Error(
            'Ya tienes una solicitud pendiente.'
        );
    }

    const { data, error } = await supabaseAdmin
        .from('solicitudes_trabajador')
        .insert({
            perfil_id: perfilId,
            estado: 'pendiente',
            datos_completos: false
        })
        .select(CAMPOS_SOLICITUD)
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error(
                'Ya tienes una solicitud pendiente.'
            );
        }

        console.error(
            'Error al crear solicitud:',
            error.message
        );

        throw new Error(
            'No fue posible crear una nueva solicitud.'
        );
    }

    return data;
};

// Guardar y enviar una solicitud para revisión.
const enviarSolicitud = async (perfilId, datos, archivos = []) => {
    // 1. Validar que el perfil pueda registrar solicitudes.
    await validarPerfilTrabajador(perfilId);

    // 2. Validar todos los datos antes de modificar la base.
    const datosValidados = await validarDatosSolicitud(datos);

    if (!Array.isArray(archivos) || archivos.length > 5) {
        throw new Error(
            'Puedes enviar máximo 5 fotografías por solicitud.'
        );
    }

    // 3. Buscar la solicitud pendiente creada anteriormente.
    let solicitud = await obtenerSolicitudPendiente(perfilId);

    // 4. Si no existe, crear una nueva.
    if (!solicitud) {
        solicitud = await crearSolicitudPendiente(perfilId);
    }

    // 5. No permitir modificar una solicitud ya enviada.
    if (
        solicitud.datos_completos ||
        solicitud.enviada_en !== null
    ) {
        throw new Error(
            'Tu solicitud ya fue enviada y está pendiente de revisión.'
        );
    }

    // 6. Comprobar cuántas fotografías tiene actualmente.
    const { data: fotosExistentes, error: errorFotosExistentes } =
        await supabaseAdmin
            .from('fotos_solicitud_trabajador')
            .select('id')
            .eq('solicitud_id', solicitud.id);

    if (errorFotosExistentes) {
        console.error(
            'Error al consultar fotografías existentes:',
            errorFotosExistentes.message
        );

        throw new Error(
            'No fue posible verificar las fotografías de la solicitud.'
        );
    }

    if ((fotosExistentes || []).length + archivos.length > 5) {
        throw new Error(
            'La solicitud no puede tener más de 5 fotografías.'
        );
    }

    let fotografiasSubidas = [];

    try {
        // 7. Subir las fotografías y registrar sus rutas.
        if (archivos.length > 0) {
            fotografiasSubidas = await subirFotosSolicitud(
                solicitud.id,
                archivos
            );
        }

        // 8. Actualizar y enviar la solicitud.
        const fechaEnvio = new Date().toISOString();

        const { data: solicitudActualizada, error: errorActualizacion } =
            await supabaseAdmin
                .from('solicitudes_trabajador')
                .update({
                    ...datosValidados,
                    datos_completos: true,
                    enviada_en: fechaEnvio,
                    actualizado_en: fechaEnvio
                })
                .eq('id', solicitud.id)
                .eq('perfil_id', perfilId)
                .eq('estado', 'pendiente')
                .eq('datos_completos', false)
                .is('enviada_en', null)
                .select(CAMPOS_SOLICITUD)
                .maybeSingle();

        if (errorActualizacion) {
            console.error(
                'Error al enviar solicitud:',
                errorActualizacion.message
            );

            throw new Error(
                'No fue posible enviar la solicitud para revisión.'
            );
        }

        if (!solicitudActualizada) {
            throw new Error(
                'La solicitud cambió de estado y ya no puede enviarse.'
            );
        }

        return {
            solicitud: solicitudActualizada,
            fotografias: fotografiasSubidas
        };

    } catch (error) {
        // 9. Si falla el envío, limpiar las fotografías recién subidas.
        if (fotografiasSubidas.length > 0) {
            await eliminarFotosSolicitud(
                fotografiasSubidas.map(foto => foto.ruta_archivo),
                fotografiasSubidas.map(foto => foto.id)
            );
        }

        throw error;
    }
};

// Compatibilidad temporal con el controlador anterior.
const obtenerSolicitudPropia = async (perfilId) => {
    const solicitudes = await obtenerSolicitudesPropias(perfilId);

    return solicitudes.length > 0 ? solicitudes[0] : null;
};

const actualizarDatosSolicitud = async () => {
    throw new Error(
        'Utiliza el proceso de guardar y enviar la solicitud.'
    );
};

// Consultar categorías disponibles.
const obtenerCategorias = async () => {
    const { data, error } = await supabaseAdmin
        .from('categorias')
        .select('id, nombre, icono')
        .order('nombre', { ascending: true });

    if (error) {
        console.error(
            'Error al consultar categorías:',
            error.message
        );

        throw new Error(
            'No fue posible obtener las categorías.'
        );
    }

    return data || [];
};

module.exports = {
    obtenerSolicitudesPropias,
    obtenerSolicitudPendiente,
    crearSolicitudPendiente,
    enviarSolicitud,
    obtenerSolicitudPropia,
    actualizarDatosSolicitud,
    obtenerCategorias
};
