export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  pincode: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface SignupData {
  name: string;
  email: string;
  phone: string;
  city: string;
  pincode: string;
  password: string;
}

export interface UserListResponse {
  users: User[];
  pagination: { page: number; limit: number; total: number; pages: number };
  cities: string[];
}

export interface AdminSummary {
  totalUsers: number;
  totalAdmins: number;
  totalCities: number;
}
