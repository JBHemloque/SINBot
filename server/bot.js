'use strict';

var async = require('async');
var Discord = require("discord.js");
var search = require('../plugins/search.js');
var elizabot = require('../plugins/elizabot.js');
var utils = require('./utils.js');
var package_json = require("../package.json");
var fs = require("fs");
var _ = require("underscore");
var base = require('../base.js');
var path = require('path');
var messagebox = require('./messagebox.js');
var alias = require('./alias.js');
var version;

var config;
var plugins = {};

var startTime = Date.now();
var compileArgs = utils.compileArgs;
var displayUsage = utils.displayUsage;

var enumerate = function(obj) {
    var key;
    for (key in obj) {
        if (typeof obj[key] !== 'function') {
            console.log(key + ": " + obj[key]);
        }
    }
}

function debugLog(message) {
    if (config.DEBUG) {
        console.log(message);
    }
}

function userMentioned(text, user) {
    if (user) {
        return ((text.startsWith('<@' + user + '>')) || (text.startsWith('<@!' + user + '>')));
    }
    return ((text.startsWith('<@')) || (text.startsWith('<@!')));
}

function stripUserDecorations(text) {
    if (text.startsWith('<@!')) {
        return text.substr(3,text.length-4);
    } else {
        return text.substr(2,text.length-3);
    }
}

function isAdmin(id) {
    return (config.ADMIN_IDS.indexOf(id) > -1);
}

var guildListCmd = {
    help: "Lists servers bot is connected to.",
    adminOnly: true,
    process: function(args, bot, message) {
        var servers = [];
        var serverList = bot.guilds.array();
        for (var i = 0; i < serverList.length; i++) {
            servers.push(serverList[i].name + " [" + serverList[i].id + "]");
        }
        utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,servers);
    }
};

//////////////////////////////////////////////////////////////
//
// Command structure:
//
// "name": {
//      usage: "usage text",
//      adminOnly: (boolean - optional)
//      spammy: (boolean - optional - if true, the command will send the results via PM, if config.SPAMMY_PM is true)
//      help: "help text" (optional)
//      extendedhelp: "extended help text" (optional)
//      process: function(args, bot, message)
// }
//////////////////////////////////////////////////////////////

