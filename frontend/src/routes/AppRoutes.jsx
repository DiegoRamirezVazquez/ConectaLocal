
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Register from '../pages/auth/Register';
import Login from '../pages/auth/Login';

import TrabajadorDashboard from '../pages/trabajador/TrabajadorDashboard';
import RegistrarActividad from '../pages/trabajador/RegistrarActividad';
import GaleriaNegocio from '../pages/trabajador/GaleriaNegocio';

import AdministradorDashboard from '../pages/administrador/AdministradorDashboard';
import DetalleSolicitud from '../pages/administrador/DetalleSolicitud';

import InicioUsuario from '../pages/usuario/InicioUsuario';
import UsuarioLayout from '../components/usuario/UsuarioLayout';
import Recomendaciones from '../pages/usuario/Recomendaciones';

const getHomePath = (user) => {
    switch (user?.rol) {
        case 'usuario':
            return '/inicio';

        case 'trabajador':
            return '/trabajador';

        case 'administrador':
            return '/administrador';

        default:
            return '/login';
    }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user?.rol)) {
        return <Navigate to={getHomePath(user)} replace />;
    }

    return children;
};

const AppRoutes = () => {
    const { isAuthenticated, user, loading } = useAuth();

    const homePath = getHomePath(user);

    if (loading) {
        return <div>Verificando sesión...</div>;
    }

    return (
        <Routes>
            {/* AUTENTICACIÓN */}

            <Route
                path="/login"
                element={
                    isAuthenticated
                        ? <Navigate to={homePath} replace />
                        : <Login />
                }
            />

            <Route
                path="/registro"
                element={
                    isAuthenticated
                        ? <Navigate to={homePath} replace />
                        : <Register />
                }
            />

            {/* MÓDULO DE USUARIO */}

            <Route
                path="/"
                element={
                    <ProtectedRoute allowedRoles={['usuario']}>
                        <UsuarioLayout />
                    </ProtectedRoute>
                }
            >
                <Route
                    index
                    element={<Navigate to="/inicio" replace />}
                />

                <Route
                    path="inicio"
                    element={<InicioUsuario />}
                />

                <Route
                    path="mensajes"
                    element={<h1>Mensajes - Próximamente</h1>}
                />

                <Route
                    path="recomendaciones"
                    element={<Recomendaciones />}
                />

                <Route
                    path="perfil"
                    element={<h1>Mi perfil - Próximamente</h1>}
                />
            </Route>

            {/* MÓDULO DE TRABAJADOR */}

            <Route
                path="/trabajador"
                element={
                    <ProtectedRoute allowedRoles={['trabajador']}>
                        <TrabajadorDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/trabajador/registrar"
                element={
                    <ProtectedRoute allowedRoles={['trabajador']}>
                        <RegistrarActividad />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/trabajador/negocios/:negocioId"
                element={
                    <ProtectedRoute allowedRoles={['trabajador']}>
                        <GaleriaNegocio />
                    </ProtectedRoute>
                }
            />

            {/* MÓDULO DE ADMINISTRADOR */}

            <Route
                path="/administrador"
                element={
                    <ProtectedRoute allowedRoles={['administrador']}>
                        <AdministradorDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/administrador/solicitudes/:id"
                element={
                    <ProtectedRoute allowedRoles={['administrador']}>
                        <DetalleSolicitud />
                    </ProtectedRoute>
                }
            />

            {/* RUTAS NO ENCONTRADAS */}

            <Route
                path="*"
                element={
                    <Navigate
                        to={isAuthenticated ? homePath : '/login'}
                        replace
                    />
                }
            />
        </Routes>
    );
};

export default AppRoutes;
