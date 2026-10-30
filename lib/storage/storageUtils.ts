/**
 * 로컬 스토리지 안전 유틸리티 및 전용 키 정의
 */

export const STORAGE_KEYS = {
  PRAYERS: 'sanctuary:prayers:v1',
  CANDLES: 'sanctuary:candles:v1',
  COMMUNITY: 'sanctuary:community:v1',
  MEDITATIONS: 'sanctuary:meditations:v1',
  VISITOR: 'sanctuary:visitor:v1',
  SUPPORTED_INTENTIONS: 'sanctuary:community:supported:v1',
  CHARACTER: 'sanctuary:character:customization:v1',
} as const;

/**
 * 브라우저 환경 및 localStorage 접근 가능 여부 검사
 */
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  );
}

/**
 * 암호학적 UUID 또는 고유 난수 기반 식별자 생성
 */
export function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return `sanctuary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 현재 시각의 ISO 8601 문자열 반환
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * SSR 안전 및 JSON 파싱 에러 방어 로컬 스토리지 데이터 읽기
 */
export function safeGetItem<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (error) {
    console.warn(`[Storage] Failed to parse key "${key}", using fallback.`, error);
    return fallback;
  }
}

/**
 * SSR 안전 및 JSON 직렬화 에러 방어 로컬 스토리지 데이터 쓰기
 */
export function safeSetItem<T>(key: string, data: T): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`[Storage] Failed to set key "${key}".`, error);
    return false;
  }
}

/**
 * 로컬 스토리지 키 삭제
 */
export function safeRemoveItem(key: string): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[Storage] Failed to remove key "${key}".`, error);
    return false;
  }
}

/**
 * 중복 참여 방지를 위한 방문자 고유 식별자 획득 또는 신규 발급
 */
export function getOrCreateVisitorId(): string {
  if (!isBrowser()) {
    return 'server_visitor';
  }

  let visitorId = safeGetItem<string | null>(STORAGE_KEYS.VISITOR, null);
  if (!visitorId || typeof visitorId !== 'string') {
    visitorId = `vis_${generateId()}`;
    safeSetItem(STORAGE_KEYS.VISITOR, visitorId);
  }
  return visitorId;
}
