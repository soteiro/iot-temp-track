# Firmware IoT Temperature Tracker - ESP32

Este firmware está diseñado para un microcontrolador ESP32 que funciona como un monitor IoT de temperatura y humedad. Lee datos del sensor DHT22 y los envía a un broker MQTT personalizado a través de WebSockets seguros (WSS) para su procesamiento y visualización en tiempo real.

## Características

- **Sensor DHT22**: Lectura precisa de temperatura (-40°C a 80°C) y humedad (0-100% RH)
- **Conectividad WiFi**: Conexión automática con reconexión inteligente
- **WebSocket Seguro (WSS)**: Comunicación en tiempo real con broker MQTT personalizado
- **Broker personalizado**: Desplegado en Cloudflare Workers para máxima disponibilidad
- **Sistema de alertas**: Notificaciones automáticas por umbrales de temperatura y humedad
- **Cliente ID único**: Generado automáticamente basado en la MAC del dispositivo
- **Diagnósticos**: Monitoreo completo de estado y calidad de señal WiFi
- **Configuración centralizada**: Todo configurable desde `include/config.h`
- **Desarrollo moderno**: Framework Arduino con PlatformIO

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

## Requisitos de Software

- **[Visual Studio Code](https://code.visualstudio.com/)** - Editor principal
- **[PlatformIO IDE Extension](https://platformio.org/platformio-ide)** - Para desarrollo ESP32
- **[PlatformIO Core (CLI)](https://docs.platformio.org/en/latest/core/installation.html)** - Para comandos desde terminal

### Dependencias (Auto-gestionadas por PlatformIO)

El archivo `platformio.ini` incluye todas las librerías necesarias:

- **`adafruit/DHT sensor library@^1.4.4`** - Control del sensor DHT22
- **`adafruit/Adafruit Unified Sensor@^1.1.14`** - Abstracción de sensores
- **`links2004/WebSockets@^2.4.0`** - Cliente WebSocket para ESP32
- **`bblanchon/ArduinoJson@^6.21.5`** - Manejo de JSON
- **`PubSubClient`** - Protocolo MQTT (usado internamente)
- **WiFi** (incluida en ESP32 Arduino Core)

## Configuración

Toda la configuración se centraliza en `include/config.h`. Este archivo contiene credenciales WiFi, configuración del broker, umbrales de alerta y parámetros del sistema.

### 1. Configurar credenciales WiFi y broker

Edita el archivo `include/config.h` con tus datos:

```cpp
// include/config.h
#ifndef CONFIG_H
#define CONFIG_H

// =============================================================================
// CONFIGURACIÓN WIFI
// =============================================================================
const char* ssid = "TU_RED_WIFI";           // Nombre de tu red WiFi
const char* password = "TU_PASSWORD_WIFI";   // Contraseña de WiFi

// =============================================================================
// CONFIGURACIÓN MQTT BROKER (WebSocket)
// =============================================================================
const char* mqtt_broker_host = "backend.diego-sarq.workers.dev";  // Tu broker personalizado
const int mqtt_broker_port = 443;            // Puerto HTTPS
const char* mqtt_path = "/mqtt";              // Ruta del WebSocket
const char* mqtt_protocol = "wss";           // WebSocket Secure

// =============================================================================
// CONFIGURACIÓN DE UMBRALES DE ALERTA
// =============================================================================
#define TEMP_ALERT_HIGH 30.0               // Temperatura alta (°C)
#define TEMP_ALERT_LOW 10.0                // Temperatura baja (°C)
#define HUMIDITY_ALERT_HIGH 80.0           // Humedad alta (%)
#define HUMIDITY_ALERT_LOW 30.0            // Humedad baja (%)

#endif
```

### 2. Broker MQTT Personalizado

Este proyecto utiliza un broker MQTT personalizado desplegado en **Cloudflare Workers** que:

- ✅ Acepta conexiones WebSocket seguras (WSS)
- ✅ Procesa mensajes MQTT en tiempo real
- ✅ Proporciona alta disponibilidad global
- ✅ No requiere autenticación (configurable)
- ✅ Soporta retain messages y suscripciones

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

1. **Editar credenciales**: Modifica `include/config.h` con tu WiFi y configuración del broker
2. **Verificar hardware**: Conecta el DHT22 según el esquema de conexiones

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

- ✅ Estado de conexión WiFi y calidad de señal
- ✅ Información del broker WebSocket
- ✅ Lecturas del sensor en tiempo real
- ✅ Mensajes de alerta por umbrales
- ✅ Eventos de conexión/desconexión

## Arquitectura del Sistema

### Flujo de datos

```text
[DHT22] → [ESP32] → [WiFi] → [WebSocket WSS] → [Cloudflare Workers] → [MQTT Broker]
```

### Tópicos MQTT utilizados

El sistema organiza los datos en tópicos específicos:

- **`temperature/{clientId}`** - Lecturas de temperatura en °C
- **`humidity/{clientId}`** - Lecturas de humedad en %
- **`status/{clientId}`** - Estado del dispositivo (online/offline)
- **`alerts/{clientId}`** - Alertas por umbrales excedidos
- **`sensors/{clientId}`** - Información completa del sensor

### Funcionalidades avanzadas

- **Reconexión automática**: Si se pierde WiFi o WebSocket, reintenta cada 30 segundos
- **Cliente ID único**: Basado en MAC address para identificación unívoca
- **Umbrales configurables**: Alertas automáticas por temperatura/humedad
- **Mensajes retained**: El estado se mantiene en el broker
- **Control remoto**: Posibilidad de recibir comandos via `control/{clientId}`

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

## Solución de Problemas

### Problemas comunes

#### Error de conexión WiFi

```text
Solución: Verificar SSID y password en config.h
         Comprobar que la red es 2.4GHz (ESP32 no soporta 5GHz)
```

#### WebSocket no conecta

```text
Solución: Verificar que mqtt_broker_host esté accesible
         Comprobar certificados SSL/TLS
         Revisar firewall/proxy corporativo
```

#### Sensor DHT22 da lecturas erróneas

```text
Solución: Verificar conexiones (VCC, GND, DATA)
         Añadir resistor pull-up 10kΩ en DATA
         Comprobar que el sensor no esté defectuoso
```

#### Errores de compilación

```text
Solución: Actualizar PlatformIO Core: pio upgrade
         Limpiar build: pio run --target clean
         Reinstalar dependencias: pio lib install
```

### Debugging avanzado

Para debugging más detallado, habilita logs adicionales en `platformio.ini`:

```ini
build_flags = 
    -DCORE_DEBUG_LEVEL=5        ; Máximo nivel de debug
    -DDEBUG_ESP_WIFI            ; Debug WiFi
    -DDEBUG_ESP_HTTP_CLIENT     ; Debug HTTP/WebSocket
```

## Personalización

### Cambiar intervalo de lectura

Edita `config.h`:

```cpp
#define PUBLISH_INTERVAL 10000    // Publicar cada 10 segundos
#define DHT_READ_INTERVAL 5000    // Leer DHT cada 5 segundos
```

### Añadir nuevos sensores

1. Incluir librería del sensor en `platformio.ini`
2. Añadir configuración en `config.h`
3. Implementar lectura en `src/main.cpp`
4. Crear nuevos tópicos MQTT

### Configurar alertas personalizadas

Modifica los umbrales en `config.h`:

```cpp
#define TEMP_ALERT_HIGH 25.0      // Personalizar según necesidad
#define TEMP_ALERT_LOW 15.0       
#define HUMIDITY_ALERT_HIGH 70.0  
#define HUMIDITY_ALERT_LOW 40.0   
```

## Contribución

1. **Fork** el repositorio
2. **Crear branch** para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. **Commit** tus cambios: `git commit -am 'Add nueva funcionalidad'`
4. **Push** al branch: `git push origin feature/nueva-funcionalidad`
5. **Crear Pull Request**

## Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

## Créditos

- **DHT22**: Sensor de temperatura y humedad de Adafruit
- **ESP32**: Microcontrolador de Espressif Systems
- **PlatformIO**: Plataforma de desarrollo IoT
- **WebSockets**: Comunicación en tiempo real
- **Cloudflare Workers**: Infraestructura de broker MQTT

---

Desarrollado con ❤️ para IoT
