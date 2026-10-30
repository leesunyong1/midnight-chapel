import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인 기도실 — 심야 성당',
  description: '고요한 성당에서 홀로 드리는 침묵의 기도. 촛불을 켜고 나만의 기도 시간을 가지세요.',
};

export default function PrivatePrayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
