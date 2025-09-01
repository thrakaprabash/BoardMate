export interface Hostel {
  _id: string;
  owner_id: string;
  name: string;
  location: string;
  facilities?: string[];
  contact?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HostelListResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Hostel[];
}
