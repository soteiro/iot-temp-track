// =====================================
// IMPORTS Y CONFIGURACIÓN INICIAL
// =====================================

// Hono: Framework web ultraligero para Cloudflare Workers, similar a Express.js
// Diseñado específicamente para trabajar en edge computing environments
import { Hono } from "hono";

// upgradeWebSocket: Middleware de Hono para manejar conexiones WebSocket en Cloudflare Workers
// Permite la comunicación bidireccional en tiempo real entre cliente y servidor
import { upgradeWebSocket } from "hono/cloudflare-workers";

// Importamos nuestro broker MQTT personalizado optimizado para Cloudflare Workers
// Este broker implementa una versión simplificada del protocolo MQTT usando WebSocket + JSON
import { CloudflareWorkerMQTTBroker, MQTTMessage } from "./simple-broker";

// =====================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =====================================

// Creamos la instancia principal de Hono que manejará todas las rutas HTTP y WebSocket
// Hono es similar a Express.js pero optimizado para Workers y edge environments
const app = new Hono();

// Creamos una instancia única del broker MQTT que se mantendrá en memoria
// durante la ejecución del Worker. Esta instancia manejará todos los clientes
// y mensajes MQTT de manera centralizada.
const broker = new CloudflareWorkerMQTTBroker();

// =====================================
// RUTAS HTTP - API REST DEL BROKER
// =====================================

// Ruta principal: Proporciona información básica sobre el broker
// Útil para verificar que el servicio está funcionando y conocer los endpoints disponibles
app.get("/", (c) => {
  return c.json({
    service: "IoT Temperature Tracking MQTT Broker",
    version: "1.0.0",
    status: "running",
    endpoints: {
      websocket: "/mqtt",           // Endpoint para conexiones WebSocket MQTT
      stats: "/stats",              // Estadísticas del broker
      publish: "/publish",          // Publicar mensajes via HTTP
      topics: "/topics",            // Lista de topics activos
      clients: "/clients"           // Lista de clientes conectados
    },
    description: "Broker MQTT personalizado para dispositivos IoT utilizando WebSocket sobre Cloudflare Workers",
    protocolInfo: {
      transport: "WebSocket",
      messageFormat: "JSON",
      features: ["publish/subscribe", "retained messages", "topic wildcards", "client management"]
    }
  });
});

