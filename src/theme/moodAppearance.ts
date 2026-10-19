import type { MoodType } from '../models/mood';

type MoodAppearance = {
  accent: string;
  soft: string;
  background: readonly [string, string, string];
  orb: readonly [string, string, string];
  message: string;
  duration: number;
  lift: number;
};

// 色彩表达感受，不给心情打分；首页与轨迹沿用同一套颜色。
export const moodAppearance: Record<MoodType, MoodAppearance> = {
  happy: {
    accent: '#97702D', soft: '#F9EDC9',
    background: ['#FFF9EC', '#FFFCF5', '#FAF9F5'],
    orb: ['#FFF3B7', '#F4CB69', '#DFA24D'],
    message: '让这份明亮，停留一会儿。', duration: 2800, lift: -6,
  },
  calm: {
    accent: '#477E74', soft: '#DCEFE8',
    background: ['#EFF9F5', '#F7FBF8', '#FAF9F5'],
    orb: ['#D5F4EA', '#8CCABD', '#518F91'],
    message: '不用赶路，就在这里慢慢呼吸。', duration: 4200, lift: -3,
  },
  ordinary: {
    accent: '#81725C', soft: '#ECE5D9',
    background: ['#F7F3EC', '#FBF9F4', '#FAF9F5'],
    orb: ['#F3EBDE', '#D1C2A8', '#AFA087'],
    message: '平常的一天，也值得轻轻留下。', duration: 3600, lift: -3,
  },
  sad: {
    accent: '#77688F', soft: '#E9E3F3',
    background: ['#F2EFF9', '#F9F6FB', '#FAF9F5'],
    orb: ['#DED9F4', '#ADA0CE', '#786F9C'],
    message: '让感受待在这里，不必急着改变。', duration: 4800, lift: 4,
  },
  angry: {
    accent: '#AC6657', soft: '#F6E2D9',
    background: ['#FFF1EA', '#FFF8F2', '#FAF9F5'],
    orb: ['#FFDDC9', '#EDAA90', '#CB7768'],
    message: '先给自己一点空间。', duration: 3400, lift: -2,
  },
  tired: {
    accent: '#657D92', soft: '#E0E8EF',
    background: ['#EFF4F8', '#F7F9FB', '#FAF9F5'],
    orb: ['#E1ECF4', '#B3C4D4', '#869AB0'],
    message: '今天可以慢一点，休息也很好。', duration: 5600, lift: 3,
  },
  motivated: {
    accent: '#A26736', soft: '#F8E5D0',
    background: ['#FFF3E5', '#FFFAF2', '#FAF9F5'],
    orb: ['#FFE9B9', '#F9B97B', '#E98A5C'],
    message: '带着这份热度，去做喜欢的事。', duration: 2200, lift: -7,
  },
};

export const neutralAppearance: MoodAppearance = {
  accent: '#7A8278', soft: '#E8ECE3',
  background: ['#F4F6EE', '#FAFAF5', '#FAF9F5'],
  orb: ['#F1F1D9', '#CCD8BA', '#99B4A5'],
  message: '留几秒钟，和自己待一会儿。', duration: 4200, lift: -4,
};
