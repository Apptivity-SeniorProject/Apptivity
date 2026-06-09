import { SlidersHorizontal, Search } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/src/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onFilterPress?: () => void;
  onFocus?: () => void;
  onPress?: () => void;
  autoFocus?: boolean;
  showFilterButton?: boolean;
  placeholder?: string;
  editable?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  onFilterPress,
  onFocus,
  onPress,
  autoFocus = false,
  showFilterButton = true,
  placeholder = 'Etkinlik veya kullanici ara...',
  editable = true,
}: SearchBarProps) {
  return (
    <View
      className="h-12 flex-row items-center rounded-xl px-3"
      style={{ borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface }}>
      <Search size={18} color={colors.icon} />
      {editable ? (
        <TextInput
          className="ml-2 flex-1 text-base"
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          autoFocus={autoFocus}
          returnKeyType="search"
          style={{ color: colors.inputText }}
        />
      ) : (
        <Pressable className="ml-2 flex-1 py-2" onPress={onPress ?? onFocus}>
          <Text
            className="text-base"
            style={{ color: value ? colors.inputText : colors.inputPlaceholder }}
            numberOfLines={1}>
            {value || placeholder}
          </Text>
        </Pressable>
      )}
      {showFilterButton && onFilterPress ? (
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.surfaceTertiary }}
          onPress={onFilterPress}>
          <SlidersHorizontal size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}
