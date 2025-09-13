// Broker MQTT simple para Cloudflare Workers
export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: string;
}

export interface MQTTClient {
  id: string;
  subscriptions: Set<string>;
  lastSeen: Date;
  ws?: WebSocket;
}

export interface BrokerStats {
  connectedClients: number;
  brokerId: string;
  uptime: number;
  totalMessages: number;
  retainedMessages: number;
}

export class CloudflareWorkerMQTTBroker {
  private clients = new Map<string, MQTTClient>();
  private retainedMessages = new Map<string, MQTTMessage>();
  private totalMessages = 0;
  private startTime = Date.now();
  public readonly brokerId = 'cloudflare-mqtt-broker';

  constructor() {
    console.log(`[MQTT] Broker iniciado: ${this.brokerId}`);
  }

  // Registrar un nuevo cliente
  registerClient(clientId: string, ws?: WebSocket): MQTTClient {
    const client: MQTTClient = {
      id: clientId,
      subscriptions: new Set(),
      lastSeen: new Date(),
      ws
    };

    this.clients.set(clientId, client);
    console.log(`[MQTT] Cliente registrado: ${clientId}`);
    
    return client;
  }

  // Desregistrar cliente
  unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[MQTT] Cliente desregistrado: ${clientId}`);
  }

  // Suscribir cliente a un tópico
  subscribe(clientId: string, topic: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      console.error(`[MQTT] Cliente no encontrado: ${clientId}`);
      return false;
    }

    client.subscriptions.add(topic);
    client.lastSeen = new Date();
    
    console.log(`[MQTT] Cliente ${clientId} suscrito a: ${topic}`);
    
    // Enviar mensajes retenidos que coincidan con el tópico
    this.sendRetainedMessages(client, topic);
    
    return true;
  }

  // Desuscribir cliente de un tópico
  unsubscribe(clientId: string, topic: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    client.subscriptions.delete(topic);
    client.lastSeen = new Date();
    
    console.log(`[MQTT] Cliente ${clientId} desuscrito de: ${topic}`);
    return true;
  }

  // Publicar mensaje
  publish(message: Omit<MQTTMessage, 'timestamp'>): void {
    const fullMessage: MQTTMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    this.totalMessages++;
    console.log(`[MQTT] Publicando en ${message.topic}:`, message.payload);

    // Guardar mensaje retenido si es necesario
    if (message.retain) {
      this.retainedMessages.set(message.topic, fullMessage);
    }

    // Entregar mensaje a clientes suscritos
    this.deliverMessage(fullMessage);
  }

  // Entregar mensaje a clientes suscritos
  private deliverMessage(message: MQTTMessage): void {
    for (const [clientId, client] of this.clients) {
      if (this.isSubscribedToTopic(client, message.topic)) {
        this.sendMessageToClient(client, message);
      }
    }
  }

  // Verificar si un cliente está suscrito a un tópico
  private isSubscribedToTopic(client: MQTTClient, topic: string): boolean {
    for (const subscription of client.subscriptions) {
      if (this.topicMatches(subscription, topic)) {
        return true;
      }
    }
    return false;
  }

  // Verificar si un tópico coincide con un patrón de suscripción
  private topicMatches(subscription: string, topic: string): boolean {
    // Convertir patrón MQTT a regex
    const pattern = subscription
      .replace(/\+/g, '[^/]+')  // + coincide con un nivel
      .replace(/#$/, '.*');     // # coincide con múltiples niveles al final

    const regex = new RegExp(`^${pattern}$`);
    return regex.test(topic);
  }

  // Enviar mensaje a un cliente específico
  private sendMessageToClient(client: MQTTClient, message: MQTTMessage): void {
    try {
      if (client.ws && client.ws.readyState === WebSocket.OPEN) {
        const mqttPacket = {
          type: 'publish',
          topic: message.topic,
          payload: message.payload,
          qos: message.qos,
          retain: message.retain,
          timestamp: message.timestamp
        };

        client.ws.send(JSON.stringify(mqttPacket));
        console.log(`[MQTT] Mensaje enviado a ${client.id} en tópico ${message.topic}`);
      }
    } catch (error) {
      console.error(`[MQTT] Error enviando mensaje a ${client.id}:`, error);
    }
  }

  // Enviar mensajes retenidos para un tópico
  private sendRetainedMessages(client: MQTTClient, subscription: string): void {
    for (const [topic, message] of this.retainedMessages) {
      if (this.topicMatches(subscription, topic)) {
        this.sendMessageToClient(client, message);
      }
    }
  }

  // Obtener estadísticas del broker
  getStats(): BrokerStats {
    return {
      connectedClients: this.clients.size,
      brokerId: this.brokerId,
      uptime: Date.now() - this.startTime,
      totalMessages: this.totalMessages,
      retainedMessages: this.retainedMessages.size
    };
  }

  // Obtener lista de clientes conectados
  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  // Obtener lista de tópicos con mensajes retenidos
  getRetainedTopics(): string[] {
    return Array.from(this.retainedMessages.keys());
  }

  // Obtener lista de todos los topics activos (con suscripciones o mensajes retenidos)
  getActiveTopics(): string[] {
    const topics = new Set<string>();
    
    // Añadir topics con mensajes retenidos
    for (const topic of this.retainedMessages.keys()) {
      topics.add(topic);
    }
    
    // Añadir topics con suscripciones activas
    for (const client of this.clients.values()) {
      for (const subscription of client.subscriptions) {
        topics.add(subscription);
      }
    }
    
    return Array.from(topics).sort();
  }

  // Limpiar clientes inactivos
  cleanup(): void {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutos

    for (const [clientId, client] of this.clients) {
      if (now.getTime() - client.lastSeen.getTime() > timeout) {
        this.unregisterClient(clientId);
      }
    }
  }
}
