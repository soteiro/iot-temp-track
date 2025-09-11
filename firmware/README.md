# Firmware para Monitor de Temperatura y Humedad con ESP32

Este firmware está diseñado para un microcontrolador ESP32. Su función es leer los datos de un sensor de temperatura y humedad DHT22 y publicarlos en un broker MQTT para su posterior visualización o almacenamiento.

## Características

- Lectura de temperatura y humedad desde un sensor DHT22.
- Conexión a una red WiFi.
- Publicación de datos en formato JSON a un broker MQTT.
- Configuración centralizada y sencilla a través del archivo `include/config.h`.
- Desarrollado sobre el framework Arduino para ESP32 y gestionado con PlatformIO.

## Requisitos de Hardware

- Placa de desarrollo ESP32.
- Sensor de temperatura y humedad DHT22.
- Cables de conexión (jumpers).

## Requisitos de Software

- [Visual Studio Code](https://code.visualstudio.com/)
- [Extensión PlatformIO IDE](https://platformio.org/platformio-ide) para la integración con VS Code.
- [PlatformIO Core (CLI)](https://docs.platformio.org/en/latest/core/installation.html) para ejecutar comandos `pio` desde la terminal.

### Dependencias

Las siguientes librerías son gestionadas automáticamente por PlatformIO a través del archivo `platformio.ini`:

-`DHT sensor library`
-`Adafruit Unified Sensor`
-`PubSubClient`
-`ArduinoJson`

## Configuración

Toda la configuración del proyecto se encuentra en el archivo `include/config.h`. Antes de compilar, debes configurar tus credenciales de red y del broker MQTT.

1. **Crea el archivo `include/config.h`** si no existe.
2. **Añade tus credenciales** como se muestra en el siguiente ejemplo:

    ```cpp
    // include/config.h
    #ifndef CONFIG_H
    #define CONFIG_H

    // Configuración de WiFi
    const char* ssid = "NOMBRE_DE_TU_WIFI";
    const char* password = "PASSWORD_DE_TU_WIFI";

    // Configuración del Broker MQTT
    const char* mqtt_broker = "broker.emqx.io";
    const char* topic = "tu/topic/unico";
    const char* mqtt_username = "usuario_mqtt";
    const char* mqtt_password = "password_mqtt";
    const int mqtt_port = 1883;

    #endif
    ```

## Instalación y Uso

1. Clona o descarga este repositorio.
2. Abre la carpeta del proyecto con Visual Studio Code (con la extensión de PlatformIO instalada).
3. Configura tus credenciales en el archivo `include/config.h`.
4. Conecta tu placa ESP32 al ordenador.
5. Usa los controles de PlatformIO en la barra de estado de VS Code para:
    - **Compilar** (`PlatformIO: Build`).
    - **Subir el firmware** (`PlatformIO: Upload`).
    - **Monitorear la salida serial** (`PlatformIO: Serial Monitor`) para ver los logs de conexión y los datos enviados.

## Estructura del Proyecto

``` bash
.
├── include/
│   └── config.h      # Archivo para credenciales y configuración.
├── lib/
│   └── (vacío)       # Librerías locales del proyecto.
├── src/
│   └── main.cpp      # Lógica principal del firmware.
├── test/
│   └── (vacío)       # Pruebas unitarias.
└── platformio.ini    # Archivo de configuración de PlatformIO.
```
