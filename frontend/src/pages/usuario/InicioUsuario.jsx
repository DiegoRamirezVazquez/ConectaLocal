import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {MapContainer, TileLayer, Marker, useMapEvents, useMap, CircleMarker, Circle} from "react-leaflet";
import { useAuth } from "../../context/AuthContext";
import {
  obtenerNegociosPublicos,
  obtenerNegocioPublico,
  obtenerFotosNegocioPublicas,
  obtenerResenasDestacadas,
  obtenerResenaPropia,
  publicarResena,
  actualizarResena,
  eliminarResena
} from "../../services/negociosService";
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


// Crear marcador personalizado con la fotografía del negocio.
// Escapar texto para utilizarlo de forma segura en el HTML del marcador.
const escaparHTML = (valor = "") => {
  return String(valor).replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
};

// Crear marcador con fotografía y categoría del negocio.
const crearIconoNegocio = (urlImagen, categoria, seleccionado = false) => {
  const imagen = urlImagen
    ? `<img
         src="${escaparHTML(urlImagen)}"
         class="marcador-foto-negocio"
         alt=""
       />`
    : `<div class="marcador-sin-foto">🏪</div>`;

  const nombreCategoria = escaparHTML(categoria || "NEGOCIO");

  return L.divIcon({
    className: `inicio-marcador-negocio ${seleccionado ? "marcador-seleccionado" : ""}`,
    html: `
      <div class="marcador-contenedor">
        <div class="marcador-pin-foto">
          ${imagen}
        </div>

        <div class="marcador-etiqueta" title="${nombreCategoria}">
          ${nombreCategoria}
        </div>
      </div>
    `,
    iconSize: [210, 60],
    iconAnchor: [25, 55]
  });
};

