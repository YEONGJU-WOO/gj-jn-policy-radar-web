"use client";

import { Button } from "@/components/ui/button";
import { captureClientError } from "@/lib/monitoring/sentry";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  captureClientError(error);

  return (
    <div className="rounded-md border bg-card p-6">
      <h2 className="text-lg font-semibold">화면을 불러오지 못했습니다.</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
