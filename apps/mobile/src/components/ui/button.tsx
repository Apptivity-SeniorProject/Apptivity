import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/src/utils/cn';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  isLoading?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({
  label,
  isLoading = false,
  disabled = false,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      className={cn(
        'h-12 items-center justify-center rounded-xl bg-blue-600',
        isDisabled && 'bg-blue-400',
        className
      )}
      disabled={isDisabled}
      {...props}>
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className={cn('text-base font-semibold text-white', textClassName)}>{label}</Text>
      )}
    </Pressable>
  );
}
