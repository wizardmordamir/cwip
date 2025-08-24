export const isAxiosError = (err) => !!err.response || err.isAxiosError === true;
