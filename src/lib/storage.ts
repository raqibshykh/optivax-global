export function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeParseBody<T>(body: BodyInit | null | undefined, fallback: T): T {
  try {
    if (!body) return fallback;
    const s = typeof body === "string" ? body : String(body);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
