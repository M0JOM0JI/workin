import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        green:  'bg-green-50  text-green-700  border-green-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        red:    'bg-red-50    text-red-700    border-red-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
        blue:   'bg-blue-50   text-blue-700   border-blue-100',
        gray:   'bg-gray-100  text-gray-600   border-gray-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
      },
    },
    defaultVariants: { variant: 'gray' },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'green'  && 'bg-green-500',
            variant === 'yellow' && 'bg-yellow-500',
            variant === 'red'    && 'bg-red-500',
            variant === 'orange' && 'bg-orange-500',
            variant === 'blue'   && 'bg-blue-500',
            variant === 'gray'   && 'bg-gray-400',
          )}
        />
      )}
      {children}
    </span>
  );
}
