// =====================================
// BROKER MQTT PERSONALIZADO PARA CLOUDFLARE WORKERS
// =====================================

/*
 * Este archivo implementa un broker MQTT simplificado diseñado específicamente 
 * para funcionar en Cloudflare Workers. A diferencia de las implementaciones 
 * tradicionales de MQTT que usan TCP binario, este broker utiliza WebSocket 
 * con mensajes JSON para mayor compatibilidad con el entorno de navegadores 
 * y workers.
 * 
 * CONCEPTOS CLAVE DE MQTT:
 * - Publisher/Subscriber Pattern: Los clientes pueden publicar mensajes en "topics"
 * - Topics: Canales organizados jerárquicamente (ej: "sensores/temperatura/sala1")
 * - Wildcards: + para un nivel, # para múltiples niveles
 * - Quality of Service (QoS): Niveles de garantía de entrega (0, 1, 2)
 * - Retained Messages: Último mensaje conocido de un topic
 * - Clean Session: Si mantener estado entre desconexiones
 */

// =====================================
// INTERFACES Y TIPOS DE DATOS
// =====================================

/**
 * Representa un mensaje MQTT completo con todos sus metadatos
 * 
 * @interface MQTTMessage
 * @property {string} topic - Canal/tema donde se publica el mensaje (ej: "temperatura/sensor1")
 * @property {string} payload - Contenido del mensaje (datos del sensor, comandos, etc.)
 * @property {0|1|2} qos - Quality of Service: 0=fire&forget, 1=at least once, 2=exactly once
 * @property {boolean} retain - Si el mensaje debe guardarse como "último valor conocido"
 * @property {string} timestamp - Marca de tiempo ISO 8601 de cuando se creó el mensaje
 */
export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: string;
}

/**
 * Representa un cliente MQTT conectado al broker
 * 
 * @interface MQTTClient
 * @property {string} id - Identificador único del cliente (debe ser único en todo el broker)
 * @property {Set<string>} subscriptions - Conjunto de topics a los que está suscrito
 * @property {Date} lastSeen - Última actividad del cliente (para detección de timeouts)
 * @property {WebSocket} [ws] - Conexión WebSocket opcional (puede no estar en ciertos casos)
 */
export interface MQTTClient {
  id: string;
  subscriptions: Set<string>;
  lastSeen: Date;
  ws?: WebSocket;
}

/**
 * Estadísticas del broker para monitoreo y debugging
 * 
 * @interface BrokerStats
 * @property {number} connectedClients - Número actual de clientes conectados
 * @property {string} brokerId - Identificador único del broker
 * @property {number} uptime - Tiempo en milisegundos desde que inició el broker
 * @property {number} totalMessages - Total de mensajes procesados desde el inicio
 * @property {number} retainedMessages - Número de mensajes retenidos en memoria
 */
export interface BrokerStats {
  connectedClients: number;
  brokerId: string;
  uptime: number;
  totalMessages: number;
  retainedMessages: number;
}

// =====================================
// CLASE PRINCIPAL DEL BROKER
// =====================================

/**
 * Implementación de un broker MQTT simplificado para Cloudflare Workers
 * 
 * Esta clase maneja:
 * - Registro y gestión de clientes
 * - Suscripciones a topics con soporte para wildcards
 * - Publicación y distribución de mensajes
 * - Mensajes retenidos (último valor conocido de cada topic)
 * - Estadísticas y monitoreo del sistema
 * 
 * @class CloudflareWorkerMQTTBroker
 */
export class CloudflareWorkerMQTTBroker {
  
  // =====================================
  // PROPIEDADES PRIVADAS
  // =====================================
  
  /**
   * Mapa de todos los clientes conectados
   * Key: clientId (string), Value: MQTTClient object
   * Usar Map en lugar de Object para mejor rendimiento en operaciones frecuentes
   */
  private clients = new Map<string, MQTTClient>();
  
  /**
   * Mapa de mensajes retenidos por topic
   * Key: topic exacto (string), Value: último MQTTMessage recibido
   * Los mensajes retenidos se envían inmediatamente a nuevos suscriptores
   */
  private retainedMessages = new Map<string, MQTTMessage>();
  
  /**
   * Contador total de mensajes procesados desde el inicio
   * Útil para estadísticas y monitoreo de carga
   */
  private totalMessages = 0;
  
  /**
   * Timestamp de cuando se inició el broker
   * Usado para calcular uptime en estadísticas
   */
  private startTime = Date.now();
  
