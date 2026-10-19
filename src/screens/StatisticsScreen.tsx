import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecordFeedback } from '../components/RecordFeedback';
import { formatCompactDate, getThirtyDaySummary } from '../models/moodInsights';
import { useMoodRecords } from '../state/MoodRecordsContext';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';
import { getMoodTint } from '../theme/appThemes';
import { isLegacyMood } from '../models/mood';
import { SpacePage } from '../navigation/SpacePage';
import { MoodCelestial } from '../components/MoodCelestial';
import { RecordsSubpageHeader } from '../components/RecordsSubpageHeader';
import { LinearGradient } from 'expo-linear-gradient';

export function StatisticsScreen() {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { records, today, status, errorKind } = useMoodRecords();
  const summary = getThirtyDaySummary(records, today);
  const blocked = status === 'loading' || errorKind === 'load';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <SpacePage route="Statistics" testID="statistics-observatory">
      <View style={styles.subpageHeader}><RecordsSubpageHeader title="近 30 天的心情" /></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.period}>{formatCompactDate(summary.startDate)} — {formatCompactDate(summary.endDate)}</Text>
        <RecordFeedback />
        {!blocked && <>
          {summary.recordedDays > 0 && <View style={styles.summary}>
            <Text style={styles.summaryTitle}>这 30 天，留下了</Text>
            <View style={styles.daysRow} accessibilityLabel={`记录了${summary.recordedDays}天`}>
              <Text testID="statistics-count" style={styles.days} accessibilityLiveRegion="polite">{summary.recordedDays}</Text><Text style={styles.daysUnit}>天的心情</Text>
            </View>
            <Text style={styles.summaryNote}>每天只保留最后一次选择。</Text>
          </View>}
          {summary.recordedDays ? <View style={styles.list}>
            {summary.items.map(({ mood, count }) => (
              <View key={mood.type} testID={`statistics-mood-${mood.type}`} style={styles.row} accessibilityLabel={`${mood.label}${isLegacyMood(mood.type) ? '，旧记录' : ''}：${count}次`}>
                <View style={styles.rowHeading}>
                  <View style={styles.moodName}>
                    <MoodCelestial mood={mood.type} size={theme === 'liuli' ? 36 : 24} />
                    <Text style={styles.label}>{mood.label}{isLegacyMood(mood.type) ? '（旧记录）' : ''}</Text>
                  </View>
                  <Text style={styles.count}>{count} 次</Text>
                </View>
                <View style={styles.track}>
                  {/* 始终以 30 天为分母，样式更新不改变色条含义。 */}
                  {count > 0 && <View style={[styles.bar, { width: `${count / 30 * 100}%`, backgroundColor: getMoodTint(mood.type, theme) }]}>
                    {theme === 'liuli' && <LinearGradient colors={[`${getMoodTint(mood.type, theme)}90`, getMoodTint(mood.type, theme)]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                  </View>}
                </View>
              </View>
            ))}
          </View> : <View style={styles.empty}>
            <View style={styles.emptyDot} />
            <Text style={styles.emptyTitle}>这 30 天还没有心情记录</Text>
            <Text style={styles.emptyNote}>在「今天」留下一种心情，它就会出现在这里。</Text>
          </View>}
          <Text style={styles.footnote}>包含今天及之前 29 天，空白日期不计入次数。</Text>
        </>}
      </ScrollView>
      </SpacePage>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  subpageHeader: { paddingHorizontal: 20, paddingTop: 16 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 4, paddingBottom: 28 },
  period: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 22 },
  summary: { marginTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryTitle: { color: colors.muted, fontSize: 13, lineHeight: 23 },
  daysRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 },
  days: { color: colors.text, fontSize: 44, lineHeight: 54, fontWeight: '500', fontVariant: ['tabular-nums'] },
  daysUnit: { color: colors.text, fontSize: 15, lineHeight: 24 },
  summaryNote: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 22 },
  list: { marginTop: 20, gap: 18 },
  row: { gap: 6 },
  rowHeading: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  moodName: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  emoji: { fontSize: 21, lineHeight: 28 },
  label: { color: colors.text, fontSize: 15, lineHeight: 24, flexShrink: 1 },
  count: { color: colors.text, fontSize: 14, lineHeight: 24, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  footnote: { marginTop: 22, color: colors.muted, fontSize: 11, lineHeight: 21 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#BDDDE126', marginBottom: 20 },
  emptyTitle: { color: colors.text, fontSize: 17, lineHeight: 27 },
  emptyNote: { marginTop: 10, color: colors.muted, fontSize: 13, lineHeight: 24, textAlign: 'center' },
});
