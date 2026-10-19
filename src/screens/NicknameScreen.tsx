import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getNicknameError, NICKNAME_MAX_LENGTH } from '../storage/nicknameStorage';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';
import { neutralPlanetAppearance } from '../theme/planetAppearance';

export function NicknameScreen({ onSave }: { onSave: (nickname: string) => Promise<void> }) {
  const { theme, colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [focused, setFocused] = useState(false);
  const length = Array.from(value.trim()).length;
  const validationError = getNicknameError(value);
  const invalidInput = value.trim().length > 0 && validationError !== null;
  const canSubmit = !validationError && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave(value);
    } catch {
      // 保留输入内容，存储失败时可以直接重试。
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {theme === 'chamber' && <LinearGradient colors={neutralPlanetAppearance.sky} style={StyleSheet.absoluteFill} pointerEvents="none" />}
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>初次见面</Text>
          <LinearGradient colors={neutralPlanetAppearance.surface} style={styles.welcomeOrb}>
            <View style={styles.orbLight} />
          </LinearGradient>
          <Text style={styles.title} accessibilityRole="header">怎么称呼你？</Text>
          <Text style={styles.subtitle}>留一个你喜欢的名字。</Text>

          <View style={styles.field}>
            <Text style={styles.label}>你的昵称</Text>
            <TextInput value={value} onChangeText={(text) => { setValue(text); setSaveError(false); }}
              editable={!saving} accessibilityLabel="你的昵称" placeholder="比如：小满"
              placeholderTextColor="#8E999E" style={[styles.input, focused && styles.inputFocused]} returnKeyType="done"
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => { void submit(); }} />
            <View style={styles.hintRow}>
              <Text style={[styles.hint, invalidInput && styles.error]}>
                {invalidInput ? validationError : '昵称会显示在首页。'}
              </Text>
              <Text style={styles.counter}>{length}/{NICKNAME_MAX_LENGTH}</Text>
            </View>
          </View>
          {saveError && <Text style={styles.errorMessage} accessibilityLiveRegion="polite">昵称还没保存成功，再试一次吧。</Text>}
          <Pressable onPress={() => { void submit(); }} disabled={!canSubmit}
            accessibilityRole="button" accessibilityLabel="开始记录" accessibilityState={{ disabled: !canSubmit, busy: saving }}
            style={({ pressed }) => [styles.button, { opacity: canSubmit || saving ? (pressed ? 0.8 : 1) : 0.45 }]}>
            {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>开始记录</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  eyebrow: { color: colors.muted, fontSize: 12, lineHeight: 22 },
  welcomeOrb: { width: 64, height: 64, borderRadius: 32, marginTop: 24, marginBottom: 28, borderWidth: 0.8, borderColor: colors.border, overflow: 'hidden' },
  orbLight: { position: 'absolute', top: 6, left: 8, width: 18, height: 30, borderRadius: 12, backgroundColor: '#F0ECE412', transform: [{ rotate: '35deg' }] },
  title: { color: colors.text, fontSize: 28, lineHeight: 40, fontWeight: '500' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 25, marginTop: 10 },
  field: { marginTop: 36 },
  label: { color: colors.text, fontSize: 13, lineHeight: 22, marginBottom: 9 },
  input: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.glass, color: colors.text, fontSize: 19, lineHeight: 28 },
  inputFocused: { borderColor: colors.primary },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 20, flex: 1 },
  counter: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  error: { color: colors.danger },
  errorMessage: { color: colors.danger, fontSize: 12, lineHeight: 22, marginTop: 12 },
  button: { marginTop: 28, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  buttonText: { color: colors.background, fontSize: 15, lineHeight: 24, fontWeight: '500' },
});
