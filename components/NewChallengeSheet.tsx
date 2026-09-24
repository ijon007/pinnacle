import SegmentedControl from '@expo/ui/community/segmented-control';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSheet } from '@/components/GlassSheet';
import { GlassSurface } from '@/components/GlassSurface';
import { createChallenge, type Metric } from '@/lib/challenges';
import { useFriends } from '@/lib/friends';
import { useProfile } from '@/lib/profile';
import { CHERRY } from '@/lib/theme';

const METRICS = ['km', 'sessions', 'streak'] as const;
const GOALS: Record<Metric, readonly number[]> = {
  km: [10, 25, 50, 100],
  sessions: [3, 5, 8, 12],
  streak: [3, 5, 7, 14],
};
const DAYS = [3, 7, 14, 30] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function NewChallengeSheet({ visible, onClose, onCreated }: Props) {
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : '#1c1c1c';
  const profile = useProfile();
  const friends = useFriends().filter((person) => person.status === 'friend');
  const [metricIndex, setMetricIndex] = useState(0);
  const [goalIndex, setGoalIndex] = useState(1);
  const [dayIndex, setDayIndex] = useState(1);
  const [invited, setInvited] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setMetricIndex(0);
    setGoalIndex(1);
    setDayIndex(1);
    setInvited([]);
  }, [visible]);

  const metric = METRICS[metricIndex] ?? 'km';
  const goals = GOALS[metric];
  const goal = goals[Math.min(goalIndex, goals.length - 1)] ?? goals[0];
  const days = DAYS[dayIndex] ?? DAYS[1];
  const title =
    metric === 'km'
      ? `${goal} km in ${days} days`
      : metric === 'sessions'
        ? `${goal} sessions in ${days} days`
        : `${goal}-day streak`;

  const create = () => {
    createChallenge({
      title,
      metric,
      goal,
      endsInDays: days,
      handle: profile.username,
      invite: invited,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreated();
    onClose();
  };

  return (
    <GlassSheet visible={visible} onClose={onClose}>
      <View className="gap-4 px-4 pb-3">
        <Text
          className="text-3xl tracking-tight text-foreground"
          style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.4 }}>
          {title}
        </Text>
        <SegmentedControl
          values={['Distance', 'Sessions', 'Streak']}
          selectedIndex={metricIndex}
          appearance={dark ? 'dark' : 'light'}
          onChange={(event) => {
            const next = event.nativeEvent.selectedSegmentIndex;
            if (next === metricIndex) return;
            setMetricIndex(next);
            setGoalIndex(1);
            void Haptics.selectionAsync();
          }}
        />
        <Stepper
          label="Goal"
          value={metric === 'km' ? `${goal} km` : metric === 'sessions' ? `${goal}` : `${goal} days`}
          ink={ink}
          canDec={goalIndex > 0}
          canInc={goalIndex < goals.length - 1}
          onDec={() => setGoalIndex((index) => Math.max(0, index - 1))}
          onInc={() => setGoalIndex((index) => Math.min(goals.length - 1, index + 1))}
        />
        <Stepper
          label="Length"
          value={`${days} days`}
          ink={ink}
          canDec={dayIndex > 0}
          canInc={dayIndex < DAYS.length - 1}
          onDec={() => setDayIndex((index) => Math.max(0, index - 1))}
          onInc={() => setDayIndex((index) => Math.min(DAYS.length - 1, index + 1))}
        />
        {friends.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {friends.map((person) => {
              const on = invited.includes(person.handle);
              return (
                <Pressable
                  key={person.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${on ? 'Remove' : 'Invite'} ${person.name}`}
                  accessibilityState={{ selected: on }}
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  onPress={() =>
                    setInvited((current) =>
                      on ? current.filter((handle) => handle !== person.handle) : [...current, person.handle],
                    )
                  }
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                  <GlassSurface
                    fill={false}
                    tintColor={on ? CHERRY : undefined}
                    className="h-8 items-center justify-center rounded-full px-3">
                    <Text
                      className={`text-[13px] ${on ? 'text-white' : 'text-foreground'}`}
                      style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
                      @{person.handle}
                    </Text>
                  </GlassSurface>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create challenge"
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={create}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <GlassSurface
            fill={false}
            tintColor={CHERRY}
            className="h-12 items-center justify-center"
            style={{ borderRadius: 999 }}>
            <Text className="text-[16px] text-white" style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
              Create
            </Text>
          </GlassSurface>
        </Pressable>
      </View>
    </GlassSheet>
  );
}

function Stepper({
  label,
  value,
  ink,
  canDec,
  canInc,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  ink: string;
  canDec: boolean;
  canInc: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View>
        <Text className="text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          {label}
        </Text>
        <Text
          className="text-2xl tracking-tight text-foreground"
          style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.3 }}>
          {value}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Step symbol="minus" ink={ink} enabled={canDec} label={`Decrease ${label}`} onPress={onDec} />
        <Step symbol="plus" ink={ink} enabled={canInc} label={`Increase ${label}`} onPress={onInc} />
      </View>
    </View>
  );
}

function Step({
  symbol,
  ink,
  enabled,
  label,
  onPress,
}: {
  symbol: 'minus' | 'plus';
  ink: string;
  enabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!enabled}
      onPressIn={() => {
        if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: enabled ? 1 : 0.35,
        transform: [{ scale: pressed && enabled ? 0.97 : 1 }],
      })}>
      <GlassSurface
        fill={false}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ borderRadius: 999 }}>
        <Text className="text-[20px]" style={{ color: ink, fontFamily: 'DM Sans' }}>
          {symbol === 'minus' ? '–' : '+'}
        </Text>
      </GlassSurface>
    </Pressable>
  );
}
