export const extractDistinctMappings = (values: string[], valuesMap: Record<string, string>) => {
  const uniqueValues: Set<string> = new Set();

  const stringValues = values.filter((value) => value && typeof value === 'string');

  for (let i = 0; i < stringValues.length; i++) {
    const value = stringValues[i];

    if (valuesMap[value]) {
      uniqueValues.add(valuesMap[value]);
    }
  }

  return Array.from(uniqueValues);
};
