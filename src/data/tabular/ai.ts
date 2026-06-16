import { parseCsv, serializeCsv } from './csv';
import type { TabularTable } from './types';

/**
 * "Send this prompt to the LLM, get the reply text back." Injected by the
 * caller's IO layer so the engine stays decoupled from config/network and the
 * `askAi` step is trivially mockable in tests.
 */
export type AiComplete = (prompt: string) => Promise<string>;

/** The prompt: the current data as CSV + the user's question + strict output rules. */
export const buildAskPrompt = (table: TabularTable, question: string, format: 'csv' | 'json'): string => {
  const shape =
    format === 'json'
      ? 'a JSON array of row objects whose keys are the column names'
      : 'CSV with a header row (quote any cell containing a comma, quote, or newline)';
  return [
    'You are transforming a spreadsheet. Here is the current data as CSV (the first row is the header):',
    '',
    serializeCsv(table).trimEnd(),
    '',
    `Task: ${question}`,
    '',
    `Return ONLY the full updated dataset as ${shape}. Output just the data — no explanation, no commentary, no markdown code fences.`,
  ].join('\n');
};

/** Pull data out of a reply: the first fenced code block if present, else the trimmed text. */
const extractData = (text: string): string => {
  const fenced = text.match(/```(?:csv|json)?\s*\n([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
};

const tableFromJson = (body: string): TabularTable => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('tabular askAi: the AI reply was not valid JSON');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('tabular askAi: expected a non-empty JSON array of row objects');
  }
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of parsed) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          columns.push(key);
        }
      }
    }
  }
  const rows = parsed.map((row) => {
    const obj = (row ?? {}) as Record<string, unknown>;
    return columns.map((c) => (obj[c] == null ? '' : String(obj[c])));
  });
  return { columns, rows };
};

/** Parse the AI's reply back into a table, tolerating code fences and stray prose. */
export const parseAiTable = (reply: string, format: 'csv' | 'json'): TabularTable => {
  const body = extractData(reply);
  if (format === 'json') {
    return tableFromJson(body);
  }
  const table = parseCsv(body);
  if (table.columns.length === 0) {
    throw new Error('tabular askAi: the AI reply was not parseable as CSV');
  }
  return table;
};
