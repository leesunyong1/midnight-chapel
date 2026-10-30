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

  const playerRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const walkTimer = useRef(0);
  const idleTimer = useRef(0);
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
    const isMoving = inputLen > 0.05;

    if (isMoving) {
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

      // 6. 귀여운 절차적 걷기 애니메이션 (바운스 + 통통 튀는 롤)
      walkTimer.current += dt * 15;
      const bounce = Math.abs(Math.sin(walkTimer.current)) * 0.06;
      const tilt = Math.sin(walkTimer.current) * 0.08;

      meshRef.current.position.y = bounce;
      meshRef.current.rotation.z = tilt;
      meshRef.current.rotation.x = 0.05; // 앞으로 살짝 기울여 씩씩하게 걷기
    } else {
      // 정지 상태 (Idle) — 자연스러운 숨쉬기 호흡
      idleTimer.current += dt * 2.5;
      const idleBob = Math.sin(idleTimer.current) * 0.012;

      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        idleBob,
        dt * 8
      );
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        0,
        dt * 8
      );
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        0,
        dt * 8
      );
    }

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
          isMoving,
          speed: isMoving ? MOVE_SPEED : 0,
        });
      }
    }

    if (typeof window !== 'undefined') {
      (window as any).__PLAYER_STATE__ = {
        x: Number(playerRef.current.position.x.toFixed(2)),
        z: Number(playerRef.current.position.z.toFixed(2)),
        isMoving,
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
