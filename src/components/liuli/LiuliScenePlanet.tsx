import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import type { MoodType } from '../../models/mood';
import { MoodCelestial } from '../MoodCelestial';
import { isLiuliMood } from './LiuliArt';
import { LiuliPlanet } from './LiuliPlanet';

// 正式首页的三种状态共用同一个场景位置；未记录时不会写入默认心情。
export function LiuliScenePlanet({ mood, size, enabled, reduceMotion, responseKey }: {
  mood?: MoodType; size: number; enabled: boolean; reduceMotion: boolean; responseKey: number;
}) {
  if (isLiuliMood(mood)) return <LiuliPlanet mood={mood} size={size} enabled={enabled} reduceMotion={reduceMotion} responseKey={responseKey} />;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {mood ? <MoodCelestial mood={mood} size={size * 0.86} variant="chamber" />
      : <View testID="liuli-unrecorded-planet" style={{ width: size * 0.86, height: size * 0.86, borderRadius: size, overflow: 'hidden', borderWidth: 1, borderColor: '#A7C7BB66' }}>
        <LinearGradient colors={['#FFF7D4', '#E4EFE5', '#D5E7E5']} start={{ x: 0.15, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
          <LinearGradient colors={['#FFFFFFAA', '#FFFFFF00']} style={{ position: 'absolute', left: '8%', top: '5%', width: '55%', height: '70%', borderRadius: size }} />
        </LinearGradient>
      </View>}
  </View>;
}
