import mqtt from 'mqtt';

// Configuración del cliente MQTT
const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'test-client-' + Math.random().toString(16).substr(2, 8),
  keepalive: 60,
  reconnectPeriod: 1000,
  clean: true
});

// Eventos del cliente
client.on('connect', () => {
  console.log('Cliente MQTT conectado al broker');
  
  // Suscribirse a algunos tópicos
  client.subscribe(['temperature/+', 'humidity/+', 'status/+'], (err) => {
    if (err) {
      console.error('Error al suscribirse:', err);
    } else {
      console.log('Suscrito a tópicos de temperatura, humedad y estado');
    }
  });

  // Publicar algunos mensajes de prueba
  setInterval(() => {
    const sensorId = Math.floor(Math.random() * 3) + 1;
    const temperature = (20 + Math.random() * 15).toFixed(2);
    const humidity = (40 + Math.random() * 40).toFixed(2);
    
    const tempMessage = {
      sensorId,
      temperature: parseFloat(temperature),
      timestamp: new Date().toISOString(),
      unit: 'celsius'
    };

    const humMessage = {
      sensorId,
      humidity: parseFloat(humidity),
      timestamp: new Date().toISOString(),
      unit: 'percent'
    };

    client.publish(`temperature/sensor${sensorId}`, JSON.stringify(tempMessage));
    client.publish(`humidity/sensor${sensorId}`, JSON.stringify(humMessage));
    
    console.log(`Datos enviados - Sensor ${sensorId}: ${temperature}°C, ${humidity}%`);
  }, 5000);
});

client.on('message', (topic, message) => {
  console.log(`Mensaje recibido en ${topic}:`, message.toString());
});

client.on('error', (err) => {
  console.error('Error del cliente MQTT:', err);
});

client.on('close', () => {
  console.log('Conexión MQTT cerrada');
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\nCerrando cliente MQTT...');
  client.end(() => {
    process.exit(0);
  });
});
