'use strict';

exports.compileArgs = function(args) {
	args.splice(0,1);
	return args.join(" ");
}