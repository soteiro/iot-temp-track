// @ts-nocheck
import Aedes from 'aedes';

export interface BrokerConfig {
  id: string;
  port?: number;
  heartbeatInterval: number;
  connectTimeout: number;
}

export class MQTTBroker {
  private broker: any;
  private config: BrokerConfig;

  constructor(config: BrokerConfig) {
    this.config = config;
    this.broker = Aedes({
      id: config.id,
      heartbeatInterval: config.heartbeatInterval,
      connectTimeout: config.connectTimeout
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.broker.on('client', (client: any) => {
      console.log(`[MQTT] Cliente conectado: ${client.id}`);
    });

    this.broker.on('clientDisconnect', (client: any) => {
      console.log(`[MQTT] Cliente desconectado: ${client.id}`);
    });

    this.broker.on('publish', (packet: any, client: any) => {
      if (client && packet.topic !== '$SYS/broker/heartbeat') {
        console.log(`[MQTT] Mensaje en ${packet.topic} de ${client.id}:`, packet.payload.toString());
      }
    });

    this.broker.on('subscribe', (subscriptions: any[], client: any) => {
      console.log(`[MQTT] Cliente ${client.id} suscrito a:`, subscriptions.map((s: any) => s.topic));
    });

    this.broker.on('unsubscribe', (unsubscriptions: any[], client: any) => {
      console.log(`[MQTT] Cliente ${client.id} desuscrito de:`, unsubscriptions);
    });

    this.broker.on('clientError', (client: any, err: Error) => {
      console.error(`[MQTT] Error en cliente ${client.id}:`, err);
    });

    this.broker.on('connectionError', (client: any, err: Error) => {
      console.error(`[MQTT] Error de conexión:`, err);
    });
  }

  public getBroker(): any {
    return this.broker;
  }

  public getStats() {
    return {
      connectedClients: Object.keys(this.broker.clients).length,
      brokerId: this.broker.id,
      uptime: process.uptime()
    };
  }

  public publish(topic: string, message: any, qos: 0 | 1 | 2 = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const packet = {
        cmd: 'publish',
        topic,
        payload: Buffer.from(typeof message === 'string' ? message : JSON.stringify(message)),
        qos,
        retain: false,
        dup: false
      };

      this.broker.publish(packet, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.broker.close(() => {
        console.log('[MQTT] Broker cerrado');
        resolve();
      });
    });
  }
}

// Configuración por defecto
export const defaultBrokerConfig: BrokerConfig = {
  id: 'iot-temp-broker',
  heartbeatInterval: 60000,
  connectTimeout: 30000
};
