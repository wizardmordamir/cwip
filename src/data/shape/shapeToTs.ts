import type { ShapeNode } from './types';

export interface ShapeToTsOptions {
  /** Indent unit (default two spaces). */
  indent?: string;
}

const isIdent = (k: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);
const keyToken = (k: string): string => (isIdent(k) ? k : JSON.stringify(k));

const render = (n: ShapeNode, unit: string, indent: string): string => {
  switch (n.kind) {
    case 'unknown':
      return 'unknown';
    case 'null':
      return 'null';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'Date';
    case 'array': {
      const el = render(n.element, unit, indent);
      // Unions need wrapping so `A | B[]` doesn't bind as `A | (B[])`.
      return n.element.kind === 'union' ? `Array<${el}>` : `${el}[]`;
    }
    case 'object': {
      if (n.fields.length === 0) return 'Record<string, never>';
      const inner = indent + unit;
      const lines = n.fields.map(
        (f) => `${inner}${keyToken(f.key)}${f.optional ? '?' : ''}: ${render(f.shape, unit, inner)};`,
      );
      return `{\n${lines.join('\n')}\n${indent}}`;
    }
    case 'union':
      return n.options.map((o) => render(o, unit, indent)).join(' | ');
  }
};

/** Render a shape as an inline TypeScript type expression. */
export const shapeToTs = (shape: ShapeNode, opts: ShapeToTsOptions = {}): string =>
  render(shape, opts.indent ?? '  ', '');

/** `export type Name = <expr>;` */
export const shapeToTypeAlias = (name: string, shape: ShapeNode, opts: ShapeToTsOptions = {}): string =>
  `export type ${name} = ${shapeToTs(shape, opts)};\n`;

/**
 * Emit a named TS declaration for a shape: an `interface` when it's an object
 * (the common "row type" case), otherwise a `type` alias. The minimal emitter
 * behind the capture→types seam; a richer JSON/CSV→TS tool can layer naming and
 * sub-interface extraction on top of `inferShape` + this.
 */
export const shapeToInterface = (name: string, shape: ShapeNode, opts: ShapeToTsOptions = {}): string => {
  if (shape.kind !== 'object') return shapeToTypeAlias(name, shape, opts);
  const unit = opts.indent ?? '  ';
  if (shape.fields.length === 0) return `export interface ${name} {}\n`;
  const lines = shape.fields.map(
    (f) => `${unit}${keyToken(f.key)}${f.optional ? '?' : ''}: ${render(f.shape, unit, unit)};`,
  );
  return `export interface ${name} {\n${lines.join('\n')}\n}\n`;
};