var commands = {
    "alias": {
        usage: "alias <alias> <text to display>",
        adminOnly: true,
        help: "Creates a command alias -- e.g. !ping can output Pong!",
        extendedhelp: "An alias is a simple text substitution. It creates or updates a command that sends some text when that command is entered. You can include the name of the person who sent the alias command with %SENDER%, the name of the channel with %CHANNEL%, the name of the server with %SERVER%, and the channel topic with %CHANNEL_TOPIC%. Commands can be one word, and additional lines inserted into the output with %EXTRA%",
        process: function(args, bot, message) {
            var cmdAlias = alias.makeAliasFromArgs(args);
            if (cmdAlias.displayUsage) {
                displayUsage(bot, message, this);
            } else if (cmdAlias.error) {
                utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, cmdAlias.message);
            } else {
                utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,"Created alias " + cmdAlias.alias);
            }
        }
    },
    "show_alias": {
        usage: "show_alias <alias>",
        help: "Displays an alias.",
        extendedhelp: "An alias is a simple text substitution. It creates a command that sends some text when that command is entered. You can include the name of the person who sent the alias command with %SENDER%, the name of the channel with %CHANNEL%, the name of the server with %SERVER%, and the channel topic with %CHANNEL_TOPIC%. Commands can be one word, and additional lines inserted into the output with %EXTRA%. This command shows the contents of an alias.",
        process: function(args, bot, message) {
            if (args.length > 1) {
                var cmdAlias = alias.getAlias(args[1].toLowerCase());
                var output = args[1] + " is not an alias.";
                if (cmdAlias) {
                    output = cmdAlias.alias + " -> " + cmdAlias.output;
                }
                utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, output);
            } else {
                displayUsage(bot, message, this);
            }
        }
    },
    "aliases": {
        help: "Lists the aliases available.",
        spammy: true,
        process: function(args, bot, message) {            
            var outputArray = alias.getAliases();
            utils.pmOrSendArray(bot, this, config.SPAMMY_PM, message.author, message.channel, outputArray);
        }
    },
    "clear_alias": {
        usage: "clear_alias <alias>",
        adminOnly: true,
        help: "Deletes an alias.",
        process: function(args, bot, message) {
            var cmdAlias = makeAliasStructFromArgs(args);
            if(cmdAlias.alias) {
                if (alias.clearAlias(cmdAlias)) {                    
                    utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, "Deleted alias " + cmdAlias.alias);
                } else {
                    utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, "Sorry, " + cmdAlias.alias + " doesn't exist.");
                }
            } else {
                displayUsage(bot, message, this);
            }
        }
    },
    "ping": {
        help: "Returns pong. Useful for determining if the bot is alive.",
        process: function(args, bot, message) { utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, "Pong!"); }
    },
    "version": {
        help: "Display version information for this bot.",
        process: function(args, bot, message) { utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, version); }
    },
    "plugins": {
        help: "List the plugins loaded on this bot.",
        adminOnly: true,
        process: function(args, bot, message) {
            var output = "Plugins:";
            for (var i = 0; i < plugins.length; i++) {
                output += "\n\t" + plugins[i].name;
            }
            utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, output);
        }
    },
    "servers": guildListCmd,
    "guilds": guildListCmd,
    "channels": {
        help: "Lists channels bot is connected to.",
        adminOnly: true,
        process: function(args, bot, message) { utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,bot.channels); }
    },
    "myid": {
        help: "Returns the user id of the sender.",
        process: function(args, bot, message) { utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,message.author.id); }
    },
    "say": {
        usage: "say <message>",
        help: "Bot says message.",
        process: function(args, bot, message) {
            var msg = compileArgs(args);
            if (msg) {
                utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,msg);
            } else {
                displayUsage(bot, message, this);
            }
        }
    },
    "announce": {
        usage: "announce <message>",
        help: "Bot says message with text to speech.",
        process: function(args, bot, message) {
            var msg = compileArgs(args);
            if (msg) {
                utils.ttsMessage(bot, message.channel,msg);
            } else {
                displayUsage(bot, message, this);
            }
        }
    },
    "userlist": {
        help: "Returns a list of users on this server. This is useful for permissions.",
        adminOnly: true,
        process: function(args,bot,message) {
            var output = "User list:";
            var users = message.channel.guild.members.array();
            for (var i = 0; i < users.length; i += 1) {
                output += "\n    " + utils.userName(users[i]) + " [" + users[i].id + "]";
            }
            utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,output);
        }
    },
    "exit": {
        help: "Shuts down the bot.",
        adminOnly: true,
        process: function(args, bot, message) {
            utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, version + " is going down NOW!", function(error, message) {
                process.exit(0);
            });
        }
    },
    "adminlist": {
        help: "Returns a list of admins for this bot.",
        adminOnly: true,
        process: function(args,bot,message) {
            var output = "Bot admin list:";
            var users = message.channel.guild.members.array();
            for (var i = 0; i < users.length; i += 1) {
                if (isAdmin(users[i].id)) {
                    output += "\n    " + utils.userName(users[i]) + " [" + users[i].id + "]";
                }
            }
            utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,output);
        }
    },
    "isadmin": {
        help: "Returns true if the sender is a bot admin",
        process: function(args,bot,message) { utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,isAdmin(message.author.id).toString()); }
    },
    "userid": {
        usage: "userid <user to get id of, or blank for your own>",
        adminOnly: true,
        help: "Returns the unique id of a user. This is useful for permissions.",
        process: function(args,bot,message) {
            var suffix = compileArgs(args);
            if(suffix){
                var server = message.channel.guild;
                if (server) {
                    var users = server.members.findAll("nickname",suffix);
                    var users = users.concat(server.members.findAll("user.username",suffix));
                    if(users.length == 1){
                        utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, "The id of " + users[0] + " is " + users[0].id)
                    } else if(users.length > 1){
                        var response = "multiple users found:";
                        for(var i=0;i<users.length;i++){
                            var user = users[i];
                            response += "\nThe id of " + user + " is " + user.id;
                        }
                        utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,response);
                    } else {
                        utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,"No user " + suffix + " found!");
                    }
                } else {
                    utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, "userid can only be run from a server channel, not a private message.");
                }
            } else {
                utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, "The id of " + message.author + " is " + message.author.id);
            }
        }
    },
    "topic": {
        usage: "topic [topic]",
        help: 'Sets the topic for the channel. No topic removes the topic.',
        process: function(args,bot,message) { message.channel.setTopic(compileArgs(args)); }
    },
    "msg": {
        usage: "msg <user> <message to leave user>",
        help: "leaves a message for a user the next time they come online.",
        process: function(args,bot,message) {
            // Ignore the command
            args.shift();
            var user = args.shift();
            if (user) {
                var msg = args.join(' ');
                if (msg) {
                    // Just look to see if the user field is actually a user
                    if (userMentioned(user)) {
                        user = stripUserDecorations(user);
                    }
                    bot.fetchUser(user).then(function(target) {
                        var msgtext = target + ", " + message.author + " left you a message";
                        if (message.timestamp) {
                            msgtext += " at " + new Date(message.timestamp).toUTCString();
                        }
                        msgtext += (":\n" + msg);
                        var msgObj = {
                            channel: message.channel.id,
                            content: msgtext
                        };
                        messagebox.addMessage(target.id, msgObj);
                        utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,"message saved.");
                    });
                } else {
                    displayUsage(bot, message, this);
                }
            } else {
                displayUsage(bot, message, this);
            }
        }
    },
    "uptime": {
        help: "returns the amount of time since the bot started.",
        process: function(args,bot,message){
            var now = Date.now();
            var msec = now - startTime;
            var days = Math.floor(msec / 1000 / 60 / 60 / 24);
            msec -= days * 1000 * 60 * 60 * 24;
            var hours = Math.floor(msec / 1000 / 60 / 60);
            msec -= hours * 1000 * 60 * 60;
            var mins = Math.floor(msec / 1000 / 60);
            msec -= mins * 1000 * 60;
            var secs = Math.floor(msec / 1000);
            var timestr = "";
            if(days > 0) {
                timestr += days + " days ";
            }
            if(hours > 0) {
                timestr += hours + " hours ";
            }
            if(mins > 0) {
                timestr += mins + " minutes ";
            }
            if(secs > 0) {
                timestr += secs + " seconds ";
            }
            utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel,"Uptime: " + timestr);
        }
    },
    "help": {
        usage: "help [<command>]",
        spammy: true,
        help: "Display help for this bot, or for specific commands, or plugins",
        process: function(args, bot, message) {
            var command = compileArgs(args).toLowerCase();
            if (command) {
                var outputArray = [];
                var cmd = findCommand(command);
                if (cmd) {
                    var output = utils.bold(command);
                    var prefix = "";
                    if (config.COMMAND_PREFIX) {
                        prefix = config.COMMAND_PREFIX;
                    }
                    if (cmd.usage) {
                        output += ("\t" + utils.italic(prefix + cmd.usage));
                    }
                    if (cmd.extendedhelp) {
                        output += ("\n\n" + cmd.extendedhelp);
                    } else {
                        output += ("\n\n" + cmd.help);
                    }
                    outputArray.push(output);
                } else if (command === "built-in") {
                    outputArray = helpForCommands(version + " commands:\nBuilt-in", commands, includeAdmin);
                } else {
                    for (var i = 0; i < plugins.length; i++) {
                        if (plugins[i].name.toLowerCase() === command) {
                            outputArray = outputArray.concat(helpForCommands(plugins[i].name, plugins[i].plugin.commands, includeAdmin));
                        }
                    }
                }
                if (outputArray.length > 0) {
                    utils.pmOrSendArray(bot, this, config.SPAMMY_PM, message.author, message.channel, outputArray);
                } else {
                    utils.pmOrSend(bot, this, config.SPAMMY_PM, message.author, message.channel, command + " is not a valid command or plugin");
                }
            } else {
                var includeAdmin = isAdmin(message.author.id);
                var outputArray = helpForCommands(version + " commands:\nBuilt-in", commands, includeAdmin);
                for (var i = 0; i < plugins.length; i++) {
                    if (plugins[i].plugin.commands) {
                        outputArray = outputArray.concat(helpForCommands(plugins[i].name, plugins[i].plugin.commands, includeAdmin));
                    }
                }
                utils.pmOrSendArray(bot, this, config.SPAMMY_PM, message.author, message.channel, outputArray);
            }
        }
    },
};

