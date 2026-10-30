'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CandleState, PrayerRecord } from '@/types';
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
import CandleLight from './CandleLight';
import PrayerNoteModal from './PrayerNoteModal';
import PrayerHistoryDrawer from './PrayerHistoryDrawer';

export default function PrivatePrayerExperience() {
  const [candle, setCandle] = useState<CandleState | null>(null);
  const [prayers, setPrayers] = useState<PrayerRecord[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<PrayerRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 토스트 메시지 표시 헬퍼
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // 토스트 자동 사라짐
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 최초 클라이언트 마운트 시 데이터 로딩 (SSR Hydration 불일치 방지)
  useEffect(() => {
    try {
      const initialCandle = getOrCreateDefaultCandle();
      setCandle(initialCandle);

      const savedPrayers = getPrayerRecords();
      setPrayers(savedPrayers);
    } catch (error) {
      console.error('Failed to load prayer data from storage', error);
    }
  }, []);

  // 촛불 점화/소등 토글
  const handleToggleCandle = useCallback(() => {
    if (!candle) return;

    try {
      const updated = toggleCandle(candle.id);
      if (updated) {
        setCandle(updated);
        showToast(
          updated.isLit
            ? '촛불을 밝혔습니다. 마음을 모아 기도하세요.'
            : '촛불을 껐습니다. 주님의 평화가 함께하시기를 바랍니다.'
        );
      }
    } catch (error) {
      console.error('Failed to toggle candle', error);
      showToast('촛불 상태를 변경하는 중 오류가 발생했습니다.');
    }
  }, [candle, showToast]);

  // 기도문 저장 (신규 등록 또는 기존 수정)
  const handleSavePrayer = async (
    title: string,
    content: string,
    id?: string
  ): Promise<boolean> => {
    try {
      if (id) {
        // 기존 기도문 수정
        const updated = updatePrayerRecord(id, { title, content });
        if (updated) {
          setPrayers(getPrayerRecords());
          showToast('기도문이 수정되었습니다.');
          setEditingPrayer(null);
          return true;
        }
      } else {
        // 신규 기도문 등록
        addPrayerRecord({
          title,
          content,
          visibility: 'private',
        });
        setPrayers(getPrayerRecords());
        showToast('기도문이 마음에 새겨져 소중히 보관되었습니다.');
        setEditingPrayer(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save prayer', error);
      showToast('기도문 저장에 실패했습니다.');
      return false;
    }
  };

  // 기도문 삭제
  const handleDeletePrayer = (id: string) => {
    try {
      const success = deletePrayerRecord(id);
      if (success) {
        setPrayers(getPrayerRecords());
        showToast('기도문이 삭제되었습니다.');
      }
    } catch (error) {
      console.error('Failed to delete prayer', error);
      showToast('기도문 삭제 중 오류가 발생했습니다.');
    }
  };

  // 기도문 수정 열기
  const handleOpenEdit = (prayer: PrayerRecord) => {
    setEditingPrayer(prayer);
    setIsHistoryDrawerOpen(false);
    setIsNoteModalOpen(true);
  };

  // 신규 기도문 작성 열기
  const handleOpenCreate = () => {
    setEditingPrayer(null);
    setIsNoteModalOpen(true);
  };

  const isLit = candle?.isLit ?? false;

  return (
    <div className="relative z-10 flex min-h-screen flex-col justify-between px-4 sm:px-6 py-5">
      {/* ========================================================
          A. 상단 네비게이션 영역
          ======================================================== */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto pt-2">
        {/* 메인 페이지로 돌아가기 */}
        <Link
          href="/"
          id="btn-back-home"
          className="inline-flex items-center gap-2 rounded-full border border-stone-800/80 bg-stone-900/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-light text-stone-300 hover:text-stone-100 hover:border-stone-700 transition-all active:scale-95"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>성당 입구</span>
        </Link>

        {/* 중앙: 나의 기도실 안내 */}
        <div className="text-center">
          <span className="block text-[10px] tracking-[0.3em] uppercase text-amber-400/80 font-light">
            Private Chapel
          </span>
          <h1 className="text-sm md:text-base font-extralight text-stone-200 tracking-wider">
            나의 기도실
          </h1>
        </div>

        {/* 우측: 나의 기도문 목록 열기 버튼 */}
        <button
          type="button"
          id="btn-open-history"
          onClick={() => setIsHistoryDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-800/80 bg-stone-900/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-light text-stone-300 hover:text-amber-300 hover:border-amber-500/30 transition-all active:scale-95"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10M6 10h10M6 14h6" />
          </svg>
          <span className="hidden sm:inline">나의 기도문</span>
          {prayers.length > 0 && (
            <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-normal text-amber-300 border border-amber-500/30">
              {prayers.length}
            </span>
          )}
        </button>
      </header>

      {/* ========================================================
          B. 중앙 묵상 및 촛불 영역
          (성당 이미지가 주인공이 되도록 군더더기 없는 배치)
          ======================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto py-8">
        <div className="relative flex flex-col items-center">
          {/* 촛불 컴포넌트 */}
          <CandleLight
            isLit={isLit}
            onToggle={handleToggleCandle}
            message={candle?.message}
            litAt={candle?.litAt}
          />

          {/* 묵상 유도 안내 문구 (촛불 아래 은은한 텍스트) */}
          <div className="mt-6 text-center max-w-sm px-4">
            <p
              className={`text-xs md:text-sm font-extralight tracking-wide transition-colors duration-700 leading-relaxed ${
                isLit ? 'text-stone-200' : 'text-stone-400'
              }`}
            >
              {isLit
                ? '촛불의 빛 속에서 고요히 주님과 대화하세요.'
                : '촛불을 켜고 나만의 침묵 기도를 시작해 보세요.'}
            </p>
          </div>
        </div>
      </main>

      {/* ========================================================
          C. 하단 액션 바
          ======================================================== */}
      <footer className="w-full max-w-lg mx-auto pb-4">
        <div className="glass-card flex items-center justify-around rounded-2xl p-2 sm:p-2.5 shadow-2xl border border-stone-800/80 bg-stone-950/70 backdrop-blur-xl">
          {/* 1. 촛불 밝히기 / 끄기 */}
          <button
            type="button"
            id="btn-toggle-candle"
            onClick={handleToggleCandle}
            className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2.5 rounded-xl text-xs font-light transition-all active:scale-95 ${
              isLit
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-900/60'
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={isLit ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              className={isLit ? 'text-amber-400 animate-pulse' : 'text-stone-400'}
            >
              <path
                d="M12 2c-2 3-4 5-4 8a4 4 0 0 0 8 0c0-3-2-5-4-8Z"
                strokeLinejoin="round"
              />
              <path d="M12 14v8" strokeLinecap="round" />
            </svg>
            <span>{isLit ? '촛불 끄기' : '촛불 밝히기'}</span>
          </button>

          {/* 구분선 */}
          <div className="w-px h-6 bg-stone-800" />

          {/* 2. 기도문 작성 */}
          <button
            type="button"
            id="btn-open-create-prayer"
            onClick={handleOpenCreate}
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2.5 rounded-xl text-xs font-light text-stone-300 hover:text-amber-300 hover:bg-stone-900/60 transition-all active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-stone-400"
            >
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>기도문 작성</span>
          </button>

          {/* 구분선 */}
          <div className="w-px h-6 bg-stone-800" />

          {/* 3. 나의 기도 보기 */}
          <button
            type="button"
            id="btn-view-prayers"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2.5 rounded-xl text-xs font-light text-stone-300 hover:text-amber-300 hover:bg-stone-900/60 transition-all active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-stone-400"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M9 9h6M9 13h4" />
            </svg>
            <span>나의 기도 보기</span>
          </button>
        </div>
      </footer>

      {/* ========================================================
          모달 및 드로어 레이어
          ======================================================== */}
      {/* 기도문 작성/수정 모달 */}
      <PrayerNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingPrayer(null);
        }}
        onSave={handleSavePrayer}
        initialData={editingPrayer}
      />

      {/* 나의 기도 기록 열람 드로어 */}
      <PrayerHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        prayers={prayers}
        onEdit={handleOpenEdit}
        onDelete={handleDeletePrayer}
        onOpenCreate={handleOpenCreate}
      />

      {/* 하단 토스트 알림 */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full border border-amber-500/30 bg-[#0d0f17]/90 backdrop-blur-md px-5 py-2.5 text-xs font-light text-amber-200 shadow-xl animate-fade-in flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
