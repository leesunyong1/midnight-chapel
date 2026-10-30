'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface ThirdPersonCameraProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  cameraYawRef: React.MutableRefObject<number>;
  initialDist?: number;
  minDist?: number;
  maxDist?: number;
  targetOffsetY?: number;
  initialPitch?: number;
}

export default function ThirdPersonCamera({
  playerPosRef,
  cameraYawRef,
  initialDist = 3.5,
  minDist = 1.2,
  maxDist = 9.0,
  targetOffsetY = 0.65,
  initialPitch = 0.35,
}: ThirdPersonCameraProps) {
  const { gl } = useThree();

  // 구면 좌표계 카메라 변수
  const currentDist = useRef(initialDist);
  const targetDist = useRef(initialDist);

  // yaw: 수평 회전각 (라디안)
  const currentYaw = useRef(0);
  const targetYaw = useRef(0);

  // pitch: 수직 고도각 (0.06 ~ 1.35 라디안)
  const currentPitch = useRef(initialPitch);
  const targetPitch = useRef(initialPitch);

  const currentCameraPos = useRef(new THREE.Vector3(0, 2, 5));
  const currentLookAt = useRef(new THREE.Vector3(0, targetOffsetY, 0));

  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    // 포인터 추적 맵 (마우스 및 모바일 멀티터치 핀치 줌 지원)
    const activePointers = new Map<number, { x: number; y: number }>();
    let prevX = 0;
    let prevY = 0;
    let prevTouchDist = 0;

    const handlePointerDown = (e: PointerEvent) => {
      // 대화상자나 버튼 등 UI 요소 클릭 시 카메라 드래그 무시
      if (
        (e.target as HTMLElement)?.closest(
          'button, input, textarea, a, #virtual-joystick-base, [role="dialog"]'
        )
      ) {
        return;
      }

      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        prevX = e.clientX;
        prevY = e.clientY;
        dom.style.cursor = 'grabbing';
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        prevTouchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // 1개 포인터 (마우스 좌/우클릭 드래그 or 모바일 한 손가락 드래그): 카메라 회전
      if (activePointers.size === 1) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        targetYaw.current -= dx * 0.005;
        targetPitch.current += dy * 0.004;
        targetPitch.current = Math.max(0.06, Math.min(1.35, targetPitch.current));
      }
      // 2개 포인터 (모바일 핀치 줌): 줌인 / 줌아웃
      else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const diff = dist - prevTouchDist;
        prevTouchDist = dist;
        targetDist.current = Math.max(
          minDist,
          Math.min(maxDist, targetDist.current - diff * 0.015)
        );
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size === 0) {
        dom.style.cursor = 'grab';
      } else if (activePointers.size === 1) {
        const remaining = Array.from(activePointers.values())[0];
        prevX = remaining.x;
        prevY = remaining.y;
      }
    };

    // 마우스 휠 스크롤 줌인/줌아웃
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.003;
      targetDist.current = Math.max(
        minDist,
        Math.min(maxDist, targetDist.current + zoomDelta)
      );
    };

    // 마우스 우클릭 드래그 시 브라우저 컨텍스트 메뉴 방지
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('contextmenu', handleContextMenu);

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl, minDist, maxDist]);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    const p = playerPosRef.current;

    // 부드러운 각도 및 거리 보간
    currentYaw.current = THREE.MathUtils.lerp(
      currentYaw.current,
      targetYaw.current,
      Math.min(dt * 12, 1)
    );
    currentPitch.current = THREE.MathUtils.lerp(
      currentPitch.current,
      targetPitch.current,
      Math.min(dt * 12, 1)
    );
    currentDist.current = THREE.MathUtils.lerp(
      currentDist.current,
      targetDist.current,
      Math.min(dt * 10, 1)
    );

    // 플레이어 이동 벡터 변환을 위한 카메라 Yaw 각도 갱신
    cameraYawRef.current = currentYaw.current;

    // 카메라 시선 타겟 (캐릭터 상체)
    const targetLookAt = new THREE.Vector3(p.x, p.y + targetOffsetY, p.z);
    currentLookAt.current.lerp(targetLookAt, Math.min(dt * 12, 1));

    // 구면 좌표계 -> 3D 직교 좌표계 계산
    const dist = currentDist.current;
    const yaw = currentYaw.current;
    const pitch = currentPitch.current;

    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    const desiredX = currentLookAt.current.x + dist * sinYaw * cosPitch;
    const desiredY = currentLookAt.current.y + dist * sinPitch;
    const desiredZ = currentLookAt.current.z + dist * cosYaw * cosPitch;

    currentCameraPos.current.set(desiredX, desiredY, desiredZ);
    camera.position.copy(currentCameraPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

