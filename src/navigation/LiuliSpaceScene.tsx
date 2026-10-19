import { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LiuliScenePlanet } from '../components/liuli/LiuliScenePlanet';
import { liuliMoods } from '../components/liuli/LiuliArt';
import type { MoodType } from '../models/mood';
import { buildLiuliCameraTrack } from './LiuliCamera';
import type { PlanetBox } from './SpaceCamera';

type Props = {
  progress: Animated.Value; anchorFade: Animated.Value; box: PlanetBox; frame: { width: number; height: number };
  mood?: MoodType; enabled: boolean; reduceMotion: boolean; responseKey: number;
  insets: { top: number; right: number };
};

export function LiuliSpaceScene({ progress, anchorFade, box, frame, insets, mood, enabled, reduceMotion, responseKey }: Props) {
  const camera = useMemo(() => {
    const track = buildLiuliCameraTrack(frame, box, insets);
    const interpolate = (outputRange: number[] | string[]) => progress.interpolate({ inputRange: track.inputRange, outputRange, extrapolate: 'clamp' });
    return {
      x: interpolate(track.x), y: interpolate(track.y), scale: interpolate(track.scale),
      opacity: Animated.multiply(interpolate(track.opacity), anchorFade), lightX: interpolate(track.lightX),
      atmosphere: Animated.multiply(interpolate(track.atmosphere), anchorFade),
    };
  }, [anchorFade, box, frame, insets.top, insets.right, progress]);
  const tint = liuliMoods.find(item => item.type === mood)?.color ?? '#87B4A6';
  return <View testID="liuli-space-environment" pointerEvents="none" aria-hidden accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Animated.View testID="liuli-distant-light" style={[StyleSheet.absoluteFill, { opacity: camera.atmosphere, transform: [{ translateX: camera.lightX }] }]}>
      <LinearGradient colors={['#FFF1CF88', `${tint}16`, '#D8ECE600']} start={{ x: 0, y: 0.15 }} end={{ x: 0.9, y: 0.85 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
    <Animated.View testID="liuli-planet-camera" style={{ position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height,
      opacity: camera.opacity, transform: [{ translateX: camera.x }, { translateY: camera.y }, { scale: camera.scale }] }}>
      {/* 跨页保持实例与呼吸动画，不在导航中途复制或重新挂载星球。 */}
      <LiuliScenePlanet mood={mood} size={box.width} enabled={enabled} reduceMotion={reduceMotion} responseKey={responseKey} />
    </Animated.View>
  </View>;
}
