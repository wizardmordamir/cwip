export const getFunctionName = (fn: any) => {
  if (!fn || typeof fn !== 'function') {
    return undefined;
  }

  if (fn.name?.trim()) {
    return fn.name;
  }

  // For empty names or no name property, return null to make it explicit in logs
  // if you see null in logs, name the function with setFunctionName, or a variable
  return null;
};
