import React, { useState, useEffect } from 'react';
import { InventoryItem, SaleRecord } from '../types';
import { ShoppingCart, DollarSign, X, Check, AlertCircle, ArrowRight, Package } from 'lucide-react';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  preselectedItem?: InventoryItem | null;
  onRecordSale: (sale: Omit<SaleRecord, 'id'>, partId: string, newStock: number) => Promise<void>;
}

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  isOpen,
  onClose,
  items,
  preselectedItem,
  onRecordSale,
}) => {
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [quantitySold, setQuantitySold] = useState<string>('1');
  const [salePrice, setSalePrice] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedItem) {
        setSelectedPartId(preselectedItem.id);
        setSalePrice(preselectedItem.unitPrice.toFixed(2));
      } else if (items.length > 0) {
        setSelectedPartId(items[0].id);
        setSalePrice(items[0].unitPrice.toFixed(2));
      }
      setQuantitySold('1');
      setReceiptNumber(`REC-${Date.now().toString().slice(-5)}`);
      setCustomerName('');
      setNotes('');
      setErrorMessage(null);
    }
  }, [isOpen, preselectedItem, items]);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === selectedPartId);

  const handlePartChange = (id: string) => {
    setSelectedPartId(id);
    const item = items.find((i) => i.id === id);
    if (item) {
      setSalePrice(item.unitPrice.toFixed(2));
    }
  };

  const qty = Math.max(1, parseInt(quantitySold, 10) || 1);
  const price = Math.max(0, parseFloat(salePrice) || 0);
  const totalAmount = qty * price;
  const currentStock = currentItem ? currentItem.quantityInStock : 0;
  const stockAfter = Math.max(0, currentStock - qty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) {
      setErrorMessage('Please select a valid autopart.');
      return;
    }

    if (qty <= 0) {
      setErrorMessage('Quantity sold must be at least 1.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const today = new Date().toISOString();

    const saleData: Omit<SaleRecord, 'id'> = {
      partNumber: currentItem.partNumber,
      itemName: currentItem.itemName,
      category: currentItem.category,
      quantitySold: qty,
      salePrice: price,
      totalAmount,
      saleDate: today,
      receiptNumber: receiptNumber.trim() || undefined,
      customerName: customerName.trim() || undefined,
      notes: notes.trim() || undefined,
      stockBefore: currentStock,
      stockAfter,
    };

    try {
      await onRecordSale(saleData, currentItem.id, stockAfter);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record sale.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Sale &amp; Adjust Stock</h2>
              <p className="text-xs text-slate-400">
                Instantly deducts warehouse quantity &amp; updates sales report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Part Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Autopart Sold <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPartId}
              onChange={(e) => handlePartChange(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.partNumber} - {item.itemName} (In Stock: {item.quantityInStock} &bull; ${item.unitPrice.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock vs New Stock Preview */}
          {currentItem && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 font-medium">Stock Adjustment:</span>
              </div>
              <div className="flex items-center gap-2 font-mono font-bold">
                <span className="text-slate-600">{currentStock}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className={stockAfter <= currentItem.reorderLevel ? 'text-amber-600' : 'text-emerald-600'}>
                  {stockAfter} on hand
                </span>
                {stockAfter <= currentItem.reorderLevel && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-sans font-semibold">
                    Reorder Triggered
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Qty and Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Sold <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={currentStock > 0 ? currentStock : undefined}
                value={quantitySold}
                onChange={(e) => setQuantitySold(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sale Price Per Unit ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Total Sale Value Callout */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950">Total Sale Amount:</span>
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              ${totalAmount.toFixed(2)}
            </span>
          </div>

          {/* Receipt / Invoice & Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt / Invoice #
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="REC-1002"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Fleet Account
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in / Apex Transport"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !currentItem}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Recording...' : 'Record Sale & Deduct Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
