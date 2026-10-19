import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { LiuliMood } from './LiuliArt';

const nativeDriver = Platform.OS !== 'web';
type Props = { mood: LiuliMood; size: number; enabled: boolean; reduceMotion: boolean };
const GLINTS = [
  { x: 0.66, y: 0.37 }, { x: 0.55, y: 0.49 }, { x: 0.42, y: 0.59 },
  { x: 0.53, y: 0.7 }, { x: 0.62, y: 0.82 },
];
const BIRDS = [
  { x: 0, y: 0.025, span: 0.052 },
  { x: 0.071, y: 0, span: 0.047 },
  { x: 0.133, y: 0.043, span: 0.041 },
];
const FOG_BANKS = [
  { x: 0.08, y: 0.39, width: 0.78, height: 0.16, reverse: false },
  { x: 0.16, y: 0.55, width: 0.72, height: 0.18, reverse: true },
  { x: 0.07, y: 0.71, width: 0.82, height: 0.17, reverse: false },
];
// 坐标对应重新居中的蓝色星球，雨从云底落入水面。
const RAIN = Array.from({ length: 22 }, (_, index) => ({
  x: 0.24 + ((index * 9) % 22) * 0.023,
  y: 0.32 + (index % 3) * 0.014,
  length: 0.05 + (index % 3) * 0.012,
  travel: 0.29 + (index % 4) * 0.022,
  duration: 1050 + (index % 5) * 130,
}));

/** 带初始相位的连续循环，进入星球时即可看到天气，无需等全部从透明开始。 */
function cycle(value: Animated.Value, duration: number, phase: number) {
  value.setValue(phase);
  const timing = (toValue: number, milliseconds: number) => Animated.timing(value, {
    toValue, duration: milliseconds, easing: Easing.linear,
    useNativeDriver: nativeDriver, isInteraction: false,
  });
  return Animated.sequence([
    timing(1, duration * (1 - phase)),
    Animated.loop(Animated.sequence([timing(0, 0), timing(1, duration)])),
  ]);
}

