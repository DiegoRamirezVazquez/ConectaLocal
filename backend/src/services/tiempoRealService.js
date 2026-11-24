
const supabaseAdmin = require('../config/supabaseAdmin');

const clientesConectados = new Set();

let canalForo = null;
let suscripcionIniciada = false;

/**
 * Envía una notificación a todos los clientes conectados.
 * No se envían datos privados de las publicaciones:
 * el frontend volverá a consultar la información mediante su API.
 */
function notificarCambiosForo(payload) {
  const evento = {
    tipo: 'foro_actualizado',
    tabla: payload.table,
    operacion: payload.eventType,
    fecha: new Date().toISOString()
  };

  const mensaje = `data: ${JSON.stringify(evento)}\n\n`;

  for (const cliente of clientesConectados) {
    try {
      cliente.write(mensaje);
    } catch (error) {
      clientesConectados.delete(cliente);
    }
  }
}

/**
 * Inicia una única suscripción de Supabase Realtime.
 * Escucha cambios en las tablas que utiliza el foro.
 */
function iniciarSuscripcionForo() {
  if (suscripcionIniciada) {
    return;
  }

  suscripcionIniciada = true;

  canalForo = supabaseAdmin
    .channel('foro-tiempo-real')

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'publicaciones'
      },
      notificarCambiosForo
    )

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comentarios'
      },
      notificarCambiosForo
    )

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reacciones_publicacion'
      },
      notificarCambiosForo
    )

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fotos_publicacion'
      },
      notificarCambiosForo
    )

    .subscribe((estado, error) => {
      if (estado === 'SUBSCRIBED') {
        console.log('Supabase Realtime: foro conectado correctamente.');
      }

      if (estado === 'CHANNEL_ERROR') {
        console.error('Error en Supabase Realtime:', error);
      }

      if (estado === 'TIMED_OUT') {
        console.error('Supabase Realtime: tiempo de conexión agotado.');
      }

      if (estado === 'CLOSED') {
        console.warn('Supabase Realtime: canal cerrado.');
      }
    });
}

/**
 * Registra un cliente conectado mediante SSE.
 */
function agregarCliente(res) {
  clientesConectados.add(res);

  console.log(
    `Cliente conectado al foro en tiempo real. Total: ${clientesConectados.size}`
  );
}

/**
 * Desconecta un cliente SSE.
 */
function eliminarCliente(res) {
  clientesConectados.delete(res);

  console.log(
    `Cliente desconectado del foro. Total: ${clientesConectados.size}`
  );
}

module.exports = {
  iniciarSuscripcionForo,
  agregarCliente,
  eliminarCliente
};
