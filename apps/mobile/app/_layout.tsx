import { RootNavigator } from '@/src/components/navigation/root-navigator';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  return <RootNavigator />;
}
