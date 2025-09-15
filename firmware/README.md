# Firmware IoT Temperature Tracker - ESP32

Este firmware está diseñado para un microcontrolador ESP32 que funciona como un monitor IoT de temperatura y humedad. Lee datos del sensor DHT22 y los envía a un broker MQTT tradicional para su procesamiento y visualización en tiempo real.

## Características

- **Sensor DHT22**: Lectura precisa de temperatura (-40°C a 80°C) y humedad (0-100% RH)
- **Conectividad WiFi**: Conexión automática con reconexión inteligente
- **Protocolo MQTT**: Comunicación estándar con broker MQTT (PubSubClient)
- **Índice de calor**: Cálculo automático del heat index para mayor información
- **Cliente ID único**: Generado automáticamente basado en la MAC del dispositivo
- **Diagnósticos**: Monitoreo completo de estado y calidad de señal WiFi
- **Configuración centralizada**: Todo configurable desde `include/config.h`
- **Desarrollo moderno**: Framework Arduino con PlatformIO
- **Manejo de errores**: Valores por defecto si el sensor falla

## Requisitos de Hardware

- **Placa de desarrollo ESP32** (probado con ESP32-DevKitC)
- **Sensor DHT22** (AM2302) con pull-up resistor de 10kΩ
- **Cables de conexión** (jumpers macho-hembra)
- **Protoboard** (opcional, para conexiones más estables)

### Conexiones del Circuito

```text
ESP32          DHT22
-----          -----
3.3V    -----> VCC
GPIO4   -----> DATA (con resistor pull-up 10kΩ a VCC)
GND     -----> GND
```

**Nota**: El pin GPIO se define en `config.h` con la constante `DHTPIN`.

## Requisitos de Software

