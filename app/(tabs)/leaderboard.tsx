import { Text } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { TabScreen } from '@/components/TabScreen';

export default function LeaderboardScreen() {
  return (
    <TabScreen title="Leaderboard" subtitle="How you stack up.">
      <GlassSurface className="rounded-lg p-5">
        <Text className="font-serif text-lg text-card-foreground">Ranks unlock with logs</Text>
        <Text className="mt-1 font-serif text-sm text-muted-foreground">
          Climb the board once you start tracking sessions.
        </Text>
      </GlassSurface>
    </TabScreen>
  );
}
