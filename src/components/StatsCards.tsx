import React from 'react';
import { InventoryItem, computeReorderStatus } from '../types';
import { Package, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';

interface StatsCardsProps {
  items: InventoryItem[];
  onFilterByStatus?: (status: 'ALL' | 'Reorder' | 'OK') => void;
  currentStatusFilter?: 'ALL' | 'Reorder' | 'OK';
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  items,
  onFilterByStatus,
  currentStatusFilter = 'ALL',
}) => {
  const totalSKUs = items.length;
  
  const reorderCount = items.filter(
    (item) => computeReorderStatus(item.quantityInStock, item.reorderLevel) === 'Reorder'
  ).length;

  const okCount = totalSKUs - reorderCount;

  const totalValuation = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantityInStock,
    0
  );

  const totalUnits = items.reduce(
    (sum, item) => sum + item.quantityInStock,
    0
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total SKUs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Parts Catalog
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalSKUs}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalUnits.toLocaleString()} physical units in warehouse
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
          <Package className="w-5 h-5" />
        </div>
      </div>

      {/* Reorder Needed */}
      <div 
        id="stat-reorder-card"
        onClick={() => onFilterByStatus?.(currentStatusFilter === 'Reorder' ? 'ALL' : 'Reorder')}
        className={`bg-white rounded-xl border p-4 shadow-sm flex items-start justify-between cursor-pointer transition-all ${
          currentStatusFilter === 'Reorder' 
            ? 'ring-2 ring-red-500 border-red-300' 
            : 'border-slate-200 hover:border-red-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reorder Alerts
            </p>
            {reorderCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700">
                Action Req.
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold mt-1 ${reorderCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {reorderCount}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Stock below minimum threshold
          </p>
        </div>
        <div className={`p-2.5 rounded-lg border ${
          reorderCount > 0 
            ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' 
            : 'bg-slate-50 text-slate-400 border-slate-100'
        }`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Stock Healthy */}
      <div 
        id="stat-ok-card"
        onClick={() => onFilterByStatus?.(currentStatusFilter === 'OK' ? 'ALL' : 'OK')}
        className={`bg-white rounded-xl border p-4 shadow-sm flex items-start justify-between cursor-pointer transition-all ${
          currentStatusFilter === 'OK' 
            ? 'ring-2 ring-emerald-500 border-emerald-300' 
            : 'border-slate-200 hover:border-emerald-200'
        }`}
      >
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Stock Optimal (OK)
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{okCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Above safety reorder level
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Inventory Valuation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Inventory Valuation
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Unit Price &times; Quantity in Stock
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
