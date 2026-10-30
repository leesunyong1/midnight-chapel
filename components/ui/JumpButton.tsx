"use client";

interface JumpButtonProps {
  onJump: () => void;
  className?: string;
}

/**
 * 모바일 및 터치 환경을 위한 직관적이고 반응성 높은 점프 액션 버튼
 */
export default function JumpButton({
  onJump,
  className = "",
}: JumpButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onJump();
      }}
      className={`group relative flex flex-col items-center justify-center w-16 h-16 rounded-full border border-amber-500/40 bg-stone-950/75 hover:bg-stone-900/90 active:bg-amber-600/30 active:border-amber-400 active:scale-90 transition-all backdrop-blur-md shadow-2xl touch-none select-none ${className}`}
      aria-label="점프 (스페이스바)"
    >
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {/* 점프 화살표 아이콘 */}
        <svg
          className="w-5 h-5 text-amber-300 group-hover:text-amber-200 group-active:translate-y-[-2px] transition-transform duration-100"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.4}
            d="M5 14l7-7 7 7"
          />
        </svg>
        <span className="text-[10px] font-semibold text-amber-200/90 tracking-tight -mt-0.5">
          점프
        </span>
      </div>
    </button>
  );
}
