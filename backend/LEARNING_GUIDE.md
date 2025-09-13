# 📚 Guía Educativa: Broker MQTT para IoT

## 🎯 Objetivo de Aprendizaje

Este proyecto implementa un **broker MQTT personalizado** para dispositivos IoT utilizando **Cloudflare Workers** y **WebSocket**. Es una excelente introducción a:

- Protocolos de comunicación IoT
- Arquitectura publish/subscribe
- WebSocket en tiempo real
- Edge computing con Workers
- Gestión de estado distribuido

---

## 🧠 Conceptos Fundamentales

### ¿Qué es MQTT?

**MQTT** (Message Queuing Telemetry Transport) es un protocolo de comunicación ligero diseñado para dispositivos IoT:

```bash
📱 Sensor → 📡 Broker → 📊 Dashboard
```

**Características clave:**

- **Ligero**: Mínimo uso de ancho de banda
- **Asíncrono**: Los dispositivos no necesitan estar conectados simultáneamente
- **Escalable**: Un broker puede manejar miles de dispositivos
- **Confiable**: Diferentes niveles de garantía de entrega (QoS)

### Patrón Publisher/Subscriber

``` bash
Publisher (Sensor)     →     Broker     →     Subscriber (App)
      |                        |                      |
   "Publica"              "Distribuye"           "Recibe"
```

**Ventajas sobre comunicación directa:**

- **Desacoplamiento**: Los dispositivos no necesitan conocerse entre sí
- **Escalabilidad**: Agregar nuevos dispositivos es simple
- **Flexibilidad**: Múltiples consumidores para el mismo dato

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

``` bash
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dispositivo   │────│     Broker       │────│   Aplicación    │
│     IoT         │    │   (CloudFlare    │    │     Web         │
│                 │    │    Workers)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
    WebSocket JSON          Estado en           WebSocket JSON
                           Memoria
```

### Flujo de Datos

1. **Conexión**: Dispositivo establece WebSocket con broker
2. **Autenticación**: Cliente envía mensaje `CONNECT`
3. **Suscripción**: Cliente se suscribe a topics de interés
4. **Publicación**: Sensores publican datos en topics
5. **Distribución**: Broker envía datos a suscriptores relevantes

---

## 📋 Estructura del Código

### Archivo Principal: `index.ts`

```typescript
// 🚀 Configuración de Hono (Framework Web)
const app = new Hono();
const broker = new CloudflareWorkerMQTTBroker();

// 🌐 API REST para gestión HTTP
app.get("/stats", ...)      // Estadísticas del broker
app.post("/publish", ...)   // Publicar vía HTTP
app.get("/topics", ...)     // Listar topics activos

// 🔌 WebSocket para protocolo MQTT
app.get("/mqtt", upgradeWebSocket(...));
```

**Responsabilidades:**

- Configurar rutas HTTP y WebSocket
- Manejar mensajes MQTT entrantes
- Distribuir mensajes a suscriptores
- Gestionar errores y desconexiones

### Broker MQTT: `simple-broker.ts`

```typescript
export class CloudflareWorkerMQTTBroker {
  private clients = new Map<string, MQTTClient>();
  private retainedMessages = new Map<string, MQTTMessage>();
  
  // Métodos principales
  registerClient()     // Registrar nuevo cliente
  subscribe()          // Suscribir a topic
  publish()           // Publicar mensaje
  topicMatches()      // Matching con wildcards
}
```

**Responsabilidades:**

- Gestionar clientes conectados
- Implementar lógica de suscripciones
- Manejar mensajes retenidos
- Matching de topics con wildcards

---

## 🔧 Funcionalidades Implementadas

### 1. Gestión de Clientes

```typescript
// Registro automático con ID único
const clientId = `sensor-${Date.now()}-${Math.random()}`;
broker.registerClient(clientId, websocket);

// Limpieza automática de clientes inactivos
broker.cleanup(); // Elimina clientes con timeout
```

**Conceptos clave:**

- **ID único**: Cada cliente debe tener identificador único
- **Estado de sesión**: Suscripciones y última actividad
- **Limpieza automática**: Previene memory leaks

