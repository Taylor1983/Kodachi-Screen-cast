/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Shield,
  ShieldAlert,
  Wifi,
  Cpu,
  HardDrive,
  Eye,
  EyeOff,
  Radio,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { KodachiMetric } from '../types';
import { mirrorBridge } from '../services/mirrorBridge';

interface KodachiSandboxProps {
  onMirrorSandbox: (canvas: HTMLCanvasElement) => void;
  isStreaming: boolean;
}

export const KodachiSandbox: React.FC<KodachiSandboxProps> = ({
  onMirrorSandbox,
  isStreaming,
}) => {
  const [metrics, setMetrics] = useState<KodachiMetric>({
    torCircuits: 3,
    vpnLocation: 'Zurich, Switzerland (WireGuard Hop 2)',
    vpnProtocol: 'WireGuard Multi-Hop Chained',
    dnsProvider: 'DNSCrypt (Quad9 + Cloudflare)',
    macAddress: '52:54:00:E8:4A:19 (Spoofed)',
    ramUsageMB: 1842,
    ramTotalMB: 16384,
    cpuPercent: 14,
    ipAddress: '185.220.101.44 (Tor Exit Node)',
    anonymityLevel: 'Hardened',
  });

  const [activeWindow, setActiveWindow] = useState<'terminal' | 'security' | 'browser'>('terminal');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'kodachi@kodachi-desktop:~$ kodachi-status',
    '[OK] Kodachi Kernel Hardened 6.1.0-kodachi-amd64',
    '[OK] Tor Service: ACTIVE (Circuits: 3 established)',
    '[OK] VPN Tunnel: ACTIVE (WireGuard multi-hop)',
    '[OK] DNSCrypt-Proxy: ENFORCING NO-LEAK RESOLUTION',
    '[OK] RAM Panic Scrubbing Daemon: ARMED & READY',
    'kodachi@kodachi-desktop:~$ ',
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isRedactedPreview, setIsRedactedPreview] = useState(false);
  const [isSimulatingStream, setIsSimulatingStream] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sandboxAnimationRef = useRef<number | null>(null);

  // Live fluctuating Conky telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        cpuPercent: Math.min(95, Math.max(8, prev.cpuPercent + (Math.floor(Math.random() * 7) - 3))),
        ramUsageMB: Math.min(16000, Math.max(1600, prev.ramUsageMB + (Math.floor(Math.random() * 20) - 10))),
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Terminal command executor
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const newHistory = [...terminalHistory, `kodachi@kodachi-desktop:~$ ${cmd}`];

    if (cmd === 'clear') {
      setTerminalHistory(['kodachi@kodachi-desktop:~$ ']);
      setTerminalInput('');
      return;
    } else if (cmd === 'wipe-ram' || cmd === 'panic') {
      newHistory.push(
        '[ALERT] RAM Scrub triggered! Overwriting volatile pages with zeros...',
        '[OK] Syncing buffers... 1,842MB cleared. System hardened.'
      );
    } else if (cmd === 'iptables -L' || cmd === 'iptables') {
      newHistory.push(
        'Chain INPUT (policy DROP)',
        'target     prot opt source               destination',
        'ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED',
        'ACCEPT     tcp  --  127.0.0.1            127.0.0.1            tcp dpt:9050 (Tor SOCKS)',
        'Chain OUTPUT (policy DROP)',
        'ACCEPT     all  --  anywhere             anywhere             owner UID 1000 (Tor/VPN)'
      );
    } else if (cmd === 'newnym' || cmd === 'tor-ip') {
      newHistory.push(
        '[TOR] SIGNAL NEWNYM sent to Tor control port 9051.',
        '[OK] Clean circuit built. New exit node assigned: 176.10.99.201 (Iceland).'
      );
      setMetrics((m) => ({ ...m, ipAddress: '176.10.99.201 (Tor Exit Node)' }));
    } else if (cmd === 'help') {
      newHistory.push(
        'Available Kodachi commands:',
        '  kodachi-status  - Display security services status',
        '  newnym          - Request fresh Tor identity & circuit',
        '  iptables -L     - View Kodachi firewall rules',
        '  wipe-ram        - Test volatile RAM scrubbing',
        '  clear           - Clear terminal output'
      );
    } else {
      newHistory.push(`bash: ${cmd}: command not found. Type "help" for valid Kodachi tools.`);
    }

    newHistory.push('kodachi@kodachi-desktop:~$ ');
    setTerminalHistory(newHistory);
    setTerminalInput('');
  };

  // Render authentic simulated Kodachi Desktop into canvas so it can be streamed to Receiver
  useEffect(() => {
    let active = true;

    const drawSandbox = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // 1. Dark sleek wallpaper background
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          // Subtle grid lines
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Desktop Watermark / Kodachi Emblem
          ctx.save();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
          ctx.font = 'bold 72px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('LINUX KODACHI', w * 0.4, h * 0.5);
          ctx.font = '16px JetBrains Mono, monospace';
          ctx.fillText('ANONYMOUS & ANTI-FORENSIC OS', w * 0.4, h * 0.5 + 32);
          ctx.restore();

          // 2. XFCE Top Panel (height ~32px)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, 32);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, w, 32);

          // XFCE Application Menu & Icons
          ctx.fillStyle = '#10b981';
          ctx.fillRect(8, 6, 20, 20);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px JetBrains Mono, monospace';
          ctx.fillText('K', 14, 20);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px Plus Jakarta Sans, sans-serif';
          ctx.fillText('Applications', 36, 20);
          ctx.fillText('Terminal', 130, 20);
          ctx.fillText('Tor Browser', 200, 20);
          ctx.fillText('Panic Room', 290, 20);

          // Tray on right of top panel
          const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
          ctx.textAlign = 'right';
          ctx.font = '12px JetBrains Mono, monospace';
          ctx.fillStyle = '#10b981';
          ctx.fillText(`[TOR: ON] [VPN: ON] ${timeStr}`, w - 16, 20);
          ctx.textAlign = 'left';

          // 3. Desktop Terminal Window (Left side)
          const winX = 32;
          const winY = 60;
          const winW = w * 0.58;
          const winH = h - 90;

          // Window shadow & body
          ctx.fillStyle = '#030712';
          ctx.fillRect(winX, winY, winW, winH);
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(winX, winY, winW, winH);

          // Window Title Bar
          ctx.fillStyle = '#111827';
          ctx.fillRect(winX, winY, winW, 28);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '12px JetBrains Mono, monospace';
          ctx.fillText('kodachi@kodachi-desktop: ~ (bash)', winX + 12, winY + 18);

          // Window Buttons
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(winX + winW - 14, winY + 14, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(winX + winW - 28, winY + 14, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(winX + winW - 42, winY + 14, 5, 0, Math.PI * 2);
          ctx.fill();

          // Terminal text lines inside canvas
          ctx.fillStyle = '#10b981';
          ctx.font = '11px JetBrains Mono, monospace';
          const displayedLines = terminalHistory.slice(-14);
          displayedLines.forEach((line, idx) => {
            ctx.fillText(line, winX + 12, winY + 48 + idx * 20);
          });

          // 4. Conky System & Anonymity Monitor HUD (Right side)
          const conkyX = w * 0.65;
          const conkyY = 50;
          const conkyW = w * 0.32;
          const conkyH = h - 70;

          // Conky background overlay
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(conkyX, conkyY, conkyW, conkyH);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(conkyX, conkyY, conkyW, conkyH);

          // Conky Header
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 13px JetBrains Mono, monospace';
          ctx.fillText('LINUX KODACHI CONKY v8.4', conkyX + 12, conkyY + 22);

          ctx.strokeStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(conkyX + 12, conkyY + 30);
          ctx.lineTo(conkyX + conkyW - 12, conkyY + 30);
          ctx.stroke();

          // Conky Metrics list
          const lines = [
            `ANONYMITY SCORE: 100% [OPTIMAL]`,
            `TOR STATUS: ACTIVE (3 CIRCUITS)`,
            `PUBLIC IP: ${metrics.ipAddress}`,
            `VPN TUNNEL: ${metrics.vpnProtocol}`,
            `VPN NODE: ${metrics.vpnLocation}`,
            `DNS ENCRYPT: ${metrics.dnsProvider}`,
            `MAC ADDR: ${metrics.macAddress}`,
            `CPU LOAD: ${metrics.cpuPercent}% [||||........]`,
            `RAM USAGE: ${metrics.ramUsageMB} MB / ${metrics.ramTotalMB} MB`,
            `PANIC KILL: ARMED (0-DELAY)`,
            `ENCRYPTED SWAP: ACTIVE`,
            `KILLSWITCH: IPTABLES ENFORCED`,
          ];

          ctx.font = '10px JetBrains Mono, monospace';
          lines.forEach((line, idx) => {
            if (line.includes('PUBLIC IP') || line.includes('MAC ADDR') || line.includes('TOR STATUS')) {
              ctx.fillStyle = '#f59e0b'; // highlight sensitive data
            } else if (line.includes('100%') || line.includes('ARMED')) {
              ctx.fillStyle = '#10b981';
            } else {
              ctx.fillStyle = '#94a3b8';
            }
            ctx.fillText(line, conkyX + 12, conkyY + 50 + idx * 24);
          });

          // 5. If Redaction Preview is active, apply blur/blackout over the Conky HUD
          if (isRedactedPreview) {
            ctx.save();
            ctx.fillStyle = '#05080f';
            ctx.fillRect(conkyX, conkyY, conkyW, conkyH);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = -conkyH; i < conkyW; i += 14) {
              ctx.moveTo(conkyX + i, conkyY);
              ctx.lineTo(conkyX + i + conkyH, conkyY + conkyH);
            }
            ctx.stroke();
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px JetBrains Mono, monospace';
            ctx.fillText('REDACTED (CONKY TELEMETRY)', conkyX + 16, conkyY + 32);
            ctx.restore();
          }

          // 6. Broadcast frame to Receiver if user triggered "Broadcast Sandbox"
          if (isSimulatingStream) {
            try {
              const frameData = canvas.toDataURL('image/jpeg', 0.6);
              mirrorBridge.publish('mirror_frame', {
                data: frameData,
                timestamp: Date.now(),
                pin: 'KOD-SANDBOX',
                width: w,
                height: h,
              });
            } catch (err) {
              // ignore
            }
          }
        }
      }

      sandboxAnimationRef.current = requestAnimationFrame(drawSandbox);
    };

    sandboxAnimationRef.current = requestAnimationFrame(drawSandbox);

    return () => {
      active = false;
      if (sandboxAnimationRef.current) {
        cancelAnimationFrame(sandboxAnimationRef.current);
      }
    };
  }, [metrics, terminalHistory, isRedactedPreview, isSimulatingStream]);

  const handleBroadcastSandbox = () => {
    setIsSimulatingStream(true);
    if (canvasRef.current) {
      onMirrorSandbox(canvasRef.current);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sandbox Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Interactive Linux Kodachi Desktop Sandbox</span>
            </h1>
            <p className="text-xs text-slate-400">
              Test screen mirroring, Conky overlay redaction, and terminal telemetry safely inside this authentic Kodachi environment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsRedactedPreview(!isRedactedPreview)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                isRedactedPreview
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isRedactedPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isRedactedPreview ? 'Redaction Mask Active' : 'Toggle Redaction Mask'}</span>
            </button>

            {!isSimulatingStream ? (
              <button
                onClick={handleBroadcastSandbox}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Cast Sandbox to Receiver</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSimulatingStream(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Stop Sandbox Cast</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Virtual Desktop Display (Canvas) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Virtual Kodachi XFCE Session</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-400">1280x720 60Hz</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Tor: 185.220.101.44</span>
            <span>·</span>
            <span>RAM: {metrics.ramUsageMB}MB</span>
          </div>
        </div>

        <div className="relative aspect-video flex items-center justify-center bg-black">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-auto object-contain max-h-[600px]"
          />
        </div>
      </div>

      {/* Interactive Controls & Live Terminal Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Terminal Input Pane (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <span>Interactive Kodachi Terminal</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">/dev/pts/1</span>
          </div>

          {/* Terminal output box */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 h-48 overflow-y-auto space-y-1">
            {terminalHistory.map((item, idx) => (
              <div key={idx} className="leading-tight">
                {item}
              </div>
            ))}
          </div>

          {/* Terminal prompt input */}
          <form onSubmit={handleTerminalSubmit} className="flex gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex-1 focus-within:border-emerald-500">
              <span className="text-emerald-500 font-mono text-xs mr-2">kodachi@desktop:~$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="type 'help', 'newnym', 'iptables -L', or 'wipe-ram'..."
                className="bg-transparent text-xs font-mono text-white flex-1 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Run
            </button>
          </form>
        </div>

        {/* Security Services Card (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Active Kodachi Daemons</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">Tor Multi-Hop Routing</span>
              <span className="font-mono text-emerald-400">3 Circuits (Tor v0.4.8)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">DNSCrypt Strict Resolver</span>
              <span className="font-mono text-emerald-400">Encrypted (Quad9/1.1.1.1)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">MAC Address Randomizer</span>
              <span className="font-mono text-emerald-400">macchanger (Spoofed)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">Iptables Killswitch</span>
              <span className="font-mono text-emerald-400">DROP Default Strict</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">RAM Scrub on Shutdown</span>
              <span className="font-mono text-emerald-400">sdmem armed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
