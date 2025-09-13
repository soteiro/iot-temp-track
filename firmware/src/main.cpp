#include <WiFi.h>
#include <Arduino.h>
#include <DHT.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "config.h"

// =============================================================================
// CONFIGURACIÓN DEL SENSOR DHT22
// =============================================================================
// DHT22: Sensor digital de temperatura y humedad
// - Precisión: ±0.5°C para temperatura, ±2-5% para humedad
// - Rango: -40 a 80°C, 0-100% RH
// - Interfaz: Un solo cable digital (protocolo 1-Wire)
#define DHTPIN 4        // Pin GPIO4 del ESP32 conectado al sensor DHT22
#define DHTTYPE DHT22   // Tipo de sensor DHT (DHT11, DHT21, DHT22)
DHT dht(DHTPIN, DHTTYPE);

// =============================================================================
// CONFIGURACIÓN DEL CLIENTE WEBSOCKET
// =============================================================================
// WebSocketsClient: Librería para comunicación WebSocket en ESP32
// Permite comunicación bidireccional en tiempo real con el broker
WebSocketsClient webSocket;

// =============================================================================
// VARIABLES GLOBALES DE CONTROL
// =============================================================================
bool isConnectedToMQTT = false;        // Estado de conexión MQTT
String clientId = "";                   // ID único del cliente MQTT
unsigned long lastMsg = 0;              // Timestamp del último mensaje enviado
const long interval = 5000;             // Intervalo de publicación (5 segundos)
const long reconnectInterval = 30000;   // Intervalo de reconexión (30 segundos)
unsigned long lastReconnectAttempt = 0; // Timestamp del último intento de reconexión

// =============================================================================
// PROTOTIPOS DE FUNCIONES
// =============================================================================
void connectToWifi();
void setupWebSocket();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void connectToMQTTBroker();
void mqttSubscribe(const String& topic);
void mqttPublish(const String& topic, const String& payload, bool retain = false);
void readAndPublishSensorData();
void publishStatus(const String& status, bool retain = true);
void handleControlMessage(const String& message);
void checkThresholds(float temperature, float humidity);
String generateClientId();
unsigned long getTimestamp();

// =============================================================================
// FUNCIÓN SETUP: INICIALIZACIÓN DEL SISTEMA
// =============================================================================
void setup() {
    // Inicializar comunicación serie para debugging
    // 115200 baudios es una velocidad estándar para ESP32
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n=== ESP32 IoT Temperature Tracker ===");
    Serial.println("Iniciando sistema...");
    
    // Inicializar sensor DHT22
    // El sensor necesita unos milisegundos para estabilizarse
    dht.begin();
    Serial.println("✓ Sensor DHT22 inicializado");
    
    // Generar un ID único para este cliente
    // Basado en la MAC del ESP32 para garantizar unicidad
    clientId = generateClientId();
    Serial.printf("✓ Client ID generado: %s\n", clientId.c_str());
    
    // Conectar a WiFi primero (prerequisito para WebSocket)
    connectToWifi();
    
    // Configurar e inicializar WebSocket
    setupWebSocket();
    
    Serial.println("=== Setup completado ===\n");
}

// =============================================================================
// CONEXIÓN A WIFI
// =============================================================================
void connectToWifi() {
    Serial.println("Conectando a WiFi...");
    
    // Configurar país/región para WiFi
    WiFi.mode(WIFI_STA);
    WiFi.setTxPower(WIFI_POWER_19_5dBm); // Máxima potencia
    
    // Escanear redes disponibles para diagnóstico
    Serial.println("Escaneando redes WiFi disponibles...");
    int n = WiFi.scanNetworks();
    Serial.printf("Se encontraron %d redes:\n", n);
    for (int i = 0; i < n; ++i) {
        Serial.printf("%d: %s (RSSI: %d, Canal: %d)\n", 
                     i, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i));
    }
    
    // Iniciar conexión WiFi con credenciales del config.h
    WiFi.begin(ssid, password);
    
    // Bucle de espera hasta establecer conexión
    // El ESP32 intentará conectarse automáticamente
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✓ Conectado a WiFi!");
        Serial.printf("   IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("   RSSI: %d dBm\n", WiFi.RSSI());
    } else {
        Serial.println("\n✗ Error: No se pudo conectar a WiFi");
        Serial.println("Reiniciando ESP32...");
        ESP.restart();
    }
}

