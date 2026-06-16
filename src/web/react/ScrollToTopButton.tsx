import { useEffect, useRef, useState } from 'react';
import { cx } from './styling';

const ArrowUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

/**
 * Floating scroll-to-top button. Place inside your scrollable content container
 * (e.g. at the top of the main content area). The button appears once the user
 * has scrolled past this element's initial position and returns them to the top
 * of the nearest scrollable ancestor on click.
 */
export const ScrollToTopButton = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // Walk up the DOM to find the first scrollable ancestor.
    let el: Element | null = sentinel.parentElement;
    while (el) {
      const { overflowY } = getComputedStyle(el);
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      el = el.parentElement;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Zero-height sentinel — positioned at the top of the scroll container. */}
      <div ref={sentinelRef} aria-hidden="true" />
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        aria-hidden={!visible}
        className={cx(
          'fixed bottom-6 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full',
          'bg-white/85 text-gray-600 shadow-md ring-1 ring-gray-200 backdrop-blur-sm',
          'transition-[opacity,transform] duration-200',
          'hover:bg-white hover:text-gray-900 hover:shadow-lg',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'dark:bg-gray-900/85 dark:text-gray-300 dark:ring-gray-700',
          'dark:hover:bg-gray-900 dark:hover:text-white',
          'pointer-coarse:h-12 pointer-coarse:w-12',
          visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
        )}
      >
        <ArrowUpIcon />
      </button>
    </>
  );
};