function dumpMessages(messageArray) {
    console.log("Dumping message array:");
    for (var i = 0; i < messageArray.length; i++) {
        console.log("Message " + i + " (is a " + typeof messageArray[i] + "):");
        console.log(messageArray[i]);
    }
}

function helpForCommands(header, cmds, includeAdmin) {
    var outputArray = [];
    outputArray.push(utils.bold(header + ":"));
    var key;
    for (key in cmds) {
        var includeCommand = true;
        var cmd = cmds[key.toLowerCase()];
        if (cmd.hasOwnProperty("adminOnly") && cmd.adminOnly && (includeAdmin == false)) {
            includeCommand = false;
        }
        if (includeCommand) {
            var output = "|\t";
            if (config.COMMAND_PREFIX) {
                output += config.COMMAND_PREFIX;
            }
            output += utils.bold(key);
            if(cmd.usage){
                output += " " + utils.italic(cmd.usage);
            }
            outputArray.push(output);
            output = "|\t\t\t";
            output += cmds[key.toLowerCase()].help;
            outputArray.push(output);
        }
    }
    return outputArray;
}

function findCommand(command) {
    if (command) {
        command = command.toLowerCase();
        var cmd = commands[command];
        if (cmd) {
            return cmd;
        }
        for (var i = 0; i < plugins.length; i++) {
            try {
                cmd = plugins[i].plugin.findCommand(command);
                if (cmd) {
                    cmd.plugin = plugins[i];
                    return cmd;
                }
            } catch(e) {
                utils.logError("Couldn't call findCommand() on plugin " + plugins[i].name, e);
            }
        }
    }
    return null;
}

