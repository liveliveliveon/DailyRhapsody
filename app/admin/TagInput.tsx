"use client";

import { useEffect, useState } from "react";

function parseTagsStr(s: string): string[] {
  return s
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function TagInput({
  value,
  onChange,
  placeholder = "输入新标签，逗号或空格分隔",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/diaries")
      .then((res) => res.json())
      .then((data: { tags?: string[] }[]) => {
        const set = new Set<string>();
        (Array.isArray(data) ? data : []).forEach((d) => {
          (d.tags ?? []).forEach((t) => set.add(t));
        });
        setExistingTags(Array.from(set).sort());
      })
      .catch(() => {});
  }, []);

  function addTag(tag: string) {
    const current = parseTagsStr(value);
    if (current.includes(tag)) return;
    const next = current.length ? [...current, tag] : [tag];
    onChange(next.join(", "));
  }

  return (
    <div className="space-y-2">
      {existingTags.length > 0 && (
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            已有标签（点击添加）：
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {existingTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-500"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
      />
    </div>
  );
}
