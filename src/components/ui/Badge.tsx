import { View, Text } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'rounded-full px-2.5 py-0.5',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 dark:bg-slate-700',
        success: 'bg-green-100 dark:bg-green-900',
        warning: 'bg-amber-100 dark:bg-amber-900',
        danger: 'bg-red-100 dark:bg-red-900',
        info: 'bg-sky-100 dark:bg-sky-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const textVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      default: 'text-slate-700 dark:text-slate-300',
      success: 'text-green-700 dark:text-green-300',
      warning: 'text-amber-700 dark:text-amber-300',
      danger: 'text-red-700 dark:text-red-300',
      info: 'text-sky-700 dark:text-sky-300',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)}>
      <Text className={cn(textVariants({ variant }))}>{children}</Text>
    </View>
  );
}