### 2. Sistema de Topics

```typescript
// Examples de topics jerárquicos
"temperatura/sensor1"           // Topic específico
"temperatura/+"                 // Wildcard de un nivel
"sensores/#"                   // Wildcard multinivel
"alerts/critical/temperatura"   // Topic anidado
```

**Wildcards MQTT:**

- `+`: Coincide con **exactamente un nivel**
- `#`: Coincide con **cero o más niveles** (solo al final)

### 3. Quality of Service (QoS)

```typescript
interface MQTTMessage {
  qos: 0 | 1 | 2;  // Nivel de garantía
}

// QoS 0: Fire and forget (mejor rendimiento)
// QoS 1: Al menos una vez (confirmación)
// QoS 2: Exactamente una vez (máxima confiabilidad)
```

### 4. Mensajes Retenidos

```typescript
// Último valor conocido se guarda automáticamente
const message = {
  topic: "temperatura/sensor1",
  payload: "23.5°C",
  retain: true  // 🔒 Se guarda en memoria
};

// Nuevos suscriptores reciben el último valor inmediatamente
```

---

## 🚀 Protocolo de Comunicación

### Mensajes WebSocket (Formato JSON)

#### 1. Conexión

```json
// Cliente → Broker
{
  "type": "connect",
  "clientId": "sensor-001",
  "keepAlive": 60
}

// Broker → Cliente
{
  "type": "connack",
  "returnCode": 0,
  "sessionPresent": false
}
```

#### 2. Suscripción

```json
// Cliente → Broker
{
  "type": "subscribe",
  "topic": "temperatura/+",
  "qos": 0
}

// Broker → Cliente
{
  "type": "suback",
  "returnCodes": [0]
}
```

#### 3. Publicación

```json
// Cliente → Broker
{
  "type": "publish",
  "topic": "temperatura/sensor1",
  "payload": "23.5",
  "retain": true
}

// Broker → Suscriptores
{
  "type": "publish",
  "topic": "temperatura/sensor1",
  "payload": "23.5",
  "retain": true,
  "timestamp": "2025-01-13T10:30:00Z"
}
```

#### 4. Keep-Alive

```json
// Cliente → Broker
{"type": "ping"}

// Broker → Cliente
{"type": "pingresp"}
```

---

## 🌍 Despliegue en Cloudflare Workers

### ¿Por qué Cloudflare Workers?

``` bash
Ventajas del Edge Computing:
┌─────────────────┐
│ 🌍 Global       │ Latencia baja desde cualquier ubicación
│ ⚡ Rápido       │ Tiempo de arranque en frío < 10ms
│ 💰 Económico    │ Pay-per-use, sin servidores idle
│ 🔒 Seguro       │ Aislamiento V8, sin superficie de ataque
│ 📈 Escalable    │ Auto-scaling automático
└─────────────────┘
```

### Limitaciones Consideradas

```typescript
// ❌ No funciona en Workers (Node.js)
import mqtt from 'mqtt';
import net from 'net';

// ✅ Funciona en Workers (Web APIs)
import { upgradeWebSocket } from 'hono/cloudflare-workers';
// Usar WebSocket + JSON en lugar de TCP binario
```

### Comando de Despliegue

```bash
# Desarrollo local
pnpm run dev

# Despliegue a producción
pnpm run deploy
```

---

## 🧪 Testing y Debugging

### 1. Interfaz Web (mqtt-test.html)

```html
<!-- Conexión WebSocket directa desde el navegador -->
<script>
const ws = new WebSocket('wss://tu-broker.workers.dev/mqtt');
ws.onopen = () => {
  // Enviar CONNECT
  ws.send(JSON.stringify({
    type: 'connect',
    clientId: 'web-client-001'
  }));
};
</script>
```

### 2. Cliente Node.js (cloudflare-mqtt-test.js)

```javascript
// Testing automatizado con múltiples escenarios
import WebSocket from 'ws';

class CloudflareMQTTClient {
  async testPubSub() {
    // Pruebas de publicación/suscripción
    // Verificación de mensajes retenidos
    // Testing de wildcards
  }
}
```

