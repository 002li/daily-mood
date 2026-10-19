import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { MoodType } from '../../models/mood';
import { getMoodTint } from '../../theme/appThemes';

// 四页共用一片明亮光色；只跟随真实的当天选择，不为历史空白日期生成心情。
export function LiuliBackdrop({ mood }: { mood?: MoodType }) {
  const tint = mood ? getMoodTint(mood, 'liuli') : '#749F8B';
  return <View testID="liuli-backdrop" pointerEvents="none" aria-hidden accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <LinearGradient colors={['#E7F2E9', '#FAF5E7', '#FCFBF3']} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
    <LinearGradient colors={[`${tint}12`, '#FFFFFF00', '#FFF0C926']} locations={[0, 0.58, 1]}
      start={{ x: 1, y: 0 }} end={{ x: 0, y: 0.9 }} style={StyleSheet.absoluteFill} />
    <LinearGradient colors={['#FFFFFF70', '#FFFFFF00']} start={{ x: 0, y: 0.15 }} end={{ x: 1, y: 0.55 }} style={StyleSheet.absoluteFill} />
  </View>;
}
