# Guía para la Gestión de Base de Datos con Python, SQLAlchemy y Alembic

Este documento describe una estrategia robusta y estándar en la industria para gestionar el ciclo de vida de una base de datos de un proyecto usando Python, con un enfoque en SQLAlchemy y Alembic.

## La Filosofía: La "Verdad" está en el Código

El principio fundamental es que el **esquema de tu base de datos** (las tablas, columnas, tipos de datos, relaciones) no es algo que modificas a mano conectándote a la base de datos directamente. En su lugar, **lo defines en tu código Python**. Cualquier cambio en la base de datos se hace cambiando el código y luego usando herramientas para "aplicar" esos cambios.

Esto te da un control de versiones para tu base de datos, igual que tienes con Git para tu código. Puedes ver quién cambió qué, cuándo, y puedes desplegar tu aplicación en cualquier entorno (desarrollo, pruebas, producción) y tener la certeza de que la base de datos tendrá la estructura correcta.

---

## Los Actores Principales (Las Herramientas y su Rol)

Imagina que estás construyendo una casa. Necesitas diferentes especialistas:

### 1. SQLAlchemy (El Arquitecto - ORM)

* **Su Misión:** Te permite diseñar los "planos" de tus tablas usando clases de Python en lugar de escribir `CREATE TABLE` en SQL. Es un "traductor" o "mapeador" objeto-relacional (ORM).
* **La Gran Ventaja:** Tu código es más legible, más fácil de mantener y, si algún día cambiaras de PostgreSQL a MySQL, SQLAlchemy se encargaría de la traducción sin que tengas que cambiar tus modelos.

### 2. Alembic (El Jefe de Obra - Migraciones)

* **Su Misión:** Es el "control de versiones" para tu base de datos. Compara los "planos" del arquitecto (tus modelos de SQLAlchemy) con la "construcción" actual (tu base de datos).
* **En la Práctica:**
  * **Detección de Cambios:** Cuando haces un cambio en un modelo de Python, Alembic lo detecta.
  * **Generación de Instrucciones:** Genera un *script de migración* que contiene las instrucciones precisas para aplicar ese cambio (`ALTER TABLE ... ADD COLUMN ...`) y también para revertirlo.
  * **Aplicación de Cambios:** Ejecuta estos scripts en orden para llevar tu base de datos de un estado a otro de forma segura y predecible.

### 3. Psycopg (El Conector - Driver de Base de Datos)

* **Su Misión:** Es el trabajador que realmente se comunica con PostgreSQL. Es la capa de bajo nivel que SQLAlchemy y Alembic usan para enviar el SQL y recibir los resultados. No interactúas directamente con él, pero es fundamental.

### 4. El Fichero `.env` y `python-dotenv` (El Guardián de los Secretos)

* **Su Misión:** Tu código necesita la "llave" para acceder a la base de datos (la URL de conexión). Es una muy mala práctica escribir esta llave directamente en el código.
* **En la Práctica:** Guardas la URL en un archivo llamado `.env`. Este archivo **nunca se sube a Git**. La librería `python-dotenv` permite que tu código Python lea esa llave del archivo de forma segura.

---

## Estructura de la Carpeta `database`

Esta es la estructura de carpetas y archivos recomendada para aislar toda la lógica de gestión de la base de datos.

```bash
database/
│
├── alembic/  (Directorio generado y gestionado por Alembic)
│   │
│   ├── versions/  (Aquí se guardan todos los scripts de migración)
│   │   ├── 2a48a2885b5_crear_tabla_temperatura.py
│   │   └── 9c3a3b4b1e7_añadir_device_id.py
│   │
│   ├── env.py  (Script de configuración de Alembic para el entorno)
│   └── script.py.mako  (Plantilla para generar nuevos scripts de migración)
│
├── models/  (Aquí defines tus tablas como clases de Python)
│   │
│   ├── __init__.py  (Convierte 'models' en un paquete de Python)
│   └── temperature.py  (Ej: define la clase TemperatureReading)
│
├── .env  (Archivo para guardar secretos, como la URL de la base de datos)
│
├── alembic.ini  (Archivo de configuración principal de Alembic)
│
├── config.py  (Script para cargar la configuración desde .env)
│
├── manage.py  (Tu CLI para ejecutar todos los comandos de gestión)
│
└── requirements.txt  (Lista de dependencias de Python para esta carpeta)
```