// =============================================================================
// CONFIGURACIÓN DEL WEBSOCKET
// =============================================================================
void setupWebSocket() {
    Serial.println("Configurando WebSocket...");
    
    // Configurar servidor WebSocket
    // Usar el host y puerto de tu broker Cloudflare Workers
    webSocket.begin("backend.diego-sarq.workers.dev", 443, "/mqtt", "wss");
    
    // Configurar callback para eventos WebSocket
    webSocket.onEvent(webSocketEvent);
    
    // Configurar opciones de conexión
    webSocket.enableHeartbeat(15000, 3000, 2); // Ping cada 15s, timeout 3s, 2 reintentos
    webSocket.setReconnectInterval(5000);       // Reintentar cada 5 segundos
    
    Serial.println("✓ WebSocket configurado");
}

// =============================================================================
// MANEJO DE EVENTOS WEBSOCKET
// =============================================================================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        // ===== DESCONEXIÓN =====
        case WStype_DISCONNECTED:
            Serial.println("🔌 WebSocket desconectado");
            isConnectedToMQTT = false;
            break;
            
        // ===== CONEXIÓN EXITOSA =====
        case WStype_CONNECTED: {
            Serial.printf("🔗 WebSocket conectado a: %s\n", payload);
            
            // Enviar mensaje de conexión MQTT inmediatamente
            connectToMQTTBroker();
            break;
        }
        
        // ===== MENSAJE RECIBIDO =====
        case WStype_TEXT: {
            Serial.printf("📥 Recibido: %s\n", payload);
            
            // Parsear mensaje JSON del broker
            StaticJsonDocument<512> doc;
            DeserializationError error = deserializeJson(doc, payload);
            
            if (error) {
                Serial.printf("❌ Error parseando JSON: %s\n", error.c_str());
                return;
            }
            
            // Procesar diferentes tipos de mensajes MQTT
            String messageType = doc["type"];
            
            if (messageType == "connack") {
                // Confirmación de conexión MQTT
                int returnCode = doc["returnCode"];
                String assignedClientId = doc["clientId"];
                
                if (returnCode == 0) {
                    isConnectedToMQTT = true;
                    clientId = assignedClientId;
                    Serial.printf("✅ Conectado a MQTT con clientId: %s\n", clientId.c_str());
                    
                    // Suscribirse a tópicos de control
                    mqttSubscribe("control/" + clientId);
                    mqttSubscribe("control/all");
                    
                    // Publicar estado inicial
                    publishStatus("online", true);
                } else {
                    Serial.printf("❌ Error en conexión MQTT: %d\n", returnCode);
                }
                
            } else if (messageType == "suback") {
                // Confirmación de suscripción
                String topic = doc["topic"];
                Serial.printf("✓ Suscrito a: %s\n", topic.c_str());
                
            } else if (messageType == "message") {
                // Mensaje recibido en un tópico suscrito
                String topic = doc["topic"];
                String receivedPayload = doc["payload"];
                
                Serial.printf("📨 Mensaje en '%s': %s\n", topic.c_str(), receivedPayload.c_str());
                
                // Procesar comandos de control
                if (topic.startsWith("control/")) {
                    handleControlMessage(receivedPayload);
                }
                
            } else if (messageType == "puback") {
                // Confirmación de publicación (QoS > 0)
                Serial.println("✓ Mensaje publicado confirmado");
                
            } else if (messageType == "pingresp") {
                // Respuesta al ping (keep-alive)
                Serial.println("🏓 Pong recibido");
            }
            break;
        }
        
        // ===== DATOS BINARIOS =====
        case WStype_BIN:
            Serial.printf("📦 Datos binarios recibidos (%u bytes)\n", length);
            break;
            
        // ===== ERROR =====
        case WStype_ERROR:
            Serial.printf("❌ Error WebSocket: %s\n", payload);
            isConnectedToMQTT = false;
            break;
            
        default:
            break;
    }
}

// =============================================================================
// CONEXIÓN AL BROKER MQTT (VÍA WEBSOCKET)
// =============================================================================
void connectToMQTTBroker() {
    Serial.println("Enviando mensaje de conexión MQTT...");
    
    // Crear mensaje de conexión MQTT en formato JSON
    StaticJsonDocument<256> connectMsg;
    connectMsg["type"] = "connect";
    connectMsg["clientId"] = clientId;
    connectMsg["keepAlive"] = 60;
    
    // Serializar y enviar
    String connectStr;
    serializeJson(connectMsg, connectStr);
    
    webSocket.sendTXT(connectStr);
    Serial.printf("📤 Enviado: %s\n", connectStr.c_str());
}

