import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useUniwind } from 'uniwind';

import { GlassSheet } from '@/components/GlassSheet';
import type { GeoPoint } from '@/lib/run';
import { type Session } from '@/lib/sessions';
import { CHERRY } from '@/lib/theme';

type Props = {
  session: Session | null;
  onClose: () => void;
};

function regionFor(route: GeoPoint[]) {
  let minLat = route[0]?.lat ?? 0;
  let maxLat = minLat;
  let minLng = route[0]?.lng ?? 0;
  let maxLng = minLng;
  for (const point of route) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.004, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.004, (maxLng - minLng) * 1.6),
  };
}

export function SessionPeek({ session, onClose }: Props) {
  const { theme } = useUniwind();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';
  const [held, setHeld] = useState<Session | null>(session);
  if (session && held?.id !== session.id) setHeld(session);
  const shown = session ?? held;
  const route = shown?.route && shown.route.length > 1 ? shown.route : null;
  const names = route ? [] : (shown?.exercises?.map((exercise) => exercise.name) ?? []);

  return (
    <GlassSheet visible={session != null} onClose={onClose}>
      {shown ? (
        <View style={styles.body}>
          <View className="flex-row items-start gap-3">
            <SymbolView name={shown.symbol} size={26} tintColor={ink} weight="medium" />
            <View className="min-w-0 flex-1">
              <Text className="text-foreground" style={styles.title}>
                {shown.name}
              </Text>
              <Text className="text-muted-foreground" style={styles.detail}>
                {shown.detail}
              </Text>
            </View>
            <Text className="text-foreground" style={styles.time}>
              {shown.time}
            </Text>
          </View>
          {route ? (
            <View style={styles.map}>
              <MapView
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
                initialRegion={regionFor(route)}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
                showsCompass={false}
                userInterfaceStyle={theme === 'dark' ? 'dark' : 'light'}>
                <Polyline
                  coordinates={route.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
                  strokeColor={CHERRY}
                  strokeWidth={4}
                  lineJoin="round"
                  lineCap="round"
                />
              </MapView>
            </View>
          ) : null}
          {names.length > 0 ? (
            <View className="mt-4 gap-2">
              {names.map((name) => (
                <Text key={name} className="text-base text-foreground" style={styles.line} numberOfLines={1}>
                  {name}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'Instrument Serif',
    fontSize: 34,
    letterSpacing: -0.6,
  },
  detail: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
  },
  time: {
    fontFamily: 'Instrument Serif',
    fontSize: 28,
    letterSpacing: -0.4,
  },
  map: {
    height: 168,
    marginTop: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  line: {
    fontFamily: 'DM Sans',
  },
});
