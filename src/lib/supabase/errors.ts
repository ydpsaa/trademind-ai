export function formatSupabaseError(message: string) {
  if (
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  ) {
    return "Data setup is not ready yet. Apply the required data setup, then refresh this page.";
  }

  return message;
}
