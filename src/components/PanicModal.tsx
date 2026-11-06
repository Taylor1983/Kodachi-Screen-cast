/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { mirrorBridge } from '../services/mirrorBridge';

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPanic: () => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({
  isOpen,
  onClose,
  onConfirmPanic,
}) => {
  const [isWiping, setIsWiping] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleExecutePanic = () => {
    setIsWiping(true);
    mirrorBridge.terminateAllStreams();

    setTimeout(() => {
      setIsWiping(false);
      setIsDone(true);
      onConfirmPanic();
      setTimeout(() => {
        setIsDone(false);
        onClose();
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-rose-800/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Emergency Panic Kill</h3>
            <p className="text-xs text-rose-400 font-mono">Linux Kodachi Anti-Forensic Protocol</p>
          </div>
        </div>

        {isDone ? (
          <div className="p-4 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Streams Terminated & Wiped</h4>
            <p className="text-xs text-emerald-300">
              Media tracks closed. Canvas buffers zeroed. Receivers disconnected.
            </p>
          </div>
        ) : (
          <>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  This immediately aborts all screen capture permissions, stops audio feeds, sends an emergency blackout signal to all active receivers, and purges volatile frame buffers.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isWiping}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePanic}
                disabled={isWiping}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-lg shadow-rose-950 flex items-center gap-2"
              >
                {isWiping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Scrubbing...</span>
                  </>
                ) : (
                  <span>Execute Kill Switch</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
