
const TablaSolicitudes = ({ solicitudes = [], onVerDetalle }) => {

    const obtenerEstado = (estado) => {
        const estados = {
            pendiente: 'Pendiente',
            aprobada: 'Aprobada',
            rechazada: 'Rechazada'
        };

        return estados[estado] || estado;
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin fecha';

        return new Date(fecha).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (solicitudes.length === 0) {
        return (
            <div className="admin-tabla-vacia">
                <span>📋</span>
                <h3>No hay solicitudes disponibles</h3>
                <p>Cuando recibas nuevas solicitudes aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="admin-tabla-contenedor">
            <table className="admin-tabla">
                <thead>
                    <tr>
                        <th>Solicitante</th>
                        <th>Actividad</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Fecha de envío</th>
                        <th>Estado</th>
                        <th>Acción</th>
                    </tr>
                </thead>

                <tbody>
                    {solicitudes.map((solicitud) => (
                        <tr key={solicitud.id}>
                            <td>
                                <div className="admin-solicitante">
                                    <strong>
                                        {solicitud.solicitante?.nombre || 'Sin nombre'}
                                    </strong>

                                    <span>
                                        {solicitud.solicitante?.email || 'Sin correo'}
                                    </span>
                                </div>
                            </td>

                            <td>
                                {solicitud.nombre_comercial}
                            </td>

                            <td>
                                <span className="admin-categoria">
                                    {solicitud.categoria?.icono || '📁'}
                                    {' '}
                                    {solicitud.categoria?.nombre || 'Sin categoría'}
                                </span>
                            </td>

                            <td>
                                {solicitud.tipo_registro === 'independiente'
                                    ? 'Independiente'
                                    : 'Negocio'}
                            </td>

                            <td>
                                {formatearFecha(solicitud.enviada_en)}
                            </td>

                            <td>
                                <span className={`admin-estado ${solicitud.estado}`}>
                                    {obtenerEstado(solicitud.estado)}
                                </span>
                            </td>

                            <td>
                                <button
                                    type="button"
                                    className="admin-boton-detalle"
                                    onClick={() => onVerDetalle?.(solicitud)}
                                    disabled={!onVerDetalle}
                                >
                                    Ver detalle
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TablaSolicitudes;
