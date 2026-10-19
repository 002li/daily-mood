import { upsertMoodRecord, type MoodRecord, type MoodType } from '../models/mood';
import {
  decodeMoodRecords,
  encodeMoodRecords,
  MOOD_STORAGE_KEY,
  type MoodStorage,
} from './moodStorage';

export type MoodPersistenceState = {
  records: MoodRecord[];
  status: 'loading' | 'ready' | 'saving' | 'saved' | 'error';
  errorKind: 'load' | 'save' | null;
};

// 独立于组件的串行存储控制器：选择立即更新，写入依次完成。
export class MoodPersistence {
  private state: MoodPersistenceState = { records: [], status: 'loading', errorKind: null };
  private listeners = new Set<() => void>();
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;
  private writing = false;
  private revision = 0;
  private savedRevision = 0;

  constructor(private readonly storage: MoodStorage) {}

  getSnapshot = (): MoodPersistenceState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(update: Partial<MoodPersistenceState>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach((listener) => listener());
  }

  load = (): Promise<void> => {
    if (this.loaded) return Promise.resolve();
    // StrictMode 重挂载或重复重试时，共用正在进行的读取。
    if (this.loadingPromise) return this.loadingPromise;
    this.publish({ status: 'loading', errorKind: null });
    const loadingPromise = this.read().finally(() => {
      if (this.loadingPromise === loadingPromise) this.loadingPromise = null;
    });
    this.loadingPromise = loadingPromise;
    return loadingPromise;
  };

  private async read(): Promise<void> {
    try {
      const records = decodeMoodRecords(await this.storage.getItem(MOOD_STORAGE_KEY));
      this.loaded = true;
      this.publish({ records, status: 'ready', errorKind: null });
    } catch {
      // 不把读取失败或损坏数据当成空记录，防止下一次选择覆盖旧数据。
      this.publish({ status: 'error', errorKind: 'load' });
    }
  }

  saveMood = (mood: MoodType, now = new Date()): void => {
    if (!this.loaded) return;
    this.revision += 1;
    this.publish({
      records: upsertMoodRecord(this.state.records, mood, now),
      status: 'saving',
      errorKind: null,
    });
    this.startWriting();
  };

  retry = (): void => {
    if (this.state.errorKind === 'load') {
      void this.load();
    } else if (this.state.errorKind === 'save') {
      this.publish({ status: 'saving', errorKind: null });
      this.startWriting();
    }
  };

  private startWriting(): void {
    if (this.writing) return;
    this.writing = true;
    void this.writePending();
  }

  private async writePending(): Promise<void> {
    try {
      while (this.savedRevision < this.revision) {
        const writingRevision = this.revision;
        const value = encodeMoodRecords(this.state.records);
        try {
          await this.storage.setItem(MOOD_STORAGE_KEY, value);
          this.savedRevision = writingRevision;
          // 旧写入完成时不显示“已记录”，继续写入最新选择。
          if (writingRevision === this.revision) {
            this.publish({ status: 'saved', errorKind: null });
          }
        } catch {
          if (writingRevision === this.revision) {
            this.publish({ status: 'error', errorKind: 'save' });
            break;
          }
          // 旧选择失败后，仍尝试写入用户在等待期间选择的最新状态。
        }
      }
    } finally {
      this.writing = false;
      if (this.state.status === 'saving' && this.savedRevision < this.revision) {
        this.startWriting();
      }
    }
  }
}
