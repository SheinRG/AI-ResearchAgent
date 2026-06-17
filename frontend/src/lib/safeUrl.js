/**
 * Return `url` only when it is a safe http(s) link, otherwise `fallback`.
 *
 * Web-search results (image URLs, source links) are attacker-influenced, so we
 * never hand a raw URL straight to an `<a href>` / `<img src>`. Restricting to
 * http(s) neutralizes `javascript:`, `data:`, and other schemes that could run
 * on click. Mirrors the defensive fallback already used for citation links.
 */
export function safeUrl(url, fallback = undefined) {
  if (typeof url !== "string") return fallback;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : fallback;
}
