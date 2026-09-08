import { useMinimizeOnScroll } from 'expo-glass-tabs';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function TabScreen({ title, subtitle, action, children }: Props) {
  const onScroll = useMinimizeOnScroll();
  const insets = useSafeAreaInsets();

  return (
    <Animated.ScrollView
      className="flex-1 bg-background"
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerClassName="gap-5 px-5 pb-10"
      contentContainerStyle={{ paddingTop: insets.top + 4 }}>
      <View className="flex-row items-center justify-between">
        <Text
          className="text-4xl tracking-tight text-foreground"
          style={{ fontFamily: 'Instrument Serif' }}>
          {title}
        </Text>
        {action}
      </View>
      {subtitle ? (
        <Text className="-mt-3 text-base text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </Animated.ScrollView>
  );
}
