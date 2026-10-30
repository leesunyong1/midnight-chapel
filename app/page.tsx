import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#090a0f]">
      {/* 배경 이미지 (고딕 성당) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/cathedral-landing.jpg"
          alt="고딕 성당 내부"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          quality={90}
        />
        {/* 그라디언트 오버레이 — 하단으로 갈수록 짙은 어둠 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090a0f]/30 via-[#090a0f]/50 to-[#090a0f]/95" />
        {/* 추가 비네트(Vignette) 효과 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#090a0f_100%)]" />
      </div>

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* 상단 십자가 아이콘 */}
        <div className="animate-fade-in mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full border border-amber-500/20 bg-amber-500/5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-amber-400"
            >
              <path d="M12 2v20M5 8h14" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* 메인 타이틀 */}
        <h1 className="animate-fade-in text-center">
          <span className="block text-sm md:text-base tracking-[0.35em] text-amber-400/80 uppercase font-light mb-3">
            Midnight Chapel
          </span>
          <span className="block text-3xl md:text-5xl lg:text-6xl font-extralight text-stone-50 tracking-wide leading-tight">
            심야 성당
          </span>
        </h1>

        {/* 서브 타이틀 */}
        <p className="animate-fade-in-delay-1 mt-5 text-center text-sm md:text-base text-stone-400 font-light leading-relaxed max-w-md tracking-wide">
          고요한 촛불 아래, 당신만의 기도를 드릴 수 있는
          <br className="hidden md:block" />
          온라인 기도 공간입니다
        </p>

        {/* 구분선 */}
        <div className="animate-fade-in-delay-2 mt-10 mb-10 w-16 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* 입장 카드 */}
        <div className="animate-fade-in-delay-2 grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
          {/* 개인 기도실 카드 */}
          <Link
            href="/private-prayer"
            id="link-private-prayer"
            className="glass-card group relative overflow-hidden rounded-2xl p-6 md:p-8"
          >
            {/* 카드 내부 배경 이미지 (미니 프리뷰) */}
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
              <Image
                src="/images/private-prayer.jpg"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                quality={60}
              />
            </div>
            <div className="relative z-10">
              {/* 촛불 아이콘 */}
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-amber-400"
                >
                  <path
                    d="M12 2c-2 3-4 5-4 8a4 4 0 0 0 8 0c0-3-2-5-4-8Z"
                    strokeLinejoin="round"
                  />
                  <path d="M12 14v8" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-lg font-light text-stone-100 tracking-wide mb-2">
                개인 기도실
              </h2>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                고요한 3D 성당을 치비 캐릭터와 거닐며 드리는 기도.
                <br />
                제단 앞에서 촛불을 밝히고 나만의 기도를 봉헌하세요.
              </p>
              {/* 화살표 */}
              <div className="mt-5 flex items-center gap-2 text-xs text-amber-400/70 group-hover:text-amber-400 transition-colors">
                <span>입장하기</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="transition-transform group-hover:translate-x-1"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 공동 기도실 카드 */}
          <Link
            href="/community-prayer"
            id="link-community-prayer"
            className="glass-card group relative overflow-hidden rounded-2xl p-6 md:p-8"
          >
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
              <Image
                src="/images/community-prayer.jpg"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                quality={60}
              />
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/15 flex items-center justify-center mb-4 group-hover:bg-sky-500/20 transition-colors">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-sky-400"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-lg font-light text-stone-100 tracking-wide mb-2">
                공동 기도실
              </h2>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                기도 제목을 나누고, 서로를 위해 함께 기도하는 공간.
                <br />
                당신의 기도가 누군가의 위로가 됩니다.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-sky-400/70 group-hover:text-sky-400 transition-colors">
                <span>입장하기</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="transition-transform group-hover:translate-x-1"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </Link>
        </div>


        {/* 하단 푸터 */}
        <footer className="animate-fade-in-delay-3 mt-16 mb-8 text-center">
          <p className="text-[11px] text-stone-600 tracking-wider">
            고요함 속에서 드리는 기도 · 심야 성당
          </p>
        </footer>
      </div>
    </div>
  );
}
