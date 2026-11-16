import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import CarruselComunidad from "../../components/CarruselComunidad/CarruselComunidad";
import "./Login.css";

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const session = await login(email, password);

      switch (session.perfil.rol) {
        case "administrador":
          navigate("/administrador");
          break;
        case "trabajador":
          navigate("/trabajador");
          break;
        default:
          navigate("/inicio");
          break;
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="cl-login">
      <div className="cl-tarjeta">
      {/* Panel izquierdo: carrusel */}
      <aside className="cl-panel">
        <div className="cl-marca cl-marca-claro">
          <span className="cl-logo"><MapPin size={20} fill="currentColor" /></span>
          <span>ConectaLocal</span>
        </div>

        <CarruselComunidad />

        <p className="cl-panel-pie">Conecta con lo mejor de tu comunidad.</p>
      </aside>

      {/* Panel derecho: formulario */}
      <section className="cl-form-lado">
        <div className="cl-form-caja">
          <div className="cl-marca cl-marca-movil">
            <span className="cl-logo"><MapPin size={20} fill="currentColor" /></span>
            <span>ConectaLocal</span>
          </div>

          <header className="cl-encabezado">
            <h1>¡Qué gusto tenerte de vuelta!</h1>
            <p>Inicia sesión para conectar con los negocios de tu comunidad.</p>
          </header>

          {error && (
            <div className="cl-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="cl-campo">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="cl-campo">
              <label htmlFor="password">Contraseña</label>
              <div className="cl-password">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="cl-ojo"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="cl-boton" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="cl-pie">
            ¿Aún no tienes una cuenta? <Link to="/registro">Regístrate</Link>
          </p>
        </div>
      </section>
      </div>
    </main>
  );
};

export default Login;
