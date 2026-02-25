"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Diary = {
  id: number;
  date: string;
  title: string;
  summary: string;
  tags?: string[];
};

export default function AdminPage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/diaries");
      const data = await res.json();
      setDiaries(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function seed() {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) await load();
    } finally {
      setSeedLoading(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("确定删除这篇？")) return;
    const res = await fetch(`/api/diaries/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  if (loading) {
    return <p className="text-zinc-500">加载中…</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          文章列表（共 {diaries.length} 篇）
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={seed}
            disabled={seedLoading}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {seedLoading ? "初始化中…" : "从静态数据初始化"}
          </button>
          <Link
            href="/admin/diaries/new"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            新建
          </Link>
        </div>
      </div>

      <ul className="space-y-2">
        {diaries.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0 flex-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {d.date}
              </span>
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                {d.title || "（无标题）"}
              </p>
              {(d.tags ?? []).length > 0 && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {d.tags!.join(" · ")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/admin/diaries/${d.id}/edit`}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                编辑
              </Link>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
