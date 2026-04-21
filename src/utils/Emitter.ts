/**
 * Minimal EventEmitter implementation for React Native
 * Supports once(), on(), off(), emit() with typed event maps
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Listener = (...args: any[]) => void;

export class EventEmitter<Events extends Record<string, any[]>> {
  private listeners = new Map<keyof Events, Set<Listener>>();

  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener);
    return () => this.off(event, listener);
  }

  once<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): void {
    const wrapped: Listener = (...args) => {
      this.off(event, wrapped);
      listener(...args as Events[K]);
    };
    this.on(event, wrapped as (...args: Events[K]) => void);
  }

  off<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): void {
    this.listeners.get(event)?.delete(listener as Listener);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this.listeners.get(event)?.forEach(l => (l as (...args: Events[K]) => void)(...args));
  }

  removeAllListeners<K extends keyof Events>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
