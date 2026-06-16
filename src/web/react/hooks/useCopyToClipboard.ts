import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCopyToClipboard {
  /** True for `resetMs` after a successful copy — drive a ✓ / "Copied" affordance. */
  copied: boolean;
  /** Write `text` to the clipboard; flips `copied` and resolves `true` on success,
   *  `false` if the clipboard is unavailable (insecure context, denied, …). */
  copy: (text: string) => Promise<boolean>;
  /** Clear the pending reset timer and force `copied` back to false. */
  reset: () => void;
}

/**
 * The single source of truth for the copy-with-confirmation pattern: write to the
 * clipboard and flip a transient `copied` flag that auto-resets after `resetMs`
 * (default 1200ms). Consumed by {@link CopyButton}, the Toast copy action, and
 * SecretInput so the clipboard + timer + cleanup logic lives in exactly one place.
 */
export function useCopyToClipboard(resetMs = 1200): UseCopyToClipboard {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Cancel a pending reset if the component unmounts mid-flash.
  useEffect(() => clear, [clear]);

  const reset = useCallback(() => {
    clear();
    setCopied(false);
  }, [clear]);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard?.writeText(text);
        setCopied(true);
        clear();
        timer.current = setTimeout(() => setCopied(false), resetMs);
        return true;
      } catch {
        // Clipboard can be unavailable (insecure context / denied permission).
        return false;
      }
    },
    [clear, resetMs],
  );

  return { copied, copy, reset };
}
