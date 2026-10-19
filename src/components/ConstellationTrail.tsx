import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAmbientMotion } from '../hooks/useAmbientMotion';
import { buildConstellationDays, clampDay, dateToDay, dayToDate, getConstellationBounds, projectConnection, projectStar } from '../models/constellation';
import { formatCreatedTime, formatRecordDate, isLegacyMood, moods, type MoodRecord } from '../models/mood';
import { useAppTheme } from '../state/AppThemeContext';
import { useThemedStyles, type ThemeColors } from '../theme/useThemedStyles';
import { getMoodTint } from '../theme/appThemes';
import { MoodCelestial } from './MoodCelestial';

type Props = { records: MoodRecord[]; today: string; active: boolean; spaceProgress?: Animated.Value };
const nativeDriver = Platform.OS !== 'web';
// 浏览器手势样式不传给原生端；原生 ViewStyle 没有这两个 CSS 字段。
const webPanStyle = Platform.OS === 'web'
  ? { overflow: 'hidden', touchAction: 'pan-y', userSelect: 'none' } as ViewStyle : undefined;

export function ConstellationTrail({ records, today, active, spaceProgress }: Props) {
  const { theme, colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const bounds = useMemo(() => getConstellationBounds(records, today), [records, today]);
  const [focus, setFocus] = useState(() => dateToDay(today));
  const [cameraPosition, setCameraPosition] = useState(() => dateToDay(today));
  const [frame, setFrame] = useState({ width: 320, height: 260 });
  const camera = useRef(new Animated.Value(bounds.current)).current;
  const arrival = useRef(new Animated.Value(1)).current;
  const current = useRef(bounds.current);
  const focusRef = useRef(focus);
  const destination = useRef(bounds.current);
  const origin = useRef(bounds.current);
  const alive = useRef(true);
  const generation = useRef(0);
  const movement = useRef<Animated.CompositeAnimation | null>(null);
  const { reduceMotion, foreground } = useAmbientMotion();
  const environment = useRef({ ...bounds, active, foreground, reduceMotion });
  environment.current = { ...bounds, active, foreground, reduceMotion };

  const stop = useCallback(() => {
    generation.current += 1;
    movement.current?.stop();
    movement.current = null;
  }, []);
  const moveTo = useCallback((requested: number) => {
    const settings = environment.current;
    if (!settings.active || !settings.foreground) return;
    const target = Math.round(clampDay(requested, settings.first, settings.last));
    stop();
    destination.current = target;
    const token = generation.current;
    // 远距离“回到今天”直接重新取景，再淡入；不穿过数年的日期。
    if (settings.reduceMotion || Math.abs(target - current.current) > 4) {
      current.current = target;
      camera.setValue(target);
      focusRef.current = target;
      setFocus(target);
      arrival.setValue(settings.reduceMotion ? 1 : 0);
      if (!settings.reduceMotion) {
        movement.current = Animated.timing(arrival, { toValue: 1, duration: 380, useNativeDriver: nativeDriver });
        movement.current.start();
      }
      return;
    }
    arrival.setValue(1);
    movement.current = Animated.spring(camera, {
      toValue: target, stiffness: 100, damping: 22, mass: 1,
      overshootClamping: true, useNativeDriver: false,
    });
    movement.current.start(({ finished }) => {
      if (!finished || token !== generation.current || !alive.current) return;
      current.current = target;
      camera.setValue(target);
      destination.current = target;
    });
  }, [arrival, camera, stop]);

  useEffect(() => {
    alive.current = true;
    const listener = camera.addListener(({ value }) => {
      current.current = value;
      if (alive.current) setCameraPosition(value);
      const settings = environment.current;
      const nearest = Math.round(clampDay(value, settings.first, settings.last));
      // 单一镜头数值投影最多 13 个星位，避免反复创建大量动画插值节点。
      if (nearest !== focusRef.current && alive.current) {
        focusRef.current = nearest;
        setFocus(nearest);
      }
    });
    return () => {
      alive.current = false;
      stop();
      camera.removeListener(listener);
    };
  }, [camera, stop]);

  useEffect(() => {
    stop();
    const nearest = Math.round(clampDay(current.current, bounds.first, bounds.last));
    camera.setValue(nearest);
    current.current = destination.current = nearest;
    focusRef.current = nearest;
    setFocus(nearest);
    arrival.setValue(1);
  }, [active, foreground, reduceMotion, bounds.first, bounds.last, frame.width, frame.height, arrival, camera, stop]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => environment.current.active && environment.current.foreground
      && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderGrant: () => {
      stop();
      origin.current = current.current;
      camera.stopAnimation((value) => { origin.current = value; });
    },
    onPanResponderMove: (_, gesture) => {
      const settings = environment.current;
      if (!settings.active || !settings.foreground) return;
      const delta = Math.max(-3, Math.min(3, -gesture.dx / 92));
      const next = clampDay(origin.current + delta, settings.first, settings.last);
      const position = settings.reduceMotion ? Math.round(next) : next;
      current.current = position;
      camera.setValue(position);
    },
    onPanResponderRelease: (_, gesture) => moveTo(current.current - Math.max(-0.6, Math.min(0.6, gesture.vx * 0.45))),
    onPanResponderTerminate: () => moveTo(current.current),
    onPanResponderTerminationRequest: () => true,
  }), [camera, moveTo, stop]);

  const days = useMemo(() => buildConstellationDays(records, today, focus), [records, today, focus]);
  const selected = days.find((day) => day.day === focus);
  const mood = selected?.record ? moods.find((item) => item.type === selected.record!.mood) : undefined;
  const tint = mood ? getMoodTint(mood.type, theme) : colors.primary;
  const litCount = records.filter((record) => record.date <= today).length;

  return <View style={styles.container}>
    <Text style={styles.caption}>{litCount ? `记录了 ${litCount} 天` : '还没有心情记录'}</Text>
    <Animated.View testID="constellation-stage" {...pan.panHandlers} style={[styles.stage, webPanStyle, { opacity: arrival }, spaceProgress && {
      transform: [{ scale: spaceProgress.interpolate({ inputRange: [0, 0.5, 0.78, 1], outputRange: [0.7, 0.82, 0.97, 1], extrapolate: 'clamp' }) }],
    }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setFrame((previous) => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
      <View pointerEvents="none" style={styles.axis} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => <View key={`dust-${index}`} pointerEvents="none" style={{
        position: 'absolute', width: index % 3 ? 1 : 2, height: index % 3 ? 1 : 2, borderRadius: 2,
        backgroundColor: '#D7DFDF', opacity: 0.12,
        left: `${(index * 37 + 13) % 100}%`, top: `${(index * 23 + 11) % 90}%`,
        transform: [{ translateX: Math.sin(cameraPosition * 0.055 + index) * 18 }],
      }} />)}

      {days.slice(0, -1).map((day, index) => {
        const next = days[index + 1];
        const line = projectConnection(day.day, next.day, cameraPosition, frame.width, frame.height);
        const recorded = !!day.record && !!next.record;
        const lineColors = recorded
          ? [getMoodTint(day.record!.mood, theme), getMoodTint(next.record!.mood, theme)] as const
          : ['#9CB3CF', '#9CB3CF'] as const;
        return <View key={`line-${day.date}`} testID={recorded ? 'recorded-star-connection' : 'empty-star-connection'} pointerEvents="none"
          style={[styles.connection, {
            opacity: line.opacity * (recorded ? (theme === 'liuli' ? 0.68 : 0.5) : (theme === 'liuli' ? 0.24 : 0.14)),
            height: theme === 'liuli' ? 1.5 : 1,
            transform: [
              { translateX: line.x },
              { translateY: line.y },
              { rotateZ: `${line.angle}deg` },
              { scaleX: line.length / 100 },
            ],
          }]}>
          {recorded ? <LinearGradient colors={lineColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            : <View style={styles.dashedLine} />}
        </View>;
      })}

      {days.map((day) => {
        const point = projectStar(day.day, cameraPosition, frame.width, frame.height);
        const color = day.record ? getMoodTint(day.record.mood, theme) : '#AEC1D6';
        const label = day.record ? moods.find((item) => item.type === day.record!.mood)!.label : day.future ? '等待这一天' : '未记录';
        const focused = day.day === focus;
        return <View key={day.date} testID={`star-position-${day.date}`} style={[styles.starPosition, {
          zIndex: focused ? 3 : 2,
          opacity: point.opacity,
          transform: [
            { translateX: point.x - 22 },
            { translateY: point.y - 22 },
            { scale: point.scale },
          ],
        }]}>
          <Pressable testID={`constellation-star-${day.date}`} accessibilityRole="button"
            accessibilityLabel={`${formatRecordDate(day.date)}${day.today ? '，今天' : ''}，${label}`}
            accessibilityState={{ selected: focused, disabled: !active }} disabled={!active}
            onPress={() => moveTo(day.day)} hitSlop={4} style={styles.starTouch}>
            {day.record && <View pointerEvents="none" style={[styles.glow, { backgroundColor: `${color}17`, shadowColor: color }]} />}
            {day.today && !focused && <View pointerEvents="none" style={[styles.todayRing, { borderColor: `${color}75` }]} />}
            {focused && <View pointerEvents="none" style={[styles.focusRing, { borderColor: color }]} />}
            <View style={[styles.starCore, day.record ? { backgroundColor: color, shadowColor: color } : styles.emptyCore,
              theme === 'liuli' && day.record && styles.liuliCore]}>
              {theme === 'liuli' && day.record && <LinearGradient colors={['#FFFFFFD0', color, `${color}B0`]} locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ ...StyleSheet.absoluteFill, borderRadius: 5 }} />}
            </View>
            {day.record && <>
              <View style={[styles.ray, { backgroundColor: `${color}70` }]} />
              <View style={[styles.ray, styles.verticalRay, { backgroundColor: `${color}70` }]} />
            </>}
            <Text style={[styles.starDate, theme === 'liuli' && { fontSize: 11, width: 60 }, { color: focused ? colors.text : colors.muted }]}>{day.today ? '今天' : day.date.slice(5).replace('-', '.')}</Text>
          </Pressable>
        </View>;
      })}
    </Animated.View>

    <View style={styles.legend} pointerEvents="none">
      <Text style={styles.legendText}>✦ 已记录</Text><Text style={styles.legendText}>○ 留白 / 未来</Text>
    </View>
    <View testID="constellation-detail" style={[styles.detail, theme === 'liuli' && styles.liuliDetail]} accessibilityLiveRegion="polite">
      <Text style={styles.detailDate}>{formatRecordDate(dayToDate(focus))}{focus === bounds.current ? ' · 今天' : ''}</Text>
      <View style={styles.moodRow}>
        {mood && theme === 'liuli' && <MoodCelestial mood={mood.type} size={36} />}
        <Text style={[styles.mood, { color: tint }]}>{mood?.label ?? (selected?.future ? '等待这一天' : '这一天留了白')}
          {mood && isLegacyMood(mood.type) && <Text style={styles.legacyLabel}> · 旧记录</Text>}
        </Text>
      </View>
      <Text style={styles.detailNote}>{selected?.record ? `首次记录于 ${formatCreatedTime(selected.record.createdAt)}`
        : selected?.future ? '这一天还没到。' : focus === bounds.current ? '在「今天」选择心情，就会出现在这里。' : '当天没有留下心情记录。'}</Text>
    </View>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="查看更早一天" disabled={focus <= bounds.first || !active}
        onPress={() => moveTo(destination.current - 1)} style={({ pressed }) => [styles.step, { opacity: focus <= bounds.first || !active ? 0.25 : pressed ? 0.55 : 1 }]}>
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="星座回到今天" disabled={!active}
        onPress={() => moveTo(dateToDay(today))} style={({ pressed }) => [styles.todayButton, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={styles.todayText}>回到今天</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="查看更晚一天" disabled={focus >= bounds.last || !active}
        onPress={() => moveTo(destination.current + 1)} style={({ pressed }) => [styles.step, { opacity: focus >= bounds.last || !active ? 0.25 : pressed ? 0.55 : 1 }]}>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
    <Text style={styles.hint}>向右看过去 · 向左看未来 7 天</Text>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  caption: { marginTop: 14, marginHorizontal: 24, color: colors.muted, fontSize: 12, lineHeight: 20 },
  stage: { flex: 1, minHeight: 120, overflow: 'hidden' },
  axis: { position: 'absolute', left: '50%', top: '16%', bottom: '20%', width: 1, backgroundColor: colors.track },
  connection: { position: 'absolute', left: -50, top: 0, width: 100, height: 1 },
  dashedLine: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#9CB3CF' },
  starPosition: { position: 'absolute', left: 0, top: 0, width: 44, height: 44 },
  starTouch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 32, height: 32, borderRadius: 16, shadowOpacity: 0.4, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } },
  todayRing: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1 },
  focusRing: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 1, opacity: 0.6 },
  starCore: { width: 7, height: 7, borderRadius: 4, shadowOpacity: 0.45, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  liuliCore: { width: 10, height: 10, borderRadius: 5, borderWidth: 0.6, borderColor: '#FFFFFFB0' },
  emptyCore: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.muted, backgroundColor: 'transparent', shadowOpacity: 0 },
  ray: { position: 'absolute', width: 22, height: 1 },
  verticalRay: { width: 1, height: 22 },
  starDate: { position: 'absolute', top: 43, width: 54, textAlign: 'center', fontSize: 10, lineHeight: 18 },
  legend: { flexDirection: 'row', gap: 20, justifyContent: 'center', paddingBottom: 10 },
  legendText: { color: colors.muted, fontSize: 10, lineHeight: 18 },
  detail: { minHeight: 96, alignItems: 'center', paddingHorizontal: 24, justifyContent: 'center' },
  liuliDetail: { marginHorizontal: 20, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#FFFFFF50', borderWidth: 1, borderColor: '#FFFFFF90' },
  detailDate: { color: colors.muted, fontSize: 12, lineHeight: 22 },
  moodRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mood: { fontSize: 23, lineHeight: 32, fontWeight: '500', letterSpacing: 1 },
  legacyLabel: { color: colors.muted, fontSize: 11, lineHeight: 20, letterSpacing: 0 },
  detailNote: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 21, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30, marginTop: 8 },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: colors.primary, fontSize: 28, lineHeight: 36 },
  todayButton: { minWidth: 92, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  todayText: { color: colors.primary, fontSize: 12, lineHeight: 22 },
  hint: { color: colors.muted, fontSize: 10, lineHeight: 20, textAlign: 'center', marginBottom: 10 },
});
