'use client';

import { Suspense, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Link from 'next/link';
import ChibiPlayer, { PlayerDebugInfo } from '@/components/character/ChibiPlayer';
import { ChibiCustomizationOptions } from '@/components/character/chibiParts';
import { getCharacterCustomization } from '@/lib/storage/characterStorage';
import VirtualJoystick from '@/components/ui/VirtualJoystick';
import JumpButton from '@/components/ui/JumpButton';
import ThirdPersonCamera from './ThirdPersonCamera';
import CommunityCathedralScene, {
  COMMUNITY_CATHEDRAL_BOUNDS,
  COMMUNITY_CATHEDRAL_COLLIDERS,
} from './CommunityCathedralScene';
import {
  COMMUNITY_SPAWN_POINTS,
  SpawnPoint,
  getAvailableSpawnPoint,
} from './spawnSystem';

export default function CommunityPrayer3DCanvas() {
  // 모바일 조이스틱 입력 Ref
  const inputRef = useRef({ x: 0, z: 0 });
  // 모바일 점프 입력 Ref
  const jumpRef = useRef(false);

  // 카메라 수평 회전 각도 Ref
  const cameraYawRef = useRef(0);

  // 60개 스폰 지점 중 초기 스폰 지점 선택 (중앙 기본 지점: id=22 -> x=0, z=18.5)
  const [currentSpawn, setCurrentSpawn] = useState<SpawnPoint>(() =>
    getAvailableSpawnPoint(new Set(), 22)
  );

  // 캐릭터 실시간 위치
  const playerPosRef = useRef(new THREE.Vector3(currentSpawn.x, 0, currentSpawn.z));
  const [playerInfo, setPlayerInfo] = useState<PlayerDebugInfo>({
    x: currentSpawn.x,
    z: currentSpawn.z,
    inputX: 0,
    inputZ: 0,
    isMoving: false,
    speed: 0,
  });

  // 모바일/데스크탑 조작 안내 박스 표시 상태 (사용자가 X를 눌러 닫을 수 있음)
  const [showGuide, setShowGuide] = useState(true);

  // 브라우저에 저장된 캐릭터 외형 설정 로드
  const [characterCustomization, setCharacterCustomization] = useState<ChibiCustomizationOptions | undefined>(undefined);

  useEffect(() => {
    setCharacterCustomization(getCharacterCustomization());
  }, []);

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 플레이어 위치 갱신 콜백
  const handlePlayerPosChange = useCallback((pos: THREE.Vector3) => {
    playerPosRef.current.copy(pos);
  }, []);

  // 디버그 정보 갱신 (150ms 쓰로틀링)
  const lastDebugUpdateRef = useRef(0);
  const handleDebugUpdate = useCallback((info: PlayerDebugInfo) => {
    const now = performance.now();
    if (now - lastDebugUpdateRef.current > 150) {
      lastDebugUpdateRef.current = now;
      setPlayerInfo(info);
    }
  }, []);

  // 안정적인 스폰 좌표 배열 인스턴스 (메모이제이션)
  const initialPos = useMemo<[number, number, number]>(
    () => [currentSpawn.x, 0, currentSpawn.z],
    [currentSpawn.x, currentSpawn.z]
  );

  // 현재 플레이어가 위치한 구역 판별
  const currentZone = useMemo(() => {
    const { x, z } = playerInfo;
    if (z <= -16.0) return '대성당 성단 & 제단 (Sanctuary)';
    if (z >= 14.0) return '입구 광장 (Narthex / Spawn Plaza)';
    if (Math.abs(x) <= 2.8) return '중앙 통로 (5.6m Central Nave Aisle)';
    if (x < -7.2) return '서측 회랑 (West Side Aisle)';
    if (x > 7.2) return '동측 회랑 (East Side Aisle)';
    return '장의자 구역 (Pews Area)';
  }, [playerInfo]);

  return (
    <div className="relative w-screen h-screen bg-[#090a0f] overflow-hidden select-none">
      {/* Three.js R3F 3D Canvas */}
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [currentSpawn.x, 3.5, currentSpawn.z + 5.5], fov: 50 }}
        className="w-full h-full"
      >
        <color attach="background" args={['#090a0f']} />
        {/* 웅장한 대성당 심야 원근 안개 */}
        <fog attach="fog" args={['#090a0f', 18, 55]} />

        {/* 조명 세팅 */}
        <ambientLight intensity={0.4} color="#1e293b" />
        <directionalLight
          position={[10, 24, 10]}
          intensity={1.4}
          color="#fef3c7"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={60}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0001}
          shadow-normalBias={0.035}
        />
        {/* 고측창(Clerestory) 달빛 조명 */}
        <directionalLight
          position={[-12, 18, 15]}
          intensity={0.65}
          color="#38bdf8"
        />

        {/* 3D 공동 대성당 내부 건축물 */}
        <CommunityCathedralScene
          showSpawnMarkers={false}
          selectedSpawnId={currentSpawn.id}
        />

        {/* 3D 치비 플레이어 캐릭터 (스폰 시스템 연동 + 슬라이딩 충돌 + 점프) */}
        <Suspense fallback={null}>
          <ChibiPlayer
            key={`player-spawn-${currentSpawn.id}`}
            inputRef={inputRef}
            jumpRef={jumpRef}
            cameraYawRef={cameraYawRef}
            onPositionChange={handlePlayerPosChange}
            onDebugUpdate={handleDebugUpdate}
            bounds={COMMUNITY_CATHEDRAL_BOUNDS}
            colliders={COMMUNITY_CATHEDRAL_COLLIDERS}
            initialPosition={initialPos}
            initialRotationY={Math.PI}
            playerRadius={0.35}
            customization={characterCustomization}
          />
        </Suspense>

        {/* 3인칭 추적 카메라 (대형 공간에 맞춘 5m 기본 줌, 최대 14m) */}
        <ThirdPersonCamera
          key={`cam-spawn-${currentSpawn.id}`}
          playerPosRef={playerPosRef}
          cameraYawRef={cameraYawRef}
          initialDist={5.2}
          minDist={1.5}
          maxDist={14.0}
          targetOffsetY={0.7}
        />
      </Canvas>

      {/* ========================================================
          상단 네비게이션 헤더
          ======================================================== */}
      <header className="absolute top-5 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            id="btn-back-home"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/80 backdrop-blur-md px-4 py-2 text-xs font-light text-stone-300 hover:text-white transition-all active:scale-95 shadow-xl"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>성당 입구</span>
          </Link>
          <Link
            href="/private-prayer"
            className="pointer-events-auto hidden sm:inline-flex items-center gap-1.5 rounded-full border border-stone-800 bg-stone-900/70 backdrop-blur-md px-3 py-1.5 text-xs font-light text-amber-300/80 hover:text-amber-200 transition-all active:scale-95 shadow-lg"
          >
            <span>🕯️ 개인 기도실</span>
          </Link>
        </div>

        {/* 중앙 상단 타이틀 (성당 사이즈 표기 제거) */}
        <div className="text-center">
          <span className="block text-[10px] tracking-[0.3em] uppercase text-sky-400/80 font-light">
            Grand Cathedral
          </span>
          <h1 className="text-sm font-extralight text-stone-200 tracking-wider">
            공동 기도실
          </h1>
        </div>

        {/* 우측 상단: 실시간 좌표 및 현재 구역 뱃지 */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-stone-800/80 bg-stone-950/60 backdrop-blur-md text-[11px] text-stone-300 shadow-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-stone-400 font-mono">
              X: {playerInfo.x}m / Z: {playerInfo.z}m
            </span>
            <span className="text-stone-600 hidden sm:inline">|</span>
            <span className="text-sky-300/90 font-light hidden sm:inline">{currentZone}</span>
          </div>
        </div>
      </header>

      {/* ========================================================
          하단 조작부: 모바일 가상 조이스틱 (좌측 하단)
          ======================================================== */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-auto">
        <VirtualJoystick
          onMove={(vec) => {
            inputRef.current = vec;
          }}
        />
      </div>

      {/* ========================================================
          하단 조작 가이드 & 액션 (우측 하단: 은은한 반투명 + X 닫기 지원)
          ======================================================== */}
      <footer className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2.5 pointer-events-none">
        {/* 점프 액션 버튼 (컴퓨터 데스크탑 환경에서는 스페이스바 사용하므로 숨김) */}
        <div className="pointer-events-auto md:hidden">
          <JumpButton onJump={() => { jumpRef.current = true; }} />
        </div>

        {/* 조작 간단 설명 박스 (은은한 오파시티 백그라운드 + X 닫기 버튼) */}
        {showGuide ? (
          <div className="rounded-2xl border border-white/10 bg-stone-950/45 backdrop-blur-md px-4 py-3 text-xs text-stone-300 shadow-2xl space-y-2 max-w-xs animate-fade-in pointer-events-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[11px] font-medium text-sky-300 flex items-center gap-1.5">
                <span>🏛️</span>
                <span>조작 안내</span>
              </span>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                aria-label="조작 안내 닫기"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-[11px] text-stone-300/90">
              <p className="flex items-center justify-between">
                <span className="text-stone-400">이동</span>
                <span className="font-mono text-stone-200">WASD / 조이스틱</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-stone-400">점프</span>
                <span className="font-mono text-stone-200">Space / 점프 버튼</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-stone-400">시점</span>
                <span>화면 드래그 (360°)</span>
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="pointer-events-auto px-3 py-1.5 rounded-full border border-white/10 bg-stone-950/45 backdrop-blur-md text-[11px] text-stone-400 hover:text-stone-200 transition-all shadow-lg active:scale-95"
            title="조작 안내 열기"
          >
            💡 조작 안내
          </button>
        )}
      </footer>

      {/* 토스트 알림 */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full border border-sky-500/30 bg-[#0d0f17]/90 backdrop-blur-md px-5 py-2.5 text-xs font-light text-sky-200 shadow-2xl animate-fade-in flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
