import { cn } from '@/lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ className, hover, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'card',
        hover && 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150 cursor-pointer',
        padding === 'none' && 'p-0',
        padding === 'sm'   && 'p-4',
        padding === 'md'   && 'p-5',
        padding === 'lg'   && 'p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-sm font-semibold text-gray-500 uppercase tracking-wide', className)} {...props}>
      {children}
    </h3>
  );
}
