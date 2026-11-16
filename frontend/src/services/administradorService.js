
import { enviarSolicitud } from './authService';

// Consultar solicitudes administrativas.
export const obtenerSolicitudesAdmin = async (estado = null) => {
    const parametros = estado
        ? `?estado=${encodeURIComponent(estado)}`
        : '';

    return enviarSolicitud(
        `/administrador/solicitudes${parametros}`,
        { method: 'GET' }
    );
};

// Consultar el detalle de una solicitud.
export const obtenerDetalleSolicitudAdmin = async (solicitudId) => {
    return enviarSolicitud(
        `/administrador/solicitudes/${encodeURIComponent(solicitudId)}`,
        { method: 'GET' }
    );
};

// Aprobar una solicitud.
export const aprobarSolicitudRequest = async (solicitudId) => {
    return enviarSolicitud(
        `/administrador/solicitudes/${encodeURIComponent(solicitudId)}/aprobar`,
        { method: 'POST' }
    );
};

// Rechazar una solicitud.
export const rechazarSolicitudRequest = async (solicitudId, motivo) => {
    return enviarSolicitud(
        `/administrador/solicitudes/${encodeURIComponent(solicitudId)}/rechazar`,
        {
            method: 'POST',
            body: JSON.stringify({ motivo })
        }
    );
};
