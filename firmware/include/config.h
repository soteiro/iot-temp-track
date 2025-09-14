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