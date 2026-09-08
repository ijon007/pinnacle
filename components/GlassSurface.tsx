import { GlassView } from 'expo-glass-effect';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { withUniwind } from 'uniwind';

import { hasLiquidGlass } from '@/lib/glass';

const UniwindGlassView = withUniwind(GlassView);

type Props = ComponentProps<typeof UniwindGlassView> & {
  children?: ReactNode;
};

export function GlassSurface({
  children,
  className,
  style,
  glassEffectStyle = 'regular',
  ...rest
}: Props) {
  return (
    <UniwindGlassView
      {...rest}
      glassEffectStyle={hasLiquidGlass ? glassEffectStyle : 'none'}
      className={[
        'overflow-hidden',
        !hasLiquidGlass && 'border-border bg-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={[!hasLiquidGlass && styles.fallback, style]}
    >
      {children}
    </UniwindGlassView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
