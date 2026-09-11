import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X, Truck, ArrowRight } from 'lucide-react';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onRestock: (itemId: string, addedQuantity: number, restockDate: string) => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  onClose,
  item,
  onRestock,
}) => {
  const [addedQuantity, setAddedQuantity] = useState<string>('20');
  const [restockDate, setRestockDate] = useState<string>('');

  useEffect(() => {
    if (item) {
      // Calculate suggested restock: enough to exceed reorderLevel comfortably
      const deficit = Math.max(0, item.reorderLevel - item.quantityInStock);
      const suggested = deficit > 0 ? deficit + 15 : 20;
      setAddedQuantity(suggested.toString());
      setRestockDate(new Date().toISOString().split('T')[0]);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const qty = parseInt(addedQuantity, 10) || 0;
  const newStock = item.quantityInStock + qty;
  const newStatus = newStock < item.reorderLevel ? 'Reorder' : 'OK';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) return;
    onRestock(item.id, qty, restockDate || new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Restock Part Shipment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono font-bold text-slate-800">
                {item.partNumber}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                {item.category}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">
              {item.itemName}
            </p>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
              <span>Current Stock: <strong>{item.quantityInStock}</strong></span>
              <span>Reorder Level: <strong>{item.reorderLevel}</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity to Receive / Add to Stock
            </label>
            <input
              type="number"
              min="1"
              id="restock-qty-input"
              value={addedQuantity}
              onChange={(e) => setAddedQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-semibold"
            />
          </div>

          {/* New Stock Preview */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-600 block">Stock After Restock:</span>
              <span className="text-slate-900 font-bold text-base flex items-center gap-1.5 mt-0.5">
                {item.quantityInStock} <ArrowRight className="w-3.5 h-3.5 text-blue-500" /> {newStock} units
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-600 block">New Status:</span>
              <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded text-xs font-bold ${
                newStatus === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {newStatus}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Delivery / Restock Date
            </label>
            <input
              type="date"
              id="restock-date-input"
              value={restockDate}
              onChange={(e) => setRestockDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-xs transition-colors"
            >
              Confirm Restock (+{qty} units)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
