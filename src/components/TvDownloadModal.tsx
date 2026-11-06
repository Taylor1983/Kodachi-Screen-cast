/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Tv,
  Download,
  Check,
  Copy,
  ExternalLink,
  Laptop,
  Cast,
  Layers,
  Monitor,
  Flame,
  ArrowRight,
  Shield,
  Smartphone,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface TvDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionPin: string;
}

type TvBrand = 'samsung' | 'lg' | 'android_tv' | 'fire_tv' | 'apple_tv' | 'roku';

export const TvDownloadModal: React.FC<TvDownloadModalProps> = ({
  isOpen,
  onClose,
  sessionPin,
}) => {
  const [activeTab, setActiveTab] = useState<'tv' | 'download'>('tv');
  const [selectedBrand, setSelectedBrand] = useState<TvBrand>('android_tv');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDesktop, setCopiedDesktop] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const currentReceiverUrl = `${window.location.origin}${window.location.pathname}?pin=${sessionPin}#receiver`;

  const copyReceiverUrl = () => {
    navigator.clipboard.writeText(currentReceiverUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const downloadDesktopFile = () => {
    const desktopFileContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=Kodachi Cast
Comment=Secure Screen Mirroring for Linux Kodachi
Exec=x-www-browser --app="${window.location.origin}${window.location.pathname}"
Icon=${window.location.origin}/icon.svg
Terminal=false
Categories=Network;AudioVideo;Security;
Keywords=screen;mirror;cast;kodachi;webrtc;
StartupWMClass=kodachi-cast
`;
    const blob = new Blob([desktopFileContent], { type: 'application/x-desktop' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kodachi-cast.desktop';
    a.click();
    URL.revokeObjectURL(url);
    setCopiedDesktop(true);
    setTimeout(() => setCopiedDesktop(false), 2500);
  };

  const copyBashScript = () => {
    const bashScript = `#!/usr/bin/env bash
# Kodachi Cast Desktop Launcher
echo "[*] Launching Kodachi Cast in isolated application mode..."
if command -v brave-browser &> /dev/null; then
  brave-browser --app="${window.location.origin}${window.location.pathname}" &
elif command -v google-chrome &> /dev/null; then
  google-chrome --app="${window.location.origin}${window.location.pathname}" &
elif command -v chromium &> /dev/null; then
  chromium --app="${window.location.origin}${window.location.pathname}" &
else
  x-www-browser "${window.location.origin}${window.location.pathname}" &
fi
`;
    navigator.clipboard.writeText(bashScript).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">TV Connection & App Download</h3>
              <p className="text-xs text-slate-400">
                Setup guide for Smart TVs, Chromecast, and Linux Kodachi desktop app installation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer text-sm p-1"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('tv')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'tv'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cast to TV Setup
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'download'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Download & Install App
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'tv' ? (
            <div className="space-y-5">
              {/* Quick URL for TV Browser */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Step 1: Open this Receiver Link on your TV's Web Browser:
                </span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-xs text-emerald-400">
                  <span className="truncate flex-1">{currentReceiverUrl}</span>
                  <button
                    onClick={copyReceiverUrl}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs cursor-pointer shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Room PIN:</span>
                  <strong className="text-emerald-400 font-mono text-xs">{sessionPin}</strong>
                  <span aria-hidden="true">·</span>
                  <span>(No software installation required on the TV!)</span>
                </div>
              </div>

              {/* TV Brands Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Select your TV System:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'android_tv', label: 'Android / Google TV' },
                    { id: 'samsung', label: 'Samsung Tizen' },
                    { id: 'lg', label: 'LG webOS' },
                    { id: 'fire_tv', label: 'Fire TV' },
                    { id: 'apple_tv', label: 'Apple TV' },
                    { id: 'roku', label: 'Roku' },
                  ].map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => setSelectedBrand(brand.id as TvBrand)}
                      className={`p-2 rounded-lg border text-center text-xs transition-colors cursor-pointer ${
                        selectedBrand === brand.id
                          ? 'bg-emerald-950/60 border-emerald-500 text-white font-semibold'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {brand.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Instructions for Selected Brand */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
                {selectedBrand === 'android_tv' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>Android TV & Google TV (Sony, TCL, Philips, Hisense, Shield TV)</span>
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                      <li>
                        <strong>Option A (Browser - Easiest):</strong> On your TV, launch <em>TV Bro</em>, <em>Chrome</em>, or <em>Puffin TV</em> and navigate to the receiver URL above. Enter PIN <code className="text-emerald-400 font-mono">{sessionPin}</code> and press Fullscreen.
                      </li>
                      <li>
                        <strong>Option B (VLC for Android TV):</strong> In VLC on your TV, choose <em>Open Network Stream</em> and enter the FFmpeg UDP stream from the <strong>Terminal CLI</strong> tab (<code className="text-emerald-400 font-mono">udp://@:8554</code>).
                      </li>
                      <li>
                        <strong>Option C (Direct Chromecast):</strong> In Kodachi's Chromium browser, click the browser menu (⋮) &gt; <em>Cast...</em> and select your Android TV to mirror your entire screen instantly with audio!
                      </li>
                    </ol>
                  </div>
                )}

                {selectedBrand === 'samsung' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>Samsung Smart TV (Tizen OS)</span>
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                      <li>
                        Press the <strong>Home</strong> button on your Samsung remote and open the built-in <strong>Internet</strong> web browser.
                      </li>
                      <li>
                        Type in the receiver URL (or scan the pairing QR code from the Host tab using your phone to send the tab to your Samsung TV via SmartThings).
                      </li>
                      <li>
                        Enter PIN <code className="text-emerald-400 font-mono">{sessionPin}</code> and click the <strong>Connect Stream</strong> button.
                      </li>
                      <li>
                        Click the <strong>Fullscreen</strong> icon in the stream controls for an edge-to-edge television monitor.
                      </li>
                    </ol>
                  </div>
                )}

                {selectedBrand === 'lg' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>LG Smart TV (webOS)</span>
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                      <li>
                        Open the <strong>Web Browser</strong> app from the LG webOS Home dashboard.
                      </li>
                      <li>
                        Enter the receiver URL into the address bar.
                      </li>
                      <li>
                        Click <strong>Connect Stream</strong> and tap the TV browser's Zoom/Fullscreen button to fill the screen.
                      </li>
                      <li>
                        <em>Tip:</em> Bookmark the page in your LG browser so you can connect with a single click anytime you boot Linux Kodachi!
                      </li>
                    </ol>
                  </div>
                )}

                {selectedBrand === 'fire_tv' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>Amazon Fire TV Stick & Fire TV Cube</span>
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                      <li>
                        Open the <strong>Amazon Silk</strong> web browser from your Apps menu.
                      </li>
                      <li>
                        Navigate to the receiver URL and enter your session PIN.
                      </li>
                      <li>
                        Press the Menu button (☰) on your Fire TV remote to activate full-screen browsing.
                      </li>
                    </ol>
                  </div>
                )}

                {selectedBrand === 'apple_tv' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>Apple TV</span>
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                      <li>
                        Open the receiver URL on any iPhone, iPad, or Mac on the same network.
                      </li>
                      <li>
                        Tap <strong>AirPlay</strong> and beam the display to your Apple TV.
                      </li>
                      <li>
                        Alternatively, use <em>VLC on Apple TV</em> to tune into the FFmpeg network stream generated in the Terminal CLI tab.
                      </li>
                    </ol>
                  </div>
                )}

                {selectedBrand === 'roku' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>Roku Streaming Stick & Roku TV</span>
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                      <li>
                        Open the receiver URL on your phone or tablet.
                      </li>
                      <li>
                        Cast to Roku using the <em>Web Video Caster</em> app or native <em>AirPlay / Screen Mirroring</em> in Roku Settings &gt; System &gt; Screen Mirroring.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Option 1: PWA Native Installation */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-emerald-400" />
                      <span>Option 1: Progressive Web App (PWA) Install</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Installs directly into Linux Kodachi / Ubuntu / Debian or mobile devices with zero external installers.
                    </p>
                  </div>

                  {isInstalled ? (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
                      App Already Installed
                    </span>
                  ) : isInstallable ? (
                    <button
                      onClick={install}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install App Now</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                      Use Browser URL Bar (⊕) to Install
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800/80">
                  <p>
                    <strong>How it works:</strong> In Chromium, Brave, or Chrome on Linux Kodachi, look at the right side of the address bar for the <strong>Install</strong> icon (a computer monitor with an arrow or a <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">+</kbd> symbol) and click <em>Install Kodachi Cast</em>.
                  </p>
                  <p>
                    Once installed, it launches in its own isolated window without browser tabs or URL bars, and appears in your XFCE Applications menu!
                  </p>
                </div>
              </div>

              {/* Option 2: Linux Kodachi .desktop Launcher Shortcut */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Option 2: Linux Kodachi Desktop Launcher (.desktop file)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Creates a clickable native shortcut on your Kodachi desktop or XFCE Whisker menu.
                    </p>
                  </div>

                  <button
                    onClick={downloadDesktopFile}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedDesktop ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                    <span>{copiedDesktop ? 'Downloaded!' : 'Download .desktop'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-300 space-y-1">
                  <div className="text-slate-400"># To install on Linux Kodachi:</div>
                  <div>mv ~/Downloads/kodachi-cast.desktop ~/.local/share/applications/</div>
                  <div>chmod +x ~/.local/share/applications/kodachi-cast.desktop</div>
                </div>
              </div>

              {/* Option 3: Terminal CLI Launcher Script */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-emerald-400" />
                      <span>Option 3: Standalone Shell Script (`kodachi-cast.sh`)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Launches the application instantly from the Kodachi terminal in headless or kiosk mode.
                    </p>
                  </div>

                  <button
                    onClick={copyBashScript}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedScript ? 'Script Copied!' : 'Copy Script'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Zero Remote Telemetry &amp; E2EE Encrypted</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
