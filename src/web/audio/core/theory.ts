// Pure music theory — the shared pitch kernel: equal-tempered MIDI→Hz, the canonical
// diatonic interval tables, and scale-degree → MIDI mapping. ZERO Web APIs, ZERO clock/RNG:
// every function is a pure mapping of integers, so the in-key guarantee that keeps generative
// soundtracks consonant is unit-testable. The SYNTH owns frequencies; this is where pitch
// classes become Hz (A4 = 440).
//
// Extracted from cursedalchemy's Lullabyte (`shared/lullabyte/theory.ts`) and Comet
// (`comet/audio/musicTheory.ts`): `midiToFreq` and the degree→MIDI algorithm were identical
// in both, and their interval tables were the same numbers under different enum keys. Each
// consumer keeps its own enum-keyed table (composed from `MODE_INTERVALS` here) and any
// consumer-specific voice-leading / snapping helpers, whose semantics legitimately differ.

const A4_MIDI = 69;
const A4_FREQ = 440;

/**
 * Semitone offsets from the root for one octave of each church mode / common scale, as
 * ascending pitch-class sets. Both consumers' scale tables are composed from these arrays so
 * the actual interval numbers live in exactly one place and can never silently drift apart.
 * `ionian`/`major` and the rest are the canonical names; alias keys point at the same array.
 */
export const MODE_INTERVALS = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  /** alias of `ionian` (same intervals) — for consumers that name the major scale "major". */
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
} as const satisfies Record<string, readonly number[]>;

export type ModeName = keyof typeof MODE_INTERVALS;

/** Equal-tempered MIDI note number → frequency in Hz (A4 = 440). The synth-side mapping. */
export const midiToFreq = (midi: number): number => A4_FREQ * 2 ** ((midi - A4_MIDI) / 12);

/** Alias kept for theory-side code that reads in "pitch class → frequency" terms. */
export const pcToFreq = midiToFreq;

/**
 * Map a (possibly negative or out-of-range) scale degree to a MIDI note over an explicit
 * interval set. Degree N wraps across octaves: one scale length steps up an octave. Always
 * lands in-key. Pass the interval array for the active scale (e.g. `MODE_INTERVALS.dorian`).
 */
export const degreeToMidi = (rootMidi: number, intervals: readonly number[], degree: number): number => {
  const n = intervals.length;
  const octave = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return rootMidi + octave * 12 + intervals[idx];
};