export function LiuliWeatherEffects({ mood, size, enabled, reduceMotion }: Props) {
  const breath = useRef(new Animated.Value(0)).current;
  const glints = useRef(GLINTS.map(() => new Animated.Value(0))).current;
  const rain = useRef(RAIN.map(() => new Animated.Value(0))).current;
  const ripples = useRef(Array.from({ length: 4 }, () => new Animated.Value(0))).current;
  const flight = useRef(new Animated.Value(0)).current;
  const wings = useRef(BIRDS.map(() => new Animated.Value(0))).current;
  const moving = enabled && !reduceMotion;

  useEffect(() => {
    const values = [breath, flight, ...wings, ...glints, ...rain, ...ripples];
    values.forEach(value => value.setValue(0));
    if (!moving) return;
    const motions: Animated.CompositeAnimation[] = [];
    if (mood === 'happy' || mood === 'tired') {
      const duration = mood === 'happy' ? 2200 : 3500;
      motions.push(Animated.loop(Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
        Animated.timing(breath, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      ])));
      glints.forEach((value, index) => motions.push(cycle(value, 2400 + index * 260, index * 0.19)));
    }
    if (mood === 'calm' || mood === 'sad') {
      ripples.forEach((value, index) => motions.push(cycle(value, mood === 'calm' ? 3100 : 2100, index * 0.24)));
    }
    if (mood === 'happy') {
      motions.push(cycle(flight, 10000, 0.3));
      wings.forEach((value, index) => {
        // 三只鸟有各自的扇翅节奏，飞行与扇翅分开控制。
        const duration = 340 + index * 55;
        motions.push(Animated.loop(Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
        ])));
      });
    }
    if (mood === 'sad') rain.forEach((value, index) => motions.push(cycle(value, RAIN[index].duration, (index * 0.137) % 1)));
    motions.forEach(motion => motion.start());
    return () => {
      motions.forEach(motion => motion.stop());
      values.forEach(value => value.stopAnimation());
    };
  }, [breath, flight, glints, mood, moving, rain, ripples, wings]);

  if (!moving) {
    // 无额外开关；只在系统减少动态或后台时停止循环，仍保留雨天识别。
    return mood === 'sad' ? <View testID="liuli-rain-static" pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      {RAIN.filter((_, index) => index % 3 === 0).map((drop, index) => <View key={index} style={{
        position: 'absolute', left: size * drop.x, top: size * (drop.y + drop.travel * 0.45),
        width: Math.max(1.7, size * 0.007), height: size * drop.length,
        borderRadius: 3, backgroundColor: '#D8F4FF', opacity: 0.85, transform: [{ rotate: '8deg' }],
      }} />)}
    </View> : null;
  }

  return <View testID={`liuli-weather-${mood}`} pointerEvents="none" accessible={false}
    style={[styles.clip, { width: size, height: size, borderRadius: size / 2 }]}>
    {mood === 'happy' && <>
      <Animated.View testID="liuli-sun-glow" style={{
        position: 'absolute', left: size * 0.49, top: size * 0.085, width: size * 0.3, height: size * 0.3,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.62] }),
        transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.3] }) }],
      }}>
        <LinearGradient colors={['#FFF9C800', '#FFF5A0CC', '#FFD97800']} style={{ flex: 1, borderRadius: size }} />
      </Animated.View>
      <Animated.View testID="liuli-sun-rays" style={{
        position: 'absolute', left: size * 0.49, top: size * 0.085, width: size * 0.3, height: size * 0.3,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.8] }),
        transform: [{ rotate: breath.interpolate({ inputRange: [0, 1], outputRange: ['-9deg', '9deg'] }) }],
      }}>
        {Array.from({ length: 10 }, (_, i) => <View key={i} style={{
          position: 'absolute', left: size * (0.145 + Math.sin(i * Math.PI / 5) * 0.115),
          top: size * (0.132 - Math.cos(i * Math.PI / 5) * 0.115),
          width: size * 0.01, height: size * 0.036, borderRadius: 3, backgroundColor: '#FFF8CE',
          transform: [{ rotate: `${i * 36}deg` }],
        }} />)}
      </Animated.View>
      <Animated.View testID="liuli-birds" style={{
        position: 'absolute', left: 0, top: 0, width: size * 0.19, height: size * 0.1,
        opacity: flight.interpolate({ inputRange: [0, 0.1, 0.78, 0.94, 1], outputRange: [0, 0.92, 0.92, 0, 0] }),
        transform: [
          { translateX: flight.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [size * 0.09, size * 0.3, size * 0.56, size * 0.79] }) },
          { translateY: flight.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [size * 0.28, size * 0.23, size * 0.25, size * 0.19] }) },
          { scale: flight.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1, 0.82] }) },
        ],
      }}>
        {BIRDS.map((bird, index) => <View key={index} testID={`liuli-bird-${index}`} style={{
          position: 'absolute', left: size * bird.x, top: size * bird.y,
          width: size * bird.span, height: size * bird.span * 0.55,
        }}>
          {[-1, 1].map(side => <Animated.View key={side} testID={`liuli-wing-${index}-${side}`} style={{
            position: 'absolute', left: side < 0 ? 0 : size * bird.span * 0.44,
            top: size * bird.span * 0.12, width: size * bird.span * 0.56, height: size * bird.span * 0.36,
            borderTopWidth: Math.max(1.5, size * 0.0048), borderColor: '#614A2B', borderRadius: size * bird.span * 0.3,
            transform: [
              { rotate: wings[index].interpolate({ inputRange: [0, 1], outputRange: side < 0 ? ['-24deg', '22deg'] : ['24deg', '-22deg'] }) },
              { scaleY: wings[index].interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 1] }) },
            ],
          }} />)}
          <View style={{ position: 'absolute', left: size * bird.span * 0.45, top: size * bird.span * 0.25,
            width: size * bird.span * 0.12, height: Math.max(1.5, size * 0.0045), borderRadius: 2, backgroundColor: '#614A2B' }} />
        </View>)}
      </Animated.View>
    </>}

    {(mood === 'happy' || mood === 'tired') && GLINTS.map((glint, index) => {
      const value = glints[index];
      const tired = mood === 'tired';
      return <Animated.View key={index} testID={`liuli-glint-${index}`} style={{
        position: 'absolute', left: size * (tired ? 0.29 + index * 0.11 : glint.x),
        top: size * (tired ? 0.15 + (index % 3) * 0.07 : glint.y),
        width: size * 0.04, height: size * 0.04,
        opacity: value.interpolate({ inputRange: [0, 0.18, 0.5, 0.85, 1], outputRange: [0, 0.65, 1, 0.3, 0] }),
        transform: [
          { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, size * (tired ? -0.015 : -0.04)] }) },
          { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, size * (tired ? -0.025 : 0.08)] }) },
          { scale: value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1.25, 0.35] }) },
        ],
      }}>
        <View style={{ position: 'absolute', left: size * 0.017, width: size * 0.006, height: size * 0.04, borderRadius: 3, backgroundColor: '#FFF7C7' }} />
        <View style={{ position: 'absolute', top: size * 0.017, width: size * 0.04, height: size * 0.006, borderRadius: 3, backgroundColor: '#FFF7C7' }} />
      </Animated.View>;
    })}

    {(mood === 'calm' || mood === 'sad') && ripples.map((value, index) => <Animated.View key={index} testID={`liuli-ripple-${index}`} style={{
      position: 'absolute', left: size * (0.36 + (index % 2) * 0.09), top: size * (0.63 + index * 0.035),
      width: size * 0.2, height: size * 0.045, borderRadius: size * 0.12,
      borderWidth: Math.max(1.2, size * 0.0045), borderColor: mood === 'calm' ? '#D8FFF6' : '#C7EEFF',
      opacity: value.interpolate({ inputRange: [0, 0.13, 0.55, 1], outputRange: [0, 0.95, 0.6, 0] }),
      transform: [
        { scaleX: value.interpolate({ inputRange: [0, 1], outputRange: [0.15, mood === 'calm' ? 2.5 : 1.7] }) },
        { scaleY: value.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.9] }) },
      ],
    }} />)}

    {mood === 'sad' && RAIN.map((drop, index) => <Animated.View key={index} testID={`liuli-rain-drop-${index}`} style={{
      position: 'absolute', left: size * drop.x, top: size * drop.y,
      width: Math.max(1.8, size * 0.0075), height: size * drop.length,
      opacity: rain[index].interpolate({ inputRange: [0, 0.08, 0.82, 1], outputRange: [0, 1, 0.9, 0] }),
      transform: [
        { translateY: rain[index].interpolate({ inputRange: [0, 1], outputRange: [0, size * drop.travel] }) },
        { translateX: rain[index].interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.038] }) },
        { rotate: '8deg' },
      ],
    }}>
      <LinearGradient colors={['#BDE5FF00', '#BDE5FF', '#F3FCFF']} style={{ flex: 1, borderRadius: 3 }} />
    </Animated.View>)}

    {mood === 'tired' && <>
      <Animated.View testID="liuli-moon-glow" style={{
        position: 'absolute', left: size * 0.49, top: size * 0.065, width: size * 0.32, height: size * 0.32,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.46] }),
        transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] }) }],
      }}><LinearGradient colors={['#FFEDC300', '#FFF5D4BB', '#E8DAFF00']} style={{ flex: 1, borderRadius: size }} /></Animated.View>
      {FOG_BANKS.map((bank, index) => <Animated.View key={index} testID={`liuli-mist-${index}`} style={{
        position: 'absolute', left: size * bank.x, top: size * bank.y,
        width: size * bank.width, height: size * bank.height,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: bank.reverse ? [0.85, 0.62] : [0.62, 0.88] }),
        transform: [
          { translateX: breath.interpolate({ inputRange: [0, 1], outputRange: bank.reverse ? [size * 0.045, -size * 0.045] : [-size * 0.045, size * 0.045] }) },
          { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [size * 0.01, -size * 0.01] }) },
        ],
      }}>
        {/* 纵向羽化避免浓雾变成实心白条；高度增加，雾气可穿过山腰与水面。 */}
        <LinearGradient colors={['#F1E9FF00', '#EEE6FF66', '#FFF2FFE6', '#F2E7FF88', '#E4D9FF00']}
          locations={[0, 0.24, 0.5, 0.74, 1]} style={{ flex: 1, borderRadius: size }} />
        <LinearGradient colors={['#FFF4FF00', '#FFF4FF99', '#FFF4FF00']}
          style={{ position: 'absolute', left: size * 0.12, top: size * 0.015, width: size * 0.46, height: size * 0.11, borderRadius: size }} />
      </Animated.View>)}
    </>}
  </View>;
}

const styles = StyleSheet.create({ clip: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' } });
