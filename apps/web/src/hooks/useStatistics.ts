import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

export interface StaffStatItem {
  staffId: string;
  name: string;
  workDays: number;
  totalMinutes: number;
  avgMinutes: number;
  lateCount: number;
  absentCount: number;
}

export interface StaffsStatistics {
  yearMonth: string;
  staffCount: number;
  items: StaffStatItem[];
}

export function useStaffsStatistics(storeId: string | null, month: Date) {
  const yearMonth = format(month, 'yyyy-MM');
  return useQuery<StaffsStatistics>({
    queryKey: ['statistics-staffs', storeId, yearMonth],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/statistics/staffs`, {
        params: { yearMonth },
      });
      return data;
    },
    enabled: !!storeId,
  });
}
