import { Badge } from '@/components/ui';
import { formatTime } from '@workin/utils';

interface AttendanceBadgeProps {
  clockIn?: string;
  clockOut?: string;
  scheduledStart?: string;
}

export function AttendanceBadge({ clockIn, clockOut, scheduledStart }: AttendanceBadgeProps) {
  if (!clockIn) {
    return <Badge variant="gray" dot>미출근</Badge>;
  }

  // 지각 여부 (5분 초과)
  const isLate =
    scheduledStart &&
    new Date(clockIn).getTime() - new Date(scheduledStart).getTime() > 5 * 60 * 1000;

  if (clockOut) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <Badge variant="gray" dot>퇴근</Badge>
        <span className="text-xs text-gray-400">
          {formatTime(clockIn)} ~ {formatTime(clockOut)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Badge variant={isLate ? 'yellow' : 'green'} dot>
        {isLate ? '지각' : '출근 중'}
      </Badge>
      <span className="text-xs text-gray-400">{formatTime(clockIn)} 출근</span>
    </div>
  );
}