- **[Visual Studio Code](https://code.visualstudio.com/)** - Editor principal
- **[PlatformIO IDE Extension](https://platformio.org/platformio-ide)** - Para desarrollo ESP32
- **[PlatformIO Core (CLI)](https://docs.platformio.org/en/latest/core/installation.html)** - Para comandos desde terminal

### Dependencias (Auto-gestionadas por PlatformIO)

El archivo `platformio.ini` incluye todas las librerías necesarias:

- **`adafruit/DHT sensor library@^1.4.4`** - Control del sensor DHT22
- **`adafruit/Adafruit Unified Sensor@^1.1.14`** - Abstracción de sensores
- **`knolleary/PubSubClient@^2.8`** - Cliente MQTT estándar
- **`bblanchon/ArduinoJson@^6.21.5`** - Manejo de JSON
- **WiFi** (incluida en ESP32 Arduino Core)

## Configuración

Toda la configuración se centraliza en `include/config.h`. Este archivo contiene credenciales WiFi, configuración del broker MQTT, parámetros del sensor y configuración del sistema.

### 1. Configurar credenciales WiFi y broker MQTT

Edita el archivo `include/config.h` con tus datos:

```cpp
// include/config.h
#ifndef CONFIG_H
#define CONFIG_H

// =============================================================================
// CONFIGURACIÓN WIFI
// =============================================================================
#define WIFI_SSID "TU_RED_WIFI"           // Nombre de tu red WiFi
#define WIFI_PASSWORD "TU_PASSWORD_WIFI"   // Contraseña de WiFi

// =============================================================================
// CONFIGURACIÓN MQTT BROKER
// =============================================================================
#define MQTT_BROKER "tu-broker-mqtt.com"   // Dirección del broker MQTT
#define MQTT_PORT 1883                     // Puerto estándar MQTT (1883 o 8883 para SSL)
#define MQTT_USER "usuario"                // Usuario MQTT (opcional)
#define MQTT_PASSWORD "password"           // Contraseña MQTT (opcional)

// =============================================================================
// CONFIGURACIÓN DEL SENSOR DHT22
// =============================================================================
#define DHTPIN 4                          // Pin GPIO donde está conectado el DHT22
#define DHTTYPE DHT22                     // Tipo de sensor (DHT22/AM2302)

// =============================================================================
// CONFIGURACIÓN DE TOPICS MQTT
// =============================================================================
#define TOPIC_BASE "5a728254-5316-45c6-bf3c-de194f1afa53"  // Topic base único
#define TOPIC_SENSOR_DATA TOPIC_BASE "/sensor_data"         // Topic para datos del sensor
#define TOPIC_COMMANDS TOPIC_BASE "/commands"               // Topic para comandos remotos

// =============================================================================
// CONFIGURACIÓN DEL SISTEMA
// =============================================================================
#define PUBLISH_INTERVAL 5000             // Intervalo de publicación en ms (5 segundos)
#define RECONNECT_DELAY 10000             // Tiempo de espera para reconexión MQTT (10 seg)

#endif
```

### 2. Broker MQTT

Este firmware está configurado para trabajar con **cualquier broker MQTT estándar**:

- ✅ **Mosquitto** (broker open source)
- ✅ **HiveMQ** (broker comercial)
- ✅ **AWS IoT Core** (con adaptación para SSL)
- ✅ **Google Cloud IoT** (con configuración adicional)
- ✅ **Brokers locales** (Raspberry Pi, Docker, etc.)

## Instalación y Uso

### 1. Preparación del proyecto

```bash
# Clonar el repositorio
git clone <repo-url>
cd iot-temp-track/firmware

# Abrir con VS Code
code .
```

### 2. Configuración

1. **Editar credenciales**: Modifica `include/config.h` con tu WiFi y configuración del broker MQTT
2. **Verificar hardware**: Conecta el DHT22 según el esquema de conexiones
3. **Configurar broker**: Asegúrate de que tu broker MQTT esté accesible

### 3. Desarrollo con PlatformIO

Usa la barra de estado de VS Code (PlatformIO toolbar):

- **🔨 Build** (`PlatformIO: Build`) - Compilar firmware
- **➡️ Upload** (`PlatformIO: Upload`) - Subir a ESP32
- **🔌 Serial Monitor** (`PlatformIO: Serial Monitor`) - Ver logs en tiempo real

### 4. Comandos alternativos (Terminal)

```bash
# Compilar
pio run

# Subir firmware
pio run --target upload

# Monitor serie
pio device monitor --baud 115200

# Limpiar build
pio run --target clean
```

### 5. Monitoreo y debugging

El firmware envía información detallada por puerto serie (115200 baudios):

```text
=== ESP32 IoT Temperature Tracker ===
Starting system initialization...
Connecting to WiFi: TU_RED_WIFI
....
WiFi connected successfully!
IP address: 192.168.1.100
Signal strength (RSSI): -45 dBm
Initializing DHT sensor...
DHT sensor initialized
Connecting to MQTT broker: tu-broker-mqtt.com
System initialization complete!
================================
Attempting MQTT connection...Client ID: ESP32-A1B2C3D4E5F6 connected!
Connected to MQTT broker
Subscribed to topics
Reading sensor data...
Temperature: 24.5 °C
Humidity: 65.2 %
Heat Index: 25.1 °C
Publishing data to MQTT...
JSON payload: {"device_id":"ESP32-A1B2C3D4E5F6","timestamp":15432,"temperature":24.5,"humidity":65.2,"heat_index":25.1,"wifi_rssi":-45}
✓ JSON data published successfully!
-----
```

## Arquitectura del Sistema

### Flujo de datos

```text
[DHT22] → [ESP32] → [WiFi] → [MQTT Broker] → [Aplicaciones/Dashboard]
```

### Tópicos MQTT utilizados

El sistema organiza los datos en tópicos específicos:

- **`{TOPIC_BASE}/sensor_data`** - Datos completos del sensor en formato JSON
- **`{TOPIC_BASE}/commands`** - Comandos remotos para el dispositivo

#### Formato de datos JSON

```json
{
  "device_id": "ESP32-A1B2C3D4E5F6",
  "timestamp": 15432,
  "temperature": 24.5,
  "humidity": 65.2,
  "heat_index": 25.1,
  "wifi_rssi": -45
}
```

#### Formato de comandos

```json
{
  "action": "restart",
  "parameters": {}
}
```

### Funcionalidades del sistema

- **Reconexión automática**: Si se pierde WiFi o MQTT, reintenta automáticamente
- **Cliente ID único**: Basado en MAC address para identificación unívoca
- **Sensor resiliente**: Usa valores por defecto si el DHT22 falla
- **Índice de calor**: Cálculo automático para mayor información meteorológica
- **Monitoreo WiFi**: Incluye calidad de señal en los datos
- **Control remoto**: Preparado para recibir comandos via MQTT

## Estructura del Proyecto

```text
firmware/
├── include/
│   └── config.h              # ⚙️ Configuración centralizada
├── lib/                      # 📚 Librerías locales (vacío)
├── src/
│   └── main.cpp              # 🚀 Lógica principal del firmware
├── test/                     # 🧪 Pruebas unitarias (vacío)
├── platformio.ini            # 📋 Configuración PlatformIO
├── firmware-manager.sh       # 🔧 Script de gestión
└── README.md                 # 📖 Este archivo
```

## Funciones Principales

### `setup_wifi()`
- Conecta el ESP32 a la red WiFi configurada
- Muestra información de conexión y calidad de señal
- Maneja errores de conexión

### `reconnect()`
- Establece conexión con el broker MQTT
- Genera cliente ID único basado en MAC
- Se suscribe a topics de comandos
- Implementa retry automático con delay

### `callback()`
- Procesa mensajes recibidos via MQTT
- Maneja comandos remotos en formato JSON
- Extensible para futuras funcionalidades

### `loop()` principal
- Lee datos del sensor DHT22 cada 5 segundos
- Calcula índice de calor automáticamente
- Publica datos en formato JSON al broker MQTT
- Maneja errores de sensor con valores por defecto
- Mantiene conexión MQTT activa

## Solución de Problemas

### Problemas comunes

#### Error de conexión WiFi

```text
Síntoma: "Connecting to WiFi" se queda cargando
Solución: 
- Verificar SSID y password en config.h
- Comprobar que la red es 2.4GHz (ESP32 no soporta 5GHz)
- Verificar que la red esté disponible
```

#### Error de conexión MQTT

```text
Síntoma: "failed, rc=X retrying in 10 seconds..."
Solución:
- Verificar que MQTT_BROKER sea accesible
- Comprobar puerto (1883 para no-SSL, 8883 para SSL)
- Verificar credenciales si el broker las requiere
- Revisar firewall/router
```

#### Sensor DHT22 da lecturas erróneas

```text
Síntoma: "ERROR: Failed to read from DHT sensor!"
Solución:
- Verificar conexiones (VCC=3.3V, GND, DATA=GPIO4)
- Añadir resistor pull-up 10kΩ entre DATA y VCC
- Verificar que el sensor no esté defectuoso
- El firmware usará valores por defecto (temp=25°C, hum=60%)
```

#### Errores de compilación

```text
Solución:
- Actualizar PlatformIO Core: pio upgrade
- Limpiar build: pio run --target clean
- Verificar que config.h existe y está bien formateado
- Reinstalar dependencias: pio lib install
```

### Códigos de error MQTT

| Código | Descripción | Solución |
|--------|-------------|----------|
| -4 | Connection timeout | Verificar red/broker |
| -3 | Connection lost | Verificar estabilidad red |
| -2 | Connect failed | Verificar broker/puerto |
| -1 | Disconnected | Reconexión automática |
| 0 | Connected | Todo OK |
| 1 | Bad protocol | Verificar versión MQTT |
| 2 | Bad client ID | Cambiar cliente ID |
| 4 | Bad credentials | Verificar user/password |
| 5 | Unauthorized | Verificar permisos |

### Debugging avanzado

Para debugging más detallado, habilita logs adicionales en `platformio.ini`:

```ini
build_flags = 
    -DCORE_DEBUG_LEVEL=5        ; Máximo nivel de debug
    -DDEBUG_ESP_WIFI            ; Debug WiFi
    -DDEBUG_ESP_HTTP_CLIENT     ; Debug conexiones
```

## Personalización

### Cambiar intervalo de lectura

Edita `config.h`:

```cpp
#define PUBLISH_INTERVAL 10000    // Publicar cada 10 segundos
#define RECONNECT_DELAY 5000      // Reintentar conexión cada 5 segundos
```

### Añadir nuevos sensores

1. Incluir librería del sensor en `platformio.ini`
2. Añadir configuración en `config.h`
3. Implementar lectura en el `loop()` de `main.cpp`
4. Añadir campos al JSON de datos

### Configurar SSL/TLS

Para conexiones seguras, modifica `config.h`:

```cpp
#define MQTT_PORT 8883                    // Puerto SSL
```

Y añade configuración SSL en `main.cpp`:

```cpp
#include <WiFiClientSecure.h>
WiFiClientSecure espClient;  // En lugar de WiFiClient
```

### Añadir comandos remotos

Expande la función `callback()` para manejar más comandos:

```cpp
void callback(char* topic, byte* payload, unsigned int length){
    // ... código existente ...
    
    if (String(topic).endsWith("/commands")) {
        StaticJsonDocument<200> cmdDoc;
        DeserializationError error = deserializeJson(cmdDoc, message);
        
        if (!error && cmdDoc.containsKey("action")) {
            String action = cmdDoc["action"];
            
            if (action == "restart") {
                ESP.restart();
            } else if (action == "calibrate") {
                // Implementar calibración
            } else if (action == "change_interval") {
                // Cambiar intervalo dinámicamente
            }
        }
    }
}
```

## Contribución

1. **Fork** el repositorio
2. **Crear branch** para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. **Commit** tus cambios: `git commit -am 'Add nueva funcionalidad'`
4. **Push** al branch: `git push origin feature/nueva-funcionalidad`
5. **Crear Pull Request**

## Roadmap

- [ ] Soporte para múltiples sensores
- [ ] Configuración via web portal
- [ ] OTA (Over-The-Air) updates
- [ ] Integración con HomeAssistant
- [ ] Modo deep sleep para ahorro energético
- [ ] Almacenamiento local en SD
- [ ] Display OLED para datos locales

## Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

## Créditos

- **DHT22**: Sensor de temperatura y humedad de Adafruit
- **ESP32**: Microcontrolador de Espressif Systems
- **PlatformIO**: Plataforma de desarrollo IoT
- **PubSubClient**: Librería MQTT para Arduino
- **ArduinoJson**: Manejo eficiente de JSON

---

Desarrollado con ❤️ para IoT

**Última actualización**: Septiembre 2025  
**Versión del firmware**: 1.0.0  
**Compatibilidad**: ESP32 Arduino Core 2.x+
