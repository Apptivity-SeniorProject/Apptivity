import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import type { TagDto } from '@/src/types/lookup';
import { cn } from '@/src/utils/cn';

interface RegisterInterestsModalProps {
  visible: boolean;
  onClose: () => void;
  tags: TagDto[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
}

export function RegisterInterestsModal({
  visible,
  onClose,
  tags,
  selectedTagIds,
  onToggleTag,
}: RegisterInterestsModalProps) {
  const [searchText, setSearchText] = useState('');

  const filteredTags = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedSearch) {
      return tags;
    }

    return tags.filter((tag) => tag.name.toLocaleLowerCase('tr-TR').includes(normalizedSearch));
  }, [searchText, tags]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags]
  );

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <View className="max-h-[82%] rounded-t-3xl bg-white px-5 pb-6 pt-5">
          <Text className="text-lg font-semibold text-slate-900">İlgi Alanlarını Seç</Text>
          <Text className="mt-2 text-sm text-slate-500">
            Hepsini bir anda doldurmak zorunda değilsin. Beğendiğin etkinlik türlerini seç, önerileri buna göre düzenleyelim.
          </Text>

          <Input
            containerClassName="mt-4"
            placeholder="Tag ara"
            value={searchText}
            onChangeText={setSearchText}
          />

          {selectedTags.length > 0 ? (
            <View className="mt-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">
                Seçtiklerin ({selectedTags.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {selectedTags.map((tag) => (
                    <Pressable
                      key={tag.id}
                      className="rounded-full border border-[#5bcc2a] bg-[#5bcc2a] px-3 py-2"
                      onPress={() => onToggleTag(tag.id)}>
                      <Text className="text-xs font-semibold text-white">{tag.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <Text className="mb-3 mt-5 text-sm font-medium text-slate-700">Tüm Taglar</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-2 pb-2">
              {filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    className={cn(
                      'rounded-full border px-3 py-2',
                      isSelected ? 'border-[#5bcc2a] bg-[#5bcc2a]' : 'border-slate-200 bg-slate-100'
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

            {filteredTags.length === 0 ? (
              <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
                <Text className="text-sm text-slate-500">Aramana uyan tag bulunamadı.</Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="mt-5 flex-row gap-3">
            <Button label="Kapat" variant="secondary" className="flex-1" onPress={onClose} />
            <Button label="Tamam" className="flex-1" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
