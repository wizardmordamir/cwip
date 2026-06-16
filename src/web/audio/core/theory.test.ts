import { describe, expect, it } from 'bun:test';
import { degreeToMidi, MODE_INTERVALS, midiToFreq, pcToFreq } from './theory';

describe('midiToFreq', () => {
  it('anchors A4 = 440 Hz at MIDI 69', () => {
    expect(midiToFreq(69)).toBe(440);
  });

  it('uses equal temperament (octave = ×2, semitone = 2^(1/12))', () => {
    expect(midiToFreq(81)).toBeCloseTo(880, 9); // one octave up
    expect(midiToFreq(57)).toBeCloseTo(220, 9); // one octave down
    expect(midiToFreq(60)).toBeCloseTo(261.6255653005986, 9); // middle C
  });

  it('pcToFreq is an alias of midiToFreq', () => {
    expect(pcToFreq).toBe(midiToFreq);
  });
});

describe('MODE_INTERVALS', () => {
  it('keeps ascending pitch-class sets within an octave', () => {
    for (const ivals of Object.values(MODE_INTERVALS)) {
      expect(ivals[0]).toBe(0); // rooted at 0
      for (let i = 1; i < ivals.length; i++) {
        expect(ivals[i]).toBeGreaterThan(ivals[i - 1]); // strictly ascending
      }
      expect(ivals[ivals.length - 1]).toBeLessThan(12); // within one octave
    }
  });

  it('treats `major` as an exact alias of `ionian`', () => {
    expect([...MODE_INTERVALS.major]).toEqual([...MODE_INTERVALS.ionian]);
  });

  it('matches the canonical diatonic / pentatonic / whole-tone tables', () => {
    expect([...MODE_INTERVALS.dorian]).toEqual([0, 2, 3, 5, 7, 9, 10]);
    expect([...MODE_INTERVALS.phrygian]).toEqual([0, 1, 3, 5, 7, 8, 10]);
    expect([...MODE_INTERVALS.pentatonicMinor]).toEqual([0, 3, 5, 7, 10]);
    expect([...MODE_INTERVALS.wholeTone]).toEqual([0, 2, 4, 6, 8, 10]);
    expect([...MODE_INTERVALS.harmonicMinor]).toEqual([0, 2, 3, 5, 7, 8, 11]);
  });
});

describe('degreeToMidi', () => {
  const dorian = MODE_INTERVALS.dorian;

  it('maps degree 0 to the root', () => {
    expect(degreeToMidi(60, dorian, 0)).toBe(60);
  });

  it('wraps a full scale length up one octave', () => {
    expect(degreeToMidi(60, dorian, 7)).toBe(72); // 7 degrees = +12
  });

  it('handles negative degrees across the octave seam', () => {
    expect(degreeToMidi(60, dorian, -1)).toBe(58); // last degree, octave below
  });

  it('always lands on an in-scale pitch class', () => {
    const root = 48;
    const pcs = new Set(dorian.map((iv) => (root + iv) % 12));
    for (let d = -14; d <= 14; d++) {
      expect(pcs.has(((degreeToMidi(root, dorian, d) % 12) + 12) % 12)).toBe(true);
    }
  });
});