### Explicación de Cada Componente

* **`alembic/`**: Creado y administrado por Alembic (`alembic init alembic`).
  * **`versions/`**: El historial de cambios de tu base de datos. Cada archivo es un paso en la evolución de tu esquema.
  * **`env.py`**: Script de configuración donde le dices a Alembic dónde encontrar tus modelos y cómo conectarse a la BD.
  * **`script.py.mako`**: Plantilla para generar nuevos scripts de migración. Rara vez se modifica.
* **`models/`**: Aquí viven tus modelos de SQLAlchemy. Cada archivo define una o más tablas como clases de Python.
  * **`__init__.py`**: Convierte la carpeta en un paquete de Python, crucial para que Alembic encuentre los modelos.
* **`alembic.ini`**: Archivo de configuración principal de Alembic. La línea `sqlalchemy.url` es la más importante y se configura para leer la URL de forma segura.
* **`manage.py`**: Tu punto de entrada único y amigable para ejecutar comandos como `python manage.py db-upgrade`.
* **`config.py`**: Script de utilidad para cargar la `DATABASE_URL` desde el archivo `.env`.
* **`.env`**: Archivo de texto simple para guardar tu `DATABASE_URL`. **Es vital añadir este archivo a tu `.gitignore`**.
* **`requirements.txt`**: Lista las librerías de Python necesarias (`sqlalchemy`, `alembic`, `psycopg2-binary`, etc.).

---

## El Flujo de Trabajo en la Práctica

### Fase 1: Creación Inicial de la Base de Datos

1. **Definir el modelo:** Creas tu clase `TemperatureReading` en `database/models/temperature.py`.
2. **Generar la migración:** Ejecutas `alembic revision --autogenerate -m "Crear tabla de lecturas de temperatura"`. Alembic detecta la nueva tabla y genera el script de `CREATE TABLE`.
3. **Aplicar la migración:** Ejecutas `alembic upgrade head`. Alembic ejecuta el script y la tabla se crea en tu base de datos Neon.

### Fase 2: Evolución (Añadir una columna)

1. **Actualizar el modelo:** Añades un nuevo atributo a tu clase, ej: `device_id = Column(String)`.
2. **Generar la nueva migración:** Ejecutas `alembic revision --autogenerate -m "Añadir device_id a las lecturas"`. Alembic detecta la diferencia y genera un script con `ALTER TABLE`.
3. **Aplicar la migración:** Ejecutas `alembic upgrade head`. La columna se añade a la tabla existente sin pérdida de datos.

### Fase 3: Gestión de Respaldos (Backups)

1. **Crear un comando de respaldo:** En `manage.py`, creas una función que use el módulo `subprocess` de Python.
2. **Ejecutar `pg_dump`:** El script construye y ejecuta el comando `pg_dump "tu_url_de_neon" > backup_fecha.sql`.
3. **Resultado:** Obtienes un archivo `.sql` que es una "foto" completa de tu base de datos en ese momento.

## Conexión con el Resto del Proyecto

* **El `backend` (Node.js):** Simplemente se conecta a la misma `DATABASE_URL`. Su propio ORM (Prisma, TypeORM) trabajará con las tablas que ya han sido creadas y gestionadas por este sistema.
* **El `firmware` (Dispositivo IoT):** El dispositivo envía los datos al `backend`, que luego los inserta en la base de datos ya estructurada.
