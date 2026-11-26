
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  obtenerNegocioPublico,
  obtenerResenasNegocio,
  obtenerMuroResenas,
  reportarResena
} from "../../services/negociosService";
import "./Recomendaciones.css";

const TARJETAS_VISIBLES = 12;
const TARJETAS_POR_CAMBIO = 3;
const TIEMPO_CAMBIO = 5000;

const Recomendaciones = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const negocioId = location.state?.negocioId;
  const esMuroGeneral = !negocioId;

  const [negocio, setNegocio] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [resenasVisibles, setResenasVisibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [indicesAnimados, setIndicesAnimados] = useState([]);

  const indiceSiguienteRef = useRef(TARJETAS_VISIBLES);
  const bloqueActualRef = useRef(0);

  // ESTADOS PARA REPORTAR RESEÑAS.
  const [menuReporteAbierto, setMenuReporteAbierto] = useState(null);
  const [resenaSeleccionada, setResenaSeleccionada] = useState(null);
  const [motivoReporte, setMotivoReporte] = useState("");
  const [descripcionReporte, setDescripcionReporte] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState("");
  const [reporteEnviado, setReporteEnviado] = useState(false);

  // CARGAR INFORMACIÓN.
  useEffect(() => {
    let cancelado = false;

    const cargarInformacion = async () => {
      try {
        setCargando(true);
        setError("");
        setIndicesAnimados([]);

        if (esMuroGeneral) {
          const todasLasResenas = await obtenerMuroResenas();

          if (cancelado) return;

          const resultado = Array.isArray(todasLasResenas)
            ? todasLasResenas
            : [];

          setNegocio(null);
          setResenas(resultado);
          setResenasVisibles(resultado.slice(0, TARJETAS_VISIBLES));

          indiceSiguienteRef.current = TARJETAS_VISIBLES;
          bloqueActualRef.current = 0;
        } else {
          const [detalleNegocio, todasLasResenas] = await Promise.all([
            obtenerNegocioPublico(negocioId),
            obtenerResenasNegocio(negocioId)
          ]);

          if (cancelado) return;

          setNegocio(detalleNegocio);
          setResenas(
            Array.isArray(todasLasResenas) ? todasLasResenas : []
          );
          setResenasVisibles([]);
        }
      } catch (err) {
        console.error("Error al cargar las reseñas:", err);

        if (!cancelado) {
          setError(
            err.message || "No fue posible cargar las reseñas."
          );
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    cargarInformacion();

    return () => {
      cancelado = true;
    };
  }, [negocioId, esMuroGeneral]);

  // ROTAR ÚNICAMENTE TRES TARJETAS CADA CINCO SEGUNDOS.
  useEffect(() => {
    if (
      !esMuroGeneral ||
      cargando ||
      resenas.length <= TARJETAS_VISIBLES
    ) {
      return;
    }

    const intervalo = setInterval(() => {
      const bloque = bloqueActualRef.current;
      const inicio = bloque * TARJETAS_POR_CAMBIO;

      setResenasVisibles((anteriores) => {
        const siguientes = [...anteriores];

        const idsOcupados = new Set(
          anteriores.map((resena) => resena.id)
        );

        const nuevasResenas = [];
        let indice = indiceSiguienteRef.current;
        let intentos = 0;

        while (
          nuevasResenas.length < TARJETAS_POR_CAMBIO &&
          intentos < resenas.length
        ) {
          if (indice >= resenas.length) {
            indice = 0;
          }

          const candidata = resenas[indice];

          if (
            candidata &&
            !idsOcupados.has(candidata.id) &&
            !nuevasResenas.some(
              (resena) => resena.id === candidata.id
            )
          ) {
            nuevasResenas.push(candidata);
          }

          indice++;
          intentos++;
        }

        const indicesCambiados = [];

        nuevasResenas.forEach((resena, posicion) => {
          const posicionTarjeta = inicio + posicion;

          siguientes[posicionTarjeta] = resena;
          indicesCambiados.push(posicionTarjeta);
        });

        indiceSiguienteRef.current = indice;
        setIndicesAnimados(indicesCambiados);

        return siguientes;
      });

      bloqueActualRef.current =
        (bloqueActualRef.current + 1) %
        (TARJETAS_VISIBLES / TARJETAS_POR_CAMBIO);
    }, TIEMPO_CAMBIO);

    return () => clearInterval(intervalo);
  }, [esMuroGeneral, cargando, resenas]);

  // PROMEDIO DEL NEGOCIO INDIVIDUAL.
  const promedio = resenas.length > 0
    ? resenas.reduce(
        (suma, resena) => suma + Number(resena.estrellas || 0),
        0
      ) / resenas.length
    : 0;

  // FORMATO DE FECHA.
  const formatearFecha = (fecha) => {
    if (!fecha) return "";

    const fechaValida = new Date(fecha);

    if (Number.isNaN(fechaValida.getTime())) return "";

    return fechaValida.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // GENERAR ESTRELLAS.
  const mostrarEstrellas = (calificacion) => {
    const estrellas = Math.min(
      5,
      Math.max(0, Number(calificacion) || 0)
    );

    return (
      <>
        {"★".repeat(estrellas)}
        {"☆".repeat(5 - estrellas)}
      </>
    );
  };

  // ABRIR EL FORMULARIO DE REPORTE.
  const abrirFormularioReporte = (resena) => {
    setResenaSeleccionada(resena);
    setMotivoReporte("");
    setDescripcionReporte("");
    setErrorReporte("");
    setReporteEnviado(false);
    setMenuReporteAbierto(null);
  };

  // CERRAR EL FORMULARIO.
  const cerrarFormularioReporte = () => {
    if (enviandoReporte) return;

    setResenaSeleccionada(null);
    setMotivoReporte("");
    setDescripcionReporte("");
    setErrorReporte("");
    setReporteEnviado(false);
  };

  // ENVIAR REPORTE AL BACKEND.
  const manejarReporteResena = async (e) => {
    e.preventDefault();

    if (!resenaSeleccionada || !motivoReporte) {
      setErrorReporte("Selecciona un motivo para continuar.");
      return;
    }

    try {
      setEnviandoReporte(true);
      setErrorReporte("");

      await reportarResena(
        resenaSeleccionada.id,
        motivoReporte,
        descripcionReporte.trim()
      );

      setReporteEnviado(true);

    } catch (error) {
      console.error("Error al reportar reseña:", error);

      setErrorReporte(
        error.message || "No fue posible enviar el reporte."
      );

    } finally {
      setEnviandoReporte(false);
    }
  };

  // MENÚ DE OPCIONES PARA CADA RESEÑA.
  const renderizarMenuReporte = (resena) => (
    <div className="recomendaciones-acciones-reporte">
      <button
        type="button"
        className="recomendaciones-menu-reporte"
        aria-label="Opciones de reseña"
        aria-expanded={menuReporteAbierto === resena.id}
        onClick={() =>
          setMenuReporteAbierto(
            menuReporteAbierto === resena.id ? null : resena.id
          )
        }
      >
        ⋮
      </button>

      {menuReporteAbierto === resena.id && (
        <button
          type="button"
          className="recomendaciones-opcion-reporte"
          onClick={() => abrirFormularioReporte(resena)}
        >
          <span>⚑</span>
          Reportar reseña
        </button>
      )}
    </div>
  );

  if (cargando) {
    return (
      <div className="recomendaciones-pagina">
        <p className="recomendaciones-cargando">
          Cargando recomendaciones...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recomendaciones-pagina">
        <div className="recomendaciones-error">
          <h2>No fue posible cargar la información</h2>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => navigate("/inicio")}
          >
            Volver a Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`recomendaciones-pagina ${
        esMuroGeneral ? "muro-general" : "muro-negocio"
      }`}
    >
      {/* REGRESAR */}
      <button
        type="button"
        className="recomendaciones-volver"
        onClick={() => navigate("/inicio")}
      >
        ← Volver a Inicio
      </button>

      {/* ENCABEZADO: SOLO PARA UN NEGOCIO ESPECÍFICO */}
      {!esMuroGeneral && (
        <>
          <header className="recomendaciones-encabezado">
            {negocio?.foto_principal_url && (
              <img
                src={negocio.foto_principal_url}
                alt={negocio.nombre}
              />
            )}

            <div>
              <span>
                {negocio?.categoria?.nombre || "Negocio"}
              </span>

              <h1>
                {negocio?.nombre || "Reseñas del negocio"}
              </h1>

              <p>Todas las opiniones de nuestra comunidad</p>
            </div>
          </header>

          <section className="recomendaciones-resumen">
            <div className="recomendaciones-promedio">
              <strong>{promedio.toFixed(1)}</strong>
              <span>★</span>
              <small>Promedio de calificaciones</small>
            </div>

            <div className="recomendaciones-total">
              <strong>{resenas.length}</strong>
              <span>
                {resenas.length === 1
                  ? "Reseña publicada"
                  : "Reseñas publicadas"}
              </span>
            </div>
          </section>

          <div className="recomendaciones-titulo-negocio">
            <h2>Opiniones de los usuarios</h2>
          </div>
        </>
      )}

      {/* MURO GENERAL */}
      {esMuroGeneral && (
        <>
          {resenas.length > 0 ? (
            <div className="recomendaciones-cuadricula">
              {resenasVisibles.map((resena, indice) => {
                const negocioResena = resena.negocio;

                return (
                  <article
                    className={`recomendaciones-tarjeta recomendaciones-tarjeta-muro ${
                      indicesAnimados.includes(indice)
                        ? "recomendacion-animada"
                        : ""
                    }`}
                    key={resena.id}
                  >
                    {/* OPCIONES DE LA RESEÑA */}
                    {renderizarMenuReporte(resena)}

                    {/* INFORMACIÓN DEL NEGOCIO */}
                    <div className="recomendaciones-negocio-resena">
                      {negocioResena?.foto_principal_url ? (
                        <img
                          src={negocioResena.foto_principal_url}
                          alt={negocioResena.nombre}
                        />
                      ) : (
                        <div className="recomendaciones-negocio-icono">
                          ★
                        </div>
                      )}

                      <div>
                        <strong>
                          {negocioResena?.nombre || "Negocio"}
                        </strong>

                        <small>
                          {negocioResena?.categoria?.nombre ||
                            "Categoría no disponible"}
                        </small>
                      </div>
                    </div>

                    {/* CLIENTE Y CALIFICACIÓN */}
                    <div className="recomendaciones-tarjeta-encabezado">
                      <strong className="recomendaciones-cliente">
                        Cliente anónimo
                      </strong>

                      <span className="recomendaciones-estrellas">
                        {mostrarEstrellas(resena.estrellas)}
                      </span>
                    </div>

                    {/* COMENTARIO ORIGINAL */}
                    <p className="recomendaciones-comentario">
                      {resena.comentario || "Sin comentario."}
                    </p>

                    {/* FECHA */}
                    <small className="recomendaciones-fecha">
                      {formatearFecha(resena.creado_en)}
                    </small>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="recomendaciones-vacio">
              <span>☆</span>
              <h3>Aún no hay reseñas en la comunidad</h3>
              <p>
                Cuando los usuarios compartan sus experiencias,
                aparecerán aquí.
              </p>
            </div>
          )}
        </>
      )}

      {/* RESEÑAS DE UN NEGOCIO ESPECÍFICO */}
      {!esMuroGeneral && (
        <>
          {resenas.length > 0 ? (
            <div className="recomendaciones-lista">
              {resenas.map((resena) => (
                <article
                  className="recomendaciones-tarjeta"
                  key={resena.id}
                >
                  {/* OPCIONES DE LA RESEÑA */}
                  {renderizarMenuReporte(resena)}

                  <div className="recomendaciones-tarjeta-encabezado">
                    <div className="recomendaciones-avatar">
                      ★
                    </div>

                    <div className="recomendaciones-autor">
                      <strong>Cliente anónimo</strong>
                      <small>
                        {formatearFecha(resena.creado_en)}
                      </small>
                    </div>

                    <span className="recomendaciones-estrellas">
                      {mostrarEstrellas(resena.estrellas)}
                    </span>
                  </div>

                  <p className="recomendaciones-comentario">
                    {resena.comentario || "Sin comentario."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="recomendaciones-vacio">
              <span>☆</span>
              <h3>Aún no hay reseñas</h3>
              <p>
                Este negocio todavía no cuenta con opiniones de usuarios.
              </p>
            </div>
          )}
        </>
      )}

      {/* MODAL PARA REPORTAR RESEÑA */}
      {resenaSeleccionada && (
        <div
          className="reporte-modal-fondo"
          onClick={cerrarFormularioReporte}
        >
          <div
            className="reporte-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reporte-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            {!reporteEnviado ? (
              <>
                <div className="reporte-modal-encabezado">
                  <div>
                    <span>MODERACIÓN DE CONTENIDO</span>
                    <h2 id="reporte-modal-titulo">
                      Reportar reseña
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={cerrarFormularioReporte}
                    disabled={enviandoReporte}
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <p className="reporte-modal-descripcion">
                  Cuéntanos por qué consideras que esta reseña
                  debe ser revisada por nuestro equipo.
                </p>

                <form onSubmit={manejarReporteResena}>
                  <label htmlFor="motivo-reporte">
                    Motivo del reporte
                  </label>

                  <select
                    id="motivo-reporte"
                    value={motivoReporte}
                    onChange={(e) => setMotivoReporte(e.target.value)}
                    required
                    disabled={enviandoReporte}
                  >
                    <option value="">Selecciona un motivo</option>
                    <option value="ofensivo">
                      Lenguaje ofensivo o insultos
                    </option>
                    <option value="acoso_amenazas">
                      Acoso o amenazas
                    </option>
                    <option value="discriminacion">
                      Discriminación
                    </option>
                    <option value="spam_publicidad">
                      Spam o publicidad
                    </option>
                    <option value="informacion_falsa">
                      Información falsa
                    </option>
                    <option value="otro">
                      Otro motivo
                    </option>
                  </select>

                  <label htmlFor="descripcion-reporte">
                    Descripción adicional
                    <span> (opcional)</span>
                  </label>

                  <textarea
                    id="descripcion-reporte"
                    value={descripcionReporte}
                    onChange={(e) =>
                      setDescripcionReporte(e.target.value)
                    }
                    placeholder="Explica brevemente el motivo del reporte..."
                    maxLength={500}
                    rows={4}
                    disabled={enviandoReporte}
                  />

                  <small className="reporte-caracteres">
                    {descripcionReporte.length}/500 caracteres
                  </small>

                  {errorReporte && (
                    <p className="reporte-error">
                      {errorReporte}
                    </p>
                  )}

                  <div className="reporte-modal-acciones">
                    <button
                      type="button"
                      onClick={cerrarFormularioReporte}
                      disabled={enviandoReporte}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={enviandoReporte || !motivoReporte}
                    >
                      {enviandoReporte
                        ? "Enviando..."
                        : "Enviar reporte"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="reporte-exito">
                <span>✓</span>
                <h2>Reporte enviado</h2>
                <p>
                  Gracias por ayudarnos a mantener una comunidad
                  respetuosa. Tu reporte quedó registrado para su revisión.
                </p>

                <button
                  type="button"
                  onClick={cerrarFormularioReporte}
                >
                  Entendido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recomendaciones;
