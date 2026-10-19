import { useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeSettingsButton } from '../components/ThemeSettings';
import { isLiuliMood, liuliMoods, type LiuliMood } from '../components/liuli/LiuliArt';
import { LiuliMoodButton } from '../components/liuli/LiuliMoodButton';
import { useAmbientMotion } from '../hooks/useAmbientMotion';
import { moods } from '../models/mood';
import { SpacePage } from '../navigation/SpacePage';
import { useSpaceScene } from '../navigation/SpaceScene';
import { useAppTheme } from '../state/AppThemeContext';
import { useMoodRecords } from '../state/MoodRecordsContext';
import { useNickname } from '../state/NicknameContext';
import { getMoodTint } from '../theme/appThemes';

export function LiuliTodayScreen() {
  const nickname = useNickname();
  const { colors, settingsOpen } = useAppTheme();
  const { records, today, saveMood, status, errorKind, retry } = useMoodRecords();
  const selected = records.find(record => record.date === today)?.mood;
  const choice = liuliMoods.find(item => item.type === selected);
  const legacy = selected && !isLiuliMood(selected) ? moods.find(item => item.type === selected) : undefined;
  const space = useSpaceScene();
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stageSize = Math.max(150, Math.min((frame.width || dimensions.width) - 40, 350,
    (frame.height || dimensions.height - 60) - insets.top - 310));
  const size = stageSize * 0.92;
  const { foreground, reduceMotion } = useAmbientMotion();
  const focused = useIsFocused();
  const active = focused && foreground && !settingsOpen;
  const canSelect = status !== 'loading' && errorKind !== 'load' && !space.running;
  const select = (mood: LiuliMood) => {
    if (!canSelect) return;
    saveMood(mood);
    space.respond();
    if (Platform.OS === 'android') void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick).catch(() => {});
  };
  const feedback = status === 'loading' ? '正在找回你的心情…' : errorKind === 'load' ? '暂时没能读取记录'
    : errorKind === 'save' ? '这次还没保存成功' : status === 'saving' ? '正在留下今天的心情…'
      : selected ? '已记录今天的心情' : '轻触一种心情，留下今天';

  return <SafeAreaView testID="liuli-today" style={styles.screen} edges={['top', 'left', 'right']}
    onLayout={({ nativeEvent: { layout } }) => setFrame(current => current.width === layout.width && current.height === layout.height
      ? current : { width: layout.width, height: layout.height })}>
    <SpacePage route="Today" testID="today-observatory">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={space.measureHome} scrollEventThrottle={32}>
        <View style={styles.topline}><Text style={styles.nickname} numberOfLines={1} accessibilityLabel={`昵称：${nickname}`}>{nickname}</Text><ThemeSettingsButton /></View>
        <Text style={styles.title} accessibilityRole="header">今天怎么样？</Text>
        <View testID="liuli-home-stage" style={{ width: stageSize, height: stageSize, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          <View testID="liuli-home-anchor" ref={space.registerPlanet} onLayout={space.measureHome} collapsable={false} style={{ width: size, height: size }} />
        </View>
        <Text testID="home-current-mood" style={[styles.mood, { color: selected ? getMoodTint(selected, 'liuli') : colors.text }]} accessibilityLiveRegion="polite">
          {choice?.label ?? (legacy ? `${legacy.label} · 旧记录` : '还没记录')}
        </Text>
        <Text testID="home-companion" style={[styles.note, { color: colors.muted }]}>{legacy ? '选择下方心情，可更新今天的记录。' : choice?.companion ?? '此刻的感受，选一个就好。'}</Text>
        <View testID="home-choices" style={styles.choices}>
          {liuliMoods.map(item => <LiuliMoodButton key={item.type} mood={item.type} selected={selected === item.type}
            disabled={!canSelect} reduced={reduceMotion || !active} onSelect={() => select(item.type)} />)}
        </View>
      </ScrollView>
      <View testID="home-feedback" style={styles.feedback} accessibilityLiveRegion="polite">
        <Text style={[styles.feedbackText, { color: errorKind ? colors.danger : colors.muted }]}>{feedback}</Text>
        {errorKind && <Pressable accessibilityRole="button" accessibilityLabel="重新尝试保存或读取记录" onPress={retry} style={styles.retry}>
          <Text style={{ color: colors.primary, fontSize: 12 }}>再试一次</Text>
        </Pressable>}
      </View>
    </SpacePage>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  topline: { minHeight: 44, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nickname: { color: '#203D51', fontSize: 20, lineHeight: 29, flexShrink: 1, fontWeight: '500' },
  title: { alignSelf: 'flex-start', color: '#203D51', fontSize: 26, lineHeight: 36, fontWeight: '500' },
  mood: { fontSize: 19, lineHeight: 29, fontWeight: '600' },
  note: { marginTop: 3, fontSize: 13, lineHeight: 22, textAlign: 'center' },
  choices: { marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  feedback: { minHeight: 44, marginHorizontal: 20, marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  feedbackText: { fontSize: 12, lineHeight: 21, flexShrink: 1 },
  retry: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
});
