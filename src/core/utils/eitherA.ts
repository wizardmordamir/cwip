import { callOrReturnIt } from './callOrReturnIt';

export const eitherA =
  (evaluater: (check: any) => Promise<boolean>, actionIfTrue: any, actionIfFalse: any) => (item: any) =>
    evaluater(item).then((result: boolean) =>
      result ? callOrReturnIt(actionIfTrue, item) : callOrReturnIt(actionIfFalse, item),
    );
