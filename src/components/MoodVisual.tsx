import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MoodType } from '../models/mood';
import { moodAppearance, neutralAppearance } from '../theme/moodAppearance';
import { planetAppearance, neutralPlanetAppearance } from '../theme/planetAppearance';

const nativeDriver = Platform.OS !== 'web';
type GradientColors = readonly [string, string, string];

// 新旧渐变叠加淡入，不在每一帧重新渲染整页。
function SoftGradient({ colors, style, reduceMotion }: {
  colors: GradientColors;
  style: StyleProp<ViewStyle>;
  reduceMotion: boolean;
}) {
  const previous = useRef(colors);
  const [base, setBase] = useState(colors);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setBase(previous.current);
    previous.current = colors;
    fade.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    const transition = Animated.timing(fade, {
      toValue: 1, duration: 650, useNativeDriver: nativeDriver,
    });
    transition.start();
    return () => transition.stop();
  }, [colors, fade, reduceMotion]);

  return (
    <View style={[style, styles.clip]} pointerEvents="none" accessible={false}>
      <LinearGradient colors={base} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <LinearGradient colors={colors} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

// 导航中点只更换页面内容；相同参数下保留背景和星球内部的动画节点。
export const MoodBackdrop = memo(function MoodBackdrop({ mood, reduceMotion, animate = false }: { mood?: MoodType; reduceMotion: boolean; animate?: boolean }) {
  const palette = mood ? planetAppearance[mood] : neutralPlanetAppearance;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    drift.setValue(0);
    if (reduceMotion || !animate) return;
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
    ]));
    motion.start();
    return () => motion.stop();
  }, [animate, drift, reduceMotion]);
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none" accessible={false}>
      <SoftGradient colors={palette.sky} style={StyleSheet.absoluteFill} reduceMotion={reduceMotion} />
      <Animated.View style={[styles.skyGlow, { transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 24] }) }, { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }] }]}>
        <LinearGradient colors={[`${palette.atmosphere}00`, `${palette.atmosphere}0D`, '#FFFFFF00']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {[[9, 14, 1], [78, 12, 1], [12, 44, 1], [91, 65, 1], [63, 83, 1], [42, 94, 1]].map(([x, y, size], index) => (
        <Animated.View key={index} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: size, backgroundColor: '#DBE9F4',
          opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.22] }) }} />
      ))}
    </View>
  );
});

