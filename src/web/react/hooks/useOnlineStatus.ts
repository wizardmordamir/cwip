import { useEffect, useState } from 'react';

/** Track the browser's online/offline status (reacts to the `online`/`offline`
 *  window events). Returns `true` until told otherwise. */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
};
