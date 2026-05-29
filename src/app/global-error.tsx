"use client";

import { captureClientError } from "@/lib/monitoring/sentry";

export default function GlobalError({ error }: { error: Error }) {
  captureClientError(error);

  return (
    <html lang="ko">
      <body>
        <main className="p-8">
          <h1>예상치 못한 오류가 발생했습니다.</h1>
          <p>{error.message}</p>
        </main>
      </body>
    </html>
  );
}
