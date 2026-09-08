import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSheet } from '@/components/GlassSheet';
import { GlassSurface } from '@/components/GlassSurface';
import { emptyVoiceSamples, meteringToLevel, VoiceBars } from '@/components/VoiceBars';
import { CHERRY } from '@/lib/theme';

type Phase = 'idle' | 'recording' | 'review';

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogged: (entry: { durationMillis: number; uri: string | null }) => void;
};

const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export function VoiceLogSheet({ visible, onClose, onLogged }: Props) {
  return (
    <GlassSheet visible={visible} onClose={onClose}>
      <VoiceLogBody onClose={onClose} onLogged={onLogged} />
    </GlassSheet>
  );
}

function VoiceLogBody({
  onClose,
  onLogged,
}: {
  onClose: () => void;
  onLogged: (entry: { durationMillis: number; uri: string | null }) => void;
}) {
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : '#1c1c1c';
  const recorder = useAudioRecorder(OPTIONS);
  const rec = useAudioRecorderState(recorder, 50);
  const [phase, setPhase] = useState<Phase>('idle');
  const [hint, setHint] = useState<string | null>(null);
  const [samples, setSamples] = useState(emptyVoiceSamples);
  const [durationMillis, setDurationMillis] = useState(0);

  useEffect(() => {
    if (phase !== 'recording') return;
    setSamples((prev) => [...prev.slice(1), meteringToLevel(rec.metering, rec.durationMillis)]);
    setDurationMillis(rec.durationMillis);
  }, [phase, rec.metering, rec.durationMillis]);

  useEffect(() => {
    return () => {
      void recorder.stop().catch(() => undefined);
    };
  }, [recorder]);

  const start = async () => {
    setHint(null);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setHint('Microphone access is needed to explain a workout.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSamples(emptyVoiceSamples());
      setDurationMillis(0);
      setPhase('recording');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      setHint('Could not start the microphone.');
    }
  };

  const stop = async () => {
    await recorder.stop();
    setDurationMillis(rec.durationMillis);
    setPhase('review');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancel = async () => {
    if (phase === 'recording') await recorder.stop().catch(() => undefined);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const log = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onLogged({ durationMillis, uri: recorder.uri ?? rec.url });
    onClose();
  };

  return (
    <View style={styles.body}>
      <Text className="text-foreground" style={styles.title}>
        Log workout
      </Text>

      {phase === 'idle' ? (
        <View style={styles.block}>
          <Text className="text-muted-foreground" style={styles.lede}>
            Explain what you trained. We’ll turn it into a session.
          </Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <Btn onPress={start} label="Explain the workout">
            <SymbolView name="mic.fill" size={18} tintColor={CHERRY} weight="semibold" />
            <Text style={[styles.btnLabel, { color: ink }]}>Explain the workout</Text>
          </Btn>
        </View>
      ) : null}

      {phase === 'recording' ? (
        <View style={styles.block}>
          <Text className="text-muted-foreground" style={styles.lede}>
            Listening · {clock(rec.durationMillis)}
          </Text>
          <VoiceBars samples={samples} />
          <Btn onPress={stop} label="Stop recording">
            <SymbolView name="stop.fill" size={16} tintColor={ink} weight="bold" />
            <Text style={[styles.btnLabel, { color: ink }]}>Stop</Text>
          </Btn>
        </View>
      ) : null}

      {phase === 'review' ? (
        <View style={styles.block}>
          <Text className="text-muted-foreground" style={styles.lede}>
            That’s {clock(durationMillis)}. Log it, or throw it away.
          </Text>
          <VoiceBars samples={samples} />
          <View style={styles.row}>
            <Btn onPress={cancel} label="Cancel" stretch>
              <Text style={[styles.btnLabel, { color: ink }]}>Cancel</Text>
            </Btn>
            <Btn onPress={log} label="Add workout" stretch tint={CHERRY}>
              <Text style={[styles.btnLabel, { color: '#fff' }]}>Add workout</Text>
            </Btn>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Btn({
  onPress,
  label,
  children,
  tint,
  stretch,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  tint?: string;
  stretch?: boolean;
}) {
  return (
    <View style={stretch ? styles.flex : styles.full} collapsable={false}>
      <GlassSurface
        fill={false}
        glassEffectStyle="regular"
        tintColor={tint}
        className="flex-1"
        style={styles.pill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={onPress}
          style={({ pressed }) => [
            styles.hit,
            { transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}>
          {children}
        </Pressable>
      </GlassSurface>
    </View>
  );
}

function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: {
    fontFamily: 'Instrument Serif',
    fontSize: 34,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  block: {
    gap: 16,
  },
  lede: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.72,
  },
  hint: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: CHERRY,
  },
  btnLabel: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
  },
  pill: {
    borderCurve: 'continuous',
    borderRadius: 999,
    height: 48,
    width: '100%',
  },
  hit: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  full: {
    alignSelf: 'stretch',
    width: '100%',
  },
  flex: { flex: 1 },
});
