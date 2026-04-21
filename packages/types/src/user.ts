export type Role = 'OWNER' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface StoreStaff {
  id: string;
  storeId: string;
  userId: string;
  role: Role;
  hourlyWage: number;
  joinedAt: string;
  leftAt?: string;
  user: Pick<User, 'id' | 'name'>;
}
