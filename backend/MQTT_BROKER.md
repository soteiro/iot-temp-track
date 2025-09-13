# MQTT Broker para IoT Temperature Tracking

Este broker MQTT está construido con **Hono** y un motor MQTT personalizado diseñado específicamente para **Cloudflare Workers**.

## 🚀 Características

- ✅ Broker MQTT completo optimizado para Cloudflare Workers
- ✅ API HTTP REST para gestión del broker
- ✅ WebSocket para comunicación MQTT en tiempo real
- ✅ Soporte para mensajes retenidos (retain)
- ✅ Patrones de suscripción con wildcards (`+` y `#`)
- ✅ Estadísticas y monitoreo en tiempo real
- ✅ Interfaz web de prueba incluida
- ✅ Compatible con dispositivos IoT estándar

## 📡 Endpoints disponibles

### HTTP REST API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Información del broker y estadísticas |
| GET | `/broker/stats` | Estadísticas detalladas del broker |
| GET | `/broker/topics` | Lista de tópicos disponibles |
| GET | `/broker/clients` | Lista de clientes conectados |
| POST | `/broker/publish` | Publicar mensaje vía HTTP |
| POST | `/broker/cleanup` | Limpiar clientes inactivos |

### WebSocket

| Endpoint | Descripción |
|----------|-------------|
| GET `/mqtt` | Conexión MQTT sobre WebSocket |

## 🔧 Uso

### 1. Iniciar el servidor

```bash
cd backend
pnpm run dev
```

### 2. Probar con la interfaz web

Abrir `mqtt-test.html` en el navegador para una interfaz completa de pruebas.

### 3. Conectar cliente MQTT via WebSocket

```javascript
const client = new WebSocket('ws://localhost:8787/mqtt');

client.onopen = () => {
    console.log('Conectado al broker');
};

client.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'connack') {
        // Suscribirse a un tópico
        client.send(JSON.stringify({
            type: 'subscribe',
            topic: 'temperature/+',
            messageId: 1
        }));
        
        // Publicar un mensaje
        client.send(JSON.stringify({
            type: 'publish',
            topic: 'temperature/sensor1',
            payload: JSON.stringify({
                temperature: 23.5,
                timestamp: new Date().toISOString()
            }),
            qos: 0,
            retain: false
        }));
    }
};
```

### 4. Publicar vía HTTP

```bash
curl -X POST http://localhost:8787/broker/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "temperature/sensor1",
    "message": {
      "temperature": 24.5,
      "humidity": 65.2,
      "timestamp": "2024-01-01T10:00:00Z"
    },
    "qos": 0,
    "retain": true
  }'
```

## 📋 Tópicos recomendados

### Tópicos de Temperatura

- `temperature/sensor1` - Datos del sensor 1
- `temperature/sensor2` - Datos del sensor 2
- `temperature/+` - Todos los sensores de temperatura

### Tópicos de Humedad

- `humidity/sensor1` - Datos de humedad del sensor 1
- `humidity/+` - Todos los sensores de humedad

### Estado de Sensores

- `status/sensor1` - Estado del sensor 1
- `status/+` - Estado de todos los sensores

### Alertas

- `alerts/temperature` - Alertas de temperatura
- `alerts/connection` - Alertas de conexión

## 📝 Formato de mensajes

### Temperatura

```json
{
  "sensorId": "sensor1",
  "temperature": 23.5,
  "unit": "celsius",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Humedad

```json
{
  "sensorId": "sensor1", 
  "humidity": 65.2,
  "unit": "percent",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Estado

```json
{
  "sensorId": "sensor1",
  "status": "online",
  "battery": 85,
  "lastSeen": "2024-01-01T10:00:00Z"
}
```

## 🧪 Testing

### Ejecutar cliente de prueba

```bash
cd backend
# Abrir mqtt-test.html en el navegador
firefox mqtt-test.html

# O ejecutar el script de prueba
./test-broker.sh
```

### Verificar estadísticas

```bash
curl http://localhost:8787/broker/stats
```

## ⚙️ Configuración

El broker está optimizado para Cloudflare Workers y no requiere configuración adicional. Los parámetros principales están en `simple-broker.ts`:

```typescript
// Timeout para limpieza de clientes inactivos
const timeout = 5 * 60 * 1000; // 5 minutos
```

## 📊 Logs y Monitoreo

El broker registra los siguientes eventos:

- 🔌 Conexiones y desconexiones de clientes
- 📤 Mensajes publicados con tópico y payload
- 📥 Suscripciones y desuscripciones
- ❌ Errores de clientes y conexiones
- 🧹 Limpieza de clientes inactivos

## 🏗️ Arquitectura

```bash
┌─────────────────┐    WebSocket    ┌──────────────┐
│   Cliente MQTT  │ ◄──────────────► │     Hono     │
│   (WebSocket)   │                 │   (Router)   │
└─────────────────┘                 └──────┬───────┘
                                           │
┌─────────────────┐    HTTP API            │
│  Cliente HTTP   │ ◄──────────────────────┤
└─────────────────┘                        │
                                    ┌──────▼───────┐
┌─────────────────┐                 │ Simple MQTT  │
│ Interfaz Web    │ ◄──────────────► │   Broker     │
│   (HTML/JS)     │                 │ (Optimizado) │
└─────────────────┘                 └──────────────┘
```

## 🔥 Características Avanzadas

### Mensajes Retenidos

Los mensajes marcados con `retain: true` se almacenan y se envían automáticamente a nuevos suscriptores del tópico.

### Patrones de Suscripción

- `+` : Un nivel (ej: `temperature/+` captura `temperature/sensor1`, `temperature/sensor2`)
- `#` : Múltiples niveles al final (ej: `sensors/#` captura todo bajo `sensors/`)

### Limpieza Automática

Clientes inactivos por más de 5 minutos se eliminan automáticamente para optimizar memoria.

### Compatibilidad

- ✅ WebSocket nativo
- ✅ Cloudflare Workers
- ✅ Navegadores modernos
- ✅ Node.js con ws
- ✅ Dispositivos IoT con WebSocket

## 🚀 Despliegue

Para desplegar en Cloudflare Workers:

```bash
cd backend
pnpm run deploy
```

## 📚 Archivos Incluidos

- `src/index.ts` - Servidor principal Hono
- `src/simple-broker.ts` - Motor MQTT optimizado
- `src/mqtt-test-client.js` - Cliente JavaScript de ejemplo
- `mqtt-test.html` - Interfaz web de prueba
- `test-broker.sh` - Script de pruebas automatizadas
- `MQTT_BROKER.md` - Esta documentación
