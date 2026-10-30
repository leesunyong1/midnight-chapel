'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; z: number }) => void;
}

const JOYSTICK_RADIUS = 48; // 최대 드래그 반경 (px)

export default function VirtualJoystick({ onMove }: VirtualJoystickProps) {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > JOYSTICK_RADIUS) {
        dx = (dx / dist) * JOYSTICK_RADIUS;
        dy = (dy / dist) * JOYSTICK_RADIUS;
      }

      setKnobPos({ x: dx, y: dy });

      // 3D 공간 좌표계로 변환:
      // 화면 오른쪽(+X) -> 3D X=+1
      // 화면 위쪽(-Y) -> 3D Z=-1 (앞으로)
      // 화면 아래쪽(+Y) -> 3D Z=+1 (뒤로)
      const normX = dx / JOYSTICK_RADIUS;
      const normZ = dy / JOYSTICK_RADIUS;

      onMove({ x: normX, z: normZ });
    },
    [onMove]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    // 이미 다른 손가락으로 조이스틱을 조작 중이면 무시 (멀티터치 보호)
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
    setIsActive(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activePointerId.current === e.pointerId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      activePointerId.current = null;
      setIsActive(false);
      setKnobPos({ x: 0, y: 0 });
      onMove({ x: 0, z: 0 });
    }
  };

  // 윈도우 포인터 업 대비 (모바일 점프 버튼 터치 해제 시 조이스틱이 초기화되는 버그 방지)
  useEffect(() => {
    const handleGlobalUp = (e: PointerEvent) => {
      if (activePointerId.current !== null && e.pointerId === activePointerId.current) {
        activePointerId.current = null;
        setIsActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove({ x: 0, z: 0 });
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, [onMove]);

  return (
    <div className="relative flex flex-col items-center select-none touch-none">
      {/* 조이스틱 원형 베이스 */}
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-28 h-28 rounded-full border border-stone-700/80 bg-stone-950/60 backdrop-blur-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors shadow-2xl ${
          isActive ? 'border-amber-500/50 bg-stone-950/80' : ''
        }`}
      >
        {/* 방향 가이드 십자선 */}
        <div className="absolute w-full h-[1px] bg-stone-800/40 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-stone-800/40 pointer-events-none" />

        {/* 조이스틱 조작 노브 (Thumb Stick) */}
        <div
          className={`w-12 h-12 rounded-full border shadow-lg transition-transform pointer-events-none flex items-center justify-center ${
            isActive
              ? 'bg-amber-500/90 border-amber-300 scale-105 shadow-amber-500/30'
              : 'bg-stone-800/90 border-stone-600'
          }`}
          style={{
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          }}
        >
          {/* 노브 중앙 점 */}
          <div
            className={`w-3 h-3 rounded-full ${
              isActive ? 'bg-stone-950' : 'bg-stone-400'
            }`}
          />
        </div>
      </div>

      <span className="mt-2 text-[10px] text-stone-500 font-light tracking-wide pointer-events-none">
        터치 드래그 이동
      </span>
    </div>
  );
}
