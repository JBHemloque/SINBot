var assert = require('assert');
var plugin = require("../plugins/dice.js");

function genDieSequence(die, count) {
    var spec = 'd' + die.toString();

    var results = [die];
    for (var i = 0; i < die; i++) {
        results[i] = 0;
    }

    for (var i = 0; i < count; i++) {
        j = plugin.rollDice(spec).getTotal();
        results[j-1]++;
    }

    return results;
}

describe('minimal-plugin', function(){
    it('should export a commands object', function(){
        assert(typeof(plugin.commands) == 'object');
    });

    it('should export a findCommands function', function() {
        assert(typeof(plugin.findCommand) == 'function');
    });

    it('should export a rollDice function', function() {
        assert(typeof(plugin.rollDice) == 'function');
    });

    it('should be sufficiently random on d10', function() {
        var die = 10;
        var count = die * die * die * die;

        var results = genDieSequence(die, count);

        var min = die * die * die * 0.9;
        var max = die * die * die * 1.1;
        for (var i = 0; i < die; i++) {
            assert(results[i] > min);
            assert(results[i] < max);
        }
    });

    it('should be sufficiently random on d6', function() {
        var die = 6;
        var count = die * die * die * die;

        var results = genDieSequence(die, count);

        var min = die * die * die * 0.8;
        var max = die * die * die * 1.2;
        for (var i = 0; i < die; i++) {
            assert(results[i] > min);
            assert(results[i] < max);
        }
    });

    it('should generate sufficiently random dF sequences', function() {
        var spec = 'dF';
        var count = 10000;
        var min = (count / 3) * 0.9;
        var max = (count / 3) * 1.1;
        var results = [3];

        for (var i = 0; i < 3; i++) {
            results[i] = 0;
        }

        for (var i = 0; i < 10000; i++) {
            var j = plugin.rollDice(spec).getTotal();
            results[j+1]++;
        }

        for (var i = 0; i < 3; i++) {
            assert(results[i] > min);
            assert(results[i] < max);
        }
    });
})