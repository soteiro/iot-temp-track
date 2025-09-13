// =====================================
// IMPORTS Y CONFIGURACIÓN INICIAL
// =====================================

// Hono: Framework web ultraligero para Cloudflare Workers, similar a Express.js
import { Hono } from "hono";

// upgradeWebSocket: Middleware de Hono para manejar conexiones WebSocket en Cloudflare Workers
import { upgradeWebSocket } from "hono/cloudflare-workers";

// Importamos nuestro broker MQTT personalizado optimizado para Cloudflare Workers
import { CloudflareWorkerMQTTBroker, MQTTMessage } from "./simple-broker";

// =====================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =====================================

// Creamos la instancia principal de Hono que manejará todas las rutas HTTP y WebSocket
const app = new Hono();

// Creamos una instancia única del broker MQTT que se mantendrá en memoria
// durante la ejecución del Worker. Esta instancia manejará todos los clientes
// y mensajes MQTT de manera centralizada.
const broker = new CloudflareWorkerMQTTBroker();

// =====================================
// RUTAS HTTP - API REST DEL BROKER
// =====================================

// Ruta principal: Proporciona información básica sobre el broker
// Útil para verificar que el servicio está funcionando
app.get("/", (c) => {
  return c.json({
    service: "IoT Temperature Tracking MQTT Broker",
    version: "1.0.0",
    status: "running",
    endpoints: {
      websocket: "/mqtt",
      stats: "/stats",
      publish: "/publish",
      topics: "/topics"
    },
    description: "Broker MQTT personalizado para dispositivos IoT utilizando WebSocket sobre Cloudflare Workers"
  });
});

// Endpoint para obtener estadísticas del broker en tiempo real
// Muestra información útil para monitoreo y debugging
app.get("/stats", (c) => {
  const stats = broker.getStats();
  
  return c.json({
    ...stats,
    timestamp: new Date().toISOString(),
    uptime: "Calculado desde el inicio del Worker"
  });
});

