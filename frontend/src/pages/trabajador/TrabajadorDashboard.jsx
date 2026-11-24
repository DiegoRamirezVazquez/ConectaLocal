import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Store,
  Wrench,
  ClipboardList,
  Bell,
  MapPin,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowRight,
  Pencil,
  BriefcaseBusiness,
  Camera,
  MessageCircle,
  Star,
  PlusCircle
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
  obtenerMisSolicitudes,
  obtenerMisNegocios,
  actualizarFotoPrincipalNegocio
} from "../../services/trabajadorService";

import TrabajadorSidebar from "../../components/trabajador/TrabajadorSidebar";
import "./TrabajadorDashboard.css";

const ESTADOS = {
  aprobada: "Aprobada",
  pendiente: "Pendiente",
  rechazada: "Rechazada",
  cancelada: "Cancelada"
};

const formatearFecha = (fecha) => {
  if (!fecha) return "—";

  return new Date(fecha).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

// OBTENER EL ICONO CORRESPONDIENTE A CADA CATEGORÍA.
const obtenerIconoCategoria = (icono) => {
  const iconos = {
    wrench: Wrench,
    store: Store
  };

  return iconos[icono?.toLowerCase()] || Store;
};

const TrabajadorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [solicitudes, setSolicitudes] = useState([]);
  const [negocios, setNegocios] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingNegocios, setLoadingNegocios] = useState(true);

  const [error, setError] = useState("");
  const [errorNegocios, setErrorNegocios] = useState("");

  const primerNombre = user?.nombre?.split(" ")[0] || "bienvenido";

  const [subiendoFotoId, setSubiendoFotoId] = useState(null);

  useEffect(() => {
    if (location.hash) {
        const id = location.hash.substring(1);

        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }
}, [location.pathname, location.hash]);

  // CARGAR SOLICITUDES Y NEGOCIOS.
  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        setLoading(true);
        setLoadingNegocios(true);

        setError("");
        setErrorNegocios("");

        const [dataSolicitudes, dataNegocios] = await Promise.all([
          obtenerMisSolicitudes(),
          obtenerMisNegocios()
        ]);

        setSolicitudes(dataSolicitudes.solicitudes || []);
        setNegocios(dataNegocios.negocios || []);

      } catch (err) {
        console.error("Error al cargar dashboard:", err);

        setError(
          err.message || "No fue posible cargar las solicitudes."
        );

        setErrorNegocios(
          err.message || "No fue posible cargar los negocios."
        );

      } finally {
        setLoading(false);
        setLoadingNegocios(false);
      }
    };

    cargarDashboard();
  }, []);

  const contar = (estado) =>
    solicitudes.filter((s) => s.estado === estado).length;

  const irARegistro = () => navigate("/trabajador/registrar");

  // ACTUALIZAR FOTOGRAFÍA PRINCIPAL DE UN NEGOCIO.
    const manejarCambioFotografia = async (negocioId, archivo) => {
    if (!archivo) return;

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
        alert("Solo se permiten fotografías JPG, PNG y WEBP.");
        return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
        alert("La fotografía debe pesar máximo 5 MB.");
        return;
    }

    try {
        setSubiendoFotoId(negocioId);

        const respuesta = await actualizarFotoPrincipalNegocio(
        negocioId,
        archivo
        );

        setNegocios((actuales) =>
        actuales.map((negocio) =>
            negocio.id === negocioId
            ? {
                ...negocio,
                foto_principal_url:
                    respuesta.negocio.foto_principal_url
                }
            : negocio
        )
        );

        alert("¡Fotografía actualizada correctamente!");

    } catch (error) {
        console.error("Error al actualizar fotografía:", error);

        alert(
        error.message ||
        "No fue posible actualizar la fotografía."
        );

    } finally {
        setSubiendoFotoId(null);
    }
    };

  const estadisticas = [
    {
      titulo: "Negocios registrados",
      valor: loadingNegocios ? "—" : negocios.length,
      icono: Store,
      color: "turquesa"
    },
    {
      titulo: "Negocios activos",
      valor: "—",
      icono: CheckCircle2,
      color: "verde"
    },
    {
      titulo: "Solicitudes pendientes",
      valor: loading ? "—" : contar("pendiente"),
      icono: Clock3,
      color: "ambar"
    },
    {
      titulo: "Solicitudes rechazadas",
      valor: loading ? "—" : contar("rechazada"),
      icono: XCircle,
      color: "rojo"
    },
    {
      titulo: "Mensajes sin leer",
      valor: "—",
      icono: MessageCircle,
      color: "azul"
    },
    {
      titulo: "Calificación promedio",
      valor: "—",
      icono: Star,
      color: "morado"
    }
  ];

  return (
    <div className="td-layout">

      <TrabajadorSidebar />

      <main className="td-main">

        {/* ENCABEZADO */}
        <header className="td-cabecera" id="inicio">

          <div>
            <span className="td-eyebrow">PANEL DE TRABAJADOR</span>

            <h1>¡Bienvenido, {primerNombre}!</h1>

            <p>
              Administra tus negocios, solicitudes y mantente
              en contacto con tus clientes.
            </p>
          </div>

          <button
            type="button"
            className="td-notificaciones"
            aria-label="Notificaciones"
          >
            <Bell size={22} />
            <span />
          </button>

        </header>

        {/* TARJETAS DE ESTADÍSTICAS */}
        <section className="td-estadisticas">

          {estadisticas.map(({ titulo, valor, icono: Icono, color }) => (
            <article className="td-stat-card" key={titulo}>

              <div className={`td-stat-icono ${color}`}>
                <Icono size={23} />
              </div>

              <div>
                <strong>{valor}</strong>
                <span>{titulo}</span>
              </div>

            </article>
          ))}

        </section>

        {/* MIS NEGOCIOS */}
        <section className="td-seccion-negocios" id="negocios">

          <div className="td-seccion-encabezado">

            <div>
              <div className="td-titulo-seccion">
                <Store size={24} />
                <h2>Mis negocios</h2>
              </div>

              <p>
                Administra los establecimientos que tienes registrados.
              </p>
            </div>

          </div>

          {loadingNegocios ? (

            <p className="td-mensaje">
              Cargando tus negocios...
            </p>

          ) : errorNegocios ? (

            <p className="td-mensaje td-mensaje-error">
              {errorNegocios}
            </p>

          ) : negocios.length === 0 ? (

            <div className="td-negocios-vacio">

              <div className="td-negocios-ilustracion">
                <BriefcaseBusiness size={32} />
              </div>

              <h3>Aún no tienes negocios registrados</h3>

              <p>
                Registra tu primer negocio para comenzar a administrar
                tu presencia en ConectaLocal.
              </p>

              <button
                type="button"
                className="td-boton"
                onClick={irARegistro}
              >
                <PlusCircle size={18} />
                Agregar negocio
              </button>

            </div>

          ) : (

            <div className="td-negocios-grid">

              {negocios.map((negocio) => {

                const IconoCategoria = obtenerIconoCategoria(
                  negocio.categoria?.icono
                );

                return (
                  <article
                    className="td-negocio-card"
                    key={negocio.id}
                  >

                    <div className="td-negocio-imagen">

                        {negocio.foto_principal_url ? (

                            <img
                            src={negocio.foto_principal_url}
                            alt={negocio.nombre}
                            />

                        ) : (

                            <div className="td-negocio-sin-imagen">
                            <Store size={38} />
                            </div>

                        )}

                        <span className="td-negocio-etiqueta">
                            Registrado
                        </span>

                        <label
                            htmlFor={`foto-negocio-${negocio.id}`}
                            className={`td-cambiar-foto ${
                            subiendoFotoId === negocio.id ? "subiendo" : ""
                            }`}
                        >
                            <Camera size={17} />

                            {subiendoFotoId === negocio.id
                            ? "Subiendo..."
                            : "Cambiar fotografía"}
                        </label>

                        <input
                            id={`foto-negocio-${negocio.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            disabled={subiendoFotoId !== null}
                            onChange={(e) => {
                            manejarCambioFotografia(
                                negocio.id,
                                e.target.files?.[0]
                            );

                            e.target.value = "";
                            }}
                        />

                        </div>

                    <div className="td-negocio-contenido">

                      <h3>{negocio.nombre}</h3>

                      {negocio.categoria && (

                        <span className="td-negocio-categoria">

                          <IconoCategoria size={14} />

                          {negocio.categoria.nombre}

                        </span>

                      )}

                      <p className="td-negocio-descripcion">
                        {negocio.descripcion ||
                          "Sin descripción disponible."}
                      </p>

                      <div className="td-negocio-dato">
                        <MapPin size={16} />

                        <span>
                          {negocio.direccion ||
                            "Dirección no especificada"}
                        </span>
                      </div>

                      <div className="td-negocio-dato">
                        <Store size={16} />

                        <span>
                          {negocio.telefono ||
                            "Sin teléfono registrado"}
                        </span>
                      </div>

                      <div className="td-negocio-acciones">

                        <button
                          type="button"
                          className="td-negocio-editar"
                          onClick={() =>
                            navigate(
                              `/trabajador/negocios/${negocio.id}/editar`
                            )
                          }
                        >
                          <Pencil size={16} />
                          Editar
                        </button>

                        <button
                          type="button"
                          className="td-negocio-administrar"
                          onClick={() =>
                            navigate(
                              `/trabajador/negocios/${negocio.id}`
                            )
                          }
                        >
                          Administrar imagenes
                          <ArrowRight size={16} />
                        </button>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>

        {/* SEGUIMIENTO DE SOLICITUDES */}
        <section
          className="td-seccion-solicitudes"
          id="solicitudes"
        >

          <div className="td-seccion-encabezado">

            <div>
              <div className="td-titulo-seccion">
                <ClipboardList size={24} />
                <h2>Seguimiento de solicitudes</h2>
              </div>

              <p>
                Estado reciente de las solicitudes que has realizado.
              </p>
            </div>

            <button
              type="button"
              className="td-ver-todos"
            >
              Ver historial completo
              <ArrowRight size={18} />
            </button>

          </div>

          {loading ? (

            <p className="td-mensaje">
              Cargando solicitudes...
            </p>

          ) : error ? (

            <p className="td-mensaje td-mensaje-error" role="alert">
              {error}
            </p>

          ) : solicitudes.length === 0 ? (

            <div className="td-solicitudes-vacio">
              <ClipboardList size={32} />

              <h3>Aún no tienes solicitudes</h3>

              <p>
                Cuando registres un negocio, podrás consultar
                aquí el seguimiento de tu solicitud.
              </p>
            </div>

          ) : (

            <div className="td-tabla-contenedor">

              <table className="td-tabla">

                <thead>
                  <tr>
                    <th>Negocio</th>
                    <th>Tipo de solicitud</th>
                    <th>Fecha de envío</th>
                    <th>Estado</th>
                    <th>Última actualización</th>
                  </tr>
                </thead>

                <tbody>

                  {solicitudes.slice(0, 5).map((s) => (

                    <tr key={s.id}>

                      <td className="td-negocio-celda">
                        <Store size={20} />

                        <strong>
                          {s.nombre_comercial ||
                            "Solicitud de registro"}
                        </strong>
                      </td>

                      <td>Registro de negocio</td>

                      <td>
                        {formatearFecha(
                          s.enviada_en || s.creado_en
                        )}
                      </td>

                      <td>
                        <span className={`td-estado ${s.estado}`}>
                          {ESTADOS[s.estado] || s.estado}
                        </span>
                      </td>

                      <td>
                        {formatearFecha(s.actualizado_en)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* PIE DE PÁGINA */}
        <footer className="td-pie">
          <span>ConectaLocal © 2026</span>
          <span>Conecta con lo mejor de tu comunidad.</span>
        </footer>

      </main>

    </div>
  );
};

export default TrabajadorDashboard;
