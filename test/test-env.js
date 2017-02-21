var assert = require('assert');

// Tests that merely check if the environment we're running in is reasonable
describe('environment', function(){
    it('should support promises', function(){
        var myPromise = new Promise(function(resolve, reject) {
            resolve(true);
        });
        assert(myPromise);
        myPromise.then(val => {
            assert(val);
        });
    });
});