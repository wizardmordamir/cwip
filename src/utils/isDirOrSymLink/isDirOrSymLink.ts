import { isSymLink, isSymLinkSync } from '../isSymLink/isSymLink';
import { isDir, isDirSync } from '../isDir/isDir';

export const isDirOrSymLinkSync = (path: string): boolean => {
  return isDirSync(path) || isSymLinkSync(path);
};

export const isDirOrSymLink = async (path: string): Promise<boolean> => {
  return isDir(path) || isSymLink(path);
};
