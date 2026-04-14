/**
 * Bounded output buffer for PTY sessions.
 * Extracted from cabinet-daemon.ts for testability.
 */

export interface OutputBuffer {
  chunks: string[];
  bytes: number;
}

export function createOutputBuffer(): OutputBuffer {
  return { chunks: [], bytes: 0 };
}

export function pushOutput(
  buf: OutputBuffer,
  data: string,
  maxBytes: number
): void {
  const dataBytes = Buffer.byteLength(data, "utf8");
  // Drop oldest chunks to make room if at limit
  while (
    buf.chunks.length > 0 &&
    buf.bytes + dataBytes > maxBytes
  ) {
    const dropped = buf.chunks.shift()!;
    buf.bytes -= Buffer.byteLength(dropped, "utf8");
  }
  buf.chunks.push(data);
  buf.bytes += dataBytes;
}

export function joinOutput(buf: OutputBuffer): string {
  return buf.chunks.join("");
}
