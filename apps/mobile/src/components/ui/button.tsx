import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

interface ButtonProps extends PressableProps {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Button({ label, containerStyle, ...props }: ButtonProps) {
  return (
    <Pressable style={[styles.button, containerStyle]} {...props}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
