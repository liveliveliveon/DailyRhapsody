"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const PAGE_SIZE = 30;

export type ReferenceListItem = {
  id: string;
  name: string;
  url: string;
  source: string;
  tags: string[];
  clippedAt: string;
  isPublic: boolean;
};

type ReferenceListResponse = {
  items?: ReferenceListItem[];
  total?: number;
  hasMore?: boolean;
  tagCounts?: { name: string; value: number }[];
};

export type UseReferenceState = {
  items: ReferenceListItem[];
  total: number;
  tagCounts: { name: string; value: number }[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  maxTagCount: number;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * /reference 列表的数据层。仿 useEntries 的最简版本：
 *  - 首屏 / 切 tag / dr-gate-ready 后从头拉一页
 *  - sentinel 进入视窗 → append 下一页
 *  - 不做日历热力图、彩蛋、hash 深链（reference 没有这些需求）
 */
export function useReference(selectedTag: string | null): UseReferenceState {
  const [items, setItems] = useState<ReferenceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tagCounts, setTagCounts] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const appendInFlightRef = useRef(false);

  const hasMore = items.length < total && total > 0;
  const maxTagCount = tagCounts[0]?.value ?? 1;

  const loadPage = useCallback(
    (offset: number, append: boolean, tag: string | null) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (tag) params.set("tag", tag);
      return fetchWithTimeout(`/api/reference?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
        .then((data: ReferenceListResponse) => {
          const list = Array.isArray(data.items) ? data.items : [];
          if (append) setItems((prev) => [...prev, ...list]);
          else setItems(list);
          if (typeof data.total === "number") setTotal(data.total);
          if (Array.isArray(data.tagCounts)) setTagCounts(data.tagCounts);
        });
    },
    [],
  );

  const [gateGen, setGateGen] = useState(0);
  useEffect(() => {
    const onGateReady = () => setGateGen((g) => g + 1);
    window.addEventListener("dr-gate-ready", onGateReady);
    return () => window.removeEventListener("dr-gate-ready", onGateReady);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPage(0, false, selectedTag)
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [selectedTag, loadPage, gateGen]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (
          !entries[0]?.isIntersecting ||
          loadingMore ||
          appendInFlightRef.current
        )
          return;
        appendInFlightRef.current = true;
        setLoadingMore(true);
        const offset = items.length;
        loadPage(offset, true, selectedTag)
          .catch(() => {})
          .finally(() => {
            appendInFlightRef.current = false;
            setLoadingMore(false);
          });
      },
      { rootMargin: "200px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, items.length, selectedTag, loadPage]);

  return useMemo(
    () => ({
      items,
      total,
      tagCounts,
      loading,
      loadingMore,
      hasMore,
      maxTagCount,
      sentinelRef,
    }),
    [items, total, tagCounts, loading, loadingMore, hasMore, maxTagCount],
  );
}
