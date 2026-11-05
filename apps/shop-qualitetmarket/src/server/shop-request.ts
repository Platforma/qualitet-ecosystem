import type { IncomingMessage } from "node:http";

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasSameOrigin(request: IncomingMessage) {
  const origin = request.headers.origin;
  const host =
    request.headers["x-forwarded-host"]?.toString().split(",")[0].trim() ||
    request.headers.host;
  if (!origin || !host) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    const expectedProtocol =
      request.headers["x-forwarded-proto"]?.toString().split(",")[0].trim() ||
      (process.env.NODE_ENV === "production" ? "https" : parsedOrigin.protocol.slice(0, -1));
    return (
      parsedOrigin.host.toLowerCase() === host.toLowerCase() &&
      parsedOrigin.protocol === `${expectedProtocol}:`
    );
  } catch {
    return false;
  }
}

export function getClientIp(request: IncomingMessage) {
  const forwarded = request.headers["x-forwarded-for"]?.toString();
  return (
    request.headers["x-real-ip"]?.toString().trim() ||
    forwarded?.split(",")[0]?.trim() ||
    request.socket.remoteAddress ||
    "unknown"
  );
}
