import { StyleSheet, View } from 'react-native';
import type { SpaceDestination } from '../navigation/SpaceFlight';

// 用同一线宽绘制四个小图形，避免不同系统字体将符号渲染成不同样式。
export function NavigationIcon({ name, color, focused }: { name: SpaceDestination; color: string; focused: boolean }) {
  const line = { backgroundColor: color };
  return <View style={styles.frame} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {name === 'Today' && <>
      <View style={[styles.circle, { borderColor: color }]} />
      {focused && <View style={[styles.center, line]} />}
    </>}
    {name === 'Records' && <>
      <View style={[styles.link, line, { left: 3, top: 10, transform: [{ rotate: '-48deg' }] }]} />
      <View style={[styles.link, line, { left: 11, top: 8, transform: [{ rotate: '37deg' }] }]} />
      {[[3, 14], [11, 5], [19, 11]].map(([x, y]) => <View key={x} style={[styles.star, line, { left: x - 1.5, top: y - 1.5 }]} />)}
    </>}
    {name === 'Calendar' && <>
      <View style={[styles.calendar, { borderColor: color }]} />
      <View style={[styles.rule, line]} />
      {[7, 16].map((x) => <View key={x} style={[styles.hook, line, { left: x }]} />)}
      <View style={[styles.star, line, { left: 8, top: 13 }]} />
    </>}
    {name === 'Statistics' && [7, 14, 10].map((height, index) => <View key={index} style={[styles.bar, line, { height, left: 4 + index * 6, top: 19 - height }]} />)}
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: 24, height: 24 },
  circle: { position: 'absolute', left: 3, top: 3, width: 18, height: 18, borderRadius: 9, borderWidth: 1.2 },
  center: { position: 'absolute', left: 10.5, top: 10.5, width: 3, height: 3, borderRadius: 1.5 },
  link: { position: 'absolute', width: 12, height: 1, opacity: 0.7 },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },
  calendar: { position: 'absolute', left: 3, top: 5, width: 18, height: 16, borderRadius: 3, borderWidth: 1.2 },
  rule: { position: 'absolute', left: 4, top: 10, width: 16, height: 1 },
  hook: { position: 'absolute', top: 2, width: 1.2, height: 6, borderRadius: 1 },
  bar: { position: 'absolute', width: 2, borderRadius: 1 },
});
