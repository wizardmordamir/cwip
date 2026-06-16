export const sleep = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);
          reject(new Error('Sleep aborted'));
        },
        { once: true },
      );
    }
  });
};
