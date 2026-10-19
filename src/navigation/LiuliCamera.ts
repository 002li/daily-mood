import type { PlanetBox } from './SpaceCamera';
import type { SpaceDestination } from './SpaceFlight';

export const liuliFlightDuration = 800;
// 与轨迹页的返回按钮共用尺寸，第一趟也有确定落点，不在飞行中等待目标测量。
export const liuliReturnLayout = { horizontalInset: 24, headerTop: 18, buttonWidth: 104, buttonPadding: 6, buttonHeight: 44, planetSize: 40, gap: 6 };

export function getLiuliReturnBox(frame: { width: number }, insets = { top: 0, right: 0 }): PlanetBox {
  const layout = liuliReturnLayout;
  return { x: frame.width - insets.right - layout.horizontalInset - layout.buttonWidth + layout.buttonPadding,
    y: insets.top + layout.headerTop + (layout.buttonHeight - layout.planetSize) / 2,
    width: layout.planetSize, height: layout.planetSize };
}

// 后退展开：只缩小和移位，星球始终可见；返程读取同一路径。
export function buildLiuliCameraTrack(frame: { width: number; height: number }, box: PlanetBox, insets = { top: 0, right: 0 }) {
  const inputRange = Array.from({ length: 49 }, (_, index) => index / 48);
  const destination = getLiuliReturnBox(frame, insets);
  const deltaX = destination.x + destination.width / 2 - box.x - box.width / 2;
  const deltaY = destination.y + destination.height / 2 - box.y - box.height / 2;
  const poses = inputRange.map(p => {
    const blend = p * p * (3 - 2 * p);
    return {
      x: blend ? deltaX * blend : 0, y: blend ? deltaY * blend : 0,
      scale: 1 + (destination.width / box.width - 1) * blend,
      opacity: 1, lightX: -8 * blend, atmosphere: 0.12 * blend,
    };
  });
  return {
    inputRange,
    x: poses.map(pose => pose.x), y: poses.map(pose => pose.y), scale: poses.map(pose => pose.scale),
    opacity: poses.map(pose => pose.opacity),
    lightX: poses.map(pose => pose.lightX), atmosphere: poses.map(pose => pose.atmosphere),
  };
}

export function canAnimateLiuliJourney(from: SpaceDestination, to: SpaceDestination, anchored: boolean) {
  // 飞行中点回起点也要进入原队列，不能因目标等于当前路由而瞬间落位。
  return (from !== 'Today' && to !== 'Today') || anchored;
}

// 文字在中点交接，星球全程可见，不再保留长时间的空白过场。
export const liuliPageTracks = {
  Today: { inputRange: [0, 0.12, 0.49, 1], opacity: [1, 1, 0, 0] },
  Records: { inputRange: [0, 0.5, 0.76, 1], opacity: [0, 0, 0.95, 1] },
};
