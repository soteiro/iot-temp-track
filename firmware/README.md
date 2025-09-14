# IoT Temperature Tracker - ESP32

This firmware is designed for an ESP32 microcontroller that functions as an IoT temperature and humidity monitor. It reads data from the DHT22 sensor and sends it to a custom MQTT broker through secure WebSockets (WSS) for real-time processing and visualization.

## 🚀 Features

- **DHT22 Sensor**: Accurate temperature readings (-40°C to 80°C) and humidity (0-100% RH)
- **WiFi Connectivity**: Automatic connection with intelligent reconnection
- **WebSocket Secure (WSS)**: Real-time communication with custom MQTT broker
- **Custom Broker**: Deployed on Cloudflare Workers for maximum availability
- **Alert System**: Automatic notifications for temperature and humidity thresholds
- **Unique Client ID**: Automatically generated based on device MAC address
- **Diagnostics**: Complete monitoring of status and WiFi signal quality
- **Centralized Configuration**: Everything configurable from `include/config.h`
- **Modern Development**: Arduino framework with PlatformIO

## 🔧 Hardware Requirements

- **ESP32 Development Board** (tested with ESP32-DevKitC)
- **DHT22 Sensor** (AM2302) with 10kΩ pull-up resistor
- **Jumper Wires** (male-female)
- **Breadboard** (optional, for more stable connections)

### Circuit Connection Schema

```text
ESP32          DHT22
-----          -----
3.3V    -----> VCC
GPIO4   -----> DATA (with 10kΩ pull-up resistor to VCC)
GND     -----> GND
```

**Important**: The 10kΩ pull-up resistor between DATA and VCC is essential for stable DHT22 operation.

## 💻 Software Requirements

