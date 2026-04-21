import { Avatar } from '@/components/ui';
import { formatKRW, formatMinutes } from '@workin/utils';
import type { Payroll } from '@workin/types';

interface PayrollRowProps {
  payroll: Payroll;
  onClick?: () => void;
}

export function PayrollRow({ payroll, onClick }: PayrollRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <Avatar name={payroll.name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{payroll.name}</p>
        <p className="text-xs text-gray-400">{formatMinutes(payroll.totalMinutes)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-gray-900">{formatKRW(payroll.netPay)}</p>
        <p className="text-xs text-gray-400 line-through">{formatKRW(payroll.basePay)}</p>
      </div>
    </div>
  );
}
