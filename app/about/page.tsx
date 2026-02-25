"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-white px-4 py-16 font-sans text-zinc-900 dark:from-black dark:via-zinc-950 dark:to-black dark:text-zinc-50">
      <main className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-10 inline-block text-sm text-zinc-500 transition-opacity hover:opacity-80 dark:text-zinc-400"
        >
          ← 返回首页
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          关于
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Daily Rhapsody 是一本个人日记与随想录。
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          I think, therefore I am.
        </p>
        <footer className="mt-16 border-t border-zinc-200 pt-6 text-[0.7rem] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          <span>© {new Date().getFullYear()} Daily Rhapsody</span>
        </footer>
      </main>
    </div>
  );
}
