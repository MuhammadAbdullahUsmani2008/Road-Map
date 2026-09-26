export function getAuthorizedUserId() {
  const userId = process.env.AUTHORIZED_USER_ID?.trim();
  if (!userId) {
    throw new Error("Missing AUTHORIZED_USER_ID environment variable.");
  }
  return userId;
}

export function safeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}