function botShouldHandleCommand(bot, message) {
    // If there's a command prefix, use that. Otherwise, only do this if the message
    // starts with a mention of the bot.
    var handleCommand = false;
    var result = {handleCommand: false};
    var messageContent = message.content;
    var stripFirstArg = false;
    if (config.COMMAND_PREFIX) {
        if (message.content.startsWith(config.COMMAND_PREFIX)) {
            handleCommand = true;
            messageContent = message.content.substr(config.COMMAND_PREFIX.length);
        }
    } else if (userMentioned(message.content, bot.user.id)) {
        stripFirstArg = true;
        handleCommand = true;
    } else if (message.channel.type === "dm") {
        stripFirstArg = false;
        handleCommand = true;
    }
    if (handleCommand) {
        var args = messageContent.split(" ");
        if (stripFirstArg) {
            args.shift();
        }
        // args[0] should be a command. Strip empty strings off until the first non-empty string
        while (args.length > 0 && args[0] === "") {
            args.shift();
        }
        if (!args) {
            handleCommand = false;
        }
    }
    return compileCommand(handleCommand, args);
}

var defaultCommandHandler = function(args, bot, message) {
    if(config.respondToInvalid){
        utils.sendMessage(bot, message.channel, "Invalid command " + message.content);
    }
}

var procAlias = function(bot, message, cmd, extra) {
    // Do substitutions
    // %SENDER%, %CHANNEL%, %SERVER%, %CHANNEL_TOPIC%,%EXTRA%
    var output = cmd.output;
    output = output.replace(/%SENDER%/gi, message.author);
    output = output.replace(/%CHANNEL%/gi, message.channel);
    output = output.replace(/%SERVER%/gi, message.guild);
    output = output.replace(/%GUILD%/gi, message.guild);
    output = output.replace(/%CHANNEL_TOPIC%/gi, message.channel.topic);
    output = output.replace(/%EXTRA%/gi, extra);
    utils.sendMessage(bot, message.channel, output);
}

