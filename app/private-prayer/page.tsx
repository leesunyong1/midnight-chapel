'use client';

import { useState, useEffect } from 'react';
import PrivatePrayer3DCanvas from '@/components/prayer/PrivatePrayer3DCanvas';

export default function PrivatePrayerPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#090a0f] text-stone-400 text-sm tracking-wide select-none">
        <div className="w-9 h-9 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin mb-4" />
        <p className="font-light">심야 성당 개인 기도실에 입장하는 중...</p>
      </div>
    );
  }

  return <PrivatePrayer3DCanvas />;
}
