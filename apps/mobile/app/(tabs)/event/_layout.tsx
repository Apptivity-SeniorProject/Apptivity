import { Stack } from 'expo-router';

export default function EventLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/participants" />
      <Stack.Screen name="[id]/chat" />
    </Stack>
  );
}
