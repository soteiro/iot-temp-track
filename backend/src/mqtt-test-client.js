// Cliente MQTT simple para usar con el broker de Cloudflare Workers
class SimpleMQTTClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.messageId = 1;
    this.subscriptions = new Map();
    this.onMessage = null;
    this.onConnect = null;
    this.onClose = null;
    this.onError = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('Conectado al broker MQTT');
          this.connected = true;
          if (this.onConnect) this.onConnect();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parseando mensaje:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('Conexión cerrada');
          this.connected = false;
          if (this.onClose) this.onClose();
        };

        this.ws.onerror = (error) => {
          console.error('Error WebSocket:', error);
          if (this.onError) this.onError(error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  handleMessage(data) {
    switch (data.type) {
      case 'connack':
        console.log('Conexión confirmada, clientId:', data.clientId);
        break;
        
      case 'publish':
        console.log(`Mensaje recibido en ${data.topic}:`, data.payload);
        if (this.onMessage) {
          this.onMessage(data.topic, data.payload, data);
        }
        break;
        
      case 'suback':
        console.log('Suscripción confirmada');
        break;
        
      case 'unsuback':
        console.log('Desuscripción confirmada');
        break;
        
      case 'pingresp':
        console.log('Pong recibido');
        break;
        
      default:
        console.log('Mensaje no manejado:', data);
    }
  }

  subscribe(topic, callback) {
    if (!this.connected) {
      throw new Error('No conectado al broker');
    }

    const message = {
      type: 'subscribe',
      topic: topic,
      messageId: this.messageId++,
      qos: 0
    };

    this.subscriptions.set(topic, callback);
    this.ws.send(JSON.stringify(message));
    
    console.log(`Suscrito a: ${topic}`);
  }

  unsubscribe(topic) {
    if (!this.connected) {
      throw new Error('No conectado al broker');
    }

    const message = {
      type: 'unsubscribe',
      topic: topic,
      messageId: this.messageId++
    };

    this.subscriptions.delete(topic);
    this.ws.send(JSON.stringify(message));
    
    console.log(`Desuscrito de: ${topic}`);
  }

  publish(topic, payload, options = {}) {
    if (!this.connected) {
      throw new Error('No conectado al broker');
    }

    const message = {
      type: 'publish',
      topic: topic,
      payload: payload,
      qos: options.qos || 0,
      retain: options.retain || false,
      messageId: this.messageId++
    };

    this.ws.send(JSON.stringify(message));
    
    console.log(`Mensaje publicado en ${topic}:`, payload);
  }

  ping() {
    if (!this.connected) {
      throw new Error('No conectado al broker');
    }

    const message = {
      type: 'ping'
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }
}

// Función para probar el cliente
async function testMQTTClient() {
  const client = new SimpleMQTTClient('ws://localhost:8787/mqtt');
  
  // Configurar event handlers
  client.onMessage = (topic, payload, data) => {
    console.log(`📨 [${topic}] ${payload}`);
  };

  client.onConnect = () => {
    console.log('✅ Cliente conectado exitosamente');
    
    // Suscribirse a tópicos
    client.subscribe('temperature/+');
    client.subscribe('humidity/+');
    client.subscribe('status/+');
    
    // Publicar algunos mensajes de prueba
    let counter = 0;
    const publishInterval = setInterval(() => {
      counter++;
      const sensorId = Math.floor(Math.random() * 3) + 1;
      
      // Datos de temperatura
      const tempData = {
        sensorId: `sensor${sensorId}`,
        temperature: (20 + Math.random() * 15).toFixed(2),
        unit: 'celsius',
        timestamp: new Date().toISOString()
      };
      
      // Datos de humedad
      const humData = {
        sensorId: `sensor${sensorId}`,
        humidity: (40 + Math.random() * 40).toFixed(2),
        unit: 'percent',
        timestamp: new Date().toISOString()
      };
      
      client.publish(`temperature/sensor${sensorId}`, JSON.stringify(tempData));
      client.publish(`humidity/sensor${sensorId}`, JSON.stringify(humData));
      
      // Estado del sensor
      if (counter % 5 === 0) {
        const statusData = {
          sensorId: `sensor${sensorId}`,
          status: 'online',
          battery: Math.floor(Math.random() * 100),
          lastSeen: new Date().toISOString()
        };
        
        client.publish(`status/sensor${sensorId}`, JSON.stringify(statusData), {
          retain: true  // Mantener este mensaje
        });
      }
      
      // Parar después de 10 mensajes
      if (counter >= 10) {
        clearInterval(publishInterval);
        setTimeout(() => {
          client.disconnect();
        }, 2000);
      }
    }, 3000);
  };

  client.onClose = () => {
    console.log('❌ Cliente desconectado');
  };

  client.onError = (error) => {
    console.error('🚨 Error del cliente:', error);
  };

  try {
    await client.connect();
  } catch (error) {
    console.error('Error conectando:', error);
  }
}

// Para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimpleMQTTClient, testMQTTClient };
}

// Para uso en browser
if (typeof window !== 'undefined') {
  window.SimpleMQTTClient = SimpleMQTTClient;
  window.testMQTTClient = testMQTTClient;
}
