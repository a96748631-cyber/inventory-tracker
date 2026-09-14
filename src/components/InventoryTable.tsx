import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, PartCategory, ReorderStatus, computeReorderStatus } from '../types';
import { ImageLightboxModal } from './ImageLightboxModal';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Truck,
  Bus,
  Container,
  Layers,
  Image as ImageIcon,
  Building2,
  ZoomIn,
  Camera,
  X,
  RotateCcw,
  Car,
  HardHat,
  Package,
  Wrench,
  Tag,
  Filter,
  ShoppingCart,
  Pencil,
  Check,
} from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateStock: (id: string, delta: number) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onDeleteBatch?: (items: InventoryItem[]) => void;
  onRestockClick: (item: InventoryItem) => void;
  onRecordSaleClick?: (item: InventoryItem) => void;
  statusFilter: 'ALL' | ReorderStatus;
  setStatusFilter: (status: 'ALL' | ReorderStatus) => void;
  resetKey?: number;
}

type SortField =
  | 'partNumber'
  | 'itemName'
  | 'partDescription'
  | 'category'
  | 'imageUrl'
  | 'supplierName'
  | 'unitPrice'
  | 'quantityInStock'
  | 'reorderLevel'
  | 'reorderStatus'
  | 'lastRestockedDate';

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onUpdateStock,
  onUpdatePrice,
  onEditItem,
  onDeleteItem,
  onDeleteBatch,
  onRestockClick,
  onRecordSaleClick,
  statusFilter,
  setStatusFilter,
  resetKey,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | string>('ALL');
  const [sortField, setSortField] = useState<SortField>('partNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewImageItem, setPreviewImageItem] = useState<InventoryItem | null>(null);

  // Quick inline price editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');

  const startEditingPrice = (item: InventoryItem) => {
    setEditingPriceId(item.id);
    setEditingPriceValue(item.unitPrice.toString());
  };

  const handleSaveInlinePrice = (id: string) => {
    const parsed = parseFloat(editingPriceValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdatePrice?.(id, parsed);
    }
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  const cancelInlinePrice = () => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  // Dynamic categories from all inventory items (including any imported from CSV) plus presets
  const availableCategories = useMemo(() => {
    const activeCats = new Set<string>();
    items.forEach((item) => {
      if (item.category && item.category.trim()) {
        activeCats.add(item.category.trim());
      }
    });

    const presets = [
      'Brakes & Friction',
      'Engine & Powertrain',
      'Suspension & Steering',
      'Electrical, Lighting & Starters',
      'Filters & Fluids',
      'Cooling & Air Conditioning',
      'Transmission & Clutch',
      'Exhaust & Turbochargers',
      'Hydraulics & Pneumatics',
      'Truck Parts',
      'Bus Parts',
      'Trailer Parts',
      'Passenger Car Parts',
      'Heavy Equipment Parts',
      'Van & Delivery Fleet',
      'Universal & Workshop',
    ];

    // Put categories that currently have parts in the catalog first (sorted by part count desc)
    const sortedActive = Array.from(activeCats).sort((a, b) => {
      const countA = items.filter((i) => i.category === a).length;
      const countB = items.filter((i) => i.category === b).length;
      return countB - countA;
    });

    const inactivePresets = presets.filter((p) => !activeCats.has(p)).sort();

    return [...sortedActive, ...inactivePresets];
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const cat = item.category || 'Universal & Workshop';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [items]);

  // When resetKey changes (e.g. from clicking Reset 3 Sample Rows), clear all search and filter states
  useEffect(() => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setSelectedIds(new Set());
    setPreviewImageItem(null);
  }, [resetKey]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search filter
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          item.partNumber.toLowerCase().includes(query) ||
          item.itemName.toLowerCase().includes(query) ||
          (item.partDescription && item.partDescription.toLowerCase().includes(query)) ||
          (item.supplierName && item.supplierName.toLowerCase().includes(query)) ||
          (item.imageUrl && item.imageUrl.toLowerCase().includes(query)) ||
          (item.compatibility && item.compatibility.toLowerCase().includes(query)) ||
          (item.oemReference && item.oemReference.toLowerCase().includes(query));

        // Category filter
        const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

        // Status filter (computed live using the IF formula: Stock < ReorderLevel)
        const currentStatus = computeReorderStatus(item.quantityInStock, item.reorderLevel);
        const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

        return matchesQuery && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let compareA: any;
        let compareB: any;

        switch (sortField) {
          case 'partNumber':
            compareA = a.partNumber.toLowerCase();
            compareB = b.partNumber.toLowerCase();
            break;
          case 'itemName':
            compareA = a.itemName.toLowerCase();
            compareB = b.itemName.toLowerCase();
            break;
          case 'partDescription':
            compareA = (a.partDescription || '').toLowerCase();
            compareB = (b.partDescription || '').toLowerCase();
            break;
          case 'category':
            compareA = a.category;
            compareB = b.category;
            break;
          case 'imageUrl':
            compareA = (a.imageUrl || '').toLowerCase();
            compareB = (b.imageUrl || '').toLowerCase();
            break;
          case 'supplierName':
            compareA = (a.supplierName || '').toLowerCase();
            compareB = (b.supplierName || '').toLowerCase();
            break;
          case 'unitPrice':
            compareA = a.unitPrice;
            compareB = b.unitPrice;
            break;
          case 'quantityInStock':
            compareA = a.quantityInStock;
            compareB = b.quantityInStock;
            break;
          case 'reorderLevel':
            compareA = a.reorderLevel;
            compareB = b.reorderLevel;
            break;
          case 'reorderStatus':
            compareA = computeReorderStatus(a.quantityInStock, a.reorderLevel);
            compareB = computeReorderStatus(b.quantityInStock, b.reorderLevel);
            break;
          case 'lastRestockedDate':
            compareA = a.lastRestockedDate;
            compareB = b.lastRestockedDate;
            break;
          default:
            return 0;
        }

        if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [items, searchQuery, categoryFilter, statusFilter, sortField, sortDirection]);

  const getCategoryIcon = (category: string) => {
    const clean = (category || '').toLowerCase();
    if (clean.includes('truck') || clean.includes('semi') || clean.includes('lorry')) {
      return <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
    if (clean.includes('bus') || clean.includes('coach')) {
      return <Bus className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
    if (clean.includes('trailer') || clean.includes('semi-trailer')) {
      return <Container className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    }
    if (clean.includes('car') || clean.includes('auto') || clean.includes('sedan') || clean.includes('suv')) {
      return <Car className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    }
    if (clean.includes('heavy') || clean.includes('equipment') || clean.includes('excavator') || clean.includes('plant')) {
      return <HardHat className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
    }
    if (clean.includes('van') || clean.includes('fleet') || clean.includes('delivery')) {
      return <Package className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
    }
    if (clean.includes('brake') || clean.includes('workshop') || clean.includes('tool') || clean.includes('hardware')) {
      return <Wrench className="w-3.5 h-3.5 text-yellow-600 shrink-0" />;
    }
    if (clean.includes('engine') || clean.includes('filter') || clean.includes('suspension')) {
      return <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    }
    return <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-amber-500" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-500" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            id="table-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search part #, name, description, supplier..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Group (Supports All CSV and Custom Categories) */}
          <div className="flex flex-wrap items-center rounded-xl bg-white border border-slate-200 p-1 shadow-2xs text-xs gap-1">
            {/* All Categories Dropdown */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-slate-200">
              <Filter className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <select
                id="table-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 text-xs py-1 focus:outline-hidden cursor-pointer max-w-[150px] sm:max-w-[180px] truncate"
                title="Filter by any category from your inventory catalog or CSV"
              >
                <option value="ALL">All Categories ({items.length})</option>
                {availableCategories.map((cat) => {
                  const count = categoryCounts[cat] || 0;
                  return (
                    <option key={cat} value={cat}>
                      {cat} {count > 0 ? `(${count})` : '(0)'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Quick Filter Pill: All */}
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All
            </button>

            {/* Quick Filter Pills for Top/Active Categories (including CSV categories) */}
            {availableCategories
              .filter((cat) => (categoryCounts[cat] || 0) > 0 || cat === categoryFilter)
              .slice(0, 6)
              .map((cat) => {
                const isSelected = categoryFilter === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(isSelected ? 'ALL' : cat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {getCategoryIcon(cat)}
                    <span className="truncate max-w-[110px]">{cat}</span>
                    <span
                      className={`text-[10px] px-1 rounded-full font-mono ${
                        isSelected ? 'bg-amber-600 text-slate-950 font-extrabold' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

            {/* If user selected a category not in the top 6, render its active pill */}
            {categoryFilter !== 'ALL' &&
              !availableCategories
                .filter((cat) => (categoryCounts[cat] || 0) > 0 || cat === categoryFilter)
                .slice(0, 6)
                .includes(categoryFilter) && (
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap bg-amber-500 text-slate-950 shadow-2xs cursor-pointer"
                >
                  {getCategoryIcon(categoryFilter)}
                  <span className="truncate max-w-[120px]">{categoryFilter}</span>
                  <span className="text-[10px] px-1 rounded-full bg-amber-600 text-slate-950 font-mono">
                    {categoryCounts[categoryFilter] || 0}
                  </span>
                  <X className="w-3 h-3 ml-0.5" />
                </button>
              )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-xl bg-white border border-slate-200 p-1 shadow-2xs text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter('Reorder')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === 'Reorder'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Reorder
            </button>
            <button
              onClick={() => setStatusFilter('OK')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === 'OK'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              OK
            </button>
          </div>

          {/* Clear Filters Button (shown whenever any filter/search is active) */}
          {(searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              title="Clear all active filters & search query"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Actions Bar (visible when 1+ rows selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px]">
              {selectedIds.size}
            </span>
            <span className="font-semibold text-slate-800">
              {selectedIds.size === 1 ? '1 autopart selected' : `${selectedIds.size} autoparts selected`}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-500 hover:text-slate-800 underline ml-2 cursor-pointer"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="batch-delete-btn"
              onClick={() => {
                const selectedItems = items.filter((i) => selectedIds.has(i.id));
                if (onDeleteBatch && selectedItems.length > 0) {
                  onDeleteBatch(selectedItems);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold uppercase text-[11px] tracking-wider whitespace-nowrap">
              {/* Select All Checkbox */}
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  aria-label="Select all visible parts"
                  checked={
                    filteredAndSortedItems.length > 0 &&
                    filteredAndSortedItems.every((item) => selectedIds.has(item.id))
                  }
                  onChange={() => {
                    const allVisibleSelected =
                      filteredAndSortedItems.length > 0 &&
                      filteredAndSortedItems.every((item) => selectedIds.has(item.id));
                    if (allVisibleSelected) {
                      setSelectedIds(new Set());
                    } else {
                      const next = new Set(selectedIds);
                      filteredAndSortedItems.forEach((item) => next.add(item.id));
                      setSelectedIds(next);
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
              </th>

              {/* 1. Part Number */}
              <th
                onClick={() => handleSort('partNumber')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Part Number</span>
                  {renderSortIndicator('partNumber')}
                </div>
              </th>

              {/* 2. Item Name */}
              <th
                onClick={() => handleSort('itemName')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors min-w-[200px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Item Name</span>
                  {renderSortIndicator('itemName')}
                </div>
              </th>

              {/* 3. Part Description (placed between Item Name and Category) */}
              <th
                onClick={() => handleSort('partDescription')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors min-w-[240px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Part Description</span>
                  {renderSortIndicator('partDescription')}
                </div>
              </th>

              {/* 4. Category */}
              <th
                onClick={() => handleSort('category')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {renderSortIndicator('category')}
                </div>
              </th>

              {/* 5. Part Picture */}
              <th
                onClick={() => handleSort('imageUrl')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors min-w-[100px]"
              >
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Picture</span>
                  {renderSortIndicator('imageUrl')}
                </div>
              </th>

              {/* 6. Supplier Name */}
              <th
                onClick={() => handleSort('supplierName')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors min-w-[160px]"
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Supplier Name</span>
                  {renderSortIndicator('supplierName')}
                </div>
              </th>

              {/* 7. Unit Price */}
              <th
                onClick={() => handleSort('unitPrice')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors text-right"
                title="Click column to sort. Click any unit price in the table to edit directly."
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-slate-900">Unit Price ($)</span>
                  <span className="text-[10px] text-amber-600 font-normal hidden xl:inline group-hover:underline">
                    (click to edit)
                  </span>
                  {renderSortIndicator('unitPrice')}
                </div>
              </th>

              {/* 8. Quantity in Stock */}
              <th
                onClick={() => handleSort('quantityInStock')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Quantity in Stock</span>
                  {renderSortIndicator('quantityInStock')}
                </div>
              </th>

              {/* 9. Reorder Level */}
              <th
                onClick={() => handleSort('reorderLevel')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Reorder Level</span>
                  {renderSortIndicator('reorderLevel')}
                </div>
              </th>

              {/* 10. Reorder Status (IF formula column) */}
              <th
                onClick={() => handleSort('reorderStatus')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors text-center"
                title="=IF(Quantity in Stock < Reorder Level, 'Reorder', 'OK')"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-amber-700">Reorder Status</span>
                  <span className="text-[9px] font-mono lowercase text-slate-500 bg-slate-200 px-1 rounded">fx</span>
                  {renderSortIndicator('reorderStatus')}
                </div>
              </th>

              {/* 11. Last Restocked Date */}
              <th
                onClick={() => handleSort('lastRestockedDate')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 select-none group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Last Restocked Date</span>
                  {renderSortIndicator('lastRestockedDate')}
                </div>
              </th>

              {/* 12. Actions */}
              <th className="py-3 px-3 text-right">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto px-4">
                    <Layers className="w-9 h-9 text-slate-300" />
                    {items.length === 0 ? (
                      <>
                        <p className="font-semibold text-slate-800 text-sm">Inventory catalog is currently empty</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          All parts have been cleared. Click <strong className="text-slate-700">Add New Part</strong> above to add inventory, or click <strong className="text-slate-700">Reset 3 Sample Rows</strong> in the header to load standard fleet parts.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-800 text-sm">No autoparts found matching your search or filters</p>
                        <p className="text-xs text-slate-500">
                          {searchQuery && `Search query: "${searchQuery}". `}
                          {categoryFilter !== 'ALL' && `Type: ${categoryFilter}. `}
                          {statusFilter !== 'ALL' && `Status: ${statusFilter}.`}
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setCategoryFilter('ALL');
                            setStatusFilter('ALL');
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear All Filters &amp; Search</span>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item, index) => {
                const status = computeReorderStatus(item.quantityInStock, item.reorderLevel);
                const isReorder = status === 'Reorder';
                const deficit = item.reorderLevel - item.quantityInStock;
                const isSelected = selectedIds.has(item.id);

                return (
                  <tr
                    key={item.id}
                    id={`inventory-row-${item.id}`}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isSelected
                        ? 'bg-amber-50/50'
                        : isReorder
                        ? 'bg-red-50/25'
                        : index % 2 === 1
                        ? 'bg-slate-50/40'
                        : 'bg-white'
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.partNumber}`}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) {
                              next.delete(item.id);
                            } else {
                              next.add(item.id);
                            }
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>

                    {/* 1. Part Number */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800">{item.partNumber}</span>
                        {item.oemReference && (
                          <span
                            className="text-[10px] text-slate-400 hover:text-slate-600 cursor-help"
                            title={`OEM Reference: ${item.oemReference}`}
                          >
                            &bull;
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Item Name */}
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div className="min-w-[180px]">
                        <p className="text-slate-900 font-semibold leading-snug">{item.itemName}</p>
                        {item.compatibility && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            Fits: {item.compatibility}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* 3. Part Description (New Column between Item Name and Category) */}
                    <td className="py-3 px-3 text-slate-600">
                      <div className="min-w-[220px] max-w-[320px]">
                        <p
                          className="text-xs text-slate-600 leading-relaxed line-clamp-2"
                          title={item.partDescription}
                        >
                          {item.partDescription || 'No description provided.'}
                        </p>
                      </div>
                    </td>

                    {/* 4. Category */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </span>
                    </td>

                    {/* 5. Part Picture */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {item.imageUrl ? (
                        <div
                          onClick={() => setPreviewImageItem(item)}
                          className="group relative w-12 h-12 rounded-lg bg-slate-900 border border-slate-200 shadow-2xs overflow-hidden cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all flex items-center justify-center"
                          title="Click to view full picture"
                        >
                          <img
                            src={item.imageUrl}
                            alt={`${item.partNumber} picture`}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-4 h-4 text-white drop-shadow-sm" />
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => onEditItem(item)}
                          title="Insert picture for this part"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                          <span>+ Picture</span>
                        </button>
                      )}
                    </td>

                    {/* 6. Supplier Name (New Column) */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700">
                          {item.supplierName || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* 7. Unit Price (with inline editing!) */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {editingPriceId === item.id ? (
                        <div
                          className="inline-flex items-center justify-end gap-1 bg-amber-50/90 p-1 rounded-lg border border-amber-300 shadow-2xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-amber-700 font-mono font-bold text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlinePrice(item.id);
                              if (e.key === 'Escape') cancelInlinePrice();
                            }}
                            className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold border border-amber-400 rounded bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlinePrice(item.id)}
                            title="Save price (Enter)"
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlinePrice}
                            title="Cancel (Esc)"
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingPrice(item)}
                          title="Click to edit unit selling price"
                          className="inline-flex items-center justify-end gap-1.5 px-2 py-1 -mr-1.5 rounded-md hover:bg-amber-100/70 text-slate-900 hover:text-amber-950 border border-transparent hover:border-amber-300/80 transition-all cursor-pointer group/price font-mono font-semibold text-xs sm:text-sm"
                        >
                          <span>${item.unitPrice.toFixed(2)}</span>
                          <Pencil className="w-3 h-3 text-slate-400 group-hover/price:text-amber-600 opacity-40 group-hover/price:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>

                    {/* 8. Quantity in Stock (with interactive stepper) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                          onClick={() => onUpdateStock(item.id, -1)}
                          disabled={item.quantityInStock <= 0}
                          title="Reduce stock by 1"
                          className="p-1 rounded text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          className={`font-mono font-bold text-xs min-w-[32px] text-center px-1 ${
                            isReorder ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {item.quantityInStock}
                        </span>
                        <button
                          onClick={() => onUpdateStock(item.id, 1)}
                          title="Increase stock by 1"
                          className="p-1 rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* 9. Reorder Level */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-600 whitespace-nowrap">
                      {item.reorderLevel}
                    </td>

                    {/* 10. Reorder Status (Dynamic IF formula result) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isReorder ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 shadow-2xs animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Reorder</span>
                          </span>
                          <span className="text-[10px] text-red-600 font-medium mt-0.5">
                            (-{deficit} below min)
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>OK</span>
                        </span>
                      )}
                    </td>

                    {/* 11. Last Restocked Date */}
                    <td className="py-3 px-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {item.lastRestockedDate}
                    </td>

                    {/* 12. Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => onRecordSaleClick?.(item)}
                          title="Record sale & deduct stock for this part"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span className="hidden xl:inline">Sell</span>
                        </button>
                        {isReorder && (
                          <button
                            onClick={() => onRestockClick(item)}
                            title="Restock shipment"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Restock</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEditItem(item)}
                          title="Edit autopart"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item)}
                          title="Delete part from table"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong>{filteredAndSortedItems.length}</strong> of <strong>{items.length}</strong> parts in catalog
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="font-mono text-[11px] text-slate-600">
            Formula: IF(Stock &lt; ReorderLevel, "Reorder", "OK")
          </span>
        </div>
        <div className="text-slate-500">
          Mashkay Autoparts &bull; Genuine Truck, Bus &amp; Trailer Parts Tracking System
        </div>
      </div>

      {/* Picture Lightbox Modal */}
      <ImageLightboxModal
        item={previewImageItem}
        onClose={() => setPreviewImageItem(null)}
      />
    </div>
  );
};
