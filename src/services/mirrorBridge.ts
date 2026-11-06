/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionInfo } from '../types';

type MessageListener = (data: any) => void;

class MirrorBridge {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<MessageListener>> = new Map();
  private localStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('kodachi_cast_bridge');
        this.channel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type && this.listeners.has(type)) {
            this.listeners.get(type)!.forEach((cb) => {
              try {
                cb(payload);
              } catch (err) {
                console.error('Error in bridge listener', err);
              }
            });
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this context', e);
      }
    }
  }

  public publish(type: string, payload: any) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload });
      } catch (err) {
        console.warn('Bridge postMessage error', err);
      }
    }
    // Also trigger local listeners within same tab
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  public subscribe(type: string, callback: MessageListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(callback);
      }
    };
  }

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public setProcessedStream(stream: MediaStream | null) {
    this.processedStream = stream;
  }

  public getProcessedStream(): MediaStream | null {
    return this.processedStream;
  }

  public terminateAllStreams() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.processedStream) {
      this.processedStream.getTracks().forEach((track) => track.stop());
      this.processedStream = null;
    }
    this.publish('emergency_panic', { timestamp: Date.now() });
  }
}

export const mirrorBridge = new MirrorBridge();
