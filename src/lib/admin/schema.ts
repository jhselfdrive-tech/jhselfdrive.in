export function isMissingSchema(error: { code?: string } | null | undefined) {
  return Boolean(error && ["PGRST200", "PGRST205", "42703", "42P01"].includes(error.code || ""));
}
