"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Diary = {
  id: number;
  date: string;
  publishedAt?: string;
  title: string;
  summary: string;
  tags?: string[];
  images?: string[];
};

type Comment = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

/** 流式加载：首次展示条数，触底每次追加条数 */
const INITIAL_VISIBLE = 12;
const LOAD_MORE_SIZE = 10;

type Profile = {
  name: string;
  signature: string;
  avatar: string;
  location: string;
  industry: string;
  zodiac: string;
  headerBg: string;
};

/** 支持 ISO 或 YYYY-MM-DD，输出 2026/9/10, 12:00PM */
function formatDate12h(dateOrIso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso)
    ? new Date(dateOrIso + "T12:00:00")
    : new Date(dateOrIso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours() % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() < 12 ? "AM" : "PM";
  return `${y}/${m}/${day}, ${h}:${min}${ampm}`;
}

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

function DefaultAvatar({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const sizeClass = className ?? "h-10 w-10";
  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-300 text-xs font-medium text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300 ${sizeClass}`}
        aria-hidden
      >
        滕
      </div>
    );
  }
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700 ${sizeClass}`}
      aria-hidden
    >
      <Image
        src={src || "/avatar.png"}
        alt=""
        width={40}
        height={40}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

const MAX_SUMMARY_LINES = 6;

/** 本月日历热力图：仅方块，始终当前月，有发布的日期高亮 */
function CalendarHeatmap({ datesWithPosts }: { datesWithPosts: Set<string> }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  function toDateKey(day: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div
      className="inline-grid grid-cols-7 gap-1 rounded-xl border border-zinc-200 bg-white/80 p-2.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80"
      style={{ width: "min(100%, 168px)" }}
    >
      {weeks.flat().map((day, i) =>
        day === null ? (
          <div key={`e-${i}`} className="h-[18px] w-[18px] rounded-[4px] bg-zinc-100 dark:bg-zinc-700/60" />
        ) : (
          <div
            key={day}
            className={`h-[18px] w-[18px] rounded-[4px] transition-colors ${
              datesWithPosts.has(toDateKey(day))
                ? "bg-emerald-500 dark:bg-emerald-500/90"
                : "bg-zinc-200 dark:bg-zinc-600/80"
            }`}
            title={`${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}${datesWithPosts.has(toDateKey(day)) ? " 有发布" : ""}`}
          />
        )
      )}
    </div>
  );
}

function EntrySummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = text.split(/\n/).length > MAX_SUMMARY_LINES || text.length > 320;
  return (
    <div>
      <p
        className={`whitespace-pre-line text-[0.82rem] leading-relaxed text-zinc-600 dark:text-zinc-400 ${
          expanded ? "" : "line-clamp-6"
        }`}
      >
        {text}
      </p>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-[0.75rem] text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-400"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  );
}

function EntryComments({
  diaryId,
  open,
  onOpenChange,
}: {
  diaryId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/diaries/${diaryId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [diaryId, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = author.trim().slice(0, 64) || "匿名";
    const c = content.trim().slice(0, 2000);
    if (!c) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/diaries/${diaryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: a, content: c }),
      });
      const data = await res.json();
      if (data.id) setComments((prev) => [...prev, data]);
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/30">
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] text-zinc-500">评论</span>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="text-[0.75rem] text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-400"
        >
          收起（{comments.length}）
        </button>
      </div>
      {loading && <p className="text-xs text-zinc-500">加载中…</p>}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-zinc-500">暂无评论</p>
      )}
      {!loading &&
        comments.map((c) => (
          <div key={c.id} className="text-[0.8rem]">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {c.author}
            </span>
            <span className="ml-1.5 text-zinc-500 dark:text-zinc-400">
              {new Date(c.createdAt).toLocaleString("zh-CN", { hour12: false })}
            </span>
            <p className="mt-0.5 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {c.content}
            </p>
          </div>
        ))}
      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="昵称（可选）"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[0.8rem] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写一条评论…"
          rows={2}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[0.8rem] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded bg-zinc-800 px-3 py-1 text-[0.8rem] text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "发送中…" : "发送"}
        </button>
      </form>
    </div>
  );
}

