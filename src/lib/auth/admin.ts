import type { User } from "@supabase/supabase-js";

export const ADMIN_EMAILS = ["ydolishniy@gmail.com"] as const;

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}

export function isAdminUser(user?: Pick<User, "email"> | null): boolean {
  return isAdminEmail(user?.email);
}
