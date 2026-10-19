import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NicknameScreen } from '../screens/NicknameScreen';
import { loadNickname, saveNickname } from '../storage/nicknameStorage';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';

type NicknameProfile = { nickname: string; updateNickname: (value: string) => Promise<void> };
const NicknameContext = createContext<NicknameProfile | undefined>(undefined);

export function NicknameProvider({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  // undefined = 还在读取；null = 尚未设置，避免启动时闪出取名页面。
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  const updateNickname = useCallback(async (value: string) => {
    // 写入成功才公布新昵称，失败时首页继续显示之前的名字。
    const savedName = await saveNickname(AsyncStorage, value);
    setNickname(savedName);
  }, []);

  useEffect(() => {
    let active = true;
    setLoadError(false);
    setNickname(undefined);
    void loadNickname(AsyncStorage).then((name) => {
      if (active) setNickname(name);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [readAttempt]);

  if (loadError || nickname === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.notice}>
          {loadError ? <>
            <Text style={styles.text} accessibilityLiveRegion="polite">暂时没能找回你的昵称。</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="重试读取昵称"
              onPress={() => setReadAttempt((value) => value + 1)}
              style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.retryText}>再试一次</Text>
            </Pressable>
          </> : <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.text}>正在打开…</Text>
          </>}
        </View>
      </SafeAreaView>
    );
  }

  if (nickname === null) {
    return <NicknameScreen onSave={updateNickname} />;
  }

  return <NicknameContext.Provider value={{ nickname, updateNickname }}>{children}</NicknameContext.Provider>;
}

export function useNickname() {
  return useNicknameProfile().nickname;
}

export function useNicknameProfile() {
  const profile = useContext(NicknameContext);
  if (profile === undefined) throw new Error('useNickname 必须在完成取名后的 NicknameProvider 内使用。');
  return profile;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 24 },
  retry: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' },
  retryText: { color: colors.primary, fontSize: 14, lineHeight: 24 },
});
