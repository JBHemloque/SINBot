'use strict';

var async = require('async');
var Discord = require("discord.js");
var fs = require("fs");
const Canvas = require('@napi-rs/canvas');

const MAX_CHUNK = 2000;

async function _sendReply(text, interaction, ephemeral) {
    if (ephemeral) {
        await interaction.reply({content: text, flags: Discord.MessageFlags.Ephemeral});
    } else {
        await interaction.reply(text);
    }
}

async function _sendFollowUp(text, interaction, ephemeral) {
    if (ephemeral) {
        await interaction.followUp({content: text, flags: Discord.MessageFlags.Ephemeral});
    } else {
        await interaction.followUp(text);
    }
}

async function _sendDeferredReply(text, interaction, ephemeral) {
    await interaction.editReply(text);
}

async function _sendText(text, interaction, first, ephemeral) {
    if (first) {
        _sendReply(text, interaction, ephemeral);
    } else {
        _sendFollowUp(text, interaction, ephemeral);
    }
}

// Convert text to a text array, with each array entry no more than MAX_CHUNK in size
// This gets around the Discord text limit.
function chunkChunk(text) {
    let ret = [];
    if (text.length >= MAX_CHUNK) {
        const chunks = text.split(". ");
        let entry = "";
        for (let i = 0; i < chunks.length; i++) {
            let chunk = chunks[i] + ". ";
            if ((entry.length + chunk.length) >= MAX_CHUNK) {
                ret.push(entry);
                entry = chunk;
            } else {
                entry += chunk;
            }
        }
        ret.push(entry);
    } else {
        ret.push(text);
    }
    return ret;
}

// Converts text to a text array, with each array entry no more than MAX_CHUNK in size.
// This gets around the Discord text limit. It will preferentially chunk in paragraphs. 
function chunkText(text) {
    let ret = [];
    const chunks = text.split("\n\n");
    let entry = "";
    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i] + "\n\n";
        if (entry.length + chunk.length < MAX_CHUNK) {
            entry += chunk;
        } else {
            ret.push(entry);
            if (chunk.length >= MAX_CHUNK) {
                let chunkchunks = chunkChunk(chunk);
                ret.push(...chunkchunks);
            }
            entry = "";
        }
    }
    ret.push(entry);
    return ret;
}

exports.sendText = async function(text, interaction, ephemeral) {
    let chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
        await _sendText(chunks[i], interaction, (i === 0), ephemeral);
    }
}

exports.sendDeferredText = async function(text, interaction, ephemeral) {
    let chunks = chunkText(text);
    _sendDeferredReply(chunks[0], interaction);
    for (let i = 1; i < chunks.length; i++) {
        await _sendText(chunks[i], interaction, false, ephemeral);
    }
}

exports.deferAttachment = async function(interaction, ephemeral) {
    if (ephemeral) {
        await interaction.deferReply({flags: Discord.MessageFlags.Ephemeral});
    } else {
        await interaction.deferReply();
    }
}

exports.attachFile = async function(attachment, interaction) {
    await interaction.editReply({files:[attachment]});
}