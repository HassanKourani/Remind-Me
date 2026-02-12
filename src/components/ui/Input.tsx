import { useState } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  icon,
  error,
  secureTextEntry,
  containerClassName,
  className,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      )}
      <View
        className={cn(
          'flex-row items-center rounded-xl border bg-white px-4 dark:bg-slate-800',
          error
            ? 'border-red-500'
            : 'border-slate-300 dark:border-slate-600'
        )}
      >
        {icon && <View className="mr-3">{icon}</View>}
        <TextInput
          className={cn(
            'flex-1 py-3 text-base text-slate-800 dark:text-slate-100',
            className
          )}
          placeholderTextColor="#94a3b8"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...props}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            {isPasswordVisible ? (
              <EyeOff size={20} color="#94a3b8" />
            ) : (
              <Eye size={20} color="#94a3b8" />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="mt-1 text-sm text-red-500">{error}</Text>
      )}
    </View>
  );
}
