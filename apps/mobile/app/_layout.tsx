import { RootNavigator } from '@/src/components/navigation/root-navigator';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return <RootNavigator />;
}
