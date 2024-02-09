import { createRequire as createImportMetaRequire } from 'module';
import.meta.require ||= (id) => createImportMetaRequire(import.meta.url)(id);
var W0 = Object.create;
var { defineProperty: B, getPrototypeOf: X0, getOwnPropertyNames: c } = Object;
var o = Object.prototype.hasOwnProperty;
var G = (F, P, T) => {
    for (let q of c(P))
      if (!o.call(F, q) && q !== 'default') B(F, q, { get: () => P[q], enumerable: !0 });
    if (T) {
      for (let q of c(P))
        if (!o.call(T, q) && q !== 'default') B(T, q, { get: () => P[q], enumerable: !0 });
      return T;
    }
  },
  Y0 = (F, P, T) => {
    T = F != null ? W0(X0(F)) : {};
    const q = P || !F || !F.__esModule ? B(T, 'default', { value: F, enumerable: !0 }) : T;
    for (let J of c(F)) if (!o.call(q, J)) B(q, J, { get: () => F[J], enumerable: !0 });
    return q;
  };
var Z0 = (F, P) => () => (P || F((P = { exports: {} }).exports, P), P.exports);
var _0 = (F) => {
  return import.meta.require(F);
};
var K = (F, P) => {
  for (var T in P)
    B(F, T, { get: P[T], enumerable: !0, configurable: !0, set: (q) => (P[T] = () => q) });
};
var R0 = Z0((H0) => {
  H0.round = function (F, P) {
    return (P = P || 0), Number(Math.round(F + 'e' + P) + 'e-' + P);
  };
  H0.roundUp = function (F, P) {
    return (P = P || 0), Number(Math.ceil(F + 'e' + P) + 'e-' + P);
  };
  H0.roundDown = function (F, P) {
    return (P = P || 0), Number(Math.floor(F + 'e' + P) + 'e-' + P);
  };
  H0.doMath = function (F, P, T) {
    var q = ['add', 'subtract'];
    if (q.indexOf(F) === -1)
      throw new Error(
        'utility.doMath requires one of these types: ' + q + ', but received type: ' + F,
      );
    if (isNaN(P) || isNaN(T))
      throw new Error(
        'utility.doMath only accepts numbers, but received val1 ' +
          P +
          ' of type ' +
          typeof P +
          ' and val2 ' +
          T +
          ' of type ' +
          typeof T,
      );
    var J = P.toString(),
      Q = T.toString();
    if (J.indexOf('e-') !== -1) P = H0.convertScientificToDecimal(P);
    if (Q.indexOf('e-') !== -1) T = H0.convertScientificToDecimal(T);
    var R = H0.countDecimals(P),
      L = H0.countDecimals(T),
      W = Math.max(R, L),
      U = Number(P + 'e' + W),
      X = Number(T + 'e' + W),
      M;
    if (F === 'subtract') M = U - X;
    else if (F === 'add') M = U + X;
    return Number(M + 'e-' + W);
  };
  H0.countDecimals = function (F) {
    if (F % 1 !== 0) return F.toString().split('.')[1].length;
    return 0;
  };
  H0.convertScientificToDecimal = function (F) {
    if (isNaN(F)) throw new Error('The value ' + F + ' is not a number');
    const P = F.toString().toLowerCase();
    var T = P.indexOf('.'),
      q = P.indexOf('e-'),
      J;
    if (q === -1) (q = P.indexOf('e')), (J = 1);
    else J = 2;
    if (q === -1) return F;
    var Q, R;
    if (T !== -1) (Q = P.slice(0, T)), (R = P.slice(T + 1, q));
    else (Q = P.slice(0, q)), (R = '');
    var L = P.slice(q + J, P.length),
      W,
      U,
      X;
    if (J === 2) {
      (W = L - Q.length), (U = '.');
      for (X = 0; X < W; X++) U += '0';
      U += Q + R;
    } else {
      (W = L - R.length), (U = Q + R);
      for (X = 0; X < W; X++) U += '0';
      U += Q + R;
    }
    return U;
  };
  var K0 = (H0.add = () => {}),
    M0 = (H0.subtract = () => {});
  H0.subRound8 = function (F, P) {
    try {
      if (isNaN(F) || isNaN(P)) console.log('v1: ' + F + ', v2: ' + P);
      return Math.round(M0(F, P), 8);
    } catch (T) {
      console.error(T.stack);
    }
  };
  H0.addRound8 = function (F, P) {
    try {
      if (isNaN(F) || isNaN(P)) console.log('v1: ' + F + ', v2: ' + P);
      return Math.round(K0(F, P), 8);
    } catch (T) {
      console.error(T.stack);
    }
  };
});
var v = {};
K(v, {
  valsExistInArray: () => {
    {
      return i;
    }
  },
  truthy: () => {
    {
      return A;
    }
  },
  truncateFile: () => {
    {
      return y;
    }
  },
  stringify: () => {
    {
      return Y;
    }
  },
  sleep: () => {
    {
      return u;
    }
  },
  shallowClone: () => {
    {
      return S;
    }
  },
  removePrimitiveDups: () => {
    {
      return t;
    }
  },
  removeArrayValues: () => {
    {
      return l;
    }
  },
  readFile: () => {
    {
      return j;
    }
  },
  randAlphNum: () => {
    {
      return p;
    }
  },
  propsExist: () => {
    {
      return e;
    }
  },
  now: () => {
    {
      return h;
    }
  },
  missingKeys: () => {
    {
      return D;
    }
  },
  log: () => {
    {
      return T0;
    }
  },
  l: () => {
    {
      return m;
    }
  },
  isObject: () => {
    {
      return k;
    }
  },
  isDateOlderMs: () => {
    {
      return b;
    }
  },
  ifIt: () => {
    {
      return P0;
    }
  },
  hexIfBuffer: () => {
    {
      return f;
    }
  },
  getTimeSince: () => {
    {
      return n;
    }
  },
  getTime: () => {
    {
      return g;
    }
  },
  getMsBetween: () => {
    {
      return C;
    }
  },
  getDaysBetween: () => {
    {
      return d;
    }
  },
  getDateMinusMs: () => {
    {
      return I;
    }
  },
  formatDate: () => {
    {
      return N;
    }
  },
  firstExistingKeyValue: () => {
    {
      return a;
    }
  },
  extend: () => {
    {
      return O;
    }
  },
  existy: () => {
    {
      return H;
    }
  },
  deepClone: () => {
    {
      return s;
    }
  },
  copyFileCb: () => {
    {
      return w;
    }
  },
  copyFile: () => {
    {
      return x;
    }
  },
  containsString: () => {
    {
      return r;
    }
  },
  allKeysEmpty: () => {
    {
      return F0;
    }
  },
});
var E = {};
K(E, {
  valsExistInArray: () => {
    {
      return i;
    }
  },
  truthy: () => {
    {
      return A;
    }
  },
  truncateFile: () => {
    {
      return y;
    }
  },
  stringify: () => {
    {
      return Y;
    }
  },
  sleep: () => {
    {
      return u;
    }
  },
  shallowClone: () => {
    {
      return S;
    }
  },
  removePrimitiveDups: () => {
    {
      return t;
    }
  },
  removeArrayValues: () => {
    {
      return l;
    }
  },
  readFile: () => {
    {
      return j;
    }
  },
  randAlphNum: () => {
    {
      return p;
    }
  },
  propsExist: () => {
    {
      return e;
    }
  },
  now: () => {
    {
      return h;
    }
  },
  missingKeys: () => {
    {
      return D;
    }
  },
  log: () => {
    {
      return T0;
    }
  },
  l: () => {
    {
      return m;
    }
  },
  isObject: () => {
    {
      return k;
    }
  },
  isDateOlderMs: () => {
    {
      return b;
    }
  },
  ifIt: () => {
    {
      return P0;
    }
  },
  hexIfBuffer: () => {
    {
      return f;
    }
  },
  getTimeSince: () => {
    {
      return n;
    }
  },
  getTime: () => {
    {
      return g;
    }
  },
  getMsBetween: () => {
    {
      return C;
    }
  },
  getDaysBetween: () => {
    {
      return d;
    }
  },
  getDateMinusMs: () => {
    {
      return I;
    }
  },
  formatDate: () => {
    {
      return N;
    }
  },
  firstExistingKeyValue: () => {
    {
      return a;
    }
  },
  extend: () => {
    {
      return O;
    }
  },
  existy: () => {
    {
      return H;
    }
  },
  deepClone: () => {
    {
      return s;
    }
  },
  copyFileCb: () => {
    {
      return w;
    }
  },
  copyFile: () => {
    {
      return x;
    }
  },
  containsString: () => {
    {
      return r;
    }
  },
  allKeysEmpty: () => {
    {
      return F0;
    }
  },
});
var q0 = {};
K(q0, {
  valsExistInArray: () => {
    {
      return i;
    }
  },
  removePrimitiveDups: () => {
    {
      return t;
    }
  },
  removeArrayValues: () => {
    {
      return l;
    }
  },
});
var i = (F, P, T) => P.map((q) => (T ? !!F.find((J) => J[T] === q) : F.indexOf(q) !== -1)),
  l = (F, P, T) =>
    F.reduceRight(
      (q, J, Q) =>
        T
          ? P.indexOf(J[T]) !== -1
            ? q.toSpliced(Q, 1)
            : q
          : P.indexOf(J) !== -1
            ? q.toSpliced(Q, 1)
            : q,
      [...F],
    ),
  t = (F) => [...new Set(F)];
