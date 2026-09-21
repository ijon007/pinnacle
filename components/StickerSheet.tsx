import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSheet } from '@/components/GlassSheet';
import { STICKERS, type StickerDef } from '@/lib/photoOverlays';
import type { StickerKind } from '@/lib/session';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (sticker: StickerKind) => void;
};

export function StickerSheet({ visible, onClose, onPick }: Props) {
  const { theme } = useUniwind();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';
  const muted = theme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(28,28,28,0.55)';

  return (
    <GlassSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: ink }]}>Stickers</Text>
        <Text style={[styles.sub, { color: muted }]}>
          Defaults for now — stats & location wire up next.
        </Text>
        <View style={styles.grid}>
          {STICKERS.map((sticker) => (
            <StickerCell
              key={sticker.id}
              sticker={sticker}
              labelColor={muted}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPick(sticker.id);
                onClose();
              }}
            />
          ))}
        </View>
      </View>
    </GlassSheet>
  );
}

function StickerCell({
  sticker,
  labelColor,
  onPress,
}: {
  sticker: StickerDef;
  labelColor: string;
  onPress: () => void;
}) {
  const iconOnly = !sticker.sample;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sticker.label}
      onPress={onPress}
      style={({ pressed }) => [styles.cell, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <View style={[styles.preview, iconOnly && styles.previewIcon]}>
        <SymbolView
          name={sticker.symbol as 'mappin.and.ellipse'}
          size={iconOnly ? 28 : 14}
          tintColor={sticker.tint}
        />
        {sticker.sample ? <Text style={styles.sample}>{sticker.sample}</Text> : null}
      </View>
      <Text style={[styles.cellLabel, { color: labelColor }]}>{sticker.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Instrument Serif',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: 2,
    marginBottom: 18,
    fontFamily: 'DM Sans',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    maxWidth: '33%',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    width: '100%',
    minHeight: 72,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  previewIcon: {
    minHeight: 72,
  },
  sample: {
    color: '#fff',
    fontFamily: 'DM Sans',
    fontSize: 13,
    fontWeight: '600',
  },
  cellLabel: {
    fontFamily: 'DM Sans',
    fontSize: 13,
  },
});
