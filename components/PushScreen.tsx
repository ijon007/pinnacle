import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';

type Props = {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
  /** Sits above the home indicator, outside the scroll. */
  footer?: ReactNode;
  backLabel?: string;
  keyboard?: boolean;
};

export function PushScreen({
  title,
  action,
  children,
  footer,
  backLabel = 'Back',
  keyboard = false,
}: Props) {
  const { theme } = useUniwind();
  const insets = useSafeAreaInsets();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        keyboardDismissMode={keyboard ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps={keyboard ? 'handled' : undefined}
        automaticallyAdjustKeyboardInsets={keyboard}
        contentContainerClassName="gap-5 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 4,
          paddingBottom: insets.bottom + (footer ? 96 : 28),
        }}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <GlassSurface
                fill={false}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ borderRadius: 999 }}>
                <SymbolView name="chevron.left" size={18} tintColor={ink} weight="semibold" />
              </GlassSurface>
            </Pressable>
            <Text
              className="shrink text-4xl tracking-tight text-foreground"
              style={{ fontFamily: 'Instrument Serif' }}
              numberOfLines={2}>
              {title}
            </Text>
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
      {footer ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: insets.bottom + 12,
          }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
