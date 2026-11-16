
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Register from '../pages/auth/Register';
import LogoutButton from '../components/common/LogoutButton';
import Login from '../pages/auth/Login';
import TrabajadorDashboard from '../pages/trabajador/TrabajadorDashboard';
import RegistrarActividad from '../pages/trabajador/RegistrarActividad';
import AdministradorDashboard from '../pages/administrador/AdministradorDashboard';
import DetalleSolicitud from '../pages/administrador/DetalleSolicitud';
import GaleriaNegocio from '../pages/trabajador/GaleriaNegocio';

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

    // Esperar a que el backend verifique la sesión.
    if (loading) {
        return <div>Verificando sesión...</div>;
    }

    return (
        <Routes>
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

            <Route
                path="/inicio"
                element={
                    <ProtectedRoute allowedRoles={['usuario']}>
                        <h1>Panel de usuario</h1>
                        <LogoutButton />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/trabajador"
                element={
                    <ProtectedRoute allowedRoles={['trabajador']}>
                        <TrabajadorDashboard />
                    </ProtectedRoute>
                }
            />

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

            <Route
                path="/"
                element={
                    <Navigate
                        to={isAuthenticated ? homePath : '/login'}
                        replace
                    />
                }
            />

            <Route
                path="*"
                element={
                    <Navigate
                        to={isAuthenticated ? homePath : '/login'}
                        replace
                    />
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
        </Routes>
    );
};

export default AppRoutes;
