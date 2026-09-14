export type PresetPartCategory =
  | 'Truck Parts'
  | 'Bus Parts'
  | 'Trailer Parts'
  | 'Passenger Car Parts'
  | 'Heavy Equipment Parts'
  | 'Van & Delivery Fleet'
  | 'Brakes & Friction'
  | 'Engine & Powertrain'
  | 'Suspension & Steering'
  | 'Electrical, Lighting & Starters'
  | 'Filters & Fluids'
  | 'Cooling & Air Conditioning'
  | 'Transmission & Clutch'
  | 'Exhaust & Turbochargers'
  | 'Hydraulics & Pneumatics'
  | 'Universal & Workshop';

export type PartCategory = string;

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
  category: 'ALL' | string;
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

export interface SaleRecord {
  id: string;
  partNumber: string;
  itemName: string;
  category?: string;
  quantitySold: number;
  salePrice: number;
  totalAmount: number;
  saleDate: string; // YYYY-MM-DD or ISO
  receiptNumber?: string;
  customerName?: string;
  stockBefore?: number;
  stockAfter?: number;
  notes?: string;
}

export type SalesDateRange = 'today' | '7days' | '30days' | 'thisMonth' | 'all';

