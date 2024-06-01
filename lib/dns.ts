const { Resolver } = require('node:dns');
const { logSettings } = require('./log');

export const dnsSettings = {
  isConnected: true,
  testSites: ['google.com', 'nodejs.org'],
  timeout: 700,
  tries: 1,
};

const resolve4Promise = (site) =>
  new Promise((resolve, reject) => {
    const resolver = new Resolver({ timeout: dnsSettings.timeout, tries: dnsSettings.tries });
    resolver.resolve4(site, (err, addresses) => {
      if (err) {
        return reject(err);
      }
      return resolve(addresses);
    });
  });

export const checkConnection = async () => {
  const prefix = `[checkConnection (timeout: ${dnsSettings.timeout})]`;
  let success = false;
  for (const site of dnsSettings.testSites) {
    try {
      logSettings.logger.debug('attempting to connect to site:', site);
      const result = await resolve4Promise(site);
      logSettings.logger.debug('resolve4Promise result:', result);
      dnsSettings.isConnected = true;
      success = true;
      break;
    } catch (err) {
      logSettings.logger.warn(prefix, err);
    }
  }
  if (!success) {
    dnsSettings.isConnected = false;
    logSettings.logger.error(prefix, 'Could not make internet connection');
  }
};
