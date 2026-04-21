import { Avatar, Badge, Card } from '@/components/ui';
import { formatKRW } from '@workin/utils';
import type { StoreStaff } from '@workin/types';

interface StaffCardProps {
  staff: StoreStaff & { monthlyHours?: number };
  onClick?: () => void;
}

const roleLabel: Record<string, { label: string; variant: 'blue' | 'purple' | 'gray' }> = {
  OWNER:   { label: '오너',   variant: 'purple' },
  MANAGER: { label: '매니저', variant: 'blue' },
  STAFF:   { label: '알바생', variant: 'gray' },
};

export function StaffCard({ staff, onClick }: StaffCardProps) {
  const role = roleLabel[staff.role] ?? roleLabel.STAFF;

  return (
    <Card hover padding="md" onClick={onClick}>
      <div className="flex items-center gap-3">
        <Avatar name={staff.user.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{staff.user.name}</p>
            <Badge variant={role.variant}>{role.label}</Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            시급 {formatKRW(staff.hourlyWage).replace('₩ ', '')}원
          </p>
        </div>
        {staff.monthlyHours !== undefined && (
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-700">{staff.monthlyHours}h</p>
            <p className="text-xs text-gray-400">이번달</p>
          </div>
        )}
      </div>
    </Card>
  );
}
