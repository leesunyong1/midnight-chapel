'use client';

import { useRef, useMemo, useEffect } from 'react';
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

export interface PlayerDebugInfo {
  x: number;
  z: number;
  inputX: number;
  inputZ: number;
  isMoving: boolean;
  speed: number;
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

/**
 * 본(Bone)의 초기 Rest Pose 쿼터니언을 기준으로 상대 델타 회전을 곱해 적용합니다.
 * 누적 오차가 발생하지 않으며 항상 Rest Pose 기준으로 안전하게 회전합니다.
 */
function applyBoneRotation(
  entry: BoneEntry | undefined,
  x: number,
  y: number,
  z: number
) {
  if (!entry) return;
  scratchEuler.set(x, y, z, 'XYZ');
  scratchQuat.setFromEuler(scratchEuler);
  entry.bone.quaternion.copy(entry.restQuat).multiply(scratchQuat);
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
}: ChibiPlayerProps) {
  const { scene } = useGLTF('/character/chibi.glb');

  // 얼굴 표정 및 눈 깜빡임 제어 컨트롤러 참조
  const faceControllerRef = useRef<ChibiFaceController | null>(null);

  // SkinnedMesh 및 본(Bone) 계층을 완벽히 복제하기 위해 SkeletonUtils.clone 사용
  // 향후 다중 플레이어 스폰 시에도 캐릭터별 독립적인 Skeleton 인스턴스를 유지합니다.
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // 1단계 외형 리디자인: 피부 톤, 3D 볼륨 헤어, 입체 눈 & 실시간 깜빡임, 표정 파츠 장착
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

  const walkTimer = useRef(0);
  const idleTimer = useRef(0);
  const walkWeightRef = useRef(0); // 0 = IDLE, 1 = WALK (부드러운 블렌딩)
  const jumpWeightRef = useRef(0); // 0 = 지상, 1 = 공중 점프 중
  const velocityYRef = useRef(0);  // 수직 점프 속도 (m/s)
  const isGroundedRef = useRef(true); // 착지 상태 여부
  const landingSquashRef = useRef(0); // 착지 시 쿠션 스쿼시 강도 (0 ~ 1)

  const prevPosRef = useRef({ x: initialPosition[0], z: initialPosition[2] });
  const lastDebugUpdateRef = useRef(0);

  // 내부 이동 및 점프 키 상태 추적 (한글/영문/대소문자/e.code 모두 지원)
  const activeKeys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

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

      if (matched) {
        // 브라우저 기본 스크롤 동작 방지 (특히 스페이스바 스크롤 방지)
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

    // 모바일 UI 버튼 등 외부에서 이벤트 디스패치로 점프를 트리거할 수 있도록 지원
    const handleCustomJump = () => {
      if (isGroundedRef.current) {
        velocityYRef.current = JUMP_SPEED;
        isGroundedRef.current = false;
        landingSquashRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('player-jump', handleCustomJump);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('player-jump', handleCustomJump);
    };
  }, []);

  // 초기 스폰 위치 설정
  // 주의: 부모 컴포넌트의 리렌더링마다 캐릭터 좌표가 리셋되지 않도록
  // 실제 좌표 수치(initX, initY, initZ)가 변경되었을 때만 1회 적용
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
      if (onPositionChange) {
        onPositionChange(playerRef.current.position);
      }
    }
  }, [spawnKey, initX, initY, initZ, initialRotationY, onPositionChange]);

  useFrame((_, delta) => {
    if (!playerRef.current || !meshRef.current) return;

    // 델타 타임 제한 (탭 전환 시 급발진 방지)
    const dt = Math.min(delta, 0.1);

    // 얼굴 표정 및 자연스러운 눈 깜빡임 실시간 업데이트
    if (faceControllerRef.current) {
      faceControllerRef.current.update(dt);
    }

    // 0. 점프 입력 확인 및 수직 도약 처리 (스페이스바 및 모바일 점프 버튼)
    const wantsJump = activeKeys.current.jump || (jumpRef && jumpRef.current);
    if (wantsJump) {
      if (jumpRef) jumpRef.current = false;
      activeKeys.current.jump = false;
      if (isGroundedRef.current) {
        velocityYRef.current = JUMP_SPEED;
        isGroundedRef.current = false;
        landingSquashRef.current = 0;
      }
    }

    // 1. 수직 점프 물리 계산 (중력 & 착지 판정)
    let currentY = playerRef.current.position.y;
    if (!isGroundedRef.current) {
      velocityYRef.current -= GRAVITY * dt;
      currentY += velocityYRef.current * dt;

      if (currentY <= 0) {
        currentY = 0;
        velocityYRef.current = 0;
        isGroundedRef.current = true;
        landingSquashRef.current = 1.0; // 착지 시 쫀득한 쿠션 충격흡수 시작
      }
    }
    playerRef.current.position.y = currentY;

    // 착지 스쿼시 감쇠 (약 150ms 동안 부드럽게 흡수 복귀)
    if (landingSquashRef.current > 0) {
      landingSquashRef.current = Math.max(0, landingSquashRef.current - dt * 6.5);
    }
    const squash = landingSquashRef.current;

    // 점프 가중치 보간 (부드러운 에어 포즈 전환)
    const targetJumpWeight = isGroundedRef.current ? 0.0 : 1.0;
    jumpWeightRef.current = THREE.MathUtils.lerp(
      jumpWeightRef.current,
      targetJumpWeight,
      dt * 14.0
    );
    const jw = jumpWeightRef.current;

    // 2. 바닥 접지 그림자 동기화 (플레이어가 뛰어올라도 그림자는 바닥에 착 달라붙음)
    if (shadowRef.current) {
      shadowRef.current.position.y = -currentY + 0.005;
      const shadowScale = Math.max(0.35, 1.0 - currentY * 0.42);
      shadowRef.current.scale.set(shadowScale, shadowScale, shadowScale);
      const shadowMat = shadowRef.current.material as THREE.MeshBasicMaterial;
      if (shadowMat) {
        shadowMat.opacity = Math.max(0.12, 0.45 * (1.0 - currentY * 0.55));
      }
    }

    // 3. 키보드 입력 계산
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

    // 4. 가상 조이스틱 입력 합산 (조이스틱 사용 중이면 조이스틱 우선)
    const jx = inputRef.current?.x || 0;
    const jz = inputRef.current?.z || 0;
    const jLen = Math.hypot(jx, jz);

    const rawX = jLen > 0.05 ? jx : kx;
    const rawZ = jLen > 0.05 ? jz : kz;

    // 5. 카메라 회전 각도(yaw)를 반영한 이동 벡터 변환 (카메라 시점 기준 자연스러운 이동)
    const yaw = cameraYawRef?.current || 0;
    const moveX = rawX * Math.cos(yaw) + rawZ * Math.sin(yaw);
    const moveZ = -rawX * Math.sin(yaw) + rawZ * Math.cos(yaw);

    const inputLen = Math.hypot(moveX, moveZ);
    const hasInput = inputLen > 0.05;

    if (hasInput) {
      // 6. 이동 속도 및 축 분리 슬라이딩 충돌 계산
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

      // 7. 이동 방향으로 부드러운 회전 보간 (atan2)
      const targetAngle = Math.atan2(normX, normZ);
      let diff = targetAngle - playerRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      playerRef.current.rotation.y += diff * Math.min(dt * 14, 1);
    }

    // 8. 실제 월드 이동 거리 및 속도 계산 (벽/장애물에 막혔을 때 제자리걸음 방지)
    const actualDeltaX = playerRef.current.position.x - prevPosRef.current.x;
    const actualDeltaZ = playerRef.current.position.z - prevPosRef.current.z;
    const actualDist = Math.hypot(actualDeltaX, actualDeltaZ);
    const actualSpeed = dt > 0 ? actualDist / dt : 0;

    prevPosRef.current.x = playerRef.current.position.x;
    prevPosRef.current.z = playerRef.current.position.z;

    // 실제 이동 여부: 사용자의 입력이 존재하며 실제로 월드 좌표가 이동했을 때만 true
    const isActuallyMoving = hasInput && actualDist > 0.0003;

    // WALK 가중치 블렌딩 (10.0/s 속도로 부드럽게 보간: 정지 시 150ms 내 IDLE 복귀)
    const targetWalkWeight = isActuallyMoving ? 1.0 : 0.0;
    walkWeightRef.current = THREE.MathUtils.lerp(
      walkWeightRef.current,
      targetWalkWeight,
      dt * 10.0
    );
    const w = walkWeightRef.current;
    const idleW = 1.0 - w;

    // 타이머 업데이트 (보폭 주기는 실제 이동 속도에 비례)
    if (w > 0.001) {
      const speedScale = Math.min(Math.max(actualSpeed / MOVE_SPEED, 0.4), 1.3);
      walkTimer.current += dt * 13.0 * speedScale;
    }
    idleTimer.current += dt * 2.2;

    // === 관절 애니메이션 계산 (Bone Rotations) ===
    const walkPhase = walkTimer.current;
    const legCycle = Math.sin(walkPhase);
    const cosCycle = Math.cos(walkPhase);

    const idlePhase = idleTimer.current;
    const breath = Math.sin(idlePhase);
    const sway = Math.sin(idlePhase * 0.6);

    // [A. 다리 관절: 허벅지, 무릎, 발목]
    // 1) 허벅지: 보행 시 Z축 교차 회전 (-Z 전방, +Z 후방), 점프 시 양다리를 가볍게 앞으로 모아 접기(-0.22 rad)
    const groundThighZ_L = (legCycle * 0.48) * w;
    const groundThighZ_R = (-legCycle * 0.48) * w;
    const leftThighZ = groundThighZ_L * (1 - jw) + (-0.22) * jw;
    const rightThighZ = groundThighZ_R * (1 - jw) + (-0.22) * jw;
    applyBoneRotation(bones['Left_UpLeg_00'], 0, 0, leftThighZ);
    applyBoneRotation(bones['RightUpLeg_024'], 0, 0, rightThighZ);

    // 2) 무릎: 보행 시 뒷다리 굽힘, 점프 시 양무릎을 뒤로 접고(+0.45 rad), 착지 충격 흡수(squash * 0.35)
    const groundKneeZ_L = (Math.max(0, legCycle) * 0.65 + Math.max(0, -cosCycle) * 0.20) * w;
    const groundKneeZ_R = (Math.max(0, -legCycle) * 0.65 + Math.max(0, cosCycle) * 0.20) * w;
    const leftKneeZ = groundKneeZ_L * (1 - jw) + (0.45) * jw + (squash * 0.35);
    const rightKneeZ = groundKneeZ_R * (1 - jw) + (0.45) * jw + (squash * 0.35);
    applyBoneRotation(bones['Left_Leg_028'], 0, 0, leftKneeZ);
    applyBoneRotation(bones['RightLeg_025'], 0, 0, rightKneeZ);

    // 3) 발목: 보행 착지/차기 각도, 점프 시 발끝 살짝 아래로 포인팅(+0.25 rad)
    const groundFootZ_L = (Math.max(0, legCycle) * 0.35 - Math.max(0, -legCycle) * 0.20) * w;
    const groundFootZ_R = (Math.max(0, -legCycle) * 0.35 - Math.max(0, legCycle) * 0.20) * w;
    const leftFootZ = groundFootZ_L * (1 - jw) + (0.25) * jw;
    const rightFootZ = groundFootZ_R * (1 - jw) + (0.25) * jw;
    applyBoneRotation(bones['Left_Foot_029'], 0, 0, leftFootZ);
    applyBoneRotation(bones['RightFoot_026'], 0, 0, rightFootZ);

    // [B. 팔 관절: 상완, 전완/팔꿈치]
    // 1) 상완:
    //  - 기본 Rest 자세(A-pose)에서 양팔을 옆구리로 자연스럽게 내려 배치 (Left Z=+0.82 rad, Right Z=-0.82 rad)
    //  - 보행 시 팔이 내려진 상태를 유지하며 Y축으로 전후 교차 스윙
    //  - 점프 시에는 양팔을 살짝 위로 들어 균형 잡고 신나게 뜀 (Z=0.28 / -0.28)
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

    // 점프 시 양팔을 살짝 위로 들어 활짝 펴는 귀여운 점프 자세
    const leftArmJumpZ = 0.28;
    const rightArmJumpZ = -0.28;
    const leftArmJumpY = -0.15;
    const rightArmJumpY = 0.15;

    const leftArmZ = groundArmZ_L * (1 - jw) + leftArmJumpZ * jw;
    const rightArmZ = groundArmZ_R * (1 - jw) + rightArmJumpZ * jw;
    const leftArmY = groundArmY_L * (1 - jw) + leftArmJumpY * jw;
    const rightArmY = groundArmY_R * (1 - jw) + rightArmJumpY * jw;
    applyBoneRotation(bones['Left_Arm_017'], 0, leftArmY, leftArmZ);
    applyBoneRotation(bones['RightArm_09'], 0, rightArmY, rightArmZ);

    // 2) 전완/팔꿈치: 평소에는 몸 안쪽으로 편안하게 모으고, 보행 및 점프 시 알맞게 굽힘
    const leftForearmWalkY = -0.15 - Math.max(0, legCycle) * 0.25;
    const rightForearmWalkY = 0.15 + Math.max(0, -legCycle) * 0.25;
    const groundForearmY_L = (-0.12 + breath * 0.01) * idleW + leftForearmWalkY * w;
    const groundForearmY_R = (0.12 - breath * 0.01) * idleW + rightForearmWalkY * w;

    const leftForearmY = groundForearmY_L * (1 - jw) + (-0.28) * jw;
    const rightForearmY = groundForearmY_R * (1 - jw) + (0.28) * jw;
    applyBoneRotation(bones['Left_ForeArm_018'], 0, leftForearmY, 0);
    applyBoneRotation(bones['RightForeArm_010'], 0, rightForearmY, 0);

    // [C. 골반, 척추, 목, 머리]
    // 1) 골반 (Hips_01): 좌우 무게중심 롤(Y), 걷기 비틀림(X), 씩씩한 앞 기울임(Z), 점프 턱(-Z)
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
    const hipsZ = groundHipsZ * (1 - jw) + (-0.06) * jw + (squash * 0.08);
    applyBoneRotation(bones['Hips_01'], hipsX, hipsY, hipsZ);

    // 2) 척추 (Spine_02, Spine1_03, Spine2_04):
    //  - 점프 상승 시 가슴을 시원하게 펴기(-0.08 rad), 하강 시 착지 준비(+0.06 rad), 착지 시 숙이며 충격 흡수
    const jumpSpineZ = velocityYRef.current > 0 ? -0.08 : 0.06;
    const spineWalkX = -legCycle * 0.05;
    const spineWalkZ = 0.06;
    const spineIdleZ = breath * 0.020;
    const spineIdleY = -sway * 0.010;

    const groundSpineX = spineWalkX * w;
    const groundSpineY = spineIdleY * idleW;
    const groundSpineZ = spineIdleZ * idleW + spineWalkZ * w;

    const spineX = groundSpineX * (1 - jw);
    const spineY = groundSpineY * (1 - jw);
    const spineZ = groundSpineZ * (1 - jw) + jumpSpineZ * jw + (squash * 0.12);
    applyBoneRotation(bones['Spine_02'], spineX, spineY, spineZ);
    applyBoneRotation(bones['Spine1_03'], 0, 0, (breath * 0.008) * idleW * (1 - jw));
    applyBoneRotation(bones['Spine2_04'], 0, 0, (breath * 0.008) * idleW * (1 - jw));

    // 3) 목 및 머리 (Neck_05, Head_06):
    //  - 점프 도약 시 높은 성당 천장을 향해 올려다보기 (+Z head, -Z neck)
    //  - 하강 시에는 착지 바닥을 주시하여 사실감과 귀여움 극대화
    const jumpHeadZ = velocityYRef.current > 0 ? 0.14 : -0.08;
    const jumpNeckZ = velocityYRef.current > 0 ? -0.10 : 0.06;

    const groundHeadZ = (-breath * 0.010) * idleW + (Math.abs(cosCycle) * 0.02) * w;
    const groundNeckZ = (-breath * 0.012) * idleW + (-0.04) * w;

    const headZ = groundHeadZ * (1 - jw) + jumpHeadZ * jw;
    const neckZ = groundNeckZ * (1 - jw) + jumpNeckZ * jw;
    const neckY = (sway * 0.008) * idleW * (1 - jw);
    const headX = (Math.cos(idlePhase * 0.4) * 0.02) * idleW * (1 - jw);
    applyBoneRotation(bones['Neck_05'], 0, neckY, neckZ);
    applyBoneRotation(bones['Head_06'], headX, 0, headZ);

    // [D. 메쉬 그룹 착지 스쿼시 & 바운스]
    // 보행 바운스는 지상에 있을 때만 적용, 공중에서는 점프 궤적에 온전히 집중
    const walkBounce = Math.abs(cosCycle) * 0.035;
    const walkTilt = Math.sin(walkPhase) * 0.04;
    const idleBob = breath * 0.008;

    meshRef.current.position.y = (idleBob * idleW + walkBounce * w) * (1 - jw);
    meshRef.current.rotation.z = (walkTilt * w) * (1 - jw);
    meshRef.current.rotation.x = 0;

    // 착지 시 쫀득하게 눌렸다가 탄성으로 튀어오르는 스쿼시 & 스트레치 효과
    const squashScaleX = 1.0 + squash * 0.15;
    const squashScaleY = 1.0 - squash * 0.18;
    const squashScaleZ = 1.0 + squash * 0.15;
    meshRef.current.scale.set(
      1.6 * squashScaleX,
      1.6 * squashScaleY,
      1.6 * squashScaleZ
    );

    // 카메라 추적을 위한 현재 위치 콜백
    if (onPositionChange) {
      onPositionChange(playerRef.current.position);
    }

    // 디버그 정보는 150ms 단위로 쓰로틀링하여 전달 (React 리렌더링 폭주 방지)
    if (onDebugUpdate) {
      const now = performance.now();
      if (now - lastDebugUpdateRef.current > 150) {
        lastDebugUpdateRef.current = now;
        onDebugUpdate({
          x: Number(playerRef.current.position.x.toFixed(2)),
          z: Number(playerRef.current.position.z.toFixed(2)),
          inputX: Number(rawX.toFixed(2)),
          inputZ: Number(rawZ.toFixed(2)),
          isMoving: isActuallyMoving,
          speed: isActuallyMoving ? Number(actualSpeed.toFixed(2)) : 0,
        });
      }
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
      };
    }
  });

  return (
    // position prop을 생략하여 R3F 렌더링 조정자가 playerRef.current.position을
    // 부모 리렌더링 시마다 덮어쓰지 않도록 보장
    <group ref={playerRef}>
      {/* 캐릭터를 은은하게 밝혀주는 전용 온화한 포인트 라이트 */}
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

      {/* 발바닥 소프트 콘택트 그림자 (점프 시에도 지면에 밀착 유지) */}
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