export const MoodPlanet = memo(function MoodPlanet({ mood, animate, reduceMotion, interaction, saved, sceneHeight, feedbackActive, cameraMotion }: {
  mood?: MoodType;
  animate: boolean;
  reduceMotion: boolean;
  interaction: number;
  saved: boolean;
  sceneHeight: number;
  feedbackActive: boolean;
  cameraMotion: {
    orbitTurn: Animated.AnimatedInterpolation<number>;
    orbitDepth: Animated.AnimatedInterpolation<number>;
    clouds: Animated.AnimatedInterpolation<number>;
  };
}) {
  const appearance = mood ? moodAppearance[mood] : neutralAppearance;
  const palette = mood ? planetAppearance[mood] : neutralPlanetAppearance;
  const breath = useRef(new Animated.Value(0)).current;
  const response = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(1)).current;
  const previousInteraction = useRef(interaction);
  const lastRecordedInteraction = useRef(0);
  const selectionAt = useRef(0);

  useEffect(() => {
    breath.setValue(0);
    if (!animate) return;
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(breath, {
        toValue: 1, duration: Math.max(5200, appearance.duration * 1.5),
        easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false,
      }),
      Animated.timing(breath, {
        toValue: 0, duration: Math.max(5200, appearance.duration * 1.5),
        easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false,
      }),
    ]));
    breathing.start();
    return () => breathing.stop();
  }, [animate, appearance.duration, breath]);

  useEffect(() => {
    const newSelection = interaction !== previousInteraction.current;
    previousInteraction.current = interaction;
    if (newSelection) selectionAt.current = Date.now();
    if (reduceMotion || !animate) { response.setValue(1); return; }
    if (!feedbackActive || !newSelection) {
      // 离开时从当前缩放平滑收回；直接设为 1 会在镜头刚启动时跳一下。
      const settle = Animated.timing(response, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false });
      settle.start();
      return () => settle.stop();
    }
    // 按钮先回弹，再让星球轻轻回应；新选择或离开首页会取消整段反馈。
    const pop = Animated.sequence([
      Animated.delay(110),
      Animated.timing(response, { toValue: 0.975, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(response, { toValue: 1, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
    ]);
    pop.start();
    return () => pop.stop();
  }, [interaction, mood, reduceMotion, animate, feedbackActive, response]);

  useEffect(() => {
    ripple.setValue(1);
    if (reduceMotion || !animate || !feedbackActive) {
      lastRecordedInteraction.current = interaction;
      return;
    }
    if (!saved || !interaction || lastRecordedInteraction.current === interaction) return;
    // 页面重新获得焦点时只恢复呼吸，不重播旧记录的完成反馈。
    lastRecordedInteraction.current = interaction;
    ripple.setValue(0);
    // 写入立即进行；只有实际成功，并经过星球回应后，才播放完成波纹。
    const wave = Animated.sequence([
      Animated.delay(Math.max(0, 520 - (Date.now() - selectionAt.current))),
      Animated.timing(ripple, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false }),
    ]);
    wave.start();
    return () => wave.stop();
  }, [saved, interaction, reduceMotion, animate, feedbackActive, ripple]);

  const float = breath.interpolate({ inputRange: [0, 1], outputRange: [0, appearance.lift] });
  const scale = Animated.multiply(response, breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }));
  const orbitTilt = Animated.add(breath.interpolate({ inputRange: [0, 1], outputRange: [-22, -18] }),
    cameraMotion.orbitTurn).interpolate({ inputRange: [-360, 90], outputRange: ['-360deg', '90deg'] });
  const orbitDepth = cameraMotion.orbitDepth;
  const layoutScale = Math.min(0.91, sceneHeight / 350);

  return (
    <View style={[styles.scene, { height: sceneHeight }]} pointerEvents="none" accessible={false}>
      <View style={[styles.planetLayout, { transform: [{ scale: layoutScale }] }]}>
        <Animated.View testID="mood-planet" style={[styles.world, {
          transform: [{ translateY: float }, { scale }],
        }]}>
          <Animated.View style={[styles.atmosphere, {
            backgroundColor: palette.atmosphere, shadowColor: palette.atmosphere,
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.035] }),
          }]} />
          <Animated.View testID="record-ripple" style={[styles.ripple, {
            borderColor: palette.ring,
            opacity: ripple.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.32, 0] }),
            transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.45] }) }],
          }]} />

          {/* 星环先画背面，再画星球，最后补前半圈，形成遮挡关系。 */}
          <Animated.View style={[styles.ringPlane, { opacity: 0.22, transform: [{ rotate: orbitTilt }] }]}>
            <RingLines color={palette.ring} depth={orbitDepth} />
          </Animated.View>
          <View testID="mood-orb" style={[styles.orb, { shadowColor: palette.shade }]}>
            <View style={styles.orbClip}>
              <SoftGradient colors={palette.surface} style={StyleSheet.absoluteFill} reduceMotion={reduceMotion} />
              <Animated.View testID="planet-clouds" style={[StyleSheet.absoluteFill, {
                transform: [{ translateX: Animated.add(breath.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }), cameraMotion.clouds) }],
              }]}>
                <LinearGradient colors={['#FFFFFF00', `${palette.ring}60`, '#FFFFFF00']}
                  style={[styles.cloudBand, { top: 236 * palette.mist.top, height: 236 * palette.mist.height,
                    opacity: palette.mist.opacity, transform: [{ rotate: `${palette.mist.angle}deg` }] }]} />
              </Animated.View>
              <LinearGradient colors={['#FFFFFF00', `${palette.shade}10`, `${palette.shade}90`]}
                locations={[0, 0.52, 1]} start={{ x: 0, y: 0.05 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['#F1EBDD24', '#FFFFFF05', '#FFFFFF00']}
                locations={[0, 0.6, 1]} start={{ x: 0.12, y: 0.08 }} end={{ x: 0.75, y: 0.78 }} style={styles.light} />
              <View style={styles.rim} />
              <LinearGradient colors={['#F0EDE500', '#F0EDE52C', '#F0EDE500']} style={styles.reflection} />
            </View>
          </View>
          <Animated.View style={[styles.ringPlane, { opacity: 0.4, transform: [{ rotate: orbitTilt }] }]}>
            <View style={styles.frontRingClip}>
              <View style={styles.frontRingOffset}><RingLines color={palette.ring} depth={orbitDepth} /></View>
            </View>
          </Animated.View>
          <Animated.View style={[styles.satelliteOrbit, { transform: [{ rotate: breath.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '-2deg'] }) }] }]}>
            <LinearGradient colors={[`${palette.ring}B0`, `${palette.shade}90`]} style={styles.satellite} />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
});

function RingLines({ color, depth }: { color: string; depth: Animated.AnimatedInterpolation<number> }) {
  return (
    <Animated.View style={[styles.ringLines, { borderColor: color, transform: [{ scaleY: depth }] }]} />
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  skyGlow: { position: 'absolute', top: 100, left: -100, width: 420, height: 520, borderRadius: 210, overflow: 'hidden', transform: [{ rotate: '-25deg' }] },
  scene: { height: 320, alignItems: 'center', justifyContent: 'center' },
  planetLayout: { width: 350, height: 350 },
  world: { width: 350, height: 350 },
  atmosphere: { position: 'absolute', left: 43, top: 43, width: 264, height: 264, borderRadius: 132, shadowOpacity: 0.55, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } },
  ripple: { position: 'absolute', left: 49, top: 49, width: 252, height: 252, borderRadius: 126, borderWidth: 1 },
  ringPlane: { position: 'absolute', left: 8, top: 8, width: 334, height: 334 },
  ringLines: { width: 334, height: 334, borderRadius: 167, borderWidth: 0.8 },
  frontRingClip: { position: 'absolute', top: 167, width: 334, height: 167, overflow: 'hidden' },
  frontRingOffset: { position: 'absolute', top: -167 },
  orb: {
    position: 'absolute', left: 57, top: 57, width: 236, height: 236, borderRadius: 118,
    shadowOffset: { width: 10, height: 16 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 3,
  },
  orbClip: { flex: 1, borderRadius: 118, overflow: 'hidden' },
  cloudBand: { position: 'absolute', width: 330, borderRadius: 100, left: -46 },
  light: { position: 'absolute', top: -25, left: -20, width: 256, height: 256, borderRadius: 128 },
  rim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 118, borderWidth: 0.8, borderColor: '#E6E7DF38' },
  reflection: { position: 'absolute', width: 28, height: 82, top: 16, left: 25, borderRadius: 22, transform: [{ rotate: '38deg' }] },
  satelliteOrbit: { ...StyleSheet.absoluteFill },
  satellite: { position: 'absolute', left: 311, top: 107, width: 8, height: 8, borderRadius: 4 },
});
