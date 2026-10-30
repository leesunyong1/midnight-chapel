// ============================================================
// 온라인 성당 기도 서비스 — 통합 데이터 모델 및 공통 타입 정의
// ============================================================

/** 기도실 유형 */
export type PrayerRoomType = 'private' | 'community';

/** 기도 상태 */
export type PrayerStatus = 'idle' | 'praying' | 'completed';

/** 기도 타이머 프리셋(분 단위) */
export type PrayerDuration = 5 | 10 | 15;

/** 네비게이션 링크 아이템 */
export interface NavItem {
  href: string;
  label: string;
  description: string;
}

// ------------------------------------------------------------
// A. 개인 기도 기록 (PrayerRecord)
// ------------------------------------------------------------
export interface PrayerRecord {
  /** 고유 식별자 (UUID) */
  id: string;
  /** 기도문 제목 또는 지향 */
  title: string;
  /** 기도문 상세 내용 */
  content: string;
  /** 생성 일시 (ISO 8601) */
  createdAt: string;
  /** 최종 수정 일시 (ISO 8601) */
  updatedAt: string;
  /** 공개 여부 ('private' | 'public') */
  visibility: 'private' | 'public';
  /** 연결된 묵상 세션 시간(초 단위, 선택적) */
  sessionDurationSeconds?: number;
}

export type CreatePrayerRecordInput = {
  title: string;
  content: string;
  visibility?: 'private' | 'public';
  sessionDurationSeconds?: number;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdatePrayerRecordInput = Partial<
  Omit<PrayerRecord, 'id' | 'createdAt'>
>;

// ------------------------------------------------------------
// B. 촛불 상태 (CandleState)
// ------------------------------------------------------------
export interface CandleState {
  /** 고유 식별자 */
  id: string;
  /** 촛불 켜짐 여부 */
  isLit: boolean;
  /** 촛불이 켜진 시각 (ISO 8601, 미점화 시 undefined) */
  litAt?: string;
  /** 촛불에 담긴 한 줄 기도/메시지 (선택적) */
  message?: string;
  /** 촛불 생성 일시 (ISO 8601) */
  createdAt: string;
  /** 상태 갱신 일시 (ISO 8601) */
  updatedAt: string;
}

export type CreateCandleInput = {
  id?: string;
  isLit?: boolean;
  litAt?: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateCandleInput = Partial<
  Omit<CandleState, 'id' | 'createdAt'>
>;

// ------------------------------------------------------------
// C. 공동 기도문 (PrayerIntention)
// ------------------------------------------------------------
export interface PrayerIntention {
  /** 고유 식별자 */
  id: string;
  /** 기도 제목 및 본문 내용 */
  content: string;
  /** 작성자 닉네임 (기본값: '익명') */
  displayName: string;
  /** 생성 일시 (ISO 8601) */
  createdAt: string;
  /** '함께 기도합니다' 지지/연대 횟수 */
  supportCount: number;
  /** 상태 ('active': 노출, 'hidden': 숨김) */
  status: 'active' | 'hidden';
}

export type CreatePrayerIntentionInput = {
  content: string;
  displayName?: string;
  status?: 'active' | 'hidden';
  supportCount?: number;
  id?: string;
  createdAt?: string;
};

export type UpdatePrayerIntentionInput = Partial<
  Omit<PrayerIntention, 'id' | 'createdAt'>
>;

export interface SupportPrayerResult {
  success: boolean;
  intention: PrayerIntention | null;
  alreadySupported: boolean;
  message?: string;
}

// ------------------------------------------------------------
// D. 묵상 세션 기록 (MeditationSession)
// ------------------------------------------------------------
export interface MeditationSession {
  /** 고유 식별자 */
  id: string;
  /** 묵상 시작 시각 (ISO 8601) */
  startedAt: string;
  /** 묵상 완료/종료 시각 (ISO 8601, 미완료 시 undefined) */
  completedAt?: string;
  /** 계획된 묵상 시간 (초 단위) */
  plannedDurationSeconds: number;
  /** 실제 경과 묵상 시간 (초 단위) */
  elapsedDurationSeconds: number;
  /** 목표 시간 달성 완료 여부 */
  completed: boolean;
  /** 연관된 개인 기도 기록 ID (선택적) */
  prayerRecordId?: string;
}

export type CreateMeditationSessionInput = {
  plannedDurationSeconds: number;
  elapsedDurationSeconds?: number;
  completed?: boolean;
  startedAt?: string;
  completedAt?: string;
  prayerRecordId?: string;
  id?: string;
};

export type UpdateMeditationSessionInput = Partial<
  Omit<MeditationSession, 'id'>
>;
