export type Concattable = { concat(arg: any): any };

export const concat =
  <C extends Concattable>(child: C) =>
  <P extends Concattable>(parent: P): any => {
    // Allow P and C to differ
    if (!parent) return child;
    return parent.concat(child);
  };
