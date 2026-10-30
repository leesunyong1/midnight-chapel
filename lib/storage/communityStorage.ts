/**
 * 공동 기도실(PrayerIntention) 로컬 스토리지 유틸리티 (로컬 테스트 및 목업 데이터)
 */

import {
  PrayerIntention,
  CreatePrayerIntentionInput,
  UpdatePrayerIntentionInput,
  SupportPrayerResult,
} from '@/types';
import {
  STORAGE_KEYS,
  safeGetItem,
  safeSetItem,
  generateId,
  nowIso,
  getOrCreateVisitorId,
} from './storageUtils';

/**
 * 로컬 테스트용 초기 시드 기도문 목록
 */
const DEFAULT_COMMUNITY_INTENTIONS: PrayerIntention[] = [
  {
    id: 'intention-seed-1',
    content: '치료 중에 계신 어머니의 건강 회복과 마음의 평화를 위해 기도 부탁드립니다.',
    displayName: '마리아',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3시간 전
    supportCount: 14,
    status: 'active',
  },
  {
    id: 'intention-seed-2',
    content: '새로운 진로를 앞두고 두려운 마음이 앞섭니다. 담대함과 지혜를 청합니다.',
    displayName: '익명',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8시간 전
    supportCount: 9,
    status: 'active',
  },
  {
    id: 'intention-seed-3',
    content: '지치고 힘든 하루를 보낸 모든 이들의 영혼에 주님의 따스한 위로가 깃들기를 기도합니다.',
    displayName: '베드로',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1일 전
    supportCount: 27,
    status: 'active',
  },
];

/**
 * 공동 기도문 목록 조회 (최신순 정렬)
 * @param includeHidden 숨김 상태('hidden') 기도문 포함 여부 (기본: false)
 */
export function getPrayerIntentions(includeHidden = false): PrayerIntention[] {
  let intentions = safeGetItem<PrayerIntention[] | null>(
    STORAGE_KEYS.COMMUNITY,
    null
  );

  // 최초 방문 시 로컬 테스트용 기본 데이터 시딩
  if (!intentions || !Array.isArray(intentions)) {
    intentions = DEFAULT_COMMUNITY_INTENTIONS;
    safeSetItem(STORAGE_KEYS.COMMUNITY, intentions);
  }

  const filtered = includeHidden
    ? intentions
    : intentions.filter((item) => item.status === 'active');

  // 최신순 (createdAt 내림차순) 정렬
  return filtered.slice().sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
}

/**
 * 신규 공동 기도문 등록
 */
export function addPrayerIntention(
  input: CreatePrayerIntentionInput
): PrayerIntention {
  const current = safeGetItem<PrayerIntention[]>(
    STORAGE_KEYS.COMMUNITY,
    DEFAULT_COMMUNITY_INTENTIONS
  );
  const now = nowIso();

  const newIntention: PrayerIntention = {
    id: input.id || generateId(),
    content: input.content?.trim() || '',
    displayName: input.displayName?.trim() || '익명',
    supportCount: input.supportCount ?? 0,
    status: input.status ?? 'active',
    createdAt: input.createdAt || now,
  };

  const updatedList = [newIntention, ...current];
  safeSetItem(STORAGE_KEYS.COMMUNITY, updatedList);

  return newIntention;
}

/**
 * 공동 기도문 수정
 */
export function updatePrayerIntention(
  id: string,
  updates: UpdatePrayerIntentionInput
): PrayerIntention | null {
  const current = safeGetItem<PrayerIntention[]>(
    STORAGE_KEYS.COMMUNITY,
    DEFAULT_COMMUNITY_INTENTIONS
  );
  const index = current.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const existing = current[index];
  const updatedItem: PrayerIntention = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
  };

  current[index] = updatedItem;
  safeSetItem(STORAGE_KEYS.COMMUNITY, current);

  return updatedItem;
}

/**
 * 공동 기도문 삭제 (또는 소프트 삭제)
 */
export function deletePrayerIntention(id: string): boolean {
  const current = safeGetItem<PrayerIntention[]>(
    STORAGE_KEYS.COMMUNITY,
    DEFAULT_COMMUNITY_INTENTIONS
  );
  const filtered = current.filter((item) => item.id !== id);

  if (filtered.length === current.length) {
    return false;
  }

  safeSetItem(STORAGE_KEYS.COMMUNITY, filtered);
  return true;
}

/**
 * 현재 브라우저 방문자가 해당 기도제목에 이미 참여했는지 여부 확인
 */
export function hasSupportedPrayer(intentionId: string): boolean {
  const supportedIds = safeGetItem<string[]>(
    STORAGE_KEYS.SUPPORTED_INTENTIONS,
    []
  );
  return Array.isArray(supportedIds) && supportedIds.includes(intentionId);
}

/**
 * "함께 기도합니다" 참여 (중복 방지 식별 포함)
 */
export function supportPrayerIntention(
  intentionId: string
): SupportPrayerResult {
  // 방문자 식별자 보장
  getOrCreateVisitorId();

  // 중복 참여 검사
  const supportedIds = safeGetItem<string[]>(
    STORAGE_KEYS.SUPPORTED_INTENTIONS,
    []
  );

  if (supportedIds.includes(intentionId)) {
    const intentions = getPrayerIntentions(true);
    const target = intentions.find((i) => i.id === intentionId) || null;
    return {
      success: false,
      intention: target,
      alreadySupported: true,
      message: '이미 함께 기도에 참여하셨습니다.',
    };
  }

  const current = safeGetItem<PrayerIntention[]>(
    STORAGE_KEYS.COMMUNITY,
    DEFAULT_COMMUNITY_INTENTIONS
  );
  const index = current.findIndex((item) => item.id === intentionId);

  if (index === -1) {
    return {
      success: false,
      intention: null,
      alreadySupported: false,
      message: '기도 제목을 찾을 수 없습니다.',
    };
  }

  const target = current[index];
  const updatedIntention: PrayerIntention = {
    ...target,
    supportCount: (target.supportCount || 0) + 1,
  };

  current[index] = updatedIntention;
  safeSetItem(STORAGE_KEYS.COMMUNITY, current);

  // 참여 완료 ID 기록
  safeSetItem(STORAGE_KEYS.SUPPORTED_INTENTIONS, [
    ...supportedIds,
    intentionId,
  ]);

  return {
    success: true,
    intention: updatedIntention,
    alreadySupported: false,
    message: '함께 기도에 마음을 모았습니다.',
  };
}
