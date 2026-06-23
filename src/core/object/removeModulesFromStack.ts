const removeStackLinesIncluding = ['/node_modules/', 'internal/'];

export const removeModulesFromStack = (err: any) => {
  // Null-safe: a nullish error (or one with no `.stack`) is returned as-is
  // (undefined) rather than throwing — this is a public util and may be handed
  // anything caught.
  if (!err?.stack) {
    return;
  }
  const newStack = err.stack.split('\n').reduce((acc: string[], line: string) => {
    if (removeStackLinesIncluding.some((removeLine) => line.includes(removeLine))) {
      return acc;
    }
    if (!line.includes('/')) {
      return acc;
    }
    // biome-ignore lint: allowing spread operator for better readability
    return [...acc, line];
  }, []);

  err.stack = newStack.join('\n');
  return err;
};
