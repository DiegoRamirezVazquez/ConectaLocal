
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Abre una conexión SSE autenticada con el backend.
 * Cuando ocurre un cambio en el foro, ejecuta onActualizacion.
 */
export function conectarEventosForo(onActualizacion, onEstado) {
  if (!API_URL) {
    console.error('No está configurada la variable VITE_API_URL.');
    onEstado?.('error');
    return () => {};
  }

  const eventos = new EventSource(`${API_URL}/eventos/foro`, {
    withCredentials: true
  });

  eventos.onopen = () => {
    console.log('Conexión en tiempo real del foro establecida.');
    onEstado?.('conectado');
  };

  eventos.onmessage = (event) => {
    try {
      const datos = JSON.parse(event.data);

      if (datos.tipo === 'foro_actualizado') {
        onActualizacion?.(datos);
      }
    } catch (error) {
      console.error('No se pudo procesar el evento del foro:', error);
    }
  };

  eventos.onerror = () => {
    // EventSource intenta reconectarse automáticamente.
    onEstado?.('reconectando');
  };

  // Esta función debe ejecutarse al desmontar el componente.
  return () => {
    eventos.close();
    console.log('Conexión en tiempo real del foro cerrada.');
  };
}
