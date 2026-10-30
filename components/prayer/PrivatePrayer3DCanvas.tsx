'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Link from 'next/link';
import ChibiPlayer from '@/components/character/ChibiPlayer';
import VirtualJoystick from '@/components/ui/VirtualJoystick';
import JumpButton from '@/components/ui/JumpButton';
import ThirdPersonCamera from './ThirdPersonCamera';
import PrivateChapelScene, {
  PRIVATE_CHAPEL_BOUNDS,
  PRIVATE_CHAPEL_COLLIDERS,
} from './PrivateChapelScene';
import PrayerNoteModal from './PrayerNoteModal';
import PrayerHistoryDrawer from './PrayerHistoryDrawer';
import {
  getOrCreateDefaultCandle,
  toggleCandle,
} from '@/lib/storage/candleStorage';
import {
  getPrayerRecords,
  addPrayerRecord,
  updatePrayerRecord,
  deletePrayerRecord,
} from '@/lib/storage/prayerStorage';
import { getCharacterCustomization } from '@/lib/storage/characterStorage';
import { ChibiCustomizationOptions } from '@/components/character/chibiParts';
import { CandleState, PrayerRecord } from '@/types';

const PRIVATE_INITIAL_POS: [number, number, number] = [0, 0, 4.0];

export default function PrivatePrayer3DCanvas() {
  // 모바일 조이스틱 입력 Ref
  const inputRef = useRef({ x: 0, z: 0 });
  // 모바일 점프 입력 Ref
  const jumpRef = useRef(false);

  // 카메라 수평 회전 각도 Ref (플레이어 이동 벡터와 동기화)
  const cameraYawRef = useRef(0);

  // 캐릭터 실시간 위치
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 4.0));
  const [coords, setCoords] = useState({ x: 0, z: 4.0 });
  const [nearAltar, setNearAltar] = useState(false);

  // 모바일/데스크탑 조작 안내 박스 표시 상태 (X 클릭으로 닫기 가능)
  const [showGuide, setShowGuide] = useState(true);

  // 촛불 및 기도문 상태 관리 (기존 스토리지 재사용)
  const [candle, setCandle] = useState<CandleState | null>(null);
  const [prayers, setPrayers] = useState<PrayerRecord[]>([]);
  const [characterCustomization, setCharacterCustomization] = useState<ChibiCustomizationOptions | undefined>(undefined);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<PrayerRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 마운트 시 기존 촛불 및 기도 기록, 캐릭터 커스텀 설정 로드
  useEffect(() => {
    try {
      const initialCandle = getOrCreateDefaultCandle();
      setCandle(initialCandle);
      setPrayers(getPrayerRecords());
      setCharacterCustomization(getCharacterCustomization());
    } catch (err) {
      console.error('Failed to load storage', err);
    }
  }, []);

  // [E] 키로 제단 앞 상호작용 (스페이스바는 점프로 분리)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'e' &&
        nearAltar &&
        !isNoteModalOpen &&
        !isHistoryDrawerOpen
      ) {
        e.preventDefault();
        setIsNoteModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearAltar, isNoteModalOpen, isHistoryDrawerOpen]);

  // 촛불 토글 핸들러
  const handleToggleCandle = useCallback(() => {
    if (!candle) return;
    const updated = toggleCandle(candle.id);
    if (updated) {
      setCandle(updated);
      showToast(
        updated.isLit
          ? '제단의 촛불을 밝혔습니다. 마음을 모아 기도하세요.'
          : '제단의 촛불을 껐습니다.'
      );
    }
  }, [candle, showToast]);

  // 기도문 저장
  const handleSavePrayer = async (
    title: string,
    content: string,
    id?: string
  ): Promise<boolean> => {
    try {
      if (id) {
        updatePrayerRecord(id, { title, content });
        showToast('기도문이 수정되었습니다.');
      } else {
        addPrayerRecord({ title, content, visibility: 'private' });
        showToast('제단 앞에 기도문이 소중히 봉헌되었습니다.');
      }
      setPrayers(getPrayerRecords());
      setEditingPrayer(null);
      return true;
    } catch {
      showToast('기도문 저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 기도문 삭제
  const handleDeletePrayer = (id: string) => {
    deletePrayerRecord(id);
    setPrayers(getPrayerRecords());
    showToast('기도문이 삭제되었습니다.');
  };

  const lastCoordsUpdate = useRef(0);
  const handlePlayerPosChange = useCallback((pos: THREE.Vector3) => {
    playerPosRef.current.copy(pos);
    // 개인 기도대 및 제단 접근 거리 감지 (Z < -2.6)
    setNearAltar(pos.z < -2.6);

    const now = performance.now();
    if (now - lastCoordsUpdate.current > 150) {
      lastCoordsUpdate.current = now;
      setCoords({ x: Number(pos.x.toFixed(1)), z: Number(pos.z.toFixed(1)) });
    }
  }, []);

  const isLit = candle?.isLit ?? true;

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
        camera={{ position: [0, 2.2, 7.2], fov: 48 }}
        className="w-full h-full"
      >
        <color attach="background" args={['#090a0f']} />
        {/* 심야 성당 안개 효과 */}
        <fog attach="fog" args={['#090a0f', 8, 22]} />

        {/* 조명 세팅 */}
        <ambientLight intensity={0.35} color="#1e1b4b" />
        <directionalLight
          position={[3, 8, 3]}
          intensity={1.2}
          color="#fef3c7"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
          shadow-normalBias={0.035}
        />
        {/* 뒤쪽 은은한 달빛 (쿨톤 림라이트) */}
        <directionalLight
          position={[-4, 6, 7]}
          intensity={0.6}
          color="#38bdf8"
        />

        {/* 3D 개인 성당 내부 건축물 (12m × 16m × 7.5m, 촛불 상태 반영) */}
        <PrivateChapelScene isCandleLit={isLit} />

        {/* 3D 치비 플레이어 캐릭터 (슬라이딩 충돌 + 경계 제한 + 점프) */}
        <Suspense fallback={null}>
          <ChibiPlayer
            inputRef={inputRef}
            jumpRef={jumpRef}
            cameraYawRef={cameraYawRef}
            onPositionChange={handlePlayerPosChange}
            bounds={PRIVATE_CHAPEL_BOUNDS}
            colliders={PRIVATE_CHAPEL_COLLIDERS}
            initialPosition={PRIVATE_INITIAL_POS}
            initialRotationY={Math.PI}
            playerRadius={0.35}
            customization={characterCustomization}
          />
        </Suspense>

        {/* 3인칭 추적 & 마우스 360도 회전 / 줌인·줌아웃 카메라 */}
        <ThirdPersonCamera
          playerPosRef={playerPosRef}
          cameraYawRef={cameraYawRef}
          initialDist={3.5}
          minDist={1.2}
          maxDist={7.5}
          targetOffsetY={0.65}
        />
      </Canvas>

      {/* ========================================================
          상단 네비게이션 헤더
          ======================================================== */}
      <header className="absolute top-5 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
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

        {/* 중앙 상단: 타이틀 (성당 사이즈 표기 제거) */}
        <div className="text-center">
          <span className="block text-[10px] tracking-[0.3em] uppercase text-amber-400/80 font-light">
            Midnight Sanctuary
          </span>
          <h1 className="text-sm font-extralight text-stone-200 tracking-wider">
            개인 기도실
          </h1>
        </div>

        {/* 우측 상단: 실시간 좌표 및 나의 기도 기록 서랍 버튼 */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* 우측 상단 실시간 좌표 */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-800/80 bg-stone-950/60 backdrop-blur-md text-[11px] text-stone-300 shadow-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-stone-400 font-mono">
              X: {coords.x}m / Z: {coords.z}m
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-800 bg-stone-900/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-light text-stone-300 hover:text-amber-300 hover:border-amber-500/30 transition-all active:scale-95 shadow-xl"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10M6 10h10M6 14h6" />
            </svg>
            <span className="hidden sm:inline">나의 기도</span>
            {prayers.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-normal text-amber-300 border border-amber-500/30">
                {prayers.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================
          제단 및 기도대 앞 접근 시 나타나는 상호작용 프롬프트 & 버튼
          ======================================================== */}
      {nearAltar && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-fade-in flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-amber-500/40 bg-stone-950/90 backdrop-blur-md text-xs text-amber-100 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-light">
              기도대와 제단 앞에 도착했습니다
            </span>
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(true)}
                className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-all active:scale-95 flex items-center gap-1"
              >
                <span>기도문 작성</span>
                <kbd className="hidden md:inline px-1 py-0.2 rounded bg-stone-900/80 text-[10px] text-amber-200">
                  E
                </kbd>
              </button>
              <button
                type="button"
                onClick={handleToggleCandle}
                className="px-3 py-1 rounded-full bg-stone-800/80 hover:bg-stone-700/80 text-stone-300 border border-stone-700 text-xs transition-all active:scale-95"
              >
                {isLit ? '촛불 끄기' : '촛불 밝히기'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          하단 조작 가이드 & 모바일 액션 (우측 하단)
          ======================================================== */}
      <footer className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2.5 pointer-events-none">
        {/* 모바일 환경 전용 액션 버튼: 기도대 앞 즉시 기도 및 점프 버튼 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {nearAltar && (
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-600/90 hover:bg-amber-500 text-stone-50 text-xs font-medium shadow-2xl border border-amber-400/40 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <span>🙏 기도문 작성하기</span>
            </button>
          )}

          {/* 모바일 터치 점프 버튼 (컴퓨터 데스크탑에서는 스페이스바 사용하므로 숨김) */}
          <JumpButton
            onJump={() => {
              jumpRef.current = true;
            }}
            className="md:hidden"
          />
        </div>

        {/* 조작 간단 설명 박스 (은은한 반투명 오파시티 + X 닫기 지원) */}
        {showGuide ? (
          <div className="rounded-2xl border border-white/10 bg-stone-950/45 backdrop-blur-md px-4 py-3 text-xs text-stone-300 shadow-2xl space-y-2 max-w-xs animate-fade-in pointer-events-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[11px] font-medium text-amber-300/90 flex items-center gap-1.5">
                <span>🕯️</span>
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
              {nearAltar && (
                <p className="flex items-center justify-between text-amber-300 pt-1 border-t border-white/10">
                  <span>기도 봉헌</span>
                  <span>E 키 / 버튼 탭</span>
                </p>
              )}
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

      {/* ========================================================
          기도문 작성 모달 & 나의 기도 기록 드로어
          ======================================================== */}
      <PrayerNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingPrayer(null);
        }}
        onSave={handleSavePrayer}
        initialData={editingPrayer}
      />

      <PrayerHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        prayers={prayers}
        onEdit={(prayer) => {
          setEditingPrayer(prayer);
          setIsHistoryDrawerOpen(false);
          setIsNoteModalOpen(true);
        }}
        onDelete={handleDeletePrayer}
        onOpenCreate={() => {
          setIsHistoryDrawerOpen(false);
          setIsNoteModalOpen(true);
        }}
      />

      {/* 토스트 알림 */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full border border-amber-500/30 bg-[#0d0f17]/90 backdrop-blur-md px-5 py-2.5 text-xs font-light text-amber-200 shadow-2xl animate-fade-in flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
