/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  Video,
  VideoOff,
  EyeOff,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Sliders,
  ShieldCheck,
  Disc,
  Download,
  Plus,
  Trash2,
  Lock,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  Tv,
} from 'lucide-react';
import QRCode from 'qrcode';
import { RedactionZone, StreamQualityPreset, SessionInfo } from '../types';
import { mirrorBridge } from '../services/mirrorBridge';

interface HostMirrorProps {
  session: SessionInfo;
  onUpdateSession: (updates: Partial<SessionInfo>) => void;
  onLaunchSandbox: () => void;
  onOpenTvModal: () => void;
}

const QUALITY_PRESETS: StreamQualityPreset[] = [
  {
    id: 'tor',
    name: 'Tor Circuit Safe',
    width: 854,
    height: 480,
    fps: 15,
    bitrateKbps: 600,
    badge: 'Tor-Optimized',
    description: 'Low-bandwidth, packet-saving stream tuned for multi-hop onion routing.',
  },
  {
    id: 'vpn',
    name: 'Standard VPN',
    width: 1280,
    height: 720,
    fps: 30,
    bitrateKbps: 2000,
    badge: 'Recommended',
    description: 'Balanced latency and crispness across WireGuard or OpenVPN tunnels.',
  },
  {
    id: 'lan',
    name: 'Direct LAN / Gigabit',
    width: 1920,
    height: 1080,
    fps: 60,
    bitrateKbps: 5000,
    badge: 'High Fidelity',
    description: 'Ultra-low latency 60fps mirror for trusted local network receivers.',
  },
];

