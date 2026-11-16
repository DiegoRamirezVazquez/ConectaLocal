import { useCallback, useEffect, useState } from 'react';

import SidebarAdmin from '../../components/administrador/SidebarAdmin';
import TarjetasEstadisticas from '../../components/administrador/TarjetasEstadisticas';
import TablaSolicitudes from '../../components/administrador/TablaSolicitudes';

import { obtenerSolicitudesAdmin } from '../../services/administradorService';

import LogoutButton from '../../components/common/LogoutButton';

import './administrador.css';
import { useNavigate } from 'react-router-dom';

const AdministradorDashboard = () => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [resumen, setResumen] = useState({
        pendientes: 0,
        aprobadas: 0,
        rechazadas: 0,
        total: 0
    });

    const [filtro, setFiltro] = useState('todas');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const cargarSolicitudes = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const resultado = await obtenerSolicitudesAdmin();

            setSolicitudes(resultado.solicitudes || []);
            setResumen(resultado.resumen || {});
        } catch (err) {
            console.error('Error al cargar solicitudes:', err);

            setError(
                err.message || 'No fue posible cargar las solicitudes.'
            );
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarSolicitudes();
    }, [cargarSolicitudes]);

    const solicitudesFiltradas = filtro === 'todas'
        ? solicitudes
        : solicitudes.filter(
            solicitud => solicitud.estado === filtro
        );

    return (
        <div className="admin-layout">

            <SidebarAdmin />

            <main className="admin-contenido">

                <header className="admin-header">
                    <div>
                        <span className="admin-header-subtitulo">
                            CONECTALOCAL / ADMINISTRACIÓN
                        </span>

                        <h1>Panel de administración</h1>

                        <p>
                            Gestiona las solicitudes de registro de trabajadores.
                        </p>
                    </div>

                    <div className="admin-header-acciones">
                        <span className="admin-rol">
                            Administrador
                        </span>

                        <LogoutButton />
                    </div>
                </header>

                <section className="admin-bienvenida">
                    <div>
                        <h2>Resumen general</h2>

                        <p>
                            Consulta el estado de las solicitudes recibidas
                            en la plataforma.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="admin-boton-actualizar"
                        onClick={cargarSolicitudes}
                        disabled={cargando}
                    >
                        ↻ Actualizar
                    </button>
                </section>

                <TarjetasEstadisticas resumen={resumen} />

                <section className="admin-seccion-solicitudes">

                    <div className="admin-seccion-encabezado">
                        <div>
                            <h2>Solicitudes recibidas</h2>

                            <p>
                                Revisa los registros enviados por los trabajadores.
                            </p>
                        </div>
                    </div>

                    <div className="admin-filtros">
                        {[
                            { valor: 'todas', texto: 'Todas' },
                            { valor: 'pendiente', texto: 'Pendientes' },
                            { valor: 'aprobada', texto: 'Aprobadas' },
                            { valor: 'rechazada', texto: 'Rechazadas' }
                        ].map(opcion => (
                            <button
                                key={opcion.valor}
                                type="button"
                                className={
                                    filtro === opcion.valor
                                        ? 'admin-filtro activo'
                                        : 'admin-filtro'
                                }
                                onClick={() => setFiltro(opcion.valor)}
                            >
                                {opcion.texto}
                            </button>
                        ))}
                    </div>

                    {cargando ? (
                        <div className="admin-mensaje">
                            Cargando solicitudes...
                        </div>
                    ) : error ? (
                        <div className="admin-error">
                            <p>{error}</p>

                            <button
                                type="button"
                                onClick={cargarSolicitudes}
                            >
                                Intentar nuevamente
                            </button>
                        </div>
                    ) : (
                        <TablaSolicitudes
                            solicitudes={solicitudesFiltradas}
                            onVerDetalle={(solicitud) =>
                                navigate(`/administrador/solicitudes/${solicitud.id}`)
                            }
                        />
                    )}

                </section>

            </main>

        </div>
    );
};

export default AdministradorDashboard;
