import type { AppTheme } from '../theme/appThemes';

export const THEME_STORAGE_KEY = '@app/theme/v1';
type ThemeStorage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };

export function decodeTheme(raw: string | null): AppTheme {
  if (raw === null) return 'liuli';
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1
    || !('theme' in data) || (data.theme !== 'liuli' && data.theme !== 'chamber')) {
    throw new Error('Invalid theme preference.');
  }
  return data.theme;
}

export async function loadTheme(storage: ThemeStorage): Promise<AppTheme> {
  return decodeTheme(await storage.getItem(THEME_STORAGE_KEY));
}

export async function saveTheme(storage: ThemeStorage, theme: AppTheme): Promise<void> {
  if (theme !== 'liuli' && theme !== 'chamber') throw new Error('Unknown theme.');
  await storage.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: 1, theme }));
}
