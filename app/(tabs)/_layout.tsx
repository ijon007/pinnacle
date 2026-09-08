import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { TabBarMinimizeProvider } from 'expo-glass-tabs';

export default function TabLayout() {
  return (
    <TabBarMinimizeProvider>
      <NativeTabs minimizeBehavior="never">
        <NativeTabs.Trigger name="logs" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'list.clipboard', selected: 'list.clipboard.fill' }}
            md={{ default: 'assignment', selected: 'assignment' }}
          />
          <NativeTabs.Trigger.Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="leaderboard" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'trophy', selected: 'trophy.fill' }}
            md={{ default: 'emoji_events', selected: 'emoji_events' }}
          />
          <NativeTabs.Trigger.Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="shots" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'camera', selected: 'camera.fill' }}
            md={{ default: 'photo_camera', selected: 'photo_camera' }}
          />
          <NativeTabs.Trigger.Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person', selected: 'person.fill' }}
            md={{ default: 'person', selected: 'person' }}
          />
          <NativeTabs.Trigger.Label hidden />
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabBarMinimizeProvider>
  );
}
