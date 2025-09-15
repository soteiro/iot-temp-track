#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <config.h>

// prototype functions
void setup_wifi();
void reconnect();
void callback(char* topic, byte* payload, unsigned int length);

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

void setup_wifi(){
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println("");
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
}

void reconnect(){
    while (!client.connected()){
        Serial.print("Attempting MQTT connection...");
        // Create unique client ID using MAC address
        String clientId = "ESP32-" + WiFi.macAddress();
        clientId.replace(":", "");
        Serial.print("Client ID: ");
        Serial.println(clientId);
        
        if (client.connect(clientId.c_str())){
            Serial.println(" connected!");
            Serial.println("Connected to MQTT broker");
            client.subscribe("5a728254-5316-45c6-bf3c-de194f1afa53/sensor_data");
            client.subscribe("5a728254-5316-45c6-bf3c-de194f1afa53/commands");  // For future remote commands
            Serial.println("Subscribed to topics");
        } else {
            Serial.print(" failed, rc=");
            Serial.print(client.state());
            Serial.println(" retrying in 10 seconds...");
            delay(10000);  // Increased delay to avoid rate limiting
        }
    }
}

void callback(char* topic, byte* payload, unsigned int length){
    Serial.print("Message received on topic: ");
    Serial.println(topic);
    
    String message;
    for (unsigned int i = 0; i < length; i++){
        message += (char)payload[i];
    }
    
    Serial.print("Message content: ");
    Serial.println(message);
    
    // Parse JSON if it's a command
    if (String(topic).endsWith("/commands")) {
        StaticJsonDocument<100> cmdDoc;
        DeserializationError error = deserializeJson(cmdDoc, message);
        
        if (!error) {
            if (cmdDoc.containsKey("action")) {
                String action = cmdDoc["action"];
                Serial.print("Command received: ");
                Serial.println(action);
                // Add command handling here in the future
            }
        }
    }
}

void setup(){
    Serial.begin(115200);
    Serial.println();
    Serial.println("=== ESP32 IoT Temperature Tracker ===");
    Serial.println("Starting system initialization...");
    
    setup_wifi();  
    
    Serial.println("Initializing DHT sensor...");
    dht.begin();
    delay(2000); // Give sensor time to stabilize
    Serial.println("DHT sensor initialized");
    
    Serial.print("Connecting to MQTT broker: ");
    Serial.println(MQTT_BROKER);
    client.setServer(MQTT_BROKER, MQTT_PORT);
    client.setCallback(callback);
    
    Serial.println("System initialization complete!");
    Serial.println("================================");
}

void loop(){
    if (!client.connected()){
        reconnect();
    }

    client.loop();

    Serial.println("Reading sensor data...");
    
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    // Check if readings are valid
    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("ERROR: Failed to read from DHT sensor!");
        Serial.println("Using default values for testing...");
        temperature = 25.0;  // Default temperature
        humidity = 60.0;     // Default humidity
    }
    
    float heatIndex = dht.computeHeatIndex(temperature, humidity);

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" °C");
    
    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    Serial.print("Heat Index: ");
    Serial.print(heatIndex);
    Serial.println(" °C");

    // Publish data to MQTT
    Serial.println("Publishing data to MQTT...");
    
    // Create JSON document
    StaticJsonDocument<200> jsonDoc;
    jsonDoc["device_id"] = "ESP32-" + WiFi.macAddress();
    jsonDoc["timestamp"] = millis();
    jsonDoc["temperature"] = temperature;
    jsonDoc["humidity"] = humidity;
    jsonDoc["heat_index"] = heatIndex;
    jsonDoc["wifi_rssi"] = WiFi.RSSI();
    
    // Convert JSON to string
    String jsonString;
    serializeJson(jsonDoc, jsonString);
    
    Serial.print("JSON payload: ");
    Serial.println(jsonString);
    
    // Publish to single topic
    bool published = client.publish("5a728254-5316-45c6-bf3c-de194f1afa53/sensor_data", jsonString.c_str(), true);

    if (published) {
        Serial.println("✓ JSON data published successfully!");
    } else {
        Serial.println("✗ Error publishing JSON data");
    }

    Serial.println("-----");
    delay(5000); // wait 5 seconds before next reading
}
