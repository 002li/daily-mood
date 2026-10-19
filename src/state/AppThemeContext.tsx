import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { loadTheme, saveTheme } from '../storage/themeStorage';
import { themeColors, type AppTheme, type ThemeColors } from '../theme/appThemes';

type ThemeState = {
  theme: AppTheme; colors: ThemeColors; settingsOpen: boolean; saving: boolean; saveError: boolean;
  openSettings: () => void; closeSettings: () => void; chooseTheme: (theme: AppTheme) => Promise<void>;
};
const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>('liuli');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const writing = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setLoadError(false);
    void loadTheme(AsyncStorage).then(value => {
      if (active) { setTheme(value); setReady(true); }
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [attempt]);

  const chooseTheme = useCallback(async (next: AppTheme) => {
    if (writing.current || !ready) return;
    writing.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      // 写入成功才切换；写入期间禁用选项，避免并发覆盖主题偏好。
      await saveTheme(AsyncStorage, next);
      if (mounted.current) setTheme(next);
    } catch {
      if (mounted.current) setSaveError(true);
    } finally {
      writing.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [ready]);

  const colors = themeColors[theme];
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24, backgroundColor: colors.background }}>
    {loadError ? <>
      <Text style={{ color: colors.text }}>暂时没能恢复主题设置。</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="重试读取主题" onPress={() => setAttempt(value => value + 1)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 }}>
        <Text style={{ color: colors.primary }}>再试一次</Text>
      </Pressable>
    </> : <ActivityIndicator color={colors.primary} />}
  </View>;

  return <ThemeContext.Provider value={{ theme, colors, settingsOpen, saving, saveError,
    chooseTheme, openSettings: () => { setSaveError(false); setSettingsOpen(true); }, closeSettings: () => setSettingsOpen(false) }}>
    {children}
  </ThemeContext.Provider>;
}

export function useAppTheme() {
  const state = useContext(ThemeContext);
  if (!state) throw new Error('useAppTheme 必须在 AppThemeProvider 内使用。');
  return state;
}
