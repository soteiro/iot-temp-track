import WebSocket from 'ws';

class CloudflareMQTTClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.isConnected = false;
    this.subscriptions = new Set();
    this.clientId = null;
  }
  
  connect(clientId = `mqttx-test-${Date.now()}`) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔗 Conectando a: ${this.url}`);
        this.ws = new WebSocket(this.url);
        
        this.ws.on('open', () => {
          console.log('✅ WebSocket conectado');
          
          // Enviar mensaje de conexión MQTT
          const connectMsg = {
            type: 'connect',
            clientId: clientId,
            keepAlive: 60
          };
          
          this.ws.send(JSON.stringify(connectMsg));
          console.log('📤 Enviando CONNECT:', connectMsg);
        });
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('📥 Recibido:', message);
            
            if (message.type === 'connack') {
              this.isConnected = true;
              this.clientId = message.clientId;
              console.log(`✅ Conexión MQTT establecida con clientId: ${this.clientId}`);
              resolve(message);
            } else if (message.type === 'publish') {
              console.log(`📨 [${message.topic}] ${message.payload}`);
            } else if (message.type === 'suback') {
              console.log(`✅ Suscripción confirmada para: ${message.topic}`);
            } else if (message.type === 'unsuback') {
              console.log(`✅ Desuscripción confirmada para: ${message.topic}`);
            }
          } catch (error) {
            console.error('❌ Error parseando mensaje:', error);
          }
        });
        
        this.ws.on('close', () => {
          this.isConnected = false;
          console.log('🔌 Conexión cerrada');
        });
        
        this.ws.on('error', (error) => {
          console.error('❌ Error WebSocket:', error);
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  subscribe(topic) {
    if (!this.isConnected) {
      console.error('❌ No conectado');
      return;
    }
    
    const message = {
      type: 'subscribe',
      topic: topic,
      qos: 0,
      messageId: Math.floor(Math.random() * 1000)
    };
    
    this.ws.send(JSON.stringify(message));
    this.subscriptions.add(topic);
    console.log('📤 Suscribiéndose a:', topic);
  }
  
  unsubscribe(topic) {
    if (!this.isConnected) {
      console.error('❌ No conectado');
      return;
    }
    
    const message = {
      type: 'unsubscribe',
      topic: topic,
      messageId: Math.floor(Math.random() * 1000)
    };
    
    this.ws.send(JSON.stringify(message));
    this.subscriptions.delete(topic);
    console.log('📤 Desuscribiéndose de:', topic);
  }
  
  publish(topic, payload, options = {}) {
    if (!this.isConnected) {
      console.error('❌ No conectado');
      return;
    }
    
    const message = {
      type: 'publish',
      topic: topic,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      qos: options.qos || 0,
      retain: options.retain || false,
      messageId: Math.floor(Math.random() * 1000)
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`📤 Publicando en "${topic}": ${message.payload}`);
  }
  
  ping() {
    if (!this.isConnected) {
      console.error('❌ No conectado');
      return;
    }
    
    const message = { type: 'ping' };
    this.ws.send(JSON.stringify(message));
    console.log('📤 Enviando PING');
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
    console.log('🔌 Desconectado');
  }
  
  getStats() {
    return {
      connected: this.isConnected,
      clientId: this.clientId,
      subscriptions: Array.from(this.subscriptions)
    };
  }
}

// Función de prueba para el broker en Cloudflare
async function testCloudflareWorkerBroker() {
  console.log('🚀 Iniciando prueba del broker MQTT en Cloudflare Workers');
  console.log('URL: wss://backend.diego-sarq.workers.dev/mqtt');
  console.log('=' .repeat(60));
  
  const client = new CloudflareMQTTClient('wss://backend.diego-sarq.workers.dev/mqtt');
  
  try {
    // Conectar
    await client.connect('mqttx-cloudflare-test');
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Suscribirse a varios tópicos
    console.log('\n📡 Configurando suscripciones...');
    client.subscribe('temperature/+');
    client.subscribe('humidity/+');
    client.subscribe('status/+');
    client.subscribe('alerts/+');
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Publicar datos de prueba
    console.log('\n📤 Publicando datos de prueba...');
    
    // Datos de temperatura
    for (let i = 1; i <= 3; i++) {
      const tempData = {
        sensorId: `sensor${i}`,
        temperature: (20 + Math.random() * 15).toFixed(2),
        unit: 'celsius',
        timestamp: new Date().toISOString()
      };
      
      client.publish(`temperature/sensor${i}`, tempData);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Datos de humedad
    for (let i = 1; i <= 3; i++) {
      const humData = {
        sensorId: `sensor${i}`,
        humidity: (40 + Math.random() * 40).toFixed(2),
        unit: 'percent',
        timestamp: new Date().toISOString()
      };
      
      client.publish(`humidity/sensor${i}`, humData);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Estado de sensores (retenido)
    for (let i = 1; i <= 3; i++) {
      const statusData = {
        sensorId: `sensor${i}`,
        status: 'online',
        battery: Math.floor(Math.random() * 100),
        lastSeen: new Date().toISOString()
      };
      
      client.publish(`status/sensor${i}`, statusData, { retain: true });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Alertas
    client.publish('alerts/temperature', {
      message: 'Temperatura alta detectada en sensor2',
      severity: 'warning',
      timestamp: new Date().toISOString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ping test
    console.log('\n🏓 Probando ping...');
    client.ping();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mostrar estadísticas
    console.log('\n📊 Estadísticas del cliente:');
    console.log(client.getStats());
    
    // Esperar un poco más para ver mensajes
    console.log('\n⏳ Esperando mensajes por 10 segundos...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    console.log('\n🔚 Finalizando prueba...');
    client.disconnect();
  }
}

// Función para hacer pruebas HTTP también
async function testHTTPAPI() {
  console.log('\n🌐 Probando API HTTP...');
  
  try {
    // Test de estadísticas
    const statsResponse = await fetch('https://backend.diego-sarq.workers.dev/broker/stats');
    const stats = await statsResponse.json();
    console.log('📊 Estadísticas del broker:', stats);
    
    // Test de publicación HTTP
    const publishResponse = await fetch('https://backend.diego-sarq.workers.dev/broker/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'test/http',
        message: {
          source: 'http-api',
          timestamp: new Date().toISOString(),
          data: 'Prueba desde API HTTP'
        },
        retain: true
      })
    });
    
    const publishResult = await publishResponse.json();
    console.log('📤 Resultado publicación HTTP:', publishResult);
    
    // Test de tópicos
    const topicsResponse = await fetch('https://backend.diego-sarq.workers.dev/broker/topics');
    const topics = await topicsResponse.json();
    console.log('📋 Tópicos disponibles:', topics);
    
  } catch (error) {
    console.error('❌ Error en pruebas HTTP:', error);
  }
}

// Función principal
async function main() {
  console.log('🎯 Prueba completa del broker MQTT en Cloudflare Workers');
  console.log('Diego Sarquiz - IoT Temperature Tracking');
  console.log('=' .repeat(80));
  
  // Pruebas HTTP primero
  await testHTTPAPI();
  
  console.log('\n' + '=' .repeat(80));
  
  // Luego pruebas WebSocket/MQTT
  await testCloudflareWorkerBroker();
  
  console.log('\n✅ Todas las pruebas completadas!');
}

// Ejecutar solo si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CloudflareMQTTClient };
