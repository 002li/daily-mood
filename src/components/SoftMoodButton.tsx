import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MoodOption, MoodType } from '../models/mood';
import { chamberColors as colors } from '../theme/chamber';
import { planetAppearance } from '../theme/planetAppearance';
import { MoodCelestial } from './MoodCelestial';

type Props = {
  mood: MoodOption;
  selected: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  active: boolean;
  onSelect: (mood: MoodType) => void;
};

export function SoftMoodButton({ mood, selected, disabled, reduceMotion, active, onSelect }: Props) {
  const compression = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const version = useRef(0);
  const allowed = useRef(false);
  allowed.current = !reduceMotion && !disabled && active;
  const tint = planetAppearance[mood.type];

  useEffect(() => {
    if (!allowed.current) {
      version.current += 1;
      animation.current?.stop();
      compression.setValue(0);
    }
  }, [active, disabled, reduceMotion, compression]);

  useEffect(() => () => {
    version.current += 1;
    animation.current?.stop();
    compression.stopAnimation();
  }, [compression]);

  const pressIn = () => {
    if (!allowed.current) return;
    version.current += 1;
    animation.current?.stop();
    animation.current = Animated.spring(compression, {
      toValue: 1, stiffness: 500, damping: 27, mass: 0.65,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.current.start();
  };

  const pressOut = () => {
    const currentVersion = ++version.current;
    animation.current?.stop();
    compression.stopAnimation((value) => {
      if (currentVersion !== version.current || !allowed.current) return;
      // 很快的轻点也保留一次形变；松手后越过原位，再自然回稳。
      compression.setValue(Math.max(value, 0.65));
      animation.current = Animated.spring(compression, {
        toValue: 0, stiffness: 280, damping: 8, mass: 0.65,
        useNativeDriver: Platform.OS !== 'web',
      });
      animation.current.start();
    });
  };

  return (
    <Animated.View testID={`soft-mood-${mood.type}`} style={{ transform: [
      { scaleX: compression.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
      { scaleY: compression.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] }) },
    ] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`选择${mood.label}`}
        aria-pressed={selected} aria-disabled={disabled}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => onSelect(mood.type)}
        style={({ pressed }) => [styles.button, {
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        }]}
      >
        <View testID={selected ? `selection-halo-${mood.type}` : undefined} style={[styles.emblem, {
          backgroundColor: selected ? `${tint.ring}0A` : 'transparent',
          borderColor: selected ? `${tint.ring}70` : 'transparent',
        }]}>
          <MoodCelestial mood={mood.type} size={30} />
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: selected ? colors.text : '#C2CCDA', fontWeight: selected ? '600' : '400' }]}>
          {mood.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48, minHeight: 80, paddingTop: 4, paddingBottom: 8,
    alignItems: 'center', gap: 6,
  },
  emblem: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, lineHeight: 20 },
});
