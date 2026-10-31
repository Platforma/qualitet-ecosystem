export async function readJsonBody(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    return {
      ok: false,
      response: Response.json(
        { error: "Żądanie jest zbyt duże." },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return {
      ok: false,
      response: Response.json(
        { error: "Nieprawidłowe żądanie JSON." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const decoder = new TextDecoder();
  let text = "";
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return {
          ok: false,
          response: Response.json(
            { error: "Żądanie jest zbyt duże." },
            { status: 413, headers: { "Cache-Control": "no-store" } },
          ),
        };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Nie udało się odczytać żądania." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Nieprawidłowe żądanie JSON." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
}
