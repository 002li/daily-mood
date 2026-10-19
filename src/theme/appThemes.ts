import type { MoodType } from '../models/mood';
import { chamberColors } from './chamber';
import { planetAppearance } from './planetAppearance';

export type AppTheme = 'liuli' | 'chamber';
export type ThemeColors = typeof chamberColors & { border: string; track: string; danger: string };

export const themeColors: Record<AppTheme, ThemeColors> = {
  liuli: { background: '#FCFBF3', text: '#203D51', muted: '#52685E', primary: '#35694F', glass: '#FFFFFF88', border: '#45625330', track: '#45625314', danger: '#A54435' },
  chamber: { ...chamberColors, border: '#DDE4DF30', track: '#DDE4DF10', danger: '#F0BCA8' },
};

const liuliTints: Record<MoodType, string> = {
  happy: '#85561B', calm: '#286650', sad: '#375E8C', tired: '#674D8C',
  angry: '#8B4B3D', ordinary: '#56645D', motivated: '#80521D',
};

export function getMoodTint(mood: MoodType, theme: AppTheme): string {
  return theme === 'liuli' ? liuliTints[mood] : planetAppearance[mood].ring;
}
