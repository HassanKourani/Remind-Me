import { Pressable, View } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps {
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Card({ onPress, children, className }: CardProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800',
        className
      )}
    >
      {children}
    </Wrapper>
  );
}
