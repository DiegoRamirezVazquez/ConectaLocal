
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  obtenerNegocioPublico,
  obtenerResenasNegocio,
  obtenerMuroResenas
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
      const fin = inicio + TARJETAS_POR_CAMBIO;

      setResenasVisibles((anteriores) => {
        const siguientes = [...anteriores];

        // Las reseñas que están fuera del bloque no pueden repetirse.
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

        // Sustituir solamente las posiciones que tengan reseñas nuevas.
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
    </div>
  );
};

export default Recomendaciones;
