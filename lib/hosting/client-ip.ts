/** Request header that carries the visitor address to the Endatix API. */
export const ClientIpHeaders = Object.freeze({
  FORWARDED_FOR: "X-Forwarded-For",
} as const);

/** Environment variables that configure visitor-address forwarding. */
export const ClientIpEnv = Object.freeze({
  TRUSTED_PROXIES: "ENDATIX_TRUSTED_PROXIES",
} as const);

const ClientIpLimits = Object.freeze({
  /** Hops read from the right of X-Forwarded-For before giving up. */
  MAX_HOPS: 5,
  LIST_SEPARATOR: ",",
  CIDR_SEPARATOR: "/",
} as const);

const IPV4_MAPPED_IPV6 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
const IPV4_WITH_PORT = /^(\d+\.\d+\.\d+\.\d+):\d+$/;
const IPV4_OCTET = /^\d{1,3}$/;
const IPV6_GROUP = /^[0-9a-f]{1,4}$/i;

export class TrustedProxiesConfigError extends Error {
  constructor(message: string) {
    super(`${ClientIpEnv.TRUSTED_PROXIES}: ${message}`);
    this.name = "TrustedProxiesConfigError";
  }
}

/**
 * One visitor address for outbound API calls.
 * Next.js keeps a client-supplied X-Forwarded-For and does not append the socket,
 * so an empty trusted list sends nothing. An invalid list also sends nothing;
 * `check-environment` reports it at startup.
 */
export async function readVisitorIp(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return null;
  }

  try {
    const { headers } = await import("next/headers");
    const forwardedFor = (await headers()).get(ClientIpHeaders.FORWARDED_FOR);
    return resolveClientIp(
      null,
      forwardedFor,
      parseTrustedProxies(process.env[ClientIpEnv.TRUSTED_PROXIES]),
    );
  } catch {
    return null;
  }
}

/**
 * Sets the visitor address on outbound request headers, replacing any
 * forwarded chain already there. Leaves the headers alone when there is none.
 */
export async function withVisitorIp(
  init: RequestInit = {},
): Promise<RequestInit> {
  const visitor = await readVisitorIp();
  if (!visitor) {
    return init;
  }
  const headers = new Headers(init.headers);
  headers.set(ClientIpHeaders.FORWARDED_FOR, visitor);
  return { ...init, headers };
}

export function parseTrustedProxies(value: string | undefined): string[] {
  const entries = (value ?? "")
    .split(ClientIpLimits.LIST_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  for (const entry of entries) {
    assertTrustedProxyEntry(entry);
  }
  return entries;
}

function assertTrustedProxyEntry(entry: string): void {
  const [base, prefixText, extra] = entry.split(ClientIpLimits.CIDR_SEPARATOR);
  const address = normalizeIp(base ?? null);
  const bytes = address ? addressBytes(address) : null;
  if (!bytes || extra !== undefined) {
    throw new TrustedProxiesConfigError(`"${entry}" is not an IP or CIDR`);
  }
  if (prefixText === undefined) {
    return;
  }
  const prefix = Number(prefixText);
  if (!/^\d+$/.test(prefixText) || prefix > bytes.length * 8) {
    throw new TrustedProxiesConfigError(`"${entry}" has an invalid prefix`);
  }
  if (prefix === 0) {
    throw new TrustedProxiesConfigError(
      `"${entry}" trusts every address; list the proxy networks instead`,
    );
  }
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
    .split(ClientIpLimits.LIST_SEPARATOR)
    .map((hop) => normalizeIp(hop))
    .filter((hop): hop is string => hop !== null)
    .slice(-ClientIpLimits.MAX_HOPS);
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    if (!isTrusted(hops[index], trusted)) {
      return addressBytes(hops[index]) ? hops[index] : null;
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
  if (!candidate.includes(ClientIpLimits.CIDR_SEPARATOR)) {
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
  const withoutPort = unbracketed.match(IPV4_WITH_PORT)?.[1] ?? unbracketed;
  const mapped = withoutPort.match(IPV4_MAPPED_IPV6);
  return (mapped?.[1] ?? withoutPort).toLowerCase();
}

function cidrContains(ip: string, cidr: string): boolean {
  const [base, prefixText] = cidr.split(ClientIpLimits.CIDR_SEPARATOR);
  const prefix = Number(prefixText);
  if (!base || !Number.isInteger(prefix) || prefix <= 0) {
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
    return ipv4Bytes(value);
  }
  return ipv6Bytes(value);
}

function ipv4Bytes(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4 || !parts.every((part) => IPV4_OCTET.test(part))) {
    return null;
  }
  const bytes = parts.map((part) => Number(part));
  return bytes.every((byte) => byte <= 255) ? bytes : null;
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
  if (missing < 0 || (halves.length === 1 && missing !== 0)) {
    return null;
  }
  const groups = [...head, ...Array(missing).fill("0"), ...tail];
  return groups.length === 8 ? groups : null;
}

function groupBytes(group: string): [number, number] | null {
  if (!IPV6_GROUP.test(group)) {
    return null;
  }
  const parsed = Number.parseInt(group, 16);
  return [(parsed >> 8) & 0xff, parsed & 0xff];
}
