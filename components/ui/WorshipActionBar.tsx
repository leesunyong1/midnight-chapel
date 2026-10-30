'use client';

import React, { useState } from 'react';
import { CharacterActionState, isSittingState, isKneelingState, isPrayingState } from '@/lib/animation/actionTypes';
import { SeatTarget } from '@/lib/animation/seatSystem';

export interface WorshipActionBarProps {
  currentAction: CharacterActionState;
  nearestSeat: SeatTarget | null;
  onTriggerAction: (action: CharacterActionState, seat?: SeatTarget) => void;
  className?: string;
}

export default function WorshipActionBar({
  currentAction,
  nearestSeat,
  onTriggerAction,
  className = '',
}: WorshipActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const sitting = isSittingState(currentAction);
  const kneeling = isKneelingState(currentAction);
  const praying = isPrayingState(currentAction);

  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-3 px-3 select-none ${className}`}>
      {/* ========================================================
          1. 맥락형 상호작용 알림/버튼 (Context Interaction Pill)
          ======================================================== */}
      {/* A. 의자에 앉아있을 때의 퀵 버튼 */}
      {sitting && (
        <div className="pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => onTriggerAction(praying ? 'sitting_idle' : 'sitting_pray')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md text-xs font-medium transition-all active:scale-95 ${
              praying
                ? 'bg-amber-500/25 border-amber-400/50 text-amber-200 hover:bg-amber-500/35'
                : 'bg-stone-900/85 border-stone-700/80 text-stone-200 hover:bg-stone-800'
            }`}
          >
            <span className="text-base">{praying ? '✋' : '🙏'}</span>
            <span>{praying ? '기도 마치기' : '앉아서 기도'}</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-black/40 text-stone-400 rounded">
              Q
            </kbd>
          </button>

          <button
            onClick={() => onTriggerAction('standing_up')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-stone-700/80 bg-stone-900/85 text-stone-200 hover:bg-stone-800 shadow-lg backdrop-blur-md text-xs font-medium transition-all active:scale-95"
          >
            <span className="text-base">🚶</span>
            <span>일어서기</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-black/40 text-stone-400 rounded">
              E
            </kbd>
          </button>
        </div>
      )}

      {/* B. 무릎 꿇고 있을 때의 퀵 버튼 */}
      {kneeling && (
        <div className="pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => onTriggerAction(praying ? 'kneeling_idle' : 'kneeling_pray')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md text-xs font-medium transition-all active:scale-95 ${
              praying
                ? 'bg-amber-500/25 border-amber-400/50 text-amber-200 hover:bg-amber-500/35'
                : 'bg-stone-900/85 border-stone-700/80 text-stone-200 hover:bg-stone-800'
            }`}
          >
            <span className="text-base">{praying ? '✋' : '🛐'}</span>
            <span>{praying ? '기도 마치기' : '무릎 기도'}</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-black/40 text-stone-400 rounded">
              Q
            </kbd>
          </button>

          <button
            onClick={() => onTriggerAction('standing_from_kneeling')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-stone-700/80 bg-stone-900/85 text-stone-200 hover:bg-stone-800 shadow-lg backdrop-blur-md text-xs font-medium transition-all active:scale-95"
          >
            <span className="text-base">🚶</span>
            <span>일어서기</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-black/40 text-stone-400 rounded">
              E
            </kbd>
          </button>
        </div>
      )}

      {/* C. 서서 기도 중일 때 */}
      {currentAction === 'standing_pray' && (
        <div className="pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => onTriggerAction('idle')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/50 bg-amber-500/25 text-amber-200 shadow-lg backdrop-blur-md text-xs font-medium transition-all active:scale-95"
          >
            <span className="text-base">✋</span>
            <span>기도 마치기</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-black/40 text-stone-400 rounded">
              1 / E
            </kbd>
          </button>
        </div>
      )}

      {/* D. 서 있는 상태에서 가까운 의자나 기도대가 있을 때 (상호작용 버튼) */}
      {!sitting && !kneeling && currentAction !== 'standing_pray' && nearestSeat && (
        <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => {
              if (nearestSeat.type === 'pew') {
                onTriggerAction('sitting_down', nearestSeat);
              } else {
                onTriggerAction('kneeling_down', nearestSeat);
              }
            }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-amber-500/40 bg-stone-950/90 text-amber-200 shadow-xl backdrop-blur-md hover:bg-stone-900 transition-all active:scale-95"
          >
            <span className="text-base">{nearestSeat.type === 'pew' ? '🪑' : '🛐'}</span>
            <span className="text-xs font-medium">
              {nearestSeat.type === 'pew' ? '의자에 앉기' : '무릎 꿇기'}
            </span>
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              ({nearestSeat.label})
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
              E
            </kbd>
          </button>
        </div>
      )}

      {/* ========================================================
          2. 하단 예배 행동 도크 (Worship Action Bar)
          ======================================================== */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-2xl border border-stone-800/80 bg-stone-950/90 shadow-2xl backdrop-blur-xl">
          {/* 1. 서서 기도 */}
          <button
            onClick={() => {
              if (currentAction === 'standing_pray') {
                onTriggerAction('idle');
              } else {
                onTriggerAction('standing_pray');
              }
            }}
            className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              currentAction === 'standing_pray'
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 shadow-md'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/70 border border-transparent'
            }`}
            title="서서 기도하기 (단축키 1)"
          >
            <span className="text-base leading-none">🕊️</span>
            <span className="text-[11px] sm:text-xs">서서 기도</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] bg-black/40 text-stone-400 rounded">
              1
            </kbd>
          </button>

          {/* 2. 무릎 기도 */}
          <button
            onClick={() => {
              if (kneeling) {
                onTriggerAction(praying ? 'kneeling_idle' : 'kneeling_pray');
              } else {
                onTriggerAction('kneeling_down');
              }
            }}
            className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              kneeling
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 shadow-md'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/70 border border-transparent'
            }`}
            title="무릎 꿇고 기도하기 (단축키 2)"
          >
            <span className="text-base leading-none">🛐</span>
            <span className="text-[11px] sm:text-xs">무릎 기도</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] bg-black/40 text-stone-400 rounded">
              2
            </kbd>
          </button>

          {/* 3. 의자 앉기 / 일어서기 */}
          <button
            onClick={() => {
              if (sitting) {
                onTriggerAction('standing_up');
              } else if (nearestSeat && nearestSeat.type === 'pew') {
                onTriggerAction('sitting_down', nearestSeat);
              } else {
                // 가까운 의자가 없으면 안내 토스트 또는 가장 가까운 빈 의자 탐색 유도
                window.dispatchEvent(
                  new CustomEvent('app-toast', {
                    detail: { message: '가까운 장의자(Pew) 앞으로 다가가서 앉아보세요.' },
                  })
                );
              }
            }}
            className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              sitting
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 shadow-md'
                : nearestSeat && nearestSeat.type === 'pew'
                ? 'text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 animate-pulse'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/70 border border-transparent'
            }`}
            title="의자에 앉기 / 일어서기 (단축키 E)"
          >
            <span className="text-base leading-none">{sitting ? '🚶' : '🪑'}</span>
            <span className="text-[11px] sm:text-xs">{sitting ? '일어서기' : '의자 앉기'}</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] bg-black/40 text-stone-400 rounded">
              E
            </kbd>
          </button>

          {/* 구분 세로선 */}
          <div className="h-5 w-[1px] bg-stone-800 hidden sm:block" />

          {/* 4. 손 흔들기 인사 (Wave) */}
          <button
            onClick={() => onTriggerAction('wave')}
            disabled={sitting || kneeling}
            className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              currentAction === 'wave'
                ? 'bg-sky-500/30 text-sky-200 border border-sky-400/60 shadow-md'
                : sitting || kneeling
                ? 'opacity-40 cursor-not-allowed text-stone-500'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/70 border border-transparent'
            }`}
            title="손 흔들어 인사 (단축키 3)"
          >
            <span className="text-base leading-none">🙋</span>
            <span className="text-[11px] sm:text-xs">손 인사</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] bg-black/40 text-stone-400 rounded">
              3
            </kbd>
          </button>

          {/* 5. 정중한 인사 (Bow) */}
          <button
            onClick={() => onTriggerAction('bow')}
            disabled={sitting || kneeling}
            className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              currentAction === 'bow'
                ? 'bg-sky-500/30 text-sky-200 border border-sky-400/60 shadow-md'
                : sitting || kneeling
                ? 'opacity-40 cursor-not-allowed text-stone-500'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/70 border border-transparent'
            }`}
            title="공손히 허리 숙여 인사 (단축키 4)"
          >
            <span className="text-base leading-none">🙇</span>
            <span className="text-[11px] sm:text-xs">경배 인사</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] bg-black/40 text-stone-400 rounded">
              4
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
