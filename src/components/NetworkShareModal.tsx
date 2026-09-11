import React, { useState } from 'react';
import { NetworkInfo } from '../api/inventoryApi';
import { Wifi, Copy, Check, X, Laptop, Smartphone, Monitor, ShieldCheck } from 'lucide-react';

interface NetworkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkInfo: NetworkInfo | null;
  isSyncConnected: boolean;
  version: number;
}

export const NetworkShareModal: React.FC<NetworkShareModalProps> = ({
  isOpen,
  onClose,
  networkInfo,
  isSyncConnected,
  version,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const urls = networkInfo?.urls && networkInfo.urls.length > 0
    ? networkInfo.urls
    : [`http://${window.location.hostname || '192.168.1.X'}:3000`];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Multi-Computer Network Sync</h2>
              <p className="text-xs text-slate-400">Share catalog with all computers on your local network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Alert */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950">
              <p className="font-semibold text-emerald-900">
                Centralized Server Active {isSyncConnected && '(Live Sync Online)'}
              </p>
              <p className="text-emerald-700 mt-0.5 leading-relaxed">
                All inventory edits, stock adjustments, and new parts save to the host database and instantly synchronize across all connected screens (Catalog v{version}).
              </p>
            </div>
          </div>

          {/* Network URL list */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Network Address to Open on Other Computers:
            </label>
            <div className="space-y-2">
              {urls.map((url) => (
                <div
                  key={url}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs sm:text-sm text-slate-900 shadow-2xs"
                >
                  <span className="font-bold text-amber-700">{url}</span>
                  <button
                    onClick={() => handleCopy(url)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedUrl === url ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-900" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Make sure other computers or phones are connected to the same Wi-Fi or office router.
            </p>
          </div>

          {/* 3 Step Guide */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Quick Setup on Other Computers:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Monitor className="w-4 h-4 text-blue-600 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-800">1. Open Browser</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Open Chrome, Edge, or Safari on computer 2</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Laptop className="w-4 h-4 text-amber-600 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-800">2. Type the URL</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Paste the IP address with port 3000</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Smartphone className="w-4 h-4 text-emerald-600 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-800">3. Live Sync</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Edits on any device update immediately!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
