import { useMinimizeOnScroll } from 'expo-glass-tabs';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

type Props = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export function TabScreen({ title, subtitle, children }: Props) {
  const onScroll = useMinimizeOnScroll();

  return (
    <Animated.ScrollView
      className="flex-1 bg-background"
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerClassName="gap-4 px-5 pb-10 pt-4"
    >
      <View className="gap-1">
        <Text className="font-sans text-4xl text-foreground">{title}</Text>
        <Text className="font-serif text-base text-muted-foreground">{subtitle}</Text>
      </View>
      {children}
    </Animated.ScrollView>
  );
}
