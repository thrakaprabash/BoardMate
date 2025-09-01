import axios from 'axios';
import { 
  InventoryItem, 
  InventoryListResponse, 
  CreateInventoryItemDto, 
  UpdateInventoryItemDto,
  AdjustQuantityDto
} from '../types/inventory';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export async function getInventoryItems(
  params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<InventoryListResponse> {
  const response = await axios.get(`${API_URL}/inventory`, { params });
  return response.data;
}

export async function getInventoryItemById(id: string): Promise<InventoryItem> {
  const response = await axios.get(`${API_URL}/inventory/${id}`);
  return response.data;
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const response = await axios.get(`${API_URL}/inventory/low-stock`);
  return response.data;
}

export async function createInventoryItem(item: CreateInventoryItemDto): Promise<InventoryItem> {
  const response = await axios.post(`${API_URL}/inventory`, item);
  return response.data;
}

export async function updateInventoryItem(id: string, item: UpdateInventoryItemDto): Promise<InventoryItem> {
  const response = await axios.patch(`${API_URL}/inventory/${id}`, item);
  return response.data;
}

export async function adjustInventoryItemQuantity(id: string, adjustment: AdjustQuantityDto): Promise<InventoryItem> {
  const response = await axios.patch(`${API_URL}/inventory/${id}/adjust`, adjustment);
  return response.data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await axios.delete(`${API_URL}/inventory/${id}`);
}
