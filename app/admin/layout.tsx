"use client";

import { usePathname } from "next/navigation";
import AdminHeader from "./AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {!isLogin && <AdminHeader />}
      <main className={isLogin ? "" : "mx-auto max-w-4xl px-4 py-8"}>
        {children}
      </main>
    </div>
  );
}
