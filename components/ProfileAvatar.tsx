import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, View } from 'react-native';

type Props = {
  uri: string | null;
  size: number;
  ink: string;
};

export function ProfileAvatar({ uri, size, ink }: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = Boolean(uri) && failedUri !== uri;

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-muted"
      style={{ width: size, height: size }}>
      {showPhoto ? (
        <Image
          source={{ uri: uri ?? undefined }}
          accessibilityIgnoresInvertColors
          onError={() => setFailedUri(uri)}
          style={{ width: size, height: size }}
        />
      ) : (
        <SymbolView name="person.fill" size={Math.round(size * 0.45)} tintColor={ink} />
      )}
    </View>
  );
}