// =============================================================================
// SUSCRIBIRSE A UN TÓPICO
// =============================================================================
void mqttSubscribe(const String& topic) {
    if (!isConnectedToMQTT) {
        Serial.println("❌ No conectado a MQTT, no se puede suscribir");
        return;
    }
    
    StaticJsonDocument<256> subMsg;
    subMsg["type"] = "subscribe";
    subMsg["topic"] = topic;
    subMsg["qos"] = 0;
    subMsg["messageId"] = random(1, 1000);
    
    String subStr;
    serializeJson(subMsg, subStr);
    
    webSocket.sendTXT(subStr);
    Serial.printf("📤 Suscripción: %s\n", subStr.c_str());
}

// =============================================================================
// PUBLICAR MENSAJE EN UN TÓPICO
// =============================================================================
void mqttPublish(const String& topic, const String& payload, bool retain) {
    if (!isConnectedToMQTT) {
        Serial.println("❌ No conectado a MQTT, no se puede publicar");
        return;
    }
    
    StaticJsonDocument<512> pubMsg;
    pubMsg["type"] = "publish";
    pubMsg["topic"] = topic;
    pubMsg["payload"] = payload;
    pubMsg["qos"] = 0;
    pubMsg["retain"] = retain;
    pubMsg["messageId"] = random(1, 1000);
    
    String pubStr;
    serializeJson(pubMsg, pubStr);
    
    webSocket.sendTXT(pubStr);
    Serial.printf("📤 Publicado en '%s': %s\n", topic.c_str(), payload.c_str());
}

// =============================================================================
// OBTENER TIMESTAMP UNIX
// =============================================================================
unsigned long getTimestamp() {
    // Como alternativa simple, usar millis() desde el boot
    // En una implementación real, configurarías NTP
    return millis() / 1000;
}

// =============================================================================
// LEER SENSORES Y PUBLICAR DATOS
// =============================================================================
void readAndPublishSensorData() {
    Serial.println("📊 Leyendo sensores...");
    
    // Leer datos del sensor DHT22
    // Estas funciones pueden devolver NaN si hay error de lectura
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    
    // Validar lecturas del sensor
    if (isnan(humidity) || isnan(temperature)) {
        Serial.println("❌ Error leyendo sensor DHT22!");
        
        // Publicar error en tópico de alertas
        mqttPublish("alerts/" + clientId, "Error de lectura del sensor DHT22");
        return;
    }
    
    // Crear objeto JSON con los datos del sensor
    StaticJsonDocument<300> sensorData;
    sensorData["sensorId"] = clientId;
    sensorData["temperature"] = round(temperature * 10.0) / 10.0; // Redondear a 1 decimal
    sensorData["humidity"] = round(humidity * 10.0) / 10.0;
    sensorData["unit_temp"] = "celsius";
    sensorData["unit_humidity"] = "percent";
    sensorData["timestamp"] = getTimestamp(); // Usar función personalizada
    sensorData["wifi_rssi"] = WiFi.RSSI();    // Intensidad de señal WiFi
    sensorData["heap_free"] = ESP.getFreeHeap(); // Memoria libre
    
    // Serializar datos a string JSON
    String jsonString;
    serializeJson(sensorData, jsonString);
    
    // Publicar datos en tópicos específicos
    mqttPublish("temperature/" + clientId, String(temperature));
    mqttPublish("humidity/" + clientId, String(humidity));
    mqttPublish("sensors/" + clientId, jsonString); // Datos completos
    
    // Mostrar en consola
    Serial.printf("🌡️ Temperatura: %.1f°C\n", temperature);
    Serial.printf("💧 Humedad: %.1f%%\n", humidity);
    
    // Verificar umbrales y generar alertas si es necesario
    checkThresholds(temperature, humidity);
}

