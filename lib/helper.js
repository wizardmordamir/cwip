export const randomAlpahNumeric = function (len) {
  let result = '';
  let options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < len; i++) {
    result += options.charAt(Math.floor(Math.random() * options.length));
  }
  return result;
};

export const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
