/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Shield,
  Server,
  Smartphone,
  Cpu,
  Flame,
  Globe,
  Sliders,
} from 'lucide-react';

export const TerminalCommands: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<'ffmpeg' | 'tor_onion' | 'iptables' | 'scrcpy' | 'pipewire'>('ffmpeg');

  // Interactive parameters
  const [displayServer, setDisplayServer] = useState(':0.0');
  const [resWidth, setResWidth] = useState(1920);
  const [resHeight, setResHeight] = useState(1080);
  const [fps, setFps] = useState(30);
  const [targetIp, setTargetIp] = useState('192.168.1.120');
  const [port, setPort] = useState(8554);
  const [protocol, setProtocol] = useState<'udp' | 'srt' | 'http'>('udp');
  const [codec, setCodec] = useState<'libx264' | 'h264_vaapi'>('libx264');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Generate dynamic commands based on user parameters
  const getFfmpegCommand = () => {
    if (codec === 'h264_vaapi') {
      return `ffmpeg -vaapi_device /dev/dri/renderD128 -f x11grab -video_size ${resWidth}x${resHeight} -framerate ${fps} -i ${displayServer} \\
  -vf 'format=nv12,hwupload' -c:v h264_vaapi -b:v 3000k -maxrate 3500k -bufsize 1000k \\
  -f mpegts ${protocol}://${targetIp}:${port}?pkt_size=1316`;
    }

    return `ffmpeg -f x11grab -video_size ${resWidth}x${resHeight} -framerate ${fps} -i ${displayServer} \\
  -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p \\
  -b:v 2500k -g ${fps * 2} \\
  -f mpegts ${protocol}://${targetIp}:${port}?pkt_size=1316`;
  };

  const getTorrcSnippet = () => {
    return `# Add to /etc/tor/torrc on Linux Kodachi:
HiddenServiceDir /var/lib/tor/screen_mirror/
HiddenServicePort 8080 127.0.0.1:8080

# Restart Tor service:
sudo systemctl restart tor

# Check generated .onion domain:
sudo cat /var/lib/tor/screen_mirror/hostname`;
  };

  const getIptablesCommand = () => {
    return `# 1. Allow local subnet to receive screen mirror port on Kodachi:
sudo iptables -I INPUT -p ${protocol} --dport ${port} -s 192.168.1.0/24 -j ACCEPT

# 2. Or using UFW (if enabled in Kodachi):
sudo ufw allow from 192.168.1.0/24 to any port ${port} proto ${protocol}

# 3. Verify active rule:
sudo iptables -L INPUT -n --line-numbers | grep ${port}`;
  };

  const getScrcpyCommand = () => {
    return `# Mirror Android screen directly into Linux Kodachi over encrypted USB/ADB:
scrcpy --max-size 1920 --video-bit-rate 4M --max-fps 60 \\
  --stay-awake --turn-screen-off --no-audio

# Or forward Android audio to Kodachi speakers via sndcpy:
sndcpy`;
  };

  const getPipewireCommand = () => {
    return `# Capture PipeWire desktop stream on modern Kodachi Debian bases:
gst-launch-1.0 pipewiresrc ! videoconvert ! x264enc tune=zerolatency speed-preset=ultrafast ! \\
  rtph264pay ! udpsink host=${targetIp} port=${port}`;
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>Linux Kodachi Native CLI & Streaming Suite</span>
          </h1>
          <p className="text-xs text-slate-400">
            Hardened command recipes for streaming X11, PipeWire, Tor Onion services, and configuring Kodachi iptables firewalls.
          </p>
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSelectedTool('ffmpeg')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            selectedTool === 'ffmpeg'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>FFmpeg X11 Mirror</span>
        </button>

        <button
          onClick={() => setSelectedTool('tor_onion')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            selectedTool === 'tor_onion'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Tor Onion Mirror (.onion)</span>
        </button>

        <button
          onClick={() => setSelectedTool('iptables')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            selectedTool === 'iptables'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Iptables & Firewall Bypass</span>
        </button>

        <button
          onClick={() => setSelectedTool('pipewire')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            selectedTool === 'pipewire'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>PipeWire & GStreamer</span>
        </button>

        <button
          onClick={() => setSelectedTool('scrcpy')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            selectedTool === 'scrcpy'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android Scrcpy</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Command & Script Output (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
              <span className="font-mono text-emerald-400 flex items-center gap-2">
                <span>bash</span>
                <span>—</span>
                <span className="text-slate-400">
                  {selectedTool === 'ffmpeg' && 'ffmpeg-x11grab.sh'}
                  {selectedTool === 'tor_onion' && 'torrc & stream configuration'}
                  {selectedTool === 'iptables' && 'kodachi-firewall-pinhole.sh'}
                  {selectedTool === 'pipewire' && 'pipewire-gstreamer.sh'}
                  {selectedTool === 'scrcpy' && 'scrcpy-mirror.sh'}
                </span>
              </span>

              <button
                onClick={() => {
                  let cmd = '';
                  if (selectedTool === 'ffmpeg') cmd = getFfmpegCommand();
                  else if (selectedTool === 'tor_onion') cmd = getTorrcSnippet();
                  else if (selectedTool === 'iptables') cmd = getIptablesCommand();
                  else if (selectedTool === 'pipewire') cmd = getPipewireCommand();
                  else if (selectedTool === 'scrcpy') cmd = getScrcpyCommand();
                  copyToClipboard(cmd, selectedTool);
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              >
                {copiedId === selectedTool ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto text-slate-200 leading-relaxed">
              <pre className="whitespace-pre-wrap">
                {selectedTool === 'ffmpeg' && getFfmpegCommand()}
                {selectedTool === 'tor_onion' && getTorrcSnippet()}
                {selectedTool === 'iptables' && getIptablesCommand()}
                {selectedTool === 'pipewire' && getPipewireCommand()}
                {selectedTool === 'scrcpy' && getScrcpyCommand()}
              </pre>
            </div>
          </div>

          {/* Receiver Playback Instruction */}
          {selectedTool === 'ffmpeg' && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-white">How to watch on receiver machine:</h4>
              <div className="bg-slate-950 p-3 rounded font-mono text-xs text-emerald-400 flex items-center justify-between">
                <code>ffplay -fflags nobuffer -flags low_delay {protocol}://@:{port}</code>
                <button
                  onClick={() =>
                    copyToClipboard(`ffplay -fflags nobuffer -flags low_delay ${protocol}://@:${port}`, 'ffplay')
                  }
                  className="text-slate-400 hover:text-white cursor-pointer ml-2"
                >
                  {copiedId === 'ffplay' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Or enter this stream URL in VLC Media Player (Media &gt; Open Network Stream).
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Parameters & Security Rationale (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedTool === 'ffmpeg' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Stream Parameters</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">X11 Display Server</label>
                  <input
                    type="text"
                    value={displayServer}
                    onChange={(e) => setDisplayServer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Width</label>
                    <input
                      type="number"
                      value={resWidth}
                      onChange={(e) => setResWidth(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Height</label>
                    <input
                      type="number"
                      value={resHeight}
                      onChange={(e) => setResHeight(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">FPS</label>
                    <select
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    >
                      <option value={15}>15 FPS (Tor-friendly)</option>
                      <option value={30}>30 FPS (Standard)</option>
                      <option value={60}>60 FPS (LAN Gigabit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Protocol</label>
                    <select
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    >
                      <option value="udp">UDP (Lowest Latency)</option>
                      <option value="srt">SRT (Encrypted/Reliable)</option>
                      <option value="http">HTTP WebM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Target Receiver IP</label>
                  <input
                    type="text"
                    value={targetIp}
                    onChange={(e) => setTargetIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Video Encoder</label>
                  <select
                    value={codec}
                    onChange={(e) => setCodec(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  >
                    <option value="libx264">CPU: libx264 (ultrafast, zerolatency)</option>
                    <option value="h264_vaapi">Intel/AMD GPU: h264_vaapi (Hardware Accel)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Security details card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Kodachi Specific Hardening Notes</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong className="text-white">Why ultrafast / zerolatency?</strong> Standard x264 presets buffer 15–30 frames for B-frame lookahead, causing ~500ms lag. In Kodachi, zero latency avoids desync with keystrokes.
              </p>
              <p>
                <strong className="text-white">Iptables Drop Policy:</strong> Linux Kodachi's default firewall drops unsolicited inbound packets. If streaming to another machine on LAN, make sure to execute the iptables rule above.
              </p>
              <p>
                <strong className="text-white">Tor Hidden Service Casting:</strong> Tor onion routing eliminates port forwarding entirely. Any receiver running Tor Browser can open your <code className="text-emerald-400">.onion</code> stream securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
