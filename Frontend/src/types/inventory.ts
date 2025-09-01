export interface InventoryItem {
  _id: string;
  hostel_id?: string;
  name: string;
  quantity: number;
  min_level: number;
  status: 'active' | 'inactive' | 'low' | 'out';
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDto {
  name: string;
  quantity?: number;
  min_level?: number;
  hostel_id?: string;
}

export interface UpdateInventoryItemDto {
  name?: string;
  min_level?: number;
  status?: 'active' | 'inactive' | 'low' | 'out';
  hostel_id?: string;
}

export interface AdjustQuantityDto {
  delta: number;
}

export interface InventoryListResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: InventoryItem[];
}
