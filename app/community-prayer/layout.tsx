import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공동 기도실 — 심야 성당',
  description: '기도 제목을 나누고, 서로를 위해 함께 기도하는 공간입니다.',
};

export default function CommunityPrayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
