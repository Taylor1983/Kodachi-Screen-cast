/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RedactionType = 'blur' | 'pixelate' | 'blackout';

export interface RedactionZone {
  id: string;
  label: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  widthPercent: number; // 0 to 100
  heightPercent: number; // 0 to 100
  type: RedactionType;
  enabled: boolean;
  isPreset?: boolean;
}

export interface StreamQualityPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  badge: string;
  description: string;
}

export interface SessionInfo {
  roomId: string;
  pin: string;
  sessionKey: string;
  created: number;
  activeViewers: number;
  isBroadcasting: boolean;
  streamSource: 'screen' | 'sandbox' | null;
  codec: string;
  fps: number;
  resolution: string;
}

export type ViewTab = 'host' | 'receiver' | 'sandbox' | 'cli';

export interface KodachiMetric {
  torCircuits: number;
  vpnLocation: string;
  vpnProtocol: string;
  dnsProvider: string;
  macAddress: string;
  ramUsageMB: number;
  ramTotalMB: number;
  cpuPercent: number;
  ipAddress: string;
  anonymityLevel: 'Hardened' | 'Tor Only' | 'Direct';
}
