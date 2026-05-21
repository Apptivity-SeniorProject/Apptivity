import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/src/utils/cn';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
  textClassName?: string;
}

export function Button({
  label,
  isLoading = false,
  variant = 'primary',
  disabled = false,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      className={cn(
        'h-12 items-center justify-center rounded-xl',
        variant === 'primary' && 'bg-blue-600',
        variant === 'secondary' && 'border border-slate-300 bg-white',
        variant === 'primary' && isDisabled && 'bg-blue-400',
        variant === 'secondary' && isDisabled && 'opacity-60',
        className
      )}
      disabled={isDisabled}
      {...props}>
      {isLoading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#0f172a' : '#FFFFFF'} />
      ) : (
        <Text
          className={cn(
            'text-base font-semibold',
            variant === 'primary' ? 'text-white' : 'text-slate-900',
            textClassName
          )}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