function EntryCard({
  item,
  authorName,
  avatarSrc,
}: {
  item: Diary;
  authorName: string;
  avatarSrc: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function runShare() {
    const article = ref.current;
    if (!article || sharing) return;
    setSharing(true);
    setMenuOpen(false);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(article, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: undefined,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.95)
      );
      if (!blob) throw new Error("生成图片失败");
      const file = new File([blob], "snapshot.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "DailyRhapsody",
          text: "分享自 DailyRhapsody",
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "DailyRhapsody",
          text: "分享自 DailyRhapsody",
          url: typeof window !== "undefined" ? window.location.href : "",
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "snapshot.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error(err);
    } finally {
      setSharing(false);
    }
  }

  const timeStr = formatDate12h(
    item.publishedAt ?? item.date + "T12:00:00"
  );

  return (
    <article
      ref={ref}
      className="group relative flex flex-col gap-3 rounded-2xl px-3 py-4 transition-apple hover:bg-zinc-100/70 hover:shadow-md dark:hover:bg-zinc-900/80 dark:hover:shadow-black/10"
    >
      <div className="flex items-start gap-3">
        <DefaultAvatar src={avatarSrc} className="h-10 w-10 shrink-0" />
                    <div className="min-h-10 flex min-w-0 flex-1 flex-col justify-center">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {authorName}
                      </p>
          <p className="text-[0.75rem] text-zinc-500 dark:text-zinc-400">
            {timeStr}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="更多"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="6" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[6rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setCommentsOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[0.8rem] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  评论
                </button>
                <button
                  type="button"
                  onClick={runShare}
                  disabled={sharing}
                  className="w-full px-3 py-2 text-left text-[0.8rem] text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {sharing ? "生成中…" : "分享"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {(item.images ?? []).length > 0 && (
        <div className="flex gap-1 overflow-hidden rounded-xl">
          {item.images!.slice(0, 3).map((src) => (
            <div
              key={src}
              className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800 sm:h-20 sm:w-20"
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          ))}
        </div>
      )}
      <EntrySummary text={item.summary} />
      <div className="flex flex-col items-start gap-1">
        {(item.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
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
        <EntryComments
          diaryId={item.id}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
        />
      </div>
    </article>
  );
}

export default function EntriesPage() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allDiaries, setAllDiaries] = useState<Diary[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [entriesFlipped, setEntriesFlipped] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [eggRetracting, setEggRetracting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const eggHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() {
      setScrollY(typeof window !== "undefined" ? window.scrollY : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/diaries")
      .then((res) => res.json())
      .then((data) => setAllDiaries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => setProfile(null));
  }, []);

  // 进入页面时触发翻转动画
  useEffect(() => {
    const t = setTimeout(() => setEntriesFlipped(true), 80);
    return () => clearTimeout(t);
  }, []);

  const filteredDiaries = useMemo(() => {
    if (!selectedTag) return allDiaries;
    return allDiaries.filter((d) => (d.tags ?? []).includes(selectedTag));
  }, [selectedTag, allDiaries]);

  const tagCounts = useMemo(() => getTagCounts(allDiaries), [allDiaries]);
  const maxTagCount = tagCounts[0]?.value ?? 1;
  const datesWithPosts = useMemo(
    () => new Set(allDiaries.map((d) => d.date)),
    [allDiaries]
  );

  const totalPosts = filteredDiaries.length;
  const currentEntries = useMemo(
    () => filteredDiaries.slice(0, visibleCount),
    [filteredDiaries, visibleCount]
  );
  const hasMore = visibleCount < totalPosts;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [selectedTag]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting)
          setVisibleCount((n) => Math.min(totalPosts, n + LOAD_MORE_SIZE));
      },
      { rootMargin: "120px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, totalPosts]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const doc = document.documentElement;
      const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 60;
      if (!atBottom || e.deltaY <= 0) return;
      if (eggHideTimerRef.current) {
        clearTimeout(eggHideTimerRef.current);
        eggHideTimerRef.current = null;
      }
      setEggRetracting(false);
      setShowEasterEgg(true);
      eggHideTimerRef.current = setTimeout(() => {
        setEggRetracting(true);
        eggHideTimerRef.current = setTimeout(() => {
          setShowEasterEgg(false);
          setEggRetracting(false);
          eggHideTimerRef.current = null;
        }, 280);
      }, 1800);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (eggHideTimerRef.current) clearTimeout(eggHideTimerRef.current);
    };
  }, []);

  const handleTagClick = (tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-white font-sans text-zinc-900 dark:from-black dark:via-zinc-950 dark:to-black dark:text-zinc-50">
      <div className="entries-flip-wrapper">
        <main
          id="entries"
          className={`entries-flip-panel mx-auto flex max-w-3xl flex-col pb-8 ${entriesFlipped ? "entries-flip-visible" : ""}`}
        >
          {/* 顶部 profile：随滚动逐渐收缩，收缩后固定、头像与姓名居中 */}
          {(() => {
            const HEADER_EXPANDED = 260;
            const HEADER_COLLAPSED = 56;
            const threshold = HEADER_EXPANDED - HEADER_COLLAPSED;
            const height = Math.max(HEADER_COLLAPSED, HEADER_EXPANDED - scrollY);
            const isCollapsed = scrollY >= threshold;
            return (
              <header
                className="sticky top-0 z-30 w-full overflow-hidden rounded-b-2xl bg-gradient-to-b from-zinc-900 via-zinc-800 to-black transition-[height] duration-150 ease-out"
                style={{
                  height: `${height}px`,
                }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${profile?.headerBg || "/header-bg.png"})`,
                  }}
                />
                <div className="absolute inset-0 bg-black/50" />
                <div
                  className={`relative flex h-full w-full px-5 transition-[padding] duration-150 ${
                    isCollapsed
                      ? "flex-row items-center justify-center gap-3"
                      : "flex-row items-center justify-center gap-4"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href="/"
                      className={
                        isCollapsed
                          ? "flex items-center gap-3"
                          : "flex items-center gap-4"
                      }
                    >
                      <div
                        className={`relative shrink-0 overflow-hidden rounded-full border-2 border-white/80 ring-2 ring-white/20 ${
                          isCollapsed ? "h-9 w-9" : "h-16 w-16"
                        }`}
                      >
                        <Image
                          src={profile?.avatar || "/avatar.png"}
                          alt=""
                          width={isCollapsed ? 36 : 64}
                          height={isCollapsed ? 36 : 64}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <p
                        className={`font-bold text-white ${
                          isCollapsed ? "text-sm" : "text-lg"
                        }`}
                      >
                        {profile?.name ?? "DailyRhapsody"}
                      </p>
                    </Link>
                    {!isCollapsed && (
                      <>
                        <p className="mt-3 text-sm text-white/80">
                          {profile?.signature ?? "dailyrhapsody.data.blog"}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {[
                            profile?.location ?? "杭州",
                            profile?.industry ?? "计算机硬件行业",
                            profile?.zodiac ?? "天秤座",
                          ]
                            .filter(Boolean)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="rounded-lg bg-white/20 px-2.5 py-1 text-xs text-white backdrop-blur-sm"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </header>
            );
          })()}

          <div className="px-4 pt-5">
          {/* 顶部功能区：日历热力图（左）+ 预留同级 */}
          <div className="mb-5 flex flex-wrap items-start gap-6">
            <CalendarHeatmap datesWithPosts={datesWithPosts} />
          </div>

          {/* 标签词云 */}
          {tagCounts.length > 0 && (
            <section className="mb-5 rounded-2xl border border-zinc-200 bg-white/60 px-4 py-5 shadow-sm transition-apple dark:border-zinc-800 dark:bg-zinc-900/40">
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

          {/* 日记列表：流式滚动 */}
          <section className="entries-page-fade-in space-y-4 border-t border-zinc-200 pt-5 text-sm dark:border-zinc-800">
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
                <EntryCard
                  key={item.id}
                  item={item}
                  authorName={profile?.name ?? "DailyRhapsody"}
                  avatarSrc={profile?.avatar ?? "/avatar.png"}
                />
              ))}
            {hasMore && !loading && <div ref={sentinelRef} className="h-4" aria-hidden />}
          </section>

          <footer className="mt-6 border-t border-zinc-200 pt-5 text-[0.7rem] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
            <span>© {new Date().getFullYear()} DailyRhapsody</span>
          </footer>

          {/* 到底部后再向下滚动一次：显示彩蛋，约 1.8s 后自动缩回 */}
          {showEasterEgg && (
            <div
              className={`easter-egg-toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-800 px-4 py-2 text-sm text-white shadow-lg transition-all duration-300 ease-out dark:bg-zinc-200 dark:text-zinc-900 ${
                eggRetracting ? "easter-egg-retract" : ""
              }`}
              role="status"
              aria-live="polite"
            >
              被你发现了 ✨
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
