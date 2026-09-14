import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, PartCategory, computeReorderStatus } from '../types';
import { X, Check, AlertCircle, Trash2, UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';

interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id'>, id?: string) => void;
  initialItem?: InventoryItem | null;
  onDelete?: (id: string) => void;
  availableCategories?: string[];
}

const DEFAULT_PRESET_CATEGORIES: string[] = [
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

export const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  onDelete,
  availableCategories = DEFAULT_PRESET_CATEGORIES,
}) => {
  const [partNumber, setPartNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [category, setCategory] = useState<PartCategory>('Truck Parts');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [quantityInStock, setQuantityInStock] = useState<string>('');
  const [reorderLevel, setReorderLevel] = useState<string>('');
  const [lastRestockedDate, setLastRestockedDate] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [oemReference, setOemReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP, or SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) return;

      if (file.type === 'image/svg+xml') {
        setImageUrl(rawResult);
        return;
      }

      // Optimize/compress image to keep local storage compact
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setImageUrl(compressed);
        } else {
          setImageUrl(rawResult);
        }
      };
      img.onerror = () => {
        setImageUrl(rawResult);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (initialItem) {
      setPartNumber(initialItem.partNumber);
      setItemName(initialItem.itemName);
      setPartDescription(initialItem.partDescription || '');
      setCategory(initialItem.category);
      setImageUrl(initialItem.imageUrl || '');
      setSupplierName(initialItem.supplierName || '');
      setUnitPrice(initialItem.unitPrice.toString());
      setQuantityInStock(initialItem.quantityInStock.toString());
      setReorderLevel(initialItem.reorderLevel.toString());
      setLastRestockedDate(initialItem.lastRestockedDate);
      setCompatibility(initialItem.compatibility || '');
      setOemReference(initialItem.oemReference || '');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    } else {
      // Default new part setup
      const today = new Date().toISOString().split('T')[0];
      setPartNumber('');
      setItemName('');
      setPartDescription('');
      setCategory(availableCategories[0] || 'Truck Parts');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
      setImageUrl('http://example.com/images/part_number.jpg');
      setSupplierName('');
      setUnitPrice('');
      setQuantityInStock('10');
      setReorderLevel('15');
      setLastRestockedDate(today);
      setCompatibility('');
      setOemReference('');
    }
    setErrors({});
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const currentStock = Number(quantityInStock) || 0;
  const currentReorderLevel = Number(reorderLevel) || 0;
  const calculatedStatus = computeReorderStatus(currentStock, currentReorderLevel);

  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>();
    if (category) set.add(category);
    availableCategories.forEach((c) => set.add(c));
    DEFAULT_PRESET_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [availableCategories, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!partNumber.trim()) newErrors.partNumber = 'Part number is required';
    if (!itemName.trim()) newErrors.itemName = 'Item name is required';
    
    const priceNum = parseFloat(unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      newErrors.unitPrice = 'Enter a valid unit price';
    }

    const stockNum = parseInt(quantityInStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      newErrors.quantityInStock = 'Enter a valid stock quantity';
    }

    const reorderNum = parseInt(reorderLevel, 10);
    if (isNaN(reorderNum) || reorderNum < 0) {
      newErrors.reorderLevel = 'Enter a valid reorder level';
    }

    if (!lastRestockedDate) {
      newErrors.lastRestockedDate = 'Select last restocked date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const trimmedPartNumber = partNumber.trim().toUpperCase();
    const finalImageUrl =
      imageUrl.trim() || `http://example.com/images/${trimmedPartNumber}.jpg`;
    const resolvedCategory =
      isCustomCategory && customCategoryInput.trim()
        ? customCategoryInput.trim()
        : category || 'Universal & Workshop';

    onSave(
      {
        partNumber: trimmedPartNumber,
        itemName: itemName.trim(),
        partDescription: partDescription.trim(),
        category: resolvedCategory,
        imageUrl: finalImageUrl,
        supplierName: supplierName.trim() || 'Mashkay Verified Partner',
        unitPrice: priceNum,
        quantityInStock: stockNum,
        reorderLevel: reorderNum,
        lastRestockedDate,
        compatibility: compatibility.trim() || undefined,
        oemReference: oemReference.trim() || undefined,
      },
      initialItem?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        id="add-edit-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8"
      >
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {initialItem ? 'Edit Autopart Record' : 'Add New Inventory Part'}
            </h2>
            <p className="text-xs text-slate-400">
              Mashkay Autoparts Genuine Fleet Stock
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Part Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Part Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="modal-part-number"
                placeholder="e.g. MK-TRK-5540"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border font-mono ${
                  errors.partNumber ? 'border-red-500 focus:ring-red-400' : 'border-slate-300 focus:ring-amber-500'
                } focus:outline-hidden focus:ring-2`}
              />
              {errors.partNumber && (
                <p className="text-xs text-red-500 mt-1">{errors.partNumber}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Category <span className="text-red-500">*</span>
                </label>
                {!isCustomCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(true);
                      setCustomCategoryInput('');
                    }}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
                  >
                    + New Category
                  </button>
                )}
              </div>

              {!isCustomCategory ? (
                <select
                  id="modal-category"
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                      setCustomCategoryInput('');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Add Custom Category...</option>
                </select>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Brakes, Transmission, Filters..."
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-amber-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-amber-50/40"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCategoryInput.trim()) {
                          setCategory(customCategoryInput.trim());
                        }
                        setIsCustomCategory(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Category will be saved to this part and available across your catalog
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="modal-item-name"
              placeholder="e.g. Air Brake Relay Valve Single Circuit"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                errors.itemName ? 'border-red-500 focus:ring-red-400' : 'border-slate-300 focus:ring-amber-500'
              } focus:outline-hidden focus:ring-2`}
            />
            {errors.itemName && (
              <p className="text-xs text-red-500 mt-1">{errors.itemName}</p>
            )}
          </div>

          {/* PROMINENT PRICING & INVENTORY STOCK LEVELS */}
          <div className="bg-gradient-to-br from-amber-50/70 via-slate-50 to-amber-50/40 border-2 border-amber-300/80 rounded-xl p-4 shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-2xs">
                  $
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Pricing &amp; Inventory Quantities
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Set unit selling price and warehouse threshold limits
                  </p>
                </div>
              </div>
              
              {/* Live Inventory Valuation Subtotal */}
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Batch Valuation
                </span>
                <span className="text-xs font-mono font-bold text-amber-700">
                  ${((parseFloat(unitPrice) || 0) * (parseInt(quantityInStock) || 0)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Unit Price ($) */}
              <div className="bg-white p-2.5 rounded-lg border-2 border-amber-300 shadow-2xs">
                <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Unit Price ($)</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-amber-600 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="modal-unit-price"
                    placeholder="0.00"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className={`w-full pl-6 pr-2 py-1.5 text-sm font-mono font-bold rounded-md border ${
                      errors.unitPrice
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                    } focus:outline-hidden focus:ring-2 bg-white text-slate-900`}
                  />
                </div>
                {errors.unitPrice && (
                  <p className="text-xs text-red-500 mt-1">{errors.unitPrice}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Selling price per unit
                </p>
              </div>

              {/* 2. Quantity in Stock */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Quantity in Stock</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  id="modal-quantity"
                  placeholder="0"
                  value={quantityInStock}
                  onChange={(e) => setQuantityInStock(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm font-mono font-bold rounded-md border ${
                    errors.quantityInStock
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                  } focus:outline-hidden focus:ring-2 bg-white text-slate-900`}
                />
                {errors.quantityInStock && (
                  <p className="text-xs text-red-500 mt-1">{errors.quantityInStock}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Physical count in warehouse
                </p>
              </div>

              {/* 3. Reorder Level */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Reorder Level</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  id="modal-reorder-level"
                  placeholder="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm font-mono font-bold rounded-md border ${
                    errors.reorderLevel
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                  } focus:outline-hidden focus:ring-2 bg-white text-slate-900`}
                />
                {errors.reorderLevel && (
                  <p className="text-xs text-red-500 mt-1">{errors.reorderLevel}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Triggers reorder alert if below
                </p>
              </div>
            </div>

            {/* Live IF Formula Status Calculation Preview */}
            <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Live Status Evaluation (Excel IF Formula)
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  IF({currentStock} &lt; {currentReorderLevel}, "Reorder", "OK")
                </p>
              </div>
              <div>
                {calculatedStatus === 'Reorder' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Reorder Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    Stock OK
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Part Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Part Description
            </label>
            <textarea
              id="modal-part-description"
              rows={2}
              placeholder="Brief description of the part, specifications, and function..."
              value={partDescription}
              onChange={(e) => setPartDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
            />
          </div>

          {/* Supplier Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier Name
            </label>
            <input
              type="text"
              id="modal-supplier-name"
              placeholder="e.g. Wabco Commercial Systems"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Part Picture (Upload / Insert Picture) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Part Picture
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  processImageFile(file);
                }
              }}
            />

            {imageUrl ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-16 h-16 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300">
                  <img
                    src={imageUrl}
                    alt="Part preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800">Picture attached</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Ready to show in inventory table
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Change Picture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processImageFile(file);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-300 hover:border-amber-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-700 hover:underline">
                      Click to insert a picture
                    </span>
                    <span className="text-xs text-slate-500"> or drag and drop</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    PNG, JPG, WEBP, or SVG image of the truck, bus, or trailer part
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Last Restocked Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Restocked Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="modal-restocked-date"
                value={lastRestockedDate}
                onChange={(e) => setLastRestockedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {errors.lastRestockedDate && (
                <p className="text-xs text-red-500 mt-1">{errors.lastRestockedDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                OEM Reference / Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. OEM-WAB-925374"
                value={oemReference}
                onChange={(e) => setOemReference(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Compatibility notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vehicle Compatibility / Specifications (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Volvo FH16, Scania R-Series, Mercedes Actros"
              value={compatibility}
              onChange={(e) => setCompatibility(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
            {initialItem && onDelete ? (
              <button
                type="button"
                id="modal-delete-part-btn"
                onClick={() => {
                  onDelete(initialItem.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Part</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-part-submit-btn"
                className="px-5 py-2 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition-colors"
              >
                {initialItem ? 'Update Part' : 'Add to Inventory'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
