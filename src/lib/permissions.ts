const ALLOWED_EMAILS = (process.env.EXPORT_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function canExport(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}
