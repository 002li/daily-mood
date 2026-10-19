import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export function useAmbientMotion() {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {
      // 无法读取系统设置时保留静态效果，记录行为不依赖动画。
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);

  return { reduceMotion, foreground };
}
