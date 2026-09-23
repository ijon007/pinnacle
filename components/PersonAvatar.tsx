import { SymbolView } from 'expo-symbols';
import { Image, Text, View } from 'react-native';

import { initials } from '@/lib/leaderboard';
import { CHERRY } from '@/lib/theme';

type Props = {
  name: string;
  size: number;
  ink: string;
  you?: boolean;
  ring?: boolean;
  photoUri?: string | null;
};

export function PersonAvatar({ name, size, ink, you, ring, photoUri }: Props) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-muted"
      style={{
        width: size,
        height: size,
        borderWidth: ring || you ? 2 : 0,
        borderColor: ring || you ? CHERRY : 'transparent',
      }}>
      {you && photoUri ? (
        <Image
          source={{ uri: photoUri }}
          accessibilityIgnoresInvertColors
          style={{ width: size, height: size }}
        />
      ) : you ? (
        <SymbolView name="person.fill" size={Math.round(size * 0.45)} tintColor={ink} />
      ) : (
        <Text
          className="text-foreground"
          style={{
            fontFamily: 'DM Sans',
            fontWeight: '600',
            fontSize: Math.round(size * 0.32),
            letterSpacing: 0.2,
          }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
