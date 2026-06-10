import { AlertTriangle } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { colors, fontFamily, layout, radius, shadows, spacing, typography, zIndex } from '@/src/constants/theme';
import { useErrorModalStore } from '@/src/store/useErrorModalStore';

export function ErrorModalHost() {
  const visible = useErrorModalStore((state) => state.visible);
  const title = useErrorModalStore((state) => state.title);
  const message = useErrorModalStore((state) => state.message);
  const hideError = useErrorModalStore((state) => state.hideError);

  if (!visible || !message) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={hideError}
      statusBarTranslucent>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          backgroundColor: colors.overlay,
        }}>
        <Pressable style={{ flex: 1, justifyContent: 'center' }} onPress={hideError}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: layout.maxContentWidth,
              alignSelf: 'center',
              borderRadius: radius['2xl'],
              backgroundColor: colors.surface,
              paddingHorizontal: spacing['2xl'],
              paddingTop: spacing['2xl'],
              paddingBottom: spacing.xl,
              borderWidth: 1,
              borderColor: colors.border,
              zIndex: zIndex.modal,
              ...shadows.lg,
            }}>
            <View
              style={{
                marginBottom: spacing.lg,
                height: 56,
                width: 56,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor: colors.errorLight,
              }}>
              <AlertTriangle color={colors.error} size={28} />
            </View>

            <Text
              style={{
                color: colors.text,
                fontSize: typography.xl.fontSize,
                lineHeight: typography.xl.lineHeight,
                fontFamily: fontFamily.bold,
              }}>
              {title}
            </Text>

            <Text
              style={{
                marginTop: spacing.sm,
                marginBottom: spacing.xl,
                color: colors.textSecondary,
                fontSize: typography.base.fontSize,
                lineHeight: typography.base.lineHeight,
                fontFamily: fontFamily.medium,
              }}>
              {message}
            </Text>

            <Button label="Tamam" onPress={hideError} />
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
