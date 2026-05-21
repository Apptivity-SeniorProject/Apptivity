import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { createReport } from '@/src/api/reportService';
import { Button } from '@/src/components/ui/button';
import { useToast } from '@/src/hooks/useToast';
import { getApiErrorMessage } from '@/src/utils/error';
import type { ReportReasonCategory, ReportReasonOption, ReportTargetType } from '@/src/types/report';

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
  const toast = useToast();

  const reportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      toast.success('Raporunuz alindi.');
      setDescription('');
      setSelectedReason(1);
      onClose();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/30">
        <View className="rounded-t-3xl bg-white px-5 pb-6 pt-5">
          <Text className="text-lg font-semibold text-slate-900">Rapor Et</Text>

          <Text className="mt-4 text-sm font-medium text-slate-700">Sebep</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {REASONS.map((reason) => {
              const isSelected = reason.value === selectedReason;
              return (
                <Pressable
                  key={reason.value}
                  className={isSelected ? 'rounded-full bg-rose-600 px-3 py-2' : 'rounded-full bg-slate-100 px-3 py-2'}
                  onPress={() => setSelectedReason(reason.value)}>
                  <Text className={isSelected ? 'text-xs font-semibold text-white' : 'text-xs font-semibold text-slate-700'}>
                    {reason.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-4 text-sm font-medium text-slate-700">Detaylar</Text>
          <TextInput
            multiline
            numberOfLines={4}
            className="mt-2 min-h-28 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900"
            placeholder="Kisa bir aciklama yazin..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />

          <View className="mt-5 flex-row gap-3">
            <Button
              label="Vazgec"
              className="flex-1 bg-slate-200"
              textClassName="text-slate-700"
              onPress={onClose}
            />
            <Button
              label="Gonder"
              className="flex-1 bg-rose-600"
              isLoading={reportMutation.isPending}
              onPress={() =>
                reportMutation.mutate({
                  targetId,
                  targetType,
                  reasonCategory: selectedReason,
                  description: description.trim() || 'N/A',
                })
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
