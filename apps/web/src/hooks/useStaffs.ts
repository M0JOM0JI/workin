import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Staff {
  id: string;         // StoreStaff.id
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  hourlyWage: number;
  joinedAt: string;
  leftAt: string | null;
  user: { id: string; name: string; email: string; phone?: string | null };
}

export function useStaffs(storeId: string | null) {
  return useQuery<Staff[]>({
    queryKey: ['staffs', storeId],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/staffs`);
      return data;
    },
    enabled: !!storeId,
  });
}