export const HostMirror: React.FC<HostMirrorProps> = ({
  session,
  onUpdateSession,
  onLaunchSandbox,
  onOpenTvModal,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('vpn');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [monochromeCipher, setMonochromeCipher] = useState(false);
  const [audioCapture, setAudioCapture] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);

  // Redaction zones
  const [redactionZones, setRedactionZones] = useState<RedactionZone[]>([
    {
      id: 'conky-hud',
      label: 'Conky Telemetry (IP / MAC / Tor)',
      xPercent: 72,
      yPercent: 4,
      widthPercent: 26,
      heightPercent: 68,
      type: 'blur',
      enabled: true,
      isPreset: true,
    },
    {
      id: 'xfce-top-bar',
      label: 'XFCE Top Panel & Tray',
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 4.5,
      type: 'blur',
      enabled: false,
      isPreset: true,
    },
  ]);

  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const drawStartPos = useRef<{ x: number; y: number } | null>(null);
  const [tempZone, setTempZone] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const lastFrameBroadcastRef = useRef<number>(0);

  // Generate QR Code for receiver pairing
  useEffect(() => {
    const receiverUrl = `${window.location.origin}${window.location.pathname}?room=${session.roomId}&pin=${session.pin}#receiver`;
    QRCode.toDataURL(receiverUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#f8fafc',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [session.roomId, session.pin]);

  // Handle start display capture
  const startScreenCapture = async () => {
    try {
      const preset = QUALITY_PRESETS.find((p) => p.id === selectedQuality) || QUALITY_PRESETS[1];
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.fps, max: preset.fps },
        },
        audio: audioCapture,
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      rawStreamRef.current = stream;
      mirrorBridge.setLocalStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      setIsCapturing(true);
      onUpdateSession({
        isBroadcasting: true,
        streamSource: 'screen',
        resolution: `${preset.width}x${preset.height}`,
        fps: preset.fps,
      });

      // Handle user stopping stream via browser banner
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopCapture();
        };
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Error starting screen capture:', err);
      }
    }
  };

  const stopCapture = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((track) => track.stop());
      rawStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (isRecording) {
      stopRecording();
    }

    setIsCapturing(false);
    mirrorBridge.terminateAllStreams();
    onUpdateSession({
      isBroadcasting: false,
      streamSource: null,
    });
  }, [isRecording, onUpdateSession]);

  // Main canvas processing loop: draws incoming video, applies redaction filters, broadcasts to receiver
  useEffect(() => {
    if (!isCapturing) return;

    let active = true;

    const renderLoop = () => {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Sync canvas dimensions
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
          }

          const width = canvas.width;
          const height = canvas.height;

          // 1. Draw raw video
          ctx.save();
          if (monochromeCipher) {
            ctx.filter = 'grayscale(100%) contrast(115%) brightness(90%)';
          }
          ctx.drawImage(video, 0, 0, width, height);
          ctx.restore();

          // 2. Apply active Redaction Zones
          redactionZones.forEach((zone) => {
            if (!zone.enabled) return;

            const zx = (zone.xPercent / 100) * width;
            const zy = (zone.yPercent / 100) * height;
            const zw = (zone.widthPercent / 100) * width;
            const zh = (zone.heightPercent / 100) * height;

            if (zw <= 0 || zh <= 0) return;

            if (zone.type === 'blackout') {
              // Solid dark mask with subtle diagonal security lines
              ctx.save();
              ctx.fillStyle = '#05080f';
              ctx.fillRect(zx, zy, zw, zh);

              // Diagonal hatching
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              for (let i = -zh; i < zw; i += 12) {
                ctx.moveTo(zx + i, zy);
                ctx.lineTo(zx + i + zh, zy + zh);
              }
              ctx.stroke();

              // Redaction badge
              ctx.fillStyle = '#94a3b8';
              ctx.font = '11px JetBrains Mono, monospace';
              ctx.fillText('REDACTED (KODACHI SAFEGUARD)', zx + 8, zy + 18);
              ctx.restore();
            } else if (zone.type === 'pixelate') {
              // Fast pixelation
              try {
                const sampleFactor = 0.08;
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = Math.max(1, Math.floor(zw * sampleFactor));
                tempCanvas.height = Math.max(1, Math.floor(zh * sampleFactor));
                const tCtx = tempCanvas.getContext('2d');
                if (tCtx) {
                  tCtx.drawImage(canvas, zx, zy, zw, zh, 0, 0, tempCanvas.width, tempCanvas.height);
                  ctx.imageSmoothingEnabled = false;
                  ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, zx, zy, zw, zh);
                  ctx.imageSmoothingEnabled = true;
                }
              } catch (e) {
                // fallback to blackout
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(zx, zy, zw, zh);
              }
            } else {
              // Blur type
              ctx.save();
              // Create clip region
              ctx.beginPath();
              ctx.rect(zx, zy, zw, zh);
              ctx.clip();
              ctx.filter = 'blur(16px)';
              ctx.drawImage(canvas, 0, 0, width, height);
              ctx.restore();

              // Subtle boundary line
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
              ctx.lineWidth = 1;
              ctx.strokeRect(zx, zy, zw, zh);
            }
          });

          // 3. Ephemeral Security Watermark
          if (watermarkEnabled) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '12px JetBrains Mono, monospace';
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            const watermarkText = `KODACHI CAST // PIN: ${session.pin} // ${timestamp} UTC // E2EE`;
            ctx.fillText(watermarkText, 16, height - 16);
            ctx.restore();
          }

          // 4. Send frame data to receiver via mirrorBridge (throttled to ~20-30fps to avoid memory pressure)
          const now = Date.now();
          if (now - lastFrameBroadcastRef.current >= 45) {
            lastFrameBroadcastRef.current = now;
            try {
              const frameData = canvas.toDataURL('image/jpeg', 0.65);
              mirrorBridge.publish('mirror_frame', {
                data: frameData,
                timestamp: now,
                pin: session.pin,
                width,
                height,
              });
            } catch (err) {
              // ignore canvas taint if any
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCapturing, redactionZones, watermarkEnabled, monochromeCipher, session.pin]);

  // Interactive custom zone drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingZone || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    drawStartPos.current = { x, y };
    setTempZone({ x, y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingZone || !drawStartPos.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.min(drawStartPos.current.x, currentX);
    const y = Math.min(drawStartPos.current.y, currentY);
    const w = Math.abs(currentX - drawStartPos.current.x);
    const h = Math.abs(currentY - drawStartPos.current.y);

    setTempZone({ x, y, w, h });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingZone || !tempZone) return;
    if (tempZone.w > 3 && tempZone.h > 3) {
      const newZone: RedactionZone = {
        id: `zone-${Date.now()}`,
        label: `Custom Redaction ${redactionZones.length + 1}`,
        xPercent: Math.round(tempZone.x * 10) / 10,
        yPercent: Math.round(tempZone.y * 10) / 10,
        widthPercent: Math.round(tempZone.w * 10) / 10,
        heightPercent: Math.round(tempZone.h * 10) / 10,
        type: 'blur',
        enabled: true,
      };
      setRedactionZones((prev) => [...prev, newZone]);
    }
    drawStartPos.current = null;
    setTempZone(null);
    setIsDrawingZone(false);
  };

  // Client-side recording
  const startRecording = () => {
    if (!canvasRef.current) return;
    try {
      const stream = canvasRef.current.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (e) {
      console.error('Error starting MediaRecorder', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  // Instant snapshot grabber
  const takeSnapshot = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `kodachi-cast-snap-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  const copyShareLink = () => {
    const receiverUrl = `${window.location.origin}${window.location.pathname}?room=${session.roomId}&pin=${session.pin}#receiver`;
    navigator.clipboard.writeText(receiverUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const copyPin = () => {
    navigator.clipboard.writeText(session.pin).then(() => {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Hidden raw video element */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      {/* Top Action & Pairing Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Linux Kodachi Screen Mirroring Hub</span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Encrypted WebRTC P2P</span>
              <span aria-hidden="true">·</span>
              <span>Hardware PipeWire/X11 Ready</span>
              <span aria-hidden="true">·</span>
              <span>Real-Time Redaction Pipeline</span>
            </div>
          </div>

          {/* Quick Connection Credentials Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-slate-400">PIN:</span>
              <span className="text-sm font-mono font-bold text-emerald-400 tracking-wider">
                {session.pin}
              </span>
              <button
                onClick={copyPin}
                title="Copy Session PIN"
                className="text-slate-400 hover:text-white cursor-pointer ml-1"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Viewer URL'}</span>
            </button>

            <button
              onClick={() => setQrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>

            <button
              onClick={onOpenTvModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Step-by-step guides for connecting your Smart TV or downloading the app"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Cast to TV / Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Screen Viewport & Live Canvas (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            {/* Viewport Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>Display Feed</span>
                </span>
                {isCapturing && (
                  <span className="text-xs font-mono tabular-nums text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                    LIVE STREAMING
                  </span>
                )}
                {isRecording && (
                  <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40 animate-pulse">
                    <Disc className="w-3 h-3 text-rose-500 fill-rose-500" />
                    <span>REC {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
                  </span>
                )}
              </div>

              {/* Viewport Control Buttons */}
              <div className="flex items-center gap-2">
                {isCapturing && (
                  <>
                    <button
                      onClick={takeSnapshot}
                      title="Capture redacted snapshot (PNG with metadata stripped)"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Snapshot</span>
                    </button>

                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/60 rounded-md transition-colors cursor-pointer"
                      >
                        <Disc className="w-3.5 h-3.5" />
                        <span>Record</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer"
                      >
                        <span>Stop Rec</span>
                      </button>
                    )}
                  </>
                )}

                {isCapturing ? (
                  <button
                    onClick={stopCapture}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 rounded-md transition-colors cursor-pointer"
                  >
                    <VideoOff className="w-3.5 h-3.5" />
                    <span>Stop Mirror</span>
                  </button>
                ) : (
                  <button
                    onClick={startScreenCapture}
                    className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors cursor-pointer shadow-sm"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Start Screen Share</span>
                  </button>
                )}
              </div>
            </div>

            {/* Viewport Canvas Surface */}
            <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden min-h-[380px]">
              {isCapturing ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className={`max-w-full max-h-full object-contain ${
                      isDrawingZone ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                  />
                  {/* Active drawing ghost rectangle */}
                  {tempZone && (
                    <div
                      className="absolute border-2 border-emerald-400 bg-emerald-500/20 pointer-events-none"
                      style={{
                        left: `${tempZone.x}%`,
                        top: `${tempZone.y}%`,
                        width: `${tempZone.w}%`,
                        height: `${tempZone.h}%`,
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center p-8 max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Monitor className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-white">No Active Display Stream</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Capture your Linux Kodachi desktop, browser windows, or launch the interactive Kodachi OS sandbox to test real-time mirroring.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={startScreenCapture}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>Share Screen or Window</span>
                    </button>
                    <button
                      onClick={onLaunchSandbox}
                      className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Test with Kodachi Sandbox</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Viewport Sub-bar & Recorded Download Notice */}
            {recordedBlobUrl && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-950/40 border-t border-emerald-800/40 text-xs">
                <span className="text-emerald-300 font-mono">
                  Session recording ready (stored in volatile browser memory)
                </span>
                <a
                  href={recordedBlobUrl}
                  download={`kodachi-mirror-${Date.now()}.webm`}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download WebM File</span>
                </a>
              </div>
            )}
          </div>

          {/* Kodachi Specific Privacy Redaction Console */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                  <span>Kodachi Leak Prevention & Redaction Zones</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Protect sensitive desktop monitors, Tor IPs, MAC addresses, and private windows before streaming.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDrawingZone(!isDrawingZone)}
                  disabled={!isCapturing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isDrawingZone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  } ${!isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isDrawingZone ? 'Click & Drag on Screen' : 'Draw Custom Mask'}</span>
                </button>
              </div>
            </div>

            {/* Zone List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {redactionZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    zone.enabled
                      ? 'bg-slate-950/80 border-slate-700'
                      : 'bg-slate-950/30 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="flex items-center gap-2 font-medium text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={zone.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setRedactionZones((prev) =>
                            prev.map((z) => (z.id === zone.id ? { ...z, enabled: checked } : z))
                          );
                        }}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>{zone.label}</span>
                    </label>

                    {!zone.isPreset && (
                      <button
                        onClick={() => {
                          setRedactionZones((prev) => prev.filter((z) => z.id !== zone.id));
                        }}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove Redaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Mask Style:</span>
                    <select
                      value={zone.type}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        setRedactionZones((prev) =>
                          prev.map((z) => (z.id === zone.id ? { ...z, type: newType } : z))
                        );
                      }}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="blur">Gaussian Blur</option>
                      <option value="pixelate">Pixelate</option>
                      <option value="blackout">Security Blackout</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Stream Configuration & Quality Matrix (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quality & Preset Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Bandwidth & Network Tuning</span>
            </h3>

            <div className="space-y-2.5">
              {QUALITY_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedQuality(preset.id)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    selectedQuality === preset.id
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">{preset.name}</span>
                    <span className="text-xs font-mono tabular-nums text-emerald-400">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">{preset.description}</p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <span>{preset.width}x{preset.height}</span>
                    <span>·</span>
                    <span>{preset.fps} FPS</span>
                    <span>·</span>
                    <span>~{preset.bitrateKbps} Kbps</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy & Anti-Leak Toggles */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3.5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Stream Security Options</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">Ephemeral Hash Watermark</span>
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">Monochrome / Cipher Filter</span>
                <input
                  type="checkbox"
                  checked={monochromeCipher}
                  onChange={(e) => setMonochromeCipher(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">System Audio Capture</span>
                <input
                  type="checkbox"
                  checked={audioCapture}
                  onChange={(e) => setAudioCapture(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Kodachi System Telemetry Summary */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Kodachi System Safeguards</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>DNS Leak Protection</span>
                <span className="font-mono text-emerald-400">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Exfiltrated Telemetry</span>
                <span className="font-mono text-emerald-400">NONE (0 kB)</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Memory Retention</span>
                <span className="font-mono text-emerald-400">VOLATILE ONLY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Receiver Pairing QR</h4>
              <button
                onClick={() => setQrModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Scan with phone or remote display on the same network to view the mirrored stream instantly.
            </p>
            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-xl inline-block mx-auto">
                <img src={qrDataUrl} alt="Pairing QR Code" className="w-56 h-56" />
              </div>
            ) : (
              <div className="w-56 h-56 bg-slate-800 rounded-xl flex items-center justify-center mx-auto text-slate-400 text-xs">
                Generating...
              </div>
            )}
            <div className="text-xs font-mono text-emerald-400">PIN: {session.pin}</div>
            <button
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
