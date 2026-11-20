import { createHash } from "node:crypto";
import { FULL_FIXTURES } from "./fixture-sample.js";

// Executable fixtures record a SHA-256 of the whole emulated memory at every
// host callback. Hashing megabytes thousands of times dominates those tests,
// so everyday runs hash an evenly spaced subset of callbacks (always the first
// and last); every callback's name and arguments, and the final memory hash,
// are still compared in full. Memory state is cumulative, so a diverging write
// stays visible at the next sampled callback. FULL_FIXTURES hashes every one.
//
// sampledHash(expectedCalls, limit, snapshot) returns hashAt(index): the real
// snapshot() for sampled indices, otherwise the recorded hash of that row (the
// last element), so the row comparison checks only its name and arguments.
export function sampledHash(expectedCalls, limit, snapshot, position = -1) {
  const total = expectedCalls.length;
  if (FULL_FIXTURES || total <= limit) return () => snapshot();
  const sampled = new Set();
  for (let i = 0; i < limit; i++) sampled.add(Math.round((i * (total - 1)) / (limit - 1)));
  return (index) => {
    const row = expectedCalls[index];
    if (sampled.has(index) || !Array.isArray(row)) return snapshot();
    return row.at(position);
  };
}

// memoDigest(parts) returns a snapshot() that hashes the buffers listed by
// parts() with SHA-256, but reuses the previous digest when every buffer is
// byte-for-byte unchanged since the last call. Comparing memory is an order
// of magnitude cheaper than hashing it, and many host callbacks only read, so
// this keeps exact per-callback hashes at a fraction of the cost.
export function memoDigest(parts) {
  let copies = null, digest = null;
  return () => {
    const list = parts().map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
    if (copies && copies.length === list.length && list.every((p, i) => p.equals(copies[i]))) return digest;
    const hash = createHash("sha256");
    for (const p of list) hash.update(p);
    digest = hash.digest("hex");
    copies = list.map((p, i) => {
      const previous = copies?.[i];
      if (previous && previous.length === p.length) { p.copy(previous); return previous; }
      return Buffer.from(p);
    });
    return digest;
  };
}
