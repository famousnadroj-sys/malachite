export type LimitedBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" | "invalid_utf8" | "read_error" };

export const MAX_WORKER_BODY_BYTES = 8192;

/**
 * Read a request body without buffering unbounded input.
 * Content-Length is an early hint only; the stream byte count is authoritative.
 */
export async function readLimitedUtf8Body(
  request: Request,
  maxBytes = MAX_WORKER_BODY_BYTES,
): Promise<LimitedBodyResult> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    try { await request.body?.cancel("request body too large"); } catch { /* already consumed */ }
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try { await reader.cancel("request body too large"); } catch { /* stream may already be closed */ }
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    try { await reader.cancel("request body read failed"); } catch { /* ignore cancellation failure */ }
    return { ok: false, reason: "read_error" };
  } finally {
    try { reader.releaseLock(); } catch { /* reader may already be released */ }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, reason: "invalid_utf8" };
  }
}
