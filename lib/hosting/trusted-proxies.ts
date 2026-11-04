import { BlockList, isIP } from "node:net";

/** Environment variables that configure visitor-address forwarding. */
export const ClientIpEnv = Object.freeze({
  TRUSTED_PROXIES: "ENDATIX_TRUSTED_PROXIES",
} as const);

const Limits = Object.freeze({
  /** Hops read from the right of X-Forwarded-For before giving up. */
  MAX_HOPS: 5,
  LIST_SEPARATOR: ",",
} as const);

const IPV4_WITH_PORT = /^(\d+\.\d+\.\d+\.\d+):\d+$/;
const BRACKETED = /^\[([^\]]+)\](?::\d+)?$/;
const BRACKETED_ENTRY = /^\[([^\]]+)\](\/.*)?$/;
const MAPPED_IPV4 = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/;
const PREFIX = /^\d{1,3}$/;

type Family = "ipv4" | "ipv6";

export class TrustedProxiesConfigError extends Error {
  constructor(message: string) {
    super(`${ClientIpEnv.TRUSTED_PROXIES}: ${message}`);
    this.name = "TrustedProxiesConfigError";
  }
}

/** The proxies whose X-Forwarded-For hops Hub skips, parsed once. */
export interface TrustedProxies {
  readonly size: number;
  has(ip: string): boolean;
}

/**
 * Parses a comma-separated list of IPs and CIDRs. Throws
 * {@link TrustedProxiesConfigError} for an entry that is not one, or that
 * trusts every address.
 */
export function parseTrustedProxies(value: string | undefined): TrustedProxies {
  const entries = (value ?? "")
    .split(Limits.LIST_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  // One list per family: BlockList also checks an IPv4 address against IPv6
  // rules (as ::ffff:a.b.c.d), so ::/80 would otherwise trust every IPv4 hop.
  const lists = { ipv4: new BlockList(), ipv6: new BlockList() };
  for (const entry of entries) {
    addEntry(lists, entry);
  }
  return {
    size: entries.length,
    has: (ip) => {
      const family = familyOf(ip);
      return lists[family].check(ip, family);
    },
  };
}

let cached: { raw: string | undefined; result: TrustedProxies | null } | null =
  null;

/**
 * {@link parseTrustedProxies} of `ENDATIX_TRUSTED_PROXIES`, re-parsed only
 * when the value changes. An invalid list yields `null`; `check-environment`
 * reports it at startup.
 */
export function trustedProxiesFromEnv(): TrustedProxies | null {
  const raw = process.env[ClientIpEnv.TRUSTED_PROXIES];
  if (cached !== null && cached.raw === raw) {
    return cached.result;
  }
  cached = { raw, result: parseOrNull(raw) };
  return cached.result;
}

function parseOrNull(raw: string | undefined): TrustedProxies | null {
  try {
    return parseTrustedProxies(raw);
  } catch {
    return null;
  }
}

/**
 * The first hop from the right of X-Forwarded-For that is not a trusted proxy,
 * in canonical form. `null` when the chain is empty, malformed at that hop, or
 * longer than the hops it reads.
 */
export function resolveClientIp(
  forwardedFor: string | null,
  trusted: TrustedProxies,
): string | null {
  const hops = (forwardedFor ?? "")
    .split(Limits.LIST_SEPARATOR)
    .filter((hop) => hop.trim().length > 0)
    .slice(-Limits.MAX_HOPS);
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    const hop = canonicalHop(hops[index]);
    if (!hop || !trusted.has(hop)) {
      return hop;
    }
  }
  return null;
}

function addEntry(lists: Record<Family, BlockList>, entry: string): void {
  const { base, prefixText } = splitEntry(entry);
  const address = canonicalIp(base);
  if (!address) {
    throw new TrustedProxiesConfigError(`"${entry}" is not an IP or CIDR`);
  }
  const family = familyOf(address);
  const list = lists[family];
  if (prefixText === undefined) {
    list.addAddress(address, family);
    return;
  }
  if (family === "ipv4" && isIP(base) === 6) {
    throw new TrustedProxiesConfigError(
      `"${entry}" is an IPv4-mapped network; write it as an IPv4 CIDR`,
    );
  }
  list.addSubnet(address, parsePrefix(entry, prefixText, family), family);
}

function splitEntry(entry: string): { base: string; prefixText?: string } {
  const bracketed = BRACKETED_ENTRY.exec(entry);
  if (bracketed) {
    return { base: bracketed[1], prefixText: bracketed[2]?.slice(1) };
  }
  const parts = entry.split("/");
  return parts.length > 2
    ? { base: "" }
    : { base: parts[0], prefixText: parts[1] };
}

function parsePrefix(entry: string, text: string, family: Family): number {
  const prefix = Number(text);
  const max = family === "ipv4" ? 32 : 128;
  if (!PREFIX.test(text) || prefix > max) {
    throw new TrustedProxiesConfigError(`"${entry}" has an invalid prefix`);
  }
  if (prefix === 0) {
    throw new TrustedProxiesConfigError(
      `"${entry}" trusts every address; list the proxy networks instead`,
    );
  }
  return prefix;
}

function canonicalHop(value: string): string | null {
  const trimmed = value.trim();
  const bracketed = BRACKETED.exec(trimmed)?.[1];
  const ipv4 = IPV4_WITH_PORT.exec(trimmed)?.[1];
  return canonicalIp(bracketed ?? ipv4 ?? trimmed);
}

/** IPv4 as dotted decimal, IPv6 compressed and lower case, mapped IPv4 unwrapped. */
function canonicalIp(value: string): string | null {
  if (value.includes("%")) {
    return null;
  }
  const family = isIP(value);
  if (family === 4) {
    return value;
  }
  if (family !== 6) {
    return null;
  }
  const compressed = new URL(`http://[${value}]`).hostname.slice(1, -1);
  return unmapIpv4(compressed) ?? compressed;
}

function unmapIpv4(ipv6: string): string | null {
  const mapped = MAPPED_IPV4.exec(ipv6);
  if (!mapped) {
    return null;
  }
  const [high, low] = [mapped[1], mapped[2]].map((group) =>
    Number.parseInt(group, 16),
  );
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function familyOf(ip: string): Family {
  return isIP(ip) === 6 ? "ipv6" : "ipv4";
}
