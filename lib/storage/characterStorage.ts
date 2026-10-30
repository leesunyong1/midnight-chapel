/**
 * 치비 캐릭터 외형 커스터마이징 로컬 스토리지 유틸리티
 */

import { ChibiCustomizationOptions } from '@/components/character/chibiParts';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from './storageUtils';

export const DEFAULT_CHARACTER_CUSTOMIZATION: ChibiCustomizationOptions = {
  skinColor: '#fcdcc5', // 부드럽고 따뜻한 자연 베이지
  skinRoughness: 0.70,
  hairColor: '#382319',
  hairRoughness: 0.58,
  showHair: false,      // 머리카락 기본 삭제 (단정한 치비 민머리)
  showEyebrows: true,
  showBlush: true,
  showMouth: true,
};

/**
 * 저장된 캐릭터 외형 설정 조회 (없으면 기본값 반환)
 */
export function getCharacterCustomization(): ChibiCustomizationOptions {
  const saved = safeGetItem<ChibiCustomizationOptions | null>(
    STORAGE_KEYS.CHARACTER,
    null
  );
  if (!saved || typeof saved !== 'object') {
    return { ...DEFAULT_CHARACTER_CUSTOMIZATION };
  }
  return {
    ...DEFAULT_CHARACTER_CUSTOMIZATION,
    ...saved,
    // 머리카락은 명시적으로 true가 아닌 한 기본 false 유지
    showHair: Boolean(saved.showHair),
  };
}

/**
 * 캐릭터 외형 설정 저장
 */
export function saveCharacterCustomization(
  options: ChibiCustomizationOptions
): void {
  const merged: ChibiCustomizationOptions = {
    ...DEFAULT_CHARACTER_CUSTOMIZATION,
    ...options,
  };
  safeSetItem(STORAGE_KEYS.CHARACTER, merged);
}

/**
 * 기본 캐릭터 외형으로 초기화
 */
export function resetCharacterCustomization(): ChibiCustomizationOptions {
  safeSetItem(STORAGE_KEYS.CHARACTER, DEFAULT_CHARACTER_CUSTOMIZATION);
  return { ...DEFAULT_CHARACTER_CUSTOMIZATION };
}
