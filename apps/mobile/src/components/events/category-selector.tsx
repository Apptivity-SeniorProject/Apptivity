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
                'rounded-full border-[1.5px] px-4 py-2',
                isSelected ? 'border-primary bg-primary-50' : 'border-surface-tertiary bg-surface-secondary'
              )}
              onPress={() => onToggle(category)}>
              <Text className={cn('text-sm font-sans-semibold', isSelected ? 'text-primary-800' : 'text-gray-500')}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
