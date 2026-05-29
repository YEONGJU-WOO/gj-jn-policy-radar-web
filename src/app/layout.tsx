import type { Metadata } from "next";
import localFont from "next/font/local";

import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";

import "./globals.css";

const pretendard = localFont({
  src: [
    { path: "../../public/fonts/Pretendard-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Pretendard-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-pretendard",
  display: "swap",
});

export const metadata: Metadata = {
  title: "광주·전남 정책 레이더",
  description: "광주·전남 정책 모니터링 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} font-sans antialiased`}>
        <Providers>
          <a
            href="#main-content"
            className="sr-only z-[100] rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            본문으로 건너뛰기
          </a>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
