import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationIcon } from '../components/NavigationIcon';
import { useAppTheme } from '../state/AppThemeContext';
import { getPrimaryDestination, primaryDestinations } from './appNavigation';
import type { SpaceDestination } from './SpaceFlight';

export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index].name as SpaceDestination;
  const section = getPrimaryDestination(current);

  return <View testID="main-tab-bar" accessibilityRole="tablist" style={[styles.bar, {
    height: 60 + insets.bottom, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right,
    backgroundColor: theme === 'chamber' ? '#151C22ED' : colors.background,
  }]}>
    {primaryDestinations.map(name => {
      const route = state.routes.find(item => item.name === name)!;
      const selected = section === name;
      const color = selected ? colors.primary : colors.muted;
      const label = name === 'Today' ? '今天' : '轨迹';
      return <Pressable key={name} testID={`main-tab-${name}`} accessibilityRole="tab" accessibilityLabel={label}
        accessibilityState={{ selected }} aria-selected={selected}
        onPress={() => {
          // 沿用现有 tabPress / SpaceFlight 链路，快速点选仍保留最后一个目的地。
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!event.defaultPrevented && current !== name) navigation.navigate(name);
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.6 : 1 }]}>
        <NavigationIcon name={name} color={color} focused={selected} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'stretch' },
  tab: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 10, lineHeight: 16, fontWeight: '500' },
});
