import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronDown, ImagePlus, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { createReport, uploadReportEvidence } from '@/src/api/reportService';
import { Button } from '@/src/components/ui/button';
import { useToast } from '@/src/hooks/useToast';
import { getApiErrorMessage } from '@/src/utils/error';
import type { ReportImageAsset, ReportReasonCategory, ReportReasonOption, ReportTargetType } from '@/src/types/report';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType: ReportTargetType;
}

const REASONS: ReportReasonOption[] = [
  { label: 'Spam', value: 1 },
  { label: 'Uygunsuz Icerik', value: 2 },
  { label: 'Sahte Icerik', value: 3 },
  { label: 'Taciz', value: 4 },
  { label: 'Siddet', value: 5 },
  { label: 'Diger', value: 6 },
];

export function ReportModal({ visible, onClose, targetId, targetType }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReasonCategory>(1);
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<ReportImageAsset | null>(null);
  const [isReasonListOpen, setIsReasonListOpen] = useState(false);
  const toast = useToast();

  const resetForm = () => {
    setDescription('');
    setSelectedReason(1);
    setSelectedImage(null);
    setIsReasonListOpen(false);
  };

  const closeModal = () => {
    if (reportMutation.isPending) {
      return;
    }

    resetForm();
    onClose();
  };

  const selectedReasonLabel = REASONS.find((reason) => reason.value === selectedReason)?.label ?? 'Sebep sec';

  const selectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      toast.error('Gorsel secmek icin galeri izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    setSelectedImage({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  };

  const reportMutation = useMutation({
    mutationFn: async () => {
      let evidenceImageUrl: string | undefined;

      if (selectedImage) {
        evidenceImageUrl = await uploadReportEvidence(selectedImage);
      }

      await createReport({
        targetId,
        targetType,
        reasonCategory: selectedReason,
        description: description.trim() || undefined,
        evidenceImageUrl,
      });
    },
    onSuccess: () => {
      toast.success('Raporunuz alindi.');
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={closeModal}>
      <View className="flex-1 justify-end bg-black/30">
        <View className="rounded-t-3xl bg-white px-5 pb-6 pt-5" style={{ maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-lg font-semibold text-slate-900">Rapor Et</Text>

            <Text className="mt-4 text-sm font-medium text-slate-700">Sebep</Text>
            <Pressable
              className="mt-2 flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              onPress={() => setIsReasonListOpen((current) => !current)}>
              <Text className="text-sm text-slate-900">{selectedReasonLabel}</Text>
              <ChevronDown size={18} color="#64748B" />
            </Pressable>

            {isReasonListOpen ? (
              <View className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                {REASONS.map((reason) => {
                  const isSelected = reason.value === selectedReason;
                  return (
                    <Pressable
                      key={reason.value}
                      className={isSelected ? 'rounded-lg bg-rose-50 px-3 py-3' : 'rounded-lg px-3 py-3'}
                      onPress={() => {
                        setSelectedReason(reason.value);
                        setIsReasonListOpen(false);
                      }}>
                      <Text className={isSelected ? 'text-sm font-semibold text-rose-600' : 'text-sm text-slate-700'}>
                        {reason.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Text className="mt-4 text-sm font-medium text-slate-700">Yorum</Text>
            <TextInput
              multiline
              numberOfLines={4}
              className="mt-2 min-h-28 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900"
              placeholder="Isterseniz detay ekleyin..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />

            <Text className="mt-4 text-sm font-medium text-slate-700">Gorsel (Opsiyonel)</Text>
            <Button
              label={selectedImage ? 'Gorseli Degistir' : 'Gorsel Sec'}
              variant="secondary"
              className="mt-2"
              onPress={selectImage}
            />

            {selectedImage ? (
              <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <ImagePlus size={16} color="#475569" />
                    <Text className="text-sm text-slate-700">Secilen gorsel</Text>
                  </View>
                  <Pressable onPress={() => setSelectedImage(null)}>
                    <X size={18} color="#ef4444" />
                  </Pressable>
                </View>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={{ width: '100%', height: 180, borderRadius: 16 }}
                  contentFit="cover"
                  transition={120}
                />
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Button
                label="Vazgec"
                className="flex-1 bg-slate-200"
                textClassName="text-slate-700"
                onPress={closeModal}
              />
              <Button
                label="Gonder"
                className="flex-1 bg-rose-600"
                isLoading={reportMutation.isPending}
                onPress={() => reportMutation.mutate()}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
