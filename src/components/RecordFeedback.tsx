import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useMoodRecords } from '../state/MoodRecordsContext';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';

// 日历和统计使用相同的读取/保存反馈，读取失败时不能误报为空记录。
export function RecordFeedback() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { status, errorKind, retry } = useMoodRecords();
  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.text}>正在找回你的心情…</Text>
      </View>
    );
  }
  if (errorKind) {
    return (
      <View style={styles.notice} accessibilityLiveRegion="polite">
        <Text style={styles.text}>
          {errorKind === 'load' ? '暂时没能读取记录，请再试一次。' : '最新心情尚未保存。'}
        </Text>
        <Pressable onPress={retry} accessibilityRole="button"
          accessibilityLabel={errorKind === 'load' ? '重试读取记录' : '重试保存记录'}
          style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={styles.retryText}>再试一次</Text>
        </Pressable>
      </View>
    );
  }
  if (status === 'saving') {
    return <Text style={styles.progress} accessibilityLiveRegion="polite">正在保存最新心情…</Text>;
  }
  return null;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  loading: { marginTop: 44, alignItems: 'center', gap: 12 },
  notice: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  text: { color: colors.muted, fontSize: 13, lineHeight: 23 },
  retry: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  retryText: { color: colors.primary, fontSize: 13, lineHeight: 23, fontWeight: '600' },
  progress: { marginTop: 12, color: colors.muted, fontSize: 12, lineHeight: 22 },
});
