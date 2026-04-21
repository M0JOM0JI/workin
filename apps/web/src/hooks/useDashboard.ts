import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, startOfDay, endOfDay } from 'date-fns';

export function useTodayAttendance(storeId: string | null) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['attendance', storeId, today],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/attendance`, {
        params: { date: today },
      });
      return data as any[];
    },
    enabled: !!storeId,
    refetchInterval: 30_000,
  });
}

export function useTodaySchedules(storeId: string | null) {
  const today = new Date();
  return useQuery({
    queryKey: ['schedules', storeId, format(today, 'yyyy-MM-dd'), format(today, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/schedules`, {
        params: {
          from: startOfDay(today).toISOString(),
          to: endOfDay(today).toISOString(),
        },
      });
      return data as any[];
    },
    enabled: !!storeId,
  });
}

export function useMonthPayrollSummary(storeId: string | null) {
  const now = new Date();
  return useQuery({
    queryKey: ['payroll', storeId, format(now, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/payroll`, {
        params: { year: now.getFullYear(), month: now.getMonth() + 1 },
      });
      return data as any;
    },
    enabled: !!storeId,
  });
}
