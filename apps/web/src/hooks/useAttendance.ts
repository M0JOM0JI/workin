import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

export interface Attendance {
  id: string;
  storeId: string;
  staffId: string;
  scheduleId?: string | null;
  clockIn: string;
  clockOut?: string | null;
  lat?: number | null;
  lng?: number | null;
  staff: {
    id: string;
    user: { id: string; name: string };
  };
  schedule?: {
    id: string;
    startAt: string;
    endAt: string;
  } | null;
}

export function useAttendance(storeId: string | null, date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  return useQuery<Attendance[]>({
    queryKey: ['attendance', storeId, dateStr],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/attendance`, {
        params: { date: dateStr },
      });
      return data;
    },
    enabled: !!storeId,
    refetchInterval: 30_000, // 30초마다 자동 갱신
  });
}
