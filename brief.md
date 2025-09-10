# Project Brief: Sistema de Monitoreo IoT End-to-End (v3)

**Autor:** [Tu Nombre Completo]  
**Fecha:** 10 de septiembre de 2025  
**Propósito:** Prototipo funcional para demostrar las habilidades y proactividad requeridas para el puesto de Alumno/a en Práctica en [Nombre de la Empresa, si lo sabes].

## 1. Resumen Ejecutivo

Este proyecto consiste en el diseño e implementación de un sistema completo de monitoreo de datos en tiempo real, abarcando desde la captura de datos en un dispositivo físico (IoT) hasta su visualización en una interfaz web moderna. El sistema registrará la temperatura y humedad ambiente utilizando un microcontrolador ESP32, enviará los datos a través del protocolo MQTT, los procesará en un backend ligero y los almacenará en una base de datos PostgreSQL en la nube, para finalmente ser consumidos y mostrados por un dashboard interactivo construido con React o Astro.

**El proyecto se organizará en una estructura de monorepo para centralizar todo el código y facilitar su gestión y despliegue.**

## 2. Objetivos del Proyecto

- **Demostrar competencia Full-Stack en IoT:** Validar la capacidad para trabajar en todas las capas de una solución IoT: hardware, comunicaciones, backend, base de datos y frontend.

- **Aplicar Tecnologías Relevantes:** Utilizar un stack tecnológico alineado con los requisitos de la oferta:

  - **Backend:** Desarrollo de servicios con un framework moderno (Hono, similar a Node.js).

  - **Base de Datos:** Manejo de SQL y un motor PostgreSQL (Neon DB).

  - **IoT:** Programación de hardware (ESP32) y uso de protocolos estándar (MQTT).

  - **Frontend:** Construcción de interfaces reactivas y modernas con React/Astro.

- **Probar la Capacidad de Aprendizaje Rápido:** Implementar y configurar un broker MQTT, refrescando y aplicando conocimientos de forma autónoma.

- **Generar un Entregable Sólido:** Crear un proyecto tangible y bien documentado que sirva como carta de presentación y punto de discusión técnica durante una entrevista.

## 3. Arquitectura de la Solución

El flujo de datos seguirá los siguientes pasos:

1. **Captura (Sensor):** Un sensor de temperatura y humedad (DHT11 o similar) conectado a un **ESP32** leerá los datos ambientales.

2. **Publicación (IoT Device):** El firmware del ESP32 publicará las lecturas en un **Broker MQTT**.

3. **Recepción y Procesamiento (Backend):** Un servicio backend en **Hono** estará suscrito al tópico MQTT, procesará los datos y los insertará en la base de datos.

4. **Almacenamiento (Base de Datos):** Una base de datos **PostgreSQL** hosteada en **Neon DB** almacenará las lecturas.

5. **Exposición de Datos (API):** El backend expondrá un endpoint REST API para consultar los datos.

6. **Visualización (Frontend):** Un dashboard en **React (o Astro + React)** consumirá la API para mostrar los datos en tiempo real.

## 4. Stack Tecnológico

- **Hardware:** Microcontrolador ESP32, Sensor DHT11/DHT22.

- **Firmware:** C++ con el framework de Arduino o PlatformIO.

- **Protocolo de Comunicación:** MQTT.

- **Backend:** JavaScript/TypeScript con Hono.

- **Base de Datos:** PostgreSQL (gestionada por Neon DB).

- **Frontend:** React o Astro (con integración de React). Opcional: Tailwind CSS.

- **Despliegue (Opcional):** Vercel o Netlify para el frontend/backend.

## 5. Plan de Desarrollo y Fases

1. **Fase 1: Hardware y Conectividad (Publisher)**

   - [ ] Conectar y programar el ESP32 para leer y publicar datos vía MQTT.

2. **Fase 2: Backend y Base de Datos (Subscriber & Storage)**

   - [ ] Configurar la base de datos en Neon DB.

   - [ ] Desarrollar el servicio en Hono para suscribirse a MQTT e insertar los datos.

3. **Fase 3: API y Frontend (Visualization)**

   - [ ] Crear el endpoint API en Hono.

   - [ ] Construir el dashboard en React/Astro para consumir la API y mostrar los datos.

4. **Fase 4: Documentación y Finalización**

   - [ ] Completar el `README.md` y documentar cada parte del proyecto.

   - [ ] Limpiar y comentar el código.

## 6. Estructura del Repositorio (Monorepo)

El proyecto se gestionará en un único repositorio para facilitar la coherencia, la gestión y la comprensión global del sistema. La estructura de carpetas será la siguiente:

```text
/iot-monitoring-project/
├── .gitignore          # Ignora archivos innecesarios (node_modules, etc.)
├── README.md           # Documentación principal del proyecto
│
├── /firmware/          # Contiene todo el código del ESP32
│   ├── platformio.ini
│   └── src/main.cpp
│
├── /backend/           # Contiene el servicio backend en Hono
│   ├── package.json
│   └── src/index.ts
│
└── /frontend/          # Contiene la aplicación de visualización en React/Astro
    ├── package.json
    └── src/App.jsx
```

## 7. Entregables

- **Repositorio de Código en GitHub:** Conteniendo las carpetas `firmware`, `backend` y `frontend` dentro de una estructura monorepo.

- **Documentación (`README.md`):** Explicación clara del proyecto, la arquitectura, el stack tecnológico y las instrucciones para ejecutar cada parte del sistema.

- **(Opcional) URL de la demo en vivo.**
