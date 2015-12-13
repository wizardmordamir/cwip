require('mocha-sinon');
var should = require('chai').should(),
    expect = require('chai').expect,
    moment = require('moment'),
    cwip = require('../index'),
    cwiplog = cwip.log,
    existy = cwip.existy,
    truthy = cwip.truthy;

describe('#log', function() {
  
  var log = console.log;

  function l () { // reset console.log to show test results
    console.log = log;
  }

  beforeEach(function() {
    this.sinon.stub(console, 'log');
  });

  it('calls console.log once', function() {
    cwiplog();
    expect( console.log.calledOnce ).to.be.true;
    l();
  });

  it('logs the time it is called', function() {
    cwiplog();
    expect( console.log.args[0][0] ).to.contain('TIME:\t' + moment().format('YYYY-MM-DD'));
    l();
  });

  it('logs the file it is called from', function() {
    cwiplog();
    expect( console.log.args[0][0] ).to.contain('FILE:\t');
    l();
  });

  it('logs the line it is called from', function() {
    cwiplog();
    expect( console.log.args[0][0] ).to.contain('LINE:\t');
    l();
  });

  it('logs the function it is called from', function() {
    cwiplog();
    expect( console.log.args[0][0] ).to.contain('FUNC:\t');
    l();
  });

  it('logs the objects it is passed', function() {
    cwiplog({a: 'a', b: 'b'}, {c: 'c', d: 'd'});
    expect( console.log.args[0][0] ).to.contain(
      '\n{\n    "a": "a",\n    "b": "b"\n}\n{\n    "c": "c",\n    "d": "d"\n}\n'
    );
    l();
  });

  it('logs the objects without circular properties', function() {
    var o = {a: 'a', b: {c: 'c', d: 'd'}};
    o.b.c = o.b;
    cwiplog(o);
    expect( console.log.args[0][0] ).to.contain(
      '\n{\n    "a": "a",\n    "b": {\n        "d": "d"\n    }\n}\n'
    );
    l();
  });

});

describe('#existy', function() {

  it('knows undefined values don\'t exist', function() {
    var x;
    expect( existy(x) ).to.be.false;
  });

  it('knows functions exist', function() {
    expect( existy(function () {} ) ).to.be.true;
  });

  it('knows empty objects exist', function() {
    expect( existy( {} ) ).to.be.true;
  });

});




























