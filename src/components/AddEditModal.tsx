import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, PartCategory, computeReorderStatus } from '../types';
import { X, Check, AlertCircle, Trash2, UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';

interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id'>, id?: string) => void;
  initialItem?: InventoryItem | null;
  onDelete?: (id: string) => void;
}

export const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  onDelete,
}) => {
  const [partNumber, setPartNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [category, setCategory] = useState<PartCategory>('Truck Parts');
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
    } else {
      // Default new part setup
      const today = new Date().toISOString().split('T')[0];
      setPartNumber('');
      setItemName('');
      setPartDescription('');
      setCategory('Truck Parts');
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

    onSave(
      {
        partNumber: trimmedPartNumber,
        itemName: itemName.trim(),
        partDescription: partDescription.trim(),
        category,
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PartCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="Truck Parts">Truck Parts</option>
                <option value="Bus Parts">Bus Parts</option>
                <option value="Trailer Parts">Trailer Parts</option>
              </select>
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

          {/* Price & Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Price ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="modal-unit-price"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {errors.unitPrice && (
                <p className="text-xs text-red-500 mt-1">{errors.unitPrice}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity in Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                id="modal-quantity"
                value={quantityInStock}
                onChange={(e) => setQuantityInStock(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {errors.quantityInStock && (
                <p className="text-xs text-red-500 mt-1">{errors.quantityInStock}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reorder Level <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                id="modal-reorder-level"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {errors.reorderLevel && (
                <p className="text-xs text-red-500 mt-1">{errors.reorderLevel}</p>
              )}
            </div>
          </div>

          {/* Live IF Formula Status Calculation Preview */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">
                  Calculated Reorder Status (Formula Result)
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  IF({currentStock} &lt; {currentReorderLevel}, "Reorder", "OK")
                </p>
              </div>
              <div>
                {calculatedStatus === 'Reorder' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Reorder
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    OK
                  </span>
                )}
              </div>
            </div>
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
