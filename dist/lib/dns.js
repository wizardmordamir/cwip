"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkConnection = exports.dnsSettings = void 0;
const { Resolver } = require('node:dns');
const { logSettings } = require('./log');
exports.dnsSettings = {
    isConnected: true,
    testSites: ['google.com', 'nodejs.org'],
    timeout: 700,
    tries: 1,
};
const resolve4Promise = (site) => new Promise((resolve, reject) => {
    const resolver = new Resolver({ timeout: exports.dnsSettings.timeout, tries: exports.dnsSettings.tries });
    resolver.resolve4(site, (err, addresses) => {
        if (err) {
            return reject(err);
        }
        return resolve(addresses);
    });
});
const checkConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    const prefix = `[checkConnection (timeout: ${exports.dnsSettings.timeout})]`;
    let success = false;
    for (const site of exports.dnsSettings.testSites) {
        try {
            logSettings.logger.debug('attempting to connect to site:', site);
            const result = yield resolve4Promise(site);
            logSettings.logger.debug('resolve4Promise result:', result);
            exports.dnsSettings.isConnected = true;
            success = true;
            break;
        }
        catch (err) {
            logSettings.logger.warn(prefix, err);
        }
    }
    if (!success) {
        exports.dnsSettings.isConnected = false;
        logSettings.logger.error(prefix, 'Could not make internet connection');
    }
});
exports.checkConnection = checkConnection;
