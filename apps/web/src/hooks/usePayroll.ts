import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

export type InsuranceType = 'NONE' | 'THREE_THREE' | 'FOUR_MAJOR';

export interface PayrollItem {
  staffId: string;
  name: string;
  hourlyWage: number;
  insuranceType: InsuranceType;
  totalMinutes: number;
  regularMinutes: number;
  nightMinutes: number;
  overtimeMinutes: number;
  basePay: number;
  nightAllowance: number;
  overtimePay: number;
  weeklyAllowance: number;
  deduction: number;
  netPay: number;
}

export interface PayrollSummary {
  yearMonth: string;
  staffCount: number;
  totalBasePay: number;
  totalNightAllowance: number;
  totalOvertimePay: number;
  totalWeeklyAllowance: number;
  totalDeduction: number;
  totalNetPay: number;
  items: PayrollItem[];
}

export interface PayrollDetail extends PayrollItem {
  staff: { id: string; name: string; hourlyWage: number; insuranceType: InsuranceType };
  isConfirmed: boolean;
  confirmedAt: string | null;
  attendances: { id: string; clockIn: string; clockOut: string | null }[];
}

export function usePayroll(storeId: string | null, month: Date) {
  return useQuery<PayrollSummary>({
    queryKey: ['payroll', storeId, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/payroll`, {
        params: { yearMonth: format(month, 'yyyy-MM') },
      });
      return data;
    },
    enabled: !!storeId,
  });
}

export function useConfirmPayroll(storeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, yearMonth }: { staffId: string; yearMonth: string }) =>
      api.post(`/stores/${storeId}/payroll/${staffId}/confirm`, null, { params: { yearMonth } }),
    onSuccess: (_data, { yearMonth }) => {
      qc.invalidateQueries({ queryKey: ['payroll', storeId, yearMonth] });
      qc.invalidateQueries({ queryKey: ['payroll-detail'] });
    },
  });
}
