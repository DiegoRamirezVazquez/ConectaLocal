import {useEffect, useMemo, useState, useRef } from "react";
import {MapContainer, TileLayer, Marker, useMapEvents} from "react-leaflet";
import { useAuth } from "../../context/AuthContext";
import { obtenerNegociosPublicos } from "../../services/negociosService";
import { conectarEventosForo } from "../../services/tiempoRealService";
import {
  obtenerPublicaciones,
  crearPublicacion,
  actualizarPublicacion,
  eliminarPublicacion,
  agregarFotosPublicacion,
  agregarComentario,
  actualizarComentario,
  eliminarComentario,
  alternarReaccion,
  reportarPublicacion
} from "../../services/publicacionesService";
import "leaflet/dist/leaflet.css";
import "./InicioUsuario.css";
import "./foro-estilos.css";
import L from "leaflet";

// Icono personalizado para los negocios.
const iconoNegocio = L.divIcon({
  className: "inicio-marcador-negocio",
  html: '<div class="marcador-pin"><span>●</span></div>',
  iconSize: [34, 42],
  iconAnchor: [17, 42]
});

// Cerrar la ficha al pulsar sobre el mapa.
const EventosMapa = ({ alPulsarMapa }) => {
  useMapEvents({
    click: () => alPulsarMapa()
  });

  return null;
};

