import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

import { Switch } from '@/components/Switch';
import { CHERRY } from '@/lib/theme';

const WEEK_ON = [false, true, true, false, false, false, false];

type Scheme = 'light' | 'dark';

const PALETTE = {
  light: {
    screen: '#F8F8F8',
    ink: '#1C1C1C',
    muted: '#8A8A8A',
    card: '#FFFFFF',
    pill: '#E6E6E6',
    bezel: '#D8D8D8',
  },
  dark: {
    screen: '#1C1C1C',
    ink: '#F2F2F2',
    muted: '#A3A3A3',
    card: '#2A2A2A',
    pill: '#3A3A3A',
    bezel: '#0E0E0E',
  },
} as const;

export function AppearancePicker() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const selected: Scheme = theme === 'dark' ? 'dark' : 'light';

  return (
    <View>
      <View className="flex-row justify-around">
        {(['light', 'dark'] as const).map((scheme) => (
          <SchemeOption
            key={scheme}
            scheme={scheme}
            selected={selected === scheme}
            onSelect={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Uniwind.setTheme(scheme);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function SchemeOption({
  scheme,
  selected,
  onSelect,
}: {
  scheme: Scheme;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={scheme === 'light' ? 'Light appearance' : 'Dark appearance'}
      onPress={onSelect}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, alignItems: 'center' })}>
      <MiniLogsPhone scheme={scheme} />
      <Text
        className="mt-1 text-[15px] text-foreground"
        style={{ fontFamily: 'DM Sans', fontWeight: '500' }}>
        {scheme === 'light' ? 'Light' : 'Dark'}
      </Text>
      <View
        className="mt-1 items-center justify-center"
        style={[styles.radio, selected ? styles.radioOn : styles.radioOff]}>
        {selected ? (
          <SymbolView name="checkmark" size={12} tintColor="#fff" weight="bold" />
        ) : null}
      </View>
    </Pressable>
  );
}

function MiniLogsPhone({ scheme }: { scheme: Scheme }) {
  const c = PALETTE[scheme];
  return (
    <View pointerEvents="none" style={[styles.phone, { backgroundColor: c.bezel }]}>
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <View style={styles.header}>
          <Text style={[styles.logsTitle, { color: c.ink }]}>Logs</Text>
          <View style={[styles.plus, { backgroundColor: c.card }]}>
            <View style={[styles.plusBar, { backgroundColor: CHERRY, width: 6, height: 1.5 }]} />
            <View
              style={[
                styles.plusBar,
                { backgroundColor: CHERRY, width: 1.5, height: 6, position: 'absolute' },
              ]}
            />
          </View>
        </View>
        <Text style={[styles.count, { color: c.ink }]}>2</Text>
        <View style={styles.week}>
          {WEEK_ON.map((on, i) => (
            <View
              key={i}
              style={[
                styles.day,
                { backgroundColor: on ? CHERRY : c.pill },
                i === 2 ? { borderWidth: 1, borderColor: CHERRY } : null,
              ]}
            />
          ))}
        </View>
        <View style={[styles.list, { backgroundColor: c.card }]}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: c.ink }]} />
            <View style={styles.lines}>
              <View style={[styles.line, { backgroundColor: c.ink, width: 28 }]} />
              <View style={[styles.line, { backgroundColor: c.muted, width: 40 }]} />
            </View>
          </View>
          <View style={[styles.row, { marginTop: 5 }]}>
            <View style={[styles.icon, { backgroundColor: c.ink, opacity: 0.45 }]} />
            <View style={styles.lines}>
              <View style={[styles.line, { backgroundColor: c.ink, width: 22 }]} />
              <View style={[styles.line, { backgroundColor: c.muted, width: 34 }]} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: 104,
    height: 196,
    padding: 5,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  header: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plus: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBar: {
    borderRadius: 1,
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  clock: {
    fontFamily: 'DM Sans',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  logsTitle: {
    fontFamily: 'Instrument Serif',
    fontSize: 13,
    letterSpacing: -0.3,
  },
  count: {
    fontFamily: 'Instrument Serif',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  day: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  list: {
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  icon: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  lines: {
    gap: 3,
  },
  line: {
    height: 3,
    borderRadius: 1.5,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  radioOn: {
    backgroundColor: CHERRY,
  },
  radioOff: {
    borderWidth: 1.5,
    borderColor: 'rgba(127,127,127,0.45)',
  },
});
