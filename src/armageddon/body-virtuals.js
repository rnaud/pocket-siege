import original from "./body-virtuals.json" with { type: "json" };

// Restored objects hold original read-only image addresses, not scene heap
// pointers. Custom/allocated tables still resolve through their owning memory.
export function nativeBodyVirtualEntry(memory, body, offset) {
  const table = memory.get(body);
  return original.entries[table]?.[offset] ?? memory.get(table + offset);
}