  /**
   * Identificador único del broker
   * Útil en entornos distribuidos para identificar la instancia
   */
  public readonly brokerId = 'cloudflare-mqtt-broker';

  // =====================================
  // CONSTRUCTOR
  // =====================================
  
  /**
   * Inicializa una nueva instancia del broker MQTT
   * El broker estará listo para aceptar clientes inmediatamente
   */
  constructor() {
    console.log(`[MQTT Broker] Iniciado: ${this.brokerId} a las ${new Date().toISOString()}`);
    console.log(`[MQTT Broker] Funcionalidades: pub/sub, retained messages, wildcards, QoS 0-2`);
  }

  // =====================================
  // GESTIÓN DE CLIENTES
  // =====================================
  
  /**
   * Registra un nuevo cliente en el broker
   * 
   * @param {string} clientId - ID único del cliente (debe ser único en todo el broker)
   * @param {WebSocket} [ws] - Conexión WebSocket opcional del cliente
   * @returns {MQTTClient} El objeto cliente creado
   * 
   * @example
   * const client = broker.registerClient("sensor-001", websocketConnection);
   */
  registerClient(clientId: string, ws?: WebSocket): MQTTClient {
    // Si ya existe un cliente con este ID, lo reemplazamos
    // En MQTT, un clientId debe ser único; conexiones duplicadas reemplazan las anteriores
    if (this.clients.has(clientId)) {
      console.log(`[MQTT Broker] Reemplazando cliente existente: ${clientId}`);
      this.unregisterClient(clientId);
    }

    // Crear nuevo objeto cliente con estado inicial
    const client: MQTTClient = {
      id: clientId,
      subscriptions: new Set(), // Conjunto vacío de suscripciones
      lastSeen: new Date(),     // Marcar como visto ahora
      ws                        // Guardar referencia a WebSocket
    };

    // Registrar en el mapa de clientes
    this.clients.set(clientId, client);
    
    console.log(`[MQTT Broker] Cliente registrado: ${clientId} (Total clientes: ${this.clients.size})`);
    
    return client;
  }

