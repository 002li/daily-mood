import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { LiuliArt, liuliMoods, type LiuliMood } from './LiuliArt';
import { LiuliWeatherEffects } from './LiuliWeatherEffects';

type Props = { mood: LiuliMood; size: number; enabled: boolean; reduceMotion: boolean; responseKey: number };
const nativeDriver = Platform.OS !== 'web';

export function LiuliPlanet({ mood, size, enabled, reduceMotion, responseKey }: Props) {
  const [shown, setShown] = useState(mood);
  const [previous, setPrevious] = useState<LiuliMood | null>(null);
  const wanted = useRef(mood);
  const showing = useRef(mood);
  const running = useRef(false);
  const alive = useRef(true);
  const version = useRef(0);
  const fade = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const squeeze = useRef(new Animated.Value(0)).current;
  const lastResponseKey = useRef(responseKey);
  const flight = useRef<Animated.CompositeAnimation | null>(null);
  const advance = useRef<() => void>(() => {});
  const moving = enabled && !reduceMotion;

  // 一次只保留两层；切换中继续点选只更新最终目的地，不堆叠半透明星球。
  advance.current = () => {
    if (!alive.current || running.current || showing.current === wanted.current) return;
    const target = wanted.current;
    const origin = showing.current;
    showing.current = target;
    setShown(target);
    if (!moving) { setPrevious(null); fade.setValue(1); return; }
    setPrevious(origin);
    running.current = true;
    fade.setValue(0);
    const token = ++version.current;
    flight.current = Animated.timing(fade, {
      toValue: 1, duration: 440, easing: Easing.inOut(Easing.cubic),
      useNativeDriver: nativeDriver, isInteraction: false,
    });
    flight.current.start(({ finished }) => {
      if (!finished || !alive.current || token !== version.current) return;
      running.current = false;
      setPrevious(null);
      advance.current();
    });
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current += 1;
      running.current = false;
      flight.current?.stop();
      fade.stopAnimation();
    };
  }, [fade]);

  useEffect(() => {
    wanted.current = mood;
    if (!moving) {
      version.current += 1;
      flight.current?.stop();
      running.current = false;
      showing.current = mood;
      setShown(mood);
      setPrevious(null);
      fade.setValue(1);
    } else advance.current();
  }, [fade, mood, moving]);

  useEffect(() => {
    breath.setValue(0);
    if (!moving) return;
    const duration = 4400;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
    ]));
    loop.start();
    return () => { loop.stop(); breath.stopAnimation(); };
  }, [breath, moving]);

  useEffect(() => {
    const freshTouch = lastResponseKey.current !== responseKey;
    // 静态期间也消费触碰，恢复播放或回到前台时不重播旧回弹。
    lastResponseKey.current = responseKey;
    squeeze.stopAnimation();
    squeeze.setValue(0);
    if (!moving || !freshTouch) return;
    squeeze.setValue(1);
    const response = Animated.spring(squeeze, {
      toValue: 0, stiffness: 240, damping: 11, mass: 0.7,
      useNativeDriver: nativeDriver, isInteraction: false,
    });
    response.start();
    return () => { response.stop(); squeeze.stopAnimation(); };
  }, [moving, responseKey, squeeze]);

  const label = liuliMoods.find(item => item.type === shown)!.label;
  return <View testID="liuli-planet" accessibilityLabel={`${label}的琉璃星球`} style={{ width: size, height: size }}>
    <Animated.View testID="liuli-breath" style={{ width: size, height: size, transform: [
      { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) },
      { scaleX: squeeze.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
      { scaleY: squeeze.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] }) },
    ] }}>
      {previous && <Animated.View testID="liuli-outgoing" pointerEvents="none" style={{ position: 'absolute', opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <LiuliArt mood={previous} size={size} />
      </Animated.View>}
      <Animated.View testID="liuli-current" style={{ opacity: fade }}>
        <LiuliArt mood={shown} size={size} />
        <LiuliWeatherEffects mood={shown} size={size} enabled={enabled} reduceMotion={reduceMotion} />
      </Animated.View>
    </Animated.View>
  </View>;
}
