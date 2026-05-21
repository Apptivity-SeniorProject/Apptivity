import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { cn } from '@/src/utils/cn';

interface CategoryItem {
  id: string;
  name: string;
}

interface CategorySelectorProps {
  categories: CategoryItem[];
  selectedIds: string[];
  onToggle: (category: CategoryItem) => void;
}

export function CategorySelector({ categories, selectedIds, onToggle }: CategorySelectorProps) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {categories.map((category) => {
          const isSelected = selectedIds.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              className={cn(
                'rounded-full border px-4 py-2',
                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
              )}
              onPress={() => onToggle(category)}>
              <Text className={cn('text-sm font-medium', isSelected ? 'text-white' : 'text-slate-700')}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
