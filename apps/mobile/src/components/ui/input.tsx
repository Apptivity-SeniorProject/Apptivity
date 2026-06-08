import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/src/utils/cn';
import { colors, hitSlop } from '@/src/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  className,
  containerClassName,
  secureTextEntry,
  multiline,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View className={cn('w-full', containerClassName)}>
      {label ? (
        <Text className="mb-1.5 font-sans-medium text-sm text-gray-700">{label}</Text>
      ) : null}

      <View className="relative">
        <TextInput
          className={cn(
            multiline
              ? 'min-h-24 rounded-card border bg-surface-secondary px-4 py-3 font-sans text-base text-gray-900'
              : 'h-12 rounded-button border bg-surface-secondary px-4 font-sans text-base text-gray-900',
            error ? 'border-error' : 'border-gray-200',
            'focus:border-primary',
            className
          )}
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry={isSecure}
          multiline={multiline}
          style={multiline ? { textAlignVertical: 'top' } : undefined}
          {...props}
        />

        {secureTextEntry && !multiline ? (
          <Pressable
            className="absolute right-0 top-0 h-12 items-center justify-center px-4"
            hitSlop={hitSlop.sm}
            onPress={() => setIsPasswordVisible((prev) => !prev)}>
            <Text className="font-sans-medium text-sm text-primary-600">
              {isPasswordVisible ? 'Gizle' : 'Göster'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text className="mt-1 font-sans text-xs text-error">{error}</Text>
      ) : hint && !error ? (
        <Text className="mt-1 font-sans text-xs text-gray-400">{hint}</Text>
      ) : null}
    </View>
  );
}
