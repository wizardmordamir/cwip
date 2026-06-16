type MonadState<T> = {
  value: T; // The "Snowball" context object
  stopProcessing: boolean;
  errors: any[];
};

export class StateMonad<T> {
  constructor(private readonly state: MonadState<T>) {}

  static unit<V>(v: V): StateMonad<V> {
    return new StateMonad<V>({
      value: v,
      stopProcessing: false,
      errors: [],
    });
  }

  /**
   * Safe extraction of the inner value.
   */
  emit(): T {
    return this.state.value;
  }

  async bind<R>(fn: (v: T) => R | Promise<R> | StateMonad<R> | Promise<StateMonad<R>>): Promise<StateMonad<R>> {
    const currentState = this.state;

    // If already stopped, just pass the failure forward
    if (currentState.stopProcessing) {
      return this as any;
    }

    try {
      const result = await fn(currentState.value);

      // Explicit check for Monad-in-Monad
      if (result instanceof StateMonad) {
        return result;
      }

      // Wrap raw values into the successful state
      return new StateMonad<R>({
        value: result as R,
        stopProcessing: false,
        errors: currentState.errors, // Preserve historical errors
      });
    } catch (err) {
      // Transition to short-circuit track
      return new StateMonad<R>({
        value: currentState.value as any,
        stopProcessing: true,
        errors: [...currentState.errors, err],
      });
    }
  }
}
