
import {
    createContext,
    useContext,
    useEffect,
    useState
} from 'react';

import {
    loginRequest,
    getCurrentUserRequest,
    logoutRequest
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Recuperar la sesión al cargar la aplicación.
    useEffect(() => {
        const recuperarSesion = async () => {
            try {
                const data = await getCurrentUserRequest();
                setUser(data.perfil);

            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        recuperarSesion();
    }, []);

    // INICIAR SESIÓN.
    const login = async (email, password) => {
        setLoading(true);

        try {
            const data = await loginRequest(email, password);
            setUser(data.perfil);
            return {
                perfil: data.perfil
            };
        } finally {
            setLoading(false);
        }
    };

    // CERRAR SESIÓN.
    const logout = async () => {
        try {
            await logoutRequest();
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                session: user ? { perfil: user } : null,
                user,
                loading,
                isAuthenticated: Boolean(user),
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth debe utilizarse dentro de AuthProvider.'
        );
    }

    return context;
};
