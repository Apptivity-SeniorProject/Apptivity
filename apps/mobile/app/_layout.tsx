import { RootNavigator } from '@/src/components/navigation/root-navigator';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return <RootNavigator />;
}
