// 简单一次性导出脚本：从 WordPress 拉取所有文章，生成 app/diaries.data.ts
// 运行方式：在项目根目录执行
//   node scripts/export-wordpress.mjs

import fs from "node:fs";
import path from "node:path";

const SITE = "dailyrhapsody.data.blog";
const PER_PAGE = 100;

const stripHtml = (html) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

async function fetchAllPosts() {
  const all = [];
  let page = 1;

  // 最多防御性抓 10 页（1000 篇）
  while (page <= 10) {
    const url = `https://public-api.wordpress.com/wp/v2/sites/${SITE}/posts?per_page=${PER_PAGE}&page=${page}`;
    console.log(`Fetching: ${url}`);

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 400 || res.status === 404) {
        break;
      }
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    all.push(...data);
    if (data.length < PER_PAGE) break;
    page += 1;
  }

  return all;
}

function mapToDiaries(posts) {
  return posts
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .map((post) => {
      const rawDate = typeof post.date === "string" ? post.date : "";
      const date = rawDate.slice(0, 10);

      const titleHtml = post.title?.rendered ?? "";
      const excerptHtml = post.excerpt?.rendered ?? "";

      const title = stripHtml(titleHtml);
      const summary = stripHtml(excerptHtml || post.content?.rendered || "");

      return {
        id: post.id,
        date,
        title,
        summary,
      };
    });
}

async function main() {
  const posts = await fetchAllPosts();
  console.log(`Total posts fetched: ${posts.length}`);

  const diaries = mapToDiaries(posts);

  const outPath = path.join(
    process.cwd(),
    "app",
    "diaries.data.ts"
  );

  const fileContent =
    `export type Diary = {\n` +
    `  id: number;\n` +
    `  date: string;\n` +
    `  title: string;\n` +
    `  summary: string;\n` +
    `};\n\n` +
    `export const allDiaries: Diary[] = ${JSON.stringify(
      diaries,
      null,
      2
    )};\n`;

  fs.writeFileSync(outPath, fileContent, "utf8");
  console.log(`Written ${diaries.length} diaries to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

