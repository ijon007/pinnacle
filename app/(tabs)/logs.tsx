import { Text, View } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { TabScreen } from '@/components/TabScreen';

export default function LogsScreen() {
  return (
    <TabScreen title="Logs" subtitle="Sessions, sets, and notes.">
      <GlassSurface className="rounded-lg p-5" isInteractive>
        <Text className="font-serif text-lg text-card-foreground">No sessions yet</Text>
        <Text className="mt-1 font-serif text-sm text-muted-foreground">
          Your training log will land here.
        </Text>
      </GlassSurface>
      <View className="h-24" />
    </TabScreen>
  );
}
