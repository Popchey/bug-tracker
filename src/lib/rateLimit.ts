const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key    Unique key (e.g. "login:user@example.com")
 * @param limit  Max allowed requests per window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();

    // Prune expired entries to prevent unbounded memory growth
    for (const [k, v] of store) {
        if (v.resetAt < now) store.delete(k);
    }

    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (entry.count >= limit) return false;

    entry.count++;
    return true;
}