var G0 = {};
K(G0, {
  truthy: () => {
    {
      return A;
    }
  },
  propsExist: () => {
    {
      return e;
    }
  },
  missingKeys: () => {
    {
      return D;
    }
  },
  isObject: () => {
    {
      return k;
    }
  },
  existy: () => {
    {
      return H;
    }
  },
  containsString: () => {
    {
      return r;
    }
  },
  allKeysEmpty: () => {
    {
      return F0;
    }
  },
});
var E0 = {};
K(E0, {
  stringify: () => {
    {
      return Y;
    }
  },
  shallowClone: () => {
    {
      return S;
    }
  },
  firstExistingKeyValue: () => {
    {
      return a;
    }
  },
  extend: () => {
    {
      return O;
    }
  },
  deepClone: () => {
    {
      return s;
    }
  },
});
var S = (F) => Object.assign({}, F),
  s = (F) => structuredClone(F),
  O = (...F) => Object.assign({}, ...F),
  Y = function F(P) {
    const T = [];
    return JSON.stringify(
      P,
      function (q, J) {
        if (typeof J === 'object' && J !== null) {
          if (T.indexOf(J) !== -1) return;
          T.push(J);
        }
        return J;
      },
      4,
    );
  },
  a = (F, ...P) => {
    for (let T = 0; T < P.length; T++) if (H(F[P[T]])) return F[P[T]];
  };
