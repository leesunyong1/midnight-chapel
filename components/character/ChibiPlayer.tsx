'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  setupChibiCharacterStyling,
  ChibiFaceController,
  ChibiCustomizationOptions,
} from './chibiParts';
import {
  Collider,
  RoomBounds,
  resolveSlidingMovement,
} from '@/components/prayer/collisionUtils';
import {
  CharacterActionState,
  isSittingState,
  isKneelingState,
  isPrayingState,
  canCharacterMove,
} from '@/lib/animation/actionTypes';
import { SeatTarget, findNearestSeat } from '@/lib/animation/seatSystem';
import { computeActionPose } from '@/lib/animation/characterActionPose';

export interface PlayerDebugInfo {
  x: number;
  z: number;
  inputX: number;
  inputZ: number;
  isMoving: boolean;
  speed: number;
  actionState?: CharacterActionState;
}

export interface ChibiPlayerProps {
  inputRef: React.MutableRefObject<{ x: number; z: number }>;
  /** 점프 트리거 (모바일 버튼 또는 외부 호출용 ref) */
  jumpRef?: React.MutableRefObject<boolean>;
  cameraYawRef?: React.MutableRefObject<number>;
  onPositionChange?: (pos: THREE.Vector3) => void;
  onDebugUpdate?: (info: PlayerDebugInfo) => void;
  /** 방 이동 경계 (기본값: 기존 개인실 복도 경계) */
  bounds?: RoomBounds;
  /** 충돌체 목록 (외벽, 기둥, 장의자, 제단 등) */
  colliders?: Collider[];
  /** 초기 스폰 위치 [x, y, z] */
  initialPosition?: [number, number, number];
  /** 초기 회전각 (Y축 라디안, 기본값 Math.PI = 제단 바라보기) */
  initialRotationY?: number;
  /** 캐릭터 충돌 반경 (기본값: 0.35m) */
  playerRadius?: number;
  /** 캐릭터 외형 커스터마이징 옵션 (스킨 톤, 헤어 색상, 표정 등) */
  customization?: ChibiCustomizationOptions;

  /** 이용 가능한 좌석 및 기도대 목록 */
  availableSeats?: SeatTarget[];
  /** 가장 가까운 좌석 변경 콜백 */
  onNearestSeatChange?: (seat: SeatTarget | null) => void;
  /** 현재 액션 상태 변경 콜백 */
  onActionStateChange?: (state: CharacterActionState) => void;
  /** 외부 액션 트리거 ref */
  actionTriggerRef?: React.MutableRefObject<((action: CharacterActionState, seat?: SeatTarget) => boolean) | null>;
}

// 기본 이동 제약 경계 (하위 호환성 유지)
const DEFAULT_BOUNDS: RoomBounds = {
  minX: -2.4,
  maxX: 2.4,
  minZ: -2.3, // 제단 앞
  maxZ: 5.5,  // 입구 쪽
};

const MOVE_SPEED = 3.6; // 초당 이동 속도 (m/s)
const JUMP_SPEED = 4.6; // 초당 도약 속도 (m/s, 정점 높이 약 0.58m)
const GRAVITY = 18.0;   // 중력 가속도 (m/s^2)

interface BoneEntry {
  bone: THREE.Bone;
  restQuat: THREE.Quaternion;
}

type BoneMap = Record<string, BoneEntry>;

// 매 프레임 GC(가비지 컬렉션) 오버헤드를 방지하기 위한 재사용 수학 객체
const scratchEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const scratchQuat = new THREE.Quaternion();
const scratchTargetQuat = new THREE.Quaternion();

/**
 * 본(Bone)의 초기 Rest Pose 쿼터니언을 기준으로 상대 델타 회전을 곱해 적용합니다.
 * slerpAlpha를 통해 프레임 간 튐 없는 부드러운 구면 선형 보간(Slerp)을 지원합니다.
 */
function applyBoneRotation(
  entry: BoneEntry | undefined,
  x: number,
  y: number,
  z: number,
  slerpAlpha = 1.0
) {
  if (!entry) return;
  scratchEuler.set(x, y, z, 'XYZ');
  scratchQuat.setFromEuler(scratchEuler);
  scratchTargetQuat.copy(entry.restQuat).multiply(scratchQuat);
  if (slerpAlpha >= 1.0) {
    entry.bone.quaternion.copy(scratchTargetQuat);
  } else {
    entry.bone.quaternion.slerp(scratchTargetQuat, slerpAlpha);
  }
}

