
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Store,
  ImagePlus,
  Trash2,
  Images,
  LoaderCircle
} from "lucide-react";

import {
  obtenerMisNegocios,
  obtenerFotosNegocio,
  agregarFotosNegocio,
  eliminarFotoNegocio
} from "../../services/trabajadorService";

import "./GaleriaNegocio.css";

const GaleriaNegocio = () => {
  const { negocioId } = useParams();
  const navigate = useNavigate();

  const [negocio, setNegocio] = useState(null);
  const [fotografias, setFotografias] = useState([]);
  const [archivos, setArchivos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState("");

  const cargarGaleria = async () => {
    try {
      setLoading(true);
      setError("");

      const [dataNegocios, dataFotos] = await Promise.all([
        obtenerMisNegocios(),
        obtenerFotosNegocio(negocioId)
      ]);

      const negocioEncontrado = (dataNegocios.negocios || [])
        .find((item) => item.id === negocioId);

      if (!negocioEncontrado) {
        throw new Error("No se encontró el negocio solicitado.");
      }

      setNegocio(negocioEncontrado);
      setFotografias(dataFotos.fotografias || []);

    } catch (err) {
      console.error("Error al cargar galería:", err);
      setError(err.message || "No fue posible cargar la galería.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarGaleria();
  }, [negocioId]);

  const seleccionarFotografias = (e) => {
    const seleccionadas = Array.from(e.target.files || []);

    const disponibles = 5 - fotografias.length;

    if (seleccionadas.length > disponibles) {
      alert(`Solo puedes agregar ${disponibles} fotografía(s) más.`);
      e.target.value = "";
      return;
    }

    setArchivos(seleccionadas);
  };

  const manejarSubida = async () => {
    if (archivos.length === 0) return;

    try {
      setSubiendo(true);

      await agregarFotosNegocio(
        negocioId,
        archivos,
        archivos.map(() => "")
      );

      setArchivos([]);

      await cargarGaleria();

      alert("¡Fotografías agregadas correctamente!");

    } catch (err) {
      console.error("Error al subir fotografías:", err);
      alert(err.message || "No fue posible subir las fotografías.");
    } finally {
      setSubiendo(false);
    }
  };

  const manejarEliminacion = async (fotoId) => {
    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar esta fotografía?"
    );

    if (!confirmar) return;

    try {
      setEliminandoId(fotoId);

      await eliminarFotoNegocio(negocioId, fotoId);

      setFotografias((actuales) =>
        actuales.filter((foto) => foto.id !== fotoId)
      );

    } catch (err) {
      console.error("Error al eliminar fotografía:", err);
      alert(err.message || "No fue posible eliminar la fotografía.");
    } finally {
      setEliminandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="gn-cargando">
        <LoaderCircle className="gn-spinner" size={32} />
        <p>Cargando galería...</p>
      </div>
    );
  }

  if (error || !negocio) {
    return (
      <div className="gn-contenedor">
        <button
          className="gn-volver"
          onClick={() => navigate("/trabajador")}
        >
          <ArrowLeft size={18} />
          Volver al dashboard
        </button>

        <p className="gn-error">{error}</p>
      </div>
    );
  }

  const disponibles = 5 - fotografias.length;

  return (
    <main className="gn-contenedor">

      <button
        className="gn-volver"
        onClick={() => navigate("/trabajador")}
      >
        <ArrowLeft size={18} />
        Volver a mis negocios
      </button>

      <header className="gn-encabezado">
        <div>
          <span className="gn-etiqueta">ADMINISTRACIÓN DEL NEGOCIO</span>
          <h1>{negocio.nombre}</h1>
          <p>Gestiona las fotografías de tu establecimiento.</p>
        </div>

        <div className="gn-icono">
          <Images size={30} />
        </div>
      </header>

      <section className="gn-principal">
        <div className="gn-seccion-titulo">
          <div>
            <h2>Fotografía principal</h2>
            <p>Esta imagen aparece como portada de tu negocio.</p>
          </div>
        </div>

        <div className="gn-foto-principal">
          {negocio.foto_principal_url ? (
            <img
              src={negocio.foto_principal_url}
              alt={negocio.nombre}
            />
          ) : (
            <div className="gn-sin-foto">
              <Store size={42} />
              <span>Sin fotografía principal</span>
            </div>
          )}
        </div>
      </section>

      <section className="gn-galeria">

        <div className="gn-seccion-titulo">
          <div>
            <h2>Galería de fotografías</h2>
            <p>
              Puedes agregar hasta 5 fotografías adicionales.
            </p>
          </div>

          <span className="gn-contador">
            {fotografias.length}/5
          </span>
        </div>

        <div className="gn-carga">
          <label className="gn-seleccionar">
            <ImagePlus size={19} />
            Seleccionar fotografías

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              disabled={disponibles === 0 || subiendo}
              onChange={seleccionarFotografias}
            />
          </label>

          <span>
            {disponibles > 0
              ? `Puedes agregar ${disponibles} más.`
              : "Has alcanzado el límite de fotografías."}
          </span>
        </div>

        {archivos.length > 0 && (
          <div className="gn-archivos-pendientes">
            <p>{archivos.length} fotografía(s) seleccionada(s).</p>

            <button
              className="gn-subir"
              onClick={manejarSubida}
              disabled={subiendo}
            >
              {subiendo ? "Subiendo..." : "Subir fotografías"}
            </button>
          </div>
        )}

        {fotografias.length === 0 ? (
          <div className="gn-vacio">
            <Images size={42} />
            <h3>Aún no tienes fotografías adicionales</h3>
            <p>Agrega imágenes para mostrar más de tu negocio.</p>
          </div>
        ) : (
          <div className="gn-grid">
            {fotografias.map((foto) => (
              <article className="gn-foto-card" key={foto.id}>
                <img
                  src={foto.url}
                  alt={foto.descripcion || negocio.nombre}
                />

                <div className="gn-foto-info">
                  <p>{foto.descripcion || "Sin descripción"}</p>

                  <button
                    className="gn-eliminar"
                    onClick={() => manejarEliminacion(foto.id)}
                    disabled={eliminandoId === foto.id}
                    aria-label="Eliminar fotografía"
                  >
                    {eliminandoId === foto.id
                      ? <LoaderCircle size={17} />
                      : <Trash2 size={17} />}
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

      </section>

    </main>
  );
};

export default GaleriaNegocio;
