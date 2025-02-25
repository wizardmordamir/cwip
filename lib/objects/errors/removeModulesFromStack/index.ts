const removeStackLinesIncluding = ['/node_modules/', 'internal/'];

export const removeModulesFromStack = (err) => {
  if (!err.stack) {
    return;
  }
  const newStack = err.stack.split('\n').reduce((acc, line) => {
    if (removeStackLinesIncluding.some((removeLine) => line.includes(removeLine))) {
      return acc;
    }
    if (!line.includes('/')) {
      return acc;
    }
    return [...acc, line];
  }, []);

  err.stack = newStack.join('\n');
  return err;
};
