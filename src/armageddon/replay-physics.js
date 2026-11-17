// Full004C8F80. Restore a body's saved list positions without compacting holes
// or replacing occupied slots. Negative indices use the normal append path.
export function nativeRestorePhysicsMembership(input) {
  const insert = (list, index) => {
    const result = { ...list, entries: [...list.entries] };
    const append = value => {
      if (result.capacity <= result.entries.length) result.capacity *= 2;
      result.entries.push(value);
    };
    if (index < 0) append(input.id);
    else {
      while (result.entries.length <= index) append(null);
      if (result.entries[index] === null) result.entries[index] = input.id;
    }
    return result;
  };
  return {
    all: insert(input.all, input.allIndex),
    category: insert(input.category, input.categoryIndex),
    dirty: 0,
    link: input.links[input.linkIndex],
  };
}
