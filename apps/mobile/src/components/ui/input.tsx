import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/src/utils/cn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({ label, error, className, containerClassName, ...props }: InputProps) {
  return (
    <View className={cn('w-full', containerClassName)}>
      {label ? <Text className="mb-2 text-sm font-medium text-slate-700">{label}</Text> : null}
      <TextInput
        className={cn(
          'h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900',
          'focus:border-blue-500',
          error && 'border-red-500',
          className
        )}
        placeholderTextColor="#94A3B8"
        {...props}
      />
      {error ? <Text className="mt-1 text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}
