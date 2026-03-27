import { MappedPixel } from './pixelation';

export interface FocusSessionData {
  pixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  colorCounts: Record<string, { count: number; color: string }>;
  selectedColorSystem: string;
  createdAt: string;
}

const SESSION_PREFIX = 'focusSession_';
const MAX_SESSIONS = 20;

/** 生成一个唯一的会话 ID */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

/** 清理超出上限的旧会话，保留最新的 MAX_SESSIONS 条 */
function pruneOldSessions(aggressive = false): void {
  const entries: { key: string; time: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SESSION_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<FocusSessionData>;
        entries.push({ key, time: new Date(data.createdAt ?? 0).getTime() });
      } catch {
        entries.push({ key, time: 0 });
      }
    }
  }

  const limit = aggressive ? 5 : MAX_SESSIONS;
  if (entries.length >= limit) {
    entries.sort((a, b) => a.time - b.time);
    entries.slice(0, entries.length - limit + 1).forEach(({ key }) => localStorage.removeItem(key));
  }
}

/**
 * 将专心拼豆会话数据存入 localStorage，返回会话 ID。
 * 会自动清理超出上限的旧会话。
 */
export function createFocusSession(
  data: Omit<FocusSessionData, 'createdAt'>
): string {
  const id = generateSessionId();
  const record: FocusSessionData = { ...data, createdAt: new Date().toISOString() };

  pruneOldSessions();

  try {
    localStorage.setItem(`${SESSION_PREFIX}${id}`, JSON.stringify(record));
  } catch {
    // 存储空间满时，激进清理后重试
    pruneOldSessions(true);
    try {
      localStorage.setItem(`${SESSION_PREFIX}${id}`, JSON.stringify(record));
    } catch (e) {
      console.error('[focusSession] Failed to save session:', e);
    }
  }

  return id;
}

/**
 * 根据会话 ID 从 localStorage 读取专心拼豆会话数据。
 * 若不存在或解析失败，返回 null。
 */
export function loadFocusSession(id: string): FocusSessionData | null {
  try {
    const raw = localStorage.getItem(`${SESSION_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as FocusSessionData;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────
// 专心拼豆「进度」持久化（与会话数据分开存储）
// 键: focusProgress_<sessionId>
// ────────────────────────────────────────

const PROGRESS_PREFIX = 'focusProgress_';

export interface FocusProgressData {
  /** 已完成格子的坐标字符串数组，如 ["0,1","2,3"] */
  completedCells: string[];
  colorProgress: Record<string, { completed: number; total: number }>;
  currentColor: string;
  totalElapsedTime: number;
  savedAt: string;
}

/** 将当前拼豆进度保存到 localStorage（与像素数据分开，随时覆盖） */
export function saveFocusProgress(sessionId: string, data: Omit<FocusProgressData, 'savedAt'>): void {
  try {
    const record: FocusProgressData = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem(`${PROGRESS_PREFIX}${sessionId}`, JSON.stringify(record));
  } catch (e) {
    console.warn('[focusProgress] save failed:', e);
  }
}

/** 读取保存的拼豆进度；不存在或解析失败时返回 null */
export function loadFocusProgress(sessionId: string): FocusProgressData | null {
  try {
    const raw = localStorage.getItem(`${PROGRESS_PREFIX}${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as FocusProgressData;
  } catch {
    return null;
  }
}
