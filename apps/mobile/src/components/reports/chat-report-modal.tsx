import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { createChatReport } from '@/src/api/chatService';
import { Button } from '@/src/components/ui/button';
import { useToast } from '@/src/hooks/useToast';
import { getApiErrorMessage } from '@/src/utils/error';
import type { ReportReasonCategory, ReportReasonOption } from '@/src/types/report';

interface ChatReportModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}

const REASONS: ReportReasonOption[] = [
  { label: 'Spam', value: 1 },
  { label: 'Uygunsuz Icerik', value: 2 },
  { label: 'Sahte Icerik', value: 3 },
  { label: 'Taciz', value: 4 },
  { label: 'Siddet', value: 5 },
  { label: 'Diger', value: 6 },
];

export function ChatReportModal({ visible, onClose, eventId }: ChatReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReasonCategory>(1);
  const [description, setDescription] = useState('');
  const [isReasonListOpen, setIsReasonListOpen] = useState(false);
  const toast = useToast();

  const resetForm = () => {
    setDescription('');
    setSelectedReason(1);
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

  const reportMutation = useMutation({
    mutationFn: async () => {
      await createChatReport({
        eventId,
        reasonCategory: selectedReason,
        description: description.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Sohbet basariyla raporlandi. Sizin isminizle mevcut mesaj gecmisi kaydedildi.');
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
            <Text className="text-lg font-semibold text-slate-900">Sohbeti Rapor Et</Text>
            <Text className="mt-2 text-sm text-slate-500">
              Bu sohbeti raporladiginizda, su ana kadar gonderilen tüm mesajlar incelenmesi icin raporunuza eklenecektir.
            </Text>

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
