// cwip/audio/testing — shared Web Audio test doubles.
//
// Provides recording fakes (FakeParam / FakeNode / FakeAudioContext) that capture
// every node, connection, and AudioParam operation so specs can assert bus-graph
// wiring, the ramp-not-bare-set discipline, voice scheduling, and clean teardown
// WITHOUT a real Web Audio implementation. Test-only — nothing in the app imports
// from this subpath.
//
// This is a deliberate SUPERSET of what each game needs:
//   • comet wraps this and adds its own fakeTransport / fakeStorage helpers.
//   • lullabyte re-exports this directly (it covers the full worklet simulation).
//   • Wilds tests are pure-logic and don't need a fake context yet.
//
// Game-specific assert helpers (activeOscillators for comet) live here when they
// are generic enough to be useful elsewhere; truly bespoke ones stay in the game.

export interface ParamOp {
  method:
    | 'setValueAtTime'
    | 'linearRampToValueAtTime'
    | 'exponentialRampToValueAtTime'
    | 'setTargetAtTime'
    | 'cancelScheduledValues';
  value: number;
  when: number;
}

export class FakeParam {
  value: number;
  ops: ParamOp[] = [];
  constructor(initial = 0) {
    this.value = initial;
  }
  setValueAtTime(value: number, when: number) {
    this.value = value;
    this.ops.push({ method: 'setValueAtTime', value, when });
    return this;
  }
  linearRampToValueAtTime(value: number, when: number) {
    this.value = value;
    this.ops.push({ method: 'linearRampToValueAtTime', value, when });
    return this;
  }
  exponentialRampToValueAtTime(value: number, when: number) {
    this.value = value;
    this.ops.push({ method: 'exponentialRampToValueAtTime', value, when });
    return this;
  }
  setTargetAtTime(value: number, when: number, tc: number) {
    this.value = value;
    this.ops.push({ method: 'setTargetAtTime', value, when });
    void tc;
    return this;
  }
  cancelScheduledValues(when: number) {
    this.ops.push({ method: 'cancelScheduledValues', value: this.value, when });
    return this;
  }
}

export class FakeNode {
  type = '';
  params: Record<string, FakeParam> = {};
  outputs: FakeNode[] = [];
  /** Number of disconnect() calls (more informative than a boolean). */
  disconnectCount = 0;
  /** Backward-compat boolean view of disconnectCount. */
  get disconnected() {
    return this.disconnectCount > 0;
  }
  started = false;
  stopped = false;
  startTime = -1;
  stopTime = Number.POSITIVE_INFINITY;
  onended: (() => void) | null = null;
  buffer: unknown = null;
  loop = false;
  /** WaveShaper curve / oversample (set by soft-clip nodes). */
  curve: Float32Array | null = null;
  oversample = 'none';
  /** Custom PeriodicWave assigned via setPeriodicWave (piano/bell timbres). */
  periodicWave: unknown = null;
  /** AudioParams this node modulates (FM/LFO): node.connect(param). Recorded, not a graph edge. */
  modTargets: FakeParam[] = [];
  // DynamicsCompressor scalar AudioParams — plain fields here (real API has AudioParams).
  threshold = new FakeParam(-24);
  knee = new FakeParam(30);
  ratio = new FakeParam(12);
  attack = new FakeParam(0.003);
  release = new FakeParam(0.25);

  constructor(
    public kind: string,
    paramNames: string[] = [],
    initial: Record<string, number> = {},
  ) {
    for (const n of paramNames) this.params[n] = new FakeParam(initial[n] ?? 0);
  }

  // Param accessors the engine touches directly (node.gain, node.frequency, …).
  get gain() {
    return this.params.gain;
  }
  get frequency() {
    return this.params.frequency;
  }
  get detune() {
    return this.params.detune;
  }
  get Q() {
    return this.params.Q;
  }
  get pan() {
    return this.params.pan;
  }
  get delayTime() {
    return this.params.delayTime;
  }
  get playbackRate() {
    return this.params.playbackRate;
  }

  setPeriodicWave(wave: unknown) {
    this.periodicWave = wave;
    this.type = 'custom';
  }
  /** node.connect(param) is FM/LFO modulation — recorded separately, not a graph edge. */
  connect(dest: FakeNode | FakeParam) {
    if (dest instanceof FakeParam) {
      this.modTargets.push(dest);
      return dest;
    }
    this.outputs.push(dest);
    return dest;
  }
  disconnect(target?: FakeNode) {
    this.disconnectCount++;
    if (target) this.outputs = this.outputs.filter((o) => o !== target);
    else this.outputs = [];
  }
  start(when = 0) {
    this.started = true;
    this.startTime = when;
  }
  stop(when = 0) {
    this.stopped = true;
    this.stopTime = when;
  }
}

