import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import type { TagDto } from '@/src/types/lookup';
import { cn } from '@/src/utils/cn';
import { normalizePossiblyMojibakeText } from '@/src/utils/text';

interface TagSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  tags: TagDto[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  title: string;
  description: string;
  searchPlaceholder?: string;
  selectedSectionTitle?: string;
  allTagsSectionTitle?: string;
  emptyStateText?: string;
  primaryActionLabel?: string;
  presentation?: 'sheet' | 'popover';
  topOffset?: number;
}

export function TagSelectionModal({
  visible,
  onClose,
  tags,
  selectedTagIds,
  onToggleTag,
  title,
  description,
  searchPlaceholder = 'İlgi alanı ara',
  selectedSectionTitle = 'Seçtiklerin',
  allTagsSectionTitle = 'Tüm ilgi alanları',
  emptyStateText = 'Aramana uyan ilgi alanı bulunamadı.',
  primaryActionLabel = 'Tamam',
  presentation = 'sheet',
  topOffset = 120,
}: TagSelectionModalProps) {
  const [searchText, setSearchText] = useState('');
  const isPopover = presentation === 'popover';

  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  const normalizedTags = useMemo(
    () => tags.map((tag) => ({ ...tag, name: normalizePossiblyMojibakeText(tag.name) })),
    [tags]
  );

  const filteredTags = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedSearch) {
      return normalizedTags;
    }

    return normalizedTags.filter((tag) =>
      tag.name.toLocaleLowerCase('tr-TR').includes(normalizedSearch)
    );
  }, [normalizedTags, searchText]);

  const selectedTags = useMemo(
    () => normalizedTags.filter((tag) => selectedTagIds.includes(tag.id)),
    [normalizedTags, selectedTagIds]
  );

  return (
    <Modal
      animationType={isPopover ? 'fade' : 'slide'}
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View
          className={cn('flex-1 bg-black/35', isPopover ? 'justify-start' : 'justify-end')}
          style={isPopover ? { paddingTop: topOffset, paddingHorizontal: 16 } : undefined}>
          <Pressable className="absolute inset-0" onPress={onClose} />

          <View
            className={cn(
              'bg-white px-5 pb-6 pt-5',
              isPopover ? 'max-h-[72%] rounded-3xl' : 'max-h-[82%] rounded-t-3xl'
            )}>
            <Text className="text-lg font-semibold text-slate-900">{title}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-500">{description}</Text>

            <Input
              containerClassName="mt-4"
              placeholder={searchPlaceholder}
              value={searchText}
              onChangeText={setSearchText}
            />

            {selectedTags.length > 0 ? (
              <View className="mt-4">
                <Text className="mb-2 text-sm font-medium text-slate-700">
                  {selectedSectionTitle} ({selectedTags.length})
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

            <Text className="mb-3 mt-5 text-sm font-medium text-slate-700">
              {allTagsSectionTitle}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2 pb-2">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      className={cn(
                        'rounded-full border px-3 py-2',
                        isSelected
                          ? 'border-[#5bcc2a] bg-[#5bcc2a]'
                          : 'border-slate-200 bg-slate-100'
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
                  <Text className="text-sm text-slate-500">{emptyStateText}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View className="mt-5 flex-row gap-3">
              <Button label="Kapat" variant="secondary" className="flex-1" onPress={onClose} />
              <Button label={primaryActionLabel} className="flex-1" onPress={onClose} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
