import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoodBackdrop, MoodPlanet } from '../components/MoodVisual';
import { useAmbientMotion } from '../hooks/useAmbientMotion';
import { useMoodRecords } from '../state/MoodRecordsContext';
import { chamberColors } from '../theme/chamber';
import { useAppTheme } from '../state/AppThemeContext';
import { SpaceFlight, type SpaceDestination, type SpaceJourney } from './SpaceFlight';
import { buildSpaceCameraTrack, type PlanetBox } from './SpaceCamera';
import { LiuliSpaceScene } from './LiuliSpaceScene';
import { canAnimateLiuliJourney } from './LiuliCamera';
import { buildLiuliPageTrack, getLiuliJourneyDuration, isLiuliMainJourney } from './LiuliPageTransition';
import { LiuliBackdrop } from '../components/liuli/LiuliBackdrop';

type SpaceState = {
  progress: Animated.Value;
  journey: SpaceJourney;
  running: boolean;
  activeTab: SpaceDestination;
  travel: (target: SpaceDestination, land: () => void) => void;
  setActiveTab: (tab: SpaceDestination) => void;
  registerPlanet: (node: View | null) => void;
  measureHome: () => void;
  respond: () => void;
};
const SpaceContext = createContext<SpaceState | undefined>(undefined);

export function SpaceScene({ children }: { children: ReactNode }) {
  const { theme, colors, settingsOpen } = useAppTheme();
  const classic = theme === 'chamber';
  const classicRef = useRef(classic);
  classicRef.current = classic;
  const host = useRef<View>(null);
  const homeNode = useRef<View | null>(null);
  const activeTabRef = useRef<SpaceDestination>('Today');
  const progress = useRef(new Animated.Value(0)).current;
  // 页面位置有四站，星球只有首页/停靠两个位置，子页不再牵动星球镜头。
  const planetProgress = useRef(new Animated.Value(0)).current;
  const backdropMotion = useMemo(() => ({ transform: [
    { translateX: progress.interpolate({ inputRange: [0, 3], outputRange: [0, -42] }) },
    { scale: progress.interpolate({ inputRange: [0, 3], outputRange: [1, 1.12] }) },
  ] }), [progress]);
  // 热更新时重建控制器，避免 useState 保留上一版类实例和已经取消的订阅。
  const flight = useMemo(() => new SpaceFlight((to, easing, done, journey) => {
    const curve = classicRef.current ? Easing.cubic : Easing.quad;
    const config = {
      duration: classicRef.current ? 560 : getLiuliJourneyDuration(journey) / 2,
      easing: easing === 'in' ? Easing.in(curve) : Easing.out(curve),
      useNativeDriver: Platform.OS !== 'web',
    };
    const fromPlanet = journey.from === 0 ? 0 : 1;
    const toPlanet = journey.to === 0 ? 0 : 1;
    const animation = Animated.parallel([
      Animated.timing(progress, { ...config, toValue: to }),
      Animated.timing(planetProgress, { ...config, toValue: easing === 'in' ? (fromPlanet + toPlanet) / 2 : toPlanet }),
    ]);
    animation.start(({ finished }) => done(finished));
    return () => animation.stop();
  }, (position) => {
    progress.setValue(position);
    planetProgress.setValue(position === 0 ? 0 : 1);
  }), [planetProgress, progress]);
  const { running, target } = useSyncExternalStore(flight.subscribe, flight.getSnapshot, flight.getSnapshot);
  const { reduceMotion, foreground } = useAmbientMotion();
  const insets = useSafeAreaInsets();
  const { records, today, status } = useMoodRecords();
  const mood = records.find((record) => record.date === today)?.mood;
  const [activeTab, setTab] = useState<SpaceDestination>('Today');
  const [box, setBox] = useState<PlanetBox | null>(null);
  const [anchorReady, setAnchorReady] = useState(false);
  const anchorFade = useRef(new Animated.Value(0)).current;
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const dimensions = useRef(frame);
  const measurementEpoch = useRef(0);
  const alive = useRef(true);
  const [interaction, setInteraction] = useState(0);
  const { from, to } = flight.getJourney();
  const liuliEnvironmentStyle = useMemo(() => {
    if (isLiuliMainJourney({ from, to })) return { opacity: 1, transform: [{ translateX: 0 }] };
    const track = buildLiuliPageTrack(activeTab, { from, to });
    const interpolate = (outputRange: number[]) => progress.interpolate({ inputRange: track.inputRange, outputRange, extrapolate: 'clamp' });
    return {
      opacity: activeTab === 'Today' || activeTab === 'Records' ? interpolate(track.opacity) : 0,
      // 小星球随返回按钮一起轻移，保持相对落点，不在文字旁边错位。
      transform: [{ translateX: interpolate(track.x) }],
    };
  }, [activeTab, from, progress, to]);
  const camera = useMemo(() => {
    if (!box) return null;
    const track = buildSpaceCameraTrack(from, to, frame, box);
    const interpolate = (outputRange: number[]) => progress.interpolate({ inputRange: track.inputRange, outputRange, extrapolate: 'clamp' });
    return {
      x: interpolate(track.x), y: interpolate(track.y), scale: interpolate(track.scale),
      rotation: progress.interpolate({ inputRange: track.inputRange, outputRange: track.rotation, extrapolate: 'clamp' }), opacity: Animated.multiply(interpolate(track.opacity), anchorFade),
      orbitTurn: interpolate(track.orbitTurn), orbitDepth: interpolate(track.orbitDepth), clouds: interpolate(track.clouds),
    };
  }, [anchorFade, box, frame, from, progress, to]);

  useEffect(() => {
    if (!anchorReady) { anchorFade.setValue(0); return; }
    // 窗口变化后，等首页实测定位提交再显示；旧尺寸不会在返程终点闪现。
    const fade = Animated.timing(anchorFade, {
      toValue: 1, duration: reduceMotion || !foreground ? 0 : 220,
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    fade.start();
    return () => fade.stop();
  }, [anchorFade, anchorReady, foreground, reduceMotion]);

  const measureHome = useCallback(() => {
    if (activeTabRef.current !== 'Today' || flight.getSnapshot().running) return;
    const slot = homeNode.current;
    const container = host.current;
    if (!slot || !container) return;
    const token = ++measurementEpoch.current;
    const stale = () => !alive.current || token !== measurementEpoch.current
      || slot !== homeNode.current || container !== host.current
      || activeTabRef.current !== 'Today' || flight.getSnapshot().running;
    slot.measureInWindow((x, y, width, height) => {
      if (stale() || !width || !height) return;
      container.measureInWindow((hostX, hostY) => {
        if (stale()) return;
        const next = { x: x - hostX, y: y - hostY, width, height };
        setBox((previous) => previous && Object.keys(next).every((key) =>
          Math.abs(next[key as keyof PlanetBox] - previous[key as keyof PlanetBox]) < 0.5) ? previous : next);
        setAnchorReady(true);
      });
    });
  }, [flight]);
  const registerPlanet = useCallback((node: View | null) => {
    measurementEpoch.current += 1;
    // 主题切换会重新挂载旧版首页；重新定位之前不显示上一次的星球锚点。
    anchorFade.setValue(0);
    setAnchorReady(false);
    homeNode.current = node;
    if (node) requestAnimationFrame(measureHome);
  }, [anchorFade, measureHome]);
  const setActiveTab = useCallback((tab: SpaceDestination) => {
    measurementEpoch.current += 1;
    activeTabRef.current = tab;
    setTab(tab);
    flight.sync(tab);
    requestAnimationFrame(measureHome);
  }, [flight, measureHome]);
  const travel = useCallback((destination: SpaceDestination, land: () => void) => {
    // 冻结这次飞行的布局基准，丢弃转场前尚未完成的异步测量。
    measurementEpoch.current += 1;
    const liuliJourney = canAnimateLiuliJourney(activeTabRef.current, destination, anchorReady && !!box);
    flight.travel(destination, land, reduceMotion || !foreground || (!classic && !liuliJourney));
  }, [anchorReady, box, classic, flight, foreground, reduceMotion]);

  useEffect(() => {
    if (!running && activeTab === 'Today') {
      const request = requestAnimationFrame(measureHome);
      return () => cancelAnimationFrame(request);
    }
  }, [activeTab, measureHome, running]);

  useEffect(() => {
    if (reduceMotion || !foreground || settingsOpen) flight.finish();
  }, [flight, foreground, reduceMotion, settingsOpen]);
  useEffect(() => {
    // Fast Refresh 和 React 开发模式重建 effect 时，恢复当前页面的镜头位置。
    alive.current = true;
    flight.connect(activeTabRef.current);
    return () => { alive.current = false; measurementEpoch.current += 1; flight.dispose(); };
  }, [flight]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width === dimensions.current.width && height === dimensions.current.height) return;
    measurementEpoch.current += 1;
    anchorFade.setValue(0);
    setAnchorReady(false);
    if (dimensions.current.width && (width !== dimensions.current.width || height !== dimensions.current.height)) flight.finish();
    dimensions.current = { width, height };
    setFrame({ width, height });
    requestAnimationFrame(measureHome);
  };
  return (
    <SpaceContext.Provider value={{ progress, journey: { from, to }, running, activeTab, travel, setActiveTab, registerPlanet, measureHome, respond: () => setInteraction((value) => value + 1) }}>
      <View ref={host} style={[styles.frame, { backgroundColor: colors.background }]} onLayout={onLayout}>
        {!classic && <LiuliBackdrop mood={mood} />}
        {/* 放大的星球单独裁切，避免 Web 将画外视觉当作整页可滚动范围。 */}
        {classic && <View pointerEvents="none" style={styles.environment}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backdropMotion]}>
          <MoodBackdrop mood={mood} reduceMotion={reduceMotion} animate={foreground && !reduceMotion && !settingsOpen} />
        </Animated.View>
        {box && camera && <Animated.View pointerEvents="none" testID="planet-camera" style={{
          position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height,
          opacity: camera.opacity,
          transform: [
            { perspective: 1000 },
            { translateX: camera.x }, { translateY: camera.y },
            { scale: camera.scale }, { rotateZ: camera.rotation },
          ],
        }}>
          <MoodPlanet mood={mood} animate={foreground && !reduceMotion && !settingsOpen} reduceMotion={reduceMotion}
            interaction={interaction} saved={status === 'saved'} sceneHeight={box.height}
            feedbackActive={activeTab === 'Today' && !running && foreground}
            cameraMotion={camera} />
        </Animated.View>}
        </View>}
        {!classic && box && <Animated.View pointerEvents="none" testID="liuli-environment-visibility" style={[styles.environment, liuliEnvironmentStyle]}>
          <LiuliSpaceScene progress={planetProgress} anchorFade={anchorFade} box={box} frame={frame} insets={insets} mood={mood}
            enabled={foreground && !settingsOpen} reduceMotion={reduceMotion} responseKey={interaction} />
        </Animated.View>}
        {children}
        {running && <View testID="space-flight-shield" style={[StyleSheet.absoluteFill, { bottom: 60 + insets.bottom }]} accessibilityLiveRegion="polite"
          accessible accessibilityLabel={`正在前往${({ Today: '今天', Records: '轨迹', Calendar: '日历', Statistics: '统计' })[target]}`} />}
      </View>
    </SpaceContext.Provider>
  );
}

export function useSpaceScene() {
  const state = useContext(SpaceContext);
  if (!state) throw new Error('useSpaceScene 必须在 SpaceScene 内使用。');
  return state;
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: chamberColors.background, overflow: 'hidden' },
  environment: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
});