export interface FakeContextOpts {
  /** Make `audioWorklet.addModule` reject (simulates a missing/broken worklet). */
  failWorklet?: boolean;
  /** Omit the `audioWorklet` member entirely (older browser; no AudioWorklet at all). */
  noWorklet?: boolean;
}

export class FakeAudioContext {
  currentTime = 0;
  sampleRate = 48000;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  destination = new FakeNode('destination');
  nodes: FakeNode[] = [];
  closed = false;
  addedModules: string[] = [];
  workletNodes: FakeNode[] = [];
  audioWorklet?: { addModule(url: string): Promise<void> };

  constructor(opts: FakeContextOpts = {}) {
    if (!opts.noWorklet) {
      this.audioWorklet = {
        addModule: (url: string) => {
          this.addedModules.push(url);
          return opts.failWorklet ? Promise.reject(new Error('worklet load failed')) : Promise.resolve();
        },
      };
    }
  }

  private make(kind: string, paramNames: string[], initial: Record<string, number> = {}) {
    const n = new FakeNode(kind, paramNames, initial);
    this.nodes.push(n);
    return n;
  }

  createGain() {
    return this.make('gain', ['gain'], { gain: 1 });
  }
  createOscillator() {
    return this.make('oscillator', ['frequency', 'detune'], { frequency: 440, detune: 0 });
  }
  createBiquadFilter() {
    return this.make('biquad', ['frequency', 'Q', 'gain', 'detune'], {
      frequency: 350,
      Q: 1,
      gain: 0,
      detune: 0,
    });
  }
  createDelay(_maxSeconds = 1) {
    return this.make('delay', ['delayTime'], { delayTime: 0 });
  }
  createStereoPanner() {
    // kind = 'panner' (not 'stereoPanner') so byKind('panner') assertions work.
    return this.make('panner', ['pan'], { pan: 0 });
  }
  createDynamicsCompressor() {
    return this.make('compressor', []);
  }
  createBufferSource() {
    return this.make('bufferSource', ['playbackRate', 'detune'], { playbackRate: 1, detune: 0 });
  }
  createWaveShaper() {
    return this.make('waveshaper', []);
  }
  createPeriodicWave(real: Float32Array | number[], imag: Float32Array | number[]) {
    return { real, imag };
  }
  /** AnalyserNode fake — reads return flat/centred buffers; rAF never runs under bun:test. */
  createAnalyser() {
    const n = this.make('analyser', []);
    return Object.assign(n, {
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getByteFrequencyData: (a: Uint8Array) => a.fill(0),
      getByteTimeDomainData: (a: Uint8Array) => a.fill(128),
      getFloatTimeDomainData: (a: Float32Array) => a.fill(0),
      getFloatFrequencyData: (a: Float32Array) => a.fill(-100),
    });
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return { length, sampleRate, numberOfChannels: 1, getChannelData: () => data };
  }
  resume() {
    if (this.state !== 'closed') this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    this.closed = true;
    return Promise.resolve();
  }
  /** Create a fake AudioWorkletNode (only valid after addModule succeeded). */
  makeWorkletNode(): FakeNode {
    const n = new FakeNode('audioWorklet');
    this.workletNodes.push(n);
    this.nodes.push(n);
    return n;
  }

  // ── Test helpers ─────────────────────────────────────────────────────────────

  byKind(kind: string): FakeNode[] {
    return this.nodes.filter((n) => n.kind === kind);
  }
  /** Oscillators whose scheduled stop is still in the future at `t` (audibly active). */
  activeOscillators(t: number): FakeNode[] {
    return this.nodes.filter((n) => n.kind === 'oscillator' && n.started && n.stopTime > t);
  }
  /** Does a path of connect()s lead from `from` to `to`? (graph wiring assertions) */
  reaches(from: FakeNode, to: FakeNode): boolean {
    const seen = new Set<FakeNode>();
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      if (n === to) return true;
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...n.outputs);
    }
    return false;
  }
}

export const makeFakeContext = (opts: FakeContextOpts = {}): FakeAudioContext => new FakeAudioContext(opts);
