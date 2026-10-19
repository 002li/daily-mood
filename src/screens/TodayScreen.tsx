import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SoftMoodButton } from '../components/SoftMoodButton';
import { useAmbientMotion } from '../hooks/useAmbientMotion';
import { isLegacyMood, moods, selectableMoods, type MoodType } from '../models/mood';
import { useMoodRecords } from '../state/MoodRecordsContext';
import { useNickname } from '../state/NicknameContext';
import { chamberColors as colors } from '../theme/chamber';
import { planetAppearance, neutralPlanetAppearance } from '../theme/planetAppearance';
import { useSpaceScene } from '../navigation/SpaceScene';
import { SpacePage } from '../navigation/SpacePage';
import { useAppTheme } from '../state/AppThemeContext';
import { LiuliTodayScreen } from './LiuliTodayScreen';
import { ThemeSettingsButton } from '../components/ThemeSettings';

export function TodayScreen() {
  const { theme } = useAppTheme();
  return theme === 'liuli' ? <LiuliTodayScreen /> : <ChamberTodayScreen />;
}

function ChamberTodayScreen() {
  const nickname = useNickname();
  const { records, today, saveMood, status, errorKind, retry } = useMoodRecords();
  const selectedMood = records.find((record) => record.date === today)?.mood;
  const selection = moods.find((mood) => mood.type === selectedMood);
  const palette = selectedMood ? planetAppearance[selectedMood] : neutralPlanetAppearance;
  const space = useSpaceScene();
  const { reduceMotion, foreground } = useAmbientMotion();
  const focused = useIsFocused();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableHeight = height - insets.top - insets.bottom - 60;
  const compact = availableHeight < 680;
  // 为文字、四个选项和固定反馈留出空间，避免在临界高度突然溢出。
  const planetHeight = Math.max(168, Math.min(320, availableHeight - (compact ? 360 : 420)));
  const canSelect = status !== 'loading' && errorKind !== 'load' && !space.running;

  const chooseMood = (mood: MoodType) => {
    if (!canSelect) return;
    // 颜色立即反馈，持久存储完成后再显示“已记录”。
    saveMood(mood);
    space.respond();
    if (Platform.OS === 'android') {
      // 可选的轻触反馈不可用时，记录仍正常保存。
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick).catch(() => {});
    }
  };

  const recordStatus = status === 'loading'
    ? '正在找回你的心情…'
    : errorKind === 'load'
      ? '暂时没能读取记录'
      : errorKind === 'save'
        ? '这次还没保存成功'
        : status === 'saving'
          ? '正在留下今天的心情…'
          : selection
            ? '已记录今天的心情'
            : '点一种心情，轻轻留下今天';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <SpacePage route="Today" testID="today-observatory">
      <ScrollView testID="home-scroll" contentContainerStyle={[styles.content, compact && styles.compactContent]} showsVerticalScrollIndicator={false}
        onScroll={space.measureHome} scrollEventThrottle={32}>
        <View style={styles.topline}>
          <Text style={styles.brand} numberOfLines={1} ellipsizeMode="tail" accessibilityLabel={`昵称：${nickname}`}>{nickname}</Text>
          <ThemeSettingsButton />
        </View>
        <Text style={styles.eyebrow}>今天</Text>
        <Text style={[styles.title, compact && styles.compactTitle]} accessibilityRole="header">今天怎么样？</Text>

        <View testID="home-planet-slot" ref={space.registerPlanet} onLayout={space.measureHome} collapsable={false}
          style={{ height: planetHeight, marginTop: 6 }} />
        <View style={styles.caption}>
          <Text style={[styles.currentMood, { color: palette.ring }]} accessibilityLiveRegion="polite">
            {selection ? `${selection.label}${isLegacyMood(selection.type) ? ' · 旧记录' : ''}` : '还没记录'}
          </Text>
        </View>

        <Text style={[styles.choiceHint, compact && { marginTop: 14 }]}>轻触选择，会自动记录</Text>
        <View testID="home-choices" style={styles.choices}>
          {selectableMoods.map((mood) => (
            <SoftMoodButton
              key={mood.type} mood={mood} selected={selectedMood === mood.type}
              disabled={!canSelect} reduceMotion={reduceMotion}
              active={focused && foreground} onSelect={chooseMood}
            />
          ))}
        </View>
      </ScrollView>

        <View testID="home-feedback" style={styles.statusLine} accessibilityLiveRegion="polite">
          <Text accessible={false} style={[styles.statusMark, { color: errorKind ? '#F0BCA8' : palette.ring }]}>
            {errorKind ? '!' : selection && status !== 'saving' ? '✓' : '·'}
          </Text>
          <Text style={styles.statusText}>{recordStatus}</Text>
          {errorKind && (
            <Pressable accessibilityRole="button" accessibilityLabel="重新尝试保存或读取记录"
              onPress={retry} style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.retryText}>再试一次</Text>
            </Pressable>
          )}
        </View>
      </SpacePage>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  compactContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  brand: { color: colors.text, fontSize: 21, lineHeight: 28, fontWeight: '500', letterSpacing: 0.5, flexShrink: 1 },
  eyebrow: { marginTop: 3, color: colors.muted, fontSize: 12, lineHeight: 20 },
  title: { marginTop: 22, color: colors.text, fontSize: 23, lineHeight: 34, fontWeight: '500', letterSpacing: 0.5, textAlign: 'center' },
  compactTitle: { marginTop: 16, fontSize: 22, lineHeight: 32 },
  caption: { alignItems: 'center', marginTop: -2 },
  currentMood: { fontSize: 17, lineHeight: 27, fontWeight: '500', letterSpacing: 1 },
  choiceHint: { marginTop: 18, color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'center' },
  choices: { marginTop: 8, width: '100%', alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  statusLine: { minHeight: 44, marginHorizontal: 20, marginBottom: 4, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusMark: { width: 16, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  statusText: { color: colors.muted, fontSize: 12, lineHeight: 22, flexShrink: 1 },
  retry: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  retryText: { color: colors.primary, fontSize: 12, lineHeight: 21, fontWeight: '600' },
});
