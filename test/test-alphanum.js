var assert = require('assert');
var alphanum = require("../alphanum.js");

describe('alphanum', function(){
	var testData = [
		"Juliet",
		"490",
		"X-ray",
		"Mike",
		"Hotel",
		"Sierra",
		"echo",
		"bravo",
		"lima",
		"victor",
		"yankee",
		"54",
		"Whiskey",
		"Quebec",
		"papa",
		"56",
		"india",
		"Foxtrot",
		"golf",
		"delta",
		"Charlie",
		"Alpha",
		"romeo",
		"Kilo",
		"tango",
		"Zulu",
		"oscar",
		"November",
		"1",
		"Uniform",
		"12"
	];
	var testDataSorted = [
		"1",
		"12",
		"54",
		"56",
		"490",	
		"Alpha",
		"Charlie",
		"Foxtrot",
		"Hotel",
		"Juliet",
		"Kilo",
		"Mike",
		"November",
		"Quebec",
		"Sierra",
		"Uniform",
		"Whiskey",
		"X-ray",
		"Zulu",
		"bravo",
		"delta",
		"echo",
		"golf",
		"india",
		"lima",
		"oscar",
		"papa",
		"romeo",
		"tango",
		"victor",
		"yankee"
	];
	var testDataSortedCI = [
		"1",
		"12",
		"54",
		"56",
		"490",
		"Alpha",
		"bravo",
		"Charlie",
		"delta",
		"echo",
		"Foxtrot",
		"golf",
		"Hotel",
		"india",
		"Juliet",
		"Kilo",
		"lima",
		"Mike",
		"November",
		"oscar",
		"papa",
		"Quebec",
		"romeo",
		"Sierra",
		"tango",
		"Uniform",
		"victor",
		"Whiskey",
		"X-ray",
		"yankee",
		"Zulu"
	];

	function compareArrays(one, two) {
		if (one.length != two.length) {
			return false;
		}
		for (var i = 0; i < one.length; i++) {
			if (one[i] !== two[i]) {
				return false;
			}
		}
		return true;
	}

    it('should export an alphanum function', function(){
        assert(typeof(alphanum.alphanum) == 'function');
    });

    it('should export an alphanumCase function', function() {
        assert(typeof(alphanum.alphanumCase) == 'function');
    });

    it('should export an alphanumSort on an Array', function() {
    	var test = new Array();
    	assert(typeof(test.alphanumSort) == 'function');
    });

    it('should perform a case-sensitive sort', function() {
    	var res = testData.sort(alphanum.alphanum);
    	assert(compareArrays(res, testDataSorted));
    });

    it('should perform a case-insensitive sort', function() {
    	var res = testData.sort(alphanum.alphanumCase);
    	assert(compareArrays(res, testDataSortedCI));
    });

    it('should perform a case-sensitive sort via the Array prototype', function() {
    	var res = testData.slice(0);
    	res.alphanumSort(false);
    	assert(compareArrays(res, testDataSorted));
    });

    it('should perform a case-insensitive sort via the Array prototype', function() {
    	var res = testData.slice(0);
    	res.alphanumSort(true);
    	assert(compareArrays(res, testDataSortedCI));
    });
})