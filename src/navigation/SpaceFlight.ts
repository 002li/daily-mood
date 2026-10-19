export const spacePositions = { Today: 0, Records: 1, Calendar: 2, Statistics: 3 } as const;
export type SpaceDestination = keyof typeof spacePositions;
type Flight = { target: SpaceDestination; land: () => void; landed: boolean };
export type SpaceJourney = { from: number; to: number };
type Animate = (to: number, easing: 'in' | 'out', done: (finished: boolean) => void, journey: SpaceJourney) => () => void;
type Schedule = (work: () => void, delay: number) => () => void;
const scheduleDeadline: Schedule = (work, delay) => { const timer = setTimeout(work, delay); return () => clearTimeout(timer); };

// 只协调镜头的两段运动和导航时机；画面由同一个 Animated.Value 驱动。
export class SpaceFlight {
  private state = { running: false, target: 'Today' as SpaceDestination };
  private listeners = new Set<() => void>();
  private pending: Flight | undefined;
  private queued: Flight | undefined;
  private cancel: (() => void) | undefined;
  private cancelDeadline: (() => void) | undefined;
  private disposed = false;
  private position = 0;

  constructor(private animate: Animate, private setPosition: (position: number) => void, private schedule: Schedule = scheduleDeadline) {}
  getSnapshot = () => this.state;
  // target 可表示排队中的用户意图；镜头始终沿实际进行中的飞行移动。
  getJourney = () => ({ from: this.position, to: this.pending ? spacePositions[this.pending.target] : this.position });
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  connect(current: SpaceDestination) {
    this.disposed = false;
    this.sync(current);
    this.publish(false, current);
  }
  private publish(running: boolean, target: SpaceDestination) {
    this.state = { running, target };
    this.listeners.forEach((listener) => listener());
  }
  private land(flight: Flight) {
    if (flight.landed) return;
    flight.landed = true;
    flight.land();
  }
  travel(target: SpaceDestination, land: () => void, immediate = false) {
    if (this.disposed) return false;
    const flight: Flight = { target, land, landed: false };
    if (this.pending) {
      // 导航一直可点，只保留最后一次意图，避免丢失“返回”请求。
      this.queued = target === this.pending.target ? undefined : flight;
      this.publish(true, target);
      if (immediate) this.finish();
      return true;
    }
    if (immediate) {
      this.moveTo(spacePositions[target]);
      land();
      this.publish(false, target);
      return true;
    }
    this.start(flight);
    return true;
  }
  private moveTo(position: number) {
    this.position = position;
    this.setPosition(position);
  }
  private start(flight: Flight) {
    this.pending = flight;
    this.publish(true, flight.target);
    const endpoint = spacePositions[flight.target];
    const journey = { from: this.position, to: endpoint };
    const midpoint = (this.position + endpoint) / 2;
    this.cancelDeadline = this.schedule(() => { if (this.pending === flight) this.finish(); }, 2200);
    this.cancel = this.animate(midpoint, 'in', (finished) => {
      if (this.pending !== flight) return;
      if (!finished) { this.finish(); return; }
      this.land(flight);
      this.cancel = this.animate(endpoint, 'out', (completed) => {
        if (this.pending !== flight) return;
        if (!completed) { this.finish(); return; }
        this.pending = undefined;
        this.cancel = undefined;
        this.position = endpoint;
        this.cancelDeadline?.();
        this.cancelDeadline = undefined;
        const next = this.queued;
        this.queued = undefined;
        if (next) this.start(next);
        else this.publish(false, flight.target);
      }, journey);
    }, journey);
  }
  sync(target: SpaceDestination) {
    if (this.pending || this.disposed) return;
    this.moveTo(spacePositions[target]);
  }
  // 后台、减少动态效果或尺寸变化时直接安全落位，不留半途页面。
  finish() {
    const current = this.pending;
    if (!current) return;
    const flight = this.queued ?? current;
    this.pending = undefined;
    this.queued = undefined;
    const cancel = this.cancel;
    this.cancel = undefined;
    cancel?.();
    this.cancelDeadline?.();
    this.cancelDeadline = undefined;
    this.moveTo(spacePositions[flight.target]);
    this.land(flight);
    this.publish(false, flight.target);
  }
  dispose() {
    this.disposed = true;
    this.pending = undefined;
    this.queued = undefined;
    this.cancel?.();
    this.cancel = undefined;
    this.cancelDeadline?.();
    this.cancelDeadline = undefined;
    // useSyncExternalStore 自己取消订阅；保留订阅以支持 effect 重连。
    this.publish(false, this.state.target);
  }
}