// Formatear la fecha de publicación.
const formatearFecha = (fecha) => {
  if (!fecha) return "";

  const fechaPublicacion = new Date(fecha);

  if (Number.isNaN(fechaPublicacion.getTime())) {
    return "";
  }

  return fechaPublicacion.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// Obtener el nombre del tipo de publicación.
const obtenerNombreTipo = (tipo) => {
  const tipos = {
    pregunta: "Pregunta",
    experiencia: "Experiencia",
    recomendacion: "Recomendación"
  };

  return tipos[tipo] || "Publicación";
};

const InicioUsuario = () => {
  const { user } = useAuth();

  const inicialUsuario =
    user?.nombre?.trim()?.charAt(0).toUpperCase() || "?";

  const [negocios, setNegocios] = useState([]);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);

  const [publicaciones, setPublicaciones] = useState([]);
  const [reaccionesEnProceso, setReaccionesEnProceso] = useState(new Set());
  const [errorReaccion, setErrorReaccion] = useState(null);
  const [reaccionesAbiertas, setReaccionesAbiertas] = useState(new Set());
  const [comentariosAbiertos, setComentariosAbiertos] = useState(new Set());
  const [comentariosBorrador, setComentariosBorrador] = useState({});
  const [comentariosEnProceso, setComentariosEnProceso] = useState(new Set());
  const [comentarioEditando, setComentarioEditando] = useState(null);
  const [textoComentarioEditado, setTextoComentarioEditado] = useState("");
  const [menuPublicacionAbierto, setMenuPublicacionAbierto] = useState(null);
  const [publicacionEditando, setPublicacionEditando] = useState(null);
  const [tituloEditado, setTituloEditado] = useState("");
  const [contenidoEditado, setContenidoEditado] = useState("");
  const [reporteAbierto, setReporteAbierto] = useState(null);
  const [motivoReporte, setMotivoReporte] = useState("contenido_inapropiado");
  const [descripcionReporte, setDescripcionReporte] = useState("");
  const [accionEnProceso, setAccionEnProceso] = useState(false);
  const [mensajeAccion, setMensajeAccion] = useState("");

  const [cargando, setCargando] = useState(true);
  const [cargandoForo, setCargandoForo] = useState(true);

  const [error, setError] = useState("");
  const [errorForo, setErrorForo] = useState("");
  const [errorCargaForo, setErrorCargaForo] = useState("");

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [tipo, setTipo] = useState("pregunta");

  const [publicando, setPublicando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [fotografiasSeleccionadas, setFotografiasSeleccionadas] = useState([]);

  const formularioRef = useRef(null);

  // Retirar los avisos de la interfaz después de un tiempo real.
  // Al limpiar el estado, React desmonta el elemento y también libera su espacio.
  useEffect(() => {
    if (!errorForo) return undefined;

    const temporizador = setTimeout(() => {
      setErrorForo("");
    }, 5000);

    return () => clearTimeout(temporizador);
  }, [errorForo]);

  useEffect(() => {
    if (!mensajeAccion) return undefined;

    const temporizador = setTimeout(() => {
      setMensajeAccion("");
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [mensajeAccion]);

  useEffect(() => {
    if (!mensajeExito) return undefined;

    const temporizador = setTimeout(() => {
      setMensajeExito("");
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [mensajeExito]);

  useEffect(() => {
    if (!errorReaccion) return undefined;

    const temporizador = setTimeout(() => {
      setErrorReaccion(null);
    }, 5000);

    return () => clearTimeout(temporizador);
  }, [errorReaccion]);


  // Cerrar el formulario al hacer clic fuera, sin borrar el borrador.
  useEffect(() => {
    if (!formularioAbierto) return;

    const manejarClickFuera = (evento) => {
      if (
        formularioRef.current &&
        !formularioRef.current.contains(evento.target)
      ) {
        setFormularioAbierto(false);
      }
    };

    document.addEventListener("mousedown", manejarClickFuera);
    document.addEventListener("touchstart", manejarClickFuera);

    return () => {
      document.removeEventListener("mousedown", manejarClickFuera);
      document.removeEventListener("touchstart", manejarClickFuera);
    };
  }, [formularioAbierto]);

  // Consultar negocios registrados.
  useEffect(() => {
    const cargarNegocios = async () => {
      try {
        setCargando(true);
        setError("");

        const resultado = await obtenerNegociosPublicos();

        setNegocios(resultado);
      } catch (err) {
        console.error("Error al cargar negocios:", err);
        setError(err.message || "No fue posible cargar los negocios.");
      } finally {
        setCargando(false);
      }
    };

    cargarNegocios();
  }, []);

  // Consultar publicaciones del foro.
  useEffect(() => {
    const cargarPublicaciones = async () => {
      try {
        setCargandoForo(true);
        setErrorForo("");
        setErrorCargaForo("");

        const resultado = await obtenerPublicaciones();

        setPublicaciones(resultado);
      } catch (err) {
        console.error("Error al cargar publicaciones:", err);

        setErrorCargaForo(
          err.message || "No fue posible cargar las publicaciones."
        );
      } finally {
        setCargandoForo(false);
      }
    };

    cargarPublicaciones();
  }, []);

  // Escuchar cambios del foro realizados por cualquier cuenta.
  // Los eventos solo notifican; la información actualizada se obtiene
  // mediante la API autenticada para conservar las validaciones del backend.
  useEffect(() => {
    let temporizadorActualizacion = null;
    let desmontado = false;

    const actualizarForo = async () => {
      try {
        const resultado = await obtenerPublicaciones();

        if (!desmontado) {
          setPublicaciones(resultado);
        }
      } catch (err) {
        console.error("Error al sincronizar el foro en tiempo real:", err);

        if (!desmontado) {
          setErrorForo(
            err.message || "No fue posible sincronizar las publicaciones."
          );
        }
      }
    };

    const desconectar = conectarEventosForo(() => {
      // Agrupar eventos cercanos (por ejemplo, publicación y fotografías)
      // para evitar varias consultas consecutivas.
      if (temporizadorActualizacion) {
        clearTimeout(temporizadorActualizacion);
      }

      temporizadorActualizacion = setTimeout(() => {
        actualizarForo();
      }, 350);
    });

    return () => {
      desmontado = true;

      if (temporizadorActualizacion) {
        clearTimeout(temporizadorActualizacion);
      }

      desconectar();
    };
  }, []);


    const manejarSeleccionFotografias = (e) => {
    const archivos = Array.from(e.target.files || []);

    setErrorForo("");

    if (archivos.length > 4) {
      setErrorForo("Solo puedes seleccionar hasta 4 fotografías.");
      e.target.value = "";
      return;
    }

    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    for (const archivo of archivos) {
      if (!formatosPermitidos.includes(archivo.type)) {
        setErrorForo("Solo se permiten imágenes JPG, PNG y WEBP.");
        e.target.value = "";
        return;
      }

      if (archivo.size > 5 * 1024 * 1024) {
        setErrorForo("Cada fotografía debe pesar máximo 5 MB.");
        e.target.value = "";
        return;
      }
    }

    setFotografiasSeleccionadas(archivos);
  };

  const quitarFotografia = (indice) => {
    setFotografiasSeleccionadas((anteriores) =>
      anteriores.filter((_, i) => i !== indice)
    );
  };

  // Dar o quitar Me gusta y actualizar la lista en pantalla sin recargar.
  const manejarReaccion = async (publicacionId) => {
    if (reaccionesEnProceso.has(publicacionId)) return;

    const publicacionActual = publicaciones.find(
      (publicacion) => publicacion.id === publicacionId
    );

    if (!publicacionActual) return;

    const reaccionAnterior = Boolean(publicacionActual.reacciono);
    const reaccionNueva = !reaccionAnterior;
    const reaccionesAnteriores = publicacionActual.reacciones || [];

    const perfilActual = {
      id: user?.id,
      nombre: user?.nombre || "Tú",
      avatar_url: user?.avatar_url || null
    };

    // Actualización optimista: la interfaz cambia inmediatamente.
    setPublicaciones((anteriores) =>
      anteriores.map((publicacion) => {
        if (publicacion.id !== publicacionId) return publicacion;

        let nuevasReacciones = [...(publicacion.reacciones || [])];

        if (reaccionNueva) {
          const yaExiste = nuevasReacciones.some((reaccion) => {
            const perfil = reaccion.perfil || reaccion.autor || {};
            return (
              reaccion.autor_id === user?.id ||
              perfil.id === user?.id
            );
          });

          if (!yaExiste) {
            nuevasReacciones.push({
              autor_id: user?.id,
              perfil: perfilActual
            });
          }
        } else {
          nuevasReacciones = nuevasReacciones.filter((reaccion) => {
            const perfil = reaccion.perfil || reaccion.autor || {};
            return !(
              reaccion.autor_id === user?.id ||
              perfil.id === user?.id
            );
          });
        }

        return {
          ...publicacion,
          reacciono: reaccionNueva,
          total_reacciones: Math.max(
            0,
            (publicacion.total_reacciones || 0) + (reaccionNueva ? 1 : -1)
          ),
          reacciones: nuevasReacciones
        };
      })
    );

    setReaccionesEnProceso((anteriores) => {
      const nuevas = new Set(anteriores);
      nuevas.add(publicacionId);
      return nuevas;
    });
    setErrorReaccion(null);

    try {
      const resultado = await alternarReaccion(publicacionId);

      // Sincronizar con el resultado confirmado por el servidor.
      if (typeof resultado?.reacciono === "boolean" &&
          resultado.reacciono !== reaccionNueva) {
        setPublicaciones((anteriores) =>
          anteriores.map((publicacion) => {
            if (publicacion.id !== publicacionId) return publicacion;

            let nuevasReacciones = [...(publicacion.reacciones || [])];

            if (resultado.reacciono) {
              const existe = nuevasReacciones.some((reaccion) => {
                const perfil = reaccion.perfil || reaccion.autor || {};
                return reaccion.autor_id === user?.id || perfil.id === user?.id;
              });

              if (!existe) {
                nuevasReacciones.push({
                  autor_id: user?.id,
                  perfil: perfilActual
                });
              }
            } else {
              nuevasReacciones = nuevasReacciones.filter((reaccion) => {
                const perfil = reaccion.perfil || reaccion.autor || {};
                return !(reaccion.autor_id === user?.id || perfil.id === user?.id);
              });
            }

            return {
              ...publicacion,
              reacciono: resultado.reacciono,
              total_reacciones: Math.max(
                0,
                (publicacion.total_reacciones || 0) +
                  (resultado.reacciono ? 1 : -1)
              ),
              reacciones: nuevasReacciones
            };
          })
        );
      }
    } catch (error) {
      console.error("Error al reaccionar:", error);

      // Si falla el servidor, restaurar el estado anterior.
      setPublicaciones((anteriores) =>
        anteriores.map((publicacion) =>
          publicacion.id === publicacionId
            ? {
                ...publicacion,
                reacciono: reaccionAnterior,
                total_reacciones: publicacionActual.total_reacciones || 0,
                reacciones: reaccionesAnteriores
              }
            : publicacion
        )
      );

      setErrorReaccion({
        publicacionId,
        mensaje: error.message || "No se pudo registrar tu reacción."
      });
    } finally {
      setReaccionesEnProceso((anteriores) => {
        const nuevas = new Set(anteriores);
        nuevas.delete(publicacionId);
        return nuevas;
      });
    }
  };


  const alternarPanel = (setPanel, id) => {
    setPanel((anteriores) => {
      const nuevas = new Set(anteriores);
      nuevas.has(id) ? nuevas.delete(id) : nuevas.add(id);
      return nuevas;
    });
  };

  const manejarComentario = async (e, publicacionId) => {
    e.preventDefault();
    const texto = (comentariosBorrador[publicacionId] || "").trim();
    if (!texto || comentariosEnProceso.has(publicacionId)) return;

    setComentariosEnProceso((anteriores) => new Set(anteriores).add(publicacionId));
    setErrorForo("");
    try {
      const comentario = await agregarComentario(publicacionId, texto);
      setPublicaciones((anteriores) => anteriores.map((publicacion) =>
        publicacion.id === publicacionId
          ? {
              ...publicacion,
              comentarios: [...(publicacion.comentarios || []), comentario],
              total_comentarios: (publicacion.total_comentarios || 0) + 1
            }
          : publicacion
      ));
      setComentariosBorrador((anteriores) => ({ ...anteriores, [publicacionId]: "" }));
      setComentariosAbiertos((anteriores) => new Set(anteriores).add(publicacionId));
    } catch (err) {
      setErrorForo(err.message || "No fue posible agregar el comentario.");
    } finally {
      setComentariosEnProceso((anteriores) => {
        const nuevas = new Set(anteriores);
        nuevas.delete(publicacionId);
        return nuevas;
      });
    }
  };

  const guardarEdicionComentario = async (comentarioId, publicacionId) => {
    const texto = textoComentarioEditado.trim();
    if (!texto) return;
    setAccionEnProceso(true);
    try {
      const actualizado = await actualizarComentario(comentarioId, texto);
      setPublicaciones((anteriores) => anteriores.map((publicacion) =>
        publicacion.id === publicacionId
          ? { ...publicacion, comentarios: (publicacion.comentarios || []).map((comentario) =>
              comentario.id === comentarioId ? { ...comentario, ...actualizado, contenido: texto } : comentario
            ) }
          : publicacion
      ));
      setComentarioEditando(null);
      setTextoComentarioEditado("");
    } catch (err) {
      setErrorForo(err.message || "No fue posible editar el comentario.");
    } finally {
      setAccionEnProceso(false);
    }
  };

  const manejarEliminarComentario = async (comentarioId, publicacionId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este comentario?")) return;
    setAccionEnProceso(true);
    try {
      await eliminarComentario(comentarioId);
      setPublicaciones((anteriores) => anteriores.map((publicacion) =>
        publicacion.id === publicacionId
          ? {
              ...publicacion,
              comentarios: (publicacion.comentarios || []).filter((comentario) => comentario.id !== comentarioId),
              total_comentarios: Math.max(0, (publicacion.total_comentarios || 0) - 1)
            }
          : publicacion
      ));
    } catch (err) {
      setErrorForo(err.message || "No fue posible eliminar el comentario.");
    } finally {
      setAccionEnProceso(false);
    }
  };

  const iniciarEdicionPublicacion = (publicacion) => {
    setPublicacionEditando(publicacion.id);
    setTituloEditado(publicacion.titulo || "");
    setContenidoEditado(publicacion.contenido || "");
    setMenuPublicacionAbierto(null);
  };

  const guardarEdicionPublicacion = async (e, publicacionId) => {
    e.preventDefault();
    if (!tituloEditado.trim() || !contenidoEditado.trim()) return;
    setAccionEnProceso(true);
    try {
      const resultado = await actualizarPublicacion(publicacionId, {
        titulo: tituloEditado.trim(),
        contenido: contenidoEditado.trim()
      });
      const cambios = resultado?.publicacion || resultado || {};
      setPublicaciones((anteriores) => anteriores.map((publicacion) =>
        publicacion.id === publicacionId
          ? { ...publicacion, ...cambios, titulo: tituloEditado.trim(), contenido: contenidoEditado.trim() }
          : publicacion
      ));
      setPublicacionEditando(null);
      setMensajeAccion("La publicación se actualizó correctamente.");
    } catch (err) {
      setErrorForo(err.message || "No fue posible actualizar la publicación.");
    } finally {
      setAccionEnProceso(false);
    }
  };

  const manejarEliminarPublicacion = async (publicacionId) => {
    setMenuPublicacionAbierto(null);
    if (!window.confirm("¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.")) return;
    setAccionEnProceso(true);
    try {
      await eliminarPublicacion(publicacionId);
      setPublicaciones((anteriores) => anteriores.filter((publicacion) => publicacion.id !== publicacionId));
      setMensajeAccion("La publicación se eliminó correctamente.");
    } catch (err) {
      setErrorForo(err.message || "No fue posible eliminar la publicación.");
    } finally {
      setAccionEnProceso(false);
    }
  };

  const enviarReporte = async (e) => {
    e.preventDefault();
    if (!reporteAbierto) return;
    setAccionEnProceso(true);
    try {
      await reportarPublicacion(reporteAbierto, motivoReporte, descripcionReporte.trim());
      setReporteAbierto(null);
      setMotivoReporte("contenido_inapropiado");
      setDescripcionReporte("");
      setMensajeAccion("Gracias. Tu reporte se envió para revisión.");
    } catch (err) {
      setErrorForo(err.message || "No fue posible enviar el reporte.");
    } finally {
      setAccionEnProceso(false);
    }
  };

  // Crear una publicación.
  const manejarPublicacion = async (e) => {
    e.preventDefault();

    setMensajeExito("");
    setErrorForo("");

    if (!titulo.trim()) {
      setErrorForo("Escribe un título para tu publicación.");
      return;
    }

    if (!contenido.trim()) {
      setErrorForo("Escribe el contenido de tu publicación.");
      return;
    }

    try {
      setPublicando(true);

      // Primero se crea la publicación.
      const nuevaPublicacion = await crearPublicacion({
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        tipo
      });

      let fotografiasSubidas = [];
      let errorFotografias = false;

      // Después se cargan las fotografías, si existen.
      if (fotografiasSeleccionadas.length > 0) {
        try {
          fotografiasSubidas = await agregarFotosPublicacion(
            nuevaPublicacion.id,
            fotografiasSeleccionadas
          );
        } catch (error) {
          console.error("Error al subir fotografías:", error);
          errorFotografias = true;
        }
      }

      // Se incorpora la publicación al muro.
      setPublicaciones((anteriores) => [
        {
          ...nuevaPublicacion,
          autor: {
            id: user?.id,
            nombre: user?.nombre || "Tú",
            avatar_url: user?.avatar_url || null
          },
          es_propio: true,
          fotos: fotografiasSubidas,
          comentarios: [],
          reacciones: [],
          total_comentarios: 0,
          total_reacciones: 0,
          reacciono: false
        },
        ...anteriores
      ]);

      setTitulo("");
      setContenido("");
      setTipo("pregunta");
      setFotografiasSeleccionadas([]);
      setFormularioAbierto(false);

      setMensajeExito(
        errorFotografias
          ? "Tu publicación se creó, pero no fue posible subir las fotografías."
          : "¡Tu publicación se compartió correctamente!"
      );

    } catch (err) {
      console.error("Error al crear publicación:", err);

      setErrorForo(
        err.message || "No fue posible crear la publicación."
      );
    } finally {
      setPublicando(false);
    }
  };
  

// Solo mostrar negocios que tengan coordenadas válidas.
  const negociosConUbicacion = useMemo(() => {
    return negocios.filter((negocio) => {
      const lat = Number(negocio.lat);
      const lng = Number(negocio.lng);

      return (
        negocio.lat !== null &&
        negocio.lng !== null &&
        negocio.lat !== "" &&
        negocio.lng !== "" &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });
  }, [negocios]);

  // Centrar el mapa en los negocios registrados.
  const centroMapa = useMemo(() => {
    if (negociosConUbicacion.length === 0) {
      return [20.5235, -100.8157];
    }

    const sumaLatitudes = negociosConUbicacion.reduce(
      (suma, negocio) => suma + Number(negocio.lat),
      0
    );

    const sumaLongitudes = negociosConUbicacion.reduce(
      (suma, negocio) => suma + Number(negocio.lng),
      0
    );

    return [
      sumaLatitudes / negociosConUbicacion.length,
      sumaLongitudes / negociosConUbicacion.length
    ];
  }, [negociosConUbicacion]);

  return (
    <div className="inicio-usuario">

      {/* ENCABEZADO */}
      <header className="inicio-encabezado">
        <div>
          <h1>¡Bienvenido a ConectaLocal!</h1>
          <p>
            Descubre, comparte y conecta con los negocios de tu comunidad.
          </p>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="inicio-paneles">

        {/* FORO O FICHA DEL NEGOCIO */}
        <section className="inicio-panel-foro">

          {negocioSeleccionado ? (
            <article
              className="inicio-ficha-negocio"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="inicio-cerrar-ficha"
                onClick={() => setNegocioSeleccionado(null)}
                aria-label="Cerrar ficha del negocio"
              >
                ×
              </button>

              {negocioSeleccionado.foto_principal_url ? (
                <img
                  className="inicio-foto-negocio"
                  src={negocioSeleccionado.foto_principal_url}
                  alt={negocioSeleccionado.nombre}
                />
              ) : (
                <div className="inicio-sin-foto">
                  Sin fotografía disponible
                </div>
              )}

              <div className="inicio-datos-negocio">
                <span className="inicio-categoria">
                  {negocioSeleccionado.categoria?.nombre || "Sin categoría"}
                </span>

                <h2>{negocioSeleccionado.nombre}</h2>

                <p>{negocioSeleccionado.descripcion}</p>

                {negocioSeleccionado.direccion && (
                  <p>
                    <strong>Dirección:</strong>{" "}
                    {negocioSeleccionado.direccion}
                  </p>
                )}

                {negocioSeleccionado.telefono && (
                  <p>
                    <strong>Teléfono:</strong>{" "}
                    {negocioSeleccionado.telefono}
                  </p>
                )}

                {negocioSeleccionado.whatsapp && (
                  <p>
                    <strong>WhatsApp:</strong>{" "}
                    {negocioSeleccionado.whatsapp}
                  </p>
                )}

                {negocioSeleccionado.email && (
                  <p>
                    <strong>Correo:</strong>{" "}
                    {negocioSeleccionado.email}
                  </p>
                )}

                {negocioSeleccionado.sitio_web && (
                  <p>
                    <strong>Sitio web:</strong>{" "}
                    <a
                      href={negocioSeleccionado.sitio_web}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visitar sitio
                    </a>
                  </p>
                )}

                {negocioSeleccionado.horario && (
                  <p>
                    <strong>Horario:</strong>{" "}
                    {negocioSeleccionado.horario}
                  </p>
                )}

                <p className="inicio-coordenadas">
                  <strong>Ubicación:</strong>{" "}
                  {negocioSeleccionado.lat}, {negocioSeleccionado.lng}
                </p>
              </div>
            </article>
          ) : (
            <div className="inicio-foro foro-muro">

              {/* ENCABEZADO DEL FORO */}
              <div className="inicio-foro-encabezado">
                <h2>Comunidad</h2>
                <p>Comparte ideas, experiencias y recomendaciones.</p>
              </div>

             
              {/* FORMULARIO COMPACTO Y DESPLEGABLE */}

              {!formularioAbierto ? (
                <button
                  type="button"
                  className="foro-compositor-compacto"
                  onClick={() => setFormularioAbierto(true)}
                >
                  <div className="foro-avatar">
                    {inicialUsuario}
                  </div>

                  <span>¿Qué te gustaría compartir?</span>

                  <span className="foro-compositor-icono">
                    <span>＋</span>
                  </span>
                </button>
              ) : (
                <form
                  ref={formularioRef}
                  className="foro-formulario"
                  onSubmit={manejarPublicacion}
                >
                  <div className="foro-formulario-superior">
                    <div className="foro-avatar">
                      {inicialUsuario}
                    </div>

                    <div className="foro-identidad">
                      <strong>Crear publicación</strong>
                      <span>Comparte con tu comunidad.</span>
                    </div>
                  </div>

                  <input
                    type="text"
                    className="foro-campo-titulo"
                    placeholder="Escribe el título de tu publicación..."
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={200}
                    required
                  />

                  <textarea
                    className="foro-campo-contenido"
                    placeholder="¿Qué te gustaría compartir con la comunidad?"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    required
                  />

                  {/* SELECCIÓN DE FOTOGRAFÍAS */}
                  <div className="foro-fotografias">

                    <label
                      htmlFor="foro-fotografias-input"
                      className="foro-boton-fotografias"
                    >
                      📷 Agregar fotografías
                    </label>

                    <input
                      id="foro-fotografias-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      onChange={manejarSeleccionFotografias}
                    />

                    <span>
                      {fotografiasSeleccionadas.length}/4 fotografías
                    </span>

                    {fotografiasSeleccionadas.length > 0 && (
                      <div className="foro-vista-previa">
                        {fotografiasSeleccionadas.map((archivo, indice) => (
                          <div className="foro-fotografia-seleccionada" key={`${archivo.name}-${indice}`}>

                            <img
                              src={URL.createObjectURL(archivo)}
                              alt={`Vista previa ${indice + 1}`}
                            />

                            <button
                              type="button"
                              onClick={() => quitarFotografia(indice)}
                              aria-label="Quitar fotografía"
                            >
                              ×
                            </button>

                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  <div className="foro-formulario-opciones">
                    <select
                      className="foro-selector-tipo"
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      aria-label="Tipo de publicación"
                    >
                      <option value="pregunta">Hacer una pregunta</option>
                      <option value="experiencia">Compartir experiencia</option>
                      <option value="recomendacion">Dar una recomendación</option>
                    </select>

                    <button
                      type="submit"
                      className="foro-boton-publicar"
                      disabled={publicando}
                    >
                      {publicando ? "Publicando..." : "Publicar"}
                    </button>
                  </div>

                  {errorForo && (
                    <div className="foro-error" role="alert">
                      {errorForo}
                    </div>
                  )}

                  {mensajeExito && (
                    <div className="foro-exito" role="status">
                      {mensajeExito}
                    </div>
                  )}
                </form>
              )}


              {mensajeAccion && <div className="foro-exito" role="status">{mensajeAccion}</div>}
              {errorForo && publicaciones.length > 0 && <div className="foro-error" role="alert">{errorForo}</div>}

              {/* MURO DE PUBLICACIONES */}
              <div className="foro-contenido">

                <div className="foro-lista-encabezado">
                  <h3>Publicaciones recientes</h3>
                  <span>{publicaciones.length} publicaciones</span>
                </div>

                {cargandoForo ? (
                  <div className="foro-estado">
                    Cargando publicaciones...
                  </div>
                ) : errorCargaForo && publicaciones.length === 0 ? (
                  <div className="foro-estado">
                    No fue posible cargar el foro. {errorCargaForo}
                  </div>
                ) : publicaciones.length === 0 ? (
                  <div className="inicio-foro-vacio">
                    <h3>¡Comienza la conversación!</h3>

                    <p>
                      Todavía no hay publicaciones. Comparte una pregunta,
                      experiencia o recomendación y sé parte de la comunidad.
                    </p>
                  </div>
                ) : (
                  publicaciones.map((publicacion) => {
                    const autor = publicacion.autor;

                    const nombreAutor = autor?.nombre || "Usuario";

                    const inicial = nombreAutor
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "U";

                    return (
                      <article
                        className="foro-publicacion"
                        key={publicacion.id}
                      >
                        {/* AUTOR */}
                        <div className="foro-publicacion-autor">

                          {autor?.avatar_url ? (
                            <img
                              className="foro-avatar"
                              src={autor.avatar_url}
                              alt={`Avatar de ${nombreAutor}`}
                            />
                          ) : (
                            <div className="foro-avatar">
                              {inicial}
                            </div>
                          )}

                          <div className="foro-publicacion-autor-info">
                            <strong>{nombreAutor}</strong>

                            <span>
                              {formatearFecha(publicacion.creado_en)}
                            </span>
                          </div>
                        </div>

                        {/* TIPO */}
                        <span
                          className={`foro-etiqueta-tipo ${publicacion.tipo}`}
                        >
                          {obtenerNombreTipo(publicacion.tipo)}
                        </span>

                        {/* CONTENIDO */}
                        <h3>{publicacion.titulo}</h3>

                        <p className="foro-publicacion-texto">
                          {publicacion.contenido}
                        </p>

                        {/* FOTOGRAFÍAS DE LA PUBLICACIÓN */}
                        {publicacion.fotos?.length > 0 && (
                          <div className="foro-galeria-fotografias">
                            {publicacion.fotos.map((foto) => (
                              <img
                                key={foto.id}
                                src={foto.url}
                                alt="Fotografía de la publicación"
                                className="foro-fotografia-publicada"
                                loading="lazy"
                                onClick={() => window.open(foto.url, "_blank")}
                              />
                            ))}
                          </div>
                        )}

                        {/* ACCIONES DE LA PUBLICACIÓN */}
                        <div className="foro-publicacion-acciones">
                          <button
                            type="button"
                            className={`foro-accion ${publicacion.reacciono ? "activa" : ""}`}
                            onClick={() => manejarReaccion(publicacion.id)}
                            disabled={reaccionesEnProceso.has(publicacion.id)}
                            aria-pressed={Boolean(publicacion.reacciono)}
                          >
                            <span>{publicacion.reacciono ? "♥" : "♡"}</span>
                            {publicacion.total_reacciones || 0} Me gusta
                          </button>

                          {((publicacion.total_reacciones || 0) > 0 ||
                            reaccionesAbiertas.has(publicacion.id)) && (
                            <button
                              type="button"
                              className="foro-accion"
                              onClick={() => alternarPanel(setReaccionesAbiertas, publicacion.id)}
                              aria-expanded={reaccionesAbiertas.has(publicacion.id)}
                            >
                              {reaccionesAbiertas.has(publicacion.id)
                                ? "Ocultar reacciones"
                                : "Ver reacciones"}
                            </button>
                          )}

                          <button
                            type="button"
                            className="foro-accion"
                            onClick={() => alternarPanel(setComentariosAbiertos, publicacion.id)}
                            aria-expanded={comentariosAbiertos.has(publicacion.id)}
                          >
                            ◯ {publicacion.total_comentarios || 0} Comentarios
                          </button>

                          <div className="foro-menu-contenedor">
                            <button
                              type="button"
                              className="foro-accion foro-menu-boton"
                              onClick={() => setMenuPublicacionAbierto(menuPublicacionAbierto === publicacion.id ? null : publicacion.id)}
                              aria-label="Opciones de publicación"
                              aria-expanded={menuPublicacionAbierto === publicacion.id}
                            >⋯</button>
                            {menuPublicacionAbierto === publicacion.id && (
                              <div className="foro-menu-opciones">
                                {publicacion.es_propio ? (
                                  <>
                                    <button type="button" onClick={() => iniciarEdicionPublicacion(publicacion)}>Editar publicación</button>
                                    <button type="button" onClick={() => manejarEliminarPublicacion(publicacion.id)}>Eliminar publicación</button>
                                  </>
                                ) : (
                                  <button type="button" onClick={() => { setReporteAbierto(publicacion.id); setMenuPublicacionAbierto(null); }}>Reportar publicación</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {publicacionEditando === publicacion.id && (
                          <form className="foro-edicion-publicacion" onSubmit={(e) => guardarEdicionPublicacion(e, publicacion.id)}>
                            <input className="foro-campo-titulo" value={tituloEditado} onChange={(e) => setTituloEditado(e.target.value)} maxLength={200} required />
                            <textarea className="foro-campo-contenido" value={contenidoEditado} onChange={(e) => setContenidoEditado(e.target.value)} required />
                            <div className="foro-formulario-opciones">
                              <button type="button" className="foro-accion" onClick={() => setPublicacionEditando(null)}>Cancelar</button>
                              <button type="submit" className="foro-boton-publicar" disabled={accionEnProceso}>{accionEnProceso ? "Guardando..." : "Guardar cambios"}</button>
                            </div>
                          </form>
                        )}

                        {reaccionesAbiertas.has(publicacion.id) && (
                          <div className="foro-lista-reacciones">
                            <strong>Personas que reaccionaron</strong>
                            {publicacion.reacciones?.length ? publicacion.reacciones.map((reaccion, indice) => {
                              const perfil = reaccion.perfil || reaccion.autor || {};
                              const nombre = perfil.nombre || "Usuario";
                              return (
                                <div className="foro-reaccion-persona" key={reaccion.autor_id || perfil.id || indice}>
                                  {perfil.avatar_url ? <img className="foro-avatar" src={perfil.avatar_url} alt={`Avatar de ${nombre}`} /> : <span className="foro-avatar">{nombre.trim().charAt(0).toUpperCase()}</span>}
                                  <span>{nombre}</span>
                                </div>
                              );
                            }) : <p>Aún no hay reacciones.</p>}
                          </div>
                        )}

                        {comentariosAbiertos.has(publicacion.id) && (
                          <div className="foro-comentarios">
                            <div className="foro-comentarios-lista">
                              {publicacion.comentarios?.length ? publicacion.comentarios.map((comentario) => {
                                const autorComentario = comentario.autor || {};
                                const nombreComentario = autorComentario.nombre || "Usuario";
                                return (
                                  <div className="foro-comentario" key={comentario.id}>
                                    {autorComentario.avatar_url ? <img className="foro-avatar" src={autorComentario.avatar_url} alt={`Avatar de ${nombreComentario}`} /> : <span className="foro-avatar">{nombreComentario.trim().charAt(0).toUpperCase()}</span>}
                                    <div className="foro-comentario-cuerpo">
                                      <div className="foro-comentario-cabecera">
                                        <strong>{nombreComentario}</strong>
                                        <span>{formatearFecha(comentario.creado_en)}</span>
                                      </div>
                                      {comentarioEditando === comentario.id ? (
                                        <div className="foro-comentario-edicion">
                                          <textarea value={textoComentarioEditado} onChange={(e) => setTextoComentarioEditado(e.target.value)} />
                                          <button type="button" onClick={() => guardarEdicionComentario(comentario.id, publicacion.id)} disabled={accionEnProceso}>Guardar</button>
                                          <button type="button" onClick={() => setComentarioEditando(null)}>Cancelar</button>
                                        </div>
                                      ) : <p>{comentario.contenido}</p>}
                                      {comentario.es_propio && comentarioEditando !== comentario.id && (
                                        <div className="foro-comentario-acciones">
                                          <button type="button" onClick={() => { setComentarioEditando(comentario.id); setTextoComentarioEditado(comentario.contenido || ""); }}>Editar</button>
                                          <button type="button" onClick={() => manejarEliminarComentario(comentario.id, publicacion.id)}>Eliminar</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }) : <p className="foro-sin-comentarios">Todavía no hay comentarios. ¡Sé la primera persona en comentar!</p>}
                            </div>
                            <form className="foro-formulario-comentario" onSubmit={(e) => manejarComentario(e, publicacion.id)}>
                              <input
                                type="text"
                                value={comentariosBorrador[publicacion.id] || ""}
                                onChange={(e) => setComentariosBorrador((anteriores) => ({ ...anteriores, [publicacion.id]: e.target.value }))}
                                placeholder="Escribe un comentario..."
                                maxLength={1000}
                                required
                              />
                              <button type="submit" disabled={comentariosEnProceso.has(publicacion.id)}>{comentariosEnProceso.has(publicacion.id) ? "Enviando..." : "Comentar"}</button>
                            </form>
                          </div>
                        )}

                        {errorReaccion?.publicacionId === publicacion.id && (
                          <div className="foro-error" role="alert">{errorReaccion.mensaje}</div>
                        )}
                        {reporteAbierto === publicacion.id && (
                          <form className="foro-modal-reporte" onSubmit={enviarReporte}>
                            <h4>Reportar publicación</h4>
                            <label htmlFor={`motivo-reporte-${publicacion.id}`}>Motivo del reporte</label>
                            <select id={`motivo-reporte-${publicacion.id}`} value={motivoReporte} onChange={(e) => setMotivoReporte(e.target.value)}>
                              <option value="contenido_inapropiado">Contenido inapropiado</option>
                              <option value="spam">Spam</option>
                              <option value="informacion_falsa">Información falsa</option>
                              <option value="acoso">Acoso</option>
                              <option value="otro">Otro</option>
                            </select>
                            <label htmlFor={`descripcion-reporte-${publicacion.id}`}>Descripción (opcional)</label>
                            <textarea id={`descripcion-reporte-${publicacion.id}`} value={descripcionReporte} onChange={(e) => setDescripcionReporte(e.target.value)} maxLength={500} placeholder="Cuéntanos brevemente qué sucede..." />
                            <div className="foro-formulario-opciones">
                              <button type="button" className="foro-accion" onClick={() => setReporteAbierto(null)}>Cancelar</button>
                              <button type="submit" className="foro-boton-publicar" disabled={accionEnProceso}>{accionEnProceso ? "Enviando..." : "Enviar reporte"}</button>
                            </div>
                          </form>
                        )}
                      </article>
                    );
                  })
                )}

              </div>
            </div>
          )}

        </section>

        {/* MAPA */}
        <section className="inicio-panel-mapa">
          <div className="inicio-mapa-encabezado">
            <div>
              <h2>Negocios de tu comunidad</h2>
              <p>
                Selecciona un marcador para conocer el negocio.
              </p>
            </div>

            <span className="inicio-total-negocios">
              {negociosConUbicacion.length} negocios
            </span>
          </div>

          {cargando ? (
            <div className="inicio-estado-mapa">
              Cargando negocios...
            </div>
          ) : error ? (
            <div className="inicio-estado-mapa inicio-error">
              {error}
            </div>
          ) : (
            <MapContainer
              center={centroMapa}
              zoom={13}
              className="inicio-mapa"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <EventosMapa
                alPulsarMapa={() => setNegocioSeleccionado(null)}
              />

              {negociosConUbicacion.map((negocio) => (
                <Marker
                  key={negocio.id}
                  position={[
                    Number(negocio.lat),
                    Number(negocio.lng)
                  ]}
                  icon={iconoNegocio}
                  eventHandlers={{
                    click: (evento) => {
                      evento.originalEvent?.stopPropagation();
                      setNegocioSeleccionado(negocio);
                    }
                  }}
                />
              ))}
            </MapContainer>
          )}

          {!cargando && !error && negociosConUbicacion.length === 0 && (
            <p className="inicio-sin-negocios">
              Todavía no hay negocios con ubicación registrada.
            </p>
          )}
        </section>

      </div>
    </div>
  );
};

export default InicioUsuario;
