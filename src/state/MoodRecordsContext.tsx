import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import {
  getLocalDateKey,
  type MoodRecord,
  type MoodType,
} from '../models/mood';
import { MoodPersistence, type MoodPersistenceState } from '../storage/MoodPersistence';

type MoodRecordsState = {
  records: MoodRecord[];
  today: string;
  saveMood: (mood: MoodType) => void;
  status: MoodPersistenceState['status'];
  errorKind: MoodPersistenceState['errorKind'];
  retry: () => void;
};

const MoodRecordsContext = createContext<MoodRecordsState | undefined>(undefined);

export function MoodRecordsProvider({ children }: { children: ReactNode }) {
  const [persistence] = useState(() => new MoodPersistence(AsyncStorage));
  const { records, status, errorKind } = useSyncExternalStore(
    persistence.subscribe,
    persistence.getSnapshot,
    persistence.getSnapshot,
  );
  const [today, setToday] = useState(() => getLocalDateKey(new Date()));

  useEffect(() => {
    void persistence.load();
    // useSyncExternalStore 会在卸载时取消订阅，异步结果不会更新已卸载组件。
  }, [persistence]);

  useEffect(() => {
    const refreshDate = () => setToday(getLocalDateKey(new Date()));
    const interval = setInterval(refreshDate, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshDate();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const saveMood = useCallback((mood: MoodType) => {
    const now = new Date();
    // 保存时重新取日期，防止跨过午夜后仍写入前一天。
    setToday(getLocalDateKey(now));
    persistence.saveMood(mood, now);
  }, [persistence]);

  return (
    <MoodRecordsContext.Provider
      value={{ records, today, saveMood, status, errorKind, retry: persistence.retry }}
    >
      {children}
    </MoodRecordsContext.Provider>
  );
}

export function useMoodRecords() {
  const state = useContext(MoodRecordsContext);
  if (!state) {
    throw new Error('useMoodRecords 必须在 MoodRecordsProvider 内使用。');
  }
  return state;
}
