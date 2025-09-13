#!/bin/bash

# Script para alternar entre versiones del firmware

case "$1" in
    "simple")
        echo "🔄 Cambiando a versión simple de prueba..."
        cd "$(dirname "$0")"
        mv src/main.cpp src/main-full.cpp.bak 2>/dev/null || true
        mv src/main-simple-test.cpp src/main.cpp
        echo "✅ Versión simple activada"
        echo "💡 Compila con: pio run"
        ;;
    "full")
        echo "🔄 Cambiando a versión completa..."
        cd "$(dirname "$0")"
        mv src/main.cpp src/main-simple-test.cpp 2>/dev/null || true
        mv src/main-full.cpp.bak src/main.cpp 2>/dev/null || true
        echo "✅ Versión completa activada"
        ;;
    "compile")
        echo "🔨 Compilando firmware..."
        cd "$(dirname "$0")"
        pio run
        ;;
    "upload")
        echo "📤 Subiendo firmware al ESP32..."
        cd "$(dirname "$0")"
        pio run --target upload
        ;;
    "monitor")
        echo "📊 Iniciando monitor serie..."
        cd "$(dirname "$0")"
        pio device monitor
        ;;
    "build-upload")
        echo "🔨 Compilando y subiendo..."
        cd "$(dirname "$0")"
        pio run --target upload
        ;;
    *)
        echo "🛠️ Script de gestión del firmware ESP32"
        echo ""
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos disponibles:"
        echo "  simple       - Usar versión simple de prueba"
        echo "  full         - Usar versión completa"
        echo "  compile      - Compilar firmware"
        echo "  upload       - Subir firmware al ESP32"
        echo "  monitor      - Abrir monitor serie"
        echo "  build-upload - Compilar y subir"
        echo ""
        echo "Ejemplo:"
        echo "  $0 simple    # Cambiar a versión simple"
        echo "  $0 upload    # Subir al ESP32"
        echo "  $0 monitor   # Ver output del ESP32"
        ;;
esac