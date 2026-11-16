import mapaImagen from "../../image/mapa_login.png";
import chatImagen from "../../image/conversacion_login.png";
import resenasImagen from "../../image/Comentario_login.png";
import negocioImagen from "../../image/tu_negocio_aqui_login.png";

import { useState, useEffect } from "react";
import { MapPin, Star, Store } from "lucide-react";
import "./CarruselComunidad.css";

const INTERVALO = 3000;

const DIAPOSITIVAS = [
  {
    id: "mapa",
    titulo: "Encuentra servicios cerca de ti",
    texto: "Plomeros, tortillerías, costureras y más, ubicados en el mapa de tu colonia.",
    imagen: mapaImagen,
    alt: "Mapa de servicios cercanos"
  },
  {
    id: "chat",
    titulo: "Escríbele directo a quien lo ofrece",
    texto: "Mensajes privados dentro de la plataforma, sin salir a otras aplicaciones.",
    imagen: chatImagen,
    alt: "Conversación entre usuarios"
  },
  {
    id: "resenas",
    titulo: "Elige con reseñas de tus vecinos",
    texto: "Calificaciones con estrellas y comentarios de personas que ya contrataron.",
    imagen: resenasImagen,
    alt: "Reseñas de clientes"
  },
  {
    id: "negocio",
    titulo: "Da a conocer tu negocio",
    texto: "Publica tus servicios y llega a más clientes de tu comunidad.",
    imagen: negocioImagen,
    alt: "Promoción de negocio local"
  }
];

function CarruselComunidad() {
  const [indice, setIndice] = useState(0);
  const [sobre, setSobre] = useState(false);

  // Respeta a quien prefiere menos movimiento: sin avance automático.
  const sinMovimiento =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (sobre || sinMovimiento) return;
    const timer = setInterval(() => {
      setIndice((actual) => (actual + 1) % DIAPOSITIVAS.length);
    }, INTERVALO);
    return () => clearInterval(timer);
  }, [sobre, sinMovimiento]);

  return (
    <div
      className="cc"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Qué puedes hacer en ConectaLocal"
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      onFocus={() => setSobre(true)}
      onBlur={() => setSobre(false)}
    >
      <div className="cc-vista" aria-live={sobre ? "polite" : "off"}>
        {DIAPOSITIVAS.map(({ id, titulo, texto, imagen, alt }, i) => (
          <article
            key={id}
            className={`cc-slide ${i === indice ? "activa" : ""}`}
            aria-hidden={i !== indice}
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${DIAPOSITIVAS.length}`}
          >
            <img src={imagen} alt={alt} className="cc-imagen"  />
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </article>
        ))}
      </div>

      <div className="cc-controles">
        <div className="cc-puntos">
          {DIAPOSITIVAS.map((d, i) => (
            <button
              key={d.id}
              type="button"
              className={`cc-punto ${i === indice ? "activo" : ""}`}
              onClick={() => setIndice(i)}
              aria-label={`Ir a: ${d.titulo}`}
              aria-current={i === indice}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CarruselComunidad;
