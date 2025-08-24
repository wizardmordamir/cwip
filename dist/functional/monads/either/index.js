"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Either = exports.EitherRight = exports.EitherLeft = void 0;
const curry_1 = require("../../util-functions/curry");
const short_circuit_1 = __importDefault(require("../short-circuit"));
class EitherLeft {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(x) {
        return new EitherLeft(x);
    }
    map(fn) {
        return EitherLeft.of(fn(this.value));
    }
    join() {
        return this.value;
    }
    chain(fn) {
        return this.map(fn).join();
    }
}
exports.EitherLeft = EitherLeft;
class EitherRight {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(x) {
        return new EitherRight(x);
    }
    map(fn) {
        return EitherRight.of(fn(this.value));
    }
    join() {
        return this.value;
    }
    chain(fn) {
        return this.map(fn).join();
    }
}
exports.EitherRight = EitherRight;
exports.Either = (0, curry_1.curry)((left, right, x) => {
    switch (x.constructor) {
        case EitherLeft:
            return left(x.join());
        case EitherRight:
            return right(x.join());
        default:
            return (0, short_circuit_1.default)(x);
    }
});
exports.default = { Either: exports.Either, EitherLeft, EitherRight };
