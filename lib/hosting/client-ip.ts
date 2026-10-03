const MAX_HOPS = 5;
const EVERYONE = new Set(["0.0.0.0/0", "::/0"]);

/**
 * One visitor address for outbound API calls.
 * Next.js keeps a client-supplied X-Forwarded-For and does not append the socket,
 * so an empty trusted list sends nothing.
 */
export async function readVisitorIp(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return null;
  }

  try {
    const { headers } = await import("next/headers");
    const forwardedFor = (await headers()).get("x-forwarded-for");
    return resolveClientIp(
      null,
      forwardedFor,
      parseTrustedProxies(process.env.ENDATIX_TRUSTED_PROXIES),
    );
  } catch {
    return null;
  }
}

export function parseTrustedProxies(value: string | undefined): string[] {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.some((entry) => EVERYONE.has(entry))) {
    throw new Error(
      "ENDATIX_TRUSTED_PROXIES cannot contain 0.0.0.0/0 or ::/0",
    );
  }
  return entries;
}

export function resolveClientIp(
  peer: string | null,
  forwardedFor: string | null,
  trusted: readonly string[],
): string | null {
  const socket = normalizeIp(peer);
  if (socket && !isTrusted(socket, trusted)) {
    return socket;
  }
  if (trusted.length === 0) {
    return socket;
  }
  return firstUntrustedHop(forwardedFor, trusted);
}

function firstUntrustedHop(
  forwardedFor: string | null,
  trusted: readonly string[],
): string | null {
  const hops = (forwardedFor ?? "")
    .split(",")
    .map((hop) => normalizeIp(hop))
    .filter((hop): hop is string => hop !== null)
    .slice(-MAX_HOPS);
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    if (!isTrusted(hops[index], trusted)) {
      return hops[index];
    }
  }
  return null;
}

function isTrusted(ip: string, trusted: readonly string[]): boolean {
  return trusted.some((entry) => matches(ip, entry));
}

function matches(ip: string, entry: string): boolean {
  const candidate = normalizeIp(entry);
  if (!candidate) {
    return false;
  }
  if (!candidate.includes("/")) {
    return ip === candidate;
  }
  return cidrContains(ip, candidate);
}

function normalizeIp(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  const unbracketed = trimmed.startsWith("[")
    ? trimmed.slice(1, trimmed.indexOf("]"))
    : trimmed.split("%")[0];
  const mapped = unbracketed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return (mapped?.[1] ?? unbracketed).toLowerCase();
}

function cidrContains(ip: string, cidr: string): boolean {
  const [base, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  if (!base || !Number.isInteger(prefix)) {
    return false;
  }
  const ipBytes = addressBytes(ip);
  const baseBytes = addressBytes(base);
  if (!ipBytes || !baseBytes || ipBytes.length !== baseBytes.length) {
    return false;
  }
  return samePrefix(ipBytes, baseBytes, prefix);
}

function samePrefix(left: number[], right: number[], prefix: number): boolean {
  const fullBytes = Math.floor(prefix / 8);
  if (left.slice(0, fullBytes).some((byte, index) => byte !== right[index])) {
    return false;
  }
  const rest = prefix % 8;
  if (rest === 0) {
    return true;
  }
  const mask = (0xff << (8 - rest)) & 0xff;
  return (left[fullBytes] & mask) === (right[fullBytes] & mask);
}

function addressBytes(value: string): number[] | null {
  if (value.includes(".")) {
    const parts = value.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => part > 255 || part < 0)) {
      return null;
    }
    return parts;
  }
  return ipv6Bytes(value);
}

function ipv6Bytes(value: string): number[] | null {
  const groups = ipv6Groups(value);
  if (!groups) {
    return null;
  }
  const bytes: number[] = [];
  for (const group of groups) {
    const pair = groupBytes(group);
    if (!pair) {
      return null;
    }
    bytes.push(pair[0], pair[1]);
  }
  return bytes;
}

function ipv6Groups(value: string): string[] | null {
  const halves = value.split("::");
  if (halves.length > 2) {
    return null;
  }
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - (head.length + tail.length);
  if (missing < 0) {
    return null;
  }
  const groups = [...head, ...Array(missing).fill("0"), ...tail];
  return groups.length === 8 ? groups : null;
}

function groupBytes(group: string): [number, number] | null {
  const parsed = Number.parseInt(group || "0", 16);
  if (Number.isNaN(parsed) || parsed > 0xffff) {
    return null;
  }
  return [(parsed >> 8) & 0xff, parsed & 0xff];
}
