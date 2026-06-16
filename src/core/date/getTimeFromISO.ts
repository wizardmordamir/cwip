export const getTimeFromISO = (isoString: string = new Date().toISOString()) => isoString.split('T')[1].slice(0, -1);