// Endpoint para obtener estadísticas del broker en tiempo real
// Proporciona información crucial para monitoreo y debugging del sistema
app.get("/stats", (c) => {
  const stats = broker.getStats();
  
  return c.json({
    ...stats,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(stats.uptime / 1000)} segundos`,
    description: "Estadísticas en tiempo real del broker MQTT"
  });
});

// Endpoint HTTP para publicar mensajes directamente via REST API
// Alternativa a WebSocket para casos donde solo se necesita enviar mensajes
// Útil para integración con sistemas que no soportan WebSocket
app.post("/publish", async (c) => {
  try {
    // Extraemos los datos del cuerpo de la petición HTTP
    const { topic, message, retain } = await c.req.json();
    
    // Validación básica de parámetros requeridos
    if (!topic || message === undefined) {
      return c.json({ 
        error: "Los campos 'topic' y 'message' son obligatorios",
        example: {
          topic: "temperature/sensor1",
          message: "23.5",
          retain: false
        }
      }, 400);
    }
    
    // Crear objeto de mensaje MQTT con los datos recibidos
    // Convertimos cualquier tipo de dato a string para compatibilidad
    const mqttMessage: MQTTMessage = {
      topic,
      payload: typeof message === 'string' ? message : JSON.stringify(message),
      retain: retain || false,
      qos: 0, // QoS 0 = "fire and forget" (envío sin confirmación de recepción)
      timestamp: new Date().toISOString()
    };
    
    // Publicar el mensaje a través del broker
    // Esto enviará el mensaje a todos los clientes suscritos al topic
    broker.publish(mqttMessage);
    
    return c.json({ 
      success: true, 
      message: "Mensaje publicado correctamente",
      details: {
        topic,
        messageLength: mqttMessage.payload.length,
        retained: mqttMessage.retain,
        timestamp: mqttMessage.timestamp,
        subscribersNotified: "Todos los clientes suscritos al topic han sido notificados"
      }
    });
    
  } catch (error) {
    console.error("Error al publicar mensaje:", error);
    return c.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, 500);
  }
});

// Endpoint para listar todos los topics activos con información detallada
// Un topic está "activo" si tiene suscripciones o mensajes retenidos
app.get("/topics", (c) => {
  const topics = broker.getActiveTopics();
  
  return c.json({
    topics,
    count: topics.length,
    timestamp: new Date().toISOString(),
    description: "Lista de topics con actividad reciente (suscripciones o mensajes retenidos)",
    examples: [
      "temperature/sensor1",
      "humidity/+",           // + es wildcard para un nivel
      "sensors/#"             // # es wildcard para múltiples niveles
    ]
  });
});

// Endpoint para obtener información sobre clientes conectados
// Útil para monitorear la actividad y debugging de conexiones
app.get("/clients", (c) => {
  return c.json({
    connectedClients: broker.getConnectedClients(),
    totalClients: broker.getStats().connectedClients,
    timestamp: new Date().toISOString(),
    description: "Lista de clientes actualmente conectados al broker"
  });
});

// =====================================
// WEBSOCKET HANDLER - PROTOCOLO MQTT
// =====================================

// Endpoint WebSocket que implementa nuestro protocolo MQTT personalizado
// Los clientes IoT se conectan aquí para intercambiar mensajes en tiempo real
app.get("/mqtt", upgradeWebSocket((c) => {
  
  // Variable para almacenar el ID del cliente una vez que se conecte
  // En MQTT, cada cliente debe tener un ID único para identificar la sesión
  let clientId: string | null = null;

  return {
    // =====================================
    // EVENTO: CONEXIÓN ESTABLECIDA
    // =====================================
    
    // Se ejecuta cuando un cliente establece la conexión WebSocket exitosamente
    // En este punto solo tenemos el canal de comunicación, pero aún no hay sesión MQTT
    onOpen(evt: any, ws: any) {
      console.log("[WebSocket] Nueva conexión WebSocket establecida");
      
      // Generamos un ID único temporal para esta conexión
      // El cliente puede luego especificar su propio ID en el mensaje CONNECT
      const temporaryId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Guardamos el ID en el objeto WebSocket para acceso rápido
      (ws as any).clientId = temporaryId;
      
      // Registramos el cliente en el broker inmediatamente
      // Esto permite gestionar la conexión desde el primer momento
      broker.registerClient(temporaryId, ws);
      
      console.log(`[MQTT] Cliente temporal registrado: ${temporaryId}`);
      
      // Enviamos un mensaje de bienvenida siguiendo el protocolo MQTT
      // CONNACK = Connection Acknowledgment
      const welcomeMessage = {
        type: 'connack',
        returnCode: 0,           // 0 = Conexión aceptada
        sessionPresent: false,   // Nueva sesión (no hay estado previo)
        clientId: temporaryId,
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(welcomeMessage));
    },

    // =====================================
    // EVENTO: MENSAJE RECIBIDO
    // =====================================
    
    // Se ejecuta cada vez que recibimos un mensaje del cliente
    // Los mensajes siguen nuestro protocolo MQTT adaptado para JSON over WebSocket
    onMessage(evt: any, ws: any) {
      try {
        // Parseamos el mensaje JSON enviado por el cliente
        const data = JSON.parse(evt.data);
        
        // Obtenemos el ID del cliente de la conexión WebSocket
        let currentClientId = (ws as any).clientId;
        
        // Si por alguna razón no tenemos clientId, lo regeneramos
        // Esto es una medida de seguridad para mantener la robustez del sistema
        if (!currentClientId) {
          currentClientId = `recovered-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          (ws as any).clientId = currentClientId;
          broker.registerClient(currentClientId, ws);
          console.log(`[MQTT] Cliente recuperado con ID: ${currentClientId}`);
        }
        
        console.log(`[WebSocket] Mensaje recibido de cliente ${currentClientId}:`, data);

        // =====================================
        // SWITCH PRINCIPAL - TIPOS DE MENSAJE MQTT
        // =====================================
        
        // El protocolo MQTT define varios tipos de mensajes para diferentes operaciones
        switch (data.type) {
          
          // =====================================
          // CONNECT: Establecer sesión MQTT
          // =====================================
          case 'connect':
            // El cliente solicita establecer una sesión MQTT con un ID específico
            console.log(`[MQTT] Cliente ${currentClientId} solicita conexión MQTT`);
            
            // Si el cliente proporciona un ID específico, lo usamos
            if (data.clientId && data.clientId !== currentClientId) {
              // Desregistramos el ID temporal
              broker.unregisterClient(currentClientId);
              
              // Adoptamos el nuevo ID
              currentClientId = data.clientId;
              (ws as any).clientId = currentClientId;
              
              // Registramos con el nuevo ID
              broker.registerClient(currentClientId, ws);
              console.log(`[MQTT] Cliente re-registrado con ID específico: ${currentClientId}`);
            }
            
            // Enviamos confirmación de conexión (CONNACK)
            const connack = {
              type: 'connack',
              returnCode: 0,           // 0 = Conexión exitosa
              sessionPresent: false,   // Nueva sesión
              clientId: currentClientId,
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(connack));
            break;
          
          // =====================================
          // SUBSCRIBE: Suscribirse a un topic
          // =====================================
          case 'subscribe':
            if (data.topic) {
              // El cliente quiere recibir mensajes de este topic
              broker.subscribe(currentClientId, data.topic);
              console.log(`[MQTT] Cliente ${currentClientId} suscrito a topic: ${data.topic}`);
              
              // Enviamos confirmación de suscripción (SUBACK)
              const suback = {
                type: 'suback',
                messageId: data.messageId || 1,
                returnCodes: [0],        // [0] = QoS 0 concedido
                topic: data.topic,
                timestamp: new Date().toISOString()
              };
              ws.send(JSON.stringify(suback));
              
              // Si hay mensajes retenidos para este topic, los enviamos inmediatamente
              // Los mensajes retenidos son la última información conocida de un topic
              const retainedMessage = broker.getRetainedMessage(data.topic);
              if (retainedMessage) {
                const retainedPublish = {
                  type: 'publish',
                  topic: retainedMessage.topic,
                  payload: retainedMessage.payload,
                  qos: retainedMessage.qos,
                  retain: true,
                  timestamp: retainedMessage.timestamp
                };
                ws.send(JSON.stringify(retainedPublish));
                console.log(`[MQTT] Mensaje retenido enviado a ${currentClientId} para topic ${data.topic}`);
              }
            } else {
              console.error(`[MQTT] Solicitud de suscripción sin topic del cliente ${currentClientId}`);
            }
            break;
          
          // =====================================
          // UNSUBSCRIBE: Cancelar suscripción
          // =====================================
          case 'unsubscribe':
            if (data.topic) {
              // El cliente ya no quiere recibir mensajes de este topic
              broker.unsubscribe(currentClientId, data.topic);
              console.log(`[MQTT] Cliente ${currentClientId} desuscrito del topic: ${data.topic}`);
              
              // Enviamos confirmación de desuscripción (UNSUBACK)
              const unsuback = {
                type: 'unsuback',
                messageId: data.messageId || 1,
                topic: data.topic,
                timestamp: new Date().toISOString()
              };
              ws.send(JSON.stringify(unsuback));
            } else {
              console.error(`[MQTT] Solicitud de desuscripción sin topic del cliente ${currentClientId}`);
            }
            break;
          
          // =====================================
          // PUBLISH: Publicar mensaje
          // =====================================
          case 'publish':
            if (data.topic && data.payload !== undefined) {
              console.log(`[MQTT] Cliente ${currentClientId} publica en topic ${data.topic}:`, data.payload);
              
              // Creamos el mensaje MQTT y lo distribuimos a suscriptores
              const mqttMessage: MQTTMessage = {
                topic: data.topic,
                payload: data.payload,
                qos: data.qos || 0,
                retain: data.retain || false,
                timestamp: new Date().toISOString()
              };
              
              // El broker se encarga de enviar el mensaje a todos los suscriptores
              broker.publish(mqttMessage);
              
              // Si el QoS es mayor a 0, enviamos confirmación de publicación (PUBACK)
              // QoS 0 = fire and forget, QoS 1 = at least once, QoS 2 = exactly once
              if (data.qos > 0) {
                const puback = {
                  type: 'puback',
                  messageId: data.messageId || 1,
                  timestamp: new Date().toISOString()
                };
                ws.send(JSON.stringify(puback));
              }
            } else {
              console.error(`[MQTT] Mensaje de publicación inválido del cliente ${currentClientId}:`, data);
            }
            break;
          
          // =====================================
          // PING: Keep-Alive del cliente
          // =====================================
          case 'ping':
            // El cliente envía ping para mantener la conexión viva
            // Respondemos con pong para confirmar que estamos activos
            const pong = {
              type: 'pingresp',
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(pong));
            console.log(`[MQTT] Ping/Pong con cliente ${currentClientId}`);
            break;
          
          // =====================================
          // DISCONNECT: Desconexión limpia
          // =====================================
          case 'disconnect':
            // El cliente solicita desconectarse de forma ordenada
            console.log(`[MQTT] Cliente ${currentClientId} solicita desconexión`);
            broker.unregisterClient(currentClientId);
            ws.close();
            break;
          
          // =====================================
          // TIPO DE MENSAJE NO RECONOCIDO
          // =====================================
          default:
            console.log(`[MQTT] Tipo de mensaje no soportado: ${data.type} del cliente ${currentClientId}`);
            
            // Opcional: enviar mensaje de error al cliente
            const error = {
              type: 'error',
              message: `Tipo de mensaje no soportado: ${data.type}`,
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(error));
        }
        
      } catch (error) {
        // Manejo de errores en el procesamiento de mensajes
        console.error('[MQTT] Error procesando mensaje:', error);
        console.error('[MQTT] Datos del mensaje:', evt.data);
        
        // Enviamos error al cliente para debugging
        try {
          const errorMessage = {
            type: 'error',
            message: 'Error procesando mensaje',
            details: error instanceof Error ? error.message : 'Error desconocido',
            timestamp: new Date().toISOString()
          };
          (evt.target as any).send(JSON.stringify(errorMessage));
        } catch (sendError) {
          console.error('[MQTT] Error enviando mensaje de error:', sendError);
        }
      }
    },

    // =====================================
    // EVENTO: CONEXIÓN CERRADA
    // =====================================
    
    // Se ejecuta cuando la conexión WebSocket se cierra (por cualquier motivo)
    onClose(evt: any, ws: any) {
      const currentClientId = (ws as any).clientId;
      
      if (currentClientId) {
        // Limpiamos el cliente del broker para liberar recursos
        broker.unregisterClient(currentClientId);
        console.log(`[MQTT] Cliente desconectado limpiamente: ${currentClientId}`);
      } else {
        console.log('[MQTT] WebSocket cerrado sin clientId identificado');
      }
    },

    // =====================================
    // EVENTO: ERROR EN CONEXIÓN
    // =====================================
    
    // Se ejecuta cuando hay un error en la conexión WebSocket
    onError(evt: any, ws: any) {
      console.error('[WebSocket] Error en conexión:', evt);
      
      const currentClientId = (ws as any).clientId;
      if (currentClientId) {
        // En caso de error, limpiamos el cliente del broker
        broker.unregisterClient(currentClientId);
        console.log(`[MQTT] Cliente desregistrado por error: ${currentClientId}`);
      }
    }
  };
}));

// =====================================
// EXPORTACIÓN DE LA APLICACIÓN
// =====================================

// Exportamos la aplicación Hono para que Cloudflare Workers pueda ejecutarla
// Este es el punto de entrada principal del Worker
export default app;
