export type PartCategory =
  | 'Truck Parts'
  | 'Bus Parts'
  | 'Trailer Parts'
  | 'Passenger Car Parts'
  | 'Heavy Equipment Parts'
  | 'Van & Delivery Fleet'
  | 'Universal & Workshop';

export interface InventoryItem {
  id: string;
  partNumber: string;
  itemName: string;
  partDescription: string;
  category: PartCategory;
  imageUrl: string;
  supplierName: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  // Computed dynamically via IF formula: quantityInStock < reorderLevel ? 'Reorder' : 'OK'
  lastRestockedDate: string;
  compatibility?: string;
  oemReference?: string;
}

export type ReorderStatus = 'Reorder' | 'OK';

export interface InventoryFilterOptions {
  searchQuery: string;
  category: 'ALL' | PartCategory;
  status: 'ALL' | ReorderStatus;
  sortBy:
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
  sortOrder: 'asc' | 'desc';
}

export function computeReorderStatus(quantityInStock: number, reorderLevel: number): ReorderStatus {
  // IF formula: IF(quantityInStock < reorderLevel, "Reorder", "OK")
  return quantityInStock < reorderLevel ? 'Reorder' : 'OK';
}
