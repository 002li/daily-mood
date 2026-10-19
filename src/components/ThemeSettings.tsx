import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';
import { LiuliArt } from './liuli/LiuliArt';
import { MoodCelestial } from './MoodCelestial';
import { NicknameEditor } from './NicknameEditor';

export function ThemeSettingsButton() {
  const { colors, openSettings } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel="打开设置" onPress={openSettings}
    style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
    <Text style={{ color: colors.muted, fontSize: 13 }}>设置</Text>
  </Pressable>;
}

export function ThemeSettings() {
  const { theme, colors, settingsOpen, closeSettings, chooseTheme, saving, saveError } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const close = () => { if (!nicknameSaving) closeSettings(); };
  return <Modal visible={settingsOpen} animationType="fade" onRequestClose={close}>
    <StatusBar style={theme === 'liuli' ? 'dark' : 'light'} />
    <SafeAreaView testID="theme-settings" style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Text style={styles.title} accessibilityRole="header">设置</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="关闭设置" onPress={close} disabled={nicknameSaving}
            accessibilityState={{ disabled: nicknameSaving }} style={[styles.done, { opacity: nicknameSaving ? 0.4 : 1 }]}><Text style={styles.doneText}>完成</Text></Pressable>
        </View>
        {/* 关闭设置即丢弃未保存草稿；下次打开从已存昵称开始。 */}
        {settingsOpen && <NicknameEditor onSavingChange={setNicknameSaving} />}
        <Text style={styles.section}>选择你的空间</Text>
        <Text style={styles.note}>换一种风景，留下的心情都还在。</Text>
        {([{ type: 'liuli', title: '琉璃星球', note: '温暖的微景观，晴雨与云雾。' },
          { type: 'chamber', title: '宇宙玻璃舱', note: '原来的暮色宇宙，柔和的玻璃星球。' }] as const).map(item => <Pressable key={item.type}
          testID={`theme-choice-${item.type}`} accessibilityRole="radio" accessibilityLabel={item.title}
          aria-checked={theme === item.type} aria-disabled={saving}
          accessibilityState={{ checked: theme === item.type, disabled: saving }} disabled={saving}
          onPress={() => { void chooseTheme(item.type); }} style={({ pressed }) => [styles.option, {
            borderColor: theme === item.type ? colors.primary : colors.border, opacity: pressed || saving ? 0.65 : 1,
          }]}>
          <View style={[styles.preview, { backgroundColor: item.type === 'liuli' ? '#F6F5EA' : '#151B22' }]}>
            {item.type === 'liuli' ? <LiuliArt mood="happy" size={70} /> : <MoodCelestial mood="calm" size={54} variant="chamber" />}
          </View>
          <View style={styles.optionCopy}><Text style={styles.optionTitle}>{item.title}</Text><Text style={styles.note}>{item.note}</Text></View>
          <Text style={styles.check}>{theme === item.type ? '✓' : ''}</Text>
        </Pressable>)}
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          {saving && <ActivityIndicator color={colors.primary} size="small" />}
          <Text style={[styles.note, saveError && { color: colors.danger }]}>{saveError ? '主题还没保存成功，请再次点选重试。' : saving ? '正在保存主题…' : '主题会在下次打开时恢复。'}</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 34 },
  title: { color: colors.text, fontSize: 26, lineHeight: 38, fontWeight: '500' },
  done: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  doneText: { color: colors.primary, fontSize: 14 },
  section: { color: colors.text, fontSize: 19, lineHeight: 29, fontWeight: '500' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 22, marginTop: 4 },
  option: { marginTop: 20, padding: 12, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { width: 76, height: 86, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  optionCopy: { flex: 1 }, optionTitle: { color: colors.text, fontSize: 16, lineHeight: 25, fontWeight: '500' },
  check: { width: 18, color: colors.primary, fontSize: 17 },
  feedback: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
