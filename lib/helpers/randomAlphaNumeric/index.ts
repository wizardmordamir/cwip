export const randomAlpahNumeric = function (length: number) {
  let result = '';
  let options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += options.charAt(Math.floor(Math.random() * options.length));
  }
  return result;
};