// =============================================================================
// VERIFICAR UMBRALES Y GENERAR ALERTAS
// =============================================================================
void checkThresholds(float temperature, float humidity) {
    // Umbrales configurables
    const float TEMP_MAX = 30.0;    // Temperatura máxima °C
    const float TEMP_MIN = 10.0;    // Temperatura mínima °C
    const float HUMIDITY_MAX = 80.0; // Humedad máxima %
    const float HUMIDITY_MIN = 30.0; // Humedad mínima %
    
    String alertMessage = "";
    
    // Verificar temperatura
    if (temperature > TEMP_MAX) {
        alertMessage = "Temperatura alta: " + String(temperature) + "°C";
    } else if (temperature < TEMP_MIN) {
        alertMessage = "Temperatura baja: " + String(temperature) + "°C";
    }
    
    // Verificar humedad
    if (humidity > HUMIDITY_MAX) {
        if (alertMessage.length() > 0) alertMessage += " | ";
        alertMessage += "Humedad alta: " + String(humidity) + "%";
    } else if (humidity < HUMIDITY_MIN) {
        if (alertMessage.length() > 0) alertMessage += " | ";
        alertMessage += "Humedad baja: " + String(humidity) + "%";
    }
    
    // Enviar alerta si hay problemas
    if (alertMessage.length() > 0) {
        Serial.printf("🚨 ALERTA: %s\n", alertMessage.c_str());
        mqttPublish("alerts/" + clientId, alertMessage);
        mqttPublish("alerts/temperature", alertMessage); // Tópico global de alertas
    }
}

// =============================================================================
// PUBLICAR ESTADO DEL DISPOSITIVO
// =============================================================================
void publishStatus(const String& status, bool retain) {
    StaticJsonDocument<200> statusDoc;
    statusDoc["sensorId"] = clientId;
    statusDoc["status"] = status;
    statusDoc["uptime"] = millis() / 1000; // Tiempo en funcionamiento en segundos
    statusDoc["wifi_rssi"] = WiFi.RSSI();
    statusDoc["heap_free"] = ESP.getFreeHeap();
    statusDoc["timestamp"] = getTimestamp(); // Usar función personalizada
    
    String statusStr;
    serializeJson(statusDoc, statusStr);
    
    mqttPublish("status/" + clientId, statusStr, retain);
    Serial.printf("📡 Estado publicado: %s\n", status.c_str());
}

// =============================================================================
// MANEJAR MENSAJES DE CONTROL
// =============================================================================
void handleControlMessage(const String& message) {
    Serial.printf("🎛️ Comando recibido: %s\n", message.c_str());
    
    // Parsear comando JSON
    StaticJsonDocument<256> cmdDoc;
    DeserializationError error = deserializeJson(cmdDoc, message);
    
    if (error) {
        Serial.printf("❌ Error parseando comando: %s\n", error.c_str());
        return;
    }
    
    String command = cmdDoc["command"];
    
    if (command == "restart") {
        Serial.println("🔄 Reiniciando ESP32...");
        publishStatus("restarting", true);
        delay(1000);
        ESP.restart();
        
    } else if (command == "status") {
        publishStatus("online", false);
        readAndPublishSensorData(); // Enviar datos inmediatamente
        
    } else if (command == "set_interval") {
        // Cambiar intervalo de publicación (en milisegundos)
        long newInterval = cmdDoc["value"];
        if (newInterval >= 1000 && newInterval <= 300000) { // Entre 1s y 5min
            // Nota: interval es const, necesitaríamos hacerla variable
            Serial.printf("ℹ️ Intervalo solicitado: %ld ms (requiere reinicio)\n", newInterval);
        }
        
    } else {
        Serial.printf("❌ Comando desconocido: %s\n", command.c_str());
    }
}

// =============================================================================
// GENERAR ID ÚNICO DEL CLIENTE
// =============================================================================
String generateClientId() {
    // Usar la MAC address del WiFi para generar un ID único
    uint8_t mac[6];
    WiFi.macAddress(mac);
    
    char macStr[18];
    sprintf(macStr, "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    
    return "esp32-" + String(macStr);
}

// =============================================================================
// BUCLE PRINCIPAL
// =============================================================================
void loop() {
    // Manejar eventos WebSocket (crítico para mantener conexión)
    webSocket.loop();
    
    // Verificar conexión WiFi
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi desconectado, reconectando...");
        isConnectedToMQTT = false;
        connectToWifi();
        return;
    }
    
    // Intentar reconectar a MQTT si es necesario
    if (!isConnectedToMQTT) {
        unsigned long now = millis();
        if (now - lastReconnectAttempt > reconnectInterval) {
            lastReconnectAttempt = now;
            Serial.println("🔄 Intentando reconectar a MQTT...");
            setupWebSocket(); // Reinicializar WebSocket
        }
        return;
    }
    
    // Publicar datos del sensor según el intervalo configurado
    unsigned long now = millis();
    if (now - lastMsg > interval) {
        lastMsg = now;
        readAndPublishSensorData();
    }
    
    // Pequeña pausa para no saturar el CPU
    delay(100);
}