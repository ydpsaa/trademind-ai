import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Auth client is missing public configuration.");
    throw new Error("Missing auth client configuration.");
  }

  try {
    new URL(supabaseUrl);
  } catch {
    console.error("Auth client has an invalid service endpoint.");
    throw new Error("Invalid auth service endpoint.");
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
