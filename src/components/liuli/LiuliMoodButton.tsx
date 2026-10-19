import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LiuliArt, liuliMoods, type LiuliMood } from './LiuliArt';
import { getMoodTint } from '../../theme/appThemes';

type Props = { mood: LiuliMood; selected: boolean; reduced: boolean; onSelect: () => void; disabled?: boolean; preview?: boolean };

export function LiuliMoodButton({ mood, selected, reduced, onSelect, disabled = false, preview = false }: Props) {
  const squash = useRef(new Animated.Value(0)).current;
  const motion = useRef<Animated.CompositeAnimation | null>(null);
  const item = liuliMoods.find(option => option.type === mood)!;
  useEffect(() => {
    if (reduced || disabled) { motion.current?.stop(); squash.setValue(0); }
    return () => { motion.current?.stop(); squash.stopAnimation(); };
  }, [disabled, reduced, squash]);
  const press = (down: boolean) => {
    if (reduced || disabled) return;
    motion.current?.stop();
    if (!down) squash.setValue(0.65);
    motion.current = Animated.spring(squash, {
      toValue: down ? 1 : 0, stiffness: down ? 480 : 260, damping: down ? 25 : 9, mass: 0.65,
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    motion.current.start();
  };
  return <Pressable testID={`liuli-choice-${mood}`} accessibilityRole="button" accessibilityLabel={`${preview ? '预览' : '记录'}${item.label}`}
    aria-pressed={selected} aria-disabled={disabled}
    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onSelect}
    onPressIn={() => press(true)} onPressOut={() => press(false)} style={[styles.choice, { opacity: disabled ? 0.45 : 1 }]}>
    <Animated.View testID={`liuli-gel-${mood}`} style={{ transform: [
      { scaleX: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
      { scaleY: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
    ] }}>
      <View style={[styles.art, { borderColor: selected ? item.color : 'transparent' }]}><LiuliArt mood={mood} size={51} /></View>
    </Animated.View>
    <Text style={[styles.label, { color: selected ? getMoodTint(mood, 'liuli') : '#52685E', fontWeight: selected ? '600' : '400' }]}>{item.label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  choice: { width: 63, minHeight: 86, alignItems: 'center', gap: 5, paddingVertical: 4 },
  art: { width: 57, height: 57, alignItems: 'center', justifyContent: 'center', borderRadius: 29, borderWidth: 1.5 },
  label: { fontSize: 13, lineHeight: 21 },
});
