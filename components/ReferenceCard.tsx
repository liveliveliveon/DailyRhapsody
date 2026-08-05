"use client";

import Link from "next/link";
import type { ReferenceListItem } from "@/hooks/useReference";

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const deltaMs = Date.now() - t;
  const sec = Math.max(1, Math.floor(deltaMs / 1000));
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} 个月前`;
  return `${Math.floor(mon / 12)} 年前`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function ReferenceCard({ item }: { item: ReferenceListItem }) {
  const sourceLabel = item.source || hostnameOf(item.url) || "";
  return (
    <article
      id={`reference-${item.id}`}
      className="group rounded-2xl border border-zinc-200 bg-white/70 px-5 py-4 shadow-sm transition-apple hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
    >
      <div className="flex items-center gap-2 text-[0.7rem] text-zinc-500 dark:text-zinc-400">
        {sourceLabel && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {sourceLabel}
          </span>
        )}
        <span className="opacity-70">·</span>
        <span>{relativeTime(item.clippedAt)}</span>
      </div>

      <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
        <Link
          href={`/reference/${item.id}`}
          className="rounded transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:hover:text-blue-300 dark:focus:ring-offset-zinc-900"
        >
          {item.name || "(无标题)"}
        </Link>
      </h3>

      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-zinc-200 px-2 py-0.5 text-[0.65rem] text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-[0.75rem]">
        <Link
          href={`/reference/${item.id}`}
          className="rounded text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:text-blue-400 dark:hover:text-blue-300 dark:focus:ring-offset-zinc-900"
        >
          站内阅读
        </Link>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded text-zinc-500 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:text-zinc-400 dark:hover:text-zinc-200 dark:focus:ring-offset-zinc-900"
          >
            跳到原文 ↗
          </a>
        )}
      </div>
    </article>
  );
}
