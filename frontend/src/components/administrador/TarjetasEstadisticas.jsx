
const TarjetasEstadisticas = ({ resumen }) => {
    const tarjetas = [
        {
            titulo: 'Solicitudes pendientes',
            cantidad: resumen?.pendientes ?? 0,
            descripcion: 'Esperando revisión',
            icono: '🕒',
            clase: 'pendientes'
        },
        {
            titulo: 'Solicitudes aprobadas',
            cantidad: resumen?.aprobadas ?? 0,
            descripcion: 'Registros autorizados',
            icono: '✓',
            clase: 'aprobadas'
        },
        {
            titulo: 'Solicitudes rechazadas',
            cantidad: resumen?.rechazadas ?? 0,
            descripcion: 'No autorizadas',
            icono: '✕',
            clase: 'rechazadas'
        },
        {
            titulo: 'Total de solicitudes',
            cantidad: resumen?.total ?? 0,
            descripcion: 'Solicitudes recibidas',
            icono: '▤',
            clase: 'total'
        }
    ];

    return (
        <section className="admin-estadisticas">
            {tarjetas.map((tarjeta) => (
                <article
                    className={`admin-tarjeta ${tarjeta.clase}`}
                    key={tarjeta.clase}
                >
                    <div className="admin-tarjeta-superior">
                        <span className="admin-tarjeta-titulo">
                            {tarjeta.titulo}
                        </span>

                        <span className="admin-tarjeta-icono">
                            {tarjeta.icono}
                        </span>
                    </div>

                    <strong className="admin-tarjeta-cantidad">
                        {tarjeta.cantidad}
                    </strong>

                    <span className="admin-tarjeta-descripcion">
                        {tarjeta.descripcion}
                    </span>
                </article>
            ))}
        </section>
    );
};

export default TarjetasEstadisticas;