### 3. API REST para Debugging

```bash
# Estadísticas del broker
curl https://tu-broker.workers.dev/stats

# Publicar mensaje vía HTTP
curl -X POST https://tu-broker.workers.dev/publish \
  -H "Content-Type: application/json" \
  -d '{"topic":"test/mensaje","message":"Hola MQTT"}'

# Listar topics activos
curl https://tu-broker.workers.dev/topics
```

---

## 🎓 Conceptos Avanzados Implementados

### 1. Topic Matching con Wildcards

```typescript
private topicMatches(topic: string, pattern: string): boolean {
  // Implementación del algoritmo de matching MQTT
  // Maneja '+' (un nivel) y '#' (multinivel)
  
  if (pattern.endsWith('#')) {
    // Wildcard multilevel: sensores/# → sensores/temp/1
    // Lógica de matching prefix
  }
  
  // Wildcard single level: sensores/+/estado
  // Comparación nivel por nivel
}
```

### 2. Gestión de Estado Distribuido

```typescript
class CloudflareWorkerMQTTBroker {
  // Estado en memoria del Worker
  private clients = new Map();           // Clientes conectados
  private retainedMessages = new Map();  // Último valor por topic
  private totalMessages = 0;             // Métricas de uso
  
  // Auto-limpieza para prevenir memory leaks
  cleanup(timeoutMs = 300000) {
    // Eliminar clientes inactivos
  }
}
```

### 3. Manejo de Errores Robusto

```typescript
try {
  const data = JSON.parse(evt.data);
  // Procesar mensaje MQTT
} catch (error) {
  // Log del error
  console.error('[MQTT] Error:', error);
  
  // Respuesta al cliente
  ws.send(JSON.stringify({
    type: 'error',
    message: 'Formato de mensaje inválido'
  }));
}
```

---

## 📈 Métricas y Monitoreo

### Estadísticas del Broker

```json
{
  "connectedClients": 5,
  "totalMessages": 1250,
  "retainedMessages": 23,
  "uptime": 3600000,
  "brokerId": "cloudflare-mqtt-broker"
}
```

### Casos de Uso Reales

1. **Sensores de Temperatura**

   ``` bash
   temperatura/cocina    → 23.5°C
   temperatura/salon     → 21.2°C
   temperatura/exterior  → 18.7°C
   ```

2. **Sistema de Alertas**

   ```bash
   alertas/critica/temperatura  → "Sobrecalentamiento detectado"
   alertas/info/bateria        → "Batería baja en sensor-003"
   ```

3. **Estado de Dispositivos**

   ```bash
   estado/sensor1  → "online"
   estado/sensor2  → "offline"
   estado/gateway  → "maintenance"
   ```

---

## 🎯 Próximos Pasos de Aprendizaje

### Integraciones Posibles

1. **Base de Datos**

   ```typescript
   // Persistir mensajes en Cloudflare D1
   app.post('/publish', async (c) => {
     await db.prepare('INSERT INTO messages...');
     broker.publish(message);
   });
   ```

2. **Autenticación**

   ```typescript
   // JWT tokens para clientes
   if (!validateToken(data.token)) {
     ws.close(1008, 'Token inválido');
   }
   ```

3. **Análisis en Tiempo Real**

   ```typescript
   // Cloudflare Analytics Engine
   c.env.ANALYTICS.writeDataPoint({
     blobs: [topic, clientId],
     doubles: [parseFloat(payload)],
     indexes: [topic]
   });
   ```

### Optimizaciones Avanzadas

1. **Clustering de Topics**
2. **Compresión de Mensajes**
3. **Rate Limiting por Cliente**
4. **Persistencia en Cloudflare KV/D1**
5. **Métricas con Prometheus**

---

## 📚 Recursos Adicionales

- [Especificación MQTT 3.1.1](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

¡Este proyecto es una excelente base para entender IoT, protocolos de comunicación y arquitecturas distribuidas! 🚀
