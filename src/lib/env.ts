const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const appUrl = (() => {
  const candidate =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL;

  if (!candidate) {
    return "http://localhost:3000";
  }

  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return trimTrailingSlash(candidate);
  }

  return `https://${trimTrailingSlash(candidate)}`;
})();
