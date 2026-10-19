export const NICKNAME_STORAGE_KEY = '@app/nickname/v1';
export const NICKNAME_MAX_LENGTH = 12;

type NicknameStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export function getNicknameError(value: string): string | null {
  const nickname = value.trim();
  if (!nickname) return '写一个喜欢的昵称，再开始吧。';
  // 按字符计数，避免一个 emoji 被当作两个 UTF-16 字符。
  if (Array.from(nickname).length > NICKNAME_MAX_LENGTH) return '昵称最多 12 个字符。';
  if (/[\u0000-\u001f\u007f]/.test(nickname)) return '昵称请写在一行里。';
  return null;
}

export function decodeNickname(raw: string | null): string | null {
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid nickname storage.');
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || typeof data.nickname !== 'string' || getNicknameError(data.nickname)) {
    throw new Error('Invalid nickname storage.');
  }
  return data.nickname.trim();
}

export async function loadNickname(storage: NicknameStorage): Promise<string | null> {
  return decodeNickname(await storage.getItem(NICKNAME_STORAGE_KEY));
}

export async function saveNickname(storage: NicknameStorage, value: string): Promise<string> {
  const error = getNicknameError(value);
  if (error) throw new Error(error);
  const nickname = value.trim();
  // 昵称单独保存，不修改原有心情记录；写入成功后才进入首页。
  await storage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify({ version: 1, nickname }));
  return nickname;
}
