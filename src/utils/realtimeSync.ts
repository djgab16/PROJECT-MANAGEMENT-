export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface LocationMessage {
  waybillNo: string;
  lat: number;
  lng: number;
  timestamp: string;
  driverId: string;
  orderId: string;
}

type MessageCallback = (msg: LocationMessage) => void;
type StateCallback = (state: ConnectionState) => void;

class RealtimeSyncManager {
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private stateCallbacks: Set<StateCallback> = new Set();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 16000;
  private readonly apiKey = 'VCXCE95eGZGU7OR3ld2FiOlq8yieyZgKJ25CRUZV';
  private readonly wsUrl = `wss://api.piesocket.com/v3/demo?api_key=${this.apiKey}&notify_self=1`;

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.updateState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
    
    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        console.log('RealtimeSync: Connected successfully to broker');
        this.updateState('connected');
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'location_update' && data.waybillNo) {
            const msg: LocationMessage = {
              waybillNo: data.waybillNo,
              lat: Number(data.lat),
              lng: Number(data.lng),
              timestamp: data.timestamp || new Date().toLocaleString(),
              driverId: data.driverId || 'unassigned',
              orderId: data.orderId || ''
            };
            
            const cleanWaybill = msg.waybillNo.trim().toUpperCase();
            const callbacks = this.messageCallbacks.get(cleanWaybill);
            if (callbacks) {
              callbacks.forEach(cb => cb(msg));
            }
          }
        } catch (e) {
          // Ignore non-JSON or other broadcasted traffic on public demo channel
        }
      };

      this.socket.onclose = () => {
        console.warn('RealtimeSync: Connection closed');
        this.updateState('disconnected');
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.error('RealtimeSync: Socket error', err);
      };
    } catch (err) {
      console.error('RealtimeSync: Failed to establish WebSocket connection', err);
      this.updateState('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    console.log(`RealtimeSync: Reconnecting in ${delay}ms...`);
    this.updateState('reconnecting');
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private updateState(newState: ConnectionState) {
    this.state = newState;
    this.stateCallbacks.forEach(cb => cb(newState));
  }

  public subscribeState(cb: StateCallback): () => void {
    this.stateCallbacks.add(cb);
    cb(this.state);
    return () => {
      this.stateCallbacks.delete(cb);
    };
  }

  public subscribe(waybillNo: string, cb: MessageCallback): () => void {
    const cleanWaybill = waybillNo.trim().toUpperCase();
    if (!this.messageCallbacks.has(cleanWaybill)) {
      this.messageCallbacks.set(cleanWaybill, new Set());
    }
    this.messageCallbacks.get(cleanWaybill)!.add(cb);
    
    // Auto-connect on subscription
    this.connect();

    return () => {
      const callbacks = this.messageCallbacks.get(cleanWaybill);
      if (callbacks) {
        callbacks.delete(cb);
        if (callbacks.size === 0) {
          this.messageCallbacks.delete(cleanWaybill);
        }
      }
      
      // Auto-disconnect if no active subscriptions left to be light on resources
      if (this.messageCallbacks.size === 0 && this.socket) {
        this.socket.close();
        this.socket = null;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        this.reconnectAttempts = 0;
        this.updateState('disconnected');
      }
    };
  }

  public publish(msg: LocationMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('RealtimeSync: Socket is not open. Triggering connection.');
      this.connect();
      return;
    }

    const payload = {
      type: 'location_update',
      waybillNo: msg.waybillNo.trim().toUpperCase(),
      lat: msg.lat,
      lng: msg.lng,
      timestamp: msg.timestamp,
      driverId: msg.driverId,
      orderId: msg.orderId
    };

    this.socket.send(JSON.stringify(payload));
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }
}

export const realtimeSync = new RealtimeSyncManager();
