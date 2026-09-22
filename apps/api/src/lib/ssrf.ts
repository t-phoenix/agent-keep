import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "../errors.js";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("fe80")) return true; // link-local
  return false;
}

export function assertSafeUrlString(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("ssrf_blocked", "Invalid URL", { reason: "parse" });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("ssrf_blocked", "Only http(s) allowed", { reason: "protocol" });
  }
  if (url.username || url.password) {
    throw new AppError("ssrf_blocked", "URL credentials not allowed", { reason: "userinfo" });
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new AppError("ssrf_blocked", "Hostname blocked", { reason: "hostname" });
  }
  if (isIP(host) === 4 && isPrivateIpv4(host)) {
    throw new AppError("ssrf_blocked", "Private IP blocked", { reason: "ip" });
  }
  if (isIP(host) === 6 && isPrivateIpv6(host)) {
    throw new AppError("ssrf_blocked", "Private IP blocked", { reason: "ip" });
  }
  return url;
}

/** DNS → IP check (fail closed). */
export async function assertSafeUrlResolved(raw: string): Promise<URL> {
  const url = assertSafeUrlString(raw);
  if (isIP(url.hostname)) return url;
  let records: string[];
  try {
    const res = await lookup(url.hostname, { all: true });
    records = res.map((r) => r.address);
  } catch {
    throw new AppError("ssrf_blocked", "DNS lookup failed", { reason: "dns" });
  }
  if (records.length === 0) {
    throw new AppError("ssrf_blocked", "No DNS records", { reason: "dns" });
  }
  for (const ip of records) {
    if (isIP(ip) === 4 && isPrivateIpv4(ip)) {
      throw new AppError("ssrf_blocked", "Resolved to private IP", { reason: "dns_ip", ip });
    }
    if (isIP(ip) === 6 && isPrivateIpv6(ip)) {
      throw new AppError("ssrf_blocked", "Resolved to private IP", { reason: "dns_ip", ip });
    }
  }
  return url;
}
