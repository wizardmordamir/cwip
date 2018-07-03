/* global describe, it, beforeEach */
require('mocha-sinon')
const expect = require('chai').expect
const moment = require('moment')
const cwip = require('../index')
const cwiplog = cwip.log()
const existy = cwip.existy
// const truthy = cwip.truthy
const fixCircular = cwip.fixCircular
const now = cwip.now

const log = console.log

function l () { // reset console.log to show test results
  console.log = log
}

describe('#log', function () {
  beforeEach(function () {
    this.sinon.stub(console, 'log')
  })
  it('calls console.log once', function () {
    cwiplog()
    expect(console.log.calledOnce).to.be.true
    l()
  })
  it('logs the time it is called', function () {
    cwiplog()
    expect(console.log.args[0][0]).to.contain('TIME:\t' + moment().format('YYYY-MM-DD'))
    l()
  })
  it('does not log the time when it is called with hidetime configuration', function () {
    cwiplog({cwip: {hidetime: true}})
    expect(console.log.args[0][0]).to.not.contain('TIME:\t' + moment().format('YYYY-MM-DD'))
    l()
  })
  it('logs the file it is called from', function () {
    cwiplog()
    expect(console.log.args[0][0]).to.contain('FILE:\t')
    l()
  })
  it('does not log the file when it is called with hidefile configuration', function () {
    cwiplog({cwip: {hidefile: true}})
    expect(console.log.args[0][0]).to.not.contain('FILE:\t')
    l()
  })
  it('logs the line it is called from', function () {
    cwiplog()
    expect(console.log.args[0][0]).to.contain('LINE:\t')
    l()
  })
  it('does not log the line when it is called with hideline configuration', function () {
    cwiplog({cwip: {hideline: true}})
    expect(console.log.args[0][0]).to.not.contain('LINE:\t')
    l()
  })
  it('logs the function it is called from', function () {
    cwiplog()
    expect(console.log.args[0][0]).to.contain('FUNC:\t')
    l()
  })
  it('does not log the function when it is called with hidefunction configuration', function () {
    cwiplog({cwip: {hidefunction: true}})
    expect(console.log.args[0][0]).to.not.contain('FUNC:\t')
    l()
  })
  it('logs the objects it is passed', function () {
    cwiplog({a: 'a', b: 'b'}, {c: 'c', d: 'd'})
    expect(console.log.args[0][0]).to.contain(
      '\n{\n    "a": "a",\n    "b": "b"\n}\n{\n    "c": "c",\n    "d": "d"\n}\n'
    )
    l()
  })
  it('logs the objects without circular properties', function () {
    var o = {a: 'a', b: {c: 'c', d: 'd'}}
    o.b.c = o.b
    cwiplog(o)
    expect(console.log.args[0][0]).to.contain(
      '\n{\n    "a": "a",\n    "b": {\n        "d": "d"\n    }\n}\n'
    )
    l()
  })
})

describe('#existy', function () {
  it('knows undefined values don\'t exist', function () {
    var x
    expect(existy(x)).to.be.false
  })
  it('knows functions exist', function () {
    expect(existy(function () {})).to.be.true
  })
  it('knows empty objects exist', function () {
    expect(existy({})).to.be.true
  })
})

describe('#fixCircular', function () {
  beforeEach(function () {
    this.sinon.stub(console, 'log')
  })
  it('stringifies objects with circular properties', function () {
    var o = {a: 'a', b: {c: 'c', d: 'd'}}
    o.b.c = o.b
    console.log(fixCircular(o))
    expect(console.log.args[0][0]).to.contain(
      '{\n    "a": "a",\n    "b": {\n        "d": "d"\n    }\n}'
    )
    l()
  })
  it('stringifies objects without circular properties', function () {
    var o = {a: 'a', b: {c: 'c', d: 'd'}}
    console.log(fixCircular(o))
    expect(console.log.args[0][0]).to.contain(
      '{\n    "a": "a",\n    "b": {\n        "c": "c",\n        "d": "d"\n    }\n}'
    )
    l()
  })
})

describe('#now', function () {
  it('prints in YYYY-MM-DD hh:mm:ss a format if no format is specified', function () {
    expect(now()).to.contain('TIME:\t')
  })
  it('prints in the passed format', function () {
    expect(now('MM-DD-YYYY')).to.contain('TIME:\t')
  })
  it('prints in YYYY-MM-DD hh:mm:ss a format if the passed format is invalid', function () {
    expect(now('YYYYYYYYYYabc')).to.contain('TIME:\t')
  })
})
