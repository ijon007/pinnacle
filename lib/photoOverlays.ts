import type { TextStyle, ViewStyle } from 'react-native';

import type { StickerKind, TextStyleId } from '@/lib/session';
import { CHERRY } from '@/lib/theme';

export type TextStyleDef = {
  id: TextStyleId;
  label: string;
};

/** Story captions: two faces, plus the IG background cycle (plain / highlight / solid). */
export const TEXT_STYLES: TextStyleDef[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'solid', label: 'Solid' },
  { id: 'neon', label: 'Neon' },
  { id: 'type', label: 'Type' },
];

export const TEXT_COLORS = ['#ffffff', '#161616', CHERRY, '#ff8a3d', '#ffe14a', '#3dd68c', '#5b8cff', '#e7a4ff'];

export function textLook(
  id: TextStyleId | undefined,
  color = '#ffffff',
): { wrap?: ViewStyle; input: TextStyle } {
  const ink = color || '#ffffff';
  const onFill = inkOn(ink);
  const shadow = onFill === '#161616' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';
  const base: TextStyle = {
    textAlign: 'center',
    textShadowColor: shadow,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  };
  if (id === 'modern') {
    return {
      input: {
        ...base,
        color: ink,
        fontFamily: 'DM Sans',
        fontSize: 22,
        lineHeight: 26,
        fontWeight: '700',
        letterSpacing: -0.6,
      },
    };
  }
  if (id === 'highlight') {
    const text = inkOn(ink);
    return {
      wrap: {
        backgroundColor: hexAlpha(ink, text === '#161616' ? 0.9 : 0.5),
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      },
      input: {
        color: text,
        fontFamily: 'DM Sans',
        fontSize: 22,
        lineHeight: 26,
        fontWeight: '700',
        letterSpacing: -0.4,
        textAlign: 'center',
      },
    };
  }
  if (id === 'solid') {
    return {
      wrap: {
        backgroundColor: ink,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
      },
      input: {
        color: onFill,
        fontFamily: 'DM Sans',
        fontSize: 22,
        lineHeight: 26,
        fontWeight: '700',
        letterSpacing: -0.4,
        textAlign: 'center',
      },
    };
  }
  if (id === 'neon') {
    return {
      input: {
        color: ink,
        fontFamily: 'DM Sans',
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '700',
        letterSpacing: 0.2,
        textAlign: 'center',
        textShadowColor: ink,
        textShadowRadius: 14,
        textShadowOffset: { width: 0, height: 0 },
      },
    };
  }
  if (id === 'type') {
    return {
      input: {
        ...base,
        color: ink,
        fontFamily: 'DM Sans',
        fontSize: 18,
        lineHeight: 22,
        fontWeight: '600',
        letterSpacing: 2.4,
        textTransform: 'uppercase',
      },
    };
  }
  return {
    input: {
      ...base,
      color: ink,
      fontFamily: 'Instrument Serif',
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.4,
    },
  };
}

function inkOn(hex: string): '#161616' | '#ffffff' {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return '#161616';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.62 ? '#161616' : '#ffffff';
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
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
