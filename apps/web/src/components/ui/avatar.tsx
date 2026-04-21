import { cn } from '@/lib/cn';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-16 h-16 text-xl',
};

/** 이름에서 색상 결정 (일관성 있는 색상 매핑) */
function getAvatarColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500',  'bg-cyan-500',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name.slice(0, 1);
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0 overflow-hidden',
        sizeMap[size],
        !src && getAvatarColor(name),
        className,
      )}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
