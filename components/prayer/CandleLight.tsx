'use client';

interface CandleLightProps {
  isLit: boolean;
  onToggle: () => void;
  message?: string;
  litAt?: string;
}

export default function CandleLight({
  isLit,
  onToggle,
  message,
}: CandleLightProps) {
  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* 촛불 주변 부드러운 빛 효과 (점화 시 확산되는 앰비언트 아우라) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-24 md:-inset-36 rounded-full transition-all duration-1000 ease-out ${
          isLit
            ? 'opacity-100 scale-100 animate-candle-glow'
            : 'opacity-0 scale-75'
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.12) 35%, rgba(217, 119, 6, 0.05) 60%, transparent 75%)',
          filter: 'blur(32px)',
        }}
      />

      {/* 추가적인 중앙 집중 핫스팟 빛 (심야 성당 제단 분위기) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-12 w-32 h-32 md:w-44 md:h-44 rounded-full transition-all duration-700 ease-out ${
          isLit ? 'opacity-80 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(254, 240, 138, 0.35) 0%, rgba(245, 158, 11, 0.15) 45%, transparent 70%)',
          filter: 'blur(16px)',
        }}
      />

      {/* 촛불 본체 인터랙티브 영역 (클릭으로 켜고 끄기) */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isLit ? '촛불 끄기' : '촛불 밝히기'}
        aria-pressed={isLit}
        className="group relative flex flex-col items-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#090a0f] rounded-2xl p-4 transition-transform active:scale-95"
      >
        {/* 불꽃 & 심지 영역 */}
        <div className="relative h-20 w-12 flex flex-col items-center justify-end">
          {/* 점화된 불꽃 */}
          <div
            className={`transition-all duration-700 ease-out flex flex-col items-center ${
              isLit
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-50 translate-y-2 pointer-events-none'
            }`}
          >
            {/* 불꽃 외부 광배 (Outer Flame Corona) */}
            <div
              className="absolute -top-3 w-10 h-14 rounded-full animate-flame-flicker pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 80%, rgba(251, 146, 60, 0.5) 0%, rgba(245, 158, 11, 0.25) 50%, transparent 80%)',
                filter: 'blur(4px)',
              }}
            />

            {/* 실제 불꽃 모양 (Teardrop Flame with gradient & flicker) */}
            <div
              className="relative w-5 h-11 rounded-[50%_50%_35%_35%/70%_70%_30%_30%] animate-flame-flicker shadow-[0_0_20px_rgba(245,158,11,0.8)]"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 85%, #ffffff 0%, #fef08a 25%, #f59e0b 65%, #d97706 90%, #b45309 100%)',
              }}
            >
              {/* 불꽃 내부 백색 핫코어 */}
              <div
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-5 rounded-[50%_50%_40%_40%/70%_70%_30%_30%]"
                style={{
                  background:
                    'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(254,249,195,0.9) 70%, transparent 100%)',
                }}
              />
              {/* 불꽃 밑동 푸른 빛 (자연스러운 양초 불꽃 디테일) */}
              <div
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-1.5 rounded-full opacity-60"
                style={{
                  background:
                    'radial-gradient(circle, rgba(56, 189, 248, 0.9) 0%, rgba(14, 165, 233, 0.4) 60%, transparent 100%)',
                }}
              />
            </div>
          </div>

          {/* 그을린 양초 심지 (Wick) */}
          <div className="relative z-10 w-0.5 h-3.5 bg-stone-800 rounded-t mt-[-2px]">
            {/* 심지 끝 붉은 불씨 (소등 직후/점화 시 미세 광채) */}
            <div
              className={`w-1 h-1 -ml-[1px] -mt-[1px] rounded-full transition-opacity duration-500 ${
                isLit ? 'bg-amber-300 opacity-90' : 'bg-stone-600 opacity-30'
              }`}
            />
          </div>
        </div>

        {/* 양초 기둥 몸체 (Pillar Candle Body) */}
        <div className="relative flex flex-col items-center">
          {/* 촛농이 녹아내린 상단 타원 림 */}
          <div
            className="w-12 h-3 rounded-full border border-stone-600/30 -mb-1.5 z-10"
            style={{
              background:
                'linear-gradient(to right, #44403c 0%, #e7e5e4 45%, #d6d3d1 70%, #57534e 100%)',
            }}
          />

          {/* 양초 원통 바디 */}
          <div
            className="w-12 h-24 md:h-28 rounded-b-sm border-x border-b border-stone-700/30 relative overflow-hidden shadow-lg"
            style={{
              background:
                'linear-gradient(to right, #292524 0%, #78716c 20%, #e7e5e4 45%, #d6d3d1 65%, #57534e 85%, #292524 100%)',
            }}
          >
            {/* 촛불 빛이 양초 윗부분을 은은하게 비추는 반사광 */}
            <div
              className={`absolute top-0 inset-x-0 h-10 transition-opacity duration-700 ${
                isLit
                  ? 'opacity-80 bg-gradient-to-b from-amber-200/40 via-amber-400/20 to-transparent'
                  : 'opacity-0'
              }`}
            />
            {/* 측면 촛농 흘러내림 텍스처 효과 */}
            <div className="absolute top-1 left-2 w-1.5 h-8 bg-stone-300/40 rounded-full blur-[0.5px]" />
            <div className="absolute top-2 right-3 w-1 h-12 bg-stone-400/30 rounded-full blur-[0.5px]" />
          </div>

          {/* 앤틱 브론즈 촛대 받침 접시 (Brass Candleholder Base) */}
          <div
            className="w-20 md:w-24 h-4 rounded-full border border-amber-900/50 -mt-1 shadow-2xl relative"
            style={{
              background:
                'radial-gradient(ellipse at 50% 30%, #78350f 0%, #451a03 55%, #1c1917 100%)',
            }}
          >
            {/* 금속 림 하이라이트 */}
            <div className="absolute inset-x-3 top-0.5 h-0.5 rounded-full bg-amber-500/25 blur-[0.5px]" />
          </div>
        </div>

        {/* 인터랙션 힌트 텍스트 */}
        <div className="mt-4 flex flex-col items-center">
          <span
            className={`text-xs tracking-wider transition-colors duration-300 ${
              isLit
                ? 'text-amber-400/90 font-medium'
                : 'text-stone-400 group-hover:text-stone-300'
            }`}
          >
            {isLit ? '타오르는 촛불' : '촛불을 밝혀보세요'}
          </span>
          <span className="text-[11px] text-stone-500 font-light mt-0.5">
            {isLit ? '터치하여 촛불 끄기' : '터치하여 촛불 켜기'}
          </span>
        </div>
      </button>

      {/* 촛불에 담긴 한 줄 묵상 메시지 (있을 경우) */}
      {message && (
        <p className="mt-2 text-xs text-amber-200/70 font-light tracking-wide text-center italic max-w-xs">
          &ldquo;{message}&rdquo;
        </p>
      )}
    </div>
  );
}
