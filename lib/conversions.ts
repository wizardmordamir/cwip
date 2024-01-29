import { doMath, multiply } from './math';

export const bytesInKB = 1_024;
export const bytesInMB = 1_048_576;
export const bytesInGB = 1_073_741_824;
export const KBInMB = 1_024;
export const KBInGB = 1_048_576;
export const MBInKB = 0.0009765625;
export const MBInGB = 1_024;
export const GBInKB = 9.5367431640625e-7;
export const GBInMB = 0.0009765625;

export type ConvertType = 'bytes' | 'kb' | 'mb' | 'gb';

const byteMap = {
  bytes: 1,
  kb: bytesInKB,
  mb: bytesInMB,
  gb: bytesInGB,
};

export const convertToBytes = (val: number, convertType: ConvertType): number =>
  multiply(val, byteMap[convertType]);

export const convertBytesTo = (bytes: number, convertType: ConvertType): number =>
  doMath('divide', bytes, byteMap[convertType]);

export const convertBytesToKB = (bytes: number): number => convertBytesTo(bytes, 'kb');
export const convertBytesToMB = (bytes: number): number => convertBytesTo(bytes, 'mb');
export const convertBytesToGB = (bytes: number): number => convertBytesTo(bytes, 'gb');

export const convertKBToBytes = (bytes: number): number => convertToBytes(bytes, 'kb');
export const convertMBToBytes = (bytes: number): number => convertToBytes(bytes, 'mb');
export const convertGBToBytes = (bytes: number): number => convertToBytes(bytes, 'gb');

export const convertKBToMB = (val: number): number => convertBytesToMB(convertToBytes(val, 'kb'));
export const convertKBToGB = (val: number): number => convertBytesToGB(convertToBytes(val, 'kb'));
export const convertMBToKB = (val: number): number => convertBytesToKB(convertToBytes(val, 'mb'));
export const convertMBToGB = (val: number): number => convertBytesToGB(convertToBytes(val, 'mb'));
export const convertGBToKB = (val: number): number => convertBytesToKB(convertToBytes(val, 'gb'));
export const convertGBToMB = (val: number): number => convertBytesToMB(convertToBytes(val, 'gb'));