var H = (F) => typeof F !== 'undefined' && F !== null,
  A = (F) => F !== !1 && H(F),
  r = (F, P, T = !1) => (T ? F.indexOf(P) > -1 : F.toUpperCase().indexOf(P.toUpperCase()) > -1),
  k = (F) => typeof F === 'object' && F !== null && !Array.isArray(F),
  D = (F, P) => {
    var T = [];
    for (var q = 0; q < P.length; q++) if (typeof F[P[q]] == 'undefined') T.push(P[q]);
    if (T.length) return T;
    return !1;
  },
  e = (F, P) => {
    try {
      if (!k(F)) throw new Error('expected object with keys: ' + Y(P) + ' instead of: ' + Y(F));
      let T = D(F, P);
      if (T) throw new Error('missing keys ' + Y(T) + ' in: ' + Y(F));
      return !0;
    } catch (T) {
      console.error(T.stack);
    }
  },
  F0 = (F) => {
    const P = Object.getOwnPropertyNames(F);
    for (let T = 0; T < P.length; T++)
      if (Array.isArray(F[P[T]])) {
        if (F[P[T]].length) return !1;
      } else if (H(F[P[T]])) return !1;
    return !0;
  };
var J0 = {};
K(J0, {
  ifIt: () => {
    {
      return P0;
    }
  },
});
var P0 = (F, P, T) => (A(F) ? P() : T);
var Z = {};
K(Z, {
  truncateFile: () => {
    {
      return y;
    }
  },
  sleep: () => {
    {
      return u;
    }
  },
  readFile: () => {
    {
      return j;
    }
  },
  randAlphNum: () => {
    {
      return p;
    }
  },
  hexIfBuffer: () => {
    {
      return f;
    }
  },
  copyFileCb: () => {
    {
      return w;
    }
  },
  copyFile: () => {
    {
      return x;
    }
  },
});
var V = _0('fs');
var w = function (F, P, T) {
    var q = !1,
      J = V.createReadStream(F);
    J.on('error', function (L) {
      R(L);
    });
    var Q = V.createWriteStream(P);
    Q.on('error', function (L) {
      R(L);
    }),
      Q.on('close', function (L) {
        R();
      }),
      J.pipe(Q);
    function R(L) {
      if (L) console.error('[utility.js] copyFileCb error: ' + JSON.stringify(L));
      if (T && !q) T(L), (q = !0);
    }
  },
  x = function (F, P) {
    return new Promise(function (T, q) {
      var J = V.createReadStream(F);
      J.on('error', R);
      var Q = V.createWriteStream(P);
      Q.on('error', R);
      function R(L) {
        J.destroy(), Q.end(), q(new Error(L));
      }
      Q.on('finish', function () {
        T();
      }),
        J.pipe(Q);
    });
  },
  y = async function (F, P) {
    return (
      (P = P || 0),
      new Promise(function (T) {
        V.truncate(F, P, function (q) {
          T();
        });
      })
    );
  },
  j = async function (F) {
    try {
      return new Promise(function (P, T) {
        V.readFile(F, function (q, J) {
          if (q) T(new Error(q));
          else P(J);
        });
      });
    } catch (P) {
      console.error(P.stack);
    }
  },
  f = function (F) {
    if (F instanceof Buffer) return F.toString('hex');
    else return F;
  },
  p = function (F) {
    let P = '',
      T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let q = 0; q < F; q++) P += T.charAt(Math.floor(Math.random() * T.length));
    return P;
  },
  u = async (F) => new Promise((P) => setTimeout(P, F));
