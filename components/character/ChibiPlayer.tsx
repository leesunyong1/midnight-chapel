'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
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
}

// 기본 이동 제약 경계 (하위 호환성 유지)
const DEFAULT_BOUNDS: RoomBounds = {
  minX: -2.4,
  maxX: 2.4,
  minZ: -2.3, // 제단 앞
  maxZ: 5.5,  // 입구 쪽
};

const MOVE_SPEED = 3.6; // 초당 이동 속도 (m/s)

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
  cameraYawRef,
  onPositionChange,
  onDebugUpdate,
  bounds = DEFAULT_BOUNDS,
  colliders = [],
  initialPosition = [0, 0, 2.2],
  initialRotationY = Math.PI,
  playerRadius = 0.35,
}: ChibiPlayerProps) {
  const { scene } = useGLTF('/character/chibi.glb');

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
    return clone;
  }, [scene]);

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
  const walkTimer = useRef(0);
  const idleTimer = useRef(0);
  const walkWeightRef = useRef(0); // 0 = IDLE, 1 = WALK (부드러운 블렌딩)
  const prevPosRef = useRef({ x: initialPosition[0], z: initialPosition[2] });
  const lastDebugUpdateRef = useRef(0);

  // 내부 이동 키 상태 추적 (한글/영문/대소문자/e.code 모두 지원)
  const activeKeys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
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
        // 브라우저 기본 스크롤 동작 방지
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

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
      };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
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
      if (onPositionChange) {
        onPositionChange(playerRef.current.position);
      }
    }
  }, [spawnKey, initX, initY, initZ, initialRotationY, onPositionChange]);

  useFrame((_, delta) => {
    if (!playerRef.current || !meshRef.current) return;

    // 델타 타임 제한 (탭 전환 시 급발진 방지)
    const dt = Math.min(delta, 0.1);

    // 1. 키보드 입력 계산
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

    // 2. 가상 조이스틱 입력 합산 (조이스틱 사용 중이면 조이스틱 우선)
    const jx = inputRef.current?.x || 0;
    const jz = inputRef.current?.z || 0;
    const jLen = Math.hypot(jx, jz);

    const rawX = jLen > 0.05 ? jx : kx;
    const rawZ = jLen > 0.05 ? jz : kz;

    // 3. 카메라 회전 각도(yaw)를 반영한 이동 벡터 변환 (카메라 시점 기준 자연스러운 이동)
    const yaw = cameraYawRef?.current || 0;
    const moveX = rawX * Math.cos(yaw) + rawZ * Math.sin(yaw);
    const moveZ = -rawX * Math.sin(yaw) + rawZ * Math.cos(yaw);

    const inputLen = Math.hypot(moveX, moveZ);
    const hasInput = inputLen > 0.05;

    if (hasInput) {
      // 4. 이동 속도 및 축 분리 슬라이딩 충돌 계산
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

      // 5. 이동 방향으로 부드러운 회전 보간 (atan2)
      const targetAngle = Math.atan2(normX, normZ);
      let diff = targetAngle - playerRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      playerRef.current.rotation.y += diff * Math.min(dt * 14, 1);
    }

    // 6. 실제 월드 이동 거리 및 속도 계산 (벽/장애물에 막혔을 때 제자리걸음 방지)
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
    // 1) 허벅지 (Left_UpLeg_00, RightUpLeg_024): Z축 교차 회전 (-Z 전방, +Z 후방)
    const leftThighZ = (legCycle * 0.48) * w;
    const rightThighZ = (-legCycle * 0.48) * w;
    applyBoneRotation(bones['Left_UpLeg_00'], 0, 0, leftThighZ);
    applyBoneRotation(bones['RightUpLeg_024'], 0, 0, rightThighZ);

    // 2) 무릎 (Left_Leg_028, RightLeg_025): 다리가 뒤로 가거나 들릴 때 +Z축으로 자연스럽게 굽힘
    const leftKneeZ = (Math.max(0, legCycle) * 0.65 + Math.max(0, -cosCycle) * 0.20) * w;
    const rightKneeZ = (Math.max(0, -legCycle) * 0.65 + Math.max(0, cosCycle) * 0.20) * w;
    applyBoneRotation(bones['Left_Leg_028'], 0, 0, leftKneeZ);
    applyBoneRotation(bones['RightLeg_025'], 0, 0, rightKneeZ);

    // 3) 발목 (Left_Foot_029, RightFoot_026): 착지/차기 각도 제어 (Z축)
    const leftFootZ = (Math.max(0, legCycle) * 0.35 - Math.max(0, -legCycle) * 0.20) * w;
    const rightFootZ = (Math.max(0, -legCycle) * 0.35 - Math.max(0, legCycle) * 0.20) * w;
    applyBoneRotation(bones['Left_Foot_029'], 0, 0, leftFootZ);
    applyBoneRotation(bones['RightFoot_026'], 0, 0, rightFootZ);

    // [B. 팔 관절: 상완, 전완/팔꿈치]
    // 1) 상완 (Left_Arm_017, RightArm_09): 다리와 반대로 교차 스윙 (Y축) + 몸통 벌림 (Z축)
    // Left Arm: -Y 전방, +Y 후방 / Right Arm: +Y 전방, -Y 후방
    // legCycle > 0 일 때 Left Arm 전방(-0.42), Right Arm 후방(-0.42) -> 양팔 동시 대칭 교차!
    const armWalkY = -legCycle * 0.42;
    const leftArmIdleY = -breath * 0.015;
    const rightArmIdleY = breath * 0.015;
    const leftArmY = leftArmIdleY * idleW + armWalkY * w;
    const rightArmY = rightArmIdleY * idleW + armWalkY * w;
    const armClearanceZ = (sway * 0.012) * idleW + (Math.abs(legCycle) * 0.05) * w;
    applyBoneRotation(bones['Left_Arm_017'], 0, leftArmY, armClearanceZ);
    applyBoneRotation(bones['RightArm_09'], 0, rightArmY, armClearanceZ);

    // 2) 전완/팔꿈치 (Left_ForeArm_018, RightForeArm_010): 팔이 앞으로 나올 때 자연스럽게 굽힘
    // Left ForeArm: -Y 전방 굽힘 / Right ForeArm: +Y 전방 굽힘
    const leftForearmWalkY = -0.20 - Math.max(0, legCycle) * 0.25;
    const rightForearmWalkY = 0.20 + Math.max(0, -legCycle) * 0.25;
    const leftForearmY = (-0.05 + breath * 0.01) * idleW + leftForearmWalkY * w;
    const rightForearmY = (0.05 - breath * 0.01) * idleW + rightForearmWalkY * w;
    applyBoneRotation(bones['Left_ForeArm_018'], 0, leftForearmY, 0);
    applyBoneRotation(bones['RightForeArm_010'], 0, rightForearmY, 0);

    // [C. 골반 및 상체: Hips, Spine, Neck, Head]
    // 1) 골반 (Hips_01): 좌우 무게중심 롤(Y), 걷기 비틀림(X), 씩씩한 앞 기울임(Z)
    const hipsWalkX = legCycle * 0.06;
    const hipsWalkY = cosCycle * 0.04;
    const hipsWalkZ = 0.04;
    const hipsIdleY = sway * 0.015;
    const hipsIdleZ = breath * 0.008;
    const hipsX = hipsWalkX * w;
    const hipsY = hipsIdleY * idleW + hipsWalkY * w;
    const hipsZ = hipsIdleZ * idleW + hipsWalkZ * w;
    applyBoneRotation(bones['Hips_01'], hipsX, hipsY, hipsZ);

    // 2) 척추 (Spine_02, Spine1_03, Spine2_04): 골반 비틀림 역보정(X) 및 호흡/전방 기울임(Z)
    const spineWalkX = -legCycle * 0.05;
    const spineWalkZ = 0.06;
    const spineIdleZ = breath * 0.020;
    const spineIdleY = -sway * 0.010;
    const spineX = spineWalkX * w;
    const spineY = spineIdleY * idleW;
    const spineZ = spineIdleZ * idleW + spineWalkZ * w;
    applyBoneRotation(bones['Spine_02'], spineX, spineY, spineZ);
    applyBoneRotation(bones['Spine1_03'], 0, 0, (breath * 0.008) * idleW);
    applyBoneRotation(bones['Spine2_04'], 0, 0, (breath * 0.008) * idleW);

    // 3) 목 및 머리 (Neck_05, Head_06): 시선 수평 유지 및 호흡 보상, 미세한 고개 갸웃
    const neckZ = (-breath * 0.012) * idleW + (-0.04) * w;
    const neckY = (sway * 0.008) * idleW;
    const headX = (Math.cos(idlePhase * 0.4) * 0.02) * idleW;
    const headZ = (-breath * 0.010) * idleW + (Math.abs(cosCycle) * 0.02) * w;
    applyBoneRotation(bones['Neck_05'], 0, neckY, neckZ);
    applyBoneRotation(bones['Head_06'], headX, 0, headZ);

    // [D. 메쉬 그룹 전체 바운스 및 틸트 (귀여운 캐릭터 보행감 보조)]
    const walkBounce = Math.abs(cosCycle) * 0.035;
    const walkTilt = Math.sin(walkPhase) * 0.04;
    const idleBob = breath * 0.008;

    meshRef.current.position.y = idleBob * idleW + walkBounce * w;
    meshRef.current.rotation.z = walkTilt * w;
    meshRef.current.rotation.x = 0;

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
        z: Number(playerRef.current.position.z.toFixed(2)),
        isMoving: isActuallyMoving,
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

      {/* 발바닥 소프트 콘택트 그림자 (바닥 접지감 향상) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
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
