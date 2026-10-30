'use client';

import { useEffect } from 'react';
import { PrayerRecord } from '@/types';

interface PrayerHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prayers: PrayerRecord[];
  onEdit: (prayer: PrayerRecord) => void;
  onDelete: (id: string) => void;
  onOpenCreate: () => void;
}

export default function PrayerHistoryDrawer({
  isOpen,
  onClose,
  prayers,
  onEdit,
  onDelete,
  onOpenCreate,
}: PrayerHistoryDrawerProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    const confirmed = window.confirm(
      `"${title}" 기도문을 정말 삭제하시겠습니까?\n삭제된 기도문은 복구할 수 없습니다.`
    );
    if (confirmed) {
      onDelete(id);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-drawer-title"
      className="fixed inset-0 z-50 flex justify-end animate-fade-in"
    >
      {/* 딤 배경 */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 우측 슬라이드 패널 */}
      <div className="relative w-full max-w-md h-full bg-[#0d0f17]/95 border-l border-amber-500/20 p-6 md:p-8 flex flex-col shadow-2xl z-10 overflow-hidden">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800/80">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2v20M5 8h14" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] tracking-widest uppercase font-light">
                Prayer Journal
              </span>
            </div>
            <h2
              id="history-drawer-title"
              className="text-lg md:text-xl font-extralight text-stone-100 tracking-wide"
            >
              나의 기도 기록
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="기도 기록 닫기"
            className="text-stone-500 hover:text-stone-300 transition-colors p-1.5 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 상단 통계 / 설명 */}
        <div className="py-3 flex items-center justify-between text-xs text-stone-400 font-light">
          <span>총 {prayers.length}개의 기도</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreate();
            }}
            className="text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-1 text-xs"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>새 기도 작성</span>
          </button>
        </div>

        {/* 기도 목록 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-6 mt-2">
          {prayers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <div className="w-12 h-12 rounded-full border border-stone-800 bg-stone-900/40 flex items-center justify-center mb-3 text-stone-600">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M12 2c-2 3-4 5-4 8a4 4 0 0 0 8 0c0-3-2-5-4-8Z"
                    strokeLinejoin="round"
                  />
                  <path d="M12 14v8" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-light text-stone-400 mb-1">
                아직 저장된 기도문이 없습니다
              </p>
              <p className="text-xs font-light text-stone-500 max-w-xs mb-5">
                고요한 촛불 앞에서 당신의 마음을 주님께 내어놓아 보세요.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreate();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-light text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                <span>첫 번째 기도문 작성하기</span>
              </button>
            </div>
          ) : (
            prayers.map((prayer) => (
              <div
                key={prayer.id}
                className="group relative rounded-xl border border-stone-800/80 bg-stone-900/50 p-4 hover:border-amber-500/30 hover:bg-stone-900/80 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="text-sm font-normal text-stone-200 tracking-wide line-clamp-1">
                    {prayer.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEdit(prayer)}
                      title="기도문 수정"
                      className="p-1 text-stone-400 hover:text-amber-400 transition-colors rounded"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(prayer.id, prayer.title)}
                      title="기도문 삭제"
                      className="p-1 text-stone-500 hover:text-red-400 transition-colors rounded"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-400 font-light leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {prayer.content}
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 font-light border-t border-stone-800/40 pt-2">
                  <span>{formatDate(prayer.createdAt)}</span>
                  {prayer.updatedAt && prayer.updatedAt !== prayer.createdAt && (
                    <span className="text-stone-600">(수정됨)</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