G(E, Z);
var $ = {};
K($, {
  log: () => {
    {
      return T0;
    }
  },
  l: () => {
    {
      return m;
    }
  },
});
var _ = {};
K(_, {
  now: () => {
    {
      return h;
    }
  },
  isDateOlderMs: () => {
    {
      return b;
    }
  },
  getTimeSince: () => {
    {
      return n;
    }
  },
  getTime: () => {
    {
      return g;
    }
  },
  getMsBetween: () => {
    {
      return C;
    }
  },
  getDaysBetween: () => {
    {
      return d;
    }
  },
  getDateMinusMs: () => {
    {
      return I;
    }
  },
  formatDate: () => {
    {
      return N;
    }
  },
});
var N = (F, P) => {},
  h = (F = 'YYYY-MM-DD hh:mm:ss a') => 'TIME:\t' + N(F);
var I = function (F) {
    return new Date(new Date().getTime() - F);
  },
  b = function (F, P) {
    return F < I(P);
  },
  g = function (F) {
    return N(F, 'MM-DD-YY h:mm:ss a');
  };
var $0 = 86400000;
var d = function (F, P) {
    return Math.floor(Math.abs((F.getTime() - P.getTime()) / $0));
  },
  C = function (F, P) {
    try {
      var T = Math.floor(Math.abs(F.getTime() - P.getTime()));
      return T;
    } catch (q) {
      console.log('firstDate: ' + F + ', secondDate: ' + P), console.error(q.stack);
    }
  },
  n = function (F) {
    if (!F) return;
    var P,
      T,
      q,
      J = 1000,
      Q = 60000,
      R = 3600000,
      L = 86400000,
      W = new Date(),
      U = C(W, F);
    if (U <= Q) P = Math.floor(U / J) + ' secs';
    else if (U <= R) P = Math.floor(U / Q) + ' mins';
    else if (U <= L) P = Math.floor(U / R) + ' hrs';
    else P = Math.floor(U / L) + ' days';
    return P;
  };
var m = console.log;
var T0 = (F) => {
  const P = (F && F.cwip) || {};
  return function () {
    const T = S(P),
      q = Error.prepareStackTrace;
    Error.prepareStackTrace = function (M, z) {
      return z;
    };
    const J = new Error();
    Error.captureStackTrace(J, arguments.callee);
    const Q = J.stack;
    Error.prepareStackTrace = q;
    let R = '\n';
    const L = [...arguments];
    if (typeof L[0] === 'object' && !L[0].cwip === void 0) O(T, L[0].cwip), L.shift();
    if (!T.hidefunction) L.unshift(X());
    if (!T.hideline) L.unshift(U());
    if (!T.hidefile) L.unshift(W());
    if (!T.hidetime) L.unshift(h());
    L.forEach((M) => {
      const z = typeof M === 'object' ? JSON.parse(Y(M)) : M,
        U0 = typeof z === 'string' ? z : Y(z);
      R += U0 + '\n';
    }),
      console.log(R);
    function W() {
      return 'FILE:\t' + Q[0].getFileName();
    }
    function U() {
      return 'LINE:\t' + Q[0].getLineNumber();
    }
    function X() {
      return 'FUNC:\t' + Q[0].getFunctionName() + ' ()';
    }
    if (T.nightwatch) return this.pause(1), this;
  };
};
G(E, $);
G(E, Y0(R0(), 1));
G(E, _);
G(v, E);
export {
  i as valsExistInArray,
  A as truthy,
  y as truncateFile,
  Y as stringify,
  u as sleep,
  S as shallowClone,
  t as removePrimitiveDups,
  l as removeArrayValues,
  j as readFile,
  p as randAlphNum,
  e as propsExist,
  h as now,
  D as missingKeys,
  T0 as log,
  m as l,
  k as isObject,
  b as isDateOlderMs,
  P0 as ifIt,
  f as hexIfBuffer,
  n as getTimeSince,
  g as getTime,
  C as getMsBetween,
  d as getDaysBetween,
  I as getDateMinusMs,
  N as formatDate,
  a as firstExistingKeyValue,
  O as extend,
  H as existy,
  s as deepClone,
  w as copyFileCb,
  x as copyFile,
  r as containsString,
  F0 as allKeysEmpty,
};