- **[Visual Studio Code](https://code.visualstudio.com/)** - Main editor
- **[PlatformIO IDE Extension](https://platformio.org/platformio-ide)** - For ESP32 development
- **[PlatformIO Core (CLI)](https://docs.platformio.org/en/latest/core/installation.html)** - For terminal commands

### Dependencies (Auto-managed by PlatformIO)

The `platformio.ini` file includes all necessary libraries with exact versions:

- **`adafruit/DHT sensor library@^1.4.4`** - DHT22 sensor control
- **`adafruit/Adafruit Unified Sensor@^1.1.14`** - Sensor abstraction layer
- **`links2004/WebSockets@^2.4.0`** - WebSocket client for ESP32
- **`bblanchon/ArduinoJson@^6.21.5`** - JSON handling
- **`PubSubClient`** - MQTT protocol (used internally)
- **WiFi** (included in ESP32 Arduino Core)

## ⚙️ Configuration

All configuration is centralized in `include/config.h`. This file contains WiFi credentials, broker configuration, alert thresholds, and system parameters.

### 1. Configure WiFi credentials and broker

Edit the `include/config.h` file with your data:

```cpp
// include/config.h
#ifndef CONFIG_H
#define CONFIG_H

// =============================================================================
// WIFI CONFIGURATION
// =============================================================================
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password

// =============================================================================
// MQTT BROKER CONFIGURATION (WebSocket)
// =============================================================================
const char* mqtt_broker_host = "backend.diego-sarq.workers.dev";  // Your custom broker
const int mqtt_broker_port = 443;              // HTTPS port
const char* mqtt_path = "/mqtt";                // WebSocket path
const char* mqtt_protocol = "wss";             // WebSocket Secure

// =============================================================================
// ALERT THRESHOLD CONFIGURATION
// =============================================================================
#define TEMP_ALERT_HIGH 30.0                   // High temperature (°C)
#define TEMP_ALERT_LOW 10.0                    // Low temperature (°C)
#define HUMIDITY_ALERT_HIGH 80.0               // High humidity (%)
#define HUMIDITY_ALERT_LOW 30.0                // Low humidity (%)

#endif
```

### 2. Custom MQTT Broker

This project uses a custom MQTT broker deployed on **Cloudflare Workers** that:

- ✅ Accepts secure WebSocket connections (WSS)
- ✅ Processes MQTT messages in real-time
- ✅ Provides global high availability
- ✅ Requires no authentication (configurable)
- ✅ Supports retain messages and subscriptions

## 🚀 Installation and Usage

### 1. Project Setup

```bash
# Clone the repository
git clone <repo-url>
cd iot-temp-track/firmware

# Open with VS Code
code .
```

### 2. Configuration

1. **Edit credentials**: Modify `include/config.h` with your WiFi and broker configuration
2. **Verify hardware**: Connect the DHT22 according to the connection schema

### 3. Development with PlatformIO

Use the VS Code status bar (PlatformIO toolbar):

- **🔨 Build** (`PlatformIO: Build`) - Compile firmware
- **➡️ Upload** (`PlatformIO: Upload`) - Upload to ESP32
- **🔌 Serial Monitor** (`PlatformIO: Serial Monitor`) - View real-time logs

### 4. Alternative Commands (Terminal)

```bash
# Compile
pio run

# Upload firmware
pio run --target upload

# Serial monitor
pio device monitor --baud 115200

# Clean build
pio run --target clean
```

### 5. Monitoring and Debugging

The firmware sends detailed information via serial port (115200 baud):

- ✅ WiFi connection status and signal quality
- ✅ WebSocket broker information
- ✅ Real-time sensor readings
- ✅ Alert messages for thresholds
- ✅ Connection/disconnection events

## 🏗️ System Architecture

### Data Flow

```text
[DHT22] → [ESP32] → [WiFi] → [WebSocket WSS] → [Cloudflare Workers] → [MQTT Broker]
                                     ↓
                              [Dashboard/Frontend]
```

### MQTT Topics Used

The system organizes data into specific topics:

- **`temperature/{clientId}`** - Temperature readings in °C
- **`humidity/{clientId}`** - Humidity readings in %
- **`status/{clientId}`** - Device status (online/offline)
- **`alerts/{clientId}`** - Threshold exceeded alerts
- **`sensors/{clientId}`** - Complete sensor information
- **`control/{clientId}`** - Remote control commands

### Advanced Features

- **Automatic Reconnection**: If WiFi or WebSocket is lost, retries every 30 seconds
- **Unique Client ID**: Based on MAC address for unique identification
- **Configurable Thresholds**: Automatic alerts for temperature/humidity
- **Retained Messages**: Status is maintained in the broker
- **Remote Control**: Ability to receive commands via `control/{clientId}`

### WebSocket Communication

The ESP32 communicates with the MQTT broker using JSON messages over WSS:

```json
// Connection message
{
  "type": "connect",
  "clientId": "esp32-AABBCCDDEEFF",
  "keepAlive": 60,
  "cleanSession": true
}

// Publish message
{
  "type": "publish",
  "topic": "temperature/esp32-AABBCCDDEEFF",
  "payload": "23.5",
  "qos": 0,
  "retain": false
}

// Subscribe message
{
  "type": "subscribe",
  "topic": "control/esp32-AABBCCDDEEFF",
  "qos": 0
}
```

## 📁 Project Structure

```text
firmware/
├── include/
│   └── config.h               # ⚙️ Centralized configuration
├── lib/                       # 📚 Local libraries (empty)
├── src/
│   └── main.cpp               # 🚀 Main firmware logic
├── test/                      # 🧪 Unit tests (empty)
├── platformio.ini             # 📋 PlatformIO configuration
├── firmware-manager.sh        # 🔧 Management script
└── README.md                  # 📖 This file
```

### File Descriptions

- **`include/config.h`**: Contains all WiFi, broker, and threshold configuration
- **`src/main.cpp`**: Main firmware logic with WebSocket MQTT client
- **`platformio.ini`**: PlatformIO project configuration with dependencies
- **`firmware-manager.sh`**: Utility script for building, uploading, and monitoring

## 🔧 Troubleshooting

### Common Issues

#### WiFi Connection Error

```text
Solution: Verify SSID and password in config.h
         Check that network is 2.4GHz (ESP32 doesn't support 5GHz)
         Ensure WiFi network is within range
```

#### WebSocket Won't Connect

```text
Solution: Verify mqtt_broker_host is accessible
         Check SSL/TLS certificates
         Review corporate firewall/proxy settings
         Test broker with: curl https://backend.diego-sarq.workers.dev
```

#### DHT22 Sensor Gives Wrong Readings

```text
Solution: Verify connections (VCC, GND, DATA)
         Add 10kΩ pull-up resistor on DATA line
         Check that sensor is not defective
         Ensure 3.3V power supply is stable
```

#### Compilation Errors

```text
Solution: Update PlatformIO Core: pio upgrade
         Clean build: pio run --target clean
         Reinstall dependencies: pio lib install
         Check that include/config.h exists
```

#### Serial Monitor Shows No Output

```text
Solution: Check baud rate is set to 115200
         Verify USB cable supports data (not just power)
         Try different USB port
         Reset ESP32 after connecting serial monitor
```

### Advanced Debugging

For more detailed debugging, enable additional logs in `platformio.ini`:

```ini
build_flags = 
    -DCORE_DEBUG_LEVEL=5        ; Maximum debug level
    -DDEBUG_ESP_WIFI            ; WiFi debug
    -DDEBUG_ESP_HTTP_CLIENT     ; HTTP/WebSocket debug
    -DDEBUG_ESP_SSL             ; SSL/TLS debug
```

### WebSocket SSL/TLS Debugging

If experiencing SSL connection issues:

1. **Test broker connectivity**:
   ```bash
   curl -I https://backend.diego-sarq.workers.dev
   ```

2. **Check certificate chain**:
   ```bash
   openssl s_client -connect backend.diego-sarq.workers.dev:443 -servername backend.diego-sarq.workers.dev
   ```

3. **Verify ESP32 time**: SSL requires accurate time. The ESP32 may need NTP synchronization for proper certificate validation.

## 🎨 Customization

### Change Reading Interval

Edit the firmware source code (`src/main.cpp`):

```cpp
const long interval = 5000;             // Publish every 5 seconds
const long reconnectInterval = 30000;   // Reconnect every 30 seconds
```

### Add New Sensors

1. Include sensor library in `platformio.ini`
2. Add sensor configuration in `include/config.h`
3. Implement sensor reading in `src/main.cpp`
4. Create new MQTT topics for the sensor data

Example for BMP280 pressure sensor:

```cpp
// In platformio.ini, add:
// adafruit/Adafruit BMP280 Library@^2.6.8

// In config.h, add:
#define BMP_SDA 21
#define BMP_SCL 22

// In main.cpp, add pressure reading and publishing:
mqttPublish("pressure/" + clientId, String(pressure));
```

### Configure Custom Alert Thresholds

Modify thresholds in `include/config.h`:

```cpp
#define TEMP_ALERT_HIGH 25.0      // Custom high temperature
#define TEMP_ALERT_LOW 15.0       // Custom low temperature
#define HUMIDITY_ALERT_HIGH 70.0  // Custom high humidity
#define HUMIDITY_ALERT_LOW 40.0   // Custom low humidity
```

### Add Custom MQTT Topics

Add new topics in the `readAndPublishSensorData()` function:

```cpp
// Custom topic for device diagnostics
StaticJsonDocument<200> diagnostics;
diagnostics["uptime"] = millis() / 1000;
diagnostics["heap_free"] = ESP.getFreeHeap();
diagnostics["wifi_rssi"] = WiFi.RSSI();

String diagStr;
serializeJson(diagnostics, diagStr);
mqttPublish("diagnostics/" + clientId, diagStr);
```

### Remote Control Commands

The firmware supports remote control via `control/{clientId}` topic. Supported commands:

```json
// Restart device
{
  "command": "restart"
}

// Request immediate status update
{
  "command": "status"
}

// Set new reading interval (requires firmware modification)
{
  "command": "set_interval",
  "value": 10000
}
```

## 🧰 Firmware Manager Script

The included `firmware-manager.sh` script provides convenient commands for development:

```bash
# Switch to simple test version
./firmware-manager.sh simple

# Switch to full version
./firmware-manager.sh full

# Compile firmware
./firmware-manager.sh compile

# Upload to ESP32
./firmware-manager.sh upload

# Open serial monitor
./firmware-manager.sh monitor

# Compile and upload in one command
./firmware-manager.sh build-upload
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create branch** for your feature: `git checkout -b feature/new-functionality`
3. **Commit** your changes: `git commit -am 'Add new functionality'`
4. **Push** to branch: `git push origin feature/new-functionality`
5. **Create Pull Request**

## 📄 License

This project is under the MIT license. See `LICENSE` file for more details.

## 🏆 Credits

- **DHT22**: Temperature and humidity sensor by Adafruit
- **ESP32**: Microcontroller by Espressif Systems
- **PlatformIO**: IoT development platform
- **WebSockets**: Real-time communication library
- **Cloudflare Workers**: MQTT broker infrastructure

---

Developed with ❤️ for IoT