function procCommand(bot, message) {
    debugLog(message.author.username + ": " + message.content);
    if (message.author !== bot.user) {
        var res = botShouldHandleCommand(bot, message);
        if (res.handleCommand) {
            handleCommand(bot, res, message);
        } else if (message.author != bot.user && message.isMentioned(bot.user)) {
            sendMessage(bot, message.channel,message.author + ", you called?");
        }
        messagebox.checkForMessages(bot, message.author);
    }
}

function compileCommand(handleCommand, args) {
    return {handleCommand: handleCommand, args: args};
}

function handleCommand(bot, res, message) {
    var cmd = findCommand(res.args[0]);
    if(cmd) {
        if (cmd.hasOwnProperty("adminOnly") && cmd.adminOnly && !isAdmin(message.author.id)) {
            utils.sendMessage(bot, message.channel, "Hey " + message.sender + ", you are not allowed to do that!");
        } else {
            try{
                cmd.process(res.args, bot, message);
            } catch(e){
                if(config.debug){
                    utils.sendMessage(bot, message.channel, "command " + message.content + " failed :(\n" + e.stack);
                }
            }
        }
    } else {
        cmd = alias.getAlias(res.args[0].toLowerCase());
        if (cmd) {
            procAlias(bot, message, cmd, compileArgs(res.args));
        } else {
            // We don't know what the command is, so we need to push the original command to the
            // start, to account for the one that will be stripped later. Ew, I know.
            res.args.unshift(res.args[0]);
            defaultCommandHandler(res.args, bot, message);
        }
    }
}

function procPresence(bot, user, status, gameId) {
    try{
        if(status != 'offline'){
            messagebox.checkForMessages(bot, user);
        }
    } catch(e){
        utils.logError("procPresence error", e);
    }
}

function startBot(bot, cfg, callback) {
    config = cfg;

    version = config.NAME + "- SINBot Version " + package_json.version;
    plugins = config.PLUGINS;

    var botcfg = {
        sinBot: this,
        writeAliases: alias.writeAliases,
        makeAlias: alias.makeAlias,
        pmIfSpam: config.SPAMMY_PM
    };

    if (config.COMMAND_PREFIX) {
        debugLog("Command prefix: " + config.COMMAND_PREFIX);
    } else {
        debugLog("Starting in direct-mention mode...");
    }

    if (config.CLEAR_MESSAGEBOX) {
        debugLog("Clearing message box...");
        messagebox.clearMessageBox();
    }

    for (var i = 0; i < plugins.length; i += 1) {
        try {
            plugins[i].plugin = require(path.resolve(base.path, plugins[i].path));

            debugLog("Loaded plugin " + plugins[i].name);
        } catch(e) {
            utils.logError("Couldn't load " + plugins[i].name, e);
            if (config.DEBUG) {
                throw e;
            }
        }
        try {
            if (plugins[i].plugin.setup) {
                debugLog("Running setup for " + plugins[i].name);
                plugins[i].plugin.setup(plugins[i].config, bot, botcfg);
            }
        } catch(e) {
            utils.logError("Couldn't run setup for " + plugins[i].name, e);
            if (config.DEBUG) {
                throw e;
            }
        }
        try {
            if (plugins[i].defaultCommandHandler) {
                var dch = plugins[i].plugin.findCommand(plugins[i].defaultCommandHandler);
                if (dch) {
                    debugLog("Setting default command handler to " + plugins[i].defaultCommandHandler);
                    defaultCommandHandler = dch.process;
                }
            }
        } catch (e) {
            utils.logError("Couldn't set default command handler for " + plugins[i].name, e);
            if (config.DEBUG) {
                throw e;
            }
        }
    };

    if (callback) {
        callback();
    }
}

exports.commands = commands;
exports.plugins = plugins;
exports.startBot = startBot;
exports.compileCommand = compileCommand;
exports.handleCommand = handleCommand;
exports.procCommand = procCommand;
exports.procPresence = procPresence;