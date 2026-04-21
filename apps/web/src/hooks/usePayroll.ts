import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

export interface PayrollItem {
  staffId: string;
  name: string;
  hourlyWage: number;
  totalMinutes: number;
  totalHours: number;
  basePay: number;
  deduction: number;
  netPay: number;
}

export interface PayrollSummary {
  year: number;
  month: number;
  staffCount: number;
  totalBasePay: number;
  totalDeduction: number;
  totalNetPay: number;
  items: PayrollItem[];
}

export function usePayroll(storeId: string | null, month: Date) {
  return useQuery<PayrollSummary>({
    queryKey: ['payroll', storeId, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${storeId}/payroll`, {
        params: { year: month.getFullYear(), month: month.getMonth() + 1 },
      });
      return data;
    },
    enabled: !!storeId,
  });
}
