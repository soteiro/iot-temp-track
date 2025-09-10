#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
// Replace with your network credentials
#define WIFI_SSID "your_wifi_network"
#define WIFI_PASSWORD "your_wifi_password"

// MQTT Broker Configuration
// You can use a free MQTT broker like:
// - broker.hivemq.com (port 1883)
// - test.mosquitto.org (port 1883)
// - broker.emqx.io (port 1883)
#define MQTT_SERVER "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_USER ""  // Leave empty for public brokers
#define MQTT_PASSWORD ""  // Leave empty for public brokers
#define MQTT_TOPIC "iot-temp-track/sensors/data"

// Device Configuration
#define DEVICE_ID "esp32_sensor_01"
#define LOCATION "development"

// Sensor Configuration
#define DHT_PIN 4
#define DHT_TYPE DHT22  // Change to DHT11 if using DHT11

// Timing Configuration
#define MEASUREMENT_INTERVAL 30000  // 30 seconds in milliseconds
#define SERIAL_BAUD 115200

#endif
