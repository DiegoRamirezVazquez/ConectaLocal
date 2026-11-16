
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LogoutButton = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error al cerrar sesión:', error.message);
        } finally {
            navigate('/login', { replace: true });
        }
    };

    return (
        <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
        >
            Cerrar sesión
        </button>
    );
};

export default LogoutButton;
