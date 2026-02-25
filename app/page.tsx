"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Cover from "./components/Cover";

type Diary = {
  id: number;
  date: string;
  title: string;
  summary: string;
  tags?: string[];
};

const PAGE_SIZE = 10;

function getTagCounts(diaries: { tags?: string[] }[]) {
  const count = new Map<string, number>();
  for (const d of diaries) {
    const tags = d.tags ?? [];
    for (const t of tags) {
      count.set(t, (count.get(t) ?? 0) + 1);
    }
  }
  return Array.from(count.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getSizeClass(count: number, maxCount: number) {
  if (maxCount <= 0) return "text-xs";
  const r = count / maxCount;
  if (r >= 0.7) return "text-base sm:text-lg";
  if (r >= 0.4) return "text-sm sm:text-base";
  if (r >= 0.2) return "text-xs sm:text-sm";
  return "text-[0.65rem] sm:text-xs";
}

export default function Home() {
  const [page, setPage] = useState(1);
  const [inputPage, setInputPage] = useState<string>("1");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allDiaries, setAllDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const entriesRef = useRef<HTMLElement>(null);
  const [entriesFlipped, setEntriesFlipped] = useState(false);

  useEffect(() => {
    const el = entriesRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setEntriesFlipped(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch("/api/diaries")
      .then((res) => res.json())
      .then((data) => setAllDiaries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  // 刷新后始终从页面顶部开始，避免出现「一半封面一半列表」的错位
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  const filteredDiaries = useMemo(() => {
    if (!selectedTag) return allDiaries;
    return allDiaries.filter((d) => (d.tags ?? []).includes(selectedTag));
  }, [selectedTag, allDiaries]);

  const tagCounts = useMemo(() => getTagCounts(allDiaries), [allDiaries]);
  const maxTagCount = tagCounts[0]?.value ?? 1;

  const totalPosts = filteredDiaries.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) {
      setPage(totalPages);
      setInputPage(String(totalPages));
    }
  }, [totalPages, page]);

  const currentEntries = filteredDiaries.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const applyPageInput = (raw: string) => {
    const target = Number(raw);
    if (!Number.isFinite(target)) {
      setInputPage(String(page));
      return;
    }
    const next = Math.min(Math.max(1, target), totalPages);
    setPage(next);
    setInputPage(String(next));
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
    setPage(1);
    setInputPage("1");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-white font-sans text-zinc-900 dark:from-black dark:via-zinc-950 dark:to-black dark:text-zinc-50">
      <Cover />

      <div className="entries-flip-wrapper pt-4">
        <main
          ref={entriesRef}
          id="entries"
          className={`entries-flip-panel mx-auto flex max-w-3xl flex-col px-4 pt-12 pb-10 scroll-mt-4 ${entriesFlipped ? "entries-flip-visible" : ""}`}
        >
        {/* 标签词云 */}
        {tagCounts.length > 0 && (
          <section className="mb-10 rounded-2xl border border-zinc-200 bg-white/60 px-4 py-5 shadow-sm transition-apple dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="mb-3 text-[0.7rem] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              标签
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {tagCounts.map(({ name, value }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleTagClick(name)}
                  className={`rounded-full px-2.5 py-1 transition-apple focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 ${getSizeClass(value, maxTagCount)} ${
                    selectedTag === name
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:scale-105 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            {selectedTag && (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                当前筛选：{selectedTag}（共 {totalPosts} 篇）
                <button
                  type="button"
                  onClick={() => handleTagClick(selectedTag)}
                  className="ml-2 rounded underline transition-apple hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
                >
                  取消
                </button>
              </p>
            )}
          </section>
        )}

        {/* 日记列表 */}
        <section className="space-y-4 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
          {loading && (
            <p className="px-3 text-xs text-zinc-500 dark:text-zinc-400">
              加载中…
            </p>
          )}
          {!loading && currentEntries.length === 0 && (
            <p className="px-3 text-xs text-zinc-500 dark:text-zinc-400">
              暂无文章
            </p>
          )}
          {!loading &&
            currentEntries.map((item) => (
            <article
              key={item.id}
              className="group flex gap-4 rounded-2xl px-3 py-4 transition-apple hover:bg-zinc-100/70 hover:shadow-md dark:hover:bg-zinc-900/80 dark:hover:shadow-black/10"
            >
              <div className="mt-1 shrink-0 text-[0.7rem] uppercase tracking-[0.18em] text-zinc-500 whitespace-nowrap dark:text-zinc-500">
                {item.date}
              </div>
                <div className="flex-1">
                <h2 className="text-sm font-medium tracking-tight group-hover:text-zinc-950 dark:group-hover:text-zinc-50">
                  {item.title}
                </h2>
                {(item.tags ?? []).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(item.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[0.65rem] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 whitespace-pre-line text-[0.82rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.summary}
                </p>
              </div>
            </article>
          ))}

        </section>

        {/* 分页 */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 text-[0.75rem] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-full border border-zinc-300 px-3 py-1 transition-apple disabled:opacity-40 hover:scale-[1.02] hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:focus:ring-offset-zinc-950"
          >
            上一页
          </button>

          <div className="flex items-center gap-2">
            <span>第</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onBlur={() => applyPageInput(inputPage)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyPageInput(inputPage);
                }
              }}
              className="flex h-7 w-14 items-center justify-center rounded-full border border-zinc-300 bg-transparent px-2 text-center text-[0.8rem] leading-none outline-none appearance-none transition-apple focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-700 dark:appearance-none dark:focus:border-zinc-400"
            />
            <span>
              页
              {totalPages ? ` / 共 ${totalPages} 页` : ""}
              {totalPosts ? ` · 共 ${totalPosts} 篇` : ""}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (page < totalPages) setPage((p) => p + 1);
            }}
            disabled={page >= totalPages}
            className="rounded-full border border-zinc-300 px-3 py-1 transition-apple disabled:opacity-40 hover:scale-[1.02] hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:focus:ring-offset-zinc-950"
          >
            下一页
          </button>
        </div>

        {/* 底部细线签名 */}
        <footer className="mt-10 border-t border-zinc-200 pt-4 text-[0.7rem] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          <span>© {new Date().getFullYear()} DailyRhapsody</span>
        </footer>
      </main>
      </div>
    </div>
  );
}
