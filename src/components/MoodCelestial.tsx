import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { MoodType } from '../models/mood';
import { planetAppearance } from '../theme/planetAppearance';
import { useAppTheme } from '../state/AppThemeContext';
import type { AppTheme } from '../theme/appThemes';
import { isLiuliMood, LiuliArt } from './liuli/LiuliArt';

export function MoodCelestial({ mood, size = 34, variant }: { mood: MoodType; size?: number; variant?: AppTheme }) {
  const { theme } = useAppTheme();
  if ((variant ?? theme) === 'liuli' && isLiuliMood(mood)) return <LiuliArt mood={mood} size={size} />;
  const palette = planetAppearance[mood];
  return (
    <View style={{ width: size, height: size }} pointerEvents="none" accessible={false}>
      <View style={{ ...StyleSheet.absoluteFill, borderRadius: size / 2, backgroundColor: `${palette.ring}08` }}>
        <LinearGradient colors={[`${palette.ring}58`, `${palette.atmosphere}18`, `${palette.shade}80`]}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.85, y: 1 }} style={{ flex: 1, borderRadius: size / 2, overflow: 'hidden', borderWidth: 0.8, borderColor: `${palette.ring}45` }}>
          <LinearGradient colors={['#FFFFFF00', `${palette.ring}65`, '#FFFFFF00']}
            style={{ position: 'absolute', width: size * 1.6, height: size * palette.mist.height,
              top: size * palette.mist.top, left: -size * 0.3, opacity: palette.mist.opacity,
              transform: [{ rotate: `${palette.mist.angle}deg` }] }} />
          <LinearGradient colors={['#F2ECE328', '#FFFFFF00']}
            style={{ position: 'absolute', width: size * 0.5, height: size * 0.55, left: size * 0.05, top: 0, borderRadius: size }} />
        </LinearGradient>
      </View>
    </View>
  );
}
