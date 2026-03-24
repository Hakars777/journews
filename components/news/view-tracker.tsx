"use client";

import { useEffect } from "react";

export function ViewTracker({ newsId }: { newsId: string }) {
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/views/${newsId}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json" },
    }).catch(() => {});
    return () => ctrl.abort();
  }, [newsId]);

  return null;
}

