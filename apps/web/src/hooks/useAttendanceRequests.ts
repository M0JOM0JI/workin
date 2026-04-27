import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceRequest {
  id: string;
  storeId: string;
  staffId: string;
  requestedById: string;
  attendanceId: string | null;
  requestedClockIn: string;
  requestedClockOut: string | null;
  reason: string;
  status: RequestStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  staff: { user: { id: string; name: string } };
  requestedBy: { id: string; name: string };
  attendance: { id: string; clockIn: string; clockOut: string | null } | null;
}

export function useAttendanceRequests(storeId: string | null, status?: RequestStatus) {
  return useQuery<AttendanceRequest[]>({
    queryKey: ['attendance-requests', storeId, status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get(`/stores/${storeId}/attendance-requests${params}`);
      return data;
    },
    enabled: !!storeId,
  });
}

export function useMyAttendanceRequests() {
  return useQuery<AttendanceRequest[]>({
    queryKey: ['my-attendance-requests'],
    queryFn: async () => {
      const { data } = await api.get('/me/attendance-requests');
      return data;
    },
  });
}

export function useReviewRequest(storeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status, reviewNote }: { requestId: string; status: 'APPROVED' | 'REJECTED'; reviewNote?: string }) =>
      api.patch(`/stores/${storeId}/attendance-requests/${requestId}/review`, { status, reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-requests', storeId] });
      qc.invalidateQueries({ queryKey: ['attendance', storeId] });
    },
  });
}

export function useCreateAttendanceRequest(storeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      attendanceId?: string | null;
      requestedClockIn: string;
      requestedClockOut?: string | null;
      reason: string;
      staffId?: string;
    }) => api.post(`/stores/${storeId}/attendance-requests`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-requests', storeId] });
      qc.invalidateQueries({ queryKey: ['attendance', storeId] });
    },
  });
}
