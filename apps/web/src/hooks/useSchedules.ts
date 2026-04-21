import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

export interface Schedule {
  id: string;
  storeId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  memo?: string | null;
  staff: {
    id: string;
    user: { id: string; name: string };
  };
}

export interface CreateScheduleDto {
  staffId: string;
  startAt: string;
  endAt: string;
  memo?: string;
}

export function useSchedules(storeId: string | null, from: Date, to: Date) {
  return useQuery<Schedule[]>({
    queryKey: ['schedules', storeId, format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/schedules`, {
        params: { from: from.toISOString(), to: to.toISOString() },
      });
      return data;
    },
    enabled: !!storeId,
  });
}

export function useCreateSchedule(storeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateScheduleDto) =>
      api.post(`/stores/${storeId}/schedules`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', storeId] }),
  });
}

export function useDeleteSchedule(storeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      api.delete(`/stores/${storeId}/schedules/${scheduleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', storeId] }),
  });
}