  /**
   * Desregistra un cliente del broker y limpia sus recursos
   * 
   * @param {string} clientId - ID del cliente a desregistrar
   * 
   * @example
   * broker.unregisterClient("sensor-001");
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    
    if (client) {
      // Limpiar todas las suscripciones del cliente
      console.log(`[MQTT Broker] Desregistrando cliente ${clientId} (${client.subscriptions.size} suscripciones)`);
      
      // Las suscripciones se limpian automáticamente al remover el cliente
      // ya que solo iteramos sobre clientes activos al distribuir mensajes
      
      // Remover cliente del mapa
      this.clients.delete(clientId);
      
      console.log(`[MQTT Broker] Cliente desregistrado: ${clientId} (Total clientes: ${this.clients.size})`);
    } else {
      console.log(`[MQTT Broker] Intento de desregistrar cliente inexistente: ${clientId}`);
    }
  }

  /**
   * Actualiza la marca de tiempo de última actividad de un cliente
   * Usado para detectar clientes inactivos y hacer limpieza automática
   * 
   * @param {string} clientId - ID del cliente a actualizar
   */
  private updateClientLastSeen(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastSeen = new Date();
    }
  }

  // =====================================
  // GESTIÓN DE SUSCRIPCIONES
  // =====================================
  
  /**
   * Suscribe un cliente a un topic específico
   * 
   * @param {string} clientId - ID del cliente que se suscribe
   * @param {string} topic - Topic al que suscribirse (puede incluir wildcards + y #)
   * 
   * @example
   * // Suscripción exacta
   * broker.subscribe("client1", "temperatura/sensor1");
   * 
   * // Suscripción con wildcards
   * broker.subscribe("client1", "temperatura/+");     // Todos los sensores de temperatura
   * broker.subscribe("client1", "sensores/#");        // Todos los subtopics de sensores
   */
  subscribe(clientId: string, topic: string): void {
    const client = this.clients.get(clientId);
    
    if (!client) {
      console.error(`[MQTT Broker] Intento de suscripción de cliente inexistente: ${clientId}`);
      return;
    }

    // Añadir topic a las suscripciones del cliente
    client.subscriptions.add(topic);
    this.updateClientLastSeen(clientId);
    
    console.log(`[MQTT Broker] Cliente ${clientId} suscrito a: ${topic} (Total suscripciones: ${client.subscriptions.size})`);
    
    // Enviar mensajes retenidos que coincidan con esta suscripción
    this.sendRetainedMessagesToClient(clientId, topic);
  }

  /**
   * Cancela la suscripción de un cliente a un topic
   * 
   * @param {string} clientId - ID del cliente
   * @param {string} topic - Topic del que desuscribirse
   */
  unsubscribe(clientId: string, topic: string): void {
    const client = this.clients.get(clientId);
    
    if (!client) {
      console.error(`[MQTT Broker] Intento de desuscripción de cliente inexistente: ${clientId}`);
      return;
    }

    // Remover topic de las suscripciones
    const wasSubscribed = client.subscriptions.delete(topic);
    this.updateClientLastSeen(clientId);
    
    if (wasSubscribed) {
      console.log(`[MQTT Broker] Cliente ${clientId} desuscrito de: ${topic} (Suscripciones restantes: ${client.subscriptions.size})`);
    } else {
      console.log(`[MQTT Broker] Cliente ${clientId} no estaba suscrito a: ${topic}`);
    }
  }

  /**
   * Envía mensajes retenidos que coincidan con una suscripción específica
   * Se llama automáticamente cuando un cliente se suscribe a un topic
   * 
   * @param {string} clientId - ID del cliente que recibe los mensajes
   * @param {string} subscriptionTopic - Topic de suscripción (puede tener wildcards)
   * @private
   */
  private sendRetainedMessagesToClient(clientId: string, subscriptionTopic: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.ws) return;

    let sentCount = 0;
    
    // Revisar todos los mensajes retenidos
    for (const [retainedTopic, message] of this.retainedMessages) {
      // Verificar si el topic retenido coincide con la suscripción
      if (this.topicMatches(retainedTopic, subscriptionTopic)) {
        try {
          // Enviar mensaje retenido al cliente
          const retainedPublish = {
            type: 'publish',
            topic: message.topic,
            payload: message.payload,
            qos: message.qos,
            retain: true, // Marcar como mensaje retenido
            timestamp: message.timestamp
          };
          
          client.ws.send(JSON.stringify(retainedPublish));
          sentCount++;
          
        } catch (error) {
          console.error(`[MQTT Broker] Error enviando mensaje retenido a ${clientId}:`, error);
        }
      }
    }
    
    if (sentCount > 0) {
      console.log(`[MQTT Broker] Enviados ${sentCount} mensajes retenidos a ${clientId} para suscripción ${subscriptionTopic}`);
    }
  }

  // =====================================
  // PUBLICACIÓN Y DISTRIBUCIÓN DE MENSAJES
  // =====================================
  
  /**
   * Publica un mensaje en el broker y lo distribuye a todos los suscriptores
   * 
   * @param {MQTTMessage} message - Mensaje completo a publicar
   * 
   * @example
   * broker.publish({
   *   topic: "temperatura/sensor1",
   *   payload: "23.5",
   *   qos: 0,
   *   retain: true,
   *   timestamp: new Date().toISOString()
   * });
   */
  publish(message: MQTTMessage): void {
    console.log(`[MQTT Broker] Publicando mensaje en topic: ${message.topic} (retain: ${message.retain})`);
    
    // Incrementar contador de mensajes totales
    this.totalMessages++;
    
    // Si el mensaje debe ser retenido, guardarlo
    if (message.retain) {
      this.retainedMessages.set(message.topic, message);
      console.log(`[MQTT Broker] Mensaje retenido guardado para topic: ${message.topic}`);
    }
    
    // Distribuir mensaje a todos los clientes suscritos
    this.distributeMessage(message);
  }

  /**
   * Distribuye un mensaje a todos los clientes que tengan suscripciones coincidentes
   * 
   * @param {MQTTMessage} message - Mensaje a distribuir
   * @private
   */
  private distributeMessage(message: MQTTMessage): void {
    let deliveredCount = 0;
    
    // Iterar sobre todos los clientes conectados
    for (const [clientId, client] of this.clients) {
      // Verificar si alguna suscripción del cliente coincide con el topic
      for (const subscription of client.subscriptions) {
        if (this.topicMatches(message.topic, subscription)) {
          // Cliente tiene suscripción coincidente, enviar mensaje
          this.sendMessageToClient(clientId, message);
          deliveredCount++;
          break; // Solo enviar una vez por cliente, aunque tenga múltiples suscripciones coincidentes
        }
      }
    }
    
    console.log(`[MQTT Broker] Mensaje distribuido a ${deliveredCount} clientes para topic: ${message.topic}`);
  }

  /**
   * Envía un mensaje específico a un cliente específico
   * 
   * @param {string} clientId - ID del cliente destinatario
   * @param {MQTTMessage} message - Mensaje a enviar
   * @private
   */
  private sendMessageToClient(clientId: string, message: MQTTMessage): void {
    const client = this.clients.get(clientId);
    
    if (!client || !client.ws) {
      console.error(`[MQTT Broker] No se puede enviar mensaje a cliente ${clientId}: cliente no encontrado o sin WebSocket`);
      return;
    }

    try {
      // Construir mensaje en formato JSON para WebSocket
      const publishMessage = {
        type: 'publish',
        topic: message.topic,
        payload: message.payload,
        qos: message.qos,
        retain: message.retain,
        timestamp: message.timestamp
      };
      
      // Enviar mensaje a través del WebSocket
      client.ws.send(JSON.stringify(publishMessage));
      
      // Actualizar timestamp de última actividad
      this.updateClientLastSeen(clientId);
      
      console.log(`[MQTT Broker] Mensaje enviado a cliente ${clientId} para topic: ${message.topic}`);
      
    } catch (error) {
      console.error(`[MQTT Broker] Error enviando mensaje a cliente ${clientId}:`, error);
      
      // Si hay error al enviar, posiblemente la conexión está cerrada
      // Marcamos el cliente para limpieza
      console.log(`[MQTT Broker] Marcando cliente ${clientId} para limpieza debido a error de envío`);
    }
  }

  // =====================================
  // MATCHING DE TOPICS CON WILDCARDS
  // =====================================
  
  /**
   * Determina si un topic coincide con un patrón de suscripción (que puede incluir wildcards)
   * 
   * MQTT Wildcards:
   * - '+' coincide con exactamente un nivel del topic
   * - '#' coincide con cero o más niveles del topic (solo al final)
   * 
   * @param {string} topic - Topic exacto del mensaje (ej: "sensores/temperatura/sala1")
   * @param {string} pattern - Patrón de suscripción (ej: "sensores/+/sala1" o "sensores/#")
   * @returns {boolean} true si hay coincidencia
   * 
   * @example
   * topicMatches("sensores/temp/sala1", "sensores/+/sala1")    // true
   * topicMatches("sensores/temp/sala1", "sensores/#")          // true
   * topicMatches("sensores/temp/sala1", "sensores/+")          // false
   * topicMatches("sensores/temp/sala1", "sensores/temp/sala1") // true (exacto)
   */
  private topicMatches(topic: string, pattern: string): boolean {
    // Si el patrón es exactamente igual al topic, coincide
    if (topic === pattern) {
      return true;
    }
    
    // Dividir topic y patrón en niveles (separados por '/')
    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');
    
    // Verificar wildcard multilevel '#'
    // '#' debe estar al final y coincide con todos los niveles restantes
    if (patternParts[patternParts.length - 1] === '#') {
      // Verificar que todas las partes antes de '#' coincidan
      for (let i = 0; i < patternParts.length - 1; i++) {
        if (i >= topicParts.length) {
          return false; // Topic más corto que patrón
        }
        
        if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
          return false; // Parte no coincide
        }
      }
      return true; // Todo antes de '#' coincide
    }
    
    // Para patrones sin '#', debe haber exactamente el mismo número de niveles
    if (topicParts.length !== patternParts.length) {
      return false;
    }
    
    // Verificar cada nivel individualmente
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const topicPart = topicParts[i];
      
      // '+' coincide con cualquier valor en ese nivel
      if (patternPart === '+') {
        continue; // Coincide automáticamente
      }
      
      // Comparación exacta
      if (patternPart !== topicPart) {
        return false; // No coincide
      }
    }
    
    return true; // Todos los niveles coinciden
  }

  // =====================================
  // GESTIÓN DE MENSAJES RETENIDOS
  // =====================================
  
  /**
   * Obtiene el mensaje retenido para un topic específico
   * 
   * @param {string} topic - Topic exacto (sin wildcards)
   * @returns {MQTTMessage | undefined} Mensaje retenido o undefined si no existe
   */
  getRetainedMessage(topic: string): MQTTMessage | undefined {
    return this.retainedMessages.get(topic);
  }

  /**
   * Elimina el mensaje retenido de un topic específico
   * En MQTT, publicar un mensaje vacío con retain=true elimina el mensaje retenido
   * 
   * @param {string} topic - Topic del que eliminar el mensaje retenido
   */
  clearRetainedMessage(topic: string): void {
    const wasDeleted = this.retainedMessages.delete(topic);
    if (wasDeleted) {
      console.log(`[MQTT Broker] Mensaje retenido eliminado para topic: ${topic}`);
    }
  }

  // =====================================
  // ESTADÍSTICAS Y MONITOREO
  // =====================================
  
  /**
   * Obtiene estadísticas actuales del broker
   * 
   * @returns {BrokerStats} Objeto con estadísticas del broker
   */
  getStats(): BrokerStats {
    return {
      connectedClients: this.clients.size,
      brokerId: this.brokerId,
      uptime: Date.now() - this.startTime,
      totalMessages: this.totalMessages,
      retainedMessages: this.retainedMessages.size
    };
  }

  /**
   * Obtiene lista de IDs de todos los clientes conectados
   * 
   * @returns {string[]} Array de IDs de clientes
   */
  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Obtiene lista de todos los topics que tienen mensajes retenidos
   * 
   * @returns {string[]} Array de topics con mensajes retenidos
   */
  getRetainedTopics(): string[] {
    return Array.from(this.retainedMessages.keys());
  }

  /**
   * Obtiene lista de todos los topics activos (con suscripciones o mensajes retenidos)
   * Un topic se considera "activo" si tiene al menos una suscripción o un mensaje retenido
   * 
   * @returns {string[]} Array ordenado de topics activos
   */
  getActiveTopics(): string[] {
    const topics = new Set<string>();
    
    // Añadir topics con mensajes retenidos
    for (const topic of this.retainedMessages.keys()) {
      topics.add(topic);
    }
    
    // Añadir topics con suscripciones activas
    // Nota: Esto incluye patterns con wildcards, no solo topics exactos
    for (const client of this.clients.values()) {
      for (const subscription of client.subscriptions) {
        topics.add(subscription);
      }
    }
    
    // Retornar array ordenado para consistencia
    return Array.from(topics).sort();
  }

  // =====================================
  // LIMPIEZA Y MANTENIMIENTO
  // =====================================
  
  /**
   * Limpia clientes inactivos que han excedido el timeout
   * Debe llamarse periódicamente para mantener la salud del sistema
   * 
   * @param {number} [timeoutMs=300000] - Timeout en milisegundos (default: 5 minutos)
   */
  cleanup(timeoutMs: number = 5 * 60 * 1000): void {
    const now = new Date();
    const clientsToRemove: string[] = [];
    
    // Identificar clientes inactivos
    for (const [clientId, client] of this.clients) {
      const inactiveTime = now.getTime() - client.lastSeen.getTime();
      
      if (inactiveTime > timeoutMs) {
        clientsToRemove.push(clientId);
      }
    }
    
    // Remover clientes inactivos
    for (const clientId of clientsToRemove) {
      console.log(`[MQTT Broker] Limpiando cliente inactivo: ${clientId}`);
      this.unregisterClient(clientId);
    }
    
    if (clientsToRemove.length > 0) {
      console.log(`[MQTT Broker] Limpieza completada: ${clientsToRemove.length} clientes removidos`);
    }
  }

  /**
   * Obtiene información detallada sobre un cliente específico
   * Útil para debugging y monitoreo individual
   * 
   * @param {string} clientId - ID del cliente a consultar
   * @returns {Object | null} Información del cliente o null si no existe
   */
  getClientInfo(clientId: string) {
    const client = this.clients.get(clientId);
    
    if (!client) {
      return null;
    }
    
    return {
      id: client.id,
      subscriptions: Array.from(client.subscriptions),
      lastSeen: client.lastSeen.toISOString(),
      hasWebSocket: !!client.ws,
      subscriptionCount: client.subscriptions.size
    };
  }

  /**
   * Fuerza la desconexión de un cliente específico
   * Útil para administración y resolución de problemas
   * 
   * @param {string} clientId - ID del cliente a desconectar
   * @returns {boolean} true si el cliente fue desconectado, false si no existía
   */
  forceDisconnectClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    
    if (!client) {
      return false;
    }
    
    // Cerrar WebSocket si existe
    if (client.ws) {
      try {
        client.ws.close(1000, 'Desconectado por administrador');
      } catch (error) {
        console.error(`[MQTT Broker] Error cerrando WebSocket para cliente ${clientId}:`, error);
      }
    }
    
    // Limpiar del broker
    this.unregisterClient(clientId);
    
    console.log(`[MQTT Broker] Cliente ${clientId} desconectado forzosamente`);
    return true;
  }
}
