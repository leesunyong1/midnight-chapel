'use client';

import dynamic from 'next/dynamic';

// Next.js SSR 방지 및 Three.js WebGL 로딩 처리
const ChibiCharacterPreview = dynamic(
  () => import('@/components/character/ChibiCharacterPreview'),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#090a0f] text-stone-400 text-sm tracking-wide">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin mb-4" />
        <p className="font-light">치비 캐릭터 3D 모델을 불러오는 중...</p>
      </div>
    ),
  }
);

export default function CharacterPreviewPage() {
  return <ChibiCharacterPreview />;
}
