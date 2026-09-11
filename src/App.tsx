import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, ReorderStatus, computeReorderStatus } from './types';
import { INITIAL_INVENTORY_ITEMS } from './data/initialData';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FormulaBar } from './components/FormulaBar';
import { InventoryTable } from './components/InventoryTable';
import { AddEditModal } from './components/AddEditModal';
import { RestockModal } from './components/RestockModal';
import { ConfirmModal } from './components/ConfirmModal';
import { NetworkShareModal } from './components/NetworkShareModal';
import { inventoryApi, NetworkInfo } from './api/inventoryApi';
import { CheckCircle2, AlertTriangle, Info, Truck } from 'lucide-react';

const STORAGE_KEY = 'mashkay_autoparts_inventory_v1';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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

  // Network Sync States
  const [syncVersion, setSyncVersion] = useState<number>(1);
  const [isSyncConnected, setIsSyncConnected] = useState<boolean>(true);
  const [isNetworkShareOpen, setIsNetworkShareOpen] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const syncVersionRef = useRef<number>(1);

  useEffect(() => {
    syncVersionRef.current = syncVersion;
  }, [syncVersion]);

  // Initial load and continuous network synchronization
  useEffect(() => {
    let isMounted = true;

    const initSync = async () => {
      try {
        const [invResult, netResult] = await Promise.allSettled([
          inventoryApi.getInventory(),
          inventoryApi.getNetworkInfo(),
        ]);

        if (!isMounted) return;

        if (invResult.status === 'fulfilled' && invResult.value) {
          setItems(invResult.value.items);
          setSyncVersion(invResult.value.version);
          syncVersionRef.current = invResult.value.version;
          setIsSyncConnected(true);
        }
        if (netResult.status === 'fulfilled' && netResult.value) {
          setNetworkInfo(netResult.value);
        }
      } catch (err) {
        console.warn('Backend sync unavailable, using local fallback:', err);
      }
    };

    initSync();

    // Polling interval to detect changes from other computers every 2.5s
    const pollInterval = setInterval(async () => {
      try {
        const status = await inventoryApi.getStatus();
        if (!isMounted) return;
        setIsSyncConnected(true);

        if (status.version > syncVersionRef.current) {
          const fresh = await inventoryApi.getInventory();
          if (!isMounted) return;
          setItems(fresh.items);
          setSyncVersion(fresh.version);
          syncVersionRef.current = fresh.version;
          showToast(`Catalog updated live from network (v${fresh.version})`, 'info');
        }
      } catch (err) {
        if (isMounted) setIsSyncConnected(false);
      }
    }, 2500);

    // Immediate sync check on tab focus
    const handleWindowFocus = async () => {
      try {
        const status = await inventoryApi.getStatus();
        if (status.version > syncVersionRef.current) {
          const fresh = await inventoryApi.getInventory();
          setItems(fresh.items);
          setSyncVersion(fresh.version);
          syncVersionRef.current = fresh.version;
        }
      } catch {}
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Save to localStorage as offline cache
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

  const handleUpdateStock = async (id: string, delta: number) => {
    // Optimistic UI update
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

    // Sync with central server
    try {
      const res = await inventoryApi.adjustStock(id, delta);
      setSyncVersion(res.version);
      syncVersionRef.current = res.version;
    } catch (err) {
      console.warn('Failed to sync stock update to central server:', err);
    }
  };

  const handleSaveItem = async (itemData: Omit<InventoryItem, 'id'>, id?: string) => {
    if (id) {
      // Edit existing
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...itemData, id } : item))
      );
      showToast(`Updated part ${itemData.partNumber}`);
      try {
        const res = await inventoryApi.updateItem(id, itemData);
        setSyncVersion(res.version);
        syncVersionRef.current = res.version;
      } catch (err) {
        console.warn('Failed to sync item update to server:', err);
      }
    } else {
      // Add new
      const tempId = `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newItem: InventoryItem = {
        ...itemData,
        id: tempId,
      };
      setItems((prev) => [newItem, ...prev]);
      showToast(`Added part ${itemData.partNumber} to inventory`);
      try {
        const res = await inventoryApi.createItem(newItem);
        setSyncVersion(res.version);
        syncVersionRef.current = res.version;
      } catch (err) {
        console.warn('Failed to sync new part to server:', err);
      }
    }
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setItemPendingDelete(item);
  };

  const handleConfirmSingleDelete = async () => {
    if (!itemPendingDelete) return;
    const deleted = itemPendingDelete;
    setItemPendingDelete(null);
    setItems((prev) => prev.filter((i) => i.id !== deleted.id));
    showToast(`Removed part ${deleted.partNumber}`, 'info');

    try {
      const res = await inventoryApi.deleteItem(deleted.id);
      setSyncVersion(res.version);
      syncVersionRef.current = res.version;
    } catch (err) {
      console.warn('Failed to sync delete to server:', err);
    }
  };

  const handleDeleteBatch = (itemsToDelete: InventoryItem[]) => {
    if (itemsToDelete.length === 0) return;
    setItemsPendingBatchDelete(itemsToDelete);
  };

  const handleConfirmBatchDelete = async () => {
    if (!itemsPendingBatchDelete || itemsPendingBatchDelete.length === 0) return;
    const batch = itemsPendingBatchDelete;
    const idsToDelete = new Set(batch.map((i) => i.id));
    setItemsPendingBatchDelete(null);
    setItems((prev) => prev.filter((i) => !idsToDelete.has(i.id)));
    showToast(`Removed ${batch.length} parts from inventory`, 'info');

    try {
      const res = await inventoryApi.batchDelete(batch.map((i) => i.id));
      setSyncVersion(res.version);
      syncVersionRef.current = res.version;
    } catch (err) {
      console.warn('Failed to sync batch delete to server:', err);
    }
  };

  const handleRestock = async (itemId: string, addedQuantity: number, restockDate: string) => {
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

    try {
      const res = await inventoryApi.adjustStock(itemId, addedQuantity);
      await inventoryApi.updateItem(itemId, { lastRestockedDate: restockDate });
      setSyncVersion(res.version + 1);
      syncVersionRef.current = res.version + 1;
    } catch (err) {
      console.warn('Failed to sync restock to server:', err);
    }
  };

  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = async () => {
    const freshItems: InventoryItem[] = JSON.parse(JSON.stringify(INITIAL_INVENTORY_ITEMS));
    setItems(freshItems);
    setStatusFilter('ALL');
    setEditingItem(null);
    setRestockingItem(null);
    setItemPendingDelete(null);
    setItemsPendingBatchDelete(null);
    setIsAddEditModalOpen(false);
    setIsResetConfirmOpen(false);
    setResetKey((k) => k + 1);
    showToast('Everything cleared and reset to sample catalog');

    try {
      const res = await inventoryApi.resetCatalog(false);
      setSyncVersion(res.version);
      syncVersionRef.current = res.version;
    } catch (err) {
      console.warn('Failed to sync reset to server:', err);
    }
  };

  const handleClearAllData = async () => {
    setItems([]);
    setStatusFilter('ALL');
    setEditingItem(null);
    setRestockingItem(null);
    setItemPendingDelete(null);
    setItemsPendingBatchDelete(null);
    setIsAddEditModalOpen(false);
    setIsResetConfirmOpen(false);
    setResetKey((k) => k + 1);
    showToast('All inventory items and filters cleared (0 items)', 'info');

    try {
      const res = await inventoryApi.resetCatalog(true);
      setSyncVersion(res.version);
      syncVersionRef.current = res.version;
    } catch (err) {
      console.warn('Failed to sync clear to server:', err);
    }
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
        onOpenNetworkShare={() => setIsNetworkShareOpen(true)}
        itemCount={items.length}
        isSyncConnected={isSyncConnected}
        syncVersion={syncVersion}
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

      {/* Network Share Modal */}
      <NetworkShareModal
        isOpen={isNetworkShareOpen}
        onClose={() => setIsNetworkShareOpen(false)}
        networkInfo={networkInfo}
        isSyncConnected={isSyncConnected}
        version={syncVersion}
      />

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
        subMessage="This action will remove this part across all connected computers on your network."
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
        subMessage="This action will remove the selected parts across all connected computers."
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
        subMessage="The catalog will be cleanly restored to the genuine sample fleet parts across trucks, buses, trailers, passenger cars, heavy equipment, and delivery vans."
        confirmText="Reset Sample Catalog"
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
