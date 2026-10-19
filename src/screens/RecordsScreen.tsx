import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConstellationTrail } from '../components/ConstellationTrail';
import { useMoodRecords } from '../state/MoodRecordsContext';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';
import { useSpaceScene } from '../navigation/SpaceScene';
import type { AppTabParamList } from '../navigation/AppNavigator';
import { SpacePage } from '../navigation/SpacePage';
import { NavigationIcon } from '../components/NavigationIcon';
import { liuliReturnLayout } from '../navigation/LiuliCamera';

export function RecordsScreen() {
  const { colors, theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { records, today, status, errorKind, retry } = useMoodRecords();
  const loadFailed = errorKind === 'load';
  const space = useSpaceScene();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const goHome = useCallback(() => space.travel('Today', () => navigation.navigate('Today')), [navigation, space.travel]);

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <SpacePage route="Records" testID="records-observatory">
      <View style={styles.header}>
        <View style={styles.headingRow}>
          <Text style={styles.title} accessibilityRole="header">心情星座</Text>
          <Pressable onPress={goHome} accessibilityRole="button" accessibilityLabel="回到星球" disabled={space.running}
            style={({ pressed }) => [styles.homeButton, theme === 'liuli' && styles.liuliHomeButton, { opacity: pressed ? 0.6 : 1 }]}>
            {theme === 'liuli' && <View testID="liuli-return-anchor" style={{ width: liuliReturnLayout.planetSize, height: liuliReturnLayout.planetSize, flexShrink: 0 }} />}
            <Text style={styles.homeLabel} numberOfLines={1}>{theme === 'liuli' ? '回到星球' : '回到星球 ↗'}</Text>
          </Pressable>
        </View>
        <Text style={styles.description}>左右滑动，查看每天的心情。</Text>
        <View style={styles.tools}>
          {([{ route: 'Calendar', label: '日历', name: '打开心情日历' },
            { route: 'Statistics', label: '近 30 天', name: '打开近30天统计' }] as const).map(item => <Pressable key={item.route}
            testID={`records-open-${item.route}`} accessibilityRole="button" accessibilityLabel={item.name}
            onPress={() => space.travel(item.route, () => navigation.navigate(item.route))}
            style={({ pressed }) => [styles.tool, { opacity: pressed ? 0.6 : 1 }]}>
            <NavigationIcon name={item.route} color={colors.primary} focused={false} />
            <Text style={styles.toolLabel}>{item.label}</Text>
          </Pressable>)}
        </View>
      </View>
      {errorKind === 'save' && <View style={styles.notice} accessibilityLiveRegion="polite">
        <Text style={styles.noticeText}>最新心情尚未保存</Text>
        <RetryButton onPress={retry} />
      </View>}
      {status === 'saving' && <Text style={styles.saving} accessibilityLiveRegion="polite">正在保存最新状态…</Text>}
      {status === 'loading' || loadFailed ? <View style={styles.empty}>
        {loadFailed ? <>
          <Text style={styles.emptyTitle}>暂时没能读取记录</Text>
          <Text style={styles.emptyNote}>再试一次，找回之前留下的心情。</Text>
          <RetryButton onPress={retry} />
        </> : <>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyNote}>正在找回你的星空…</Text>
        </>}
      </View> : <ConstellationTrail records={records} today={today} active={space.activeTab === 'Records' && !space.running}
        spaceProgress={theme === 'liuli' ? space.progress : undefined} />}
    </SpacePage>
  </SafeAreaView>;
}

function RetryButton({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel="重新尝试读取或保存心情记录" onPress={onPress}
    style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.6 : 1 }]}>
    <Text style={styles.retryText}>再试一次</Text>
  </Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: liuliReturnLayout.horizontalInset, paddingTop: liuliReturnLayout.headerTop },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  homeButton: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  liuliHomeButton: { width: liuliReturnLayout.buttonWidth, minHeight: liuliReturnLayout.buttonHeight,
    paddingHorizontal: liuliReturnLayout.buttonPadding, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: liuliReturnLayout.gap },
  homeLabel: { color: colors.primary, fontSize: 11, lineHeight: 20 },
  title: { color: colors.text, fontSize: 27, lineHeight: 38, fontWeight: '500', flexShrink: 1 },
  description: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 22 },
  tools: { flexDirection: 'row', gap: 14, marginTop: 10, marginBottom: 4 },
  tool: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  toolLabel: { color: colors.primary, fontSize: 12, lineHeight: 22 },
  notice: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeText: { color: colors.danger, fontSize: 12, lineHeight: 22, flexShrink: 1 },
  saving: { marginHorizontal: 24, marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 19, lineHeight: 30 },
  emptyNote: { marginTop: 12, color: colors.muted, fontSize: 13, lineHeight: 24, textAlign: 'center' },
  retry: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  retryText: { color: colors.primary, fontSize: 12, lineHeight: 22 },
});
