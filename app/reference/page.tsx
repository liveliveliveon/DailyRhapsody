import { getProfile } from "@/lib/profile-store";
import ReferencePageClient from "./ReferencePageClient";

// app router 默认会缓存，但 dr_seed 必须随每次请求新签发，所以强制 dynamic
export const dynamic = "force-dynamic";

/**
 * Server component：预取 profile 后传给客户端，避免 StickyProfileHeader 首帧居中跳变。
 */
export default async function ReferencePage() {
  let initialProfile = null;
  try {
    initialProfile = await getProfile();
  } catch {
    initialProfile = null;
  }
  return <ReferencePageClient initialProfile={initialProfile} />;
}
