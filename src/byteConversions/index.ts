import { doMath, multiply } from '../math';

export const bytesInKB = 1_024;
export const bytesInMB = 1_048_576;
export const bytesInGB = 1_073_741_824;
export const bytesInTB = 1_099_511_627_776;
export const KBInMB = 1_024;
export const KBInGB = 1_048_576;
export const KBInTB = 1_073_741_824;
export const MBInKB = 0.0009765625;
export const MBInGB = 1_024;
export const MBInTB = 1_048_576;
export const GBInKB = 9.5367431640625e-7;
export const GBInMB = 0.0009765625;
export const GBInTB = 1_024;
export const TBInKB = 9.313225746154785e-10;
export const TBInMB = 9.5367431640625e-7;
export const TBInGB = 0.0009765625;

export type ConvertType = 'bytes' | 'kb' | 'mb' | 'gb' | 'tb';

const byteMap = { bytes: 1, kb: bytesInKB, mb: bytesInMB, gb: bytesInGB, tb: bytesInTB };

export const convertToBytes = (val: number, convertType: ConvertType): number =>
  multiply(val, byteMap[convertType]);

export const convertBytesTo = (bytes: number, convertType: ConvertType): number =>
  doMath('divide', bytes, byteMap[convertType]);

export const convertBytesToKB = (val: number): number => convertBytesTo(val, 'kb');
export const convertBytesToMB = (val: number): number => convertBytesTo(val, 'mb');
export const convertBytesToGB = (val: number): number => convertBytesTo(val, 'gb');
export const convertBytesToTB = (val: number): number => convertBytesTo(val, 'tb');

export const convertKBToBytes = (val: number): number => convertToBytes(val, 'kb');
export const convertMBToBytes = (val: number): number => convertToBytes(val, 'mb');
export const convertGBToBytes = (val: number): number => convertToBytes(val, 'gb');
export const convertTBToBytes = (val: number): number => convertToBytes(val, 'tb');

export const convertKBToMB = (val: number): number => convertBytesToMB(convertToBytes(val, 'kb'));
export const convertKBToGB = (val: number): number => convertBytesToGB(convertToBytes(val, 'kb'));
export const convertKBToTB = (val: number): number => convertBytesToTB(convertToBytes(val, 'kb'));
export const convertMBToKB = (val: number): number => convertBytesToKB(convertToBytes(val, 'mb'));
export const convertMBToGB = (val: number): number => convertBytesToGB(convertToBytes(val, 'mb'));
export const convertMBToTB = (val: number): number => convertBytesToTB(convertToBytes(val, 'mb'));
export const convertGBToKB = (val: number): number => convertBytesToKB(convertToBytes(val, 'gb'));
export const convertGBToMB = (val: number): number => convertBytesToMB(convertToBytes(val, 'gb'));
export const convertGBToTB = (val: number): number => convertBytesToTB(convertToBytes(val, 'gb'));
export const convertTBToKB = (val: number): number => convertBytesToKB(convertToBytes(val, 'tb'));
export const convertTBToMB = (val: number): number => convertBytesToMB(convertToBytes(val, 'tb'));
export const convertTBToGB = (val: number): number => convertBytesToGB(convertToBytes(val, 'tb'));
