export type PlanetBox = { x: number; y: number; width: number; height: number };
type Frame = { width: number; height: number };

// 保留四个观察位置。单次飞行只在起点与终点之间插值，不经过未选择的页面。
function station(position: number, frame: Frame, box: PlanetBox) {
  return {
    x: frame.width * [0, 0.48, -0.48, 0.22][position],
    y: [0, 30 - box.y, 55 - box.y, frame.height * 0.28 - box.y][position],
    scale: [1, 2.25, 2.05, 2.4][position],
    rotation: [0, -14, 20, -38][position],
    opacity: [1, 0.055, 0.12, 0.13][position],
    orbitTurn: [0, -95, -185, -275][position],
    orbitDepth: [0.32, 0.24, 0.28, 0.32][position],
    clouds: [-12, 62, -34, 34][position],
  };
}

export function buildSpaceCameraTrack(from: number, to: number, frame: Frame, box: PlanetBox) {
  const start = station(from, frame, box);
  const end = station(to, frame, box);
  const moving = from !== to;
  // Animated 要求输入递增；返程也使用同一条弧线，按相反方向读取。
  const inputRange = moving
    ? Array.from({ length: 49 }, (_, index) => Math.min(from, to) + Math.abs(to - from) * index / 48)
    : [0, 3];
  const poses = inputRange.map((position) => {
    const t = moving ? (position - from) / (to - from) : 0;
    const approach = moving ? 4 * t * (1 - t) : 0;
    const blend = (a: number, b: number) => a + (b - a) * t;
    return {
      x: blend(start.x, end.x) - frame.width * 0.14 * approach,
      y: blend(start.y, end.y) - 18 * approach,
      scale: blend(start.scale, end.scale) + 0.55 * approach,
      rotation: blend(start.rotation, end.rotation),
      opacity: blend(start.opacity, end.opacity),
      orbitTurn: blend(start.orbitTurn, end.orbitTurn),
      orbitDepth: blend(start.orbitDepth, end.orbitDepth) + 0.18 * approach,
      clouds: blend(start.clouds, end.clouds),
    };
  });
  return {
    inputRange,
    x: poses.map((pose) => pose.x),
    y: poses.map((pose) => pose.y),
    scale: poses.map((pose) => pose.scale),
    rotation: poses.map((pose) => `${pose.rotation}deg`),
    opacity: poses.map((pose) => pose.opacity),
    orbitTurn: poses.map((pose) => pose.orbitTurn),
    orbitDepth: poses.map((pose) => pose.orbitDepth),
    clouds: poses.map((pose) => pose.clouds),
  };
}
