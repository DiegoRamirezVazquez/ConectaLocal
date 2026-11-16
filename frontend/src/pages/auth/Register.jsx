import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, MapPin } from "lucide-react";
import { registerRequest } from "../../services/authService";
import CarruselComunidad from "../../components/CarruselComunidad/CarruselComunidad";
import "./Login.css"; // comparte la base visual con el login
import "./Register.css";

const FORM_INICIAL = {
  nombre: "",
  email: "",
  telefono: "",
  password: "",
  confirmarPassword: "",
  rol: "usuario"
};

const Register = () => {
  const [form, setForm] = useState(FORM_INICIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (form.password !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const response = await registerRequest({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        password: form.password,
        rol: form.rol
      });

      setSuccess(response);
      setForm(FORM_INICIAL);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cl-login">
      {/* cl-tarjeta-registro invierte el orden: formulario a la izquierda, carrusel a la derecha */}
      <div className="cl-tarjeta cl-tarjeta-registro">
        {/* Panel izquierdo: formulario */}
        <section className="cl-form-lado">
          <div className="cl-form-caja cl-form-caja-registro">
            <div className="cl-marca cl-marca-movil">
              <span className="cl-logo"><MapPin size={20} fill="currentColor" /></span>
              <span>ConectaLocal</span>
            </div>

            {success ? (
              <>
                <header className="cl-encabezado">
                  <h1>¡Tu registro está listo!</h1>
                  <p>{success.mensaje}</p>
                </header>

                {success.solicitudTrabajador === "pendiente" && (
                  <div className="cl-exito">
                    Tu solicitud para ser trabajador está pendiente de revisión
                    por un administrador. Mientras tanto, tu cuenta tendrá
                    acceso como usuario.
                  </div>
                )}

                <p className="cl-nota">
                  Revisa tu bandeja de entrada y confirma tu correo electrónico
                  para poder iniciar sesión.
                </p>

                <Link to="/login" className="cl-boton cl-boton-link">
                  Ir a iniciar sesión
                </Link>
              </>
            ) : (
              <>
                <header className="cl-encabezado">
                  <h1>¡Únete a ConectaLocal!</h1>
                  <p>Crea tu cuenta y comienza a conectar con tu comunidad.</p>
                </header>

                {error && (
                  <div className="cl-error" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="cl-campo">
                    <label htmlFor="nombre">Nombre completo</label>
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      placeholder="Ingresa tu nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="cl-campo">
                    <label htmlFor="email">Correo electrónico</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="cl-fila">
                    <div className="cl-campo">
                      <label htmlFor="telefono">
                        Teléfono
                      </label>
                      <input
                        id="telefono"
                        name="telefono"
                        type="tel"
                        value={form.telefono}
                        onChange={handleChange}
                        autoComplete="tel"
                      />
                    </div>

                    <div className="cl-campo">
                      <label htmlFor="rol">Tipo de cuenta</label>
                      <select
                        id="rol"
                        name="rol"
                        value={form.rol}
                        onChange={handleChange}
                        required
                      >
                        <option value="usuario">Usuario</option>
                        <option value="trabajador">Trabajador / Negocio</option>
                      </select>
                    </div>
                  </div>

                  {form.rol === "trabajador" && (
                    <p className="cl-ayuda">
                      Tu solicitud será revisada por un administrador antes de
                      activar las funciones de trabajador.
                    </p>
                  )}

                  <div className="cl-campo">
                    <label htmlFor="password">Contraseña</label>
                    <div className="cl-password">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
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

                  <div className="cl-campo">
                    <label htmlFor="confirmarPassword">Confirmar contraseña</label>
                    <div className="cl-password">
                      <input
                        id="confirmarPassword"
                        name="confirmarPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repite tu contraseña"
                        value={form.confirmarPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="cl-ojo"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={
                          showConfirmPassword
                            ? "Ocultar confirmación de contraseña"
                            : "Mostrar confirmación de contraseña"
                        }
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="cl-boton" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                  </button>
                </form>

                <p className="cl-pie">
                  ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
                </p>
              </>
            )}
          </div>
        </section>

        {/* Panel derecho: carrusel */}
        <aside className="cl-panel">
          <div className="cl-marca cl-marca-claro">
            <span className="cl-logo"><MapPin size={20} fill="currentColor" /></span>
            <span>ConectaLocal</span>
          </div>

          <CarruselComunidad />

          <p className="cl-panel-pie">Conecta con lo mejor de tu comunidad.</p>
        </aside>
      </div>
    </main>
  );
};

export default Register;
