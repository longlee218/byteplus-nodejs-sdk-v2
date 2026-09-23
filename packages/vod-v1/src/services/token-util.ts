// Shared helpers for the local URL/token builders (playback, drm, subtitle…).

/** UTF-8 base64, matching Python `base64.b64encode(s.encode()).decode()`. */
export function base64(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64");
}

/**
 * Spread a request into a params object and add `X-Expires` only when
 * `expire > 0` — the shape every Python token builder passes to `get_sign_url`.
 */
export function withExpires(req: object, expire: number): Record<string, unknown> {
  const params: Record<string, unknown> = { ...(req as Record<string, unknown>) };
  if (expire > 0) params["X-Expires"] = String(expire);
  return params;
}
