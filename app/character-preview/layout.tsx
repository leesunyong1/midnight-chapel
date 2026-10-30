import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '치비 캐릭터 3D 프리뷰 — 심야 성당',
  description: '업로드된 치비 캐릭터 GLB 3D 모델 검증 및 인터랙티브 프리뷰 뷰어',
};

export default function CharacterPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
