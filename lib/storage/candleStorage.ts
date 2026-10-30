/**
 * 촛불 상태(CandleState) 로컬 스토리지 유틸리티
 */

import { CandleState, CreateCandleInput, UpdateCandleInput } from '@/types';
import {
  STORAGE_KEYS,
  safeGetItem,
  safeSetItem,
  generateId,
  nowIso,
} from './storageUtils';

/**
 * 저장된 모든 촛불 상태 목록 조회 (기록 생성 순)
 */
export function getCandles(): CandleState[] {
  const candles = safeGetItem<CandleState[]>(STORAGE_KEYS.CANDLES, []);
  if (!Array.isArray(candles)) {
    return [];
  }
  return candles;
}

/**
 * 신규 촛불 추가
 */
export function addCandle(input?: CreateCandleInput): CandleState {
  const current = getCandles();
  const now = nowIso();
  const isLit = input?.isLit ?? false;

  const newCandle: CandleState = {
    id: input?.id || generateId(),
    isLit,
    litAt: input?.litAt ?? (isLit ? now : undefined),
    message: input?.message?.trim() || undefined,
    createdAt: input?.createdAt || now,
    updatedAt: input?.updatedAt || now,
  };

  const updatedList = [...current, newCandle];
  safeSetItem(STORAGE_KEYS.CANDLES, updatedList);

  return newCandle;
}

/**
 * 촛불 상태 수정 (켜짐/꺼짐 전환, 메시지 변경 등)
 */
export function updateCandle(
  id: string,
  updates: UpdateCandleInput
): CandleState | null {
  const current = getCandles();
  const index = current.findIndex((candle) => candle.id === id);

  if (index === -1) {
    return null;
  }

  const existing = current[index];
  const now = nowIso();

  // 켜짐 상태 변경 감지 시 litAt 처리
  let litAt = updates.litAt !== undefined ? updates.litAt : existing.litAt;
  if (updates.isLit === true && !existing.isLit && !litAt) {
    litAt = now;
  } else if (updates.isLit === false) {
    litAt = undefined;
  }

  const updatedCandle: CandleState = {
    ...existing,
    ...updates,
    litAt,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  current[index] = updatedCandle;
  safeSetItem(STORAGE_KEYS.CANDLES, current);

  return updatedCandle;
}

/**
 * 촛불 켜짐/꺼짐 상태 토글 헬퍼
 */
export function toggleCandle(id: string): CandleState | null {
  const current = getCandles();
  const existing = current.find((candle) => candle.id === id);
  if (!existing) {
    return null;
  }
  return updateCandle(id, { isLit: !existing.isLit });
}

/**
 * 특정 ID의 촛불 삭제
 */
export function deleteCandle(id: string): boolean {
  const current = getCandles();
  const filtered = current.filter((candle) => candle.id !== id);

  if (filtered.length === current.length) {
    return false;
  }

  safeSetItem(STORAGE_KEYS.CANDLES, filtered);
  return true;
}

/**
 * 개인 기도실용 기본 촛불 획득 또는 자동 생성
 */
export function getOrCreateDefaultCandle(): CandleState {
  const candles = getCandles();
  if (candles.length > 0) {
    return candles[0];
  }
  return addCandle({
    isLit: false,
    message: '고요한 기도의 빛',
  });
}
