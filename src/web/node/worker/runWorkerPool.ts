import { cpus } from 'node:os';
import { Worker, type WorkerOptions } from 'node:worker_threads';
import { partitionInto } from '../../../core/array';

export interface WorkerChunkInfo {
  /** Zero-based index of this worker within the pool. */
  index: number;
  /** Total number of workers spawned for this run. */
  total: number;
  /** Number of items handed to this worker. */
  size: number;
}

export interface RunWorkerPoolOptions<TItem, TData = { items: TItem[] }> {
  /**
   * How many workers to spawn. Defaults to the number of logical CPUs. The pool
   * never spawns more workers than there are items, so tiny inputs stay cheap.
   */
  workerCount?: number;
  /**
   * Builds the `workerData` payload handed to each worker from its slice of the
   * items. Defaults to `{ items: chunk }`. Use this to attach shared config, e.g.
   * `({ items }) => ({ items, outDir, dryRun })`.
   */
  workerData?: (chunk: TItem[], info: WorkerChunkInfo) => TData;
  /** Extra `node:worker_threads` Worker options merged into every spawn. */
  workerOptions?: WorkerOptions;
  /** Called once per worker right before it is spawned (handy for logging). */
  onSpawn?: (info: WorkerChunkInfo) => void;
}

/**
 * Fans an array of `items` out across a pool of worker threads and collects the
 * message each worker posts back.
 *
 * Items are split into at most `workerCount` near-equal buckets (via
 * `partitionInto`), one Worker is spawned per bucket loading `workerPath`, and
 * the promise resolves to an array of the workers' `postMessage` payloads in
 * pool order. Each worker should do its work from `workerData` and call
 * `parentPort.postMessage(result)` exactly once.
 *
 * Failure semantics: if any worker emits an `error` or exits with a non-zero
 * code, the returned promise rejects with that error — and **all** workers are
 * terminated before it settles, success or failure, so none leak. (This is the
 * bug-prone part hand-rolled pools usually get wrong.)
 *
 * @example
 * const results = await runWorkerPool(files, new URL('./encodeWorker.ts', import.meta.url), {
 *   workerCount: 8,
 *   workerData: (chunk) => ({ files: chunk, outDir }),
 * });
 */
export const runWorkerPool = async <TResult = unknown, TItem = unknown, TData = { items: TItem[] }>(
  items: TItem[],
  workerPath: string | URL,
  options: RunWorkerPoolOptions<TItem, TData> = {},
): Promise<TResult[]> => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const requested = options.workerCount ?? cpus().length;
  const workerCount = Math.max(1, Math.min(requested, items.length));
  const buildData = options.workerData ?? ((chunk: TItem[]) => ({ items: chunk }) as unknown as TData);

  const chunks = partitionInto(workerCount)(items);
  const total = chunks.length;
  const workers: Worker[] = [];

  try {
    const results = await Promise.all(
      chunks.map((chunk, index) => {
        const info: WorkerChunkInfo = { index, total, size: chunk.length };
        options.onSpawn?.(info);

        const worker = new Worker(workerPath, {
          ...options.workerOptions,
          workerData: buildData(chunk, info),
        });
        workers.push(worker);

        return new Promise<TResult>((resolve, reject) => {
          let settled = false;
          worker.on('message', (result: TResult) => {
            settled = true;
            resolve(result);
          });
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (!settled && code !== 0) {
              reject(new Error(`Worker ${index + 1}/${total} exited with code ${code}`));
            }
          });
        });
      }),
    );
    return results;
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
};
