import { readLimitedUtf8Body } from "./body.ts";

Deno.test("accepts a body at the exact 8 KiB limit", async () => {
  const text = "a".repeat(8192);
  const request = new Request("https://worker.test/", { method: "POST", body: text });
  const result = await readLimitedUtf8Body(request);
  if (!result.ok || result.text !== text) throw new Error("exact_limit_body_not_accepted");
});

Deno.test("rejects a declared body larger than 8 KiB before parsing", async () => {
  const request = new Request("https://worker.test/", {
    method: "POST",
    headers: { "content-length": "8193" },
    body: "x",
  });
  const result = await readLimitedUtf8Body(request);
  if (result.ok || result.reason !== "too_large") throw new Error("oversized_content_length_not_rejected");
});

Deno.test("rejects a streamed body larger than 8 KiB without Content-Length", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(8192));
      controller.enqueue(new Uint8Array([1]));
      controller.close();
    },
  });
  const request = new Request("https://worker.test/", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  const result = await readLimitedUtf8Body(request);
  if (result.ok || result.reason !== "too_large") throw new Error("streamed_oversize_body_not_rejected");
});

Deno.test("counts UTF-8 bytes rather than JavaScript characters", async () => {
  const text = "é".repeat(4096);
  const request = new Request("https://worker.test/", { method: "POST", body: text });
  const result = await readLimitedUtf8Body(request);
  if (!result.ok || result.text !== text) throw new Error("valid_multibyte_body_at_limit_rejected");
});

Deno.test("rejects invalid UTF-8", async () => {
  const request = new Request("https://worker.test/", {
    method: "POST",
    body: new Uint8Array([0xff, 0xfe]),
  });
  const result = await readLimitedUtf8Body(request);
  if (result.ok || result.reason !== "invalid_utf8") throw new Error("invalid_utf8_body_not_rejected");
});
