'use strict';

exports.compileArgs = function(args) {
	args.splice(0,1);
	return args.join(" ");
}

exports.displayUsage = function(bot, message, command) {
	if (command.usage) {
		bot.sendMessage(message.channel, "Usage: " + command.usage);
	}
}