// Calcular la distancia entre dos coordenadas en metros.
const calcularDistancia = (lat1, lng1, lat2, lng2) => {
  const radioTierra = 6371000;

  const radianes = (grados) => grados * (Math.PI / 180);

  const diferenciaLatitud = radianes(lat2 - lat1);
  const diferenciaLongitud = radianes(lng2 - lng1);

  const a =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(radianes(lat1)) *
    Math.cos(radianes(lat2)) *
    Math.sin(diferenciaLongitud / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radioTierra * c;
};

// Cerrar la ficha al pulsar sobre el mapa.
const EventosMapa = ({ alPulsarMapa }) => {
  useMapEvents({
    click: () => alPulsarMapa()
  });

  return null;
};

// Mover el mapa a la ubicación actual del dispositivo.
const CentrarMapaUsuario = ({ ubicacionUsuario }) => {
  const mapa = useMap();

  useEffect(() => {
    if (ubicacionUsuario) {
      mapa.setView(ubicacionUsuario, 15, {
        animate: true
      });
    }
  }, [ubicacionUsuario, mapa]);

  return null;
};

// Ajustar el zoom conforme aumenta el radio de búsqueda.
// Se utiliza setView en lugar de crear una capa temporal y llamar fitBounds,
// evitando errores de Leaflet durante los cambios rápidos de la animación.
const AjustarVistaRadio = ({ ubicacionUsuario, radioBusquedaKm, activo }) => {
  const mapa = useMap();

  useEffect(() => {
    if (!activo || !ubicacionUsuario || !mapa) return;

    const radio = Math.max(1, Number(radioBusquedaKm) || 1);

    // Cada kilómetro adicional aleja progresivamente la vista.
    // El zoom se limita para evitar acercamientos o alejamientos extremos.
    const zoom = Math.max(9, Math.min(14, 14 - Math.log2(radio)));

    mapa.setView(ubicacionUsuario, zoom, {
      animate: true,
      duration: 0.8
    });
  }, [ubicacionUsuario, radioBusquedaKm, activo, mapa]);

  return null;
};


// Centrar mapa
const BotonCentrarMapa = ({ ubicacionUsuario }) => {
  const mapa = useMap();

  if (!ubicacionUsuario) return null;

  const centrarUbicacion = (e) => {
    e.stopPropagation();

    mapa.setView(ubicacionUsuario, 15, {
      animate: true
    });
  };

  return (
    <button
      type="button"
      className="boton-centrar-mapa"
      onClick={centrarUbicacion}
      title="Volver a mi ubicación"
      aria-label="Volver a mi ubicación"
    >
      <span>◎</span>
    </button>
  );
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
  const navigate = useNavigate();

  const inicialUsuario =
    user?.nombre?.trim()?.charAt(0).toUpperCase() || "?";

  const [negocios, setNegocios] = useState([]);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);
  const [cargandoFichaNegocio, setCargandoFichaNegocio] = useState(false);
  const [errorFichaNegocio, setErrorFichaNegocio] = useState("");
  const [fotografiasNegocio, setFotografiasNegocio] = useState([]);
  const [cargandoGaleriaNegocio, setCargandoGaleriaNegocio] = useState(false);

  const [resenasNegocio, setResenasNegocio] = useState({
    total: 0,
    promedio: 0,
    destacadas: {
      cinco_estrellas: null,
      intermedia: null,
      una_estrella: null
    }
  });

  const [cargandoResenas, setCargandoResenas] = useState(false);
  const [errorResenas, setErrorResenas] = useState("");


  // RESEÑA PROPIA DEL USUARIO.
const [miResena, setMiResena] = useState(null);
const [cargandoMiResena, setCargandoMiResena] = useState(false);

// FORMULARIO DE RESEÑAS.
const [estrellasResena, setEstrellasResena] = useState(5);
const [comentarioResena, setComentarioResena] = useState("");
const [editandoResena, setEditandoResena] = useState(false);
const [guardandoResena, setGuardandoResena] = useState(false);
const [errorMiResena, setErrorMiResena] = useState("");
const [mensajeMiResena, setMensajeMiResena] = useState("");

  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const solicitudFichaRef = useRef(0);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [errorUbicacion, setErrorUbicacion] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [radioBusquedaKm, setRadioBusquedaKm] = useState(1);
  const [buscandoNegocios, setBuscandoNegocios] = useState(false);
  const [radioVisible, setRadioVisible] = useState(false);

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

  // NAVEGAR A TODAS LAS RESEÑAS DEL NEGOCIO SELECCIONADO.
const manejarVerMasResenas = () => {
  if (!negocioSeleccionado?.id) return;

  navigate("/recomendaciones", {
    state: {
      negocioId: negocioSeleccionado.id
    }
  });
};

  // Obtener la ubicación actual del dispositivo.
  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorUbicacion("Tu dispositivo no permite obtener la ubicación.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setUbicacionUsuario([
          posicion.coords.latitude,
          posicion.coords.longitude
        ]);

        setErrorUbicacion("");
      },
      (error) => {
        console.warn("No se pudo obtener la ubicación:", error.message);

        setErrorUbicacion(
          "No fue posible obtener tu ubicación. Puedes habilitar el permiso."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }, []);

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

  // Obtener categorías únicas de los negocios registrados.
  const categoriasDisponibles = useMemo(() => {
    return [
      ...new Set(
        negociosConUbicacion
          .map((negocio) => negocio.categoria?.nombre)
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b, "es"));
  }, [negociosConUbicacion]);


  // Negocios que pertenecen a la categoría seleccionada.
  const negociosDeCategoria = useMemo(() => {
    if (!categoriaSeleccionada) return negociosConUbicacion;

    return negociosConUbicacion.filter(
      (negocio) => negocio.categoria?.nombre === categoriaSeleccionada
    );
  }, [negociosConUbicacion, categoriaSeleccionada]);

  // Buscar por categoría con una animación de tres pulsos por cada radio.
  // Si no hay al menos 3 negocios, ampliar un kilómetro y repetir.
  useEffect(() => {
    if (!categoriaSeleccionada) {
      setRadioBusquedaKm(1);
      setBuscandoNegocios(false);
      setRadioVisible(false);
      return undefined;
    }

    if (!ubicacionUsuario) {
      setRadioBusquedaKm(1);
      setBuscandoNegocios(false);
      setRadioVisible(false);
      return undefined;
    }

    let cancelado = false;
    let temporizador = null;
    let radioActual = 1;
    const duracionCiclo = 950;
    const pausasEntreRadios = 300;

    setRadioBusquedaKm(1);
    setRadioVisible(true);
    setBuscandoNegocios(true);

    const contarNegociosEnRadio = (radioKm) => {
      const [latUsuario, lngUsuario] = ubicacionUsuario;

      return negociosDeCategoria.filter((negocio) => {
        const distancia = calcularDistancia(
          latUsuario,
          lngUsuario,
          Number(negocio.lat),
          Number(negocio.lng)
        );
        return distancia <= radioKm * 1000;
      }).length;
    };

    // El círculo permanece visible y respira con un brillo suave.
    // Después de tres ciclos de iluminación se evalúa el siguiente radio.
    const ejecutarCiclos = (cicloActual = 0) => {
      if (cancelado) return;

      if (cicloActual >= 3) {
        const totalEncontrado = contarNegociosEnRadio(radioActual);

        if (totalEncontrado >= 3 || radioActual >= 10) {
          setRadioVisible(true);
          setBuscandoNegocios(false);
          return;
        }

        radioActual += 1;
        setRadioBusquedaKm(radioActual);
        setRadioVisible(true);

        temporizador = setTimeout(() => {
          ejecutarCiclos(0);
        }, pausasEntreRadios);
        return;
      }

      temporizador = setTimeout(() => {
        ejecutarCiclos(cicloActual + 1);
      }, duracionCiclo);
    };

    ejecutarCiclos(0);

    return () => {
      cancelado = true;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [categoriaSeleccionada, ubicacionUsuario, negociosDeCategoria]);

  // Sin filtro se muestran todos los negocios. Con filtro, solo los de la
  // categoría elegida que estén dentro del radio progresivo calculado.
  const negociosFiltrados = useMemo(() => {
    if (!categoriaSeleccionada) return negociosConUbicacion;
    if (!ubicacionUsuario) return [];

    const [latUsuario, lngUsuario] = ubicacionUsuario;

    return negociosDeCategoria.filter((negocio) => {
      const distancia = calcularDistancia(
        latUsuario,
        lngUsuario,
        Number(negocio.lat),
        Number(negocio.lng)
      );
      return distancia <= radioBusquedaKm * 1000;
    });
  }, [
    negociosConUbicacion,
    negociosDeCategoria,
    categoriaSeleccionada,
    ubicacionUsuario,
    radioBusquedaKm
  ]);

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

  // Abrir la ficha y cargar perfil completo y galería pública.
    const manejarSeleccionNegocio = async (negocio) => {
    const solicitudActual = ++solicitudFichaRef.current;

    setNegocioSeleccionado(negocio);
    setCargandoFichaNegocio(true);
    setCargandoGaleriaNegocio(true);
    setErrorFichaNegocio("");
    setFotografiasNegocio([]);
    setImagenAmpliada(null);

    // Reiniciar los datos de la reseña propia.
    setMiResena(null);
    setCargandoMiResena(Boolean(user?.id));
    setEstrellasResena(5);
    setComentarioResena("");
    setEditandoResena(false);
    setErrorMiResena("");
    setMensajeMiResena("");

    setResenasNegocio({
      total: 0,
      promedio: 0,
      destacadas: {
        cinco_estrellas: null,
        intermedia: null,
        una_estrella: null
      }
    });

    setCargandoResenas(true);
    setErrorResenas("");

    const cargarPerfil = obtenerNegocioPublico(negocio.id)
      .then((detalle) => {
        if (solicitudActual !== solicitudFichaRef.current) return;
        if (detalle) {
          setNegocioSeleccionado((actual) =>
            actual?.id === negocio.id ? { ...actual, ...detalle } : actual
          );
        }
      })
      .catch((error) => {
        if (solicitudActual !== solicitudFichaRef.current) return;
        console.error("Error al consultar el perfil público del negocio:", error);
        setErrorFichaNegocio(
          error.message || "No fue posible cargar toda la información del negocio."
        );
      })
      .finally(() => {
        if (solicitudActual === solicitudFichaRef.current) {
          setCargandoFichaNegocio(false);
        }
      });

    const cargarGaleria = obtenerFotosNegocioPublicas(negocio.id)
      .then((fotografias) => {
        if (solicitudActual !== solicitudFichaRef.current) return;
        setFotografiasNegocio(Array.isArray(fotografias) ? fotografias : []);
      })
      .catch((error) => {
        if (solicitudActual !== solicitudFichaRef.current) return;
        console.error("Error al consultar la galería pública:", error);
        setFotografiasNegocio([]);
      })
      .finally(() => {
        if (solicitudActual === solicitudFichaRef.current) {
          setCargandoGaleriaNegocio(false);
        }
      });

      const cargarResenas = obtenerResenasDestacadas(negocio.id)
      .then((resultado) => {
        if (solicitudActual !== solicitudFichaRef.current) return;

        setResenasNegocio(resultado);
      })
      .catch((error) => {
        if (solicitudActual !== solicitudFichaRef.current) return;

        console.error("Error al consultar las reseñas:", error);
        setErrorResenas(
          error.message || "No fue posible cargar las reseñas."
        );
      })
      .finally(() => {
        if (solicitudActual === solicitudFichaRef.current) {
          setCargandoResenas(false);
        }
      });


    // Consultar la reseña propia únicamente si hay una sesión iniciada.
    const cargarMiResena = user?.id
      ? obtenerResenaPropia(negocio.id)
          .then((resena) => {
            if (solicitudActual !== solicitudFichaRef.current) return;

            setMiResena(resena || null);
            setEstrellasResena(resena?.estrellas || 5);
            setComentarioResena(resena?.comentario || "");
          })
          .catch((error) => {
            if (solicitudActual !== solicitudFichaRef.current) return;

            console.error("Error al consultar tu reseña:", error);
            setErrorMiResena(
              error.message || "No fue posible consultar tu reseña."
            );
          })
          .finally(() => {
            if (solicitudActual === solicitudFichaRef.current) {
              setCargandoMiResena(false);
            }
          })
      : Promise.resolve();

    await Promise.allSettled([
      cargarPerfil,
      cargarGaleria,
      cargarResenas,
      cargarMiResena
    ]);
  };

  const cerrarFichaNegocio = () => {
    solicitudFichaRef.current += 1;

    setNegocioSeleccionado(null);
    setCargandoFichaNegocio(false);
    setCargandoGaleriaNegocio(false);
    setErrorFichaNegocio("");
    setFotografiasNegocio([]);

    setResenasNegocio({
      total: 0,
      promedio: 0,
      destacadas: {
        cinco_estrellas: null,
        intermedia: null,
        una_estrella: null
      }
    });

    setCargandoResenas(false);
    setErrorResenas("");

    // LIMPIAR LA RESEÑA PROPIA DEL USUARIO.
    setMiResena(null);
    setCargandoMiResena(false);

    // LIMPIAR EL FORMULARIO DE RESEÑAS.
    setEstrellasResena(5);
    setComentarioResena("");
    setEditandoResena(false);
    setGuardandoResena(false);
    setErrorMiResena("");
    setMensajeMiResena("");

    setImagenAmpliada(null);
  };

    // GUARDAR UNA RESEÑA NUEVA O ACTUALIZAR LA EXISTENTE.
  const manejarGuardarResena = async () => {
    if (!user?.id) {
      setErrorMiResena("Debes iniciar sesión para publicar una reseña.");
      return;
    }

    if (!negocioSeleccionado?.id) {
      setErrorMiResena("No se ha seleccionado un negocio.");
      return;
    }

    if (!estrellasResena || estrellasResena < 1 || estrellasResena > 5) {
      setErrorMiResena("Selecciona una calificación de 1 a 5 estrellas.");
      return;
    }

    setGuardandoResena(true);
    setErrorMiResena("");
    setMensajeMiResena("");

    try {
      let resultado;

      if (miResena?.id) {
        resultado = await actualizarResena(
          miResena.id,
          estrellasResena,
          comentarioResena.trim()
        );

        setMensajeMiResena("Tu reseña se actualizó correctamente.");
      } else {
        resultado = await publicarResena(
          negocioSeleccionado.id,
          estrellasResena,
          comentarioResena.trim()
        );

        setMensajeMiResena("¡Tu reseña se publicó correctamente!");
      }

      setMiResena(resultado);
      setEstrellasResena(resultado?.estrellas || estrellasResena);
      setComentarioResena(resultado?.comentario || comentarioResena.trim());
      setEditandoResena(false);

      // ACTUALIZAR EL PROMEDIO Y LAS RESEÑAS DESTACADAS.
      const resenasActualizadas = await obtenerResenasDestacadas(
        negocioSeleccionado.id
      );

      setResenasNegocio(resenasActualizadas);
    } catch (error) {
      console.error("Error al guardar la reseña:", error);

      setErrorMiResena(
        error.message || "No fue posible guardar tu reseña."
      );
    } finally {
      setGuardandoResena(false);
    }
  };

  // ACTIVAR LA EDICIÓN DE LA RESEÑA PROPIA.
  const manejarEditarResena = () => {
    if (!miResena) return;

    setEstrellasResena(miResena.estrellas || 5);
    setComentarioResena(miResena.comentario || "");
    setEditandoResena(true);
    setErrorMiResena("");
    setMensajeMiResena("");
  };

  // CANCELAR LA EDICIÓN DE LA RESEÑA.
  const manejarCancelarEdicionResena = () => {
    setEstrellasResena(miResena?.estrellas || 5);
    setComentarioResena(miResena?.comentario || "");
    setEditandoResena(false);
    setErrorMiResena("");
    setMensajeMiResena("");
  };

  // ELIMINAR LA RESEÑA PROPIA.
  const manejarEliminarResena = async () => {
    if (!miResena?.id) return;

    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar tu reseña?"
    );

    if (!confirmar) return;

    setGuardandoResena(true);
    setErrorMiResena("");
    setMensajeMiResena("");

    try {
      await eliminarResena(miResena.id);

      setMiResena(null);
      setEstrellasResena(5);
      setComentarioResena("");
      setEditandoResena(false);

      setMensajeMiResena("Tu reseña se eliminó correctamente.");

      // ACTUALIZAR EL PROMEDIO Y LAS RESEÑAS DESTACADAS.
      const resenasActualizadas = await obtenerResenasDestacadas(
        negocioSeleccionado.id
      );

      setResenasNegocio(resenasActualizadas);
    } catch (error) {
      console.error("Error al eliminar la reseña:", error);

      setErrorMiResena(
        error.message || "No fue posible eliminar tu reseña."
      );
    } finally {
      setGuardandoResena(false);
    }
  };

  return (
    <div className="inicio-usuario">
      {imagenAmpliada && (
        <div
          className="ficha-imagen-lightbox"
          onClick={() => setImagenAmpliada(null)}
          role="presentation"
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(8,20,24,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <button
            type="button"
            onClick={() => setImagenAmpliada(null)}
            aria-label="Cerrar fotografía"
            style={{ position: "absolute", top: 20, right: 24, border: 0, borderRadius: "50%", width: 42, height: 42, fontSize: 25, cursor: "pointer" }}
          >×</button>
          <img
            src={imagenAmpliada.url}
            alt={imagenAmpliada.descripcion || "Fotografía del negocio"}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(100%, 1100px)", maxHeight: "85vh", objectFit: "contain", borderRadius: 12 }}
          />
        </div>
      )}
      <style>{`
        .ficha-negocio-contenido { padding: 24px 26px 30px; }
        .ficha-negocio-encabezado { padding-bottom: 20px; }
        .ficha-negocio-encabezado h2 { margin: 12px 0 8px; color: #123b43; font-size: 27px; }
        .ficha-negocio-descripcion { margin: 0; color: #647780; line-height: 1.65; }
        .ficha-seccion { padding: 20px 0; border-top: 1px solid #e6edef; }
        .ficha-seccion h3 { margin: 0 0 14px; color: #173f47; font-size: 16px; display: flex; align-items: center; gap: 9px; }
        .ficha-seccion h3 span { color: #238b83; font-size: 20px; }
        .ficha-grid-contacto { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .ficha-dato { display: flex; align-items: center; gap: 11px; min-width: 0; padding: 12px; border: 1px solid #e5edef; border-radius: 12px; color: inherit; text-decoration: none; background: #fbfdfd; }
        .ficha-dato:hover { border-color: #9ccbc7; background: #f3faf9; }
        .ficha-dato-icono { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; border-radius: 10px; background: #e8f4f1; color: #167c73; font-size: 18px; }
        .ficha-dato small, .ficha-ubicacion-dato small { display: block; margin-bottom: 3px; color: #71848a; font-size: 11px; }
        .ficha-dato strong, .ficha-ubicacion-dato strong { display: block; overflow-wrap: anywhere; color: #24454c; font-size: 13px; font-weight: 600; }
        .ficha-ubicacion-dato { margin: 0 0 12px; }
        .ficha-enlace-mapa { display: inline-flex; padding: 9px 13px; border-radius: 9px; background: #eaf4f3; color: #14766f; text-decoration: none; font-size: 13px; font-weight: 600; }
        .ficha-horario { padding: 13px 15px; border-radius: 11px; background: #f7faf9; color: #425c62; white-space: pre-line; line-height: 1.6; }
        .ficha-galeria-encabezado { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; }
        .ficha-galeria-encabezado h3 { margin-bottom: 3px; }
        .ficha-galeria-encabezado small { color: #788b90; }
        .ficha-galeria-total { padding: 5px 9px; border-radius: 20px; background: #e8f3f0; color: #276d65; font-size: 11px; font-weight: 600; }
        .ficha-galeria-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .ficha-galeria-foto { position: relative; display: block; padding: 0; overflow: hidden; border: 0; border-radius: 12px; background: #edf2f1; cursor: zoom-in; text-align: left; }
        .ficha-galeria-foto img { display: block; width: 100%; height: 155px; object-fit: cover; transition: transform .25s ease; }
        .ficha-galeria-foto:hover img { transform: scale(1.04); }
        .ficha-galeria-foto span { display: block; padding: 7px 9px; color: #496168; font-size: 11px; background: #fff; }
        .ficha-sin-datos { color: #829196; font-size: 13px; }
        .ficha-fecha-registro { margin: 4px 0 0; padding-top: 14px; border-top: 1px solid #e6edef; color: #89989c; font-size: 11px; }
        @media (max-width: 600px) {
          .ficha-negocio-contenido { padding: 20px 17px 25px; }
          .ficha-grid-contacto { grid-template-columns: 1fr; }
          .ficha-galeria-foto img { height: 125px; }
        }
        .inicio-busqueda-indicador {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          flex: 0 0 auto;
          padding: 7px 11px;
          border-radius: 999px;
          background: #eef6ff;
          color: #2469ad;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .inicio-busqueda-punto {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2585e8;
        }
        .inicio-busqueda-indicador.activo .inicio-busqueda-punto {
          animation: punto-cargando 1.1s ease-in-out infinite;
        }
        .radio-buscando {
          animation: radio-respirando 1.9s ease-in-out infinite;
          transform-origin: center;
        }
        .radio-encontrado {
          filter: drop-shadow(0 0 3px rgba(37,133,232,.45));
        }
        @keyframes radio-respirando {
          0%, 100% { stroke-opacity: .58; fill-opacity: .045; }
          50% { stroke-opacity: 1; fill-opacity: .16; }
        }
        @keyframes punto-cargando {
          0%, 100% { opacity: .45; transform: scale(.85); }
          50% { opacity: 1; transform: scale(1.25); }
        }


        .ficha-resenas-resumen {
          display: flex;
          align-items: center;
          margin: 12px 0 20px;
        }

        .ficha-resenas-promedio {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ficha-resenas-promedio strong {
          font-size: 36px;
          font-weight: 800;
          color: #252525;
        }

        .ficha-resenas-promedio > span {
          color: #e5a900;
          font-size: 30px;
        }

        .ficha-resenas-promedio small {
          width: 100%;
          color: #777;
          font-size: 13px;
        }

        .ficha-resenas-lista {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ficha-resena-card {
          padding: 15px;
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          background: #fff;
        }

        .ficha-resena-encabezado {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .ficha-resena-encabezado strong {
          color: #252525;
          font-size: 14px;
        }

        .ficha-resena-encabezado span {
          color: #e5a900;
          font-size: 17px;
          letter-spacing: 2px;
          white-space: nowrap;
        }

        .ficha-resena-card p {
          margin: 0 0 10px;
          color: #555;
          font-size: 14px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .ficha-resena-card small {
          color: #999;
          font-size: 12px;
        }

        @media (max-width: 480px) {
          .ficha-resena-encabezado {
            align-items: flex-start;
            flex-direction: column;
            gap: 5px;
          }
        }

        .ficha-ver-mas-resenas {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 16px;
          padding: 10px 17px;
          border: 1px solid #238b83;
          border-radius: 9px;
          background: #fff;
          color: #167c73;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
        }

        .ficha-ver-mas-resenas:hover {
          background: #e8f4f1;
          transform: translateY(-1px);
        }

        .ficha-ver-mas-resenas:focus-visible {
          outline: 3px solid rgba(35, 139, 131, .25);
          outline-offset: 3px;
        }
      `}</style>

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
                onClick={cerrarFichaNegocio}
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

              <div className="inicio-datos-negocio ficha-negocio-contenido">
                {cargandoFichaNegocio && (
                  <div className="inicio-cargando-ficha" role="status">
                    Cargando información del negocio...
                  </div>
                )}

                {errorFichaNegocio && (
                  <div className="inicio-error-ficha" role="alert">
                    {errorFichaNegocio}
                  </div>
                )}

                <header className="ficha-negocio-encabezado">
                  <span className="inicio-categoria">
                    {negocioSeleccionado.categoria?.nombre || "Sin categoría"}
                  </span>
                  <h2>{negocioSeleccionado.nombre}</h2>
                  {negocioSeleccionado.descripcion && (
                    <p className="ficha-negocio-descripcion">
                      {negocioSeleccionado.descripcion}
                    </p>
                  )}
                </header>

                <section className="ficha-seccion">
                  <h3><span>☎</span> Contacto</h3>
                  <div className="ficha-grid-contacto">
                    {negocioSeleccionado.telefono && (
                      <a className="ficha-dato" /*href={`tel:${negocioSeleccionado.telefono}`}*/>
                        <span className="ficha-dato-icono">☎</span>
                        <span><small>Teléfono</small><strong>{negocioSeleccionado.telefono}</strong></span>
                      </a>
                    )}
                    {negocioSeleccionado.whatsapp && (
                      <a
                        className="ficha-dato"
                        /*href={`https://wa.me/${String(negocioSeleccionado.whatsapp).replace(/\D/g, "")}`}*/
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="ficha-dato-icono">✆</span>
                        <span><small>WhatsApp</small><strong>{negocioSeleccionado.whatsapp}</strong></span>
                      </a>
                    )}
                    {negocioSeleccionado.email && (
                      <a className="ficha-dato" /*href={`mailto:${negocioSeleccionado.email}`}*/>
                        <span className="ficha-dato-icono">✉</span>
                        <span><small>Correo electrónico</small><strong>{negocioSeleccionado.email}</strong></span>
                      </a>
                    )}
                    {negocioSeleccionado.sitio_web && (
                      <a
                        className="ficha-dato"
                        href={/^https?:\/\//i.test(negocioSeleccionado.sitio_web) ? negocioSeleccionado.sitio_web : `https://${negocioSeleccionado.sitio_web}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="ficha-dato-icono">↗</span>
                        <span><small>Sitio web</small><strong>Visitar página</strong></span>
                      </a>
                    )}
                    {!negocioSeleccionado.telefono && !negocioSeleccionado.whatsapp &&
                     !negocioSeleccionado.email && !negocioSeleccionado.sitio_web && (
                      <p className="ficha-sin-datos">Este negocio aún no ha agregado medios de contacto.</p>
                    )}
                  </div>
                </section>

                <section className="ficha-seccion">
                  <h3><span>⌖</span> Ubicación</h3>
                  {negocioSeleccionado.direccion && (
                    <div className="ficha-ubicacion-dato">
                      <small>Dirección</small>
                      <strong>{negocioSeleccionado.direccion}</strong>
                    </div>
                  )}
                  <div className="ficha-ubicacion-dato">
                    <small>Coordenadas</small>
                    <strong>{negocioSeleccionado.lat}, {negocioSeleccionado.lng}</strong>
                  </div>
                  <a
                    className="ficha-enlace-mapa"
                    href={`https://www.google.com/maps?q=${negocioSeleccionado.lat},${negocioSeleccionado.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver ubicación en Google Maps ↗
                  </a>
                </section>

                {negocioSeleccionado.horario && (
                  <section className="ficha-seccion">
                    <h3><span>◷</span> Horarios de atención</h3>
                    <div className="ficha-horario">{negocioSeleccionado.horario}</div>
                  </section>
                )}

                <section className="ficha-seccion ficha-galeria">
                  <div className="ficha-galeria-encabezado">
                    <div>
                      <h3><span>▧</span> Galería de fotografías</h3>
                      <small>Conoce más de este negocio</small>
                    </div>
                    {fotografiasNegocio.length > 0 && (
                      <span className="ficha-galeria-total">{fotografiasNegocio.length} fotos</span>
                    )}
                  </div>

                  {cargandoGaleriaNegocio ? (
                    <p className="ficha-sin-datos">Cargando fotografías...</p>
                  ) : fotografiasNegocio.length > 0 ? (
                    <div className="ficha-galeria-grid">
                      {fotografiasNegocio.map((foto) => (
                        <button
                          type="button"
                          className="ficha-galeria-foto"
                          key={foto.id}
                          onClick={() => setImagenAmpliada(foto)}
                          aria-label="Ampliar fotografía"
                        >
                          <img src={foto.url} alt={foto.descripcion || `Fotografía de ${negocioSeleccionado.nombre}`} />
                          {foto.descripcion && <span>{foto.descripcion}</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="ficha-sin-datos">Este negocio todavía no tiene fotografías adicionales.</p>
                  )}
                </section>

                 {/* RESEÑAS DEL NEGOCIO */}
                <section className="ficha-seccion">
                  <h3>Opiniones de nuestros usuarios</h3>

                  {cargandoResenas ? (
                    <p className="ficha-sin-datos">Cargando reseñas...</p>
                  ) : errorResenas ? (
                    <p className="ficha-sin-datos">{errorResenas}</p>
                  ) : resenasNegocio.total > 0 ? (
                    <>
                      <div className="ficha-resenas-resumen">
                        <div className="ficha-resenas-promedio">
                          <span>Promedio: </span>
                          <strong>{Number(resenasNegocio.promedio).toFixed(1)}</strong>
                          <span>★</span>
                          <small>
                            {resenasNegocio.total} reseñas
                          </small>
                        </div>
                      </div>

                      <div className="ficha-resenas-lista">
                        {[
                          resenasNegocio.destacadas.cinco_estrellas,
                          resenasNegocio.destacadas.intermedia,
                          resenasNegocio.destacadas.una_estrella
                        ]
                          .filter(Boolean)
                          .map((resena) => (
                            <article
                              className="ficha-resena-card"
                              key={resena.id}
                            >
                              <div className="ficha-resena-encabezado">
                                <strong>
                                  Cliente anónimo
                                </strong>

                                <span>
                                  {"★".repeat(resena.estrellas)}
                                  {"☆".repeat(5 - resena.estrellas)}
                                </span>
                              </div>

                              <p>
                                {resena.comentario || "Sin comentario."}
                              </p>

                              {resena.creado_en && (
                                <small>
                                  {new Date(resena.creado_en).toLocaleDateString(
                                    "es-MX",
                                    {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric"
                                    }
                                  )}
                                </small>
                              )}
                            </article>
                          ))}
                      </div>
                    </>
                  
                  ) : (
                    <p className="ficha-sin-datos">
                      Este negocio todavía no tiene reseñas.
                    </p>
                  )}

                  {resenasNegocio.total > 0 && (
                    <button
                      type="button"
                      className="ficha-ver-mas-resenas"
                      onClick={manejarVerMasResenas}
                    >
                      Ver más reseñas →
                    </button>
                  )}
                </section>

                {/* RESEÑA PROPIA DEL USUARIO */}


                                {/* RESEÑA PROPIA DEL USUARIO */}
                <section className="ficha-seccion ficha-mi-resena">
                  <h3>Mi opinión sobre este negocio</h3>

                  {cargandoMiResena ? (
                    <p className="ficha-sin-datos">
                      Cargando tu reseña...
                    </p>
                  ) : !user?.id ? (
                    <p className="ficha-sin-datos">
                      Inicia sesión para compartir tu opinión sobre este negocio.
                    </p>
                  ) : miResena && !editandoResena ? (
                    <div className="ficha-resena-propia">
                      <div className="ficha-resena-encabezado">
                        <strong>Tu reseña</strong>
                        <span>
                          {"★".repeat(miResena.estrellas || 0)}
                          {"☆".repeat(5 - (miResena.estrellas || 0))}
                        </span>
                      </div>

                      <p>
                        {miResena.comentario || "Sin comentario."}
                      </p>

                      {miResena.creado_en && (
                        <small>
                          Publicada el{" "}
                          {new Date(miResena.creado_en).toLocaleDateString(
                            "es-MX",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            }
                          )}
                        </small>
                      )}

                      <div className="ficha-resena-acciones">
                        <button
                          type="button"
                          onClick={manejarEditarResena}
                          disabled={guardandoResena}
                        >
                          Editar reseña
                        </button>

                        <button
                          type="button"
                          onClick={manejarEliminarResena}
                          disabled={guardandoResena}
                        >
                          Eliminar reseña
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ficha-resena-formulario">
                      <p>
                        {miResena
                          ? "Modifica tu opinión sobre este negocio."
                          : "¿Ya visitaste este negocio? Comparte tu experiencia con otros usuarios."}
                      </p>

                      <label className="ficha-resena-label">
                        Tu calificación
                      </label>

                      <div className="ficha-resena-estrellas">
                        {[1, 2, 3, 4, 5].map((estrella) => (
                          <button
                            key={estrella}
                            type="button"
                            onClick={() => setEstrellasResena(estrella)}
                            disabled={guardandoResena}
                            aria-label={`Calificar con ${estrella} estrellas`}
                            className={
                              estrella <= estrellasResena
                                ? "estrella-activa"
                                : "estrella-inactiva"
                            }
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <label
                        className="ficha-resena-label"
                        htmlFor="comentario-resena"
                      >
                        Tu comentario
                      </label>

                      <textarea
                        id="comentario-resena"
                        value={comentarioResena}
                        onChange={(e) => setComentarioResena(e.target.value)}
                        placeholder="Cuéntanos cómo fue tu experiencia..."
                        rows={4}
                        maxLength={1000}
                        disabled={guardandoResena}
                      />

                      <small>
                        {comentarioResena.length}/1000 caracteres
                      </small>

                      {errorMiResena && (
                        <p className="ficha-resena-error">
                          {errorMiResena}
                        </p>
                      )}

                      {mensajeMiResena && (
                        <p className="ficha-resena-mensaje">
                          {mensajeMiResena}
                        </p>
                      )}

                      <div className="ficha-resena-acciones">
                        <button
                          type="button"
                          onClick={manejarGuardarResena}
                          disabled={guardandoResena}
                        >
                          {guardandoResena
                            ? "Guardando..."
                            : miResena
                              ? "Guardar cambios"
                              : "Publicar reseña"}
                        </button>

                        {editandoResena && (
                          <button
                            type="button"
                            onClick={manejarCancelarEdicionResena}
                            disabled={guardandoResena}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {errorMiResena && miResena && !editandoResena && (
                    <p className="ficha-resena-error">
                      {errorMiResena}
                    </p>
                  )}

                  {mensajeMiResena && miResena && !editandoResena && (
                    <p className="ficha-resena-mensaje">
                      {mensajeMiResena}
                    </p>
                  )}
                </section>


                {negocioSeleccionado.creado_en && (
                  <p className="ficha-fecha-registro">
                    Negocio registrado el {new Date(negocioSeleccionado.creado_en).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                )}
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
              {negociosFiltrados.length} negocios
            </span>
          </div>

          {/* FILTRO POR CATEGORÍA */}
          <div className="buscador-servicios">
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            >
              <option value="">Todas las categorías</option>

              {categoriasDisponibles.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>

            {categoriaSeleccionada && (
              <button
                type="button"
                onClick={() => setCategoriaSeleccionada("")}
              >
                Limpiar filtro
              </button>
            )}

            {categoriaSeleccionada && ubicacionUsuario && (
              <span
                className={`inicio-busqueda-indicador ${buscandoNegocios ? "activo" : ""}`}
                aria-live="polite"
              >
                <span className="inicio-busqueda-punto" />
                {buscandoNegocios
                  ? `Explorando ${radioBusquedaKm} km`
                  : `${negociosFiltrados.length} negocios · ${radioBusquedaKm} km`}
              </span>
            )}
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
              center={ubicacionUsuario || centroMapa}
              zoom={ubicacionUsuario ? 15 : 13}
              className="inicio-mapa"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <EventosMapa
                alPulsarMapa={cerrarFichaNegocio}
              />

              <CentrarMapaUsuario ubicacionUsuario={ubicacionUsuario} />
              <BotonCentrarMapa ubicacionUsuario={ubicacionUsuario} />
              <AjustarVistaRadio
                ubicacionUsuario={ubicacionUsuario}
                radioBusquedaKm={radioBusquedaKm}
                activo={Boolean(categoriaSeleccionada)}
              />

              {categoriaSeleccionada && ubicacionUsuario && radioVisible && (
                <Circle
                  center={ubicacionUsuario}
                  radius={radioBusquedaKm * 1000}
                  pathOptions={{
                    className: buscandoNegocios ? "radio-buscando" : "radio-encontrado",
                    color: "#2585e8",
                    weight: buscandoNegocios ? 3 : 2,
                    fillColor: "#2585e8",
                    fillOpacity: buscandoNegocios ? 0.10 : 0.07
                  }}
                  interactive={false}
                />
              )}

              {ubicacionUsuario && (
                <CircleMarker
                  center={ubicacionUsuario}
                  radius={9}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 3,
                    fillColor: "#2585e8",
                    fillOpacity: 1
                  }}
                  interactive={false}
                />
              )}

              {negociosFiltrados.map((negocio) => (
                <Marker
                  key={negocio.id}
                  position={[
                    Number(negocio.lat),
                    Number(negocio.lng)
                  ]}
                  icon={crearIconoNegocio(
                    negocio.foto_principal_url,
                    negocio.categoria?.nombre,
                    negocioSeleccionado?.id === negocio.id
                  )}
                  zIndexOffset={negocioSeleccionado?.id === negocio.id ? 1000 : 0}
                  eventHandlers={{
                    click: (evento) => {
                      evento.originalEvent?.stopPropagation();
                      manejarSeleccionNegocio(negocio);
                    }
                  }}
                />
              ))}
            </MapContainer>
          )}

          {!cargando && !error && negociosFiltrados.length === 0 && (
            <p className="inicio-sin-negocios">
              {categoriaSeleccionada
                ? !ubicacionUsuario
                  ? "Necesitamos tu ubicación para buscar negocios cercanos."
                  : buscandoNegocios
                    ? "Buscando negocios dentro de un radio cada vez mayor..."
                    : `No encontramos negocios de esta categoría en un radio de ${radioBusquedaKm} km.`
                : "No hay negocios registrados con coordenadas válidas."}
            </p>
          )}
        </section>

      </div>
    </div>
  );
};

export default InicioUsuario;
