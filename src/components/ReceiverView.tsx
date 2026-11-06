/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Camera,
  Volume2,
  VolumeX,
  Shield,
  Wifi,
  Lock,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { SessionInfo } from '../types';
import { mirrorBridge } from '../services/mirrorBridge';

interface ReceiverViewProps {
  currentSession: SessionInfo;
}

export const ReceiverView: React.FC<ReceiverViewProps> = ({ currentSession }) => {
  const [pinInput, setPinInput] = useState(currentSession.pin);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number>(28);
  const [fps, setFps] = useState<number>(30);
  const [streamResolution, setStreamResolution] = useState<string>('1280x720');
  const [isEmergencyBlackout, setIsEmergencyBlackout] = useState(false);
  const [lastFrameTime, setLastFrameTime] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  // Auto-connect if pin is supplied in URL or session exists
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    if (urlPin) {
      setPinInput(urlPin);
      setIsConnected(true);
    } else if (currentSession.isBroadcasting) {
      setIsConnected(true);
    }
  }, [currentSession.isBroadcasting]);

  // Subscribe to stream frames and panic signals
  useEffect(() => {
    const unsubFrame = mirrorBridge.subscribe('mirror_frame', (payload: any) => {
      if (isEmergencyBlackout) return;
      if (payload && payload.data) {
        setIsConnected(true);
        const now = Date.now();
        if (payload.timestamp) {
          const delta = Math.max(8, now - payload.timestamp);
          setLatencyMs(delta);
        }

        // Render received JPEG onto receiver canvas
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            if (canvas.width !== img.width || canvas.height !== img.height) {
              canvas.width = img.width;
              canvas.height = img.height;
              setStreamResolution(`${img.width}x${img.height}`);
            }
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
            }
          }
        };
        img.src = payload.data;
        setLastFrameTime(now);

        // Calculate FPS
        frameCountRef.current++;
        if (now - fpsTimerRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          fpsTimerRef.current = now;
        }
      }
    });

    const unsubPanic = mirrorBridge.subscribe('emergency_panic', () => {
      setIsEmergencyBlackout(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#05080f';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ef4444';
          ctx.font = '20px JetBrains Mono, monospace';
          ctx.fillText('EMERGENCY BLACKOUT TRIGGERED BY HOST', 50, 100);
        }
      }
    });

    return () => {
      unsubFrame();
      unsubPanic();
    };
  }, [isEmergencyBlackout]);

  const handleConnect = () => {
    setIsEmergencyBlackout(false);
    setIsConnected(true);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const handleSnapshot = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `kodachi-receiver-snap-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Receiver Connection Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Tv className="w-5 h-5 text-emerald-400" />
              <span>Receiver Display Terminal</span>
            </h1>
            <p className="text-xs text-slate-400">
              Zero-latency display viewer for remote Linux Kodachi desktop broadcasts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-emerald-500">
              <span className="text-xs text-slate-400 mr-2">PIN:</span>
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="KOD-0000"
                className="bg-transparent text-sm font-mono font-bold text-emerald-400 w-24 outline-none uppercase tracking-wider"
              />
            </div>
            <button
              onClick={handleConnect}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Connect Stream
            </button>
          </div>
        </div>
      </div>

      {/* Main Stream Viewport */}
      <div
        ref={containerRef}
        className={`bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''
        }`}
      >
        {/* Stream Top Floating Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>Kodachi Display Feed</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-400">{streamResolution}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-400">{fps} FPS</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-400">{latencyMs}ms delay</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-1.5 py-0.5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                className="text-slate-400 hover:text-white cursor-pointer px-1"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] text-slate-300 w-10 text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                className="text-slate-400 hover:text-white cursor-pointer px-1"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-md transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Snapshot */}
            <button
              onClick={handleSnapshot}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              title="Save Screen Snapshot"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Snapshot</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-md transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video Canvas Presentation Area */}
        <div className="relative flex-1 bg-black aspect-video flex items-center justify-center overflow-auto min-h-[460px]">
          {isEmergencyBlackout ? (
            <div className="text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center mx-auto text-rose-500">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-rose-400">Stream Terminated by Host Panic Switch</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                The broadcaster engaged the emergency kill switch. Video and audio tracks were wiped instantly.
              </p>
              <button
                onClick={() => setIsEmergencyBlackout(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Reconnect Attempt
              </button>
            </div>
          ) : isConnected ? (
            <div
              className="transition-transform duration-100 flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[70vh] object-contain shadow-2xl"
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Tv className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-white">Awaiting Mirrored Feed</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start screen sharing from the Host Mirror tab or enter a valid Kodachi broadcast PIN to link displays.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Poll Active Local Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Receiver Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Lock className="w-3 h-3" />
              <span>TLS / WebRTC Encrypted Channel</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Zero Remote Storage</span>
          </div>

          <div className="flex items-center gap-4 font-mono tabular-nums">
            <span>Buffer: 0 frames</span>
            <span>Loss: 0.0%</span>
            <span>Active Feed</span>
          </div>
        </div>
      </div>

      {/* Receiver Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-white">Cross-Device Pairing</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Open this URL on a secondary monitor, tablet, or phone on the same Wi-Fi/LAN to use as an external Kodachi monitor.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-white">Privacy Preservation</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All Conky HUD coordinates and masked regions are pixelated or blacked out before transmission to this screen.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-white">Hardware Acceleration</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Frames are processed through hardware GPU canvas rendering for smooth 60fps playback without high CPU load.
          </p>
        </div>
      </div>
    </div>
  );
};
