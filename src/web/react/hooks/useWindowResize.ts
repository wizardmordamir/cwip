import { useEffect, useState } from 'react';

export interface WindowSize {
  innerWidth: number;
  innerHeight: number;
}

const getWindowSize = (): WindowSize => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
});

/**
 * Track `window.innerWidth`/`innerHeight`, updating on resize. Prefer
 * `innerHeight`/`100dvh` over `100vh` on mobile, where browser chrome covers
 * part of the `vh` viewport.
 */
export const useWindowResize = (): { windowSize: WindowSize } => {
  const [windowSize, setWindowSize] = useState(getWindowSize());
  useEffect(() => {
    const handleResize = () => setWindowSize(getWindowSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return { windowSize };
};
