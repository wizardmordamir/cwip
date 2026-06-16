import {
  Component,
  type ComponentType,
  createContext,
  createElement,
  type ErrorInfo,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

/** Props passed to a fallback render-prop / component when an error is caught. */
export interface FallbackProps {
  error: Error;
  resetErrorBoundary: (...args: unknown[]) => void;
}

export interface ErrorBoundaryProps {
  children?: ReactNode;
  /** Static fallback UI. */
  fallback?: ReactNode;
  /** Render-prop fallback that receives the error + a reset function. */
  fallbackRender?: (props: FallbackProps) => ReactNode;
  /** Component fallback that receives `FallbackProps`. */
  FallbackComponent?: ComponentType<FallbackProps>;
  /** Called when an error is caught (log it / report it). */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Called when the boundary resets (imperatively or via `resetKeys`). */
  onReset?: (details: { reason: 'imperative-api' | 'keys'; args?: unknown[] }) => void;
  /** When any value here changes (by `Object.is`) after a catch, the boundary resets. */
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  didCatch: boolean;
  error: Error | null;
}

interface ErrorBoundaryContextType {
  didCatch: boolean;
  error: Error | null;
  resetErrorBoundary: (...args: unknown[]) => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | null>(null);
const initialState: ErrorBoundaryState = { didCatch: false, error: null };

const arrayChanged = (a: unknown[] = [], b: unknown[] = []): boolean =>
  a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]));

/**
 * A reusable React error boundary — declarative (`fallback`/`fallbackRender`/
 * `FallbackComponent`), with imperative reset, `resetKeys`, and an `onError`
 * reporting hook. The single best React extraction from the app review. Pair with
 * `useErrorBoundary` (to trigger it from a child) and `withErrorBoundary` (HOC).
 *
 *   <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
 *     <button onClick={resetErrorBoundary}>Retry — {error.message}</button>
 *   )}>
 *     <App />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = initialState;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { didCatch: true, error };
  }

  resetErrorBoundary = (...args: unknown[]): void => {
    if (this.state.error !== null) {
      this.props.onReset?.({ reason: 'imperative-api', args });
      this.setState(initialState);
    }
  };

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    if (this.state.didCatch && prevState.error !== null && arrayChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.props.onReset?.({ reason: 'keys' });
      this.setState(initialState);
    }
  }

  render(): ReactNode {
    const { children, fallback, fallbackRender, FallbackComponent } = this.props;
    const { didCatch, error } = this.state;
    let child = children;

    if (didCatch && error) {
      const props: FallbackProps = { error, resetErrorBoundary: this.resetErrorBoundary };
      if (typeof fallbackRender === 'function') {
        child = fallbackRender(props);
      } else if (FallbackComponent) {
        child = createElement(FallbackComponent, props);
      } else if (fallback !== undefined) {
        child = fallback;
      } else {
        throw error; // no fallback provided → re-throw to the next boundary
      }
    }

    return createElement(
      ErrorBoundaryContext.Provider,
      { value: { didCatch, error, resetErrorBoundary: this.resetErrorBoundary } },
      child,
    );
  }
}

/**
 * Trigger the nearest `ErrorBoundary` from inside a function component (e.g. to
 * surface an async error that boundaries can't catch on their own). Returns
 * `showBoundary(error)` and `resetBoundary()`.
 */
export const useErrorBoundary = (): { showBoundary: (error: Error) => void; resetBoundary: () => void } => {
  const context = useContext(ErrorBoundaryContext);
  const [state, setState] = useState<{ error: Error | null; hasError: boolean }>({ error: null, hasError: false });

  const api = useMemo(
    () => ({
      showBoundary: (error: Error) => setState({ error, hasError: true }),
      resetBoundary: () => {
        context?.resetErrorBoundary();
        setState({ error: null, hasError: false });
      },
    }),
    [context],
  );

  if (state.hasError && state.error) {
    throw state.error;
  }
  return api;
};

/** Wrap a component in an `ErrorBoundary` with fixed props (HOC form). */
export const withErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryProps: ErrorBoundaryProps,
): ComponentType<P> => {
  const Wrapped = (props: P) =>
    createElement(ErrorBoundary, errorBoundaryProps, createElement(WrappedComponent, props));
  const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  Wrapped.displayName = `withErrorBoundary(${name})`;
  return Wrapped;
};
