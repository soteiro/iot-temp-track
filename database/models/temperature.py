import sqlalchemy as sa
from base import Base
from sqlalchemy.sql import func

#base para declacar modelos


class TemperatureReading(Base):
    """ modelo de temperatura
    se traduce a una tabla llamada temperature
    """

    __tablename__ = "temperature"
    id = sa.Column(sa.Integer, primary_key=True, index=True)

    # tablas de datos
    temperature = sa.Column(sa.Float, nullable=False)
    humidity = sa.Column(sa.Float, nullable=False)
    location = sa.Column(sa.String, nullable=True)
    timestamp = sa.Column(
        sa.TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # reprensentacion del modelo
    def __repr__(self):
        return f"<TemperatureReading(id={self.id}, temp= {self.temperature}, hum= {self.humidity},location={self.location}, timestamp={self.timestamp})>"
    

