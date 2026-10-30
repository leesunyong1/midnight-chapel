'use client';

import { useState, useEffect, useRef } from 'react';

interface PrayerNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string, id?: string) => Promise<boolean> | boolean;
  initialData?: {
    id?: string;
    title: string;
    content: string;
  } | null;
}

export default function PrayerNoteModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: PrayerNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // 모달이 열리거나 initialData 변경 시 초기화
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setContent(initialData?.content || '');
      setError(null);
      setIsSubmitting(false);

      // 모달 열릴 때 제목 입력창에 자동 포커스
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  // ESC 키로 모달 닫기
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError('기도 제목을 입력해 주세요.');
      return;
    }

    if (!trimmedContent) {
      setError('기도 내용을 입력해 주세요.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const success = await onSave(trimmedTitle, trimmedContent, initialData?.id);
      if (success !== false) {
        onClose();
      }
    } catch (err) {
      setError('기도문을 저장하는 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = Boolean(initialData?.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prayer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
    >
      {/* 딤 배경 (클릭 시 닫기) */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 모달 창 본체 */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0d0f17]/95 p-6 md:p-8 shadow-2xl z-10">
        {/* 상단 은은한 앰버 하이라이트 라인 */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="기도문 작성창 닫기"
          className="absolute top-5 right-5 text-stone-500 hover:text-stone-300 transition-colors p-1 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
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

        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 2v20M5 8h14" strokeLinecap="round" />
            </svg>
            <span className="text-xs tracking-widest uppercase font-light">
              Personal Prayer
            </span>
          </div>
          <h2
            id="prayer-modal-title"
            className="text-xl md:text-2xl font-extralight text-stone-100 tracking-wide"
          >
            {isEditMode ? '기도문 수정하기' : '마음을 담아 기도하세요'}
          </h2>
          <p className="mt-1.5 text-xs text-stone-400 font-light leading-relaxed">
            주님 앞에 온전히 내어놓는 진실한 마음의 고백입니다.
            <br />
            작성하신 기도는 오직 이 기기에 소중히 보관됩니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300"
          >
            {error}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="prayer-title"
              className="block text-xs text-stone-300 font-light mb-1.5"
            >
              기도 제목
            </label>
            <input
              ref={titleInputRef}
              id="prayer-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 가족의 평화와 감사의 기도"
              maxLength={60}
              className="w-full rounded-xl border border-stone-800 bg-stone-900/80 px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-light"
            />
          </div>

          <div>
            <label
              htmlFor="prayer-content"
              className="block text-xs text-stone-300 font-light mb-1.5"
            >
              기도 내용
            </label>
            <textarea
              id="prayer-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="마음속 깊은 생각과 간구를 자유롭게 적어보세요..."
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-stone-800 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-light leading-relaxed"
            />
            <div className="mt-1 flex justify-end">
              <span className="text-[11px] text-stone-600">
                {content.length}/2000자
              </span>
            </div>
          </div>

          {/* 버튼 액션 */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-stone-800 px-4 py-2 text-xs font-light text-stone-400 hover:text-stone-200 hover:border-stone-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-400"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 px-5 py-2 text-xs font-medium text-stone-50 shadow-md shadow-amber-900/20 transition-all hover:shadow-amber-600/20 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {isSubmitting ? (
                <span>봉헌 중...</span>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
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
                  <span>{isEditMode ? '수정 완료' : '기도문 봉헌하기'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
