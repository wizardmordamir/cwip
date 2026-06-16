import { callOrReturnIt } from './callOrReturnIt';

export const ifItA = (evaluater: (check: any) => Promise<boolean>, action: (item: any) => any) => (item: any) =>
  callOrReturnIt(evaluater, item).then((result: boolean) => (result ? callOrReturnIt(action, item) : item));
