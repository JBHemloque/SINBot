var assert = require('assert');
var plugin = require("../plugins/minimal.js");

describe('minimal-plugin', function(){
    it('should export a command object', function(){
        assert(typeof(plugin.commands) == 'object');
    });

    it('should export a findCommands function', function() {
        assert(typeof(plugin.findCommand) == 'function');
    });
})