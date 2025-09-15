# Sistema de Monitoreo IoT de Temperatura y Humedad

Un sistema completo end-to-end para el monitoreo de temperatura y humedad en tiempo real, que integra hardware IoT, comunicación MQTT, backend en la nube y visualización web moderna.

## 📋 Descripción del Proyecto

Este proyecto implementa una solución completa de monitoreo IoT que captura datos de temperatura y humedad utilizando un microcontrolador ESP32 con sensor DHT22, transmite los datos a través de MQTT, los procesa en un backend basado en Cloudflare Workers, los almacena en una base de datos PostgreSQL y los visualiza en un dashboard web interactivo construido con Astro.

**Autor:** Diego Ignacio Soto  
**Fecha:** Septiembre 2025  
**Propósito:** Sistema de monitoreo IoT funcional que demuestra competencias full-stack

## 🏗️ Arquitectura del Sistema

```
[ESP32 + DHT22] → [MQTT Broker] → [Cloudflare Workers Backend] → [PostgreSQL DB] → [Astro Frontend]
```

### Flujo de Datos

1. **Captura**: Sensor DHT22 conectado al ESP32 lee temperatura y humedad
2. **Transmisión**: ESP32 publica datos vía MQTT al broker
3. **Procesamiento**: Backend en Cloudflare Workers recibe y procesa los datos
4. **Almacenamiento**: Datos se guardan en base de datos PostgreSQL (Neon DB)
5. **Visualización**: Dashboard web consume API REST para mostrar datos en tiempo real

## 🛠️ Stack Tecnológico

### Hardware
- **Microcontrolador**: ESP32
- **Sensor**: DHT22 (Temperatura y Humedad)

### Firmware
- **Lenguaje**: C++ con framework Arduino
- **Plataforma**: PlatformIO

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Protocolo**: MQTT + REST API
- **Lenguaje**: TypeScript

### Base de Datos
- **Motor**: PostgreSQL
- **Hosting**: Neon DB (nube)

### Frontend
- **Framework**: Astro
- **Lenguaje**: TypeScript/JavaScript
- **Estilos**: CSS moderno

### Comunicación
- **Protocolo IoT**: MQTT
- **API**: REST
- **Broker MQTT**: EMQX (público)

## 📁 Estructura del Proyecto

```
iot-temp-track/
├── README.md                    # Este archivo
├── brief.md                     # Documentación detallada del proyecto
├── package.json                 # Dependencies del root
├── firmware/                    # Código para ESP32
│   ├── README.md
│   ├── platformio.ini
│   └── src/main.cpp
├── backend/                     # Cloudflare Workers backend
│   ├── README.md
│   ├── package.json
│   └── src/index.ts
├── frontend/                    # Dashboard web con Astro
│   ├── README.md
│   ├── package.json
│   └── src/
├── database/                    # Scripts y configuración de BD
│   ├── README.md
│   └── migrations/
└── dashboard.html              # Demo dashboard estático
```

## 🚀 Instalación y Configuración

### Prerequisitos

- Node.js (v18+) y pnpm
- PlatformIO CLI (para firmware)
- Visual Studio Code (recomendado)
- ESP32 y sensor DHT22

### 1. Clonar el Repositorio

```bash
git clone https://github.com/soteiro/iot-temp-track.git
cd iot-temp-track
```

### 2. Instalar Dependencias

```bash
# Dependencias del root
pnpm install

# Backend dependencies
cd backend && pnpm install

# Frontend dependencies  
cd ../frontend && pnpm install
```

### 3. Configurar el Firmware

1. Navega a la carpeta `firmware/`
2. Copia `include/config.h.example` a `include/config.h`
3. Configura tus credenciales WiFi y MQTT
4. Sigue las instrucciones en `firmware/README.md`

### 4. Configurar el Backend

1. Navega a la carpeta `backend/`
2. Configura las variables de entorno necesarias
3. Sigue las instrucciones en `backend/README.md`

### 5. Configurar la Base de Datos

1. Crea una cuenta en Neon DB
2. Configura la conexión en el backend
3. Ejecuta las migraciones desde `database/`

### 6. Configurar el Frontend

1. Navega a la carpeta `frontend/`
2. Configura la URL de la API del backend
3. Sigue las instrucciones en `frontend/README.md`

## 🏃‍♂️ Ejecución

### Desarrollo Local

```bash
# Backend (Cloudflare Workers)
cd backend
pnpm dev

# Frontend (Astro)
cd frontend  
pnpm dev
```

### Firmware (ESP32)

```bash
cd firmware
pio run --target upload
pio device monitor
```

## 📊 Estado del Proyecto

### Completado ✅
- [x] Firmware ESP32 con sensor DHT22
- [x] Conexión y publicación MQTT
- [x] Backend Cloudflare Workers con Hono
- [x] Estructura de base de datos PostgreSQL
- [x] Frontend básico con Astro
- [x] Dashboard de visualización

### En Progreso 🚧
- [ ] API REST completa para datos históricos
- [ ] Visualización en tiempo real mejorada
- [ ] Alertas y notificaciones
- [ ] Documentación de deployment

### Por Hacer 📋
- [ ] Pruebas unitarias
- [ ] CI/CD pipeline
- [ ] Monitoreo y logs
- [ ] Optimizaciones de rendimiento

## 📖 Documentación Adicional

- [📋 Brief del Proyecto](./brief.md) - Documento detallado con objetivos y arquitectura
- [🔧 Firmware ESP32](./firmware/README.md) - Configuración y uso del firmware
- [⚡ Backend Workers](./backend/README.md) - API y configuración del backend
- [🌐 Frontend Astro](./frontend/README.md) - Dashboard y interfaz web
- [🗄️ Base de Datos](./database/README.md) - Esquema y migraciones

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Contacto

**Diego Ignacio Soto**
- Email: [tu-email@ejemplo.com]
- LinkedIn: [tu-linkedin]
- GitHub: [@soteiro](https://github.com/soteiro)

---

**⭐ Si este proyecto te ha sido útil, no olvides darle una estrella!**