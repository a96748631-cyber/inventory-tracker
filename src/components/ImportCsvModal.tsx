import React, { useState, useRef, useMemo, useEffect } from 'react';
import { InventoryItem } from '../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  RefreshCw,
  ArrowRight,
  Sliders,
  Tag,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedItems: InventoryItem[], replaceAll: boolean) => Promise<void>;
  existingPartNumbers: string[];
}

const COMMON_AUTO_PRESETS = [
  'Truck Parts',
  'Bus Parts',
  'Trailer Parts',
  'Passenger Car Parts',
  'Heavy Equipment Parts',
  'Van & Delivery Fleet',
  'Brakes & Friction',
  'Engine & Powertrain',
  'Suspension & Steering',
  'Electrical, Lighting & Starters',
  'Filters & Fluids',
  'Cooling & Air Conditioning',
  'Transmission & Clutch',
  'Exhaust & Turbochargers',
  'Hydraulics & Pneumatics',
  'Universal & Workshop',
];

// Robust CSV Line Parser handling quoted commas and escapes
function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function cleanCategoryString(val: string, fallback: string = 'Commercial Auto Parts'): string {
  if (!val || !val.trim()) return fallback;
  const clean = val.trim();
  // Capitalize nicely if all lowercase
  if (clean === clean.toLowerCase() && clean.length > 1) {
    return clean.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return clean;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingPartNumbers,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw parsed tabular state
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [delimiterUsed, setDelimiterUsed] = useState<string>(',');

  // Column Mappings (by column index, -1 means not mapped / use fallback)
  const [colPartNumber, setColPartNumber] = useState<number>(-1);
  const [colItemName, setColItemName] = useState<number>(-1);
  const [colCategory, setColCategory] = useState<number>(-1);
  const [colUnitPrice, setColUnitPrice] = useState<number>(-1);
  const [colQuantity, setColQuantity] = useState<number>(-1);
  const [colSupplier, setColSupplier] = useState<number>(-1);
  const [colDescription, setColDescription] = useState<number>(-1);
  const [colReorder, setColReorder] = useState<number>(-1);
  const [fallbackCategory, setFallbackCategory] = useState<string>('Universal & Workshop');
  const [isCustomCategoryOverride, setIsCustomCategoryOverride] = useState<boolean>(false);
  const [showColumnMapper, setShowColumnMapper] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleRawTextUpdate = (content: string) => {
    setErrorMessage(null);
    if (!content.trim()) {
      setRawHeaders([]);
      setRawRows([]);
      return;
    }

    // Determine delimiter
    const firstLine = content.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
    let delimiter = ',';
    if (firstLine.includes('\t') && firstLine.split('\t').length > firstLine.split(',').length) {
      delimiter = '\t';
    } else if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
      delimiter = ';';
    }
    setDelimiterUsed(delimiter);

    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setErrorMessage('The CSV must contain at least a header row and one row of data.');
      setRawHeaders([]);
      setRawRows([]);
      return;
    }

    const headers = parseCsvLine(lines[0], delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());
    setRawHeaders(headers);

    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const rowCols = parseCsvLine(lines[i], delimiter);
      if (rowCols.length > 0 && rowCols.some((c) => c.trim().length > 0)) {
        rows.push(rowCols);
      }
    }
    setRawRows(rows);

    // Auto-detect columns based on common names
    const findIndex = (aliases: string[]) => {
      const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      return lower.findIndex((h) => aliases.some((alias) => h === alias || h.includes(alias)));
    };

    const pNum = findIndex(['partnumber', 'partnum', 'partno', 'part', 'alu', 'itemnumber', 'itemnum', 'itemno', 'sku', 'barcode', 'upc', 'code', 'id']);
    const pName = findIndex(['itemname', 'name', 'item', 'partname', 'title', 'description', 'partdescription', 'desc']);
    const pCat = findIndex([
      'category',
      'department',
      'dept',
      'class',
      'itemclass',
      'type',
      'producttype',
      'itemtype',
      'group',
      'family',
      'section',
      'classification',
      'line',
      'productline',
      'cat',
      'subcat',
      'posdept',
    ]);
    const pPrice = findIndex(['unitprice', 'price', 'regularprice', 'cost', 'retailprice', 'retail', 'rate', 'amount', 'sellprice', 'saleprice']);
    const pQty = findIndex(['quantityinstock', 'quantity', 'qty', 'qtyonhand', 'onhand', 'stock', 'count', 'units', 'avail']);
    const pSupp = findIndex(['suppliername', 'supplier', 'vendor', 'manufacturer', 'brand', 'mfg', 'distributor']);
    const pDesc = findIndex(['partdescription', 'description', 'desc', 'details', 'notes', 'spec']);
    const pReorder = findIndex(['reorderlevel', 'reorderpoint', 'reorder', 'min', 'minqty', 'minstock', 'orderpoint']);

    setColPartNumber(pNum !== -1 ? pNum : 0);
    setColItemName(pName !== -1 ? pName : (headers.length > 1 ? 1 : 0));
    setColCategory(pCat !== -1 ? pCat : -1);
    setColUnitPrice(pPrice !== -1 ? pPrice : -1);
    setColQuantity(pQty !== -1 ? pQty : -1);
    setColSupplier(pSupp !== -1 ? pSupp : -1);
    setColDescription(pDesc !== -1 && pDesc !== pName ? pDesc : -1);
    setColReorder(pReorder !== -1 ? pReorder : -1);

    if (pCat === -1) {
      setIsCustomCategoryOverride(true);
    } else {
      setIsCustomCategoryOverride(false);
    }
  };

  // Dynamically calculate parsed inventory parts based on selected column mapping
  const parsedItems: InventoryItem[] = useMemo(() => {
    if (rawRows.length === 0) return [];

    const today = new Date().toISOString().split('T')[0];
    const items: InventoryItem[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const cols = rawRows[i];

      let partNumber = colPartNumber !== -1 && cols[colPartNumber] ? cols[colPartNumber].trim() : '';
      let itemName = colItemName !== -1 && cols[colItemName] ? cols[colItemName].trim() : '';
      let description = colDescription !== -1 && cols[colDescription] ? cols[colDescription].trim() : '';

      // Determine Category
      let categoryRaw = '';
      if (!isCustomCategoryOverride && colCategory !== -1 && cols[colCategory]) {
        categoryRaw = cols[colCategory].trim();
      }
      if (!categoryRaw) {
        categoryRaw = fallbackCategory || 'Universal & Workshop';
      }

      const supplierName =
        colSupplier !== -1 && cols[colSupplier] && cols[colSupplier].trim()
          ? cols[colSupplier].trim()
          : 'Fleet Supply Direct';

      const priceRaw = colUnitPrice !== -1 && cols[colUnitPrice] ? cols[colUnitPrice].replace(/[^0-9.-]+/g, '') : '0';
      const qtyRaw = colQuantity !== -1 && cols[colQuantity] ? cols[colQuantity].replace(/[^0-9-]+/g, '') : '0';
      const reorderRaw = colReorder !== -1 && cols[colReorder] ? cols[colReorder].replace(/[^0-9-]+/g, '') : '5';

      if (!partNumber && itemName) {
        partNumber = 'P-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      } else if (!itemName && partNumber) {
        itemName = `Auto Part ${partNumber}`;
      } else if (!partNumber && !itemName) {
        continue; // Skip empty row
      }

      if (!description) {
        description = `${itemName} (Standard commercial fleet replacement)`;
      }

      const unitPrice = Math.max(0, parseFloat(priceRaw) || 0);
      const quantityInStock = Math.max(0, parseInt(qtyRaw, 10) || 0);
      const reorderLevel = Math.max(0, parseInt(reorderRaw, 10) || 5);

      const safeId = `part_${partNumber.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_${i + 1}`;

      items.push({
        id: safeId,
        partNumber: partNumber.toUpperCase(),
        itemName,
        partDescription: description,
        category: cleanCategoryString(categoryRaw, fallbackCategory),
        imageUrl: '',
        supplierName,
        unitPrice,
        quantityInStock,
        reorderLevel,
        lastRestockedDate: today,
      });
    }

    return items;
  }, [
    rawRows,
    colPartNumber,
    colItemName,
    colCategory,
    colUnitPrice,
    colQuantity,
    colSupplier,
    colDescription,
    colReorder,
    fallbackCategory,
    isCustomCategoryOverride,
  ]);

  // Detected unique categories and their counts
  const detectedCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    parsedItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [parsedItems]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleRawTextUpdate(text);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected file. Please try again.');
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    setFile(droppedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleRawTextUpdate(text);
    };
    reader.readAsText(droppedFile);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    handleRawTextUpdate(text);
  };

  const handleDownloadSample = () => {
    const sampleHeaders = [
      'Part Number',
      'Item Name',
      'Category',
      'Unit Price',
      'Quantity in Stock',
      'Reorder Level',
      'Supplier Name',
      'Part Description',
    ];

    const sampleRows = [
      ['MK-FLT-101', 'HD Brake Shoe 4707 Q-Plus', 'Brakes & Friction', '89.50', '28', '10', 'Meritor Brakes', '23,000 lb drive axle brake shoe'],
      ['MK-FLT-102', 'Air Filter Primary Radial', 'Filters & Fluids', '45.00', '14', '6', 'Donaldson Filtration', 'Heavy-duty air filtration element'],
      ['MK-FLT-103', 'LED Sealed Tail Light 4-inch', 'Electrical, Lighting & Starters', '24.99', '42', '12', 'Grote Lighting', 'Submersible 12/24V stop/turn/tail'],
      ['MK-FLT-104', 'Air Suspension Bellows Lobe', 'Suspension & Steering', '189.50', '8', '5', 'SAF-Holland', 'Multi-ply rolling lobe air spring'],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [sampleHeaders.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Mashkay_AutoParts_Stock_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (parsedItems.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await onImport(parsedItems, importMode === 'replace');
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setErrorMessage(
        err instanceof Error
          ? `Import failed: ${err.message}`
          : 'Could not complete import. Please check data format.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const existingSet = new Set(existingPartNumbers.map((p) => p.toLowerCase()));
  const newCount = parsedItems.filter((i) => !existingSet.has(i.partNumber.toLowerCase())).length;
  const updateCount = parsedItems.length - newCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Inventory &amp; Sync Categories</h2>
              <p className="text-xs text-slate-400">
                Works with any CSV, Excel export, or QuickBooks Desktop POS file
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick instructions & template download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-950">Flexible Column Recognition</p>
              <p className="text-[11px] text-amber-800">
                You can map any column from your file (e.g. <em>Department, Class, Category, Item Type</em>) to auto-populate your inventory filters.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/60 rounded-lg text-amber-900 font-semibold text-xs shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample CSV</span>
            </button>
          </div>

          {/* Toggle between File Upload and Direct Paste */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                inputMode === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload CSV / Excel File
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                inputMode === 'paste'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste CSV / Text Directly
            </button>
          </div>

          {/* Upload Dropzone */}
          {inputMode === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-500 bg-amber-50/50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                {file ? (
                  <FileText className="w-6 h-6 text-emerald-600" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-amber-600" />
                )}
              </div>
              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">{file.name}</p>
                  <p className="text-xs text-emerald-700">
                    File loaded &bull; {(file.size / 1024).toFixed(1)} KB &bull; Click to choose a different file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Drop your CSV file here, or <span className="text-amber-600 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500">Supports .csv exported from POS, Excel, or spreadsheets</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Paste CSV Text (with header row):
              </label>
              <textarea
                value={rawText}
                onChange={handlePasteChange}
                placeholder="Part Number,Item Name,Category,Quantity in Stock,Unit Price&#10;FLT-BRK-4707,Heavy Duty Brake Shoe,Brakes & Friction,25,89.50"
                rows={5}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Column Mapper Section (Shows when CSV has headers) */}
          {rawHeaders.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Map Columns from Your File ({rawHeaders.length} columns detected)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowColumnMapper(!showColumnMapper)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
                >
                  {showColumnMapper ? 'Hide Mapping' : 'Adjust Mapping'}
                </button>
              </div>

              {showColumnMapper && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {/* Category Column Selector (PROMINENT) */}
                  <div className="sm:col-span-2 lg:col-span-3 p-3 bg-amber-100/60 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-700" />
                        <span>Category Column</span>
                        <span className="text-amber-700 text-[11px] font-normal">(Used for inventory filters &amp; tabs)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryOverride(!isCustomCategoryOverride)}
                        className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                      >
                        {isCustomCategoryOverride ? 'Use column from CSV' : 'Set custom fallback category'}
                      </button>
                    </div>

                    {!isCustomCategoryOverride ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={colCategory}
                          onChange={(e) => setColCategory(parseInt(e.target.value, 10))}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                          <option value={-1}>-- No Category Column (Use Default) --</option>
                          {rawHeaders.map((header, idx) => (
                            <option key={idx} value={idx}>
                              Column {idx + 1}: &quot;{header}&quot;
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-amber-900 font-medium whitespace-nowrap">Fallback:</span>
                          <input
                            type="text"
                            value={fallbackCategory}
                            onChange={(e) => setFallbackCategory(e.target.value)}
                            placeholder="e.g. General Parts"
                            className="w-36 px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={fallbackCategory}
                          onChange={(e) => setFallbackCategory(e.target.value)}
                          placeholder="Type custom category for all rows (e.g. Brakes, Transmission...)"
                          className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <p className="text-[10px] text-amber-800">
                          All imported items without a specific category will be placed into &quot;{fallbackCategory}&quot;.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Part Number Column */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Part # / SKU Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={colPartNumber}
                      onChange={(e) => setColPartNumber(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {rawHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          {header || `Column ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Item Name Column */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Item Name Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={colItemName}
                      onChange={(e) => setColItemName(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {rawHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          {header || `Column ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Column */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Quantity in Stock
                    </label>
                    <select
                      value={colQuantity}
                      onChange={(e) => setColQuantity(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={-1}>-- Not In CSV (Default to 0) --</option>
                      {rawHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          {header || `Column ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Price Column */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Unit Price ($)
                    </label>
                    <select
                      value={colUnitPrice}
                      onChange={(e) => setColUnitPrice(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={-1}>-- Not In CSV (Default to $0) --</option>
                      {rawHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          {header || `Column ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier Column */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Supplier / Vendor
                    </label>
                    <select
                      value={colSupplier}
                      onChange={(e) => setColSupplier(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={-1}>-- Not In CSV (Default Partner) --</option>
                      {rawHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          {header || `Column ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reorder Level Column */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Reorder Threshold
                    </label>
                    <select
                      value={colReorder}
                      onChange={(e) => setColReorder(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={-1}>-- Not In CSV (Default to 5) --</option>
                      {rawHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          {header || `Column ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Section if items parsed */}
          {parsedItems.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Detected {parsedItems.length} Parts Ready to Import
                  </span>
                </div>
                {importMode === 'merge' && (
                  <span className="text-[11px] text-slate-500">
                    ({newCount} new, {updateCount} existing parts to update)
                  </span>
                )}
              </div>

              {/* Detected Categories from CSV */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>Categories Extracted ({Object.keys(detectedCategories).length}):</span>
                  </span>
                  <span className="text-emerald-800 font-semibold text-[11px]">
                    ✓ Will automatically appear in category filters &amp; pills
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {Object.entries(detectedCategories).map(([cat, count]) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-white text-slate-800 border border-amber-300 shadow-2xs"
                    >
                      <span>{cat}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample preview table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Part #</th>
                      <th className="py-2 px-3">Item Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Stock</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                    {parsedItems.slice(0, 5).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-bold text-amber-800">{item.partNumber}</td>
                        <td className="py-1.5 px-3 font-sans truncate max-w-[160px]">{item.itemName}</td>
                        <td className="py-1.5 px-3 font-sans font-semibold text-amber-900">{item.category}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{item.quantityInStock}</td>
                        <td className="py-1.5 px-3 text-right">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-1.5 px-3 font-sans truncate max-w-[120px] text-slate-500">
                          {item.supplierName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedItems.length > 5 && (
                <p className="text-[11px] text-slate-400 text-center">
                  ... plus {parsedItems.length - 5} more parts in file
                </p>
              )}

              {/* Import Options (Merge vs Replace) */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Import Action:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'merge'
                        ? 'border-amber-500 bg-amber-50/40 text-slate-900 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Merge &amp; Update Existing</div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Updates quantities and prices on existing parts, adds new parts and new categories.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'border-rose-500 bg-rose-50/40 text-slate-900 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Replace Entire Catalog</div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Clears all sample parts and populates your catalog strictly with this imported file.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={parsedItems.length === 0 || isProcessing}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              parsedItems.length === 0 || isProcessing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Cloud Database...</span>
              </>
            ) : (
              <>
                <span>Import &amp; Sync {parsedItems.length > 0 ? `${parsedItems.length} Parts` : ''}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
