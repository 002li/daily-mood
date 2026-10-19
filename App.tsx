import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { MoodRecordsProvider } from './src/state/MoodRecordsContext';
import { NicknameProvider } from './src/state/NicknameContext';
import { colors } from './src/theme';
import { chamberColors } from './src/theme/chamber';
import { LiuliMotionPreview } from './src/screens/LiuliMotionPreview';
import { AppThemeProvider, useAppTheme } from './src/state/AppThemeContext';
import { ThemeSettings } from './src/components/ThemeSettings';

export default function App() {
  // 样板在存储 Provider 之前分流，试切心情不接触真实昵称和记录。
  const motionPreview = (Platform.OS === 'web' && typeof window !== 'undefined' && /^\/motion-preview\/?$/.test(window.location.pathname))
    || (__DEV__ && process.env.EXPO_PUBLIC_MOTION_PREVIEW === '1');
  if (motionPreview) return <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <StatusBar style="dark" />
    <View style={previewStyles.canvas}><View style={previewStyles.phone}><LiuliMotionPreview /></View></View>
  </SafeAreaProvider>;
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><AppThemeProvider><AppFrame /></AppThemeProvider></SafeAreaProvider>;
}

function AppFrame() {
  const { theme, colors: appColors } = useAppTheme();
  return (
    // 在应用入口统一提供安全区域，适配状态栏与安卓底部手势区域。
    <View style={{ flex: 1, backgroundColor: appColors.background }}>
      <StatusBar style={theme === 'liuli' ? 'dark' : 'light'} />
      <MoodRecordsProvider>
        <NicknameProvider>
          {Platform.OS === 'web' ? (
            // 浏览器只限制预览宽度，页面与交互继续复用手机 App 的代码。
            <View style={[previewStyles.canvas, { backgroundColor: appColors.background }]}>
              <View style={[previewStyles.phone, { backgroundColor: appColors.background }]}>
                <AppNavigator />
              </View>
            </View>
          ) : (
            <AppNavigator />
          )}
          <ThemeSettings />
        </NicknameProvider>
      </MoodRecordsProvider>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  canvas: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: chamberColors.background,
  },
});
