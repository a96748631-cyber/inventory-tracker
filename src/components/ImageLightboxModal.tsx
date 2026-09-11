import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { InventoryItem } from '../types';

interface ImageLightboxModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ item, onClose }) => {
  if (!item || !item.imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = item.imageUrl;
    link.download = `${item.partNumber}-photo.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="image-lightbox-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-900">{item.partNumber}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                {item.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{item.itemName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div className="p-6 bg-slate-950 flex items-center justify-center min-h-[280px] max-h-[500px] overflow-hidden">
          <img
            src={item.imageUrl}
            alt={`${item.partNumber} - ${item.itemName}`}
            className="max-h-[460px] max-w-full object-contain rounded-lg shadow-md"
          />
        </div>

        {/* Footer info & actions */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 text-xs">
          <div className="text-slate-500">
            Supplier: <strong className="text-slate-700">{item.supplierName || 'Unassigned'}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Picture</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
