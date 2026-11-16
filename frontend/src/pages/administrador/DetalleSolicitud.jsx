
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import './administrador.css';

import {
    obtenerDetalleSolicitudAdmin,
    aprobarSolicitudRequest,
    rechazarSolicitudRequest
} from '../../services/administradorService';

const DetalleSolicitud = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [mostrarRechazo, setMostrarRechazo] = useState(false);
    const [motivo, setMotivo] = useState('');

    const cargarDetalle = async () => {
        try {
            setCargando(true);
            setError('');

            const resultado = await obtenerDetalleSolicitudAdmin(id);
            setDetalle(resultado);

        } catch (err) {
            console.error('Error al consultar detalle:', err);
            setError(err.message || 'No fue posible cargar la solicitud.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDetalle();
    }, [id]);

    const handleAprobar = async () => {
        const confirmar = window.confirm(
            '¿Deseas aprobar esta solicitud? Se creará el negocio y se actualizará el rol del propietario cuando corresponda.'
        );

        if (!confirmar) return;

        try {
            setProcesando(true);
            setError('');
            setMensaje('');

            await aprobarSolicitudRequest(id);

            setMensaje('¡Solicitud aprobada correctamente! El negocio ha sido creado.');
            await cargarDetalle();

        } catch (err) {
            console.error('Error al aprobar:', err);
            setError(err.message || 'No fue posible aprobar la solicitud.');
        } finally {
            setProcesando(false);
        }
    };

    const handleRechazar = async () => {
        if (!motivo.trim()) {
            setError('Debes escribir el motivo del rechazo.');
            return;
        }

        try {
            setProcesando(true);
            setError('');
            setMensaje('');

            await rechazarSolicitudRequest(id, motivo.trim());

            setMensaje('La solicitud fue rechazada correctamente.');
            setMostrarRechazo(false);
            setMotivo('');

            await cargarDetalle();

        } catch (err) {
            console.error('Error al rechazar:', err);
            setError(err.message || 'No fue posible rechazar la solicitud.');
        } finally {
            setProcesando(false);
        }
    };

    if (cargando) {
        return (
            <div className="admin-contenido">
                <div className="admin-mensaje">
                    Cargando información de la solicitud...
                </div>
            </div>
        );
    }

    if (error && !detalle) {
        return (
            <div className="admin-contenido">
                <div className="admin-error">
                    <p>{error}</p>
                    <button onClick={() => navigate('/administrador')}>
                        Volver al panel
                    </button>
                </div>
            </div>
        );
    }

    if (!detalle?.solicitud) {
        return (
            <div className="admin-contenido">
                No se encontró la solicitud.
            </div>
        );
    }

    const {
        solicitud,
        solicitante,
        categoria,
        fotografias
    } = detalle;

    const pendiente = solicitud.estado === 'pendiente';

    const estadoTexto = {
        pendiente: 'Pendiente de revisión',
        aprobada: 'Aprobada',
        rechazada: 'Rechazada'
    };

    return (
        <main className="admin-contenido admin-detalle">

            <header className="admin-header">
                <div>
                    <span className="admin-header-subtitulo">
                        CONECTALOCAL / ADMINISTRACIÓN
                    </span>
                    <h1>Revisión de solicitud</h1>
                    <p>
                        Consulta la información y determina si cumple
                        los requisitos para formar parte de ConectaLocal.
                    </p>
                </div>

                <span className={`admin-estado ${solicitud.estado}`}>
                    {estadoTexto[solicitud.estado] || solicitud.estado}
                </span>
            </header>

            <button
                type="button"
                className="admin-boton-actualizar admin-volver"
                onClick={() => navigate('/administrador')}
                disabled={procesando}
            >
                ← Volver a solicitudes
            </button>

            {mensaje && (
                <div className="admin-mensaje-exito" role="status">
                    ✓ {mensaje}
                </div>
            )}

            {error && (
                <div className="admin-mensaje-error" role="alert">
                    {error}
                </div>
            )}

            <div className="admin-detalle-grid">

                <section className="admin-detalle-card">
                    <div className="admin-card-titulo">
                        <span className="admin-card-icono">👤</span>
                        <div>
                            <h2>Solicitante</h2>
                            <p>Información de la persona que solicita el registro</p>
                        </div>
                    </div>

                    <div className="admin-dato">
                        <span>Nombre completo</span>
                        <strong>{solicitante?.nombre || 'No disponible'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Correo electrónico</span>
                        <strong>{solicitante?.email || 'No disponible'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Teléfono</span>
                        <strong>{solicitante?.telefono || 'No disponible'}</strong>
                    </div>
                </section>

                <section className="admin-detalle-card">
                    <div className="admin-card-titulo">
                        <span className="admin-card-icono">🏪</span>
                        <div>
                            <h2>Información del negocio</h2>
                            <p>Datos principales de la actividad comercial</p>
                        </div>
                    </div>

                    <div className="admin-dato">
                        <span>Nombre comercial</span>
                        <strong>{solicitud.nombre_comercial || 'No especificado'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Tipo de registro</span>
                        <strong>{solicitud.tipo_registro || 'No especificado'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Categoría</span>
                        <strong>{categoria?.nombre || 'No especificada'}</strong>
                    </div>

                    <div className="admin-dato admin-dato-descripcion">
                        <span>Descripción</span>
                        <p>{solicitud.descripcion || 'No especificada'}</p>
                    </div>

                    <div className="admin-dato">
                        <span>Dirección</span>
                        <strong>{solicitud.direccion || 'No especificada'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Zona de cobertura</span>
                        <strong>{solicitud.zona_cobertura || 'No especificada'}</strong>
                    </div>
                </section>

                <section className="admin-detalle-card">
                    <div className="admin-card-titulo">
                        <span className="admin-card-icono">📞</span>
                        <div>
                            <h2>Medios de contacto</h2>
                            <p>Información para contactar al negocio</p>
                        </div>
                    </div>

                    <div className="admin-dato">
                        <span>Teléfono</span>
                        <strong>{solicitud.telefono_contacto || 'No especificado'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>WhatsApp</span>
                        <strong>{solicitud.whatsapp || 'No especificado'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Correo del negocio</span>
                        <strong>{solicitud.email_contacto || 'No especificado'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Sitio web</span>
                        {solicitud.sitio_web ? (
                            <a href={solicitud.sitio_web} target="_blank" rel="noreferrer">
                                Visitar sitio web ↗
                            </a>
                        ) : (
                            <strong>No especificado</strong>
                        )}
                    </div>
                </section>

                <section className="admin-detalle-card">
                    <div className="admin-card-titulo">
                        <span className="admin-card-icono">📍</span>
                        <div>
                            <h2>Ubicación</h2>
                            <p>Coordenadas registradas del negocio</p>
                        </div>
                    </div>

                    <div className="admin-dato">
                        <span>Latitud</span>
                        <strong>{solicitud.lat ?? 'No disponible'}</strong>
                    </div>

                    <div className="admin-dato">
                        <span>Longitud</span>
                        <strong>{solicitud.lng ?? 'No disponible'}</strong>
                    </div>

                    {solicitud.lat != null && solicitud.lng != null && (
                        <a
                            className="admin-mapa-link"
                            href={`https://www.google.com/maps?q=${solicitud.lat},${solicitud.lng}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Ver ubicación en Google Maps ↗
                        </a>
                    )}
                </section>

                <section className="admin-detalle-card admin-fotografias-card">
                    <div className="admin-card-titulo">
                        <span className="admin-card-icono">📷</span>
                        <div>
                            <h2>Fotografías del negocio</h2>
                            <p>Imágenes adjuntadas durante la solicitud</p>
                        </div>
                    </div>

                    {fotografias?.length > 0 ? (
                        <div className="admin-fotos">
                            {fotografias.map(foto => (
                                <a
                                    key={foto.id}
                                    href={foto.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="admin-foto-item"
                                >
                                    <img
                                        src={foto.url}
                                        alt={foto.nombre_archivo || 'Fotografía del negocio'}
                                    />
                                    <span>{foto.nombre_archivo || 'Ver fotografía'}</span>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="admin-sin-fotos">
                            No se adjuntaron fotografías.
                        </p>
                    )}
                </section>

                <section className="admin-detalle-card admin-estado-card">
                    <div className="admin-card-titulo">
                        <span className="admin-card-icono">📋</span>
                        <div>
                            <h2>Estado de revisión</h2>
                            <p>Situación actual de la solicitud</p>
                        </div>
                    </div>

                    <span className={`admin-estado admin-estado-grande ${solicitud.estado}`}>
                        {estadoTexto[solicitud.estado] || solicitud.estado}
                    </span>

                    {solicitud.motivo_rechazo && (
                        <div className="admin-dato admin-motivo-guardado">
                            <span>Motivo del rechazo</span>
                            <p>{solicitud.motivo_rechazo}</p>
                        </div>
                    )}

                    {solicitud.revisado_en && (
                        <div className="admin-dato">
                            <span>Fecha de revisión</span>
                            <strong>
                                {new Date(solicitud.revisado_en).toLocaleString('es-MX')}
                            </strong>
                        </div>
                    )}
                </section>

            </div>

            {pendiente && (
                <section className="admin-revision-panel">
                    <div>
                        <span className="admin-header-subtitulo">
                            ACCIÓN ADMINISTRATIVA
                        </span>
                        <h2>Resolver solicitud</h2>
                        <p>
                            Revisa los datos antes de tomar una decisión.
                            Esta acción actualizará el estado de la solicitud.
                        </p>
                    </div>

                    {!mostrarRechazo ? (
                        <div className="admin-acciones-solicitud">
                            <button
                                type="button"
                                className="admin-boton-aprobar"
                                onClick={handleAprobar}
                                disabled={procesando}
                            >
                                {procesando ? 'Procesando...' : '✓ Aprobar solicitud'}
                            </button>

                            <button
                                type="button"
                                className="admin-boton-rechazar"
                                onClick={() => {
                                    setError('');
                                    setMostrarRechazo(true);
                                }}
                                disabled={procesando}
                            >
                                ✕ Rechazar solicitud
                            </button>
                        </div>
                    ) : (
                        <div className="admin-rechazo-form">
                            <label htmlFor="motivo-rechazo">
                                Motivo del rechazo
                            </label>

                            <textarea
                                id="motivo-rechazo"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Explica claramente por qué no se puede aprobar esta solicitud..."
                                rows={5}
                                maxLength={1000}
                                disabled={procesando}
                            />

                            <p>{motivo.length}/1000 caracteres</p>

                            <div>
                                <button
                                    type="button"
                                    onClick={handleRechazar}
                                    disabled={procesando || !motivo.trim()}
                                >
                                    {procesando ? 'Procesando...' : 'Confirmar rechazo'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMostrarRechazo(false);
                                        setMotivo('');
                                        setError('');
                                    }}
                                    disabled={procesando}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

        </main>
    );
};

export default DetalleSolicitud;
