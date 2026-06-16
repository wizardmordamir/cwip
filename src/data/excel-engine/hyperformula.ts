import { HyperFormula } from 'hyperformula';
import type { CellScalar } from './types';

// GPLv3 usage — registered explicitly so HyperFormula doesn't emit a missing-key
// warning. The engine is server-only and never ships in a distributed artifact.
const HF_CONFIG = { licenseKey: 'gpl-v3' } as const;

export interface FormulaFillResult {
  values: CellScalar[]; // computed value per data row (in order)
  formulas: string[]; // the (relatively-adjusted) formula text per data row
}

// Evaluate a literal Excel formula down a target column using HyperFormula so
// relative references auto-adjust per row exactly like Excel.
//
// - grid: the sheet's current 2D values (0-based), used as the calc context.
// - targetCol0 / firstDataRow0 / lastDataRow0: 0-based target column + data range.
// - formula: e.g. "=SUM(B2:B100)" or "=A2*B2".
// - perRow: when true, the formula is placed at the first data row then copied
//   DOWN (refs shift per row). When false, it's a single aggregate placed in the
//   first data row only; remaining rows are left blank.
export const evalFormulaColumn = (
  grid: CellScalar[][],
  targetCol0: number,
  firstDataRow0: number,
  lastDataRow0: number,
  formula: string,
  perRow: boolean,
): FormulaFillResult => {
  const sheet = 0;
  // HyperFormula wants null for blanks; map empty strings to null so SUM etc. work.
  const data = grid.map((row) => row.map((c) => (c === '' ? null : c)));
  const hf = HyperFormula.buildFromArray(data, HF_CONFIG);
  const f = formula.startsWith('=') ? formula : `=${formula}`;

  hf.setCellContents({ sheet, row: firstDataRow0, col: targetCol0 }, [[f]]);
  if (perRow) {
    hf.copy({
      start: { sheet, row: firstDataRow0, col: targetCol0 },
      end: { sheet, row: firstDataRow0, col: targetCol0 },
    });
    for (let r = firstDataRow0 + 1; r <= lastDataRow0; r++) {
      hf.paste({ sheet, row: r, col: targetCol0 });
    }
  }

  const values: CellScalar[] = [];
  const formulas: string[] = [];
  for (let r = firstDataRow0; r <= lastDataRow0; r++) {
    const onlyFirst = !perRow && r !== firstDataRow0;
    if (onlyFirst) {
      values.push(null);
      formulas.push('');
      continue;
    }
    const v = hf.getCellValue({ sheet, row: r, col: targetCol0 });
    const fx = hf.getCellFormula({ sheet, row: r, col: targetCol0 });
    // HF errors come back as objects with a `.value` like '#DIV/0!'.
    const scalar: CellScalar =
      v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        ? (v as CellScalar)
        : String((v as { value?: unknown })?.value ?? v);
    values.push(scalar);
    formulas.push(fx ?? f);
  }
  hf.destroy();
  return { values, formulas };
};
