import type { MoodType } from '../models/mood';

type PlanetAppearance = {
  sky: readonly [string, string, string];
  surface: readonly [string, string, string];
  shade: string;
  atmosphere: string;
  ring: string;
  mist: { angle: number; top: number; height: number; opacity: number };
};

// 同一暗色环境、同一光源。心情改变玻璃中的雾度与光色，不给感受打分。
export const planetAppearance: Record<MoodType, PlanetAppearance> = {
  happy: {
    sky: ['#25272A', '#1B2327', '#151B22'],
    surface: ['#E9D8AF38', '#D8C29B12', '#82918C30'],
    shade: '#1B282C', atmosphere: '#BBA77F', ring: '#D4C297',
    mist: { angle: -18, top: 0.24, height: 0.22, opacity: 0.65 },
  },
  calm: {
    sky: ['#22292B', '#1A272A', '#151B22'],
    surface: ['#C9E1D734', '#A7C4BC10', '#6C8B9530'],
    shade: '#1A2B30', atmosphere: '#8DAAA1', ring: '#ABC7BC',
    mist: { angle: -5, top: 0.42, height: 0.16, opacity: 0.5 },
  },
  ordinary: {
    sky: ['#262829', '#202629', '#151B22'],
    surface: ['#EDE5D628', '#C8BBA820', '#A096BD40'],
    shade: '#2B3047', atmosphere: '#B9B1A7', ring: '#D8D1C6',
    mist: { angle: -12, top: 0.38, height: 0.25, opacity: 0.45 },
  },
  sad: {
    sky: ['#25272E', '#20272F', '#151B22'],
    surface: ['#CDD0DF2C', '#A4A3BC12', '#6F839930'],
    shade: '#202A39', atmosphere: '#9394AA', ring: '#B0B0C8',
    mist: { angle: 16, top: 0.36, height: 0.42, opacity: 0.45 },
  },
  angry: {
    sky: ['#2B2729', '#25282B', '#151B22'],
    surface: ['#E1BCAD34', '#C29D9314', '#8C829330'],
    shade: '#30282D', atmosphere: '#B08E82', ring: '#CCAB9D',
    mist: { angle: -32, top: 0.3, height: 0.3, opacity: 0.58 },
  },
  tired: {
    sky: ['#24292E', '#1E272E', '#151B22'],
    surface: ['#D1DAE228', '#A4B3C010', '#788D9C2C'],
    shade: '#202D38', atmosphere: '#94A2AF', ring: '#B2BDC9',
    mist: { angle: -3, top: 0.54, height: 0.4, opacity: 0.4 },
  },
  motivated: {
    sky: ['#30283C', '#233038', '#101626'],
    surface: ['#FFE8AF30', '#EFB88820', '#D4B0C43E'],
    shade: '#31314B', atmosphere: '#D8B27F', ring: '#EECDA0',
    mist: { angle: -24, top: 0.3, height: 0.25, opacity: 0.6 },
  },
};

export const neutralPlanetAppearance: PlanetAppearance = {
  sky: ['#25292C', '#1C262B', '#151B22'],
  surface: ['#DAE1DF28', '#A7BFBB10', '#8B98AA30'],
  shade: '#233139', atmosphere: '#9DADA9', ring: '#BCC9C4',
  mist: { angle: -12, top: 0.38, height: 0.3, opacity: 0.45 },
};
