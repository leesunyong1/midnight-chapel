import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '심야 성당 — 온라인 기도 서비스',
  description:
    '고딕 성당의 고요한 촛불 아래, 개인 기도와 공동 기도를 드릴 수 있는 온라인 기도 공간입니다.',
  keywords: ['기도', '성당', '온라인 기도', '개인 기도실', '공동 기도실'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-[#090a0f] text-stone-100 antialiased">
        {children}
      </body>
    </html>
  );
}
