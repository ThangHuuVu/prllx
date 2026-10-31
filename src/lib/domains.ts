const LABEL = "(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)";
const HOSTNAME = new RegExp(`^(?:\\*\\.)?${LABEL}(?:\\.${LABEL})+$`, "i");

export const MAX_EMBED_HOSTS = 20;

export function isAllowedEmbedHost(value: string): boolean {
  if (value.length === 0 || value.length > 253) return false;
  if (/[\s;,"'\\]/.test(value)) return false;
  if (value.toLowerCase() === "localhost") return true;
  return HOSTNAME.test(value);
}

export function normalizeEmbedHosts(values: readonly string[]): string[] {
  const hosts: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const host = value.trim().toLowerCase();
    if (!isAllowedEmbedHost(host) || seen.has(host)) continue;
    seen.add(host);
    hosts.push(host);
  }
  return hosts;
}

export function frameAncestorsDirective(domains: string[] | null): string {
  if (domains === null) {
    return "frame-ancestors *";
  }
  const hosts = normalizeEmbedHosts(domains);
  if (hosts.length === 0) {
    return "frame-ancestors 'self'";
  }
  return `frame-ancestors 'self' ${hosts.map((host) => `https://${host}`).join(" ")}`;
}
