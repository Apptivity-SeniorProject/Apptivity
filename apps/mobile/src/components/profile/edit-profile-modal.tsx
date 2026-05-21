import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/utils/cn';
import type { TagDto } from '@/src/types/lookup';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  tags: TagDto[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function EditProfileModal({
  visible,
  onClose,
  tags,
  selectedTagIds,
  onToggleTag,
  onSave,
  isSaving = false,
}: EditProfileModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/35">
        <View className="max-h-[80%] rounded-t-3xl bg-white px-5 pb-6 pt-5">
          <Text className="text-lg font-semibold text-slate-900">Profili Duzenle</Text>
          <Text className="mt-2 text-sm text-slate-500">
            Ilgi alanlarini sec. Bu secimler Senin Icin onerilerini etkiler.
          </Text>

          <Text className="mb-3 mt-5 text-sm font-medium text-slate-700">Ilgi Alanlari</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-2 pb-2">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    className={cn(
                      'rounded-full border px-3 py-2',
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-slate-100'
                    )}
                    onPress={() => onToggleTag(tag.id)}>
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        isSelected ? 'text-white' : 'text-slate-700'
                      )}>
                      {tag.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="mt-5 flex-row gap-3">
            <Button
              label="Iptal"
              variant="secondary"
              className="flex-1"
              disabled={isSaving}
              onPress={onClose}
            />
            <Button
              label="Kaydet"
              className="flex-1"
              isLoading={isSaving}
              onPress={onSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
