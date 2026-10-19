import { useMemo } from 'react';
import { useAppTheme } from '../state/AppThemeContext';
import type { ThemeColors } from './appThemes';

export type { ThemeColors } from './appThemes';
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
