/**
 * 개인 기도 기록(PrayerRecord) 로컬 스토리지 유틸리티
 */

import {
  PrayerRecord,
  CreatePrayerRecordInput,
  UpdatePrayerRecordInput,
} from '@/types';
import {
  STORAGE_KEYS,
  safeGetItem,
  safeSetItem,
  generateId,
  nowIso,
} from './storageUtils';

/**
 * 저장된 모든 개인 기도 기록 조회 (최신 작성일 순)
 */
export function getPrayerRecords(): PrayerRecord[] {
  const records = safeGetItem<PrayerRecord[]>(STORAGE_KEYS.PRAYERS, []);
  if (!Array.isArray(records)) {
    return [];
  }
  // 최신순 (createdAt 내림차순) 정렬
  return records.slice().sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
}

/**
 * 새로운 개인 기도 기록 추가
 */
export function addPrayerRecord(input: CreatePrayerRecordInput): PrayerRecord {
  const current = getPrayerRecords();
  const now = nowIso();

  const newRecord: PrayerRecord = {
    id: input.id || generateId(),
    title: input.title?.trim() || '제목 없는 기도',
    content: input.content?.trim() || '',
    visibility: input.visibility ?? 'private',
    sessionDurationSeconds: input.sessionDurationSeconds,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };

  const updatedList = [newRecord, ...current];
  safeSetItem(STORAGE_KEYS.PRAYERS, updatedList);

  return newRecord;
}

/**
 * 특정 ID의 개인 기도 기록 수정
 */
export function updatePrayerRecord(
  id: string,
  updates: UpdatePrayerRecordInput
): PrayerRecord | null {
  const current = getPrayerRecords();
  const index = current.findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  const existing = current[index];
  const updatedRecord: PrayerRecord = {
    ...existing,
    ...updates,
    id: existing.id, // ID 불변 유지
    createdAt: existing.createdAt, // 생성 시각 불변 유지
    updatedAt: nowIso(),
  };

  current[index] = updatedRecord;
  safeSetItem(STORAGE_KEYS.PRAYERS, current);

  return updatedRecord;
}

/**
 * 특정 ID의 개인 기도 기록 삭제
 */
export function deletePrayerRecord(id: string): boolean {
  const current = getPrayerRecords();
  const filtered = current.filter((record) => record.id !== id);

  if (filtered.length === current.length) {
    return false; // 삭제 대상 없음
  }

  safeSetItem(STORAGE_KEYS.PRAYERS, filtered);
  return true;
}

/**
 * 모든 개인 기도 기록 초기화 (전체 삭제)
 */
export function clearPrayerRecords(): void {
  safeSetItem(STORAGE_KEYS.PRAYERS, []);
}
