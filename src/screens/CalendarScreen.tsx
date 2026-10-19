import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecordFeedback } from '../components/RecordFeedback';
import { formatCreatedTime, formatRecordDate, isLegacyMood, moods } from '../models/mood';
import { buildMonthDays, moveMonth } from '../models/moodInsights';
import { useMoodRecords } from '../state/MoodRecordsContext';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';
import { SpacePage } from '../navigation/SpacePage';
import { MoodCelestial } from '../components/MoodCelestial';
import { RecordsSubpageHeader } from '../components/RecordsSubpageHeader';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

export function CalendarScreen() {
  const { colors, theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { records, today, status, errorKind } = useMoodRecords();
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = today.split('-').map(Number);
    return { year, month: monthNumber };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const monthKey = `${String(month.year).padStart(4, '0')}-${String(month.month).padStart(2, '0')}`;
  const monthRecords = new Map(records.filter((record) => record.date.startsWith(monthKey)).map((record) => [record.date, record]));
  const days = buildMonthDays(month.year, month.month);
  const blocked = status === 'loading' || errorKind === 'load';
  const selectedRecord = selectedDate ? monthRecords.get(selectedDate) : undefined;
  const selectedMood = selectedRecord ? moods.find((mood) => mood.type === selectedRecord.mood)! : undefined;

  const changeMonth = (direction: -1 | 1) => {
    setMonth((current) => moveMonth(current.year, current.month, direction));
    setSelectedDate(null);
  };
  const goToday = () => {
    const [year, monthNumber] = today.split('-').map(Number);
    setMonth({ year, month: monthNumber });
    setSelectedDate(today);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <SpacePage route="Calendar" testID="calendar-observatory">
      <View style={styles.subpageHeader}><RecordsSubpageHeader title="心情日历" /></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>点一个日期，看看那天的心情。</Text>

        <View style={styles.monthControls}>
          <MonthButton label="上个月" symbol="‹" onPress={() => changeMonth(-1)} disabled={month.year === 1 && month.month === 1} />
          <Text style={styles.monthTitle} accessibilityLiveRegion="polite">{month.year}年{month.month}月</Text>
          <MonthButton label="下个月" symbol="›" onPress={() => changeMonth(1)} disabled={month.year === 9999 && month.month === 12} />
        </View>
        <View style={styles.monthSummary}>
          <Text style={styles.summaryText}>{blocked ? '等待读取记录' : `这个月留下了 ${monthRecords.size} 天的心情`}</Text>
          <Pressable onPress={goToday} accessibilityRole="button" accessibilityLabel="日历回到今天"
            style={({ pressed }) => [styles.todayButton, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={styles.todayLabel}>回到今天</Text>
          </Pressable>
        </View>
        <RecordFeedback />

        {!blocked && <>
          <View style={styles.weekdays}>
            {weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
          </View>
          <View style={styles.grid}>
            {days.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.cell} />;
              const record = monthRecords.get(day.date);
              const mood = record ? moods.find((item) => item.type === record.mood)! : undefined;
              const selected = selectedDate === day.date;
              return (
                <Pressable key={day.date} accessibilityRole="button"
                  testID={`calendar-day-${day.date}`}
                  accessibilityLabel={`${formatRecordDate(day.date)}，${mood ? `心情${mood.label}` : '暂无记录'}`}
                  accessibilityState={{ selected }} onPress={() => setSelectedDate(day.date)}
                  style={({ pressed }) => [styles.cell, {
                    backgroundColor: selected ? (theme === 'liuli' ? '#FFFFFFB0' : `${colors.primary}09`) : 'transparent',
                    borderColor: selected ? colors.primary : 'transparent',
                    opacity: pressed ? 0.65 : 1,
                  }]}>
                  <Text style={[styles.day, day.date === today && styles.currentDay,
                    theme === 'liuli' && day.date === today && styles.todayBadge]}>{day.day}</Text>
                  <View style={styles.emojiSlot}>
                    {record && <MoodCelestial mood={record.mood} size={theme === 'liuli' ? 28 : 19} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>}
      </ScrollView>
      {!blocked && <View testID="calendar-detail" style={[styles.detail, theme === 'liuli' && styles.liuliDetail]} accessibilityLiveRegion="polite">
        {selectedDate ? <>
          <Text style={styles.detailDate}>{formatRecordDate(selectedDate)}</Text>
          {selectedRecord && selectedMood ? (
            <View style={styles.detailRow}>
              <MoodCelestial mood={selectedRecord.mood} size={theme === 'liuli' ? 44 : 32} />
              <View style={styles.detailText}>
                <Text style={styles.detailTitle}>{selectedMood.label}{isLegacyMood(selectedRecord.mood) ? '（旧记录）' : ''}</Text>
                <Text style={styles.detailNote}>首次记录于 {formatCreatedTime(selectedRecord.createdAt)}</Text>
              </View>
            </View>
          ) : <Text style={styles.detailNote}>{selectedDate > today ? '这一天还没到。' : '这一天还没有记录。'}</Text>}
        </> : <Text style={styles.detailNote}>点选一个日期，看看那天的心情。</Text>}
      </View>}
      </SpacePage>
    </SafeAreaView>
  );
}

function MonthButton({ label, symbol, onPress, disabled }: { label: string; symbol: string; onPress: () => void; disabled: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled }} style={({ pressed }) => [styles.monthButton, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Text style={styles.arrow}>{symbol}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  subpageHeader: { paddingHorizontal: 20, paddingTop: 16 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  subtitle: { marginTop: 7, color: colors.muted, fontSize: 13, lineHeight: 23 },
  monthControls: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { color: colors.text, fontSize: 21, lineHeight: 31, fontWeight: '500' },
  monthButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: colors.primary, fontSize: 29, lineHeight: 36 },
  monthSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'space-between' },
  summaryText: { color: colors.muted, fontSize: 12, lineHeight: 21 },
  todayButton: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  todayLabel: { color: colors.primary, fontSize: 12, lineHeight: 20 },
  weekdays: { flexDirection: 'row', marginTop: 7, marginBottom: 8 },
  weekday: { width: '14.285714%', color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', minHeight: 62, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  day: { color: colors.text, minWidth: 24, height: 24, textAlign: 'center', fontSize: 13, lineHeight: 24 },
  currentDay: { color: colors.text, fontWeight: '700' },
  todayBadge: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.primary, color: '#FFFFFF' },
  emojiSlot: { height: 30, justifyContent: 'center' },
  emoji: { fontSize: 20, lineHeight: 26 },
  detail: { marginTop: 8, marginHorizontal: 20, marginBottom: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, minHeight: 80 },
  liuliDetail: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 0, borderWidth: 1, borderColor: '#FFFFFF90', borderRadius: 20, backgroundColor: '#FFFFFF60' },
  detailDate: { color: colors.muted, fontSize: 12, lineHeight: 21 },
  detailRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailEmoji: { fontSize: 30, lineHeight: 42 },
  detailText: { flex: 1 },
  detailTitle: { color: colors.text, fontSize: 17, lineHeight: 26, fontWeight: '600' },
  detailNote: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 22 },
});
