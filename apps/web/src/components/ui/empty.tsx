import { cn } from '@/lib/cn';
import { Button } from './button';

interface EmptyProps {
  icon?: React.ReactNode;
  title?: string;
  label?: string;   // alias for title
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function Empty({ icon, title, label, description, action, className }: EmptyProps) {
  const text = title ?? label ?? '';
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="text-gray-300 mb-4 text-5xl">{icon}</div>}
      <p className="text-sm font-medium text-gray-700">{text}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
