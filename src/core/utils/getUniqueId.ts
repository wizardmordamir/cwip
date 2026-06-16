import { randomBytes } from 'node:crypto';

export const getUniqueId = (length = 12) => {
  return randomBytes(Math.ceil(length * 0.75)) // 0.75 because base64 encoding
    .toString('base64') // convert to base64
    .replace(/[+/=]/g, '') // remove special characters
    .slice(0, length) // trim to desired length
    .toLowerCase(); // match the lowercase style
};

// Example usage:
// const id = getUniqueId(); // e.g., "3gbspjkcyxme8m"
