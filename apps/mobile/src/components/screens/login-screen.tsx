import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { useAuthStore } from '@/src/store/useAuthStore';

export function LoginScreen() {
  const setTokens = useAuthStore((state) => state.setTokens);

  const handleMockLogin = () => {
    setTokens('demo-access-token', 'demo-refresh-token');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>
          Replace this screen with your real authentication flow.
        </Text>
        <Button containerStyle={styles.button} label="Continue (Mock Login)" onPress={handleMockLogin} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 32,
    width: '100%',
  },
});
