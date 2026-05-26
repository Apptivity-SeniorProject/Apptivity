import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/src/utils/cn';
import { colors, opacity } from '@/src/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  isLoading?: boolean;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  textClassName?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-gray-100 border border-gray-200',
  outline: 'border border-primary bg-transparent',
  ghost: 'bg-transparent',
  link: 'bg-transparent',
};

const variantDisabledStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-300',
  secondary: 'opacity-50',
  outline: 'opacity-50',
  ghost: 'opacity-50',
  link: 'opacity-50',
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-gray-900',
  outline: 'text-primary-600',
  ghost: 'text-gray-700',
  link: 'text-primary-600',
};

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-10 px-4',
  md: 'h-12 px-5',
  lg: 'h-14 px-6',
};

const sizeTextStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  label,
  isLoading = false,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      className={cn(
        'items-center justify-center rounded-button',
        sizeStyles[size],
        variant === 'link' ? '' : variantStyles[variant],
        isDisabled && variantDisabledStyles[variant],
        className
      )}
      disabled={isDisabled}
      style={({ pressed }) => ({
        opacity: pressed && !isDisabled ? opacity.pressed : opacity.full,
      })}
      {...props}>
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryForeground : colors.primary}
        />
      ) : (
        <Text
          className={cn(
            'font-sans-semibold',
            sizeTextStyles[size],
            variantTextStyles[variant],
            variant === 'link' && 'underline',
            textClassName
          )}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
