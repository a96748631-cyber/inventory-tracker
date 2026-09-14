import React, { useState, useMemo } from 'react';
import { InventoryItem, SaleRecord } from '../types';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  HelpCircle,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface ImportSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onImportSales: (
    sales: SaleRecord[],
    stockUpdates: { id: string; newStock: number }[]
  ) => Promise<void>;
}

export const ImportSalesModal: React.FC<ImportSalesModalProps> = ({
  isOpen,
  onClose,
  items,
  onImportSales,
}) => {
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Column mapping states
  const [partColIndex, setPartColIndex] = useState<number>(-1);
  const [qtyColIndex, setQtyColIndex] = useState<number>(-1);
  const [priceColIndex, setPriceColIndex] = useState<number>(-1);
  const [dateColIndex, setDateColIndex] = useState<number>(-1);
  const [receiptColIndex, setReceiptColIndex] = useState<number>(-1);
  const [customerColIndex, setCustomerColIndex] = useState<number>(-1);

  if (!isOpen) return null;

  // Split lines
  const parsedData = useMemo(() => {
    if (!rawText.trim()) return null;

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 1) return null;

    // Detect delimiter (comma, tab, semicolon)
    const firstLine = lines[0];
    let delimiter = ',';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > commaCount && tabCount > semiCount) {
      delimiter = '\t';
    } else if (semiCount > commaCount && semiCount > tabCount) {
      delimiter = ';';
    }

    const parseLine = (line: string): string[] => {
      if (delimiter === '\t') {
        return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      }
      // Simple CSV regex
      const re = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const results: string[] = [];
      let match;
      while ((match = re.exec(line)) !== null) {
        let val = match[1];
        if (val === undefined) break;
        val = val.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
        results.push(val);
        if (match.index + match[0].length >= line.length) break;
      }
      return results;
    };

    const headerTokens = parseLine(lines[0]);
    const rowTokens = lines.slice(1).map((l) => parseLine(l));

    return {
      delimiter,
      headerTokens,
      rowTokens,
    };
  }, [rawText]);

  // Auto-detect columns on first parse
  React.useEffect(() => {
    if (!parsedData || parsedData.headerTokens.length === 0) return;

    const headers = parsedData.headerTokens.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Part Number / SKU column
    const pIdx = headers.findIndex((h) =>
      ['partnumber', 'part', 'partno', 'sku', 'itemnumber', 'itemno', 'barcode', 'upc', 'code', 'productcode'].includes(h)
    );
    if (pIdx !== -1) setPartColIndex(pIdx);
    else setPartColIndex(0);

    // Quantity Sold column
    const qIdx = headers.findIndex((h) =>
      ['quantity', 'qty', 'qtysold', 'quantitysold', 'units', 'sold', 'amountsold'].includes(h)
    );
    if (qIdx !== -1) setQtyColIndex(qIdx);
    else if (headers.length > 1) setQtyColIndex(1);

    // Sale Price column
    const prIdx = headers.findIndex((h) =>
      ['price', 'saleprice', 'unitprice', 'rate', 'retail', 'amount', 'cost'].includes(h)
    );
    setPriceColIndex(prIdx !== -1 ? prIdx : -1);

    // Date column
    const dIdx = headers.findIndex((h) =>
      ['date', 'saledate', 'timestamp', 'time', 'txndate', 'createdat'].includes(h)
    );
    setDateColIndex(dIdx !== -1 ? dIdx : -1);

    // Receipt / Invoice column
    const rIdx = headers.findIndex((h) =>
      ['receipt', 'receiptno', 'invoice', 'invoiceno', 'transno', 'orderno', 'reference', 'ref'].includes(h)
    );
    setReceiptColIndex(rIdx !== -1 ? rIdx : -1);

    // Customer column
    const cIdx = headers.findIndex((h) =>
      ['customer', 'client', 'account', 'customername', 'fleet'].includes(h)
    );
    setCustomerColIndex(cIdx !== -1 ? cIdx : -1);
  }, [parsedData]);

  // Build simulated sale preview and stock updates
  const preview = useMemo(() => {
    if (!parsedData || partColIndex < 0 || qtyColIndex < 0) return null;

    const itemsMap = new Map<string, InventoryItem>();
    items.forEach((item) => {
      itemsMap.set(item.partNumber.toLowerCase().trim(), item);
    });

    const rows: Array<{
      sale: SaleRecord;
      matchedItem: InventoryItem | null;
      stockBefore: number;
      stockAfter: number;
      isValid: boolean;
      warning?: string;
    }> = [];

    // Track running stock across imported rows
    const runningStock = new Map<string, number>();
    items.forEach((item) => {
      runningStock.set(item.id, item.quantityInStock);
    });

    parsedData.rowTokens.forEach((cols, idx) => {
      const partKey = (cols[partColIndex] || '').trim();
      if (!partKey) return;

      const matchedItem = itemsMap.get(partKey.toLowerCase()) || null;
      const rawQty = cols[qtyColIndex] || '1';
      const qtySold = Math.max(1, parseInt(rawQty.replace(/[^0-9]/g, ''), 10) || 1);

      let salePrice = 0;
      if (priceColIndex >= 0 && cols[priceColIndex]) {
        salePrice = parseFloat(cols[priceColIndex].replace(/[^0-9.]/g, '')) || 0;
      }
      if (salePrice <= 0 && matchedItem) {
        salePrice = matchedItem.unitPrice;
      }

      const totalAmount = qtySold * salePrice;
      const saleDate =
        dateColIndex >= 0 && cols[dateColIndex]
          ? cols[dateColIndex].trim()
          : new Date().toISOString().split('T')[0];

      const receiptNumber =
        receiptColIndex >= 0 && cols[receiptColIndex]
          ? cols[receiptColIndex].trim()
          : undefined;

      const customerName =
        customerColIndex >= 0 && cols[customerColIndex]
          ? cols[customerColIndex].trim()
          : undefined;

      let stockBefore = 0;
      let stockAfter = 0;
      let warning: string | undefined;

      if (matchedItem) {
        const cur = runningStock.get(matchedItem.id) ?? matchedItem.quantityInStock;
        stockBefore = cur;
        stockAfter = Math.max(0, cur - qtySold);
        runningStock.set(matchedItem.id, stockAfter);

        if (stockAfter <= matchedItem.reorderLevel) {
          warning = `Stock will reach reorder level (${stockAfter} <= ${matchedItem.reorderLevel})`;
        }
      } else {
        warning = 'Part not found in inventory. Sale will be logged without catalog stock deduction.';
      }

      const saleRecord: SaleRecord = {
        id: `sale_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        partNumber: matchedItem ? matchedItem.partNumber : partKey,
        itemName: matchedItem ? matchedItem.itemName : `Uncataloged Part: ${partKey}`,
        category: matchedItem?.category,
        quantitySold: qtySold,
        salePrice,
        totalAmount,
        saleDate,
        receiptNumber,
        customerName,
        stockBefore: matchedItem ? stockBefore : undefined,
        stockAfter: matchedItem ? stockAfter : undefined,
      };

      rows.push({
        sale: saleRecord,
        matchedItem,
        stockBefore,
        stockAfter,
        isValid: true,
        warning,
      });
    });

    const totalRevenue = rows.reduce((sum, r) => sum + r.sale.totalAmount, 0);
    const totalUnitsSold = rows.reduce((sum, r) => sum + r.sale.quantitySold, 0);
    const matchedCount = rows.filter((r) => r.matchedItem !== null).length;

    // Unique part stock updates
    const stockUpdates: { id: string; newStock: number }[] = [];
    runningStock.forEach((finalStock, partId) => {
      const orig = items.find((i) => i.id === partId);
      if (orig && orig.quantityInStock !== finalStock) {
        stockUpdates.push({ id: partId, newStock: finalStock });
      }
    });

    return {
      rows,
      totalRevenue,
      totalUnitsSold,
      matchedCount,
      stockUpdates,
    };
  }, [
    parsedData,
    partColIndex,
    qtyColIndex,
    priceColIndex,
    dateColIndex,
    receiptColIndex,
    customerColIndex,
    items,
  ]);

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawText(content);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!preview || preview.rows.length === 0) {
      setErrorMessage('No valid sales to import.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const sales = preview.rows.map((r) => r.sale);
      await onImportSales(sales, preview.stockUpdates);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import sales.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-4 max-h-[92vh] flex flex-col animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import POS Sales &amp; Correct Stock</h2>
              <p className="text-xs text-slate-400">
                Import sales from QuickBooks POS, tablet receipts, or CSV and automatically deduct on-hand stock
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Area */}
          {!parsedData ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 text-center transition-all bg-slate-50 hover:bg-amber-50/20 cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,.txt,.tsv';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileUpload(file);
                  };
                  input.click();
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Drop QuickBooks POS sales export or click to browse
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Supports CSV, TSV, or TXT sales receipts with Part # / SKU, Quantity Sold, and Sale Price
                </p>
              </div>

              {/* Paste Text option */}
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  &mdash; or paste sales receipt lines below &mdash;
                </span>
              </div>

              <div>
                <textarea
                  rows={4}
                  placeholder="Part Number, Quantity Sold, Price, Date, Receipt #&#10;TRK-BRK-101, 2, 45.00, 2026-09-14, REC-9011&#10;BUS-FLT-301, 4, 18.50, 2026-09-14, REC-9012"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>
                    Loaded: <strong className="text-slate-900">{fileName || 'Pasted Sales Data'}</strong> (
                    {parsedData.rowTokens.length} rows detected)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setFileName('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                >
                  Choose Different File
                </button>
              </div>

              {/* Column Mapping Section */}
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Match Columns From Your Sales Export
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Part Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Part # / SKU Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={partColIndex}
                      onChange={(e) => setPartColIndex(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      {parsedData.headerTokens.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Qty Sold */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity Sold Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={qtyColIndex}
                      onChange={(e) => setQtyColIndex(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      {parsedData.headerTokens.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sale Price */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sale Price Column
                    </label>
                    <select
                      value={priceColIndex}
                      onChange={(e) => setPriceColIndex(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value={-1}>-- Use Catalog Unit Price --</option>
                      {parsedData.headerTokens.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sale Date Column
                    </label>
                    <select
                      value={dateColIndex}
                      onChange={(e) => setDateColIndex(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value={-1}>-- Use Today's Date --</option>
                      {parsedData.headerTokens.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Receipt # */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Receipt / Invoice # Column
                    </label>
                    <select
                      value={receiptColIndex}
                      onChange={(e) => setReceiptColIndex(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value={-1}>-- None / Auto-generate --</option>
                      {parsedData.headerTokens.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Customer */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer / Account Column
                    </label>
                    <select
                      value={customerColIndex}
                      onChange={(e) => setCustomerColIndex(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value={-1}>-- None / Walk-in --</option>
                      {parsedData.headerTokens.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Impact & Preview Statistics */}
              {preview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-emerald-800">Total Sales Value</span>
                      <p className="text-base font-extrabold text-emerald-700 font-mono mt-0.5">
                        ${preview.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-blue-800">Units Sold</span>
                      <p className="text-base font-extrabold text-blue-700 font-mono mt-0.5">
                        {preview.totalUnitsSold} units
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-purple-800">Matched Parts</span>
                      <p className="text-base font-extrabold text-purple-700 font-mono mt-0.5">
                        {preview.matchedCount} / {preview.rows.length}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-amber-800">Parts Deducted</span>
                      <p className="text-base font-extrabold text-amber-700 font-mono mt-0.5">
                        {preview.stockUpdates.length} items
                      </p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Preview Stock Deduction ({preview.rows.length} transactions)</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Verify stock changes before applying
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {preview.rows.map((row, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {row.sale.partNumber}
                              </span>
                              <span className="text-slate-600 truncate">{row.sale.itemName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span>Qty Sold: {row.sale.quantitySold}</span>
                              <span>&bull;</span>
                              <span>${row.sale.salePrice.toFixed(2)} each</span>
                              <span>&bull;</span>
                              <span className="font-semibold text-emerald-600">
                                Total: ${row.sale.totalAmount.toFixed(2)}
                              </span>
                            </div>
                            {row.warning && (
                              <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                                {row.warning}
                              </p>
                            )}
                          </div>

                          {row.matchedItem ? (
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="text-slate-500">{row.stockBefore}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="font-bold text-slate-900">{row.stockAfter}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">Stock After</span>
                            </div>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Uncataloged
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="text-xs text-slate-500">
            {preview ? `${preview.rows.length} sales ready &bull; ${preview.stockUpdates.length} stock levels will be deducted` : ''}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing || !preview || preview.rows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Deducting Stock & Logging Sales...'
                  : `Confirm & Deduct Stock (${preview?.rows.length || 0} Sales)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