// Endpoint HTTP para publicar mensajes directamente via REST API
// Alternativa a WebSocket para casos donde solo se necesita enviar mensajes
app.post("/publish", async (c) => {
  try {
    // Extraemos los datos del cuerpo de la petición HTTP
    const { topic, message, retain } = await c.req.json();
    
    // Validación básica de parámetros requeridos
    if (!topic || message === undefined) {
      return c.json({ 
        error: "Los campos 'topic' y 'message' son obligatorios" 
      }, 400);
    }
    
    // Crear objeto de mensaje MQTT con los datos recibidos
    const mqttMessage: MQTTMessage = {
      topic,
      payload: typeof message === 'string' ? message : JSON.stringify(message),
      retain: retain || false,
      qos: 0, // QoS 0 = "fire and forget" (envío sin confirmación)
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
        subscribersNotified: "Calculado internamente por el broker"
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
// Útil para debugging y monitoreo de la actividad del broker
app.get("/topics", (c) => {
  const topics = broker.getActiveTopics();
  
  return c.json({
    topics,
    count: topics.length,
    timestamp: new Date().toISOString(),
    description: "Lista de topics con actividad reciente (suscripciones o mensajes retenidos)"
  });
});

// Ruta para estadísticas del broker
app.get("/broker/stats", (c) => {
  return c.json({
    ...broker.getStats(),
    clients: broker.getConnectedClients(),
    retainedTopics: broker.getRetainedTopics()
  });
});

// Ruta para publicar mensajes via HTTP (para testing)
app.post("/broker/publish", async (c) => {
  try {
    const { topic, message, qos = 0, retain = false } = await c.req.json();
    
    if (!topic || message === undefined) {
      return c.json({ error: "Topic y message son requeridos" }, 400);
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    broker.publish({
      topic,
      payload,
      qos,
      retain
    });

    return c.json({
      success: true,
      topic,
      message,
      qos,
      retain,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error publicando mensaje:', error);
    return c.json({ error: "Error procesando la solicitud" }, 500);
  }
});

// Ruta para obtener tópicos disponibles
app.get("/broker/topics", (c) => {
  return c.json({
    retainedTopics: broker.getRetainedTopics(),
    suggestedTopics: [
      "temperature/sensor1",
      "temperature/sensor2", 
      "temperature/sensor3",
      "humidity/sensor1",
      "humidity/sensor2",
      "status/+",
      "alerts/+"
    ]
  });
});

// Ruta para obtener clientes conectados
app.get("/broker/clients", (c) => {
  return c.json({
    connectedClients: broker.getConnectedClients(),
    totalClients: broker.getStats().connectedClients
  });
});

// Ruta para limpieza manual
app.post("/broker/cleanup", (c) => {
  broker.cleanup();
  return c.json({
    message: "Limpieza ejecutada",
    stats: broker.getStats()
  });
});

// WebSocket para MQTT
app.get("/mqtt", upgradeWebSocket((c) => ({
  onOpen(evt: any, ws: any) {
    console.log('WebSocket connection opened for MQTT');
    
    // Generar ID único para el cliente
    const clientId = `ws-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Guardar clientId en el WebSocket INMEDIATAMENTE
    (ws as any).clientId = clientId;
    
    // Registrar cliente en el broker
    broker.registerClient(clientId, ws);
    
    console.log(`[MQTT] Cliente registrado: ${clientId}`);
    
    // Enviar mensaje de bienvenida
    const welcomeMessage = {
      type: 'connack',
      returnCode: 0,
      sessionPresent: false,
      clientId: clientId
    };
    
    ws.send(JSON.stringify(welcomeMessage));
  },
  
  onMessage(evt: any, ws: any) {
    try {
      const data = JSON.parse(evt.data);
      let clientId = (ws as any).clientId;
      
      // Si no tenemos clientId, intentar obtenerlo del mensaje o generar uno nuevo
      if (!clientId) {
        if (data.clientId) {
          clientId = data.clientId;
          (ws as any).clientId = clientId;
          broker.registerClient(clientId, ws);
        } else {
          clientId = `ws-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          (ws as any).clientId = clientId;
          broker.registerClient(clientId, ws);
        }
        console.log(`[MQTT] Cliente re-registrado: ${clientId}`);
      }
      
      console.log(`[MQTT] Mensaje recibido de cliente ${clientId}:`, data);
      
      switch (data.type) {
        case 'connect':
          // Manejar conexión MQTT explícita
          if (data.clientId && data.clientId !== clientId) {
            // Actualizar clientId si se proporciona uno específico
            broker.unregisterClient(clientId);
            clientId = data.clientId;
            (ws as any).clientId = clientId;
            broker.registerClient(clientId, ws);
          }
          
          const connack = {
            type: 'connack',
            returnCode: 0,
            sessionPresent: false,
            clientId: clientId
          };
          ws.send(JSON.stringify(connack));
          break;
          
        case 'subscribe':
          if (data.topic) {
            broker.subscribe(clientId, data.topic);
            console.log(`[MQTT] Cliente ${clientId} suscrito a ${data.topic}`);
            
            // Enviar confirmación de suscripción
            const suback = {
              type: 'suback',
              messageId: data.messageId || 1,
              returnCodes: [0], // QoS 0 granted
              topic: data.topic
            };
            ws.send(JSON.stringify(suback));
          }
          break;
          
        case 'unsubscribe':
          if (data.topic) {
            broker.unsubscribe(clientId, data.topic);
            console.log(`[MQTT] Cliente ${clientId} desuscrito de ${data.topic}`);
            
            // Enviar confirmación de desuscripción
            const unsuback = {
              type: 'unsuback',
              messageId: data.messageId || 1,
              topic: data.topic
            };
            ws.send(JSON.stringify(unsuback));
          }
          break;
          
        case 'publish':
          if (data.topic && data.payload !== undefined) {
            console.log(`[MQTT] Cliente ${clientId} publicando en ${data.topic}:`, data.payload);
            
            broker.publish({
              topic: data.topic,
              payload: data.payload,
              qos: data.qos || 0,
              retain: data.retain || false
            });
            
            // Enviar confirmación de publicación si QoS > 0
            if (data.qos > 0) {
              const puback = {
                type: 'puback',
                messageId: data.messageId || 1
              };
              ws.send(JSON.stringify(puback));
            }
          } else {
            console.error(`[MQTT] Mensaje de publicación inválido del cliente ${clientId}:`, data);
          }
          break;
          
        case 'ping':
          const pong = {
            type: 'pingresp'
          };
          ws.send(JSON.stringify(pong));
          break;
          
        default:
          console.log(`[MQTT] Tipo de mensaje no soportado: ${data.type} del cliente ${clientId}`);
      }
    } catch (error) {
      console.error('[MQTT] Error procesando mensaje:', error);
      console.error('[MQTT] Datos del mensaje:', evt.data);
    }
  },
  
  onClose(evt: any, ws: any) {
    const clientId = (ws as any).clientId;
    if (clientId) {
      broker.unregisterClient(clientId);
      console.log(`[MQTT] Cliente desconectado: ${clientId}`);
    } else {
      console.log('[MQTT] WebSocket cerrado sin clientId');
    }
  },
  
  onError(evt: any, ws: any) {
    console.error('WebSocket error:', evt);
    const clientId = (ws as any).clientId;
    if (clientId) {
      broker.unregisterClient(clientId);
      console.log(`[MQTT] Cliente desregistrado por error: ${clientId}`);
    }
  }
})));

export default app;
