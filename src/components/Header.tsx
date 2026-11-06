/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Cast } from 'lucide-react';
import { ViewTab } from '../types';

interface HeaderProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onEmergencyPanic: () => void;
  onOpenTvModal: () => void;
  isStreaming: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onEmergencyPanic,
  onOpenTvModal,
  isStreaming,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('host');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cast className="w-4 h-4" />
          </div>
          <span>Kodachi Cast</span>
        </a>
      </div>

      {/* Zone 2: 4 single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => onTabChange('host')}
          className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'host'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Host Mirror
        </button>
        <button
          onClick={() => onTabChange('receiver')}
          className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'receiver'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Receiver View
        </button>
        <button
          onClick={() => onTabChange('sandbox')}
          className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'sandbox'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Kodachi Sandbox
        </button>
        <button
          onClick={() => onTabChange('cli')}
          className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'cli'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Terminal CLI
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenTvModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="TV Connection Guides and Desktop App Download"
        >
          <span>TV &amp; Download</span>
        </button>

        {isStreaming && (
          <span className="hidden sm:inline-flex items-center text-xs font-mono tabular-nums text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-1 rounded">
            Live Cast Active
          </span>
        )}
        <button
          onClick={onEmergencyPanic}
          title="Emergency Panic Room: Immediately disconnects all streams and clears canvas cache"
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-rose-200 bg-rose-950/60 border border-rose-800/60 rounded-lg hover:bg-rose-900/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-rose-500"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Panic Kill</span>
        </button>
      </div>
    </header>
  );
};
