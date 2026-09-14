import React, { useState } from 'react';
import { NetworkInfo } from '../api/inventoryApi';
import { Wifi, Copy, Check, X, Globe, Laptop, Smartphone, Monitor, ShieldCheck, Share2 } from 'lucide-react';

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'internet' | 'local'>('internet');

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // The current web URL (works over the internet from any device/network)
  const webOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isCloudHost = webOrigin.includes('run.app') || webOrigin.includes('http');

  const localUrls = networkInfo?.urls && networkInfo.urls.length > 0
    ? networkInfo.urls
    : [`http://${window.location.hostname || '192.168.1.X'}:3000`];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Multi-Device Access &amp; Sync</h2>
              <p className="text-xs text-slate-400">Connect computers across different networks or local Wi-Fi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('internet')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'internet'
                ? 'border-amber-500 text-amber-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Different Networks (Internet Link)</span>
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'local'
                ? 'border-amber-500 text-amber-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Same Office / Wi-Fi Network</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Alert */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950">
              <p className="font-semibold text-emerald-900">
                Firebase Firestore Cloud Database Active
              </p>
              <p className="text-emerald-700 mt-0.5 leading-relaxed">
                Connected to cloud project <strong className="font-mono text-emerald-900">inventory-tracker-1d34a</strong>. All inventory edits, restocks, and additions synchronize immediately across every computer and mobile device in real time.
              </p>
            </div>
          </div>

          {activeTab === 'internet' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Public Web Link (Works from ANY Computer, Phone, or Location):
                </label>
                <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl font-mono text-xs sm:text-sm text-slate-900 shadow-2xs">
                  <span className="font-bold text-blue-900 truncate pr-2" title={webOrigin}>
                    {webOrigin}
                  </span>
                  <button
                    onClick={() => handleCopy(webOrigin, 'internet-link')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
                  >
                    {copiedKey === 'internet-link' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Share this secure HTTPS link with anyone on your team. It opens directly in any web browser without needing to be on your local Wi-Fi.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800">How Different Networks Work:</p>
                <p>&bull; Because this app runs on the cloud host, coworkers at other branches or working from home can open the link above.</p>
                <p>&bull; When anyone adds a part or modifies stock, all other computers automatically refresh within 2.5 seconds.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Computer's Local Wi-Fi Address (for your Phone or Tablet):
                </label>
                <div className="space-y-2">
                  {localUrls.map((url, idx) => (
                    <div
                      key={url}
                      className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200 rounded-xl font-mono text-xs sm:text-sm text-slate-900 shadow-2xs"
                    >
                      <span className="font-bold text-amber-900">{url}</span>
                      <button
                        onClick={() => handleCopy(url, `local-${idx}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                      >
                        {copiedKey === `local-${idx}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-slate-950" />
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
              </div>

              {/* QR Code section for instant scanning */}
              {localUrls.length > 0 && !localUrls[0].includes('192.168.1.X') && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=4&data=${encodeURIComponent(localUrls[0])}`}
                    alt="Scan with phone"
                    className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-900">Scan with your Phone Camera:</p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Open your phone camera and point it at this QR code to jump straight to the app on your phone.
                    </p>
                  </div>
                </div>
              )}

              {/* Troubleshooting checklist */}
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>📱</span> Why didn't `localhost:3000` work on your phone?
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>1. Never type 'localhost' on your phone:</strong> "localhost" means the phone itself. Use the exact number above (e.g. <code>{localUrls[0]}</code>).
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>2. Same Wi-Fi network:</strong> Make sure your phone's Wi-Fi is turned ON and connected to the exact same Wi-Fi router as your computer (turn off mobile data if it doesn't switch).
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>3. Windows Firewall:</strong> When running on Windows, make sure Windows Defender Firewall allows Node.js / tsx on Private networks.
                </p>
              </div>
            </div>
          )}

          {/* Quick Steps */}
          <div className="border-t border-slate-200 pt-3.5">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <Monitor className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-800 text-[11px]">Any Browser</p>
                <p className="text-[10px] text-slate-500">Chrome, Edge, Safari</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <Globe className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-800 text-[11px]">Any Network</p>
                <p className="text-[10px] text-slate-500">Office, Home, Cell</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <Smartphone className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-800 text-[11px]">Live Sync</p>
                <p className="text-[10px] text-slate-500">Instant multi-screen</p>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
