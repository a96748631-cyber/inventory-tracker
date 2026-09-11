import React from 'react';
import { Truck, Plus, Download, RotateCcw, ShieldCheck, Wifi, Users } from 'lucide-react';

interface HeaderProps {
  onAddPart: () => void;
  onExportCSV: () => void;
  onResetData: () => void;
  onOpenNetworkShare: () => void;
  itemCount: number;
  isSyncConnected: boolean;
  syncVersion: number;
}

export const Header: React.FC<HeaderProps> = ({
  onAddPart,
  onExportCSV,
  onResetData,
  onOpenNetworkShare,
  isSyncConnected,
  syncVersion,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Mashkay Autoparts
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Genuine Fleet Parts
                </span>
                {/* Live Multi-Computer Sync Badge */}
                <button
                  onClick={onOpenNetworkShare}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                    isSyncConnected
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                  }`}
                  title="Click to view IP address & connect other computers on your network"
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isSyncConnected ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        isSyncConnected ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    ></span>
                  </span>
                  <Wifi className="w-3 h-3" />
                  <span>Network Sync Active (v{syncVersion})</span>
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Centralized Fleet Inventory &bull; Trucks, Buses, Trailers, Cars &amp; Heavy Equipment
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="share-network-btn"
              onClick={onOpenNetworkShare}
              title="Share catalog with other computers on your network"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Connect Computers</span>
            </button>

            <button
              id="reset-sample-data-btn"
              onClick={onResetData}
              title="Reset to sample catalog"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sample Rows</span>
            </button>

            <button
              id="export-csv-btn"
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              id="add-new-part-btn"
              onClick={onAddPart}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Part</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
