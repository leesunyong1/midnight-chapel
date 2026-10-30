/**
 * 묵상 세션(MeditationSession) 로컬 스토리지 유틸리티
 */

import {
  MeditationSession,
  CreateMeditationSessionInput,
  UpdateMeditationSessionInput,
} from '@/types';
import {
  STORAGE_KEYS,
  safeGetItem,
  safeSetItem,
  generateId,
  nowIso,
} from './storageUtils';

/**
 * 저장된 모든 묵상 세션 목록 조회 (최신순 정렬)
 */
export function getMeditationSessions(): MeditationSession[] {
  const sessions = safeGetItem<MeditationSession[]>(
    STORAGE_KEYS.MEDITATIONS,
    []
  );
  if (!Array.isArray(sessions)) {
    return [];
  }
  return sessions.slice().sort((a, b) => {
    const timeA = new Date(a.startedAt).getTime();
    const timeB = new Date(b.startedAt).getTime();
    return timeB - timeA;
  });
}

/**
 * 신규 묵상 세션 시작/등록
 */
export function addMeditationSession(
  input: CreateMeditationSessionInput
): MeditationSession {
  const current = getMeditationSessions();
  const now = nowIso();

  const newSession: MeditationSession = {
    id: input.id || generateId(),
    startedAt: input.startedAt || now,
    completedAt: input.completedAt,
    plannedDurationSeconds: input.plannedDurationSeconds,
    elapsedDurationSeconds: input.elapsedDurationSeconds ?? 0,
    completed: input.completed ?? false,
    prayerRecordId: input.prayerRecordId,
  };

  const updatedList = [newSession, ...current];
  safeSetItem(STORAGE_KEYS.MEDITATIONS, updatedList);

  return newSession;
}

/**
 * 묵상 세션 업데이트 (종료 시간, 경과 시간, 완료 상태 갱신 등)
 */
export function updateMeditationSession(
  id: string,
  updates: UpdateMeditationSessionInput
): MeditationSession | null {
  const current = getMeditationSessions();
  const index = current.findIndex((session) => session.id === id);

  if (index === -1) {
    return null;
  }

  const existing = current[index];
  const updatedSession: MeditationSession = {
    ...existing,
    ...updates,
    id: existing.id,
    startedAt: existing.startedAt,
  };

  current[index] = updatedSession;
  safeSetItem(STORAGE_KEYS.MEDITATIONS, current);

  return updatedSession;
}

/**
 * 특정 묵상 세션 삭제
 */
export function deleteMeditationSession(id: string): boolean {
  const current = getMeditationSessions();
  const filtered = current.filter((session) => session.id !== id);

  if (filtered.length === current.length) {
    return false;
  }

  safeSetItem(STORAGE_KEYS.MEDITATIONS, filtered);
  return true;
}

/**
 * 묵상 세션 완료 처리 헬퍼 함수
 */
export function completeMeditationSession(
  id: string,
  elapsedDurationSeconds?: number,
  prayerRecordId?: string
): MeditationSession | null {
  const current = getMeditationSessions();
  const target = current.find((s) => s.id === id);
  if (!target) {
    return null;
  }

  return updateMeditationSession(id, {
    completed: true,
    completedAt: nowIso(),
    elapsedDurationSeconds:
      elapsedDurationSeconds ?? target.plannedDurationSeconds,
    prayerRecordId: prayerRecordId ?? target.prayerRecordId,
  });
}
