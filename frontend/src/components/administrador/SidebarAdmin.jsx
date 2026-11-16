
import { NavLink } from 'react-router-dom';

const SidebarAdmin = () => {
    return (
        <aside className="admin-sidebar">

            <div className="admin-sidebar-marca">
                <div className="admin-logo">
                    CL
                </div>

                <div>
                    <h2>ConectaLocal</h2>
                    <span>Administración</span>
                </div>
            </div>

            <div className="admin-sidebar-seccion">
                <span className="admin-sidebar-etiqueta">
                    MENÚ PRINCIPAL
                </span>

                <nav className="admin-sidebar-nav">

                    <NavLink
                        to="/administrador"
                        end
                        className={({ isActive }) =>
                            `admin-nav-link ${isActive ? 'activo' : ''}`
                        }
                    >
                        <span>▦</span>
                        Panel principal
                    </NavLink>

                    <NavLink
                        to="/administrador/solicitudes"
                        className={({ isActive }) =>
                            `admin-nav-link ${isActive ? 'activo' : ''}`
                        }
                    >
                        <span>▤</span>
                        Solicitudes
                    </NavLink>

                </nav>
            </div>

            <div className="admin-sidebar-inferior">
                <div className="admin-sidebar-perfil">
                    <div className="admin-avatar">
                        A
                    </div>

                    <div>
                        <strong>Administrador</strong>
                        <span>Gestión de plataforma</span>
                    </div>
                </div>
            </div>

        </aside>
    );
};

export default SidebarAdmin;