function smoothstep(min: number, max: number, val: number): number {
  const x = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function ChibiPlayer({
  inputRef,
  jumpRef,
  cameraYawRef,
  onPositionChange,
  onDebugUpdate,
  bounds = DEFAULT_BOUNDS,
  colliders = [],
  initialPosition = [0, 0, 2.2],
  initialRotationY = Math.PI,
  playerRadius = 0.35,
  customization,
  availableSeats = [],
  onNearestSeatChange,
  onActionStateChange,
  actionTriggerRef,
}: ChibiPlayerProps) {
  const { scene } = useGLTF('/character/chibi.glb');

  // 얼굴 표정 및 눈 깜빡임 제어 컨트롤러 참조
  const faceControllerRef = useRef<ChibiFaceController | null>(null);

  // SkinnedMesh 및 본(Bone) 계층을 완벽히 복제하기 위해 SkeletonUtils.clone 사용
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    faceControllerRef.current = setupChibiCharacterStyling(clone, customization);

    return clone;
  }, [scene, customization]);

  // 캐릭터별 독립적인 Bone 참조 및 Rest Pose Quaternion 캐싱
  const bones = useMemo<BoneMap>(() => {
    const map: BoneMap = {};
    clonedScene.traverse((child: any) => {
      if (child.isBone) {
        map[child.name] = {
          bone: child,
          restQuat: child.quaternion.clone(),
        };
      }
    });
    return map;
  }, [clonedScene]);

  const playerRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  // ========================================================
  // 액션 시스템 상태 관리
  // ========================================================
  const actionStateRef = useRef<CharacterActionState>('idle');
  const actionTimerRef = useRef(0);
  const targetSeatRef = useRef<SeatTarget | null>(null);
  const nearestSeatRef = useRef<SeatTarget | null>(null);
  const actionStartPosRef = useRef<{ x: number; z: number; rotY: number }>({
    x: initialPosition[0],
    z: initialPosition[2],
    rotY: initialRotationY,
  });
  const wantsKneelPrayRef = useRef(false);

  // 이동 및 점프 물리 참조
  const walkTimer = useRef(0);
  const idleTimer = useRef(0);
  const walkWeightRef = useRef(0);
  const jumpWeightRef = useRef(0);
  const velocityYRef = useRef(0);
  const isGroundedRef = useRef(true);
  const landingSquashRef = useRef(0);

  const prevPosRef = useRef({ x: initialPosition[0], z: initialPosition[2] });
  const lastDebugUpdateRef = useRef(0);
  const lastSeatCheckRef = useRef(0);

  // 내부 이동 및 점프 키 상태 추적
  const activeKeys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

  // 액션 상태 변경 핸들러
  const setActionState = useCallback(
    (newState: CharacterActionState) => {
      actionStateRef.current = newState;
      actionTimerRef.current = 0;
      if (onActionStateChange) {
        onActionStateChange(newState);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('player-action-state-changed', {
            detail: { state: newState },
          })
        );
      }
    },
    [onActionStateChange]
  );

  // 액션 트리거 함수
  const triggerAction = useCallback(
    (action: CharacterActionState, seat?: SeatTarget): boolean => {
      if (!playerRef.current) return false;

      const current = actionStateRef.current;

      // 이미 해당 액션 상태인 경우 토글 처리
      if (current === action) {
        if (action === 'standing_pray') {
          setActionState('idle');
          return true;
        }
        if (action === 'sitting_pray') {
          setActionState('sitting_idle');
          return true;
        }
        if (action === 'kneeling_pray') {
          setActionState('kneeling_idle');
          return true;
        }
        return true;
      }

      // 전이 진행 중일 때는 중복 입력 방지
      const isTransitioning =
        current === 'sitting_down' ||
        current === 'standing_up' ||
        current === 'kneeling_down' ||
        current === 'standing_from_kneeling';
      if (isTransitioning) {
        return false;
      }

      actionStartPosRef.current = {
        x: playerRef.current.position.x,
        z: playerRef.current.position.z,
        rotY: playerRef.current.rotation.y,
      };

      // 1. 의자 앉기
      if (action === 'sitting_down') {
        const target = seat || nearestSeatRef.current;
        if (!target) return false;
        targetSeatRef.current = target;
        setActionState('sitting_down');
        return true;
      }

      // 2. 의자에서 일어서기
      if (action === 'standing_up') {
        if (!isSittingState(current)) return false;
        setActionState('standing_up');
        return true;
      }

      // 3. 앉아서 기도
      if (action === 'sitting_pray') {
        if (current === 'sitting_idle') {
          setActionState('sitting_pray');
          return true;
        }
        return false;
      }

      // 4. 무릎 꿇기
      if (action === 'kneeling_down') {
        const target = seat || nearestSeatRef.current;
        if (target && target.type === 'kneeler') {
          targetSeatRef.current = target;
        } else {
          targetSeatRef.current = null;
        }
        wantsKneelPrayRef.current = false;
        setActionState('kneeling_down');
        return true;
      }

      // 5. 무릎 기도
      if (action === 'kneeling_pray') {
        if (current === 'kneeling_idle') {
          setActionState('kneeling_pray');
          return true;
        }
        if (!isKneelingState(current)) {
          const target = seat || nearestSeatRef.current;
          if (target && target.type === 'kneeler') {
            targetSeatRef.current = target;
          }
          wantsKneelPrayRef.current = true;
          setActionState('kneeling_down');
          return true;
        }
        return false;
      }

      // 6. 무릎에서 일어서기
      if (action === 'standing_from_kneeling') {
        if (!isKneelingState(current)) return false;
        setActionState('standing_from_kneeling');
        return true;
      }

      // 7. 서서 기도
      if (action === 'standing_pray') {
        if (current === 'idle') {
          setActionState('standing_pray');
          return true;
        }
        return false;
      }

      // 8. 손 흔들기 인사 (Wave)
      if (action === 'wave') {
        if (current === 'idle') {
          setActionState('wave');
          return true;
        }
        return false;
      }

      // 9. 정중한 인사 (Bow)
      if (action === 'bow') {
        if (current === 'idle') {
          setActionState('bow');
          return true;
        }
        return false;
      }

      // 10. 기본 Idle로 복귀
      if (action === 'idle') {
        if (isSittingState(current)) {
          setActionState('standing_up');
          return true;
        }
        if (isKneelingState(current)) {
          setActionState('standing_from_kneeling');
          return true;
        }
        setActionState('idle');
        return true;
      }

      return false;
    },
    [setActionState]
  );

  // 외부 ref 연동
  useEffect(() => {
    if (actionTriggerRef) {
      actionTriggerRef.current = triggerAction;
    }
  }, [actionTriggerRef, triggerAction]);

  // 키보드 입력 및 커스텀 이벤트 리스너 등록
  useEffect(() => {
    const isTargetInput = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTargetInput(e.target)) return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      let matched = false;

      // 점프: Space
      if (code === 'Space' || key === ' ' || key === 'spacebar') {
        activeKeys.current.jump = true;
        matched = true;
      }

      // 전방: W, w, ㅈ, ArrowUp
      if (
        code === 'KeyW' ||
        key === 'w' ||
        key === 'ㅈ' ||
        code === 'ArrowUp' ||
        key === 'arrowup'
      ) {
        activeKeys.current.forward = true;
        matched = true;
      }
      // 후방: S, s, ㄴ, ArrowDown
      if (
        code === 'KeyS' ||
        key === 's' ||
        key === 'ㄴ' ||
        code === 'ArrowDown' ||
        key === 'arrowdown'
      ) {
        activeKeys.current.backward = true;
        matched = true;
      }
      // 좌측: A, a, ㅁ, ArrowLeft
      if (
        code === 'KeyA' ||
        key === 'a' ||
        key === 'ㅁ' ||
        code === 'ArrowLeft' ||
        key === 'arrowleft'
      ) {
        activeKeys.current.left = true;
        matched = true;
      }
      // 우측: D, d, ㅇ, ArrowRight
      if (
        code === 'KeyD' ||
        key === 'd' ||
        key === 'ㅇ' ||
        code === 'ArrowRight' ||
        key === 'arrowright'
      ) {
        activeKeys.current.right = true;
        matched = true;
      }

      // ========================================================
      // 예배 행동 단축키 (E: 상호작용, Q: 기도 토글, 1/2/3/4)
      // ========================================================
      // E: 문맥 상호작용 (의자 앉기 / 무릎 꿇기 / 일어서기)
      if (code === 'KeyE' || key === 'e' || key === 'ㄷ') {
        const cur = actionStateRef.current;
        if (isSittingState(cur)) {
          triggerAction('standing_up');
        } else if (isKneelingState(cur)) {
          triggerAction('standing_from_kneeling');
        } else if (cur === 'standing_pray') {
          triggerAction('idle');
        } else if (nearestSeatRef.current) {
          if (nearestSeatRef.current.type === 'pew') {
            triggerAction('sitting_down', nearestSeatRef.current);
          } else {
            triggerAction('kneeling_down', nearestSeatRef.current);
          }
        }
        matched = true;
      }

      // Q: 기도 토글 (앉아서 기도 / 무릎 기도 / 기도 마치기)
      if (code === 'KeyQ' || key === 'q' || key === 'ㅂ') {
        const cur = actionStateRef.current;
        if (cur === 'sitting_idle') {
          triggerAction('sitting_pray');
        } else if (cur === 'sitting_pray') {
          triggerAction('sitting_idle');
        } else if (cur === 'kneeling_idle') {
          triggerAction('kneeling_pray');
        } else if (cur === 'kneeling_pray') {
          triggerAction('kneeling_idle');
        } else if (cur === 'standing_pray') {
          triggerAction('idle');
        } else if (cur === 'idle') {
          triggerAction('standing_pray');
        }
        matched = true;
      }

      // 1: 서서 기도 (토글)
      if (code === 'Digit1' || key === '1') {
        const cur = actionStateRef.current;
        if (cur === 'standing_pray') {
          triggerAction('idle');
        } else if (cur === 'idle') {
          triggerAction('standing_pray');
        }
        matched = true;
      }

      // 2: 무릎 기도 (토글)
      if (code === 'Digit2' || key === '2') {
        const cur = actionStateRef.current;
        if (cur === 'kneeling_pray') {
          triggerAction('kneeling_idle');
        } else if (cur === 'kneeling_idle') {
          triggerAction('kneeling_pray');
        } else if (cur === 'idle') {
          triggerAction('kneeling_pray');
        }
        matched = true;
      }

      // 3: 손 흔들기 인사
      if (code === 'Digit3' || key === '3') {
        if (actionStateRef.current === 'idle') {
          triggerAction('wave');
        }
        matched = true;
      }

      // 4: 정중한 인사 (Bow)
      if (code === 'Digit4' || key === '4') {
        if (actionStateRef.current === 'idle') {
          triggerAction('bow');
        }
        matched = true;
      }

      if (matched) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (code === 'Space' || key === ' ' || key === 'spacebar') {
        activeKeys.current.jump = false;
      }
      if (
        code === 'KeyW' ||
        key === 'w' ||
        key === 'ㅈ' ||
        code === 'ArrowUp' ||
        key === 'arrowup'
      ) {
        activeKeys.current.forward = false;
      }
      if (
        code === 'KeyS' ||
        key === 's' ||
        key === 'ㄴ' ||
        code === 'ArrowDown' ||
        key === 'arrowdown'
      ) {
        activeKeys.current.backward = false;
      }
      if (
        code === 'KeyA' ||
        key === 'a' ||
        key === 'ㅁ' ||
        code === 'ArrowLeft' ||
        key === 'arrowleft'
      ) {
        activeKeys.current.left = false;
      }
      if (
        code === 'KeyD' ||
        key === 'd' ||
        key === 'ㅇ' ||
        code === 'ArrowRight' ||
        key === 'arrowright'
      ) {
        activeKeys.current.right = false;
      }
    };

    const handleBlur = () => {
      activeKeys.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
      };
    };

    const handleCustomJump = () => {
      if (isGroundedRef.current && canCharacterMove(actionStateRef.current)) {
        velocityYRef.current = JUMP_SPEED;
        isGroundedRef.current = false;
        landingSquashRef.current = 0;
      }
    };

    const handleCustomAction = (e: any) => {
      if (e.detail?.action) {
        triggerAction(e.detail.action, e.detail.seat);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('player-jump', handleCustomJump);
    window.addEventListener('player-action', handleCustomAction);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('player-jump', handleCustomJump);
      window.removeEventListener('player-action', handleCustomAction);
    };
  }, [triggerAction]);

  // 초기 스폰 위치 설정
  const initX = initialPosition[0];
  const initY = initialPosition[1];
  const initZ = initialPosition[2];
  const spawnKey = `${initX}_${initY}_${initZ}_${initialRotationY}`;
  const appliedSpawnKeyRef = useRef<string>('');

  useEffect(() => {
    if (!playerRef.current) return;
    if (appliedSpawnKeyRef.current !== spawnKey) {
      appliedSpawnKeyRef.current = spawnKey;
      playerRef.current.position.set(initX, initY, initZ);
      playerRef.current.rotation.y = initialRotationY;
      prevPosRef.current.x = initX;
      prevPosRef.current.z = initZ;
      walkWeightRef.current = 0;
      jumpWeightRef.current = 0;
      velocityYRef.current = 0;
      isGroundedRef.current = true;
      landingSquashRef.current = 0;
      setActionState('idle');
      if (onPositionChange) {
        onPositionChange(playerRef.current.position);
      }
    }
  }, [spawnKey, initX, initY, initZ, initialRotationY, onPositionChange, setActionState]);

  // ========================================================
  // R3F 메인 애니메이션 & 물리 프레임 루프
  // ========================================================
  useFrame((_, delta) => {
    if (!playerRef.current || !meshRef.current) return;

    const dt = Math.min(delta, 0.1);

    // 1. 가장 가까운 상호작용 좌석 주기적 탐색 (80ms 주기 쓰로틀링)
    const now = performance.now();
    if (availableSeats.length > 0 && now - lastSeatCheckRef.current > 80) {
      lastSeatCheckRef.current = now;
      const nearest = findNearestSeat(
        { x: playerRef.current.position.x, z: playerRef.current.position.z },
        availableSeats,
        1.35
      );
      if (nearest?.id !== nearestSeatRef.current?.id) {
        nearestSeatRef.current = nearest;
        if (onNearestSeatChange) {
          onNearestSeatChange(nearest);
        }
      }
    }

    // 2. 액션 상태 전이 타이머 및 자동 전이 체크
    actionTimerRef.current += dt;
    const curAction = actionStateRef.current;

    if (curAction === 'sitting_down') {
      const seat = targetSeatRef.current;
      if (seat) {
        const p = smoothstep(0, 0.70, actionTimerRef.current);
        const start = actionStartPosRef.current;
        playerRef.current.position.x = lerp(start.x, seat.characterSitPosition[0], p);
        playerRef.current.position.z = lerp(start.z, seat.characterSitPosition[2], p);

        // 의자 방향으로 자연스러운 회전 보간
        let diff = seat.seatRotation - playerRef.current.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        playerRef.current.rotation.y += diff * Math.min(dt * 8, 1);
      }
      if (actionTimerRef.current >= 0.70) {
        setActionState('sitting_idle');
      }
    } else if (curAction === 'standing_up') {
      const seat = targetSeatRef.current;
      const exitPos = seat
        ? seat.characterStandExitPosition
        : [playerRef.current.position.x, 0, playerRef.current.position.z - 0.85];
      const p = smoothstep(0, 0.60, actionTimerRef.current);
      const start = actionStartPosRef.current;
      playerRef.current.position.x = lerp(start.x, exitPos[0], p);
      playerRef.current.position.z = lerp(start.z, exitPos[2], p);

      if (actionTimerRef.current >= 0.60) {
        targetSeatRef.current = null;
        setActionState('idle');
      }
    } else if (curAction === 'kneeling_down') {
      const seat = targetSeatRef.current;
      if (seat) {
        const p = smoothstep(0, 0.75, actionTimerRef.current);
        const start = actionStartPosRef.current;
        playerRef.current.position.x = lerp(start.x, seat.characterSitPosition[0], p);
        playerRef.current.position.z = lerp(start.z, seat.characterSitPosition[2], p);

        let diff = seat.seatRotation - playerRef.current.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        playerRef.current.rotation.y += diff * Math.min(dt * 8, 1);
      }
      if (actionTimerRef.current >= 0.75) {
        setActionState(wantsKneelPrayRef.current ? 'kneeling_pray' : 'kneeling_idle');
      }
    } else if (curAction === 'standing_from_kneeling') {
      const seat = targetSeatRef.current;
      if (seat) {
        const exitPos = seat.characterStandExitPosition;
        const p = smoothstep(0, 0.65, actionTimerRef.current);
        const start = actionStartPosRef.current;
        playerRef.current.position.x = lerp(start.x, exitPos[0], p);
        playerRef.current.position.z = lerp(start.z, exitPos[2], p);
      }
      if (actionTimerRef.current >= 0.65) {
        targetSeatRef.current = null;
        setActionState('idle');
      }
    } else if (curAction === 'wave') {
      if (actionTimerRef.current >= 1.80) {
        setActionState('idle');
      }
    } else if (curAction === 'bow') {
      if (actionTimerRef.current >= 2.00) {
        setActionState('idle');
      }
    }

    // 3. 점프 입력 확인
    const wantsJump = activeKeys.current.jump || (jumpRef && jumpRef.current);
    if (wantsJump && jumpRef) {
      jumpRef.current = false;
    }
    if (wantsJump) {
      activeKeys.current.jump = false;
      if (isGroundedRef.current && canCharacterMove(actionStateRef.current)) {
        velocityYRef.current = JUMP_SPEED;
        isGroundedRef.current = false;
        landingSquashRef.current = 0;
      }
    }

    // 4. 수직 점프 물리 계산
    let currentY = playerRef.current.position.y;
    if (!isGroundedRef.current) {
      velocityYRef.current -= GRAVITY * dt;
      currentY += velocityYRef.current * dt;

      if (currentY <= 0) {
        currentY = 0;
        velocityYRef.current = 0;
        isGroundedRef.current = true;
        landingSquashRef.current = 1.0;
      }
    }
    playerRef.current.position.y = currentY;

    if (landingSquashRef.current > 0) {
      landingSquashRef.current = Math.max(0, landingSquashRef.current - dt * 6.5);
    }
    const squash = landingSquashRef.current;

    const targetJumpWeight = isGroundedRef.current ? 0.0 : 1.0;
    jumpWeightRef.current = THREE.MathUtils.lerp(
      jumpWeightRef.current,
      targetJumpWeight,
      dt * 14.0
    );
    const jw = jumpWeightRef.current;

    // 5. 키보드 & 가상 조이스틱 입력 계산
    let kx = 0;
    let kz = 0;
    const ak = activeKeys.current;
    if (ak.forward) kz -= 1;
    if (ak.backward) kz += 1;
    if (ak.left) kx -= 1;
    if (ak.right) kx += 1;

    if (kx !== 0 && kz !== 0) {
      const inv = 1 / Math.SQRT2;
      kx *= inv;
      kz *= inv;
    }

    const jx = inputRef.current?.x || 0;
    const jz = inputRef.current?.z || 0;
    const jLen = Math.hypot(jx, jz);

    const rawX = jLen > 0.05 ? jx : kx;
    const rawZ = jLen > 0.05 ? jz : kz;

    const yaw = cameraYawRef?.current || 0;
    const moveX = rawX * Math.cos(yaw) + rawZ * Math.sin(yaw);
    const moveZ = -rawX * Math.sin(yaw) + rawZ * Math.cos(yaw);

    const inputLen = Math.hypot(moveX, moveZ);
    const hasInput = inputLen > 0.05;

    // 6. 앉기/무릎 상태에서 이동 입력 감지 시 부드러운 일어서기 처리
    const isSitting = isSittingState(actionStateRef.current);
    const isKneeling = isKneelingState(actionStateRef.current);

    if ((hasInput || wantsJump) && !canCharacterMove(actionStateRef.current)) {
      if (isSitting && actionStateRef.current !== 'standing_up') {
        triggerAction('standing_up');
      } else if (isKneeling && actionStateRef.current !== 'standing_from_kneeling') {
        triggerAction('standing_from_kneeling');
      } else if (actionStateRef.current === 'standing_pray') {
        triggerAction('idle');
      }
    }

    // 7. 이동 처리 (앉기/무릎/인사 중에는 이동 정지)
    if (hasInput && canCharacterMove(actionStateRef.current)) {
      const normX = moveX / inputLen;
      const normZ = moveZ / inputLen;
      const moveDist = MOVE_SPEED * Math.min(inputLen, 1.0) * dt;

      const desiredDelta = {
        x: normX * moveDist,
        z: normZ * moveDist,
      };

      const resolved = resolveSlidingMovement(
        { x: playerRef.current.position.x, z: playerRef.current.position.z },
        desiredDelta,
        bounds,
        colliders,
        playerRadius
      );

      playerRef.current.position.x = resolved.x;
      playerRef.current.position.z = resolved.z;

      // 회전 보간
      const targetAngle = Math.atan2(normX, normZ);
      let diff = targetAngle - playerRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      playerRef.current.rotation.y += diff * Math.min(dt * 14, 1);
    }

    // 8. 실제 이동량 및 속도 계산
    const actualDeltaX = playerRef.current.position.x - prevPosRef.current.x;
    const actualDeltaZ = playerRef.current.position.z - prevPosRef.current.z;
    const actualDist = Math.hypot(actualDeltaX, actualDeltaZ);
    const actualSpeed = dt > 0 ? actualDist / dt : 0;

    prevPosRef.current.x = playerRef.current.position.x;
    prevPosRef.current.z = playerRef.current.position.z;

    const isActuallyMoving =
      hasInput && actualDist > 0.0003 && canCharacterMove(actionStateRef.current);

    // WALK 가중치 블렌딩
    const targetWalkWeight = isActuallyMoving ? 1.0 : 0.0;
    walkWeightRef.current = THREE.MathUtils.lerp(
      walkWeightRef.current,
      targetWalkWeight,
      dt * 10.0
    );
    const w = walkWeightRef.current;
    const idleW = 1.0 - w;

    if (w > 0.001) {
      const speedScale = Math.min(Math.max(actualSpeed / MOVE_SPEED, 0.4), 1.3);
      walkTimer.current += dt * 13.0 * speedScale;
    }
    idleTimer.current += dt * 2.2;

    const idlePhase = idleTimer.current;
    const breath = Math.sin(idlePhase);
    const sway = Math.sin(idlePhase * 0.6);

    // ========================================================
    // 9. 관절 애니메이션 계산 (Action Pose or Walk/Idle)
    // ========================================================
    const activeAction = actionStateRef.current;
    const isKneelerTarget = targetSeatRef.current?.type === 'kneeler';
    const pose = computeActionPose(
      activeAction,
      actionTimerRef.current,
      idlePhase,
      breath,
      sway,
      isKneelerTarget
    );

    // 얼굴 표정 & 기도 중 눈 감김 실시간 반영
    if (faceControllerRef.current) {
      faceControllerRef.current.update(dt, pose.isPraying);
    }

    // 60fps 부드러운 쿼터니언 Slerp 보간 속도 계수 (프레임 튐 완전 제거)
    const boneSlerp = Math.min(dt * 22.0, 1.0);

    if (activeAction === 'idle' || activeAction === 'walk') {
      // 기본 보행 및 대기 포즈 계산
      const walkPhase = walkTimer.current;
      const legCycle = Math.sin(walkPhase);
      const cosCycle = Math.cos(walkPhase);

      // 다리 관절
      const groundThighZ_L = legCycle * 0.48 * w;
      const groundThighZ_R = -legCycle * 0.48 * w;
      const leftThighZ = groundThighZ_L * (1 - jw) + -0.22 * jw;
      const rightThighZ = groundThighZ_R * (1 - jw) + -0.22 * jw;
      applyBoneRotation(bones['Left_UpLeg_00'], 0, 0, leftThighZ, boneSlerp);
      applyBoneRotation(bones['RightUpLeg_024'], 0, 0, rightThighZ, boneSlerp);

      const groundKneeZ_L =
        (Math.max(0, legCycle) * 0.65 + Math.max(0, -cosCycle) * 0.2) * w;
      const groundKneeZ_R =
        (Math.max(0, -legCycle) * 0.65 + Math.max(0, cosCycle) * 0.2) * w;
      const leftKneeZ = groundKneeZ_L * (1 - jw) + 0.45 * jw + squash * 0.35;
      const rightKneeZ = groundKneeZ_R * (1 - jw) + 0.45 * jw + squash * 0.35;
      applyBoneRotation(bones['Left_Leg_028'], 0, 0, leftKneeZ, boneSlerp);
      applyBoneRotation(bones['RightLeg_025'], 0, 0, rightKneeZ, boneSlerp);

      const groundFootZ_L =
        (Math.max(0, legCycle) * 0.35 - Math.max(0, -legCycle) * 0.2) * w;
      const groundFootZ_R =
        (Math.max(0, -legCycle) * 0.35 - Math.max(0, legCycle) * 0.2) * w;
      const leftFootZ = groundFootZ_L * (1 - jw) + 0.25 * jw;
      const rightFootZ = groundFootZ_R * (1 - jw) + 0.25 * jw;
      applyBoneRotation(bones['Left_Foot_029'], 0, 0, leftFootZ, boneSlerp);
      applyBoneRotation(bones['RightFoot_026'], 0, 0, rightFootZ, boneSlerp);

      // 어깨/쇄골 및 손목을 기본 자세로 부드럽게 복귀
      applyBoneRotation(bones['Left_Shoulder_016'], 0, 0, 0, boneSlerp);
      applyBoneRotation(bones['RightShoulder_08'], 0, 0, 0, boneSlerp);
      applyBoneRotation(bones['Left_Hand_019'], 0, 0, 0, boneSlerp);
      applyBoneRotation(bones['RightHand_011'], 0, 0, 0, boneSlerp);

      // 팔 관절
      const leftArmIdleZ = 0.82 + sway * 0.015;
      const rightArmIdleZ = -0.82 - sway * 0.015;
      const leftArmIdleY = -breath * 0.015;
      const rightArmIdleY = breath * 0.015;

      const walkClearance = Math.abs(legCycle) * 0.04;
      const leftArmWalkZ = 0.82 - walkClearance;
      const rightArmWalkZ = -0.82 + walkClearance;
      const armWalkY = -legCycle * 0.45;

      const groundArmZ_L = leftArmIdleZ * idleW + leftArmWalkZ * w;
      const groundArmZ_R = rightArmIdleZ * idleW + rightArmWalkZ * w;
      const groundArmY_L = leftArmIdleY * idleW + armWalkY * w;
      const groundArmY_R = rightArmIdleY * idleW + armWalkY * w;

      const leftArmJumpZ = 0.28;
      const rightArmJumpZ = -0.28;
      const leftArmJumpY = -0.15;
      const rightArmJumpY = 0.15;

      const leftArmZ = groundArmZ_L * (1 - jw) + leftArmJumpZ * jw;
      const rightArmZ = groundArmZ_R * (1 - jw) + rightArmJumpZ * jw;
      const leftArmY = groundArmY_L * (1 - jw) + leftArmJumpY * jw;
      const rightArmY = groundArmY_R * (1 - jw) + rightArmJumpY * jw;
      applyBoneRotation(bones['Left_Arm_017'], 0, leftArmY, leftArmZ, boneSlerp);
      applyBoneRotation(bones['RightArm_09'], 0, rightArmY, rightArmZ, boneSlerp);

      const leftForearmWalkY = -0.15 - Math.max(0, legCycle) * 0.25;
      const rightForearmWalkY = 0.15 + Math.max(0, -legCycle) * 0.25;
      const groundForearmY_L =
        (-0.12 + breath * 0.01) * idleW + leftForearmWalkY * w;
      const groundForearmY_R =
        (0.12 - breath * 0.01) * idleW + rightForearmWalkY * w;

      const leftForearmY = groundForearmY_L * (1 - jw) + -0.28 * jw;
      const rightForearmY = groundForearmY_R * (1 - jw) + 0.28 * jw;
      applyBoneRotation(bones['Left_ForeArm_018'], 0, leftForearmY, 0, boneSlerp);
      applyBoneRotation(bones['RightForeArm_010'], 0, rightForearmY, 0, boneSlerp);

      // 골반, 척추, 머리
      const hipsWalkX = legCycle * 0.06;
      const hipsWalkY = cosCycle * 0.04;
      const hipsWalkZ = 0.04;
      const hipsIdleY = sway * 0.015;
      const hipsIdleZ = breath * 0.008;

      const groundHipsX = hipsWalkX * w;
      const groundHipsY = hipsIdleY * idleW + hipsWalkY * w;
      const groundHipsZ = hipsIdleZ * idleW + hipsWalkZ * w;

      const hipsX = groundHipsX * (1 - jw);
      const hipsY = groundHipsY * (1 - jw);
      const hipsZ = groundHipsZ * (1 - jw) + -0.06 * jw + squash * 0.08;
      applyBoneRotation(bones['Hips_01'], hipsX, hipsY, hipsZ, boneSlerp);

      const jumpSpineZ = velocityYRef.current > 0 ? -0.08 : 0.06;
      const spineWalkX = -legCycle * 0.05;
      const spineWalkZ = 0.06;
      const spineIdleZ = breath * 0.02;
      const spineIdleY = -sway * 0.01;

      const groundSpineX = spineWalkX * w;
      const groundSpineY = spineIdleY * idleW;
      const groundSpineZ = spineIdleZ * idleW + spineWalkZ * w;

      const spineX = groundSpineX * (1 - jw);
      const spineY = groundSpineY * (1 - jw);
      const spineZ = groundSpineZ * (1 - jw) + jumpSpineZ * jw + squash * 0.12;
      applyBoneRotation(bones['Spine_02'], spineX, spineY, spineZ, boneSlerp);
      applyBoneRotation(bones['Spine1_03'], 0, 0, breath * 0.008 * idleW * (1 - jw), boneSlerp);
      applyBoneRotation(bones['Spine2_04'], 0, 0, breath * 0.008 * idleW * (1 - jw), boneSlerp);

      const jumpHeadZ = velocityYRef.current > 0 ? 0.14 : -0.08;
      const jumpNeckZ = velocityYRef.current > 0 ? -0.1 : 0.06;

      const groundHeadZ = -breath * 0.01 * idleW + Math.abs(cosCycle) * 0.02 * w;
      const groundNeckZ = -breath * 0.012 * idleW + -0.04 * w;

      const headZ = groundHeadZ * (1 - jw) + jumpHeadZ * jw;
      const neckZ = groundNeckZ * (1 - jw) + jumpNeckZ * jw;
      const neckY = sway * 0.008 * idleW * (1 - jw);
      const headX = Math.cos(idlePhase * 0.4) * 0.02 * idleW * (1 - jw);
      applyBoneRotation(bones['Neck_05'], 0, neckY, neckZ, boneSlerp);
      applyBoneRotation(bones['Head_06'], headX, 0, headZ, boneSlerp);

      const walkBounce = Math.abs(cosCycle) * 0.035;
      const walkTilt = Math.sin(walkPhase) * 0.04;
      const idleBob = breath * 0.008;

      const targetMeshY = (idleBob * idleW + walkBounce * w) * (1 - jw);
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        targetMeshY,
        Math.min(dt * 16.0, 1.0)
      );
      meshRef.current.rotation.z = walkTilt * w * (1 - jw);
      meshRef.current.rotation.x = 0;
    } else {
      // 액션 포즈 직접 적용 (어깨/손목 포함 전신 관절 부드러운 Slerp 보간)
      applyBoneRotation(bones['Left_Shoulder_016'], ...pose.leftShoulder, boneSlerp);
      applyBoneRotation(bones['RightShoulder_08'], ...pose.rightShoulder, boneSlerp);

      applyBoneRotation(bones['Left_Arm_017'], ...pose.leftArm, boneSlerp);
      applyBoneRotation(bones['RightArm_09'], ...pose.rightArm, boneSlerp);
      applyBoneRotation(bones['Left_ForeArm_018'], ...pose.leftForearm, boneSlerp);
      applyBoneRotation(bones['RightForeArm_010'], ...pose.rightForearm, boneSlerp);

      applyBoneRotation(bones['Left_Hand_019'], ...pose.leftHand, boneSlerp);
      applyBoneRotation(bones['RightHand_011'], ...pose.rightHand, boneSlerp);

      applyBoneRotation(bones['Left_UpLeg_00'], ...pose.leftThigh, boneSlerp);
      applyBoneRotation(bones['RightUpLeg_024'], ...pose.rightThigh, boneSlerp);
      applyBoneRotation(bones['Left_Leg_028'], ...pose.leftKnee, boneSlerp);
      applyBoneRotation(bones['RightLeg_025'], ...pose.rightKnee, boneSlerp);
      applyBoneRotation(bones['Left_Foot_029'], ...pose.leftFoot, boneSlerp);
      applyBoneRotation(bones['RightFoot_026'], ...pose.rightFoot, boneSlerp);

      applyBoneRotation(bones['Hips_01'], ...pose.hips, boneSlerp);
      applyBoneRotation(bones['Spine_02'], ...pose.spine, boneSlerp);
      applyBoneRotation(bones['Spine1_03'], ...pose.spine1, boneSlerp);
      applyBoneRotation(bones['Spine2_04'], ...pose.spine2, boneSlerp);
      applyBoneRotation(bones['Neck_05'], ...pose.neck, boneSlerp);
      applyBoneRotation(bones['Head_06'], ...pose.head, boneSlerp);

      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        pose.meshOffsetY,
        Math.min(dt * 14.0, 1.0)
      );
      meshRef.current.rotation.z = 0;
      meshRef.current.rotation.x = 0;
    }

    // 10. 스쿼시 & 스트레치
    const squashScaleX = 1.0 + squash * 0.15;
    const squashScaleY = 1.0 - squash * 0.18;
    const squashScaleZ = 1.0 + squash * 0.15;
    meshRef.current.scale.set(
      1.6 * squashScaleX,
      1.6 * squashScaleY,
      1.6 * squashScaleZ
    );

    // 11. 접지 그림자 동기화
    if (shadowRef.current) {
      shadowRef.current.position.y = -currentY + 0.005;
      const isSit = isSittingState(activeAction);
      const isKneel = isKneelingState(activeAction);
      const shadowScale = isSit
        ? 0.85
        : isKneel
        ? 0.75
        : Math.max(0.35, 1.0 - currentY * 0.42);
      shadowRef.current.scale.set(shadowScale, shadowScale, shadowScale);
      const shadowMat = shadowRef.current.material as THREE.MeshBasicMaterial;
      if (shadowMat) {
        shadowMat.opacity = Math.max(0.12, 0.45 * (1.0 - currentY * 0.55));
      }
    }

    // 12. 위치 콜백
    if (onPositionChange) {
      onPositionChange(playerRef.current.position);
    }

    // 13. 디버그 정보
    if (onDebugUpdate && now - lastDebugUpdateRef.current > 150) {
      lastDebugUpdateRef.current = now;
      onDebugUpdate({
        x: Number(playerRef.current.position.x.toFixed(2)),
        z: Number(playerRef.current.position.z.toFixed(2)),
        inputX: Number(rawX.toFixed(2)),
        inputZ: Number(rawZ.toFixed(2)),
        isMoving: isActuallyMoving,
        speed: isActuallyMoving ? Number(actualSpeed.toFixed(2)) : 0,
        actionState: activeAction,
      });
    }

    if (typeof window !== 'undefined') {
      (window as any).__PLAYER_STATE__ = {
        x: Number(playerRef.current.position.x.toFixed(2)),
        y: Number(currentY.toFixed(2)),
        z: Number(playerRef.current.position.z.toFixed(2)),
        isMoving: isActuallyMoving,
        isGrounded: isGroundedRef.current,
        jumpWeight: Number(jw.toFixed(2)),
        walkWeight: Number(w.toFixed(2)),
        rotationY: Number(playerRef.current.rotation.y.toFixed(2)),
        actionState: activeAction,
      };
    }
  });

  return (
    <group ref={playerRef}>
      {/* 캐릭터 은은한 포인트 라이트 */}
      <pointLight
        position={[0, 1.4, 0.4]}
        intensity={1.2}
        distance={4.0}
        color="#fffbeb"
      />

      {/* 귀여운 캐릭터 크기 (스케일 1.6 -> 키 약 0.76m) */}
      <group ref={meshRef} scale={[1.6, 1.6, 1.6]}>
        <primitive object={clonedScene} />
      </group>

      {/* 발바닥 소프트 콘택트 그림자 */}
      <mesh
        ref={shadowRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
      >
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload('/character/chibi.glb');
