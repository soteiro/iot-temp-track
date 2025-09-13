# Database Management - IoT Temperature Tracking

Esta carpeta contiene toda la configuración y gestión de la base de datos para el sistema de monitoreo IoT. Utiliza **SQLAlchemy** como ORM y **Alembic** para el manejo de migraciones de esquema.

## 📁 Estructura del Proyecto

``` bash
database/
├── alembic.ini              # Configuración de Alembic
├── base.py                  # Configuración base de SQLAlchemy
├── requirements.txt         # Dependencias de Python
├── README.md               # Esta documentación
├── alembic/                # Migraciones de base de datos
│   ├── env.py              # Configuración del entorno Alembic
│   ├── script.py.mako      # Template para nuevas migraciones
│   └── versions/           # Archivos de migración
│       └── 46105b869725_create_temperature_table.py
└── models/                 # Modelos de datos (SQLAlchemy)
    ├── __init__.py
    └── temperature.py      # Modelo de temperatura
```

## 🛠️ Tecnologías Utilizadas

- **SQLAlchemy 2.0**: ORM para Python
- **Alembic**: Herramienta de migraciones de base de datos
- **PostgreSQL**: Motor de base de datos (compatible con Neon DB)
- **psycopg2**: Driver de PostgreSQL para Python

## 🚀 Configuración Inicial

### 1. Instalar dependencias

```bash
cd database
pip install -r requirements.txt
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con:

```bash
DATABASE_URL=postgresql://username:password@host:5432/database_name
```

**Para Neon DB:**

```bash
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### 3. Verificar configuración de Alembic

El archivo `alembic.ini` debe estar configurado para usar tu `DATABASE_URL`:

```ini
sqlalchemy.url = %(DATABASE_URL)s
```

## 📊 Modelos de Datos

### Tabla: `temperature_readings`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `device_id` | String(50) | ID del dispositivo IoT |
| `temperature` | Float | Temperatura en Celsius |
| `humidity` | Float | Humedad relativa (%) |
| `timestamp` | DateTime | Momento de la lectura |
| `created_at` | DateTime | Momento de inserción en DB |

## 🔄 Gestión de Migraciones

### Comandos principales de Alembic

```bash
# Ver estado actual de migraciones
alembic current

# Ver historial de migraciones
alembic history --verbose

# Crear una nueva migración automática
alembic revision --autogenerate -m "descripción del cambio"

# Aplicar todas las migraciones pendientes
alembic upgrade head

# Aplicar una migración específica
alembic upgrade <revision_id>

# Revertir una migración
alembic downgrade -1

# Revertir a una migración específica
alembic downgrade <revision_id>
```

### Ejemplo: Crear una nueva migración

```bash
# 1. Modificar el modelo en models/temperature.py
# 2. Generar migración automática
alembic revision --autogenerate -m "add new_column to temperature table"

# 3. Revisar el archivo generado en alembic/versions/
# 4. Aplicar la migración
alembic upgrade head
```

## 🗄️ Uso de los Modelos

### Ejemplo de inserción de datos

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.temperature import TemperatureReading
import os

# Configurar conexión
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Insertar nueva lectura
def insert_reading(device_id, temperature, humidity):
    session = SessionLocal()
    try:
        reading = TemperatureReading(
            device_id=device_id,
            temperature=temperature,
            humidity=humidity
        )
        session.add(reading)
        session.commit()
        return reading
    finally:
        session.close()
```

### Ejemplo de consulta de datos

```python
def get_recent_readings(device_id, limit=10):
    session = SessionLocal()
    try:
        readings = session.query(TemperatureReading)\
            .filter(TemperatureReading.device_id == device_id)\
            .order_by(TemperatureReading.timestamp.desc())\
            .limit(limit)\
            .all()
        return readings
    finally:
        session.close()
```

## 🔧 Configuración de Producción

### Variables de entorno requeridas

```bash
# Base de datos
DATABASE_URL=postgresql://user:password@host:port/dbname

# Opcional: Pool de conexiones
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
```

### Configuración de logging

Para habilitar logs de SQL en desarrollo:

```python
# En base.py
engine = create_engine(DATABASE_URL, echo=True)  # echo=True para logs SQL
```

## 📝 Notas Importantes

1. **Migraciones**: Siempre revisa los archivos de migración generados automáticamente antes de aplicarlos
2. **Backup**: En producción, asegúrate de tener backups antes de ejecutar migraciones
3. **Índices**: Los campos `device_id` y `timestamp` tienen índices para optimizar consultas
4. **Timezone**: Los timestamps se almacenan con zona horaria (UTC)

## 🐛 Solución de Problemas

### Error de conexión a la base de datos

```bash
# Verificar que la variable DATABASE_URL esté configurada
echo $DATABASE_URL

# Probar conexión directa
psql $DATABASE_URL
```

### Error de migración

```bash
# Ver el estado actual
alembic current

# Si hay conflictos, revisar el historial
alembic history

# En caso de emergencia, marcar como aplicada sin ejecutar
alembic stamp head
```

### Reinstalar desde cero

```bash
# Eliminar tabla de versiones de Alembic
DROP TABLE alembic_version;

# Marcar migración inicial como aplicada
alembic stamp head
```

## 🤝 Contribución

1. Modificar modelos en `models/`
2. Generar migración: `alembic revision --autogenerate -m "descripción"`
3. Revisar el archivo de migración generado
4. Probar en entorno de desarrollo
5. Aplicar en producción: `alembic upgrade head`

---

**Nota**: Esta estructura de base de datos está diseñada para integrarse con el backend en Hono y recibir datos del ESP32 vía MQTT.
