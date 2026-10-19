import { Image, StyleSheet, View } from 'react-native';

export const liuliMoods = [
  { type: 'happy', label: '开心', color: '#B97819', note: '阳光轻闪，河谷舒展', companion: '把这一刻的好心情留住。', column: 0, row: 0 },
  { type: 'calm', label: '平静', color: '#33866F', note: '水面泛起缓慢涟漪', companion: '这一刻，可以慢一点。', column: 1, row: 0 },
  { type: 'sad', label: '低落', color: '#4C79B5', note: '雨慢慢落下，留一点空间', companion: '不用急着让自己开心。', column: 0, row: 1 },
  { type: 'tired', label: '疲惫', color: '#8A71B4', note: '薄雾轻移，节奏慢下来', companion: '累了，就在这里歇一会儿。', column: 1, row: 1 },
] as const;

export type LiuliMood = (typeof liuliMoods)[number]['type'];

export function isLiuliMood(value: string | undefined): value is LiuliMood {
  return liuliMoods.some(mood => mood.type === value);
}

const atlas = require('../../../assets/liuli/weather-atlas.png');

// 图集的四格留白并不相同。按实际图形范围取景，让四颗星球共用中心与直径。
const frames = {
  happy: { x: 25, y: 33, width: 592, height: 578 },
  calm: { x: 624, y: 33, width: 576, height: 582 },
  sad: { x: 53, y: 621, width: 571, height: 587 },
  tired: { x: 625, y: 621, width: 577, height: 579 },
} as const;

/** 只调整图集的取景位置，不重新生成已确认的星球形象。 */
export function LiuliArt({ mood, size }: { mood: LiuliMood; size: number }) {
  const frame = frames[mood];
  const scale = size * 0.91 / Math.max(frame.width, frame.height);
  const width = frame.width * scale;
  const height = frame.height * scale;
  return <View testID={`liuli-art-${mood}`} pointerEvents="none" accessible={false}
    style={{ width: size, height: size }}>
    <View testID={`liuli-art-bounds-${mood}`} style={{ position: 'absolute', overflow: 'hidden',
      left: (size - width) / 2, top: (size - height) / 2, width, height }}>
      <Image source={atlas} resizeMode="stretch" fadeDuration={0} accessible={false}
        style={[styles.image, { width: 1254 * scale, height: 1254 * scale,
          left: -frame.x * scale, top: -frame.y * scale }]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({ image: { position: 'absolute' } });
