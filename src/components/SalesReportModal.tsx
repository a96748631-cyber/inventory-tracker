import React, { useState, useMemo } from 'react';
import { SaleRecord, SalesDateRange, InventoryItem } from '../types';
import {
  X,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Filter,
  Search,
  Download,
  Printer,
  Plus,
  ShoppingCart,
  Upload,
  RotateCcw,
  Tag,
  ArrowUpRight,
  Receipt,
  FileText,
} from 'lucide-react';

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleRecord[];
  items: InventoryItem[];
  onOpenRecordSale: () => void;
  onOpenImportSales: () => void;
  onDeleteSale: (saleId: string, partNumber: string, quantityToRestore: number) => Promise<void>;
}

export const SalesReportModal: React.FC<SalesReportModalProps> = ({
  isOpen,
  onClose,
  sales,
  items,
  onOpenRecordSale,
  onOpenImportSales,
  onDeleteSale,
}) => {
  const [dateRange, setDateRange] = useState<SalesDateRange>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [revertingId, setRevertingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract unique categories from sales
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [sales]);

  // Filter sales by date, category, and search query
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter((sale) => {
      // 1. Date Range
      if (dateRange !== 'all') {
        const saleTime = new Date(sale.saleDate).getTime();
        if (dateRange === 'today') {
          if (!sale.saleDate.startsWith(todayStr)) return false;
        } else if (dateRange === '7days') {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (saleTime < sevenDaysAgo) return false;
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (saleTime < thirtyDaysAgo) return false;
        } else if (dateRange === 'thisMonth') {
          const saleDateObj = new Date(sale.saleDate);
          if (
            saleDateObj.getFullYear() !== now.getFullYear() ||
            saleDateObj.getMonth() !== now.getMonth()
          ) {
            return false;
          }
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        if (sale.category !== selectedCategory) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPart = sale.partNumber.toLowerCase().includes(q);
        const matchName = sale.itemName.toLowerCase().includes(q);
        const matchReceipt = sale.receiptNumber?.toLowerCase().includes(q);
        const matchCustomer = sale.customerName?.toLowerCase().includes(q);
        if (!matchPart && !matchName && !matchReceipt && !matchCustomer) return false;
      }

      return true;
    });
  }, [sales, dateRange, selectedCategory, searchQuery]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [filteredSales]);

  const totalUnitsSold = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.quantitySold, 0);
  }, [filteredSales]);

  const totalTransactions = filteredSales.length;

  const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Top 5 selling parts
  const topParts = useMemo(() => {
    const partMap = new Map<
      string,
      { partNumber: string; itemName: string; units: number; revenue: number }
    >();

    filteredSales.forEach((s) => {
      const existing = partMap.get(s.partNumber) || {
        partNumber: s.partNumber,
        itemName: s.itemName,
        units: 0,
        revenue: 0,
      };
      existing.units += s.quantitySold;
      existing.revenue += s.totalAmount;
      partMap.set(s.partNumber, existing);
    });

    return Array.from(partMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, { units: number; revenue: number }>();
    filteredSales.forEach((s) => {
      const cat = s.category || 'General';
      const existing = catMap.get(cat) || { units: 0, revenue: 0 };
      existing.units += s.quantitySold;
      existing.revenue += s.totalAmount;
      catMap.set(cat, existing);
    });
    return Array.from(catMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [filteredSales]);

  // Export Sales Report to CSV
  const handleExportReportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'Sale Date',
      'Receipt / Invoice #',
      'Part Number',
      'Item Name',
      'Category',
      'Quantity Sold',
      'Unit Sale Price ($)',
      'Total Amount ($)',
      'Customer',
      'Stock Before',
      'Stock After',
    ];

    const rows = filteredSales.map((s) => [
      `"${s.saleDate}"`,
      `"${s.receiptNumber || ''}"`,
      `"${s.partNumber}"`,
      `"${s.itemName.replace(/"/g, '""')}"`,
      `"${s.category || ''}"`,
      s.quantitySold,
      s.salePrice.toFixed(2),
      s.totalAmount.toFixed(2),
      `"${s.customerName || ''}"`,
      s.stockBefore ?? '',
      s.stockAfter ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Mashkay_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVoidSale = async (sale: SaleRecord) => {
    if (
      !window.confirm(
        `Void sale for "${sale.partNumber}" (${sale.quantitySold} units)? This will restore ${sale.quantitySold} units back to your inventory stock.`
      )
    ) {
      return;
    }

    setRevertingId(sale.id);
    try {
      await onDeleteSale(sale.id, sale.partNumber, sale.quantitySold);
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden my-4 max-h-[95vh] flex flex-col animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Commercial Fleet Sales Report</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {filteredSales.length} Transactions
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Point-of-sale receipts, stock corrections, and warehouse inventory deductions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenRecordSale();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Sale</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenImportSales();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import POS Sales</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3">
          {/* Date range pills */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: '7days', label: 'Last 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: '30days', label: '30 Days' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateRange(tab.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Category Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search part #, name, receipt..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {availableCategories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium outline-none"
              >
                <option value="ALL">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Export and Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReportCSV}
              disabled={filteredSales.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">Total Sales Revenue</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-900 font-mono mt-1">
                ${totalRevenue.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                From {totalTransactions} recorded sales
              </p>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800">Units Deducted &amp; Sold</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-900 font-mono mt-1">
                {totalUnitsSold}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">Parts shipped out of stock</p>
            </div>

            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800">Transactions Logged</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-900 font-mono mt-1">
                {totalTransactions}
              </p>
              <p className="text-[11px] text-purple-700 mt-0.5">Invoices &amp; counter receipts</p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">Avg Transaction Value</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-900 font-mono mt-1">
                ${averageTransactionValue.toFixed(2)}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">Average revenue per sale</p>
            </div>
          </div>

          {/* Analytics Rows: Top Selling Parts & Category Breakdown */}
          {filteredSales.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Selling Parts */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Top 5 Best-Selling Parts
                  </h3>
                  <span className="text-[11px] text-slate-500">By Revenue</span>
                </div>
                <div className="space-y-2">
                  {topParts.map((tp, idx) => (
                    <div
                      key={tp.partNumber}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-mono font-bold text-slate-900 truncate">
                            {tp.partNumber}
                          </p>
                          <p className="text-slate-500 text-[11px] truncate">{tp.itemName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-emerald-700">
                          ${tp.revenue.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400">{tp.units} units sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Sales Breakdown By Category
                  </h3>
                  <span className="text-[11px] text-slate-500">{categoryBreakdown.length} Categories</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {categoryBreakdown.map(([cat, stats]) => {
                    const percent =
                      totalRevenue > 0 ? ((stats.revenue / totalRevenue) * 100).toFixed(0) : '0';
                    return (
                      <div
                        key={cat}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{cat}</span>
                          <span className="font-mono font-bold text-slate-900">
                            ${stats.revenue.toFixed(2)} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {stats.units} units sold
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sales Transactions Ledger Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Sales Transaction Ledger
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {filteredSales.length} records shown
              </span>
            </div>

            {filteredSales.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Sales Recorded Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Import your QuickBooks sales receipts or record counter sales to view revenue reports and automatic stock deductions.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenRecordSale();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record First Sale</span>
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenImportSales();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import POS Sales File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 text-slate-700 border-b border-slate-200 font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Receipt / Ref</th>
                      <th className="py-2.5 px-3">Part #</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Qty Sold</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total ($)</th>
                      <th className="py-2.5 px-3 text-center">Stock Change</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {sale.saleDate.split('T')[0]}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 font-semibold whitespace-nowrap">
                          {sale.receiptNumber || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {sale.partNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs truncate">
                          {sale.itemName}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                            {sale.category || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900">
                          {sale.quantitySold}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          ${sale.salePrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-700">
                          ${sale.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {sale.stockBefore !== undefined && sale.stockAfter !== undefined ? (
                            <span className="font-mono text-[11px] text-slate-600">
                              {sale.stockBefore} &rarr; <strong className="text-slate-900">{sale.stockAfter}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleVoidSale(sale)}
                            disabled={revertingId === sale.id}
                            title="Void sale and restore quantity to inventory stock"
                            className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Void</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="text-xs text-slate-500">
            Total of ${totalRevenue.toFixed(2)} in sales across {totalUnitsSold} parts deducted from catalog
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
