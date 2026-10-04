"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export function useHistoryScroll() {
  const threadRef = useRef<HTMLDivElement>(null);
  const scrollPlan = useRef<{ bottom: boolean; anchor?: HTMLElement; offset: number; top: number } | null>(null);
  const beforeChange = useCallback((followLatest: boolean) => {
    const thread = threadRef.current;
    if (!thread || scrollPlan.current) return;
    const top = thread.getBoundingClientRect().top;
    const anchor = [...thread.querySelectorAll<HTMLElement>("[data-message-id]")]
      .find(node => node.getBoundingClientRect().bottom > top);
    scrollPlan.current = {
      bottom: followLatest && (!anchor || thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80),
      anchor, offset: anchor ? anchor.getBoundingClientRect().top - top : 0, top: thread.scrollTop,
    };
  }, []);
  useLayoutEffect(() => {
    const thread = threadRef.current;
    const plan = scrollPlan.current;
    scrollPlan.current = null;
    if (!thread || !plan) return;
    if (plan.bottom) thread.scrollTop = thread.scrollHeight;
    else if (plan.anchor?.isConnected) {
      thread.scrollTop += plan.anchor.getBoundingClientRect().top - thread.getBoundingClientRect().top - plan.offset;
    } else thread.scrollTop = plan.top;
  });
  return { threadRef, beforeChange };
}
