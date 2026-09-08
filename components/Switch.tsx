import { Switch as RNSwitch, type SwitchProps } from 'react-native';

import { CHERRY } from '@/lib/theme';

export function Switch(props: SwitchProps) {
  return (
    <RNSwitch
      {...props}
      trackColor={{ false: 'rgba(120,120,128,0.32)', true: CHERRY }}
      thumbColor="#fff"
      ios_backgroundColor="rgba(120,120,128,0.32)"
    />
  );
}
