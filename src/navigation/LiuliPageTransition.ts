import { liuliFlightDuration, liuliPageTracks } from './LiuliCamera';
import { spacePositions, type SpaceDestination, type SpaceJourney } from './SpaceFlight';

export const liuliSubpageDuration = 360;
export const isLiuliMainJourney = ({ from, to }: SpaceJourney) => from <= 1 && to <= 1;
export const getLiuliJourneyDuration = (journey: SpaceJourney) =>
  journey.from === 0 || journey.to === 0 ? liuliFlightDuration : liuliSubpageDuration;

// 子页只有轻微的水平距离；中点先交出文字，再显示目标，避免透明文字叠印。
export function buildLiuliPageTrack(route: SpaceDestination, journey: SpaceJourney) {
  const { from, to } = journey;
  const position = spacePositions[route];
  if (from === to) return { inputRange: [position - 1, position + 1], opacity: [1, 1], x: [0, 0] };
  if (isLiuliMainJourney(journey) && (route === 'Today' || route === 'Records')) {
    const track = liuliPageTracks[route];
    return { ...track, x: track.inputRange.map(() => 0) };
  }
  const direction = to > from ? 1 : -1;
  const outgoing = position === from;
  const incoming = position === to;
  const inputRange = [0, 0.48, 0.52, 1].map(t => from + (to - from) * t);
  const opacity = outgoing ? [1, 0, 0, 0] : incoming ? [0, 0, 0, 1] : [0, 0, 0, 0];
  const x = outgoing ? [0, -14 * direction, -14 * direction, -14 * direction]
    : incoming ? [14 * direction, 14 * direction, 14 * direction, 0] : [0, 0, 0, 0];
  // Animated.interpolate 要求输入递增；返程将整条曲线反向排列。
  return direction > 0 ? { inputRange, opacity, x }
    : { inputRange: inputRange.reverse(), opacity: opacity.reverse(), x: x.reverse() };
}
