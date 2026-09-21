import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { AppearancePicker } from '@/components/AppearancePicker';
import { GlassSurface } from '@/components/GlassSurface';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { TabScreen } from '@/components/TabScreen';
import { useProfile } from '@/lib/profile';

export default function ProfileScreen() {
  const profile = useProfile();
  const { theme } = useUniwind();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';

  return (
    <TabScreen
      title="Profile"
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={() => router.push('/edit-profile')}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <GlassSurface className="h-11 items-center justify-center rounded-full px-4">
            <Text
              className="text-[15px] text-card-foreground"
              style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
              Edit
            </Text>
          </GlassSurface>
        </Pressable>
      }>
      <View className="items-start gap-1 pt-1">
        <ProfileAvatar uri={profile.photoUri} size={80} ink={ink} />
        <Text
          className="mt-2 text-2xl tracking-tight text-foreground"
          style={{ fontFamily: 'Instrument Serif' }}>
          {profile.name}
        </Text>
        <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          @{profile.username}
        </Text>
        {profile.bio ? (
          <Text className="mt-0.5 text-[15px] text-foreground" style={{ fontFamily: 'DM Sans' }}>
            {profile.bio}
          </Text>
        ) : null}
        <Text className="mt-1 text-[15px]" style={{ fontFamily: 'DM Sans' }}>
          <Text className="text-foreground" style={{ fontWeight: '600' }}>
            12
          </Text>
          <Text className="text-muted-foreground"> friends</Text>
        </Text>
      </View>

      <Text
        className="mt-2 text-[13px] text-muted-foreground"
        style={{ fontFamily: 'DM Sans', letterSpacing: 0.2 }}>
        Appearance
      </Text>
      <GlassSurface className="rounded-lg px-3 py-5">
        <AppearancePicker />
      </GlassSurface>
    </TabScreen>
  );
}
