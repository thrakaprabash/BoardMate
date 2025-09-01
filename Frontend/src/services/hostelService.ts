import axios from 'axios';
import { HostelListResponse } from '../types/hostel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export async function getHostels(
  params: {
    search?: string;
    owner?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<HostelListResponse> {
  const response = await axios.get(`${API_URL}/hostels`, { params });
  return response.data;
}
