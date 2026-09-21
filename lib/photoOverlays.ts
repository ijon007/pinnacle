import type { TextStyle, ViewStyle } from 'react-native';

import type { StickerKind, TextStyleId } from '@/lib/session';
import { CHERRY } from '@/lib/theme';

export type TextStyleDef = {
  id: TextStyleId;
  label: string;
  input: TextStyle;
  wrap?: ViewStyle;
};

/** Instagram-ish caption looks from the two loaded faces. */
export const TEXT_STYLES: TextStyleDef[] = [
  {
    id: 'classic',
    label: 'Classic',
    input: {
      color: '#fff',
      fontFamily: 'Instrument Serif',
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.4,
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.55)',
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 1 },
    },
  },
  {
    id: 'modern',
    label: 'Modern',
    input: {
      color: '#fff',
      fontFamily: 'DM Sans',
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '700',
      letterSpacing: -0.6,
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowRadius: 6,
      textShadowOffset: { width: 0, height: 1 },
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    input: {
      color: CHERRY,
      fontFamily: 'DM Sans',
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '700',
      letterSpacing: 0.4,
      textAlign: 'center',
      textShadowColor: CHERRY,
      textShadowRadius: 14,
      textShadowOffset: { width: 0, height: 0 },
    },
  },
  {
    id: 'strong',
    label: 'Strong',
    wrap: {
      backgroundColor: '#fff',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    input: {
      color: '#111',
      fontFamily: 'DM Sans',
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '700',
      letterSpacing: -0.3,
      textAlign: 'center',
    },
  },
  {
    id: 'type',
    label: 'Type',
    input: {
      color: '#fff',
      fontFamily: 'DM Sans',
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '600',
      letterSpacing: 3.2,
      textTransform: 'uppercase',
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.55)',
      textShadowRadius: 6,
      textShadowOffset: { width: 0, height: 1 },
    },
  },
  {
    id: 'outline',
    label: 'Outline',
    input: {
      color: '#fff',
      fontFamily: 'Instrument Serif',
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.5,
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.95)',
      textShadowRadius: 1.5,
      textShadowOffset: { width: 0, height: 0 },
    },
  },
];

export function textStyleDef(id: TextStyleId | undefined): TextStyleDef {
  return TEXT_STYLES.find((s) => s.id === id) ?? TEXT_STYLES[0]!;
}

export type StickerDef = {
  id: StickerKind;
  label: string;
  /** Placeholder copy until live stats / geocode hook in. */
  sample: string;
  symbol: string;
  tint: string;
};

export const STICKERS: StickerDef[] = [
  {
    id: 'location',
    label: 'Location',
    sample: 'Somewhere',
    symbol: 'mappin.and.ellipse',
    tint: '#fff',
  },
  {
    id: 'distance',
    label: 'Distance',
    sample: '5.2 km',
    symbol: 'figure.run',
    tint: '#fff',
  },
  {
    id: 'pace',
    label: 'Pace',
    sample: '5:24 /km',
    symbol: 'speedometer',
    tint: '#fff',
  },
  {
    id: 'duration',
    label: 'Time',
    sample: '28:14',
    symbol: 'timer',
    tint: '#fff',
  },
  {
    id: 'heart',
    label: 'Heart',
    sample: '',
    symbol: 'heart.fill',
    tint: CHERRY,
  },
  {
    id: 'flame',
    label: 'Flame',
    sample: '',
    symbol: 'flame.fill',
    tint: '#ff8a3d',
  },
];

export function stickerDef(id: StickerKind): StickerDef {
  return STICKERS.find((s) => s.id === id) ?? STICKERS[0]!;
}
