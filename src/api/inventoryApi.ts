import { InventoryItem } from '../types';

export interface InventoryResponse {
  items: InventoryItem[];
  version: number;
  lastUpdated: string;
}

export interface InventoryStatus {
  version: number;
  count: number;
  lastUpdated: string;
}

export interface NetworkInfo {
  hostIps: string[];
  port: number;
  urls: string[];
}

export const inventoryApi = {
  async getInventory(): Promise<InventoryResponse> {
    const res = await fetch('/api/inventory');
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return res.json();
  },

  async getStatus(): Promise<InventoryStatus> {
    const res = await fetch('/api/inventory/status');
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return res.json();
  },

  async getNetworkInfo(): Promise<NetworkInfo> {
    const res = await fetch('/api/network-info');
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return res.json();
  },

  async createItem(item: Partial<InventoryItem>): Promise<{ item: InventoryItem; version: number }> {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to create part on central server');
    return res.json();
  },

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<{ item: InventoryItem; version: number }> {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update part on central server');
    return res.json();
  },

  async adjustStock(id: string, delta: number): Promise<{ item: InventoryItem; version: number }> {
    const res = await fetch(`/api/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });
    if (!res.ok) throw new Error('Failed to adjust stock on central server');
    return res.json();
  },

  async deleteItem(id: string): Promise<{ version: number }> {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete part on central server');
    return res.json();
  },

  async batchDelete(ids: string[]): Promise<{ count: number; version: number }> {
    const res = await fetch('/api/inventory/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Failed to batch delete on central server');
    return res.json();
  },

  async resetCatalog(wipe: boolean = false): Promise<{ items: InventoryItem[]; version: number }> {
    const res = await fetch('/api/inventory/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wipe }),
    });
    if (!res.ok) throw new Error('Failed to reset catalog on central server');
    return res.json();
  },
};
