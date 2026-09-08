import { GlassView } from 'expo-glass-effect';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { hasLiquidGlass } from '@/lib/glass';

type Props = ComponentProps<typeof GlassView> & {
  children?: ReactNode;
  className?: string;
};

export function GlassSurface({
  children,
  className,
  style,
  glassEffectStyle = 'regular',
  ...rest
}: Props) {
  return (
    <GlassView
      {...rest}
      glassEffectStyle={hasLiquidGlass ? glassEffectStyle : 'none'}
      className={[!hasLiquidGlass && 'border-border bg-card', className].filter(Boolean).join(' ')}
      style={[!hasLiquidGlass && styles.fallback, style]}
    >
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

