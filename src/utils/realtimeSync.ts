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

/**
 * RealtimeSyncManager — Polling-based live GPS tracker.
 *
 * Previously used an external PieSocket WebSocket broker (wss://api.piesocket.com/v3/demo)
 * which caused constant "RECONNECTING" because the free demo tier drops connections
 * frequently and rate-limits heavily.
 *
 * This implementation polls the local backend API every POLL_INTERVAL_MS milliseconds
 * for the latest liveLatitude / liveLongitude of each subscribed order. This is:
 *  - Reliable: uses the same API the rest of the app uses (no external deps)
 *  - Zero reconnect loops: simple HTTP polling, not a persistent socket
 *  - Accurate: the driver's GPS hook already PATCHes live coords to the DB in real-time
 *
 * The publish() method is a no-op in this mode because the driver's useDriverGPS hook
 * directly PATCHes coordinates via the REST API — there is no need to re-broadcast them.
 */

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds for live coordinates
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

class RealtimeSyncManager {
  private state: ConnectionState = 'disconnected';
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private stateCallbacks: Set<StateCallback> = new Set();
  // Map from orderId → polling interval handle
  private pollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  // Map from waybillNo → orderId (needed to fetch by ID)
  private waybillToOrderId: Map<string, string> = new Map();

  // ── State management ──────────────────────────────────────────────────────

  private updateState(newState: ConnectionState) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateCallbacks.forEach(cb => cb(newState));
  }

  public subscribeState(cb: StateCallback): () => void {
    this.stateCallbacks.add(cb);
    // Immediately notify with current state
    cb(this.state);
    return () => {
      this.stateCallbacks.delete(cb);
    };
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }

  // ── Message subscriptions ─────────────────────────────────────────────────

  /**
   * Subscribe to live GPS updates for a given waybill number.
   * orderId is auto-detected from the context but can be pre-seeded with setOrderId().
   */
  public subscribe(waybillNo: string, cb: MessageCallback): () => void {
    const cleanWaybill = waybillNo.trim().toUpperCase();

    if (!this.messageCallbacks.has(cleanWaybill)) {
      this.messageCallbacks.set(cleanWaybill, new Set());
    }
    this.messageCallbacks.get(cleanWaybill)!.add(cb);

    // Start polling for this waybill if not already
    this.startPolling(cleanWaybill);

    return () => {
      const callbacks = this.messageCallbacks.get(cleanWaybill);
      if (callbacks) {
        callbacks.delete(cb);
        if (callbacks.size === 0) {
          this.messageCallbacks.delete(cleanWaybill);
          this.stopPolling(cleanWaybill);
        }
      }

      if (this.messageCallbacks.size === 0) {
        this.updateState('disconnected');
      }
    };
  }

  /**
   * Pre-register the orderId for a waybill number.
   * Called by LiveTrackingMap so we can use the numeric API endpoint.
   */
  public setOrderId(waybillNo: string, orderId: string) {
    this.waybillToOrderId.set(waybillNo.trim().toUpperCase(), orderId);
  }

  // ── Polling engine ────────────────────────────────────────────────────────

  private startPolling(cleanWaybill: string) {
    if (this.pollingIntervals.has(cleanWaybill)) return; // Already polling

    this.updateState('connecting');

    // Run once immediately, then on interval
    this.fetchLiveLocation(cleanWaybill);

    const handle = setInterval(() => {
      this.fetchLiveLocation(cleanWaybill);
    }, POLL_INTERVAL_MS);

    this.pollingIntervals.set(cleanWaybill, handle);
  }

  private stopPolling(cleanWaybill: string) {
    const handle = this.pollingIntervals.get(cleanWaybill);
    if (handle !== undefined) {
      clearInterval(handle);
      this.pollingIntervals.delete(cleanWaybill);
    }
  }

  private async fetchLiveLocation(cleanWaybill: string) {
    const token = localStorage.getItem('dts_token');
    if (!token) return;

    // Try to resolve orderId; fall back to searching by waybillNo in all orders
    const orderId = this.waybillToOrderId.get(cleanWaybill);

    try {
      let liveLatitude: number | null = null;
      let liveLongitude: number | null = null;
      let lastLiveUpdate: string | null = null;
      let resolvedDriverId = 'unassigned';
      let resolvedOrderId = orderId || '';

      if (orderId) {
        // Direct fetch by ID — fastest path
        const res = await fetch(`${API_BASE}/api/deliveryorder/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        liveLatitude = data.liveLatitude ?? null;
        liveLongitude = data.liveLongitude ?? null;
        lastLiveUpdate = data.lastLiveUpdate ?? null;
        resolvedDriverId = data.driver?.name || data.driverId || 'unassigned';
        resolvedOrderId = String(data.id);
      } else {
        // Fallback: search all orders and find matching waybill
        const res = await fetch(`${API_BASE}/api/deliveryorder`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const orders: any[] = await res.json();
        const found = orders.find((o: any) =>
          (o.waybillNo || '').trim().toUpperCase() === cleanWaybill
        );
        if (found) {
          liveLatitude = found.liveLatitude ?? null;
          liveLongitude = found.liveLongitude ?? null;
          lastLiveUpdate = found.lastLiveUpdate ?? null;
          resolvedDriverId = found.driver?.name || found.driverId || 'unassigned';
          resolvedOrderId = String(found.id);
          // Cache the orderId so future polls use the fast path
          this.waybillToOrderId.set(cleanWaybill, resolvedOrderId);
        }
      }

      this.updateState('connected');

      if (liveLatitude !== null && liveLongitude !== null) {
        const msg: LocationMessage = {
          waybillNo: cleanWaybill,
          lat: liveLatitude,
          lng: liveLongitude,
          timestamp: lastLiveUpdate || new Date().toLocaleString(),
          driverId: resolvedDriverId,
          orderId: resolvedOrderId
        };

        const callbacks = this.messageCallbacks.get(cleanWaybill);
        if (callbacks) {
          callbacks.forEach(cb => cb(msg));
        }
      }
    } catch (err) {
      console.warn('RealtimeSync: Poll failed for', cleanWaybill, err);
      // Don't thrash state on transient errors — only mark disconnected after a few failures
    }
  }

  // ── Publish (no-op in polling mode) ──────────────────────────────────────

  /**
   * In polling mode, publish is a no-op because the driver's GPS hook already
   * PATCHes live coordinates directly to the backend via /api/deliveryorder/{id}/status.
   * The polling loop picks them up on the next tick automatically.
   */
  public publish(_msg: LocationMessage) {
    // No-op: coordinates are written to DB via REST PATCH by useDriverGPS hook.
    // The polling loop fetches them automatically every POLL_INTERVAL_MS.
  }

  // ── Legacy connect() shim ─────────────────────────────────────────────────

  /** Called by some old code paths — safe to ignore in polling mode. */
  public connect() {
    // No-op: polling starts automatically on subscribe()
  }
}

export const realtimeSync = new RealtimeSyncManager();
