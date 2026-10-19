import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { RecordsScreen } from '../screens/RecordsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { StatisticsScreen } from '../screens/StatisticsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { chamberColors } from '../theme/chamber';
import { SpaceScene, useSpaceScene } from './SpaceScene';
import type { SpaceDestination } from './SpaceFlight';
import { useAppTheme } from '../state/AppThemeContext';
import { MainTabBar } from './MainTabBar';

export type AppTabParamList = {
  Today: undefined;
  Records: undefined;
  Calendar: undefined;
  Statistics: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const tabLabels: Record<keyof AppTabParamList, string> = {
  Today: '今天', Records: '轨迹', Calendar: '日历', Statistics: '统计',
};

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: chamberColors.primary,
    background: 'transparent',
    card: chamberColors.background,
    text: chamberColors.text,
    border: '#DDE4DF18',
  },
};

export function AppNavigator() {
  return <SpaceScene><SpaceNavigator /></SpaceScene>;
}

function SpaceNavigator() {
  const { theme, colors } = useAppTheme();
  const navigationRef = useNavigationContainerRef<AppTabParamList>();
  const space = useSpaceScene();

  return (
    <NavigationContainer ref={navigationRef} theme={{ ...navigationTheme, dark: theme === 'chamber', colors: {
      ...navigationTheme.colors, primary: colors.primary, card: colors.background, text: colors.text, border: colors.border,
    } }}
      onStateChange={() => { const route = navigationRef.getCurrentRoute(); if (route) space.setActiveTab(route.name as SpaceDestination); }}>
      <StatusBar style={theme === 'liuli' ? 'dark' : 'light'} />
      {/* 四条页面路由共用现有镜头；主导航只展示今天和轨迹。 */}
      <Tab.Navigator
        initialRouteName="Today"
        backBehavior="none"
        tabBar={props => <MainTabBar {...props} />}
        screenListeners={({ route, navigation }) => ({
          tabPress: (event) => {
            const current = navigationRef.getCurrentRoute()?.name;
            if (!space.running && current === route.name) return;
            event.preventDefault();
            space.travel(route.name, () => navigation.navigate(route.name));
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          animation: 'none',
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarAccessibilityLabel: tabLabels[route.name],
        })}
      >
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{ title: '今天' }}
        />
        <Tab.Screen
          name="Records"
          component={RecordsScreen}
          options={{ title: '轨迹' }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ title: '日历' }}
        />
        <Tab.Screen
          name="Statistics"
          component={StatisticsScreen}
          options={{ title: '统计' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
