import { Text } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { TabScreen } from '@/components/TabScreen';

export default function ProfileScreen() {
  return (
    <TabScreen title="Profile" subtitle="You, at Pinnacle.">
      <GlassSurface className="rounded-lg p-5">
        <Text className="font-serif text-lg text-card-foreground">Athlete</Text>
        <Text className="mt-1 font-serif text-sm text-muted-foreground">
          Sign in and stats will show up here.
        </Text>
      </GlassSurface>
    </TabScreen>
  );
}
