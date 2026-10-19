import type { SpaceDestination } from './SpaceFlight';

export const primaryDestinations = ['Today', 'Records'] as const;
export type PrimaryDestination = (typeof primaryDestinations)[number];

// 保留现有四条内部路由，日历和统计归入轨迹区域；底部只展示两个主入口。
export function getPrimaryDestination(route: SpaceDestination): PrimaryDestination {
  return route === 'Today' ? 'Today' : 'Records';
}

export function getBackDestination(route: SpaceDestination, transitioning = false): PrimaryDestination | null {
  if (route === 'Calendar' || route === 'Statistics') return 'Records';
  // 镜头尚未落位时，返回当前主页面，不让系统直接退出 App。
  if (transitioning) return route;
  return route === 'Records' ? 'Today' : null;
}
