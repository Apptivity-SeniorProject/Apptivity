import { SlidersHorizontal, Search } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onFilterPress?: () => void;
}

export function SearchBar({ value, onChangeText, onFilterPress }: SearchBarProps) {
  return (
    <View className="h-12 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
      <Search size={18} color="#64748B" />
      <TextInput
        className="ml-2 flex-1 text-base text-slate-900"
        placeholder="Etkinlik ara..."
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable
        className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100"
        onPress={onFilterPress}>
        <SlidersHorizontal size={18} color="#334155" />
      </Pressable>
    </View>
  );
}
