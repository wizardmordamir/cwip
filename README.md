Cwip
=========

A library providing javascript utility methods

## Installation

  npm install --save cwip

## Usage

  var cwip = require('cwip')
      log = cwip.log,
      existy = cwip.existy;
      truthy = cwip.truthy;

	var x = false;
	log(existy(x), truthy(x));

## Tests

  npm test

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release
