import { cn } from '@/lib/cn';
import { formatTime } from '@workin/utils';

const STAFF_COLORS = [
  'bg-blue-100   text-blue-800   border-blue-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100  text-amber-800  border-amber-200',
  'bg-rose-100   text-rose-800   border-rose-200',
  'bg-cyan-100   text-cyan-800   border-cyan-200',
];

const STAFF_COLORS_CONFIRMED = [
  'bg-blue-500   text-white border-blue-600',
  'bg-violet-500 text-white border-violet-600',
  'bg-emerald-500 text-white border-emerald-600',
  'bg-amber-500  text-white border-amber-600',
  'bg-rose-500   text-white border-rose-600',
  'bg-cyan-500   text-white border-cyan-600',
];

export function getStaffColor(index: number) {
  return STAFF_COLORS[index % STAFF_COLORS.length];
}

interface ScheduleBlockProps {
  staffName: string;
  startAt: string;
  endAt: string;
  colorIndex?: number;
  isConfirmed?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ScheduleBlock({
  staffName, startAt, endAt, colorIndex = 0, isConfirmed = false, onClick, className,
}: ScheduleBlockProps) {
  const colorClass = isConfirmed
    ? STAFF_COLORS_CONFIRMED[colorIndex % STAFF_COLORS_CONFIRMED.length]
    : STAFF_COLORS[colorIndex % STAFF_COLORS.length];

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 border text-xs font-medium cursor-pointer',
        'hover:brightness-95 transition-all select-none',
        colorClass,
        className,
      )}
    >
      <p className="font-semibold truncate flex items-center gap-1">
        {isConfirmed && <span className="opacity-80">✓</span>}
        {staffName}
      </p>
      <p className="opacity-75">
        {formatTime(startAt)} ~ {formatTime(endAt)}
      </p>
    </div>
  );
}
