/**
 * On local Next dev, Pay calls the same origin so the dev server can proxy
 * them. The browser then does not send a cross-origin preflight to Cloud Run.
 * The copied agent config still uses the public API.
 */
export function keepRequestBase(publicBase: string, hostname?: string): string {
  const host =
    hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  if (host === "localhost" || host === "127.0.0.1") return "";
  return publicBase.replace(/\/$/, "");
}
