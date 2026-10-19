import { useCallback, type ReactNode } from 'react';
import { Animated, BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import type { AppTabParamList } from './AppNavigator';
import { spacePositions, type SpaceDestination } from './SpaceFlight';
import { useSpaceScene } from './SpaceScene';
import { getBackDestination } from './appNavigation';
import { useAppTheme } from '../state/AppThemeContext';
import { buildLiuliPageTrack } from './LiuliPageTransition';

// 每页在自己的轨道位置浮现；返回键与底部入口共用同一条导航链路。
export function SpacePage({ route, children, testID }: { route: SpaceDestination; children: ReactNode; testID?: string }) {
  const space = useSpaceScene();
  const { theme } = useAppTheme();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const position = spacePositions[route];
  const active = space.activeTab === route;
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const target = getBackDestination(route, space.running);
      if (target) {
        space.travel(target, () => navigation.navigate(target));
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [navigation, route, space.running, space.travel]));

  const track = theme === 'liuli' ? buildLiuliPageTrack(route, space.journey) : undefined;
  const interpolate = (outputRange: number[] | string[]) => space.progress.interpolate({ inputRange: track!.inputRange, outputRange, extrapolate: 'clamp' });
  const presentation = track ? {
    opacity: active ? interpolate(track.opacity) : 0,
    transform: [{ translateX: interpolate(track.x) }],
  } : {
    opacity: active ? space.progress.interpolate({ inputRange: [position - 0.5, position, position + 0.5], outputRange: [0, 1, 0], extrapolate: 'clamp' }) : 0,
    transform: [{ perspective: 1000 }, { translateY: route === 'Today' ? 0 : space.progress.interpolate({ inputRange: [position - 0.5, position, position + 0.5], outputRange: [18, 0, -18], extrapolate: 'clamp' }) }],
  };
  return <Animated.View testID={testID} pointerEvents={active && !space.running ? 'auto' : 'none'}
    aria-hidden={!active}
    accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    style={{ flex: 1, ...presentation }}>{children}</Animated.View>;
}
