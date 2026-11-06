/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewTab, SessionInfo } from './types';
import { Header } from './components/Header';
import { HostMirror } from './components/HostMirror';
import { ReceiverView } from './components/ReceiverView';
import { KodachiSandbox } from './components/KodachiSandbox';
import { TerminalCommands } from './components/TerminalCommands';
import { PanicModal } from './components/PanicModal';
import { TvDownloadModal } from './components/TvDownloadModal';
import { mirrorBridge } from './services/mirrorBridge';

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('host');
  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [tvModalOpen, setTvModalOpen] = useState(false);

  // Initialize random session room
  const [session, setSession] = useState<SessionInfo>(() => {
    const randomPin = `KOD-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomRoomId = Math.random().toString(36).substring(2, 10);
    return {
      roomId: randomRoomId,
      pin: randomPin,
      sessionKey: Math.random().toString(36).substring(2, 15),
      created: Date.now(),
      activeViewers: 0,
      isBroadcasting: false,
      streamSource: null,
      codec: 'VP9 / H.264',
      fps: 30,
      resolution: '1280x720',
    };
  });

  // Handle URL hash or query params (e.g., #receiver or ?pin=...)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'receiver' || hash === 'sandbox' || hash === 'cli') {
      setActiveTab(hash as ViewTab);
    }
  }, []);

  const updateSession = (updates: Partial<SessionInfo>) => {
    setSession((prev) => {
      const next = { ...prev, ...updates };
      mirrorBridge.publish('session_updated', next);
      return next;
    });
  };

  const handleConfirmPanic = () => {
    updateSession({
      isBroadcasting: false,
      streamSource: null,
    });
  };

  const handleMirrorSandbox = (canvas: HTMLCanvasElement) => {
    updateSession({
      isBroadcasting: true,
      streamSource: 'sandbox',
      fps: 60,
      resolution: `${canvas.width}x${canvas.height}`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar Contract compliant Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.location.hash = tab;
        }}
        onEmergencyPanic={() => setPanicModalOpen(true)}
        onOpenTvModal={() => setTvModalOpen(true)}
        isStreaming={session.isBroadcasting}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'host' && (
          <HostMirror
            session={session}
            onUpdateSession={updateSession}
            onLaunchSandbox={() => {
              setActiveTab('sandbox');
              window.location.hash = 'sandbox';
            }}
            onOpenTvModal={() => setTvModalOpen(true)}
          />
        )}

        {activeTab === 'receiver' && (
          <ReceiverView currentSession={session} />
        )}

        {activeTab === 'sandbox' && (
          <KodachiSandbox
            onMirrorSandbox={handleMirrorSandbox}
            isStreaming={session.isBroadcasting}
          />
        )}

        {activeTab === 'cli' && (
          <TerminalCommands />
        )}
      </main>

      {/* Clean quiet footer compliant with anti-slop guidelines */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Kodachi Cast</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Telemetry Screen Mirroring &amp; Privacy Redaction for Linux Kodachi</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Client-Side WebRTC</span>
            <span>·</span>
            <span>Volatile Memory Processing</span>
            <span>·</span>
            <span>Smart TV &amp; PWA Ready</span>
          </div>
        </div>
      </footer>

      {/* Panic Modal */}
      <PanicModal
        isOpen={panicModalOpen}
        onClose={() => setPanicModalOpen(false)}
        onConfirmPanic={handleConfirmPanic}
      />

      {/* TV Connection & Download Setup Modal */}
      <TvDownloadModal
        isOpen={tvModalOpen}
        onClose={() => setTvModalOpen(false)}
        sessionPin={session.pin}
      />
    </div>
  );
}
