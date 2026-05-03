export function formatSupabaseError(message: string) {
  if (
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  ) {
    return "Database schema is not applied yet. Run src/db/schema.sql in Supabase Dashboard -> SQL Editor, then refresh this page.";
  }

  return message;
}
