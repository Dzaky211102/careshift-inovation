import { WardInfo } from '../types';
import { StorageService } from './storage';
import { FirebaseSyncService } from './firebase';

export type WardSyncListener = (wards: WardInfo[], updatedWardId?: string) => void;

class WardSyncManager {
  private listeners: Set<WardSyncListener> = new Set();
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isInitialized = false;
  private reconnectTimer: any = null;
  private isOnline = true;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('careshift_wards_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'wards_updated' && Array.isArray(event.data.wards)) {
            this.handleIncomingWards(event.data.wards, event.data.updatedWardId);
          }
        };
      } catch (err) {
        console.warn('[WardSync] BroadcastChannel init notice:', err);
      }
    }
  }

  /**
   * Subscribe to ward updates across devices
   */
  public subscribe(listener: WardSyncListener): () => void {
    this.listeners.add(listener);
    if (!this.isInitialized) {
      this.init();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Initialize sync: initial fetch, SSE connection, and tab focus listeners
   */
  public async init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Initial fetch from server
    await this.fetchServerWards();

    // 2. Connect to SSE stream
    this.connectSSE();

    // 3. Listen to window focus for quick refresh when user returns to app
    window.addEventListener('focus', () => {
      this.fetchServerWards().catch(() => {});
    });

    // 4. Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.connectSSE();
      this.fetchServerWards().catch(() => {});
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Connect to Server-Sent Events stream for instant cross-device updates
   */
  private connectSSE() {
    if (typeof window === 'undefined' || !this.isOnline) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      this.eventSource = new EventSource('/api/sync/events');

      this.eventSource.onopen = () => {
        // SSE connected
      };

      this.eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(':')) return; // heartbeat
          const data = JSON.parse(event.data);

          if (data.type === 'init' && Array.isArray(data.wards)) {
            this.handleIncomingWards(data.wards);
          } else if (
            (data.type === 'ward_saved' ||
              data.type === 'ward_updated' ||
              data.type === 'wards_updated' ||
              data.type === 'wards_bulk_synced') &&
            Array.isArray(data.wards)
          ) {
            this.handleIncomingWards(data.wards, data.updatedWardId);
          } else if (data.type === 'ward_deleted' && Array.isArray(data.wards)) {
            this.handleIncomingWards(data.wards, data.deletedWardId);
          }
        } catch (err) {
          console.warn('[WardSync] Error parsing SSE event:', err);
        }
      };

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto-reconnect after 4s
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectSSE();
          }, 4000);
        }
      };
    } catch (err) {
      console.warn('[WardSync] SSE connection notice:', err);
    }
  }

  /**
   * Fetch current wards from server and merge with local storage
   */
  public async fetchServerWards(): Promise<WardInfo[]> {
    try {
      const res = await fetch('/api/wards', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.wards)) {
        const localWards = StorageService.getWards();

        // Merge logic:
        // Any wards on server take precedence, but if local has custom rooms not yet on server, push them
        const serverMap = new Map<string, WardInfo>();
        data.wards.forEach((w: WardInfo) => serverMap.set(w.id.trim().toLowerCase(), w));

        const unsyncedLocal: WardInfo[] = [];
        localWards.forEach((lw) => {
          const cleanId = lw.id.trim().toLowerCase();
          if (!serverMap.has(cleanId)) {
            serverMap.set(cleanId, lw);
            unsyncedLocal.push(lw);
          }
        });

        const merged = Array.from(serverMap.values());
        this.handleIncomingWards(merged);

        // If local had wards that server didn't have, upload them to server
        if (unsyncedLocal.length > 0) {
          this.syncAllToServer(merged).catch(() => {});
        }

        return merged;
      }
    } catch (err) {
      console.warn('[WardSync] Fetch notice (offline or starting):', err);
    }
    return StorageService.getWards();
  }

  /**
   * Process incoming wards from server or another tab
   */
  private handleIncomingWards(incoming: WardInfo[], updatedWardId?: string) {
    if (!Array.isArray(incoming) || incoming.length === 0) return;

    // Persist to local storage
    StorageService.saveWards(incoming);

    // Notify all UI listeners
    this.listeners.forEach((listener) => {
      try {
        listener(incoming, updatedWardId);
      } catch (err) {
        console.error('[WardSync] Listener callback error:', err);
      }
    });
  }

  /**
   * Save / Update a ward (Syncs to server, Firebase, local storage & BroadcastChannel)
   */
  public async saveWard(ward: WardInfo): Promise<WardInfo> {
    const cleanId = ward.id.trim().toLowerCase();
    const updatedWard: WardInfo = {
      ...ward,
      id: cleanId,
    };

    // 1. Save locally
    StorageService.updateWard(cleanId, updatedWard);
    const localWards = StorageService.getWards();

    // 2. Broadcast to other tabs on same device
    this.broadcastChannel?.postMessage({
      type: 'wards_updated',
      wards: localWards,
      updatedWardId: cleanId,
    });

    // 3. Notify local listeners
    this.listeners.forEach((l) => l(localWards, cleanId));

    // 4. Push to backend server for cross-device sync
    try {
      await fetch(`/api/wards/${cleanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedWard),
      });
    } catch (err) {
      console.warn('[WardSync] Server save notice:', err);
    }

    // 5. Push to Firebase if configured
    try {
      await FirebaseSyncService.saveWardOnline(updatedWard);
    } catch (err) {
      console.warn('[WardSync] Firebase save notice:', err);
    }

    return updatedWard;
  }

  /**
   * Delete a ward across devices
   */
  public async deleteWard(wardId: string): Promise<boolean> {
    const cleanId = wardId.trim().toLowerCase();

    // 1. Delete locally
    const success = StorageService.deleteWard(cleanId);
    if (!success) return false;

    const remaining = StorageService.getWards();

    // 2. Broadcast to other tabs
    this.broadcastChannel?.postMessage({
      type: 'wards_updated',
      wards: remaining,
      deletedWardId: cleanId,
    });

    // 3. Notify local listeners
    this.listeners.forEach((l) => l(remaining, cleanId));

    // 4. Delete on server
    try {
      await fetch(`/api/wards/${cleanId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[WardSync] Server delete notice:', err);
    }

    // 5. Delete on Firebase if configured
    try {
      await FirebaseSyncService.deleteWardOnline(cleanId);
    } catch (err) {
      console.warn('[WardSync] Firebase delete notice:', err);
    }

    return true;
  }

  /**
   * Upload all wards to server
   */
  public async syncAllToServer(wards: WardInfo[]): Promise<void> {
    try {
      await fetch('/api/wards/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wards }),
      });
    } catch (err) {
      console.warn('[WardSync] Notice syncing all to server:', err);
    }
  }

  /**
   * Save a newly cloned/created ward's full data package (settings, nurses, etc.)
   * so other devices opening the link have the complete data ready!
   */
  public async saveWardPackage(wardId: string, pkg: any): Promise<void> {
    const cleanId = wardId.trim().toLowerCase();
    try {
      await fetch(`/api/ward-data/${cleanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg),
      });
    } catch (err) {
      console.warn('[WardSync] Notice saving ward package:', err);
    }
  }

  /**
   * Fetch complete data package for a ward if not yet present in device's local storage
   */
  public async fetchWardPackage(wardId: string): Promise<any | null> {
    const cleanId = wardId.trim().toLowerCase();
    try {
      const res = await fetch(`/api/ward-data/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.exists && data.data) {
          return data.data;
        }
      }
    } catch (err) {
      console.warn('[WardSync] Notice fetching ward package:', err);
    }
    return null;
  }
}

export const WardSyncService = new WardSyncManager();
