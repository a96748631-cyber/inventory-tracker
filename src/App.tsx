import React, { useState, useEffect } from 'react';
import { InventoryItem, ReorderStatus, computeReorderStatus } from './types';
import { INITIAL_INVENTORY_ITEMS } from './data/initialData';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FormulaBar } from './components/FormulaBar';
import { InventoryTable } from './components/InventoryTable';
import { AddEditModal } from './components/AddEditModal';
import { RestockModal } from './components/RestockModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CheckCircle2, AlertTriangle, Info, Truck } from 'lucide-react';

const STORAGE_KEY = 'mashkay_autoparts_inventory_v1';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Map to ensure new columns partDescription, imageUrl, supplierName are populated if previously undefined
          return parsed.map((item: any) => {
            const defaultItem = INITIAL_INVENTORY_ITEMS.find((init) => init.partNumber === item.partNumber);
            const hasOldDummyUrl = item.imageUrl && item.imageUrl.includes('example.com');
            return {
              ...item,
              partDescription:
                item.partDescription ||
                defaultItem?.partDescription ||
                'Genuine heavy-duty fleet autopart certified for commercial performance.',
              imageUrl:
                (hasOldDummyUrl && defaultItem?.imageUrl)
                  ? defaultItem.imageUrl
                  : (item.imageUrl || defaultItem?.imageUrl || ''),
              supplierName:
                item.supplierName ||
                defaultItem?.supplierName ||
                'Mashkay OEM Partner',
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved inventory items:', e);
    }
    return INITIAL_INVENTORY_ITEMS;
  });

  const [statusFilter, setStatusFilter] = useState<'ALL' | ReorderStatus>('ALL');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<InventoryItem | null>(null);
  const [itemsPendingBatchDelete, setItemsPendingBatchDelete] = useState<InventoryItem[] | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist inventory items to localStorage:', e);
    }
  }, [items]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleUpdateStock = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStock = Math.max(0, item.quantityInStock + delta);
          const oldStatus = computeReorderStatus(item.quantityInStock, item.reorderLevel);
          const newStatus = computeReorderStatus(newStock, item.reorderLevel);
          
          if (oldStatus !== newStatus) {
            showToast(
              `Status changed for ${item.partNumber}: now "${newStatus}" (Stock: ${newStock}, Reorder Level: ${item.reorderLevel})`,
              newStatus === 'Reorder' ? 'info' : 'success'
            );
          }
          return { ...item, quantityInStock: newStock };
        }
        return item;
      })
    );
  };

  const handleSaveItem = (itemData: Omit<InventoryItem, 'id'>, id?: string) => {
    if (id) {
      // Edit existing
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...itemData, id } : item))
      );
      showToast(`Updated part ${itemData.partNumber}`);
    } else {
      // Add new
      const newItem: InventoryItem = {
        ...itemData,
        id: `part-${Date.now()}`,
      };
      setItems((prev) => [newItem, ...prev]);
      showToast(`Added part ${itemData.partNumber} to inventory`);
    }
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setItemPendingDelete(item);
  };

  const handleConfirmSingleDelete = () => {
    if (!itemPendingDelete) return;
    setItems((prev) => prev.filter((i) => i.id !== itemPendingDelete.id));
    showToast(`Removed part ${itemPendingDelete.partNumber}`, 'info');
    setItemPendingDelete(null);
  };

  const handleDeleteBatch = (itemsToDelete: InventoryItem[]) => {
    if (itemsToDelete.length === 0) return;
    setItemsPendingBatchDelete(itemsToDelete);
  };

  const handleConfirmBatchDelete = () => {
    if (!itemsPendingBatchDelete || itemsPendingBatchDelete.length === 0) return;
    const idsToDelete = new Set(itemsPendingBatchDelete.map((i) => i.id));
    setItems((prev) => prev.filter((i) => !idsToDelete.has(i.id)));
    showToast(`Removed ${itemsPendingBatchDelete.length} parts from inventory`, 'info');
    setItemsPendingBatchDelete(null);
  };

  const handleRestock = (itemId: string, addedQuantity: number, restockDate: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newStock = item.quantityInStock + addedQuantity;
          return {
            ...item,
            quantityInStock: newStock,
            lastRestockedDate: restockDate,
          };
        }
        return item;
      })
    );
    showToast(`Restocked +${addedQuantity} units on ${restockDate}. Status re-evaluated.`);
  };

  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    // Deep clone to ensure completely pristine object references
    const freshItems: InventoryItem[] = JSON.parse(JSON.stringify(INITIAL_INVENTORY_ITEMS));
    setItems(freshItems);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshItems));
    } catch (e) {
      console.warn('Failed to reset storage:', e);
    }
    // Clear all filters, selections, search queries, modals, and pending states
    setStatusFilter('ALL');
    setEditingItem(null);
    setRestockingItem(null);
    setItemPendingDelete(null);
    setItemsPendingBatchDelete(null);
    setIsAddEditModalOpen(false);
    setIsResetConfirmOpen(false);
    setResetKey((k) => k + 1);
    showToast('Everything cleared and reset to 3 standard sample rows');
  };

  const handleClearAllData = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear inventory in storage:', e);
    }
    setStatusFilter('ALL');
    setEditingItem(null);
    setRestockingItem(null);
    setItemPendingDelete(null);
    setItemsPendingBatchDelete(null);
    setIsAddEditModalOpen(false);
    setIsResetConfirmOpen(false);
    setResetKey((k) => k + 1);
    showToast('All inventory items and filters cleared (0 items)', 'info');
  };

  const handleExportCSV = () => {
    const headers = [
      'Part Number',
      'Item Name',
      'Part Description',
      'Category',
      'Part Picture',
      'Supplier Name',
      'Unit Price',
      'Quantity in Stock',
      'Reorder Level',
      'Reorder Status',
      'Last Restocked Date',
    ];

    const rows = items.map((item) => {
      const status = computeReorderStatus(item.quantityInStock, item.reorderLevel);
      return [
        `"${item.partNumber}"`,
        `"${item.itemName.replace(/"/g, '""')}"`,
        `"${(item.partDescription || '').replace(/"/g, '""')}"`,
        `"${item.category}"`,
        `"${item.imageUrl || ''}"`,
        `"${(item.supplierName || '').replace(/"/g, '""')}"`,
        item.unitPrice.toFixed(2),
        item.quantityInStock,
        item.reorderLevel,
        `"${status}"`,
        `"${item.lastRestockedDate}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mashkay_Autoparts_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported inventory tracking table to CSV');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs sm:text-sm animate-fade-in">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <Header
        onAddPart={() => {
          setEditingItem(null);
          setIsAddEditModalOpen(true);
        }}
        onExportCSV={handleExportCSV}
        onResetData={handleResetData}
        itemCount={items.length}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Formula Bar with Excel IF specification */}
        <FormulaBar />

        {/* Stats Metrics */}
        <StatsCards
          items={items}
          onFilterByStatus={setStatusFilter}
          currentStatusFilter={statusFilter}
        />

        {/* Inventory Tracking Table */}
        <InventoryTable
          key={resetKey}
          resetKey={resetKey}
          items={items}
          onUpdateStock={handleUpdateStock}
          onEditItem={(item) => {
            setEditingItem(item);
            setIsAddEditModalOpen(true);
          }}
          onDeleteItem={handleDeleteItem}
          onDeleteBatch={handleDeleteBatch}
          onRestockClick={(item) => setRestockingItem(item)}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </main>

      {/* Add / Edit Modal */}
      <AddEditModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
        onDelete={(id) => {
          const item = items.find((i) => i.id === id);
          if (item) {
            setItemPendingDelete(item);
          }
        }}
      />

      {/* Restock Modal */}
      <RestockModal
        isOpen={!!restockingItem}
        onClose={() => setRestockingItem(null)}
        item={restockingItem}
        onRestock={handleRestock}
      />

      {/* Single Item Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemPendingDelete}
        onClose={() => setItemPendingDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Autopart"
        message={`Are you sure you want to permanently delete part "${itemPendingDelete?.partNumber} - ${itemPendingDelete?.itemName}" from your inventory catalog?`}
        subMessage="This action will remove this part and its stock history."
        confirmText="Delete Part"
        confirmVariant="danger"
      />

      {/* Batch Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemsPendingBatchDelete && itemsPendingBatchDelete.length > 0}
        onClose={() => setItemsPendingBatchDelete(null)}
        onConfirm={handleConfirmBatchDelete}
        title={`Delete ${itemsPendingBatchDelete?.length || 0} Selected Autoparts`}
        message={`Are you sure you want to delete these ${itemsPendingBatchDelete?.length || 0} parts from your inventory?`}
        itemsToDelete={itemsPendingBatchDelete?.map((item) => ({
          partNumber: item.partNumber,
          itemName: item.itemName,
        }))}
        subMessage="This action cannot be undone."
        confirmText={`Delete ${itemsPendingBatchDelete?.length || 0} Parts`}
        confirmVariant="danger"
      />

      {/* Reset Data Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Inventory Catalog"
        message="Are you sure you want to reset the catalog? All added parts, modifications, search queries, category filters, and checkbox selections will be completely cleared."
        subMessage="The catalog will be cleanly restored to the 3 standard genuine fleet sample rows (Truck, Bus, and Trailer)."
        confirmText="Reset to 3 Sample Rows"
        confirmVariant="warning"
        secondaryAction={{
          label: 'Wipe All (0 Parts)',
          onAction: handleClearAllData,
          variant: 'danger',
        }}
      />
    </div>
  );
}
