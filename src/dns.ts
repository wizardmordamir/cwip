const { Resolver } = require('node:dns');
const { logSettings } = require('./log');

export const defaultSettings = { testSites: ['google.com', 'nodejs.org'], timeout: 700, tries: 1 };

const resolve4Promise = (settings, site) =>
  new Promise((resolve, reject) => {
    const resolver = new Resolver({ timeout: settings.timeout, tries: settings.tries });
    resolver.resolve4(site, (err, addresses) => {
      if (err) {
        return reject(err);
      }
      return resolve(addresses);
    });
  });

export const checkConnection = async (settings) => {
  settings = { ...defaultSettings, ...settings };

  let isConnected = false;

  for (const site of settings.testSites) {
    logSettings.logger.debug('attempting to connect to site:', site);
    const result = await resolve4Promise(settings, site);
    logSettings.logger.debug('resolve4Promise result:', result);
    isConnected = true;
    break;
  }

  return isConnected;
};
