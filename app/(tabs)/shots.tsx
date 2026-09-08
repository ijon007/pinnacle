import { GlassContainer } from 'expo-glass-effect';
import { Text, View } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { TabScreen } from '@/components/TabScreen';

export default function ShotsScreen() {
  return (
    <TabScreen title="Shots" subtitle="Start a session, log time, shoot as you go.">
      <GlassContainer spacing={12}>
        <View className="flex-row gap-3">
          <GlassSurface className="flex-1 items-center rounded-lg p-5" isInteractive>
            <Text className="font-serif text-base text-card-foreground">Capture</Text>
          </GlassSurface>
          <GlassSurface className="flex-1 items-center rounded-lg p-5" isInteractive>
            <Text className="font-serif text-base text-card-foreground">Edit</Text>
          </GlassSurface>
          <GlassSurface className="flex-1 items-center rounded-lg p-5" isInteractive>
            <Text className="font-serif text-base text-card-foreground">Share</Text>
          </GlassSurface>
        </View>
      </GlassContainer>
    </TabScreen>
  );
}
