#include <WiFi.h>
#include <Arduino.h>
#include <DHT.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"

// DHT settings
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Initialize WiFi and MQTT clients
WiFiClient espClient;
PubSubClient mqtt_client(espClient);

// Function prototypes
void connectToWifi();
void connectToMQTTBroker();
void mqttCallback(char *topic, byte *payload, unsigned int length);
void readAndPublishSensorData();

unsigned long lastMsg = 0;
const long interval = 5000; // Interval to publish data (5 seconds)

void setup(){
    Serial.begin(115200);
    dht.begin();
    connectToWifi(); // Connect to WiFi first
    mqtt_client.setServer(mqtt_broker, mqtt_port);
    mqtt_client.setCallback(mqttCallback);
    connectToMQTTBroker();
}

void connectToWifi(){
    WiFi.begin(ssid, password);
    Serial.println("connecting to WiFi...");
    while (WiFi.status() != WL_CONNECTED){
        delay(500);
        Serial.print(".");
    }
    Serial.println("Connected to the WiFi network");
}


void connectToMQTTBroker(){
    while (!mqtt_client.connected()){
        String client_id = "esp32-client";

        Serial.printf("The client %s connects to the MQTT broker\n", client_id.c_str());

        if(mqtt_client.connect(client_id.c_str(), mqtt_username, mqtt_password)){
            Serial.println("connected to MQTT Broker! :)");
            //subscribe to topic
            mqtt_client.subscribe(topic);

            //publish and retain a message to the topic
            mqtt_client.publish(topic, "hello from ESP32");
        } else {
            Serial.println("Failed to connect to MQTT broker");
            Serial.print("State code =");
            Serial.print(mqtt_client.state());
            Serial.println("trying connection again");
            delay(5000);
        }
    }
}

void mqttCallback(char *topic, byte *payload, unsigned int lenght){
    Serial.print("message arrived in topic: ");
    Serial.println(topic);
    Serial.print("message:");
    for (unsigned int i=0; i < lenght; i++){
        Serial.print((char) payload[i]);
    }
    Serial.println();
    Serial.println("-----------------------");
}

void readAndPublishSensorData() {
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
        Serial.println("Failed to read from DHT sensor!");
        return;
    }

    StaticJsonDocument<200> doc;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;

    char buffer[256];
    size_t n = serializeJson(doc, buffer);

    if (mqtt_client.publish(topic, buffer, n)) {
        Serial.print("Published: ");
        Serial.println(buffer);
    } else {
        Serial.println("Failed to publish message");
    }
}

void loop(){
    if (!mqtt_client.connected()){
        connectToMQTTBroker();
    }
    mqtt_client.loop();

    unsigned long now = millis();
    if (now - lastMsg > interval) {
        lastMsg = now;
        readAndPublishSensorData();
    }
}