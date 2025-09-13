#!/bin/bash

echo "🚀 Testing MQTT Broker API"
echo "=========================="

# Función para test HTTP
test_http() {
    echo "📡 Testing HTTP API..."
    
    # Test principal endpoint
    echo "GET /"
    curl -s "http://localhost:8787/" | jq . || echo "Error en GET /"
    
    echo -e "\n📊 GET /broker/stats"
    curl -s "http://localhost:8787/broker/stats" | jq . || echo "Error en stats"
    
    echo -e "\n📋 GET /broker/topics"
    curl -s "http://localhost:8787/broker/topics" | jq . || echo "Error en topics"
    
    echo -e "\n👥 GET /broker/clients"
    curl -s "http://localhost:8787/broker/clients" | jq . || echo "Error en clients"
    
    # Test publicación
    echo -e "\n📤 POST /broker/publish"
    curl -s -X POST "http://localhost:8787/broker/publish" \
        -H "Content-Type: application/json" \
        -d '{
            "topic": "temperature/sensor1",
            "message": {
                "temperature": 23.5,
                "unit": "celsius",
                "timestamp": "'$(date -Iseconds)'"
            },
            "qos": 0,
            "retain": true
        }' | jq . || echo "Error en publish"
}

# Función para test con WebSocket usando wscat si está disponible
test_websocket() {
    echo -e "\n🔌 Testing WebSocket..."
    if command -v wscat &> /dev/null; then
        echo "Conectando a WebSocket..."
        # wscat -c ws://localhost:8787/mqtt
    else
        echo "wscat no está disponible. Instalar con: npm install -g wscat"
    fi
}

# Ejecutar tests
test_http
test_websocket

echo -e "\n✅ Tests completados"
