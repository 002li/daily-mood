import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useNicknameProfile } from '../state/NicknameContext';
import { getNicknameError, NICKNAME_MAX_LENGTH } from '../storage/nicknameStorage';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';

export function NicknameEditor({ onSavingChange }: { onSavingChange: (saving: boolean) => void }) {
  const { nickname, updateNickname } = useNicknameProfile();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const validationError = draft.trim() ? getNicknameError(draft) : '请输入一个昵称。';
  const canSave = !validationError && draft.trim() !== nickname && !saving;

  const submit = async () => {
    // 回车与点击可能紧接着发生；在下一次渲染前也只提交一次。
    if (!canSave || pending.current) return;
    pending.current = true;
    setSaving(true);
    onSavingChange(true);
    setSaveError(false);
    try {
      await updateNickname(draft);
      setEditing(false);
      setSaved(true);
      Keyboard.dismiss();
    } catch {
      setSaveError(true);
    } finally {
      pending.current = false;
      setSaving(false);
      onSavingChange(false);
    }
  };

  return <View testID="nickname-editor" style={styles.section}>
    <Text style={styles.title}>你的昵称</Text>
    {editing ? <>
      <TextInput testID="nickname-edit-input" accessibilityLabel="新的昵称" value={draft}
        onChangeText={value => { setDraft(value); setSaveError(false); }} editable={!saving}
        autoFocus autoCorrect={false} autoCapitalize="none" returnKeyType="done"
        onSubmitEditing={() => { void submit(); }} style={styles.input} selectionColor={colors.primary} />
      <View style={styles.hints} accessibilityLiveRegion="polite">
        <Text style={[styles.note, styles.hintText, validationError && styles.error]}>
          {validationError ?? '会显示在首页，只保存在这台设备。'}
        </Text>
        <Text style={styles.note}>{Array.from(draft.trim()).length}/{NICKNAME_MAX_LENGTH}</Text>
      </View>
      {saveError && <Text style={[styles.note, styles.error]} accessibilityLiveRegion="polite">昵称还没保存成功，输入已保留，请再试一次。</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="取消修改昵称" disabled={saving}
          accessibilityState={{ disabled: saving }} onPress={() => { setEditing(false); setSaveError(false); Keyboard.dismiss(); }}
          style={({ pressed }) => [styles.action, { opacity: saving || pressed ? 0.5 : 1 }]}>
          <Text style={styles.actionText}>取消</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="保存昵称" disabled={!canSave}
          accessibilityState={{ disabled: !canSave, busy: saving }} onPress={() => { void submit(); }}
          style={({ pressed }) => [styles.action, styles.save, { opacity: canSave || saving ? pressed ? 0.75 : 1 : 0.4 }]}>
          {saving ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={styles.saveText}>保存昵称</Text>}
        </Pressable>
      </View>
    </> : <>
      <View style={styles.row}>
        <Text testID="settings-nickname" style={styles.name}>{nickname}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="修改昵称"
          onPress={() => { setDraft(nickname); setSaveError(false); setSaved(false); setEditing(true); }}
          style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={styles.actionText}>修改</Text>
        </Pressable>
      </View>
      <Text style={styles.note} accessibilityLiveRegion="polite">{saved ? '昵称已更新。' : '留一个你喜欢的称呼。'}</Text>
    </>}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: 32 },
  title: { color: colors.text, fontSize: 19, lineHeight: 29, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
  name: { flex: 1, color: colors.text, fontSize: 17, lineHeight: 27 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 22, marginTop: 4 },
  input: { color: colors.text, backgroundColor: colors.glass, borderColor: colors.primary, borderWidth: 1, outlineColor: colors.primary,
    borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, lineHeight: 28, marginTop: 14 },
  hints: { flexDirection: 'row', gap: 12, marginTop: 4 },
  hintText: { flex: 1 },
  error: { color: colors.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  action: { minWidth: 60, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  actionText: { color: colors.primary, fontSize: 14, lineHeight: 24 },
  save: { backgroundColor: colors.primary, minWidth: 104 },
  saveText: { color: colors.background, fontSize: 14, lineHeight: 24, fontWeight: '500' },
});
