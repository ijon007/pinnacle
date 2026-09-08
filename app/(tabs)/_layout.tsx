import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { TabBarMinimizeProvider } from 'expo-glass-tabs';
import { DynamicColorIOS, Platform } from 'react-native';

import { CHERRY } from '@/lib/theme';

const idleIcon =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: '#737373', dark: '#C4C4C4' })
    : '#8E8E93';

export default function TabLayout() {
  return (
    <TabBarMinimizeProvider>
      <NativeTabs
        minimizeBehavior="never"
        iconColor={{ default: idleIcon, selected: CHERRY }}
        labelStyle={{
          default: { color: idleIcon },
          selected: { color: CHERRY },
        }}>
        <NativeTabs.Trigger name="live" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'record.circle.fill', selected: 'record.circle.fill' }}
            md={{ default: 'timer', selected: 'timer' }}
          />
          <NativeTabs.Trigger.Label>Live</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="logs" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'book.fill', selected: 'book.fill' }}
            md={{ default: 'menu_book', selected: 'menu_book' }}
          />
          <NativeTabs.Trigger.Label>Logs</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="leaderboard" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'medal.fill', selected: 'medal.fill' }}
            md={{ default: 'emoji_events', selected: 'emoji_events' }}
          />
          <NativeTabs.Trigger.Label>Ranks</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person.crop.circle.fill', selected: 'person.crop.circle.fill' }}
            md={{ default: 'person', selected: 'person' }}
          />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabBarMinimizeProvider>
  );
}
